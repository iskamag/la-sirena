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

The certificate-gated variant `8c5d25d` was benchmarked before further image
checks and parked. At 160 s it measured 18.29222 -> 18.23067 ms (0.34%);
at 169.9 s, 18.05133 -> 17.74601 ms (1.69%). Its hash-independent capsules
reject too few rays and add enough work to erase the large prototype gain.
No micro-tuning or additional GPU quality runs are planned for this version.
Report: `artifacts/optimization/primary-certified-4k-performance/bench-3840.json`.

A sixteen-window Ultra 2560x1440 chapter sweep exposed a real thin-feature
failure at 136.1 s: two depth pixels changed from 28 (hit) to 255 (miss),
with maximum final color difference 100. The other fifteen windows had no
depth changes; 145.3 s also exceeded the strict color maximum with value 3.
The same-source guide-disabled/enabled diagnostic reproduced the two lost
hits, proving this is guide reuse rather than a shader-source precision shift.
Coordinates are (55,848) and (55,849), measured from the readback's bottom.
CPU replay identifies narrow window spokes between the four guide rays.
Normalized sample clearance is insufficient to exclude these unsampled hits.
Reports: `artifacts/optimization/primary-miss-guide-ultra-chapter-quality` and
`artifacts/optimization/primary-miss-guide-hidden-hit-diagnostic`.

The next isolated candidate will require a cheap whole-tile exclusion of
periodic window/spoke support volumes. This addresses a reproduced fidelity
bug in the structural optimization; it is not another small performance gate.
An original-program fallback outside the validated opened/high-resolution
domain is also being prepared. Neither source change is production-ready yet.

Production integration
----------------------

`e5422c7` integrates the window-guarded guide with a separate optional world
program. The original world/cloud shader strings are preserved. Eligibility
requires landscape/square output height >=1440, a fully opened cathedral and
certified controls; portrait and other frames select the original program.
The previously lost spokes were restored in a four-frame Ultra check before
integration. The expensive all-scene capsule variant remains parked.

Integrated 4K timings at 156.515/160/169.9 s measured
17.132/18.476/18.524 -> 14.997/15.584/14.949 ms, gains 12.46/15.65/19.30%.
All sampled candidate frame maxima were <=15.819 ms. Five integrated 4K
comparisons passed maximum-2/RMS-.05 with identical depth, and all 23
low-resolution chapter fallback frames were exact. Portrait exceeded the
maximum-2 color gate at one channel, so portrait eligibility was removed;
two production fallback checks then passed with maximum <=1 and identical
depth. The post-commit production 4K 160 s pair passed (maximum 2, RMS
<=.02698, identical depth), and its saved image was viewed directly.

See PRIMARY-GUIDE.md for the final domain, control checks, source fidelity and
artifact paths. The original unrestricted guide remains experimental; these
results apply to the guarded production integration. Whole-film 4K60 and
continuous frame-time tails remain unverified.
