# Closed-roof cell bounds

The clustered roof path is selected only when `rupture()==0`. The opened path
retains the original roof expressions and loop structure. Keeping separate
functions avoids the late-frame depth differences observed when adding cell
bounds directly to the opened function; their compiler-level cause is not proven.

Both closed plates in a cell are enclosed by a box centered at
`(cell.x*2.30,3.32,cell.y*3.15)`, with extents `(1.903,.068,1.903)`.
The x/z bounds use the existing enclosing sphere. The y bound includes the
box half-height `.050` and rounding radius `.018`. Clipping can only increase
the field. Its largest signed axis distance, scaled by `.72`, is a lower
bound on both plate fields, including interiors. A `.0001` margin keeps ties
on the original path. Skipping a cell preserves the caller's minimum against
`cutoff`. Original surviving hash, displacement, rotation and clipping
expressions remain intact, as does x/z/i order and the ray sample schedule.

Paced hardware comparisons at 640×360 passed 16 frames exactly. At 960×540,
64 frames across eight cathedral windows matched color and encoded depth
exactly, including both sides of rupture. Six 4K frames retained identical
encoded depth; color was exact after opening and differed by at most 2/255
before opening, RMS below .0011.

Two alternating blocks of eight individually timed 4K frames, with 100 ms
cooldown and RadeonSI uniform inlining disabled, measured 144 s at
23.55→20.83 ms (-11.5%). At 160 s the unchanged opened path measured
24.29→24.35 ms (+0.2%). These small samples and different scheduling cannot
be compared directly to earlier sustained batches. Cathedral remains above
16.7 ms. Build, render-state checks and offline GLSL linking passed.

A broader 92-frame comparison at 960×540 against the preceding accepted
renderer passed across 23 windows: encoded depth matched throughout, with
color exact except a shell-window maximum of 1/255. Twenty portrait frames
with reduced motion and an offset pointer matched color and encoded depth
exactly. These comparisons cover sampled frames, not the whole film.

Driver ISA inspection found unchanged allocation (96 VGPR, 108 SGPR), no
spills or scratch, and the same compiled maximum of five waves. Generated
code grew from 363,456 to 417,860 bytes; retaining separate functions has a
code-size cost. A native 320×180 cathedral frame compiled and rendered without
GL errors. GPU testing is now suspended following the renewed desktop-freeze
report; no further hardware validation is implied by CPU-only work.
