Current source note: canyon rejection e011ead subsequently updated the shared
source prefix and frozen shader hashes. Its flow/cathedral GPU regression
frames matched exactly; see CANYON-BOUNDS.md. The measurements below describe
the original flow integration.

# Flow primary miss/glow guide prototype

This candidate extends the existing quarter-resolution primary guide to flow scene 1. A full-resolution ray skips its entire primary march only when the four neighboring guide rays all miss, their capped glow spread is at most .02, and their minimum normalized clearance exceeds `2.5/(height*lens)`. Accepted misses use bilinear guide glow. All other rays retain the full-resolution production march, normals, materials, particles and shading.

This is a heuristic with bounded CPU evidence, not a no-hit certificate or exact glow reconstruction. GPU timing and sampled fidelity checks passed as recorded below. The shared derived shader programs change for cathedral as well; cathedral regression checks are included below. Exported production world/cloud shader source remains byte-identical and every unsupported feature/frame uses that fallback.

Flow eligibility is restricted to scene 1, time [34.020,81.655), finite supported camera inputs, poster off, density [0,1], landscape, height at least1440. The guide uses the same scene-dependent camera, 76 iterations, `abs(mapWorld)` and .0013 glow coefficient as production. Cathedral retains its60iterations/.00075 behavior and window-support guard. The guide receives the same validated flow coarse-bound flag as the full-resolution renderer. Allocation, capability failure, draw failure, portrait and ineligible transitions retain the existing complete fallback and validity reset.

## CPU exploration

Diagnostics are `/tmp/mus2-flow-prefix-cpu.mjs`, `/tmp/mus2-flow-miss-cpu.mjs` and `/tmp/mus2-flow-guide-adversarial.mjs`, with JSON/JSONL outputs at matching paths. They evaluate original unpruned flow formulas in binary64, production 4K camera and76-step primary march. These are mathematical opportunity/risk models, not driver arithmetic replicas.

* HIT prefixes were rejected: only15.3%/12.3% of sampled full-resolution rays hit at35/58; the most permissive prefix saved only1.83%/.77% of primary queries net of the quarter prepass.
* MISS sharing:4,096 deterministic random4K pixels per time. Misses consume86.9%/89.1% of primary queries. The unchanged .02 spread and2.5 clearance gates save48.1%/50.5% of primary queries net of estimated6.25% guide work. No admitted hidden hit was found. Maximum capped glow error .00645/.00580, RMS .000240/.000206. These are query counts, not predicted frame speedups.
* Thin-feature adversarial scan:514,667 pixels at35/58, sampling projected thread/strand surfaces, periodic link rings and cells throughout the camera's forward32units, each with a ±2pixel neighborhood. Among212,025 hits were67,324 threads,116,195 strands,21,632 links and6,874 cells. Seventeen true hits had four missed guide neighbors; all17 were rejected by the combined existing glow/clearance gate. No admitted hidden hits found. This is bounded negative evidence, not a guarantee for other frames or controls.

CPU-only validation: guide eligibility/lifecycle/source checks, render-state verification, offline GLSL compilation of world and guide, and Vite build passed. No GPU/browser/native render was launched by this agent. Root owns paced serial GPU quality/performance testing.

## GPU measurements

Paired RX 6800 / ANGLE OpenGL 3840x2160 measurements against 81f09a8,
two alternating blocks of two timed frames per side, one queued frame and
1000 ms pauses outside the timing queries:

| Time | Baseline ms | Candidate ms | Reduction | Candidate frame maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 35 | 16.13043 | 11.63615 | 27.86% | 12.04976 |
| 58 | 16.14961 | 11.32549 | 29.87% | 11.56908 |

Four true-4K flow frames at 35/58 retained identical encoded depth, maximum
final color difference 2/255 and RMS <= .01984. Four shared-program cathedral
regression frames at 160/169.9 retained depth, maximum 1 and RMS <= .00253.
The 35-second GPU candidate image was viewed directly.

The integration retains partial-opening eligibility from 68f30ba, with exactly
the shader strings tested in 65628ba. Ten additional true-4K frames at
34.021/47.631/81.65/151/154.5 retained depth and maximum color difference <=2.
The 81.65 sequence crosses the flow eligibility boundary; the early sequence
covers entry from a different scene. Flow RMS was <= .02090; partial cathedral
RMS was <= .00235. These remain sampled fidelity checks, not universal no-hit
proofs or whole-film continuous performance evidence.

Reports: artifacts/optimization/flow-primary-miss-4k-{performance,quality},
flow-primary-integrated-4k-boundaries.

Six further 4K frames at 35/47.631/81.62 with pointer [-1,1] retained depth,
maximum final color difference 2 and RMS <= .02047. Six motion-disabled 4K
frames at 35/58/81.62 retained depth, maximum 2 and RMS <= .02200. Reports:
flow-primary-integrated-4k-pointer and flow-primary-integrated-4k-motion-zero.

Independent CPU replay covered 57 boundary/interior/camera/control cases
(50,176 random 4K pixels), then 274,032 projected thin-feature candidates
including 105,611 hits at beginning/end and pointer/motion controls. No hit
passed the reuse gate; all 62 hits hidden by four guide misses were rejected
by clearance or glow spread. These checks supplement the original 514,667
pixel adversarial scan and remain bounded binary64 evidence.

Integration CPU source/eligibility/lifecycle, render-state and window-guard
checks passed. Build passed (17 modules, 175.87 kB JavaScript, 55.35 kB gzip).
The optional guide shaders are exactly the GPU-tested 65628ba strings.
