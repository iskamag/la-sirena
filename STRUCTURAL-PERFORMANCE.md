Structural raymarch investigation
=================================

Production reference: `0f7b6fb` (shader unchanged at `af3abdb`). Small
percentage experiments are parked. The remaining target is the cathedral's
primary march, particularly rays that finish without a surface hit.

A fresh default-driver RX 6800 / Chromium ANGLE OpenGL absolute 3840x2160
audit sampled eleven windows. Flow at 35/58 s measured 16.028/15.732 ms;
cathedral at 144/150.1/156.6/160/169.9 s measured
15.024/16.964/17.269/18.263/18.098 ms. Shell at 11/24 s measured
13.896/13.758 ms, and worlds at 180/215 s measured 14.013/15.807 ms.
These are one timed frame per window, not tail or continuous-playback evidence.
Report: `artifacts/optimization/structural-start-4k-audit/bench-3840.json`.

Miss-only guide prototype
------------------------

Isolated candidate `b2bd2f6`, `/tmp/mus2-opt-primary-miss-guide`, runs the
original cathedral march at quarter width and height, recording miss flags,
capped glow, normalized sample clearance and terminal travel in RGBA32F.
Eligible full-resolution miss pixels reuse interpolated glow. All rejected
pixels retain the original full-resolution march and shading. Clouds and
compositor retain the production paths. This removes primary queries rather
than increasing march steps or lowering the resolution of surface shading.

Paired default-driver 3840x2160 timings against `0f7b6fb`, two blocks of two
timed frames per side, alternating sides, one queued frame and 1000 ms pauses:

| Time | Reference ms | Guide ms | Reduction | Guide frame maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 144 | 14.73954 | 13.44095 | 8.81% | 13.69000 |
| 160 | 18.09442 | 15.13429 | 16.36% | 15.47432 |
| 169.9 | 18.13396 | 14.69037 | 18.99% | 14.85720 |

Report: `artifacts/optimization/primary-miss-guide-4k-performance/bench-3840.json`.
This is a substantial measured improvement in the opened cathedral, bringing
these sampled windows under 16.67 ms. Whole-film 4K60 remains unproven.

Initial comparison at 144/160/169.9 s passed at both 1280x720 and true 4K:
all six frames had identical encoded depth, maximum final color difference
2/255 and RMS <= .03198 byte values. The guide was enabled and valid in every
sample. The saved 1280x720 candidate at 160 s was viewed; rings, arches,
wires, floating plates and clouds remain visually intact. Reports:
`artifacts/optimization/primary-miss-guide-initial-quality` and
`artifacts/optimization/primary-miss-guide-4k-quality`.

The prototype remains unmerged. Its clearance and four-neighbor miss checks
are heuristics; thin features can lie between guide rays. A geometric bound
that proves no hit across the whole guide texel's ray cone is under development.
Broader transition/control checks, cumulative comparison to the original cloud
path, production eligibility and validated-bound performance remain required.

Twelve further true-4K transition frames at 149.72/150.1/156.515/156.6/165/
168.6 s (two consecutive frames each) retained identical depth. RMS was
<= .02692. Eleven met the maximum-2 color gate. At 150.116667 s, one color
channel out of 33,177,600 differed by 3, so the strict gate failed that window;
the world target's color maximum remained 2. This remains a recorded failure,
not a claim that all transition checks passed. Report:
`artifacts/optimization/primary-miss-guide-4k-transition-quality/compare-3840.json`.

Six portrait 1440x2560 frames at 149.72/160/169.9 s with motion .2 and
pointer [.8,-.7] passed: identical depth, maximum final color difference 2,
RMS <= .03001. Report:
`artifacts/optimization/primary-miss-guide-portrait-control-quality/compare-1440.json`.

Three true-4K frames at 144/160/169.9 s also passed against `4071d47`, the
reference preceding the accepted distant-cloud prepass. These measure the
cumulative cloud and miss-guide approximation: depth identical, maximum color
difference 2, RMS <= .02972. Report:
`artifacts/optimization/primary-miss-guide-cumulative-4k-quality/compare-3840.json`.

Exact per-ray candidate masks were ruled out before GPU work: a conservative
floor-based distance upper envelope rejected only .048% of opened-roof hashes
and no plate fields while adding substantial setup. No-hit certificates have
more promising CPU coverage because they only need to exclude surface hits;
glow still needs to be retained separately.
