// Certificate for the flow shader's coarse-bound arithmetic domain.
//
// This applies to rayWorld(scene=1) and its march/normal/occlusion/material
// mapFlow queries. With time [0,290], motion/beat [0,1], pointer [-1,1]:
// motionTime <= 290, pulse <= 1, and the flow camera satisfies
// |ro.x| <= .14+.40+.09=.63, |ro.y| <= .10+.26+.09=.45,
// |ro.z| <= 290*1.75=507.5. The positive lens and orthogonal camera basis
// produce a normalized ray. March points have travel <= 32; normal offsets
// are .0015 per axis and the occlusion offset is at most .10 per axis.
// Therefore |p.z| <= 539.6 < 550 and |p.xy| components <= 32.73/32.55.
// Each center has |x| <= 1.41*1.33+.19=2.0653 and |y| <= 1.41+.19=1.60.
// Body length is <= hypot(34.7953,34.15) < 50 < 64, and effective beat is [0,1].
// These are the finite limits validated for coarse center and strand bounds.
// Positive finite framebuffer dimensions are a renderer invariant.
//
// New mapFlow callers or flow camera/march changes must revalidate this proof.
// Invalid or forced unusual inputs retain the shader's original cutoff.
export function flowBoundValidity({ time, scene, motion, beat, pointer }) {
    const unit = value => Number.isFinite(value) && value >= 0 && value <= 1;
    return Number.isFinite(time) && time >= 0 && time <= 290 && scene === 1 &&
        unit(motion) && unit(beat) && pointer?.length === 2 &&
        Number.isFinite(pointer[0]) && Math.abs(pointer[0]) <= 1 &&
        Number.isFinite(pointer[1]) && Math.abs(pointer[1]) <= 1 ? 1 : 0;
}
