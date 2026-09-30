Opened cathedral primary miss/glow guide
=======================================

Integrated from guarded candidate f6cf99b; source baseline 0f7b6fb.
The production world and cloud shader exports are byte identical to that
baseline. primary-shaders.js derives a separate guide-aware world and guide
prepass through unique source anchors. Their exported strings are byte identical
to the tested window-guard 8bd869a prototype. Source drift fails explicitly at module load.

Only landscape/square scene 3 at output height >=1440, time >=151 and positive rupture
opening (event.z >0) can use the optional world program. Partial opening was validated
separately in PARTIAL-GUIDE.md; the shader strings and guide thresholds are unchanged. Controls must satisfy the
cloud coordinate certificate (time <=170.125, normalized motion/beat and
pointer range, finite camera controls and event age), plus normal density,
finite transport and poster disabled. Unsupported resources, shader/link errors,
attachment/draw errors or an ineligible frame select the production program.
Each render invalidates the previous guide before testing eligibility. Both
world programs use the same explicitly bound position attribute and matching
uniform locations. Native recording retains the production shader pipeline.

A quarter-resolution RGBA32F target runs the original 60-sample cathedral
march, without shading or clouds. It stores capped glow, hit flag, normalized
clearance and a window-support exclusion flag. Four neighboring guide texels must report misses,
small glow spread and enough clearance before interpolated glow is reused.
Other pixels run the original full march. Clouds keep the accepted volume path.
At 4K the target is 960x540 (~7.9 MiB), nearest filtering on texture unit 7;
EXT_color_buffer_float and successful allocation/draw are required.

The window flag certifies exclusion of the expanded periodic window/spoke
support volumes for the whole containing guide tile. The other gates remain
heuristics, not an all-geometry no-hit certificate. Root testing of the
unrestricted b2 prototype found two genuine skipped window-spoke hits at closed
136.1. Closed frames therefore retain the production program. Fully open frames
have passed the sampled image gates below. This does not establish universal
equality or exclusion of every possible thin feature.
The composed periodic window-support guard rejects containing guide tiles that
can intersect window/spoke support boxes; see WINDOW-GUIDE.md. Other primitives
and glow interpolation still depend on the guide heuristic. Root measured
opened 4K gains of 15.51% at 160 and 18.55% at 169.9 for the guarded prototype.

Integrated default-driver RX 6800 / ANGLE OpenGL paired 3840x2160 measurements,
two alternating blocks of two timed frames per side, one queued frame and
1000 ms pauses:

| Time | Original ms | Guide ms | Reduction | Guide frame maximum ms |
| --- | ---: | ---: | ---: | ---: |
| 156.515 | 17.13246 | 14.99697 | 12.46% | 15.24112 |
| 160 | 18.47646 | 15.58415 | 15.65% | 15.81868 |
| 169.9 | 18.52446 | 14.94867 | 19.30% | 15.04156 |

Five integrated true-4K image frames retained identical encoded depth and
maximum color difference <=2, RMS <=.02646. Guide validity was false for
136.1/150.1 and true for 156.515/160/169.9. All 23 lower-resolution chapter
fallback samples were exactly equal. Four true-4K motion-disabled samples
using the identical guarded shaders also passed (maximum 2, depth identical).
The repaired 2560x1440 render was viewed directly. CPU adversarial checks
covered 426,779 projected roof/ring/flute pixels and a separate 1,479,158
thin-feature/control candidates without another admitted hit; these are
bounded double-precision evidence, not GPU proofs.

Portrait reduced-motion/pointer validation exceeded the strict maximum-2
color gate at one channel (value 3, no depth change). Portrait therefore keeps
the original program. After this eligibility restriction, two production
portrait checks passed with identical depth and maximum color difference <=1.
The stale-validity test covers switching from an active landscape guide to
portrait fallback.

Reports: artifacts/optimization/primary-dual-integrated-4k-{quality,performance},
primary-dual-all-world-fallback-quality, primary-window-guide-motion-zero-quality,
primary-production-portrait-fallback-quality. Sampled opened windows satisfy
16.67 ms; whole-film 4K60 and continuous frame-time tails remain unverified.

CPU checks freeze all four exported shader hashes, exercise eligibility
boundaries, resource failures and stale-guide transitions, and check explicit
attribute binding and program-specific uniform ownership. Render-state, cloud
and noise lifecycle checks, native command recording, Vite build and offline
GLSL compilation passed. Build: 17 modules, 175.66 kB JavaScript (55.30 kB gzip).

Flow extension
--------------

The same target also supports landscape scene 1 at output height >=1440,
time in [34.020,81.655), finite supported camera inputs, normalized motion,
beat and pointer, density in [0,1], and poster disabled. Scene 1 runs its
original 76-step absolute-distance march and .0013 glow accumulation in the
guide, with the existing flow coarse-bound validity flag. Its miss packets
bypass the cathedral-only window support guard. Full-resolution hits retain
the original normals, shading and materials.

Derived optional shader hashes now match flow candidate 65628ba; production
world/cloud exports remain unchanged. Cathedral regression checks are repeated
because the optional shared programs recompile. See FLOW-PRIMARY-MISS-GUIDE.md
for measured 28–30% flow gains and bounded visual evidence.
