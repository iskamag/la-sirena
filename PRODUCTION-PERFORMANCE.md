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

Post-canyon production peaks
----------------------------

Reference f215784 (renderer e011ead), same hardware/pacing, two blocks of
two timed frames per window:

| Time | Mean GPU ms | Maximum GPU ms |
| --- | ---: | ---: |
| 20 | 14.76303 | 15.00996 |
| 52 | 15.95129 | 16.40292 |
| 150.1 | 17.09688 | 17.67408 |
| 151 | 16.10795 | 16.27740 |
| 160 | 15.41133 | 15.80660 |

Both sampled canyon passages meet the frame budget. The early breach still
exceeds it. The next investigation measures whole-cell roof rejection before
hash evaluation during positive opening; surviving plate expressions must
remain unchanged. Report: artifacts/optimization/production-canyon-4k-peaks.

Opened-roof cluster triage
-------------------------

The copied closed-roof cell bound was parked without a GPU prototype. At
150.1 it rejects 65.48% of roof hashes/sphere prefixes but eliminates zero
plate fields or rotations (81,380 original and candidate evaluations). It
adds 155,952 cell bounds against 311,904 original hashes. The existing sphere
guard already rejects those plates. This lacks a credible large frame gain.
The next bounded CPU triage measures whether other cathedral fields can
skip substantial dynamic flute/column/window work while retaining their
original scalar values. Temporary evidence: /tmp/mus2-partial-roof-cluster-cpu.json.

Cumulative visual comparison
---------------------------

Current renderer ad9d3c0 was compared directly with the original optimization
reference 9d414e0 at true 3840x2160. Eight frames at 20/35/150.1/160 retained
identical encoded depth. Canyon final color was exact; flow, early breach and
opened cathedral had maximum final color difference 2/255, with RMS <= .02977.
This checks the combined geometry, cloud and miss-guide changes in those
windows, rather than comparing only consecutive candidates. It remains
sampled evidence. Report: artifacts/optimization/cumulative-original-4k-quality.

Cathedral field lookahead parked
--------------------------------

Candidate b0e0ca8 in /tmp/mus2-opt-cathedral-field-lookahead remains unmerged.
CPU replay rejected about 81% of flute, 78% of ring and 72% of window work
without changing scalar distances. The GPU did not deliver a substantial gain:

| Time | Baseline ms | Candidate ms | Reduction | Candidate maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 150.1 | 17.17543 | 16.67087 | 2.94% | 17.58068 |
| 160 | 15.21574 | 15.42367 | -1.37% | 16.07460 |

Same paired hardware/pacing as the other structural comparisons. No additional
quality runs or threshold/domain/cache tuning are planned for this candidate.
Production renderer stays unchanged. CPU field counts are not frame-time proof.
Report: artifacts/optimization/cathedral-field-lookahead-4k-performance.

Cumulative speed against the original renderer
---------------------------------------------

Paired default-driver RX 6800 / ANGLE OpenGL 3840x2160, baseline 9d414e0
and current renderer e011ead, two alternating blocks of two timed frames,
one queued frame and 1000 ms pauses:

| Time | Original ms | Current ms | Reduction | Current maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 35 | 29.63286 | 11.45925 | 61.33% | 11.75884 |
| 160 | 30.28052 | 15.57619 | 48.56% | 15.67008 |

These correspond to the cumulative visual comparison above. Report:
artifacts/optimization/cumulative-original-4k-performance.

Temporal hit-prefix approximation parked
---------------------------------------

The isolated CPU track tested four adjacent-frame cases at 149.72/150.1/
150.5/151, 1024 pixels each, four coherent prior full-resolution hits and a
.2-world-unit safety prefix. Even optimistic zero-cost history saved only
18–24% of primary queries. It lost 9/1/1/14 hits respectively, changed
26/4/1/26 encoded depth bytes and produced maximum normal errors of
119/49/35/137 degrees. A concrete 151-second ray changed from a hit at
3.7688 units to a miss past 35.8700, with capped-glow error 1.3804.

This does not preserve the current sampling sequence or geometry. No GPU
prototype, cache implementation or parameter tuning is planned. Production
remains unchanged. Evidence: /tmp/mus2-cathedral-temporal-hit-prefix.jsonl.
