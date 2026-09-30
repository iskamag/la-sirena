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
- Closed cathedral roof cells use conservative box bounds before evaluating
  their two plates. Surviving expressions and the opened-roof path are retained.
  At 144 s, a small paced 4K comparison measured 23.55→20.83 ms (-11.5%);
  at 160 s the opened path was essentially unchanged. See `ROOF-CLUSTERS.md`.
- Cathedral cloud noise caches four original hash corners per cell in a
  static 4 MiB RGBA32F texture. Interpolation and octave arithmetic are retained;
  unsupported devices and out-of-grid queries use the original hashes.
  Small paced 4K samples measured another 12.2% closed-roof and 9.8% opened-roof
  improvement. See `NOISE_CACHE.md` for image checks and measurement scope.
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
and 1000 ms of cooldown between timed frames (increased from 25 ms after
the renewed freeze report). Each chunk has a separate query;
GPU averages exclude cooldown, while wall times include it. Reports record
`scheduling` and per-sample `deliberateWaitMs`. `--max-queued-frames` and
`--cooldown-ms` control this policy. The historical results above used sustained
queues; paced results may differ as clock and load conditions change. Scheduling
has passed `node scripts/check-profile-scheduling.mjs` for queue limits,
query sums, sample order, disjoint propagation and fence cleanup;
small GPU comparisons subsequently resumed with one queued frame and 100 ms
cooldown. Desktop input latency was not measured. After another user report
of desktop freezes, GPU testing was suspended again. The user subsequently
authorized resuming GPU rendering. Recent small comparisons use 250–1000 ms
pauses and one queued frame; timings use 1000 ms. Desktop input latency remains
unmeasured. Reports now record whether the optional noise cache initialized
successfully for each side. Preparation, warmup and comparison frames now
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
check. Later hardware tests found late-rupture image differences in variants
that added roof guards directly to the original function. These variants
remain unmerged. A floor/pillar/arch-only candidate showed no useful measured
speedup at 1280×720.

The separate `optimize/roof-vertical` candidate (`f2d1b05`) tightens the plate's
vertical support to `min(1.903,.068+2.04*opening)` before adding the moving
center interval. Inverse-rotation axis support gives this bound without new
trigonometry. CPU roof skips rise to 70.2–72.0% before opening, eliminating
another 10.6–12.3% of the previous candidate's surviving hash evaluations;
open-roof skip rates are unchanged. One million random cases per field and
62,100 targeted roof cases passed for two seeds. Offline GLSL linking passed.
The combined vertical candidate reduced a sampled 1280×720 closed-roof
window by about 13.8%, but failed the strict late-rupture color gate. A
scaled-coordinate rewrite also failed late-rupture color and encoded depth.
This led to the accepted separate closed-roof helper in `6d9eb5b`, which keeps
the original opened function intact and passes the sampled image gates.
The general hierarchy variants remain unmerged.

A later opened-roof guard (`42d4ddc`, tested with the accepted cloud cache
as `3569674`) keeps original hash, center, subtraction and sphere-test
expressions, then bounds each plate vertically before rotations. It passed
eight 640×360 frames exactly but regressed two paced 1280×720 windows by
6.8% and 8.7%. Two blocks of four timed frames per side used one queued
frame, 1000 ms pauses and uniform inlining disabled. It remains unmerged.
Generic driver diagnostics retain 96 VGPR, 108 SGPR, no spills/scratch and
five compiled maximum waves. Static vector ALU instructions increased
62,839→63,703; code size increased 421,140→427,188 bytes. Those counts do
not measure executed work or establish the runtime cause of the regression.

The shader-cost tool now binds a complete placeholder for the optional hash
cache sampler and explicitly disables the cache for its single-frame compiler
diagnostic. This avoids an incomplete-sampler GL error on current revisions.
With uniform inlining disabled, the generic shader still contains both paths;
these diagnostics do not measure the enabled cache's rendering performance.

Decorative-wire bounds (`7f6327b`) passed six 640×360 frames exactly, but
small paced 1280×720 comparisons regressed 144/160 s by .3%/.96%. Removing
the crown guard (`3552ed2`) measured +1.3%/-0.4%; one baseline frame outlier
weakens the apparent early gain. Neither establishes a useful speedup and
neither is merged. CPU skip counts of 47–68% for lanterns and 59–83% for
crowns describe field-call opportunities, not saved whole-wave GPU work.

