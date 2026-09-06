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

/** Playhead where the scene begins: the overture line stands alone in cream. */
export const OVERTURE_START = -1.5
/** First playhead where the cards read in the distance (the overture is gone). */
export const APPROACH_START = -0.5
/**
 * How far behind card 0's slot the camera sits at `APPROACH_START`, in corridor
 * spacings — the "cards in the distance" frame the first round shipped.
 */
export const APPROACH_DEPTH = 1
/**
 * Playhead units before `APPROACH_START` over which the overture line fades.
 * The line fills the frame near seg ≈ −1.07 and is 3–4× the frame width by
 * −0.65, so the fly-past needs this much window to read as a pass, not a pop.
 */
export const OVERTURE_FADE = 0.35

/** The caption name is drawn at this size, in 620-px card units. */
export const CAPTION_NAME_PX = 26
/** …and must never render smaller than this on screen. */
export const CAPTION_MIN_NAME_PX = 12
/** So the card is never narrower than this many CSS px: ceil(620 · 12 / 26). */
export const CARD_MIN_PX = Math.ceil((CARD_MAX_PX * CAPTION_MIN_NAME_PX) / CAPTION_NAME_PX)
/** The title never spans more than this fraction of the frame width. */
export const TITLE_WIDTH_CAP = 0.8

/** The settled card under a pointer lifts toward the camera and grows a touch. */
export const HOVER_LIFT = 0.03 * CARD_W
export const HOVER_SCALE = 1.02
/** Seconds for the lift to ease in and out. */
export const HOVER_TAU = 0.2
/** The caption arrow nudges up-right by this many CSS px, like .workrow-arrow. */
export const ARROW_SLIDE_PX = 2

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
 * How far behind card 0 the camera starts at `OVERTURE_START`, in spacings.
 * DERIVED, not tuned: the approach is one continuous ease from −1.5 to 0, and
 * this depth is whatever makes `easedSeg(APPROACH_START)` land exactly on
 * `−APPROACH_DEPTH`, so the frame at −0.5 is unchanged from the first round.
 * ≈ 3.857: the far plane (`D + 4·spacing`) still contains card 0 at the top.
 */
export const CORRIDOR_DEPTH =
  APPROACH_DEPTH / (1 - smoothstep((APPROACH_START - OVERTURE_START) / (0 - OVERTURE_START)))

/**
 * Settle-plateau remap: the transition occupies the middle 70% (0.15–0.85) of a
 * segment, so the scene dwells settled at every card and at both pin edges —
 * entering or leaving the section never lands mid-morph.
 */
export function settleFrac(frac: number): number {
  return smoothstep(clamp((frac - 0.15) / 0.7, 0, 1))
}

/** Playhead units the wrapper spans: 1 overture + 0.5 approach + 3 card segments. */
const PLAYHEAD_SPAN = MAX_SEG - OVERTURE_START

/**
 * Scroll progress (0..1 over the 550svh wrapper) → playhead.
 * `seg = i` means card `i` sits in the slot; `[−1.5, −0.5)` is the overture,
 * `[−0.5, 0)` the approach with the camera one spacing behind card 0 at −0.5
 * and card 0 surfacing from the fog.
 */
export function playheadFor(progress: number): number {
  return clamp(progress * PLAYHEAD_SPAN + OVERTURE_START, OVERTURE_START, MAX_SEG)
}

/**
 * Playhead → the camera's eased position along the corridor, in card units.
 *
 * For `seg ≥ 0` each unit segment eases through its middle 70%, so every
 * integer is a plateau. For `seg < 0` the overture and the approach share ONE
 * ease from `OVERTURE_START` to 0, with zero slope at both ends and none in
 * between: the camera never stops at −0.5 while the line hands over to the
 * cards, and it neither lurches when the section pins nor overshoots as card
 * 0 settles.
 */
