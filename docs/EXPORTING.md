# Export the film

For browser export, first start the dev server with `npm run dev`. Then export frames and the original audio at precise timestamps:

```sh
npm run render -- --width 1920 --crf 18 --output artifacts/la-sirena-rupture.mp4
```

Or export a vertical slice:

```sh
npm run render -- --duration 61.24 --width 1080 --height 1920 --fps 30 --crf 18 --output artifacts/la-sirena-rupture-vertical.mp4
```

This requires `ffmpeg` and Chromium (`/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another executable). It renders frames at exact audio timestamps, so it stays synchronized even when rendering takes longer than playback. Default export is 1280×720 at 30fps; `--width 1920` exports 1080p. Hardware graphics are used by default; add `--software` for machines without a supported GPU. Intermediate frames use 97% JPEG quality; add `--lossless` for PNG intermediates. `--height`, `--fps`, `--url`, `--start`, `--duration`, and `--crf` are configurable. CRF20 is the default encoder quality.

Linux can also export directly through surfaceless EGL/GLES3, without a browser or server:

```sh
npm run render:full
```

This renders the complete 4:49 film at 1920×1080 / 30fps / CRF18 to `artifacts/la-sirena-rupture.mp4`. To render a shorter slice:

```sh
npm run render:native -- --start 135 --duration 72.555 --width 1280 --height 720 --output artifacts/la-sirena-rupture-preview.mp4
```

This executes the same JavaScript score, secondary layers, compositor and graphic pass. It needs system EGL/GLES3, Cairo, librsvg, Python 3 with NumPy, and `ffmpeg`. Text uses the system's font substitution, so its metrics can differ slightly from the browser. Export is 30fps/CRF18 by default; `--fps`, `--crf`, `--width`, `--height`, `--start` and `--duration` are configurable. The exporter verifies the completed audio/video by decoding to the end. Render reports remain beside the MP4 in a `.render` directory.

`npm run render:4k` exports the full film at 3840×2160 / 60fps with SVT-AV1 preset 6, CRF18, 10-bit BT.709 color, and AAC audio. It streams raw frames directly into FFmpeg. Four encoder threads and a 50ms pause after each GPU frame keep resource use bounded; override these with `--threads` and `--pause-ms`. Native exports also accept `--codec libsvtav1` and `--preset`. Output: `artifacts/la-sirena-4k60-svt-av1.mp4`.

