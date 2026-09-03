/**
 * Pure motion and framing helpers for the selected-work scene.
 *
 * Scroll is the playhead, time is the breath (ADR 0010): every per-frame visual
 * in the scene is `scrollPose(playhead) + ambient(time)`, and both halves live
 * here as deterministic functions. No React, no three, no DOM — the frame loop
 * in SceneRig reads these and writes the result onto objects itself.
 *
 * Unit-tested in tests/unit/sceneMotion.test.ts. The geometry contract these
 * numbers implement is documented in
 * docs/superpowers/plans/2026-09-03-selected-work-scene.md.
 */

/** Featured projects in the corridor; the wrapper height is coupled to this. */
export const CARD_COUNT = 4

/** Card plane in world units — the Shadway frame, 620 × 448 px equivalent. */
export const CARD_W = 1
export const CARD_H = 448 / 620
/** The card never renders wider than this in CSS px, whatever the viewport. */
export const CARD_MAX_PX = 620

/** Cards hover above the cream floor; the gap is what the blob shadow reads. */
export const HOVER = 0.2 * CARD_H
export const CARD_Y = HOVER + CARD_H / 2

export const FOV_DEG = 35
/** Camera pitch, negative = looking down at the corridor. */
export const CAM_PITCH_DEG = -8

/** How far behind card 0's slot the camera starts, in corridor spacings. */
export const APPROACH_DEPTH = 1

/** A card holds full opacity until this `rel`, then fades out before the lens. */
export const PASS_FADE_START = 0.67
export const PASS_FADE_END = 0.82

/** Title centre as a fraction of the frame height, measured from the top. */
export const TITLE_CENTER = 0.24

/**
 * Gooey blur cap, carried over from the card-stack title: Anton's large
 * condensed glyphs need this much blur to dissolve fully at the extremes.
 */
export const BLUR_CAP = 180

const DEG = Math.PI / 180
const MAX_SEG = CARD_COUNT - 1

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

/** Classic Hermite smoothstep on [0,1]. Expects t already clamped to [0,1]. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * Settle-plateau remap: the transition occupies the middle 70% (0.15–0.85) of a
 * segment, so the scene dwells settled at every card and at both pin edges —
 * entering or leaving the section never lands mid-morph.
 */
export function settleFrac(frac: number): number {
  return smoothstep(clamp((frac - 0.15) / 0.7, 0, 1))
}

/**
 * Scroll progress (0..1 over the 450svh wrapper) → playhead.
 * `seg = i` means card `i` sits in the slot; `seg = −0.5` is the top of the
 * approach, with the camera one spacing behind card 0 and card 0 in the fog.
 */
export function playheadFor(progress: number): number {
  return clamp(progress * 3.5 - 0.5, -0.5, MAX_SEG)
}

/**
 * Playhead → the camera's eased position along the corridor, in card units.
 *
 * For `seg ≥ 0` each unit segment eases through its middle 70%, so every
 * integer is a plateau. For `seg < 0` the approach has its own ease with zero
 * slope at BOTH ends: the camera neither lurches when the section pins nor
 * overshoots as card 0 settles.
 */
export function easedSeg(seg: number): number {
  if (seg < 0) {
    const a = clamp((seg + 0.5) / 0.5, 0, 1)
    return -APPROACH_DEPTH * (1 - smoothstep(a))
  }
  const base = Math.floor(seg)
  return clamp(base + settleFrac(seg - base), 0, MAX_SEG)
}

export interface Segment {
  index: number
  frac: number
}

/**
 * Splits the playhead into the transition it is crossing: `index` is the card
 * being left, `frac` the raw progress toward the next one. The approach parks
 * on the first segment so the title resolves from card 0's name.
 */
export function segmentFor(seg: number, n: number): Segment {
  if (n <= 1 || seg < 0) return { index: 0, frac: 0 }
  const index = clamp(Math.floor(seg), 0, n - 2)
  const frac = clamp(seg - index, 0, 1)
  return { index, frac }
}

/**
 * The card that currently OWNS the section: it names the SR heading, the
 * overlay link and the row tints. Flips once per segment, at the settle
 * midpoint, so it never disagrees with what the eye calls the front card.
 */
export function frontIndexFor(seg: number, n: number, reducedMotion: boolean): number {
  if (n <= 0) return 0
  let raw: number
  if (reducedMotion) {
    raw = Math.round(seg)
  } else {
    const { index, frac } = segmentFor(seg, n)
    raw = settleFrac(frac) >= 0.5 ? index + 1 : index
  }
  const nearest = clamp(raw, 0, n - 1)
  // Math.round(-0.5) is -0, which indexes fine but reads as -0 everywhere else.
  return nearest === 0 ? 0 : nearest
}

export interface SceneGeometry {
  aspect: number
  widthPx: number
  heightPx: number
  /** Card width as a fraction of the frame width. */
  fraction: number
  /** Camera distance to a settled card's slot. */
  D: number
  spacing: number
  lateral: number
  camY: number
  titleDistance: number
  titleCapPx: number
  near: number
  far: number
}

