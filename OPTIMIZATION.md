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
- Shell swarm bounds also compare against a cheap upper bound on the eventual
  tidal floor. The waves sum to at least -.16, so `(p.y+2.02)*.67+.0001`
  bounds that floor from above without early sine evaluations. The floor and
  surviving shells retain their original arithmetic and material order.
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

Shell floor lookahead subsequently reduced two heavy 4K windows by
25.44–25.47%, from 19.69–20.11 to 14.68–14.98 ms, across four alternating
blocks of 120 advancing frames. A lighter window improved 3.31→2.77 ms.
The 184-frame integrated comparison across 23 windows retained identical
encoded depth, with at most 1/255 color differences; most frames were exact.
Nine 4K frames had unchanged depth and at most 1/255 color differences.
Twenty portrait frames with reduced motion and an offset pointer were exact.
Saved portrait pairs were visually inspected for corrugations, reflections,
rims and arcs. One million float32 floor-bound samples over y in [-64,64]
found no violations. Cathedral performance still exceeds the 4K60 budget.
Native GLES compilation and three full render-graph frames (shell, flow and
cathedral) completed with no GL errors; the production build also passed.

A subsequent 23-window 4K audit (two blocks of 60 advancing frames) found
sampled shell windows below budget, flow at 16.78–16.86 ms, and cathedral
windows at 24.50–25.49 ms. The 169.9-second window crosses the chapter cut,
so its 18.10 ms average mixes scenes. Other sampled windows were below
16.7 ms. This sparse audit does not establish whole-film frame-time tails.

Initial integrated changes passed 184 consecutive-frame comparisons across
23 timestamp windows at 960×540 with unchanged encoded depth. Most color
frames matched exactly; flow had differences up to 2/255, RMS below .034.
A fresh repeat against the original `9d414e0`, including the shell floor
lookahead and current flow bounds, passed all 184 frames with the same limits:
unchanged encoded depth, exact color outside the two flow windows, maximum
flow difference 2/255 and RMS below .034. Reference/candidate PNGs were saved.
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
order across four blocks of 24 advancing frames. After sustained batches made
the shared desktop unresponsive, the profiler now defaults to one queued frame
and 25 ms of cooldown between timed frames. Each chunk has a separate query;
GPU averages exclude cooldown, while wall times include it. Reports record
`scheduling` and per-sample `deliberateWaitMs`. `--max-queued-frames` and
`--cooldown-ms` control this policy. The historical results above used sustained
queues; paced results may differ as clock and load conditions change. Scheduling
has passed `node scripts/check-profile-scheduling.mjs` for queue limits,
query sums, sample order, disjoint propagation and fence cleanup;
its live desktop responsiveness remains unverified. No further GPU runs were
started after the freeze report. Preparation, warmup and comparison frames now
also wait for their completion fence and cooldown. Per-query chunks are recorded
with their timestamps and frame counts. With one queued frame, summaries include
`gpuFrameP95Ms` and `gpuFrameMaximumMs`; larger chunks retain averages without
claiming per-frame tails. Comparisons reset temporal
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

A simplified closed-roof helper preserved the opened roof's original source
but still changed one encoded-depth pixel in each of two early windows.
A static roof hash cache reduced two 4K timings by only 1.7–2.5% and retained
its previously observed late-rupture image failure. Neither is merged.

Simple screen tiling split only the main draw into four 2×2 scissor rectangles,
retaining the full viewport, shader and pixel coordinates. Four alternating
blocks of 120 frames at 4K found less than .01% timing difference in shell,
flow and cathedral (14.92, 16.50 and 25.48 ms respectively). It remains an
unmerged diagnostic branch; useful tiling would need to eliminate shared work.

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

The unmerged `optimize/cathedral-hierarchy` candidate combines floor cutoffs for
pillars/rings and arches with loose bounds around two roof plates per existing
grid cell. The original surviving expressions, component order and march
schedule remain intact. A six-window 64×36 CPU replay estimates 16.7–35.7%
tower skips, 11.9–34.4% arch skips and 41.2–68.1% roof-piece skips. These are
opportunity estimates from a binary64 replay, not measured GPU savings.

Candidate commit `30a087d` contains `CATHEDRAL-BOUNDS.md` and the reusable
`scripts/check-cathedral-bounds.mjs`. One million binary32-model samples per
field plus targeted boundaries passed with zero guarded violations or unsafe
rejections; a second million-sample seed also passed. The combined candidate
passed the production build, offline glslang GLSL linking and render-state
check. GPU image equivalence, driver compilation and timing remain unverified;
no rendering tests were started after the desktop freeze report.

The separate `optimize/roof-vertical` candidate (`f2d1b05`) tightens the plate's
vertical support to `min(1.903,.068+2.04*opening)` before adding the moving
center interval. Inverse-rotation axis support gives this bound without new
trigonometry. CPU roof skips rise to 70.2–72.0% before opening, eliminating
another 10.6–12.3% of the previous candidate's surviving hash evaluations;
open-roof skip rates are unchanged. One million random cases per field and
62,100 targeted roof cases passed for two seeds. Offline GLSL linking passed.
Neither candidate has hardware image or speed validation.
