Window-only primary-guide risk guard
===================================

Composed from 8bd869a into the dual-program adapter based on b2bd2f6.
Production world/cloud shader exports remain byte identical to 0f7b6fb.
The separately derived guarded world/guide exports remain byte identical to
8bd869a. This guard changes only the quarter guide alpha and
full-resolution containing-tile gate; original field/shading expressions and
existing glow/clearance gates remain. It adds a guide-only proof that the entire
guide texel footprint avoids periodic windows/spokes. It is not a certificate
for other cathedral bodies or for the interpolated glow.

At136.1,Ultra2560×1440, both pixels(55,848),(55,849), bottom-origin integers,
are genuine spoke hits skipped by b2bd. CPU full march hits after13samples at
travel≈4.33; allfour neighboring guide rays miss after49samples. Guide minimum
clearance .001559 exceeds .001141 threshold, and glow spread .017913 passes. The
angular sine spoke ribbons sit between guide rays; sampled clearance does not
bound the continuous spaces between samples.

A window hit lies inside transformed-temple support boxes centered at
x=±2.20,y=.27,z=4.2*row with half-extents(.024,.594,.594), expanded for the hit
threshold. Rose outer radius.57 plus.024 tube gives.594; spokes radius is atmost
.56 and their X slab atmost.024. Each guide pixel's ray packet lies within
32*.5*length(fullResolution/guideResolution)/(fullHeight*lens), scaled by the
maximum temple coordinate scale. The camera UV pulse decreases this footprint
and rotation preserves it. Actual ceil target dimensions cover odd sizes.
The boxes receive this tube plus.006 hit allowance and.0002 numerical margin.

For each of two sides, scalarX/Y slab tests restrict the central ray interval
[.05,32]. A continuous Z span then intersects some periodic window band exactly
when ceil((minZ-extent)/4.2)≤floor((maxZ+extent)/4.2). Thus no per-cell loop,
roof hash, arch/sphere/capsule calculation is introduced. Nonfinite/out-of-domain
camera inputs fail closed; density≤.01 has no windows. Alpha stores clear=1.
Full-resolution code selects the containing guide texel from the existingfour
fetched neighbors; no additional sampler instruction is introduced.

CPU checker confirms the containing footprint(guide center54,850) of both known
hidden pixels is rejected. It also compares100,000 periodic interval predicates
against explicit cell loops. World/cloud/guide offline GLSL and Vite build pass.
No GPU jobs were launched by this agent. Other primitives still depend on the
original miss-guide heuristic, so overall geometric robustness requires more
GPU/CPU checks. Root measured 4K gains of 15.51% at 160 and 18.55% at 169.9 for 8bd869a.
Those measurements precede this dual-program integration; its GPU gates remain
root-owned.