/** Frame fractions, 0 = top / left edge. */
export interface Rect {
  top: number
  bottom: number
  left: number
  right: number
}

export interface CardPose {
  x: number
  y: number
  z: number
  yaw: number
  opacity: number
  visible: boolean
}

export interface CameraPose {
  x: number
  y: number
  z: number
  /** Radians; negative = pitched down. */
  pitch: number
}

const HALF_FOV_TAN = Math.tan((FOV_DEG * DEG) / 2)

/**
 * Everything the scene's framing depends on, derived from the viewport alone.
 *
 * The card is sized as a fraction of the frame WIDTH, then the camera distance
 * that produces that fraction is solved for — so the card reads at the same
 * size whatever the viewport, and the corridor scales with it. Three caps
 * fight for the desktop fraction: a hard 0.46 (the card never dominates), the
 * 620px design cap, and half the frame HEIGHT (so a short wide window doesn't
 * push the card into the title band). Phones skip all three: one 88vw card.
 */
export function sceneGeometry(widthPx: number, heightPx: number): SceneGeometry {
  const aspect = widthPx / heightPx
  const fraction =
    aspect < 1
      ? 0.88
      : Math.min(0.46, CARD_MAX_PX / widthPx, 0.5 / (aspect * CARD_H))
  const D = CARD_W / (fraction * 2 * HALF_FOV_TAN * aspect)
  const spacing = 1.15 * D
  // The second term keeps an 88vw card inside the frame once it is offset.
  const lateral =
    Math.min(0.35 * clamp(aspect / 1.6, 0, 1), 0.9 * (0.5 / fraction - 0.5)) * CARD_W
  const camY = CARD_Y + (aspect < 1 ? 1.0 : 0.61) * CARD_H
  return {
    aspect,
    widthPx,
    heightPx,
    fraction,
    D,
    spacing,
    lateral,
    camY,
    titleDistance: D + 0.25 * spacing,
    titleCapPx: clamp(0.09 * widthPx, 56, 150),
    near: 0.05,
    far: D + 4 * spacing,
  }
}

/** The camera dollies straight down the corridor; only z moves. */
export function cameraPose(eased: number, g: SceneGeometry): CameraPose {
  return { x: 0, y: g.camY, z: g.D - eased * g.spacing, pitch: CAM_PITCH_DEG * DEG }
}

/**
 * Where card `i` sits and how solid it is, for a camera at `eased`.
 * Cards alternate sides and yaw back toward the axis so each one faces the
 * camera as it arrives. Past the slot a card fades out before it would reach
 * the near plane, so it dissolves rather than clipping through the lens.
 */
export function cardPose(i: number, eased: number, g: SceneGeometry): CardPose {
  const x = (i % 2 === 0 ? -1 : 1) * g.lateral
  const rel = eased - i
  const fade = clamp((rel - PASS_FADE_START) / (PASS_FADE_END - PASS_FADE_START), 0, 1)
  return {
    x,
    y: CARD_Y,
    z: -i * g.spacing,
    yaw: -Math.sign(x) * 8 * DEG,
    opacity: 1 - fade,
    visible: rel < PASS_FADE_END,
  }
}

/**
 * World point → frame fractions, for a camera that only ever pitches.
 * `ahead` is the distance along the camera's view axis: positive means the
 * point is in front of the lens, and it is also the perspective divisor.
 */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  cam: CameraPose,
  g: SceneGeometry,
): { fx: number; fy: number; ahead: number } {
  const d = cam.z - z
  const h = y - cam.y
  // The camera pitches DOWN by |pitch|, so a point at camera height rides above
  // the frame centre; rotate (d, h) into the camera's frame by that angle.
  const phi = -cam.pitch
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const f = d * cos - h * sin
  const u = h * cos + d * sin
  const ndcY = u / (f * HALF_FOV_TAN)
  const ndcX = (x - cam.x) / (f * HALF_FOV_TAN * g.aspect)
  return { fx: 0.5 + 0.5 * ndcX, fy: 0.5 - 0.5 * ndcY, ahead: f }
}

/**
 * Where the settled card 0 and the title band land in the frame — the framing
 * the whole geometry contract is tuned against, and what the DOM overlay and
 * the smoke tests sample. Yaw is ignored: the rect is the card's flat extent,
 * measured at its TOP edge, where the perspective divisor is smallest and the
 * card is therefore widest.
 */
export function frameRects(g: SceneGeometry): {
  card: Rect
  title: Rect
  floorContactY: number
} {
  const cam = cameraPose(0, g)
  const x = -g.lateral
  const topY = CARD_Y + CARD_H / 2
  const bottomY = CARD_Y - CARD_H / 2
  const top = projectPoint(x, topY, 0, cam, g)
  const bottom = projectPoint(x, bottomY, 0, cam, g)
  const left = projectPoint(x - CARD_W / 2, topY, 0, cam, g)
  const right = projectPoint(x + CARD_W / 2, topY, 0, cam, g)
  const contact = projectPoint(x, 0, 0, cam, g)

  // One line of Anton at the capped cap height, centred on the upper-third mark.
  const titleHalf = 0.5 * (g.titleCapPx / g.heightPx)
  return {
    card: { top: top.fy, bottom: bottom.fy, left: left.fx, right: right.fx },
    title: {
      top: TITLE_CENTER - titleHalf,
      bottom: TITLE_CENTER + titleHalf,
      left: 0.05,
      right: 0.95,
    },
    floorContactY: contact.fy,
  }
}

