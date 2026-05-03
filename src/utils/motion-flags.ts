export const ENABLE_R3F_ACCENT = true
export const MOBILE_BREAKPOINT_PX = 768
// 1800ms gives the ink-draw enough time to be perceptually visible on fast
// (cached) loads. Honest progress still applies — slower loads stretch the
// draw further; LOADER_MIN_DURATION_MS is just the floor below which we
// pad with synthetic ramp.
export const LOADER_MIN_DURATION_MS = 1800
export const LOADER_REDUCED_MOTION_MAX_MS = 200
