# Cathedral cloud noise certificate

The existing static hash lattice covers integer cells `[-256,255]` on each
axis. A certified frame sets `u_noiseCacheValid=2`, allowing `templeNoise()` to
fetch its four original hash corners and return the original nested `mix`
expression immediately. This skips the two vector cell-range comparisons at
every noise query. Flag 1 retains the existing guarded lookup and direct hash
fallback. Flag 0 retains direct evaluation, including native recording.

`cloudFrameCertified()` checks scene 3, time `[0,170.125]`, motion and beat
`[0,1]`, finite GPU-representable seed and shot, pointer components `[-1,1]`,
finite event age at most `20.415`, and finite opening progress. Negative event
ages become zero in transport and camera panning. Opening progress is clamped
to `[0,1]` by the original shader. Other event components, energy, density and
poster do not determine these cloud coordinates.

Every finite shot selects the default cathedral camera or one of its three
variants. The largest horizontal camera origin is bounded by
`1.15 + .34 + .09 = 1.58`, including opening pan and pointer displacement;
the depth origin remains `-5`. The interval proof covers every normalized ray
direction, independently of lens, aspect ratio, camera target or pixel. The
minimum camera lens within the certified beat/motion/opening domain is 1.15.

`scripts/check-noise-cache-bounds.py` propagates conservative intervals through
all volume/sheet inputs and all three FBM octave transforms, preserving
correlation during each linear transform. It pads time to 170.126, event age
to 20.416, camera X to 1.58001 and ray components to 1.00001 for float32
rounding. Existing FBM output ranges retain their .001 padding. The resulting
input range is `[-237.765027,248.015427]`, leaving more than seven cells before
the nearest lattice edge. This includes the direct sheet-fine noise query.

The cache lifecycle test exercises certificate boundaries, unusual finite
shots, irrelevant fields, invalid/overflowing inputs and all three flags.
The interval proof, production build and offline GLSL ES 3.00 linking pass.
Root GPU gates subsequently passed 42 sampled frames with exact RGBA8 color
and encoded depth: eight initial cathedral frames, three true-4K frames, 23
frames across the film and eight portrait/control frames. Paced paired 4K
tests measured 144 seconds at 18.545 to 18.260 ms (1.54%) and 160 seconds at
21.434 to 21.071 ms (1.69%). Runtime feature records confirm flag 2 was active.
These small samples do not establish whole-film 4K60 or universal equivalence.
The source was integrated in `40a1ca8` and `f091ad9`. Build, cache-domain and
352-frame render-state checks passed after integration. See `OPTIMIZATION.md`
and ignored `artifacts/optimization/noise-certified-*` reports for scope.
