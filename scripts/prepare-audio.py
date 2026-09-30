#!/usr/bin/env python3
"""Render the supplied tracker module and extract a reproducible visual score.

Requirements: Python 3, numpy, libopenmpt, ffmpeg.
Run from any directory: python scripts/prepare-audio.py [module] [output-dir]
The audio clock is authoritative; all events use seconds from its start.
"""

from __future__ import annotations

import ctypes as C
import ctypes.util
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
FPS = 30
STEP = RATE // 200  # Tracker event timestamps have a maximum 5 ms uncertainty.


def bind(lib, name, result, *arguments):
    function = getattr(lib, "openmpt_module_" + name)
    function.restype = result
    function.argtypes = list(arguments)
    return function


def module_events(data, pattern, row):
    """Original ProTracker channel events, kept as a compact visual score."""
    start = 1084 + (pattern * 64 + row) * 16
    events = []
    for channel in range(4):
        b = data[start + channel * 4:start + channel * 4 + 4]
        if len(b) != 4:
            continue
        sample = (b[0] & 240) | (b[2] >> 4)
        period = ((b[0] & 15) << 8) | b[1]
        effect, value = b[2] & 15, b[3]
        if sample or period or effect or value:
            events.append([channel, sample, period, effect, value])
    return events


def render(module_path, raw_path):
    data = module_path.read_bytes()
    lib = C.CDLL(ctypes.util.find_library("openmpt"))
    create = bind(lib, "create_from_memory2", C.c_void_p,
                  C.c_void_p, C.c_size_t, C.c_void_p, C.c_void_p,
                  C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p)
    destroy = bind(lib, "destroy", None, C.c_void_p)
    read = bind(lib, "read_interleaved_float_stereo", C.c_size_t,
                C.c_void_p, C.c_int32, C.c_size_t, C.c_void_p)
    duration = bind(lib, "get_duration_seconds", C.c_double, C.c_void_p)
    order = bind(lib, "get_current_order", C.c_int32, C.c_void_p)
    pattern = bind(lib, "get_current_pattern", C.c_int32, C.c_void_p)
    row = bind(lib, "get_current_row", C.c_int32, C.c_void_p)
    tempo = bind(lib, "get_current_tempo2", C.c_double, C.c_void_p)
    speed = bind(lib, "get_current_speed", C.c_int32, C.c_void_p)
    blob = C.create_string_buffer(data)
    mod = create(blob, len(data), None, None, None, None, None, None, None)
    if not mod:
        raise RuntimeError("libopenmpt could not open the supplied module")
    predicted_duration = duration(mod)
    buffer = np.zeros((STEP, 2), dtype=np.float32)
    rows, orders = [], []
    total = 0
    previous = None
    peak = 0.0
    try:
        with raw_path.open("wb") as out:
            while True:
                count = read(mod, RATE, STEP, buffer.ctypes.data)
                if not count:
                    break
                # The first samples of this chunk belong to the reported row.
                # We use the chunk start to bound timestamp uncertainty to 5 ms.
                state = (order(mod), pattern(mod), row(mod))
                at = round(total / RATE, 4)
                playback_tail = (previous is not None and state[0] < previous[0]
                                 and total / RATE > predicted_duration - 0.02)
                if state != previous and total / RATE <= predicted_duration and not playback_tail:
                    current_tempo, current_speed = round(tempo(mod), 4), speed(mod)
                    event = {"time": at, "order": state[0], "pattern": state[1],
                             "row": state[2], "tempo": current_tempo,
                             "bpm": round(current_tempo * 3 / current_speed, 4),
                             "speed": current_speed,
                             "notes": module_events(data, state[1], state[2])}
                    rows.append(event)
                    if previous is None or state[0] != previous[0]:
                        orders.append({key: event[key] for key in
                                       ("time", "order", "pattern", "tempo", "bpm", "speed")})
                    previous = state
                elif state == previous and rows:
                    # Effects on the first row can change the initial tempo
                    # after the renderer has reported that row once.
                    current_tempo, current_speed = round(tempo(mod), 4), speed(mod)
                    if rows[-1]["tempo"] != current_tempo or rows[-1]["speed"] != current_speed:
                        rows[-1].update(tempo=current_tempo, speed=current_speed,
                                        bpm=round(current_tempo * 3 / current_speed, 4))
                        if orders[-1]["time"] == rows[-1]["time"]:
                            orders[-1].update(tempo=current_tempo, speed=current_speed,
                                              bpm=rows[-1]["bpm"])
                peak = max(peak, float(np.max(np.abs(buffer[:count]))))
                out.write(buffer[:count].tobytes())
                total += count
                if total > RATE * (predicted_duration + 5):
                    raise RuntimeError("Unexpected repeated module playback")
    finally:
        destroy(mod)
    for index, item in enumerate(orders):
        end = orders[index + 1]["time"] if index + 1 < len(orders) else total / RATE
        item["duration"] = round(end - item["time"], 4)
    samples = []
    for number in range(31):
        info = data[20 + number * 30:50 + number * 30]
        samples.append({"number": number + 1,
                        "name": info[:22].decode("latin1").strip("\0 "),
                        "bytes": int.from_bytes(info[22:24], "big") * 2,
                        "volume": info[25]})
    return {"title": data[:20].decode("latin1").strip("\0 "),
            "duration": round(total / RATE, 6),
            "trackerDuration": round(predicted_duration, 6),
            "sourceSHA256": hashlib.sha256(data).hexdigest(),
            "source": module_path.name, "sampleRate": RATE,
            "orders": orders, "rows": rows, "samples": samples,
            "channels": 4, "peak": round(peak, 6)}


