# Optional temple cloud hash lattice

The renderer stores the four original hash corners of each integer noise cell
in a static 512×512 RGBA32F texture (4 MiB). The initializer extracts the original
`hash(vec2)` source from `shaders.js` and writes the lattice in one fullscreen draw.
Only `templeClouds` uses the new noise/fbm wrappers. They retain the original
smooth interpolation and octave arithmetic; scene geometry still uses its
existing noise functions.

The cache sampler explicitly uses high precision. A cached query fetches one texel for cells in `[-256,255]²`. Cells outside that
range calculate the original hashes. Binding enables the cache only in scene 3.
The initializer checks the float attachment extension, framebuffer completeness,
shader compilation/linking, and draw errors. Failure retains direct evaluation
and a complete 1×1 RGBA8 sampler on texture unit 5. Native command recording lacks
extension queries and takes this fallback. Native uniform handling now supplies
the sampler and validity flag explicitly.

## Coverage derivation

`scripts/check-noise-cache-bounds.py` propagates conservative coordinate intervals;
it does not infer coverage from sampled pixels. It includes all normalized ray
directions, all temple camera modes, pointer components in `[-1,1]`, motion in
`[0,1]`, temple time through 170.125 seconds and rupture age through 20.415 seconds.

Transport is at most `170.125*.14 + 20.415*2.35 = 71.79275`. Camera x is bounded by
1.58, z is -5, volume distances are at most 47.5, and the near sheet distance is
clamped through 53. Those bounds generate weather and sheet intervals. Each
three-octave fbm coordinate transform uses the original matrix and scales. The
warp/curl value intervals use fbm range `[0,.95]`, padded by .001 for rounding.
The checker covers all 19 octave/fine input domains: volume warp/cloud, sheet
curl/macro and fine noise.

The resulting input range is `[-237.760209,248.010395]`, so floor cells lie in
`[-238,248]`, inside the chosen lattice. Forced scenes or unusual inputs can query
other cells safely through direct evaluation. Each edge texel stores its original
four corners, including hashes of neighboring cells outside the texture extent.

## CPU validation

Run from the candidate checkout:

```sh
node scripts/check-noise-cache.mjs
python3 scripts/check-noise-cache-bounds.py
node scripts/check-render-state.mjs
node scripts/native-plan.mjs --times 144,160 --width 96 --height 54 --output /tmp/noise-cache-native.jsonl
```

Capability/failure mocks cover missing API/extension, thrown extension lookup,
incomplete attachment, compile/link failure and draw errors, plus successful
initialization, scene isolation and resource disposal. The independent render
state checker still matches all 352 frame cases. Native command recording
supplies validity zero and the complete sampler on unit 5. Both fragment shaders
and the world vertex shader passed CPU `glslangValidator`; Vite builds passed.
None of these checks establish GPU hash equality or rendering performance.

## Startup and lifecycle

Initialization allocates 4 MiB and submits one 262,144-fragment GPU draw. Its GPU
cost and shader compilation delay have not been measured. There are no per-frame
cache update draws or asynchronous initialization loops. Resize reuses the same
lattice. `dispose()` releases owned resources.

The existing application stops playback on context loss and asks for reload;
it has no automatic context restoration/reinitialization. A restored context
must create a new renderer and cache. Hardware comparisons now pass the sampled gates below. Startup timing and
whole-film performance remain unmeasured.

## Hardware validation and performance

The accepted shader hash is
`d5d92dddbd5674d4fec4975b4bfffe919e8e3c80e2ca481d32641de8dfed9929`.
All comparisons use the preceding accepted renderer at `6d9eb5b` as reference.
Color and encoded depth matched exactly in four initial 640×360 frames,
14 transition frames at 960×540, three 3840×2160 frames, 46 frames across
23 integrated windows at 960×540, and eight 540×960 portrait frames with
motion .2 and pointer [.8,-.7]. All report no GL errors. The portrait report
confirms cache initialization succeeded for the candidate and was absent in
the reference. A saved opened-cathedral image was visually inspected.
These sampled comparisons do not prove equality for every film frame/device.

Small alternating hardware timing runs on RX 6800, with RadeonSI uniform
inlining disabled, one queued frame and 1000 ms cooldown, measured:

| 4K window | Reference GPU ms | Cache GPU ms | Reduction |
| --- | ---: | ---: | ---: |
| Shell 11 s | 14.068 | 14.200 | -0.9% |
| Flow 35 s | 16.101 | 15.999 | 0.6% |
| Cathedral 144 s | 20.870 | 18.325 | 12.2% |
| Cathedral 160 s | 24.552 | 22.152 | 9.8% |

Each side has two blocks of two timed frames per window, plus separately
paced warmup frames. These are small samples, not sustained 60 FPS or
whole-film tail-latency evidence. Shell/flow differences are below 1%; their
statistical significance is unestablished. At 1280×720, two blocks of four
frames per side measured cathedral reductions of 12.3% and 9.3%. Cathedral
still exceeds 16.7 ms at 4K. Cooldowns are excluded from GPU timings.

Artifacts are ignored by Git under `artifacts/optimization/noise-cache-*`.
The accepted production build, cache lifecycle/coverage checks, 352-frame
render-state checker and profiler scheduling checker passed again after merge.