The exact zero-density cloud-layer lighting skip (`7952473`) passed six
640×360 frames exactly, but measured only .2%/.6% lower GPU time in those
same two 1280×720 windows. It retains all density queries and saves only
ceiling/lighting work; a clear speedup is unproven and it remains unmerged.
Each timing experiment used two blocks of four frames per side, one queued
frame, 1000 ms pauses and RadeonSI uniform inlining disabled.

A compact normal-query loop (`b0749c5`) retained the four original offsets
and left-to-right additions. Ten sampled 640×360 frames passed unchanged
encoded depth, maximum color difference 2/255 and RMS below .0153. Generic
driver code size fell 421,140→322,876 bytes (-23.3%), with the same 96 VGPR,
108 SGPR, no spills/scratch and five compiled maximum waves. Nevertheless,
small paced cathedral timings were flat at 1280×720 (+.08%/+.04%), and at
4K measured 18.313→18.315 ms and 21.814→21.866 ms. Smaller static code alone
did not improve these sampled render times; the candidate remains unmerged.
The 4K runs used two blocks of two frames per side; scheduling and driver
options match the earlier 1000 ms paced experiments.

An angle-only roof cache (`5d48c22`) stored the original three rotation pairs
in a 12x33 RGBA32F texture, retaining direct evaluation as fallback. It
passed early 640x360 windows but failed at 169.9 s: maximum color difference
68/255 and four encoded-depth changes. A same-source cache-disabled/enabled
comparison reproduced that failure. A small paced 1280x720 opened-roof
comparison measured 2.695 to 2.718 ms, so neither fidelity nor speed supports
merging it. The profiler now exposes the cache's allowed/enabled/valid state
and can disable the baseline roof-angle cache for this diagnostic.

The correlated whole-roof vertical bound (`a436257`, candidate `aa889ef`)
rejects all eighteen plates before row/hash/rotation work when the existing
geometry cutoff already wins. Both original approximate global returns remain
first. It passed 45 sampled frames with exact color and encoded depth: eight
640x360 cathedral frames, eighteen 960x540 transition frames, three true-4K
frames, eight portrait/control frames and eight motion-disabled frames across
chapters. The opened cathedral image was also inspected directly.

Small paired 4K tests measured 160 s at 21.651 to 20.811 ms (3.88% faster),
while 144 s was effectively flat at 18.043 to 18.121 ms. Two blocks of two
frames per side used one queued frame, 1000 ms pauses and uniform inlining
disabled. At 1280x720, two blocks of four frames with 250 ms pauses measured
.48%/3.49% gains at 144/160 s. These are sampled windows, not whole-film
60 fps evidence; the opened window remains above the 16.67 ms budget.
Reports are in `artifacts/optimization/roof-global-y-*`. The production build,
352-frame render-state check and independent million-case CPU bound check
passed after integration. See `ROOF-GLOBAL-Y-BOUND.md` for the enclosure proof
and the limits of its floating-point model.

A fresh cloud-cost diagnostic based on `3d11da8` replaced only the scene-3
cloud background call with a constant. Raymarching, geometry, shading and
postprocessing remained intact. At 1280x720, small paired timings measured
144 s at 2.239 to 1.758 ms (21.5% reduction) and 160 s at 2.610 to
2.125 ms (18.6%). This intentionally changes the image and remains an
uncommitted diagnostic in `/tmp/mus2-diagnostic-cathedral-cloud-cost`.
The difference identifies substantial remaining cloud cost; it is not an
independently additive cost or an accepted quality-preserving optimization.
Two blocks of four frames per side used one queued frame, 250 ms pauses and
uniform inlining disabled. Report: `artifacts/optimization/current-cathedral-cloud-cost/bench-1280.json`.

The per-frame cloud hash-cache certificate (`40a1ca8`, `f091ad9`) removes
repeated cell-range comparisons from certified film frames, retaining guarded
cached/direct lookup for unusual inputs and the native direct fallback. All
42 sampled frames matched color and encoded depth exactly, including three
4K frames, 23 integrated chapter samples and eight portrait/control frames.
Small paired 4K timings measured 144 s at 18.545 to 18.260 ms (1.54%) and
160 s at 21.434 to 21.071 ms (1.69%). Each side used two blocks of two
frames, one queued frame, 1000 ms pauses and uniform inlining disabled;
feature records confirm certified cache flag 2. Lower-resolution timings
measured 1.60%/2.12% gains. Build, domain/lifecycle checks and 352-frame
render-state checks passed after integration. This is a modest sampled gain;
the 4K60 budget remains unmet. See `NOISE-CACHE-CERTIFICATE.md` for proof
scope and `artifacts/optimization/noise-certified-*` for reports.