def normalize(values, quantile=0.98):
    scale = float(np.quantile(values, quantile))
    return np.clip(values / max(scale, 0.000001), 0, 1)


def analyze(raw_path, score):
    stereo = np.memmap(raw_path, mode="r", dtype=np.float32).reshape(-1, 2)
    mono = stereo.mean(axis=1)
    count = int(np.ceil(len(mono) / (RATE / FPS)))
    fields = {name: np.zeros(count, dtype=np.float64)
              for name in ("energy", "bass", "mid", "treble", "onset", "kick", "width")}
    size = 4096
    window = np.hanning(size)
    frequencies = np.fft.rfftfreq(size, 1 / RATE)
    masks = [(frequencies >= 30) & (frequencies < 180),
             (frequencies >= 180) & (frequencies < 1800),
             (frequencies >= 1800) & (frequencies < 14000)]
    previous = np.zeros(size // 2 + 1)
    padded = np.pad(mono, (size // 2, size))
    for index in range(count):
        at = int(index * RATE / FPS)
        segment = padded[at:at + size] * window
        spectrum = np.abs(np.fft.rfft(segment))
        fields["energy"][index] = np.sqrt(np.mean(segment * segment))
        for name, mask in zip(("bass", "mid", "treble"), masks):
            fields[name][index] = np.sqrt(np.mean(spectrum[mask] ** 2))
        delta = np.maximum(spectrum - previous, 0)
        fields["onset"][index] = np.sqrt(np.mean(delta ** 2))
        fields["kick"][index] = np.sqrt(np.mean(delta[masks[0]] ** 2))
        spatial = stereo[max(at - size // 2, 0):min(at + size // 2, len(mono))]
        fields["width"][index] = np.sqrt(np.mean((spatial[:, 0] - spatial[:, 1]) ** 2))
        previous = spectrum
    for key, value in fields.items():
        fields[key] = np.round(normalize(value), 3).tolist()
    # Local maxima of the attack envelope: useful for discretionary impact cuts.
    onset = np.array(fields["onset"])
    impacts = [round(i / FPS, 4) for i in range(1, len(onset) - 1)
               if onset[i] > 0.48 and onset[i] >= onset[i - 1] and onset[i] > onset[i + 1]]
    score["analysis"] = {"fps": FPS, "frames": count, "bands": fields,
                         "impacts": impacts,
                         "bandRangesHz": {"bass": [30, 180], "mid": [180, 1800],
                                          "treble": [1800, 14000]}}
    # This song's backbeat is eight rows: kick on row 0, snare on row 8,
    # kick on 16, snare on 24. This is 141 musical BPM at tracker tempo 94
    # and speed 2. The four-row hi-hat grid is retained as subdivisions.
    score["beats"] = [event["time"] for event in score["rows"] if event["row"] % 8 == 0]
    score["subdivisions"] = [event["time"] for event in score["rows"] if event["row"] % 4 == 0]
    score["bpm"] = score["rows"][0]["bpm"]
    score["trackerTempo"] = score["rows"][0]["tempo"]
    score["rowsPerBeat"] = 8
    score["timingPrecisionSeconds"] = STEP / RATE


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "song.mod"
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public"
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="la-sirena-") as temporary:
        raw = Path(temporary) / "music.f32"
        score = render(source, raw)
        analyze(raw, score)
        gain = 0.891251 / max(score["peak"], 0.000001)  # -1 dB sample peak
        common = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                  "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", str(raw),
                  "-af", f"volume={gain:.8f}", "-metadata", f"title={score['title']}"]
        subprocess.run(common + ["-c:a", "libopus", "-b:a", "160k", "-vbr", "on",
                                 str(output / "music.ogg")], check=True)
        subprocess.run(common + ["-c:a", "libmp3lame", "-q:a", "2",
                                 str(output / "music.mp3")], check=True)
        score["audio"] = {"opus": "music.ogg", "mp3": "music.mp3", "gain": round(gain, 6)}
    (output / "track-analysis.json").write_text(json.dumps(score, separators=(",", ":")))
    print(json.dumps({"title": score["title"], "duration": score["duration"],
                      "bpm": score["bpm"], "orders": len(score["orders"]),
                      "rows": len(score["rows"]), "analysisFrames": score["analysis"]["frames"],
                      "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
