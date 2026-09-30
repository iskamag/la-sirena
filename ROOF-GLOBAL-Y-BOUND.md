# Whole-roof correlated vertical bound: CPU candidate

This candidate adds one global rejection guard before the roof's row and plate loops. It couples each plate's center height and vertical support through the same hash value, rather than taking their independent extrema. This can reject all nine cells/eighteen plates with one cheap test.

The original `bound>.70` early return **remains first**, unchanged. That shortcut emits an approximate field; applying the new true-geometry bound before it could change the caller's result. The new guard returns the existing `cutoff` only after this shortcut has declined. Every surviving row, hash, center, subtraction, rotation, and plate field expression remains unchanged. The closed helper is called only when opening is zero and uses a constant bound; the opened function includes the opening term.

## Correlated proof

Let `o=opening` and `h` be the original hash, both in `[0,1]`. A plate's center height is

```
3.32 + o*(1.30+3.6*h) + .045*onset*o
```

The inverse rotation's world-y support for the rounded box is at most

```
.068 + o*(1.105*(.26+.62*h) + 1.525*abs(h-.5)*1.4)
```

This follows from the original xz/xy/yz rotation order, `abs(sin(a))<=abs(a)`, and `abs(cos(a))<=1`; the `.068` includes the `.050` plate half thickness and `.018` rounding. The nonnegative onset term can only raise the minimum height. Subtracting support from center and retaining the same h gives

| Hash interval | Lower bound on minimum plate y |
| --- | --- |
| `h<=.5` | `3.252 + o*(-.0548+5.0499*h)` |
| `h>=.5` | `3.252 + o*(2.0802+.7799*h)` |

Both intervals are increasing in h. Therefore every rounded plate lies above `3.252-.0548*o`, with worst case h=0. At zero opening the exact enclosure is y>=3.252.

The implemented lowest height is rounded outward to `3.2519-.055*o` (constant `3.2519` in the closed helper). Its signed plane-distance field `(lowestY-p.y)*.72` bounds every original scaled rounded-box field, including negative interior distances. The original clipping plane only increases each field. Minima over pieces preserve the inequality.

Rejecting when this lower bound minus `.0001` is at least `cutoff` preserves the caller's `min(cutoff,roof)`. It can change the standalone roof result above cutoff, which the caller discards. No raymarch samples or material ordering change.

## Reproducible CPU evidence

Run `node scripts/check-roof-global-y-bound.mjs [--seed UINT32] [--samples COUNT]`. It independently evaluates the original rounded-box/clipping field and the new global bound with scalar operations rounded to binary32. It records the shader SHA-256 and tests cutoff ties and small neighborhoods. It creates no browser or graphics context.

Default seed 20481, shader SHA-256 `1be919427053ada4db651faf7c36a884803732f48575206320ccf541f7374925`: one million random and 66,600 targeted roof cases produced maximum unguarded bound-minus-field `-0.00007201731205`, zero guarded violations, and zero unsafe rejections. Targeted cases include opening/hash/onset endpoints, both sides, extreme rows, tiny offsets around the global lowest height, actual rounded-box faces/interiors/corners transformed back into world space, centers, and loose cell faces. Random queries span up to 40 units from centers; rows span -170 through 169.

A separate CPU 64x36 production-camera replay includes the original main march, four tetrahedral normal samples at hits, and the normal-offset occlusion query. It estimates the following roof calls rejected **among those surviving the original global shortcut**:

| Time | Original shortcut survivors | New whole-roof skips | Fraction |
| --- | ---: | ---: | ---: |
| 136.1 | 19,855 | 3,325 | 16.75% |
| 140 | 20,077 | 3,102 | 15.45% |
| 144 | 21,034 | 4,119 | 19.58% |
| 149.72 | 20,166 | 3,414 | 16.93% |
| 156.515 | 25,423 | 5,965 | 23.46% |
| 160 | 24,824 | 3,425 | 13.80% |
| 169.9 | 29,734 | 4,304 | 14.48% |

No unsafe skip occurred. Main-march-only opportunities at 144 and 160 were 17.72% and 11.69%, respectively. Temporary diagnostics are `/tmp/mus2-cathedral-global-y-full-cpu.mjs` and `/tmp/mus2-cathedral-global-y-cpu.mjs`, with corresponding JSON reports. They use binary64 JS geometry/hash arithmetic; the normal trajectories are CPU approximations. These fractions describe opportunities, not GPU speedups.

## Limits and remaining gates

The checker uses JS binary64 trig rounded afterward, separate binary32 operations, and no GPU FMA/reassociation/transcendental-error model. Outward constants provide extra height slack of `.0001+.0002*opening` before the final `.0001` field margin, supported by sampled finite coordinates. This is not a universal floating-point proof for arbitrarily huge coordinates or nonfinite inputs. The real-arithmetic enclosure is analytic. Source hashes identify snapshots but do not automatically synchronize the independent formulas with shader changes.

Root-coordinated serial GPU gates subsequently passed 45 sampled frames with exact RGBA8 color and encoded depth, including three true-4K frames, transition samples, portrait/pointer controls, motion disabled and other chapters. Paced paired 4K timing at 160 seconds improved from 21.651 to 20.811 ms (3.88%); the closed 144-second window was effectively flat. The candidate was integrated as `a436257`. Production build, 352-frame render-state check and the default million-case CPU checker passed after integration. See `OPTIMIZATION.md` and ignored `artifacts/optimization/roof-global-y-*` reports for timing scope and scheduling. These sampled gates establish neither universal floating-point equivalence nor whole-film 4K60.
