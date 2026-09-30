# LA SIRENA

A full-length procedural music film for the supplied `song.mod`. A shadowcat opens the transmission; the environments take over. A brief sentinel anticipates the cathedral's rupture, a runner guides the bonus circuit, and a swimming shadowcat returns in the concluding ocean. Eleven worlds include chrome sea forms, braided organisms, velocity gates, a spectral cathedral, a shattering prism, acid sculpture, a shell swarm, a mercury spine, shadow transmission, an eclipse ocean, and a videogame circuit. Cat-free transmission shots reveal an ion storm, a crystal canyon, and a spectral horizon.

The current revision plays in the app. `npm run render:full` exports the complete original song and film at 1920×1080 / 30fps.

Fresh exports of the revised passages are the **[61.3-second velocity rise into LS04](artifacts/la-sirena-velocity-rise.mp4)** at 1280×720 / 30fps and the complete **[27.3-second vertical ocean finale](artifacts/la-sirena-ocean-return-vertical.mp4)** at 720×1280 / 30fps. Both contain the original song for their displayed times.

The **[72.6-second temple-to-circuit cut](artifacts/la-sirena-rupture-preview.mp4)** at 1280×720 / 30fps shows the rupture and bonus circuit, but predates the final correction to the cloud and shard speeds. The **[13.6-second vertical bonus circuit](artifacts/la-sirena-bonus-circuit-vertical.mp4)** at 720×1280 / 30fps contains the current arcade sequence.

The previous edition remains available as the complete **[1920×1080 film](artifacts/la-sirena-shadowcats.mp4)** and **[1080×1920 opening](artifacts/la-sirena-shadowcats-vertical.mp4)**. Those archived exports predate the temple rupture and bonus circuit.

The film uses raw WebGL 2 and JavaScript. Every image is generated; there are no stock clips, textures, or external font requests. Fine light filaments, dust, nearby bokeh, expanding kick waves, onset comets, and falling fragments share depth with the principal subjects. Brightness extraction, two bloom passes, temporal light trails, lens dispersion, chromatic print grain, and a highlight-preserving colour grade finish the picture. Dark silhouettes retain their shape through the trails; history resets across cuts and seeks.

LS03 develops from its familiar cyan velocity gates into changing palettes and open geometry, building travel speed toward its final rush. LS04 decelerates into its cathedral and stays in one world from **2:16.100 to 2:50.125**: percussion stops at **2:29.710**, the roof breaks apart, and scrolling layers of gold and lavender clouds fill the opening. The clouds maintain a constant wind speed. The drums and a new synth return at **2:36.515**, sending light through the broken architecture and sustaining a shower of falling shards. The sky stays bright and the fall keeps moving through the cut into LS05. The bonus circuit runs **3:13.945–3:27.555**, with slalom obstacles, checkpoints, a rolling rise and dive, and a brief encore later in LS06.

LS07 brings the shadowcat back at **4:25.400**. It swims on the water plane with a wake, then recedes toward the horizon and resolves at **4:42.410**. The ocean, eclipse, aurora and reflected light develop into the closing reveal; the final title leaves the living ocean visible underneath.

## Watch

```sh
npm install
npm run dev
```

Open **http://localhost:5173** and click **Enter the transmission**. The complete film runs **4:49**. The supplied audio files and analysis are ready to play. Headphones and fullscreen make a difference.

Space pauses; ← / → seek five seconds; F toggles fullscreen; M mutes; C opens chapters; V softens motion; R starts or stops recording. The quality control cycles HQ / Ultra / Eco. The site also respects your system's reduced-motion setting.

The round record button saves the film as a WebM with sound, starting at the current position. Press it again to finish and download. Playback can be paused while recording. Keep the tab visible for smooth real-time capture.

## Export MP4

With the dev server running, export frames and the original audio at precise timestamps:

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

## Build and verify

```sh
npm run build
npm run preview
```

Run `npm run verify` with the dev server running. The browser check exercises playback, seeking, every chapter, mobile layout, reduced motion, and actual video recording. Screenshots and results are written to `artifacts/qa/`.

`npm run verify:score` checks musical cue boundaries, persistent sky transformation, deterministic seeking, and the exact sentinel, runner and swimmer casting windows. LS03 remains cat-free while its geometry and palette develop. Native render reports additionally check actual shader compilation/linking, framebuffer completeness and every GL operation. These render checks do not exercise browser controls or browser audio playback.

`python3 scripts/check-ls04.py` checks the final cloud and shard correction against current-source GLES3 frames, including sustained motion and brightness through the LS05 boundary. The current hardware browser review also checks both revised acts in actual desktop/portrait layouts, live playback and a recording with music. Results and their scope are recorded in `artifacts/review.md`.

## Rebuild the musical score

```sh
npm run audio:prepare
```

This uses Python 3, NumPy, `libopenmpt`, and `ffmpeg`. The original module is preserved. The pipeline generates Opus audio, an MP3 fallback, and a timing score: 85 orders, 5,440 tracker rows, 680 musical beats, and frequency/onset analysis at 30 Hz. The musical pulse is 141 BPM; the tracker itself runs at tempo 94, speed 2.

Seven act boundaries follow the actual changes of instrument family: 00:00, 00:34, 01:21, 02:16, 02:50, 03:47, and 04:21. Eleven procedural worlds are edited within those acts; the opening changes action or framing every tracker order (approximately 3.4 seconds). Sustained musical events transform their world without cutting away. `newscore.js` supplies the same deterministic cues to live playback and offline rendering, so seeking into the opened sky reproduces the correct state. Camera, geometry, illumination, swarms, and graphic cuts respond to the score. The audio clock is authoritative for playback, seeking, and export.

Audio comes exclusively from the supplied module. The embedded title is “la sirena”; a sample label contains an October 1992 date. No artist attribution has been assumed.
