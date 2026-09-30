Partial-opening eligibility experiment
======================================

Baseline be685b3. This isolated candidate expands only CPU eligibility, from
fully-open time>=156.515 to time>=151 with positive opening. Shader strings,
world/guide/cloud programs, sampler layouts, glow/clearance thresholds, and the
window support guard remain unchanged. Landscape and height>=1440 restrictions
remain; closed phases, portrait, other scenes and invalid frames retain the
original program. No GPU jobs were launched by this agent.

Why151 rather than the first breach
----------------------------------

CPU original-field replay samples768 random4K pixel centers/time plus their four
quarter-guide rays. It includes the production window support guard and subtracts
quarter prepass work (estimated6.25% primary queries). Net query savings:

Time | net queries saved | accepted pixel fraction
-----|-------------------|------------------------
149.7101 |17.0%|22.1%
150.1 |19.7%|25.9%
151 |24.5%|32.7%
152 |30.5%|40.9%
153 |30.1%|41.7%
154.4 |31.9%|42.2%
155 |31.7%|40.2%
156.514 |31.8%|36.7%

The earliest breach plausibly gives only single-digit total-frame gains, so it
is excluded. From151, the query reduction gives a credible10–15% total-frame
opportunity;152 onward resembles the already-measured fully-open15–19% gain.
These are expectations anchored to existing GPU measurements, not new timings.
Per-query cost, wave divergence, target overhead and post costs can change the
result. The CPU diagnostic uses double geometry arithmetic and approximate CPU
hashes relative to GPU lowering. P99 capped-glow interpolation error across the
partial samples is.00165–.00329; some maxima reach.04014. Final byte images,
perceptual quality and depth must still be tested by the parent.

Bounded adversarial coverage
-----------------------------

Projected rounded roof rectangular edges and clipped diagonal edges, torus
rings, fluted column surfaces and windows were tested at149.7101,150.1,151,152,
153,154.4,155,156.514. Five-by-five pixel neighborhoods around projected samples
produced1,244,250 distinct candidates across frames. Original full rays hit at
925,411; none of these hits passed the production guarded miss-reuse predicate.
This included81,080 roof hits,333,283 ring hits,242,115 pillar hits,4,851 spoke
hits and77,437 rose hits. Two further control cases (151,motion.2,shot3,pointer
[.8,-.7];153,motion1,shot2,pointer[-.8,.7]) tested313,531 candidates and228,084
hits, again with zero admitted hits. This is sampled CPU evidence, not a proof
for every pixel, time, shot, control or GPU hash.

Artifacts and checks
--------------------

Replay scripts/reports remain in /tmp for parent review:
- mus2-primary-partial-opportunity.mjs and.json
- mus2-primary-partial-adversarial.mjs and.jsonl
- mus2-primary-partial-controls.mjs and.jsonl

`node scripts/check-primary-guide.mjs` passes all four frozen exported shader
hashes and eligibility/lifecycle tests, including newly eligible partial frames.
`npm run build` passes. Because this change alters no shader source, the same
compiled shaders and all full-resolution fallback expressions are preserved.
The candidate was accepted as 68f30ba after the GPU checks below. No global
resolution, geometry or particle changes.

Production GPU validation
-------------------------

Paired RX 6800 / ANGLE OpenGL 3840x2160 measurements against be685b3,
two alternating blocks of two timed frames per side, one queued frame and
1000 ms pauses outside the timing queries:

| Time | Baseline ms | Candidate ms | Reduction | Candidate frame maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 151 | 17.50944 | 15.90200 | 9.18% | 16.15744 |
| 154.5 | 17.72794 | 15.28192 | 13.80% | 15.81956 |

This extends the existing structural optimization into another over-budget
phase. It changes eligibility only and does not tune the reuse thresholds.

Eight true-4K frames at 151/152/154.5/156.5 had identical encoded depth,
maximum final color difference 2/255 and RMS <= .02713. Four additional true-4K
frames at 151/154.5 with motion .2 and pointer [.8,-.7] also retained depth,
maximum 2 and RMS <= .02525. The 151 candidate image was viewed directly.
All four exported shader hashes remain unchanged. These are sampled checks;
whole-film 4K60 and continuous temporal behavior remain unverified.

Reports: artifacts/optimization/primary-partial-4k-{performance,quality,controls}.
