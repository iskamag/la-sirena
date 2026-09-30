# Distant cathedral cloud volume candidate

Integrated parent: `4071d47`, including the certified cloud hash cache. This
candidate remains under GPU validation. The new prepass runs only in scene 3
at output height at least 1440, covering Ultra 2560×1440 and true 3840×2160.
Lower resolutions execute the original twelve-layer volume loop in the main
shader. Missing float rendering or linear filtering support also uses that
original path.

The twelve distant layers generate additive radiance into a same-frame,
half-resolution **RGBA32F** target. The main fragment retains the analytic sky
and sun, near folded cloud sheet and its fine noise, lightning, luminance floor,
geometry, raymarching, encoded depth, shading and compositor at full resolution.
It samples distant radiance with bilinear interpolation. All twelve samples
remain in the prepass, using the original noise, interpolation, layer arithmetic
and transmittance order. The generated shader copies the original camera prefix
and volume loop, including the certified hash-cache fast path.

This introduces spatial interpolation, regrouping of additive radiance away
from the original base-sky accumulator, and separate-program code generation.
RGBA32F avoids the half-float quantization of the first prototype. No global
error bound is claimed. The height threshold preserves direct evaluation where
lower-resolution interpolation previously exceeded the chosen image gates.

## Evidence and remaining gates

The original RGBA16F prototype improved sampled 4K GPU timing by 14.27% in a
closed-roof window and 11.99% in an opened-roof window, but failed the RMS image
gate. Those timings belong to the rejected half-float prototype. The RGBA32F
revision passed preliminary 4K windows at 160 and 169.9 seconds against parent
`1a9a892`: maximum color difference 2/255, RMS .0144/.0156, encoded depth
unchanged. These are sampled gates, not proof of all frames or configurations.
The integrated candidate still needs paired timing, Ultra/4K comparisons,
transitions, varied motion/pointer/shot settings and temporal motion inspection.

`scripts/check-cloud-volume-error.py` is preliminary CPU opportunity evidence
for the earlier half-float reconstruction. It samples distant radiance only;
it does not establish the current RGBA32F candidate's full-film error or speed.

## Resources and fallback

Unit 6 holds the volume; the hash lattice remains on unit 5. The prepass requires
`EXT_color_buffer_float`, `OES_texture_float_linear`, successful shader/link,
and a complete RGBA32F framebuffer. Allocation or draw failure disables it and
binds a complete 1×1 RGBA8 placeholder. Its validity flag selects the original
volume loop. Native recording lacks extension queries and retains this fallback.

The target uses `ceil(width/2) × ceil(height/2)` texels. Camera reconstruction
uses full output dimensions to preserve aspect at odd sizes. A 4K target is
1920×1080×16 bytes, about **31.6 MiB**. It is resized when dimensions change;
there is no temporal cache. Low-resolution frames clear validity so an earlier
eligible frame's radiance cannot be reused. State ownership follows the main
renderer sequence: prepass, `Compositor.begin()`, world, secondary layers, finish.

## CPU verification

- `node scripts/check-cloud-volume.mjs`: original volume source, capability and
  float-linear failure, RGBA32F upload, odd dimensions, 1439/1440 eligibility,
  low/high/low validity transitions, scene isolation, failure and resource release.
- `node scripts/check-noise-cache.mjs`: certified hash cache and lifecycle.
- `node scripts/check-render-state.mjs`: secondary-layer draw-state contract.
- Production build and offline GLSL ES 3.00 linking for both fragment programs.

These checks submit no GPU work. They establish source/resource behavior and
syntax; root GPU validation determines image fidelity and runtime benefit.