Roof winner-first dispatch (`9663fce`) retained fixed x/z/i expressions and
used the previous plate/row to tighten the existing sphere guards. CPU replay
saved 46–50% of opened plate calculations with unchanged capped fields. GPU
checks nevertheless failed at 169.9 s: maximum color difference 10/255 and
five encoded-depth changes. Earlier frames were exact or differed by at most
1/255. A small paced 1280x720 160 s timing regressed 2.654 to 2.936 ms
(10.6%), so the candidate remains unmerged and precision repair is not
justified by this measured result. Two blocks of four frames per side used
one queued frame, 250 ms pauses and uniform inlining disabled. Reports:
`artifacts/optimization/roof-winner-paced-*`.

The full-float distant-cloud prepass (`75c7d43`, `22282f1`, `7f1d055`) uses
half-resolution RGBA32F radiance while keeping the nearby sheet, lighting,
geometry, raymarching and compositor at full resolution. It is enabled at
output height >=1440 with supported float rendering/filtering; other paths
retain direct evaluation. The initial RGBA16F prototype improved 4K timing
but failed the RMS gate; full-float storage repaired the sampled failures.

Integrated default-driver paired 4K timing measured 144 s at 17.586 to
15.455 ms (12.12%) and 160 s at 20.723 to 18.387 ms (11.27%). Two blocks
of two frames per side used one queued frame and 1000 ms pauses. All 42
sampled image frames retained identical encoded depth. Active high-resolution
frames had maximum color difference 2/255 and RMS <=.02291; all 23
lower-resolution fallback chapter samples were exact. Gates include Ultra,
portrait pointer/reduced-motion controls, motion disabled and a post-integration
4K pair. The saved production 4K image was viewed directly. This approximation
passes the sampled color/depth gates; universal equality is not claimed.
Build, float capability/lifecycle/eligibility checks, cache-domain checks,
352-frame render-state check and native fallback recording passed. The opened
4K window still exceeds 16.67 ms, so whole-film 4K60 remains unproven. See
`CLOUD-VOLUME.md` and `artifacts/optimization/cloud-volume-integrated-*`.

For an absolute GPU audit of the current candidate without rendering a reference,
use benchmark-only mode:

```sh
npm run profile:render -- --candidate-only --mode bench --width 3840 --height 2160 --times '[144,160,169.9]' --blocks 2 --batch 4 --budget-ms 16.667 --check
```

This opens one candidate page and reports side 0 as `candidate`, with source
hashes, absolute median/frame timings and the candidate budget gate. It omits
baseline metadata and reduction percentages. Default runs retain alternating
paired measurements. `--candidate-only` rejects comparison mode and baseline
roof-angle disabling. CPU scheduling and aggregation coverage is included in
`node scripts/check-profile-scheduling.mjs`.

Removing the per-frame cloud validation query (`a6ef0f1`) showed no useful
GPU improvement in a small paired default-driver 4K 160 s test. The two
blocks of two frames measured 17.794 to 18.615 ms (-4.6%); individual
frame maxima were similar, so this is not a causal explanation of the
difference. The candidate remains unmerged. Report:
`artifacts/optimization/cloud-volume-query-4k-default-performance`.

The benchmark tool now supports `--candidate-only --mode bench` for absolute
one-page audits, avoiding duplicate reference rendering. Reports label the
side as candidate, retain its source hashes and omit paired reductions.
CPU scheduling/aggregation checks cover both modes and reject invalid
one-sided comparisons or missing measurements.

The opened cathedral now uses a quarter-resolution miss/glow guide with
full-resolution surface marching and a conservative window/spoke support guard.
An optional second world program preserves the original shader source for
closed/transition frames, portrait, lower resolutions and capability failures.
Default-driver integrated 4K paired timings measured 160 s at 18.476 -> 15.584
ms (15.65%) and 169.9 s at 18.524 -> 14.949 ms (19.30%). Sampled frame maxima
were <=15.819 ms. Five integrated 4K comparisons retained identical depth and
maximum color difference <=2; all 23 low-resolution chapter samples were exact.
The initial guide genuinely lost two window spokes; its periodic support guard
repaired that reproduced failure before integration. Portrait exceeded the
strict color gate at one channel and retains the original pipeline. See
`PRIMARY-GUIDE.md` for eligibility, controls, source fidelity and evidence limits.
Whole-film 4K60 and continuous tails remain unverified.
