Production 4K performance coverage
==================================

Reference 9beabd2. RX 6800 / Chromium ANGLE OpenGL, default driver environment,
3840x2160, one block of two timed frames per window, one queued frame and
1000 ms pauses outside timing queries. All recorded source hashes match the
production checkout. No timed sample reported a GL error or disjoint timer.

The 28-window sweep covers chapter samples and the newly guided flow and
cathedral phases. Twenty-six sampled windows had both timed frames below
16.667 ms. The exceptions are:

| Time | Scene / shot | Mean GPU ms | Maximum GPU ms |
| --- | --- | ---: | ---: |
| 20 | Crystal canyon, scene 9 / shot 9 | 17.68930 | 17.98372 |
| 150.1 | Early cathedral breach, scene 3 / shot 0 | 17.03576 | 17.29456 |

Guided flow at 34.021/35/47.631/58/81.62 measured means of 11.36–12.08 ms.
Guided cathedral at 151/154.5/156.6/160/169.9 measured 15.03–16.36 ms;
the maximum individual frame in these windows was 16.43484 ms.

The earlier assumption that the 20-second peak was a shell scene was wrong.
Both the recorded world/shot and current score identify canyonWorld. The
next structural investigation targets its six repeated crystal rows. A CPU
miss-guide estimate removes only 8.7% of primary queries net of the prepass,
so that approach is parked. Per-ray repeated row parameters and conservative
field rejection are being quantified before another GPU candidate is built.
Small percentage adjustments remain parked.

These are 56 sampled frames, not continuous playback or whole-film tail
coverage. Whole-film 4K60 remains unverified, and the two measured exceptions
still require work. Report:
artifacts/optimization/production-flow-guide-4k-sweep/bench-3840.json.
