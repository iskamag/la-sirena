Stateless canyon field rejection candidate
=========================================

Parent 0e6b4d3. Only canyonWorld is changed. A side/row pair first evaluates
lower bounds over all h in [0,1], then skips the pair before hash if neither
field can beat the current unscaled d. Individual survivors retain their
original expressions, cliff clipping, strict comparison and material order.
The satellite gate uses d after any surviving cliff update.

For N=||diag(1/radii) R q||_1, the unit ball is the convex hull of six inverse-
rotated axial vertices. Therefore N >= max_j |q_j|/E_j, where E_j is the largest
coordinate support of those vertices. This lower bound remains valid inside
as well as outside the octahedron. The original field is k*(N-1), with positive
k=.57735027*2.16 for cliffs and .57735027*.55 for satellites.

Cliff rotations have |beta|<=.29 and |gamma|<=.215. Its X support is at most
max(2.16,5.35*sin(.29),3.56*sin(.29)*sin(.215))=2.16; Y<=5.35 and Z<=3.56.
Its uncertain center has midpoint (side*4.11,1.46,rowZ) and half-range
(.21,.55,.17). Satellite rotations are fixed .24/.16; support is bounded by
(.55,1.55,.81), and its center uncertainty has midpoint
(side*2.605,-.69,rowZ+2.26), half-range (.145,0,0).
Distance to each center interval divided by support thus lower-bounds N.
Cliffs additionally take max with the original clipping plane -p.y-1.93.
If the lower field >=d, the original strict < comparison cannot change d or
material. All comparisons precede the final original .72 scaling.

Each center interval is expanded by .002 and each field lower bound reduced
by .01. Rejection is enabled only for |p| components<=1024 and |d|<=128;
outside that domain, original arithmetic runs. These are deliberately generous
numerical margins, not an assertion of exact driver transcendental/compiler
behavior. A conventional binary32 operation envelope of 64*epsilon*1030 is
below .004; .01 slack also covers approximate trig rounding in the CPU model.
Actual GLSL compilation/fusion and driver trig remain GPU-gate requirements.

One million independent full-domain/near-body points with random h, side and
neighbor row passed two million bound comparisons in both binary64 and
f32-rounded arithmetic; minimum rounded gap .0099945. Support-vertex tests
cover 10,001 h values. Independent geometry-agent algebra review confirms the
support derivation, signed lower field and comparison/material ordering.

Actual score time20, 4096 random 4K ray centers, 178788 original march queries:
641563/1072728 pairs (59.81%) are rejected before hash. Cliff rejection is
59.81%; satellite rejection after cliff updates is 76.65%. Thus about 60% of
hash/h-dependent trig/cliff work and 77% satellite work is removed. Replay is
binary64 cost attribution, not GPU fidelity proof. Temporary independent
replay is /tmp/mus2-canyon-reject-cpu.mjs with its JSON report.

Root measured time20 paired true4K GPU mean 17.886 ->15.168 ms (15.20%),
candidate max15.583 ms. Quality and broader controls remain root-owned gates.
This agent ran CPU checks, offline GLSL and Vite build only.

The frozen production shader hashes in check-primary-guide.mjs must now change:
shaders.js exports the changed canyon body and derived cloud/guide programs
include its source prefix. Baseline hashes remain documented by the parent
commit; claiming unchanged exported shader strings would be incorrect.
