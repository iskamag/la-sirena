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
- A conservative global flow upper bound rejects whole groups before their
  strand/detail calculations. Centers are evaluated once, and the original
  group and material order is retained. The rounding margin is validated for
  the film's finite time, motion, beat and coordinate domain; other inputs use
  the original cutoff.
- Flow particle footprints omit at most 8e-9 accumulated radiance before
  post-processing, avoiding negligible exponential tails.
- A cathedral spoke bound avoids angular calculations when the radial and
  axial constraints already prove that the spokes cannot win.
- Browser exports explicitly allocate the requested dimensions. Previously a
  4K viewport could still render the world at the HQ 1920-pixel cap.

Before flow lookahead, full-graph 3840×2160 GPU measurements improved from
27.1 to 20.2 ms in the shell swarm, 31.2 to 24.3 ms in flow, and 31.9 to
26.5 ms in the cathedral at selected heavy timestamps. Flow lookahead alone
then reduced four flow samples by another 7.1–8.7%, to 21.0–22.2 ms.
The 16.7 ms budget for 4K60 remains unmet in heavy scenes.

Particle footprint culling reduced four flow samples by a further 3.9–4.3%,
to 19.5–21.1 ms at 4K. It passed 112 lower-resolution frames and eight 4K
frames with unchanged encoded depth; color differences were at most 2/255.
The cathedral spoke bound reduced three 4K samples by 2.5–4.0%, to 21.6–25.6
ms. Its 64-frame lower-resolution comparison had unchanged depth and mostly
exact color; nine 4K frames had unchanged depth and color differences at most
2/255. Twenty portrait frames at 540×960, reduced motion .2 and pointer
[.8,-.7], also passed with unchanged depth and at most 1/255 color differences.

The global flow upper bound reduced four further 4K samples by 9.7–14.6%,
to 18.0–18.1 ms. Fifty-six lower-resolution frames matched color and encoded
depth exactly. Nine 4K frames retained identical depth and color differences
at most 2/255, RMS below .0015. Three million float32 upper-bound samples and
200,000 group/material-order replays found no bound or selection violations.

Padded approximate flow centers now reject whole groups before evaluating their
original centers. Approximate values never supply surviving distance or material
results. This reduced four 4K samples by another 3.5–4.7%. The flow arithmetic
domain is certified once per frame by `flow-bounds.js`; unusual inputs retain
the original cutoff. Moving this certificate out of each field query reduced
two 120-frame runs by a further 3.5–3.6%, to 16.49 and 16.82 ms.

A fresh comparison of the current source against `9d414e0`, using two blocks
of 120 advancing frames at 4K, measured shell 26.99→20.24 ms, flow
30.58→16.63 ms, and cathedral 32.00→25.55 ms. These are batch averages,
not per-frame tail latency. Heavy scenes still exceed the 4K60 budget.

Initial integrated changes passed 184 consecutive-frame comparisons across
23 timestamp windows at 960×540 with unchanged encoded depth. Most color
frames matched exactly; flow had differences up to 2/255, RMS below .034.
Flow lookahead passed an additional 56-frame comparison with exact color
and encoded-depth matches. Nine further frames at 3840×2160 had unchanged
encoded depth and color differences at most 2/255, RMS below .0015.
These sampled checks do not prove equivalence
for every time, resolution, pointer position, or graphics driver.

## Reproducing checks

```sh
npm run verify:render-state
npm run profile:render -- --baseline-ref 9d414e0 --mode compare --check
npm run profile:render -- --baseline-ref 9d414e0 --mode bench --width 3840 --height 2160 --check
```

The profiler serves frozen source snapshots and injects its QA hooks in memory.
Snapshots include choreography and optional bound/cache helpers. Reports record
the selected world and shot, and explicit Mesa driver diagnostic options.
`--images` saves the first compared graded frame at each timestamp as baseline
and candidate PNGs, flipped from GL's bottom-first rows for visual inspection.
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

`--motion` selects a value in [0,1], `--pointer` accepts a JSON pair in [-1,1],
and `--poster` exercises the landing film state. These settings are recorded
in the report. For example:

```sh
npm run profile:render -- --baseline-ref b4bac57 --mode compare --width 540 --height 960 --motion .2 --pointer '[0.8,-0.7]' --times '[11,35,144,160,169.9]' --sequence 4 --check
```

## Rejected or unmerged experiments

Static RadeonSI compiler diagnostics are available with:

```sh
node scripts/profile-shader-cost.mjs --revisions HEAD --time 35 --scene 1 --no-inline --out artifacts/shader-cost
```

The tool uploads the same flow-bound certificate as the renderer and writes
translated GLSL, ISA logs and register/opcode statistics. The current generic
main shader uses 96 VGPRs and 108 SGPRs, with no spills or scratch memory and
a compiled limit of five waves. Static instruction counts cover all scene
paths; they do not measure executed instructions or dynamic occupancy.

Larger flow steps and fewer cloud samples changed visible highlights or cloud
structure. Factoring strand trigonometry and evaluating the previous nearest
group first introduced isolated depth/color differences on this driver despite
equivalent real-number formulas. These candidates remain unmerged.

A GPU roof transform table also failed the strict image/depth gate during the
rupture; separate shader compilation can change floating-point hash and rotation
results even with RGBA32F storage. Per-scene specialization also failed the
strict gate, with isolated depth changes in flow and arcade scenes, and remains
unmerged.

A tighter nautilus meridian bound passed image comparisons but regressed the
heavy shell swarm by 8.2–8.3% at 4K. A CPU ray replay found it rejects only
0.9–3.4% of the calls surviving the existing sphere guard. The additional
distance calculations therefore cost more than the detail they avoid.

Per-strand approximate bounds preserved all 56 sampled frames exactly and
skipped 42–48% of animated strand trig pairs in a CPU ray replay, yet regressed
4K GPU timing by 6.9–7.5%. Retaining a hit material across the ray loop also
passed image checks but regressed timing by .4–.5%. Both remain unmerged.
CPU work counts alone do not establish a GPU speedup: extra bounds, control
flow, lane divergence and register allocation also matter.
