# Scroll is the playhead, time is the breath

**Status:** accepted (grilling, 2026-09-03). Supersedes ADR 0005 in part.

ADR 0005 made every per-frame visual of Selected Work a pure function of one continuous scroll channel, with zero React state per frame. The 3D scene keeps the second half and relaxes the first: the owner asked that the elements feel alive, moving on their own when the page is still. So every pose is now `scrollPose(playhead) + ambient(time)`. **Scroll owns sequence, position, the camera and the title morph; time owns the breath** — a bob and sway on each card, a halo pulse, a fog drift, a title float, at breathing amplitude (about 1 % of card height, 4–7 s periods). Scroll velocity feeds the same layer as short-lived energy. Both terms are pure functions read inside the frame loop; **no React state drives a frame**, and `frontIndex` still flips only at settle midpoints and feeds only non-visual attributes.

## Consequences

- Reversibility is unchanged for everything scroll owns: the same playhead always yields the same camera and morph. Only the ambient term differs between two visits to the same playhead, and it is zero-mean and bounded.
- Reduced motion drops the ambient term entirely and renders on demand, so ADR 0005's rule holds unchanged there.
- The hero shader's scroll-coupled sim clock is the precedent: a time-driven layer whose energy scroll modulates.
- Lane rule: the R3F frame loop reads Framer MotionValues (`useScroll`, `useVelocity`); Framer never animates a three object; GSAP stays entrance-only.
