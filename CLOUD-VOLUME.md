Experimental distant cloud volume at half resolution
===================================================

Baseline: 1a9a892. This isolated candidate is an approximation, not accepted
production code. No GPU/browser/native replay was run by this agent.

Only the additive radiance of the twelve distant cloud layers is generated into
a same-frame half-resolution RGBA16F texture. The main fragment retains the
analytic base sky and sun, the near folded cloud sheet including its fine noise,
lightning, luminance floor, geometry, raymarch, depth, shading, and film finish
at full resolution. It bilinearly samples distant radiance by screen position.
The texture contains a background field; geometry visibility stays entirely in
the full-resolution main pass, so depth-aware reconstruction is unnecessary.
All twelve samples remain in the reduced-resolution pass, with original noise,
interpolation, layer arithmetic, and transmittance order. The shader is derived
from the original camera prefix and original distant-volume loop.

Approximation sources are spatial interpolation, half-float storage, regrouping
the additive distant radiance away from the original base-sky accumulation, and
potential separate-program GPU code generation. Geometry source expressions
remain unchanged, but shader compiler changes still require depth/image gates.
No guaranteed global image-error bound is claimed.

CPU opportunity evidence
------------------------

`python3 scripts/check-cloud-volume-error.py` evaluates 4608 randomly selected
4K pixel centers at each of 144,150,156,160,165,169 seconds, comparing the same
CPU float32 volume to half-float, bilinear half-resolution reconstruction.
Maximum distant linear RGB error ranges .000113–.000683; RMS .0000151–.0000420.
99th percentile absolute errors range .0000498–.000139. At an illustrative film
slope of two, the maxima correspond to .058–.348 byte values. That slope is an
illustration, not a mathematical bound. CPU hash lowering differs from GPU
code generation. These samples omit near-sheet attenuation, geometry masking,
the luminance floor, bloom, grain, and temporal reconstruction; GPU image gates
and motion inspection remain necessary. Random sample coverage is not proof
of worst-case coverage.

The distant-volume pixel count drops by about 75%. Root's attribution for all
clouds saved 18.6–21.5% of cathedral time at 1280; this candidate retains the
expensive near sheet, so those measurements are only an upper opportunity
bound. A separate draw, bilinear texture read, target bandwidth, and driver
cost reduce the gain. No timing claim is made. The additional target is
1920×1080×8 bytes, about 15.8 MiB at 4K, allocated once and resized only when
output dimensions change. There is no temporal cache or per-frame allocation.

Integration and limitations
---------------------------

Unit 6 is reserved for the distant volume; noise cache remains unit 5.
EXT_color_buffer_float, shader/link success, and complete float framebuffer
are required. Missing support or a failed draw binds a complete 1×1 RGBA8
placeholder, sets valid=0, and executes the original twelve-layer loop.
The native command recorder lacks extension queries and always uses this
fallback. Native replay therefore does not currently exercise the candidate;
GPU gating needs the browser renderer or a deliberately enabled recorder path.
Odd dimensions use ceil(width/2),ceil(height/2), with the camera reconstructed
against full-resolution dimensions to preserve aspect. The prepass restores
full viewport/default framebuffer, then Compositor.begin selects the production
target. State ownership assumes the existing main renderer sequence. General
context-loss/reinitialization support is unchanged; recreate renderer resources
after restoring a context. Persistent failures disable the candidate until
renderer recreation. No global resolution or particle-count reduction occurs.

CPU checks
----------

- `node scripts/check-cloud-volume.mjs`
- `node scripts/check-render-state.mjs`
- `node scripts/native-plan.mjs --times 144,160 --no-overlay --no-png --output /tmp/mus2-cloud-half-trace.jsonl` (records commands only)
- `python3 scripts/check-cloud-volume-error.py`
- `npm run build`
- Export fragmentShader/cloudVolumeFragment to /tmp/*.frag and run glslangValidator on both.

Before acceptance: compare sky colors, thin geometry/depth, near-sheet contrast,
lightning, and temporal motion at rupture, open sky, varied shots, portrait, and
4K. Require unchanged depth, no visible cloud softness/shimmer, and worthwhile
paired total GPU timing. No GPU jobs have been launched for this candidate.