export function easedSeg(seg: number): number {
  if (seg < 0) {
    const a = clamp((seg - OVERTURE_START) / (0 - OVERTURE_START), 0, 1)
    return -CORRIDOR_DEPTH * (1 - smoothstep(a))
  }
  const base = Math.floor(seg)
  return clamp(base + settleFrac(seg - base), 0, MAX_SEG)
}

export interface OverturePose {
  alpha: number
  visible: boolean
}

/**
 * The overture line's state at a playhead: solid through the overture, fading
 * over `OVERTURE_FADE` as the camera flies past, gone from `APPROACH_START` on.
 * Pure and exactly reversible. Reduced motion steps instead of fading.
 */
export function overturePose(seg: number, reducedMotion: boolean): OverturePose {
  const visible = seg < APPROACH_START
  if (reducedMotion) return { alpha: visible ? 1 : 0, visible }
  const fadeStart = APPROACH_START - OVERTURE_FADE
  const alpha = visible ? 1 - smoothstep(clamp((seg - fadeStart) / OVERTURE_FADE, 0, 1)) : 0
  return { alpha, visible }
}

/**
 * Absolute world z of the overture line, in `cameraPose`'s convention: it
 * stands exactly where the camera is at `APPROACH_START`, so the camera passes
 * through it as the cards appear. `g.D − easedSeg(−0.5) · g.spacing`, which is
 * `g.D + g.spacing` by construction of `CORRIDOR_DEPTH`.
 */
export function overtureZ(g: SceneGeometry): number {
  return g.D - easedSeg(APPROACH_START) * g.spacing
}

/**
 * World width of the overture line so that it fills 0.7 of the visible width
 * at `OVERTURE_START`, when the camera is `(CORRIDOR_DEPTH − 1)` spacings
 * short of it.
 */
export function overtureWidth(g: SceneGeometry): number {
  const d = (easedSeg(APPROACH_START) - easedSeg(OVERTURE_START)) * g.spacing
  return 0.7 * (2 * d * HALF_FOV_TAN * g.aspect)
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
 * Under all of it sits the legibility floor: the card is never narrower than
 * `CARD_MIN_PX`, so the caption name on it never drops under 12 px — this
 * binds on landscape phones and on 320 px portrait, and a 0.92 ceiling keeps
 * the floored card inside the frame.
 */
export function sceneGeometry(widthPx: number, heightPx: number): SceneGeometry {
  const aspect = widthPx / heightPx
  const sized =
    aspect < 1
      ? 0.88
      : Math.min(0.46, CARD_MAX_PX / widthPx, 0.5 / (aspect * CARD_H))
  const fraction = Math.min(Math.max(sized, CARD_MIN_PX / widthPx), 0.92)
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
 * The band the title may occupy, as frame fractions from the top: it starts
 * 16 px under the nav and ends a clearance above the settled card's top edge.
 * The rig scales the title down to fit `bottom − top`.
 */
export function titleBand(
  cardTopFrac: number,
  navPx: number,
  visibleH: number,
  clearance: number,
): { top: number; bottom: number } {
  return { top: (navPx + 16) / visibleH, bottom: cardTopFrac - clearance }
}

/**
 * The document `scrollY` at which `playheadFor` returns exactly `index`, for a
 * wrapper starting at `wrapperTop` whose scrub range is `height − viewport`.
 */
export function scrollTargetFor(
  index: number,
  wrapperTop: number,
  wrapperHeight: number,
  viewportHeight: number,
): number {
  const progress = (index - OVERTURE_START) / PLAYHEAD_SPAN
  return wrapperTop + progress * (wrapperHeight - viewportHeight)
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
}

const AMBIENT_Y = 0.01 * CARD_H
const AMBIENT_ROT = 1.5 * DEG
const VELOCITY_YAW_MAX = 4 * DEG

/**
 * The breath: what a card does when scroll is NOT moving (ADR 0010).
 *
 * Three sines on deliberately unrelated periods — bob, yaw and pitch never
 * come back into phase, so the motion reads organic rather than mechanical —
 * and each card gets its own period and phase so the corridor never pulses in
 * unison. `energy` (from scroll velocity) scales the amplitudes.
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