/**
 * How settled the scene is, 0..1 — the weight behind the overlay's opacity and
 * the pointer tilt. Fully settled within 0.15 of a card, fully released by
 * 0.25, so both only ever act on a card that is actually parked in the slot.
 */
export function settledness(seg: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1
  const off = Math.abs(seg - Math.round(seg))
  return 1 - clamp((off - 0.15) / 0.1, 0, 1)
}

/** Depth of field focuses on the slot, so the settled card is always sharp. */
export function focusDistance(g: SceneGeometry): number {
  return g.D
}

export interface MorphStyle {
  blur: number
  opacity: number
}

const morphBlur = (x: number): number =>
  x <= 0 ? BLUR_CAP : clamp(8 / x - 8, 0, BLUR_CAP)

/**
 * The gooey title crossfade, carried over from the card stack: the incoming
 * name sharpens as the outgoing one dissolves, and at the midpoint both sit at
 * 8px of blur so their blobs bridge instead of cross-fading.
 *
 * The raw segment fraction goes through `settleFrac` first, so the morph only
 * runs while the camera is actually travelling and both pin edges read crisp.
 */
export function morphValues(frac: number): { incoming: MorphStyle; outgoing: MorphStyle } {
  const f = settleFrac(clamp(frac, 0, 1))
  return {
    incoming: { blur: morphBlur(f), opacity: Math.pow(f, 0.4) },
    outgoing: { blur: morphBlur(1 - f), opacity: Math.pow(1 - f, 0.4) },
  }
}

export interface AmbientOffset {
  y: number
  yaw: number
  pitch: number
  haloAlpha: number
}

const AMBIENT_Y = 0.01 * CARD_H
const AMBIENT_ROT = 1.5 * DEG
const HALO_BASE = 0.35
const VELOCITY_YAW_MAX = 4 * DEG

/**
 * The breath: what a card does when scroll is NOT moving (ADR 0010).
 *
 * Three sines on deliberately unrelated periods — bob, yaw and pitch never
 * come back into phase, so the motion reads organic rather than mechanical —
 * and each card gets its own period and phase so the corridor never pulses in
 * unison. `energy` (from scroll velocity) scales the motion amplitudes only;
 * the halo keeps breathing at its own rate whatever the scroll is doing.
 */
export function ambientOffset(i: number, t: number, energy: number): AmbientOffset {
  const T = 4 + 0.75 * i
  const phase = 1.7 * i
  const gain = 1 + clamp(energy, 0, 1)
  const w = (period: number): number => (2 * Math.PI * t) / period
  return {
    y: AMBIENT_Y * Math.sin(w(T) + phase) * gain,
    yaw: AMBIENT_ROT * Math.sin(w(1.3 * T) + phase + 1) * gain,
    pitch: AMBIENT_ROT * Math.sin(w(0.8 * T) + phase + 2) * gain,
    haloAlpha: HALO_BASE * (1 + 0.15 * Math.sin(w(T) + phase)),
  }
}

/**
 * Scroll velocity → ambient energy, 0..1, with follow-through: it takes hold in
 * ~0.15s and lets go over ~0.6s, so a flick lands immediately and the scene
 * keeps stirring for a moment after the page stops.
 */
export function velocityEnergy(prev: number, velocity: number, dt: number): number {
  const target = clamp(Math.abs(velocity) / 1.2, 0, 1)
  const tau = target > prev ? 0.15 : 0.6
  const k = 1 - Math.exp(-Math.max(dt, 0) / tau)
  return clamp(prev + (target - prev) * k, 0, 1)
}

/** The whole corridor leans against the direction of travel while energised. */
export function velocityYaw(energy: number, velocity: number): number {
  const yaw = -VELOCITY_YAW_MAX * clamp(energy, 0, 1) * Math.sign(velocity)
  return yaw === 0 ? 0 : yaw
}

/**
 * Cream fog bounds. The slot sits clear of `near` so the settled card is fully
 * saturated; the next card down the corridor is ~40% dissolved and the one
 * behind it is a ghost. Both ends drift ±3% on a slow clock so the depth of
 * the scene never sits perfectly still.
 */
export function fogRange(g: SceneGeometry, t: number): { near: number; far: number } {
  const drift = 1 + 0.03 * Math.sin((2 * Math.PI * t) / 9)
  return {
    near: (g.D + 0.15 * g.spacing) * drift,
    far: (g.D + 2.2 * g.spacing) * drift,
  }
}

export { DEG }
