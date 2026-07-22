/**
 * Pure, progress-driven motion helpers for the selected-work card stack.
 * Scroll position is the playhead; every helper is a deterministic function of
 * scroll progress (0..1) or a per-segment fraction. No time, no state, no side
 * effects — unit-tested in tests/unit/stackMotion.test.ts.
 */

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const easeIn = (t: number): number => t * t // accelerate: commits and leaves
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) // decelerate: lands settled

/** Classic Hermite smoothstep on [0,1]. Expects t already clamped to [0,1]. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export interface Segment {
  index: number
  frac: number
}

/**
 * Maps overall scroll progress (0..1) onto n-1 equal transition segments.
 * index ∈ [0, n-2]; frac ∈ [0, 1] within that segment.
 */
export function segmentFor(progress: number, n: number): Segment {
  if (n <= 1) return { index: 0, frac: 0 }
  const transitions = n - 1
  const raw = clamp(progress, 0, 1) * transitions
  const index = clamp(Math.floor(raw), 0, transitions - 1)
  const frac = clamp(raw - index, 0, 1)
  return { index, frac }
}

/**
 * Settle-plateau remap: the transition occupies the middle 70% (0.15–0.85) of a
 * segment, smoothstepped, so the stack dwells settled at every project and at
 * both pin edges — entering/leaving the section never lands mid-morph.
 */
export function settleFrac(frac: number): number {
  return smoothstep(clamp((frac - 0.15) / 0.7, 0, 1))
}

export interface DepthStyle {
  y: number
  scale: number
  opacity: number
  shadow: number
}

// Depth grammar from the vault: slot y-offsets / scales / shadow strength.
const SLOTS: ReadonlyArray<{ y: number; scale: number; shadow: number }> = [
  { y: 12, scale: 1, shadow: 1 },
  { y: -16, scale: 0.95, shadow: 0.6 },
  { y: -44, scale: 0.9, shadow: 0.3 },
]
const EXIT_Y = 440

/**
 * Interpolated style for a card currently at logical `depth` (0 = front,
 * 1/2 behind, 3 = incoming) given the settled transition progress `frac`.
 * depth 0 exits downward (ease-in); deeper cards promote one slot (ease-out);
 * the incoming depth-3 card fades in at the back slot without moving.
 */
export function depthTransform(depth: number, frac: number): DepthStyle {
  const f = clamp(frac, 0, 1)
  if (depth <= 0) {
    return {
      y: lerp(SLOTS[0].y, EXIT_Y, easeIn(f)),
      scale: 1,
      opacity: lerp(1, 0.85, f),
      shadow: SLOTS[0].shadow,
    }
  }
  const from = SLOTS[Math.min(depth, 2)]
  const to = SLOTS[Math.min(depth - 1, 2)]
  const tp = easeOut(f)
  return {
    y: lerp(from.y, to.y, tp),
    scale: lerp(from.scale, to.scale, tp),
    opacity: depth >= 3 ? lerp(0, 1, f) : 1,
    shadow: lerp(from.shadow, to.shadow, f),
  }
}

/**
 * Style for a card at continuous relative depth `rel = cardIndex − segCont`,
 * the single scroll-derived channel that drives every per-frame card visual.
 * rel ≤ −1 → fully exited: parked at EXIT_Y, opacity 0 (invisible while parked).
 * Otherwise decomposes to the integer-depth grammar:
 * depthTransform(ceil(rel), ceil(rel) − rel) — e.g. rel −0.5 = depthTransform(0, 0.5)
 * (mid-exit), rel 0.5 = depthTransform(1, 0.5) (mid-promotion), rel k = depthTransform(k, 0)
 * (a settled slot).
 */
export function cardStyleAt(rel: number): DepthStyle {
  if (rel <= -1) return { y: EXIT_Y, scale: 1, opacity: 0, shadow: 0 }
  const d = Math.ceil(rel)
  return depthTransform(d, d - rel)
}

export interface MorphStyle {
  blur: number
  opacity: number
}

// Gooey blur, capped at 100px, guarded against division by zero (→ full cap).
const morphBlur = (x: number): number => (x <= 0 ? 100 : Math.min(8 / x - 8, 100))

/**
 * Gooey title crossfade: incoming span sharpens (blur→0, opacity→1) as `frac`
 * rises; outgoing span mirrors on (1 - frac).
 */
export function morphValues(frac: number): {
  incoming: MorphStyle
  outgoing: MorphStyle
} {
  const f = clamp(frac, 0, 1)
  return {
    incoming: { blur: morphBlur(f), opacity: Math.pow(f, 0.4) },
    outgoing: { blur: morphBlur(1 - f), opacity: Math.pow(1 - f, 0.4) },
  }
}
