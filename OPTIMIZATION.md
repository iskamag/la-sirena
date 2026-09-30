# Rendering measurements

The reference is commit `9d414e0`. Measurements use hardware WebGL2 on an
AMD Radeon RX 6800 through Chromium ANGLE/OpenGL. They are measurements of
this renderer and machine, rather than a portable frame-rate guarantee.

The main shader dominates the heavy scenes. At 2560×1440, diagnostic variants
put raymarching at roughly 12.2 ms in flow, 11.0 ms in the shell swarm, and
10.3 ms in the cathedral. Removing work changes these diagnostic images;
these numbers establish priorities, not independently additive costs.

The march uses up to 60 or 76 samples. Each sample evaluates the scene field.
Hits additionally evaluate four normal samples, one occlusion sample, and
some scenes repeat a material query. Glow accumulates at every march sample,
so increasing the step multiplier changes the picture even when the hit is
similar. Conservative field bounds can skip expensive geometry while keeping
the original sample positions, stopping conditions, material order and glow.

## Accepted changes

- Conservative shell, flow, roof, tetrahedron, satellite and cage bounds.
- Compositor-owned secondary rendering avoids synchronous GL state queries.
  Standalone layer rendering retains caller-state restoration.
- Flow detail lookahead proves when all three strands cannot beat the current
  minimum. Surviving strand expressions and material priority remain intact.
- Browser exports explicitly allocate the requested dimensions. Previously a
  4K viewport could still render the world at the HQ 1920-pixel cap.

Before flow lookahead, full-graph 3840×2160 GPU measurements improved from
27.1 to 20.2 ms in the shell swarm, 31.2 to 24.3 ms in flow, and 31.9 to
26.5 ms in the cathedral at selected heavy timestamps. Flow lookahead alone
then reduced four flow samples by another 7.1–8.7%, to 21.0–22.2 ms.
The 16.7 ms budget for 4K60 remains unmet in heavy scenes.

Initial integrated changes passed 184 consecutive-frame comparisons across
23 timestamp windows at 960×540 with unchanged encoded depth. Most color
frames matched exactly; flow had differences up to 2/255, RMS below .034.
Flow lookahead passed an additional 56-frame comparison with exact color
and encoded-depth matches. These sampled checks do not prove equivalence
for every time, resolution, pointer position, or graphics driver.

## Reproducing checks

```sh
npm run verify:render-state
npm run profile:render -- --baseline-ref 9d414e0 --mode compare --check
npm run profile:render -- --baseline-ref 9d414e0 --mode bench --width 3840 --height 2160 --check
```

The profiler serves frozen source snapshots and injects its QA hooks in memory.
It records source hashes, rejects software rendering, and uses disjoint GPU
timer queries plus completion fences. Timings alternate reference/candidate
order across four blocks of 24 advancing frames. Comparisons reset temporal
history, warm up two frames, then inspect eight consecutive graded-color and
base-depth frames per timestamp. Depth is the renderer's RGBA8 alpha encoding.
Graphics/text overlay pixels are outside this comparison; their source is
unchanged by shader optimization.

`--candidate` selects another checkout; `--baseline` selects the reference
checkout and `--baseline-ref` optionally freezes a Git revision. `--times`
accepts a JSON array. `--sequence`, `--blocks`, `--batch`, and `--out` control
sampling and reports. `--check` requires no GL errors, no depth differences,
maximum color difference at most 2/255, and RMS at most .05 in byte units.
Optional `--budget-ms` checks the candidate median GPU timing. Artifacts are
ignored by Git. The checks deliberately distinguish sampled color tolerances
from exact equality.

## Rejected or unmerged experiments

Larger flow steps and fewer cloud samples changed visible highlights or cloud
structure. Factoring strand trigonometry and evaluating the previous nearest
group first introduced isolated depth/color differences on this driver despite
equivalent real-number formulas. These candidates remain unmerged.

A GPU roof transform table also failed the strict image/depth gate during the
rupture; separate shader compilation can change floating-point hash and rotation
results even with RGBA32F storage. Per-scene specialization remains experimental.
