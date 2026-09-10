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

import {
  FRIEZE_CELL_W,
  FRIEZE_CELL_H,
  type FriezeExtent,
  type FriezeBlockExtent,
} from './friezeLayout'

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
/**
 * …except in portrait, where it may run nearly edge to edge.
 *
 * On a phone the title is WIDTH-bound, never cap-bound: `titleCapPx` floors at
 * 56, but the fit that the width cap forces (0.88 at 390 px) cancels any
 * increase to it exactly. So this is the only knob that makes the phone title
 * bigger, and at 0.94 the displayed cap lands at ~65 px — a title:card ratio of
 * 0.19, which is the desktop ratio. The title reads a shade wider than the
 * 0.88-width card; that is the intent, not an overflow.
 */
export const TITLE_WIDTH_CAP_PORTRAIT = 0.94

/**
 * Air between the title's lowest ink and the settled card's top edge, as a
 * fraction of the frame height. Portrait gets far more of it: the card is
 * 0.88 of the width there and dominates the frame, and the phone band has the
 * headroom to spare (267 px available against a ~170 px title at 390×844).
 */
/**
 * How wide a single title line may be before it wraps, in TEXTURE px.
 *
 * Two properties, both load-bearing and both regression-tested:
 *
 * 1. It scales with `scale` (the fit the texture is drawn at), because the
 *    lines are measured at `titleCapPx · dpr · scale`. If only one side scales,
 *    the fit decides the wrap and the wrap decides the fit — a loop with two
 *    stable answers per viewport, reached by different resize histories.
 * 2. It is the WHOLE frame, not `titleWidthCap` of it. The width cap governs
 *    the rendered size (the rig's `fit`); this decides only whether a name is
 *    too long to stand on one line at all. Applying the cap here too makes
 *    every desktop title wrap, and the shared band shrink then drags all four
 *    down with it.
 */
export function titleWrapAllowancePx(
  g: Pick<SceneGeometry, 'widthPx'>,
  dpr: number,
  scale: number,
): number {
  return g.widthPx * dpr * scale
}

export const TITLE_CLEARANCE = 0.012
export const TITLE_CLEARANCE_PORTRAIT = 0.045

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
 * The title morph is a SEAM (spec: 2026-09-05-title-morph-artifacts-contract):
 * a front sweeps the title plane in reading order and each column blends the
 * two names by its distance to the front. Inside the seam the outgoing
 * strokes swell into blobs and the incoming ones grow out of them — the gooey
 * bridge, one letter at a time. Two whole words are never summed: that sum is
 * a slab for any two 6–7 em Anton names, whatever the blur or the cut.
 */
/** Seam width, in em of the displayed title. */
export const SEAM_WIDTH_EM = 1.2
/** Peak blur inside the seam, in em. */
export const SEAM_SIGMA_EM = 0.1
/** Local weight exponent: (1−t)^p and t^p sum past 1 mid-seam, so the seam is a union. */
export const SEAM_POWER = 0.5

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

/* ── Act two · the scroll budget past card four ──────────────────────────── */

/** Where act one ends and act two begins: card four settled in its slot. */
export const ACT_TWO_START = MAX_SEG

/** The camera pulls back and up off card four's slot over this much scroll. */
export const ACT_TWO_RELEASE_SVH = 100
/** …then moves in and left toward the newest block over this much. */
export const ACT_TWO_APPROACH_SVH = 50
/** …then reads the frieze laterally, one column at a time, at this rate. */
export const ACT_TWO_SVH_PER_COLUMN = 25

/**
 * Act one's scrub, in svh — the retired `.scene-scroll` CSS literal, now
 * derived: 4.5 playhead units at 100 svh each, plus the one viewport the pin
 * itself occupies.
 */
export const ACT_ONE_SVH = (PLAYHEAD_SPAN + 1) * 100

/** Act two's own scrub. No frieze, no act two — and no zero divisor. */
export function actTwoSvh(columns: number): number {
  if (columns <= 0) return 0
  return ACT_TWO_RELEASE_SVH + ACT_TWO_APPROACH_SVH + ACT_TWO_SVH_PER_COLUMN * columns
}

/** The whole wrapper: act one's 550 svh plus whatever the frieze asks for. */
export function sceneWrapperSvh(columns: number): number {
  return ACT_ONE_SVH + actTwoSvh(columns)
}

/** Act one's scrub range, in svh: the wrapper less the viewport the pin holds. */
const ACT_ONE_SCRUB_SVH = ACT_ONE_SVH - 100

/**
 * What the rig multiplies the raw scroll velocity by before deriving energy.
 *
 * `useScroll` normalises progress over the WHOLE wrapper, so progress-velocity
 * is in units of "wrapper per second" — and act two makes the wrapper longer.
 * At 26 columns the scrub range goes 450 svh to 1250 svh, so the same physical
 * scroll speed produces 36 % of the progress-velocity it used to, while
 * `velocityEnergy` still divides by a constant calibrated in the old units. Act
 * one's lean and ambient amplitude would quietly weaken across the board — a
 * regression the pose snapshot cannot see, because it samples poses at rest.
 *
 * Scaling back by the ratio restores act one exactly and gives act two the same
 * energy per svh scrolled, which is the only reading under which the corridor
 * behaves the same on both sides of the seam.
 */
export function actOneVelocityScale(columns: number): number {
  return (sceneWrapperSvh(columns) - 100) / ACT_ONE_SCRUB_SVH
}

/**
 * Where the release and the approach end, in act-two progress `u`. Derived from
 * the svh budget, so a different column count moves them and nothing else has
 * to be told.
 */
export function actTwoBeats(columns: number): { release: number; approach: number } {
  const span = actTwoSvh(columns)
  if (span <= 0) return { release: 0, approach: 0 }
  return {
    release: ACT_TWO_RELEASE_SVH / span,
    approach: (ACT_TWO_RELEASE_SVH + ACT_TWO_APPROACH_SVH) / span,
  }
}

/**
 * Scroll progress (0..1 over the wrapper) → playhead.
 *
 * PIECEWISE. Act one is `[−1.5, 3]` in CARD units, one unit per 100 svh:
 * `seg = i` means card `i` sits in the slot, `[−1.5, −0.5)` is the overture and
 * `[−0.5, 0)` the approach with the camera one spacing behind card 0 at −0.5.
 * Act two is `[3, 4]` NORMALISED over its own svh budget, so `actTwoProgress`
 * needs no extent and act-one poses are the old functions on `min(playhead, 3)`.
 *
 * `columns = 0` means no frieze and reproduces today's function exactly. The
 * early return is not decorative: `progress > 1` is on the live path (Lenis
 * overscroll, an iOS rubber-band), and without it that call would divide by
 * `actTwoSvh(0) = 0` and return `Infinity` where the clamp returns 3.
 */
export function playheadFor(progress: number, columns = 0): number {
  if (columns <= 0) {
    return clamp(progress * PLAYHEAD_SPAN + OVERTURE_START, OVERTURE_START, MAX_SEG)
  }
  const span = actTwoSvh(columns)
  const scrub = progress * (ACT_ONE_SCRUB_SVH + span)
  if (scrub <= ACT_ONE_SCRUB_SVH) {
    return Math.max(OVERTURE_START + scrub / 100, OVERTURE_START)
  }
  return ACT_TWO_START + Math.min((scrub - ACT_ONE_SCRUB_SVH) / span, 1)
}

/** The act-two half of a playhead, 0 at card four's slot and 1 at the end. */
export function actTwoProgress(playhead: number): number {
  return clamp(playhead - ACT_TWO_START, 0, 1)
}

/**
 * The act-one half. Clamped at 3, so every act-one function keeps receiving the
 * segment it did before: card four holds its slot for the whole of act two
 * instead of scrubbing a card past it.
 */
export function actOneSeg(playhead: number): number {
  return Math.min(playhead, ACT_TWO_START)
}

/** …and back: act-two progress → the playhead that carries it. */
export function actTwoPlayhead(u: number): number {
  return ACT_TWO_START + clamp(u, 0, 1)
}

/** The playhead the `#archive` nav link lands on: the whole frieze in frame. */
export function volumeShotPlayhead(columns: number): number {
  return actTwoPlayhead(actTwoBeats(columns).release)
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
  /** Widest the title may run, as a fraction of the frame width. */
  titleWidthCap: number
  /** Air above the settled card's top edge, as a fraction of the frame height. */
  titleClearance: number
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
 * The aspect where the camera height and the title floor begin leaving their
 * phone values, and the aspect where they have fully reached their desktop
 * ones. Between them `crossover` blends by `smoothstep`.
 *
 * A tuning knob Kevin adjusts by eye, not a derived number, inside three
 * limits. No real device may sit inside the band: portrait phones and tablets
 * are at or under 0.85 (iPad Pro portrait 0.75), and landscape tablets at or
 * over 1.05 · which now includes the whole foldable class, 1.205 to 1.235 in
 * landscape, that the original 1.25 end wrongly swallowed. The band cannot be
 * arbitrarily narrow: the continuity sweep bounds |ΔcamY| ≤ 0.02 and
 * |ΔtitleCapPx| ≤ 1 px per 0.005 aspect step imply a bandwidth floor of 0.106
 * and 0.120, the title floor binding; at the 0.20 shipped here the margins are
 * 1.9x and 1.67x, not the 2x the original 0.40-wide band had. And
 * `CROSSOVER_END` must exceed 1, which with a 0.20 band makes 1.05 the only
 * value available · a constrained choice, not a tuned one.
 *
 * Ends at 1.05, not 1.25, because at 1.25 the near-square card sat too low ·
 * bottom 0.939 of the frame at 820x821 with its blob shadow clipped, floor
 * contact 1.029. At 1.05 it is 0.846 and 0.937, within 0.033 of the
 * landscape-tablet picture, which is the target: the card is the same
 * half-frame height in both.
 *
 * Two consequences worth knowing. `titleCapPx` blends on the same `t`, so any
 * viewport NARROWER than 800 px inside the band changes title size · up to
 * 8.8 px, and 66.9 to 58.5 px on a 600x600 window. No real device is affected;
 * every one of them is outside the band. And the band cannot fix the whole
 * defect: below aspect 0.85 everything sits at `t = 0`, so an 820-wide window
 * still puts the shadow out of frame from aspect 0.945 down to 0.70 (worst
 * 1.045 at 820x920). Narrowing the band strictly shrinks that set · it removes
 * about 27k integer window sizes and adds none · but it cannot empty it.
 * Issue #13 supersedes this knob by keying the blend on the card's height
 * share instead of aspect, which does reach them.
 */
export const CROSSOVER_START = 0.85
export const CROSSOVER_END = 1.05

/** 0 in portrait, 1 in landscape, smoothstepped across the crossover band. */
function crossover(aspect: number): number {
  return smoothstep(clamp((aspect - CROSSOVER_START) / (CROSSOVER_END - CROSSOVER_START), 0, 1))
}

/**
 * Everything the scene's framing depends on, derived from the viewport alone.
 *
 * The card is sized as a fraction of the frame WIDTH, then the camera distance
 * that produces that fraction is solved for — so the card reads at the same
 * size whatever the viewport, and the corridor scales with it. One formula
 * decides that fraction on both sides of square: the smallest of 0.88 (the
 * phone's edge-to-edge card), the 620 px design cap, and half the frame HEIGHT
 * (the frame-fit rule · the card never grows past half the height, so it never
 * pushes into the title band). There is no portrait branch; the frame-fit term
 * is what carries the card continuously through square, where the old branch
 * cliffed. Under all of it sits the legibility floor: the card is never
 * narrower than `CARD_MIN_PX`, so the caption name on it never drops under
 * 12 px — this binds on landscape phones and on 320 px portrait, and a 0.92
 * ceiling keeps the floored card inside the frame.
 *
 * The camera height and the title's floor still differ between a phone and a
 * desktop; they blend across the crossover band instead of switching.
 */
export function sceneGeometry(widthPx: number, heightPx: number): SceneGeometry {
  const aspect = widthPx / heightPx
  const sized = Math.min(0.88, CARD_MAX_PX / widthPx, 0.5 / (aspect * CARD_H))
  const fraction = Math.min(Math.max(sized, CARD_MIN_PX / widthPx), 0.92)
  const D = CARD_W / (fraction * 2 * HALF_FOV_TAN * aspect)
  const spacing = 1.15 * D
  // The second term keeps an 88vw card inside the frame once it is offset.
  const lateral =
    Math.min(0.35 * clamp(aspect / 1.6, 0, 1), 0.9 * (0.5 / fraction - 0.5)) * CARD_W
  const t = crossover(aspect)
  const camY = CARD_Y + (1.0 + (0.61 - 1.0) * t) * CARD_H
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
    // 0.09 of the width, floored — and the phone floor is much higher.
    // A phone's 9% is 35 px, so the floor is what actually decides the title
    // there, and at 56 the title read at 0.14 of the card against the desktop's
    // 0.167. 72 restores that ratio; the wider width cap above is what makes
    // the room for it, and the wrap absorbs whatever does not fit on one line.
    // The floor blends 72 to 56 across the crossover band, like `camY`.
    titleCapPx: clamp(0.09 * widthPx, 72 + (56 - 72) * t, 150),
    titleWidthCap: aspect < 1 ? TITLE_WIDTH_CAP_PORTRAIT : TITLE_WIDTH_CAP,
    titleClearance: aspect < 1 ? TITLE_CLEARANCE_PORTRAIT : TITLE_CLEARANCE,
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
 * The document `scrollY` at which `playheadFor` returns exactly `playhead`, for
 * a wrapper starting at `wrapperTop` whose scrub range is `height − viewport`.
 *
 * The exact inverse of `playheadFor` on BOTH pieces, and today's function when
 * `columns = 0`. It takes a number and never an item id: `sceneMotion` has no
 * cells and must not import the content model. Pipeline 2's
 * `playheadForItem(itemId, layout, extent)` composes this with
 * `playheadForColumn`; see the plan's "Scroll seams".
 */
export function scrollTargetFor(
  playhead: number,
  wrapperTop: number,
  wrapperHeight: number,
  viewportHeight: number,
  columns = 0,
): number {
  const scrub = wrapperHeight - viewportHeight
  if (columns <= 0) {
    return wrapperTop + ((playhead - OVERTURE_START) / PLAYHEAD_SPAN) * scrub
  }
  const span = actTwoSvh(columns)
  const svh =
    playhead <= ACT_TWO_START
      ? (playhead - OVERTURE_START) * 100
      : ACT_ONE_SCRUB_SVH + (playhead - ACT_TWO_START) * span
  return wrapperTop + (svh / (ACT_ONE_SCRUB_SVH + span)) * scrub
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

export interface Seam {
  /** Front position, in plane uv x. */
  front: number
  /** Seam width, in plane uv x. */
  width: number
  /** False on the settle plateaus, where the whole draw takes the crisp path. */
  travelling: boolean
}

/**
 * The seam for a segment: `halfExtent` is the wider of the two titles' canvas
 * half-widths in plane uv and `width` the seam width in the same units. At
 * f 0 the seam stands entirely left of the ink (every column shows the
 * outgoing name), at f 1 entirely right of it (every column the incoming one).
 * The raw fraction goes through `settleFrac` first, so both pin edges rest.
 * Pure and exactly reversible: `blend(x, f) + blend(1 − x, 1 − f) = 1`.
 */
export function seamFor(frac: number, halfExtent: number, width: number): Seam {
  const f = settleFrac(clamp(frac, 0, 1))
  return {
    front: 0.5 - halfExtent - width / 2 + f * (2 * halfExtent + width),
    width,
    travelling: f > 0 && f < 1,
  }
}

/**
 * Local blend at plane column `x`: 1 where the incoming name is already
 * written, 0 where the outgoing one is still intact, a smoothstep across the
 * seam. The shader evaluates exactly this per fragment.
 */
export function seamBlend(x: number, seam: Seam): number {
  return smoothstep(clamp((seam.front - x) / seam.width + 0.5, 0, 1))
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
  return fogRangeAt(g.D, g, t)
}

/**
 * `fogRange` generalised to any focal distance — the same expression with the
 * slot distance made a parameter, so act two can walk the fog out to the wall
 * without a second set of constants.
 */
export function fogRangeAt(
  distance: number,
  g: SceneGeometry,
  t: number,
): { near: number; far: number } {
  const drift = 1 + 0.03 * Math.sin((2 * Math.PI * t) / 9)
  return {
    near: (distance + 0.15 * g.spacing) * drift,
    far: (distance + 2.2 * g.spacing) * drift,
  }
}

/* ── Act two · the frieze frame and the four beats ───────────────────────── */

/** The volume shot fits both axes with a 5 % margin on whichever binds. */
export const VOLUME_FILL = 0.9

/**
 * A FLOOR on the wall's vertical fill at the dolly, never a ceiling.
 *
 * `dollyDistance` is a `min()`, which picks the NEARER distance, and a nearer
 * camera means a FULLER frame — so the legibility term can only push the fill
 * up from here (0.925 at 1440×900, 0.978 at 393×851) and nothing in the
 * expression caps it. Read it as "the wall never shrinks below 82 % of the
 * frame height". Asserting `fill ≤ 1` would be vacuous.
 */
export const DOLLY_HEIGHT_FILL = 0.82

/**
 * A frieze cell is never narrower than this on screen, so an embedded 2×2 case
 * study is never narrower than `CARD_MIN_PX` and its caption never drops under
 * 12 px — the scene's existing legibility law, halved with the cell.
 */
export const FRIEZE_CELL_MIN_PX = Math.ceil(CARD_MIN_PX / 2)

/** The frieze's extent in world space, on the corridor axis. */
export interface FriezeFrame {
  left: number
  right: number
  bottom: number
  top: number
  z: number
  width: number
  height: number
  centreX: number
  centreY: number
}

/**
 * Where the wall stands: centred on the corridor axis, facing the camera, one
 * spacing beyond card four — exactly where a fifth card would be — with its
 * bottom edge on the cards' floor gap so the embedded cards share their floor.
 */
export function friezeFrame(frieze: FriezeExtent, g: SceneGeometry): FriezeFrame {
  const width = frieze.columns * FRIEZE_CELL_W
  const height = frieze.rows * FRIEZE_CELL_H
  const centreY = HOVER + height / 2
  return {
    left: -width / 2,
    right: width / 2,
    bottom: HOVER,
    top: HOVER + height,
    z: -(ACT_TWO_START + 1) * g.spacing,
    width,
    height,
    centreX: 0,
    centreY,
  }
}

/** How far back the camera must sit for the WHOLE frieze to enter the frame. */
export function volumeDistance(frieze: FriezeExtent, g: SceneGeometry): number {
  const { width, height } = friezeFrame(frieze, g)
  return Math.max(
    width / (2 * HALF_FOV_TAN * g.aspect * VOLUME_FILL),
    height / (2 * HALF_FOV_TAN * VOLUME_FILL),
  )
}

/**
 * The reading distance: the nearer of the height fit and the legibility floor.
 * WHICH one binds depends on the viewport, and the old claim here that
 * legibility binds everywhere was wrong twice over: at eight rows it already
 * failed at 1920×1080, and at six rows the crossover is 761 CSS px of height
 * (`FRIEZE_ROWS · FRIEZE_CELL_H · 2 · FRIEZE_CELL_MIN_PX / DOLLY_HEIGHT_FILL`).
 * Below it the 144 px cell floor binds and the fill sits above
 * `DOLLY_HEIGHT_FILL`; above it the height fit binds, the fill is exactly
 * `DOLLY_HEIGHT_FILL`, and the projected reading scale keeps growing with the
 * viewport — which is what the frieze's mask density has to track.
 */
export function dollyDistance(frieze: FriezeExtent, g: SceneGeometry): number {
  const { height } = friezeFrame(frieze, g)
  const dHeight = height / (2 * HALF_FOV_TAN * DOLLY_HEIGHT_FILL)
  const dLegible =
    (FRIEZE_CELL_W * g.widthPx) / (2 * HALF_FOV_TAN * g.aspect * FRIEZE_CELL_MIN_PX)
  return Math.min(dHeight, dLegible)
}

/** What fraction of the frame height the wall fills at the dolly distance. */
export function friezeHeightFill(frieze: FriezeExtent, g: SceneGeometry): number {
  const { height } = friezeFrame(frieze, g)
  return height / (2 * HALF_FOV_TAN * dollyDistance(frieze, g))
}

/**
 * The air above the wall's top row at the dolly, as a frame fraction — every
 * pixel of spare height, because the camera is bottom-anchored. Exported so
 * pipeline 2 can inset the top row's ink under the title band: at eight rows
 * and a 144 px cell the title reads OVER the top row and no camera work
 * recovers the rest (Assumption 23).
 */
export function actTwoTopClearFrac(frieze: FriezeExtent, g: SceneGeometry): number {
  return 1 - friezeHeightFill(frieze, g)
}

/**
 * The camera height at the dolly: the wall's bottom edge lands on the frame's
 * bottom edge, so all the spare frame height sits above the wall. A
 * wall-centred camera would split it, halving the clearance over the top row.
 */
export function dollyY(frieze: FriezeExtent, g: SceneGeometry): number {
  return friezeFrame(frieze, g).bottom + dollyDistance(frieze, g) * HALF_FOV_TAN
}

/**
 * How far the camera may travel laterally: to where the frieze's edge meets the
 * frame's edge, and no further.
 *
 * `min` THEN `max`, in that order. With the frieze centred on the axis a wall
 * wider than the frame has `left + halfVisible < 0 < right − halfVisible`, so
 * the inverted pair would collapse both ends to 0, the range would be empty and
 * the camera would never move for the whole beat — while every monotonicity
 * check still passed vacuously on `0 === 0`. A wall NARROWER than the frame
 * clamps both ends to 0 through these same two lines, which is the intended
 * degenerate case.
 */
export function dollyRange(
  frieze: FriezeExtent,
  g: SceneGeometry,
): { xStart: number; xEnd: number } {
  const { left, right } = friezeFrame(frieze, g)
  const halfVisible = dollyDistance(frieze, g) * HALF_FOV_TAN * g.aspect
  return {
    xStart: Math.min(left + halfVisible, 0),
    xEnd: Math.max(right - halfVisible, 0),
  }
}

/** Position under a trapezoid velocity profile: ramps over `w` at each end, flat between. C1 on [0, 1]. */
export function dollyEase(p: number, w: number): number {
  const t = clamp(p, 0, 1)
  const ramp = clamp(w, 1e-6, 0.5)
  const vmax = 1 / (1 - ramp)
  if (t < ramp) return (vmax * t * t) / (2 * ramp)
  if (t > 1 - ramp) return 1 - (vmax * (1 - t) * (1 - t)) / (2 * ramp)
  return vmax * (t - ramp / 2)
}

/**
 * Card four's opacity multiplier across the release, `1` at `u = 0` and exactly
 * `0` from the end of the release on.
 *
 * Without it card four does not recede: the act-one segment is clamped at 3, so
 * it still sits in its settled slot while the camera closes to the dolly
 * distance with the card between it and the wall — full size in front of the
 * frieze on a desktop, filling the frame on a phone. It also takes the mesh out
 * of the render, so an invisible corridor card cannot intercept a pointer meant
 * for a wall cell in pipeline 2.
 */
export function actTwoCardFade(u: number, frieze: FriezeExtent): number {
  const { release } = actTwoBeats(frieze.columns)
  if (release <= 0) return 0
  return 1 - smoothstep(clamp(u / release, 0, 1))
}

export interface ActTwoPose {
  x: number
  y: number
  z: number
  /** Radians; positive turns left, three's `rotation.y`. */
  yaw: number
  /** Radians; negative = pitched down. */
  pitch: number
}

/** How much the look target leads the body through the approach. */
const LOOK_LEAD = 1.5

/**
 * The act-two camera at act-two progress `u`, in three beats.
 *
 * RELEASE: position and pitch smoothstep from card four's settled slot to the
 * volume shot, with zero velocity at both ends, so the settle plateau hands
 * over without a lurch. Yaw is 0 throughout — the wall stands centred on the
 * corridor axis, so the act-one heading already faces it (Assumption 21).
 *
 * APPROACH: position smoothsteps to the dolly's start while the EYE LEADS THE
 * BODY — the look target's x runs ahead of the camera's — which is where the
 * spec's yaw actually lives. Yaw returns to 0 at the beat's end.
 *
 * DOLLY: lateral travel on `dollyEase`, constant speed through the middle,
 * easing to rest inside the last column with no scroll added.
 */
export function actTwoPose(u: number, frieze: FriezeExtent, g: SceneGeometry): ActTwoPose {
  const frame = friezeFrame(frieze, g)
  const { release, approach } = actTwoBeats(frieze.columns)
  const slot = cameraPose(ACT_TWO_START, g)
  const volZ = frame.z + volumeDistance(frieze, g)
  const dollyZ = frame.z + dollyDistance(frieze, g)
  const { xStart, xEnd } = dollyRange(frieze, g)

  if (u <= release) {
    const s = release > 0 ? smoothstep(clamp(u / release, 0, 1)) : 1
    return {
      x: slot.x + (frame.centreX - slot.x) * s,
      y: slot.y + (frame.centreY - slot.y) * s,
      z: slot.z + (volZ - slot.z) * s,
      yaw: 0,
      pitch: slot.pitch + (0 - slot.pitch) * s,
    }
  }

  const dollyHeight = dollyY(frieze, g)
  if (u <= approach) {
    const span = approach - release
    const raw = span > 0 ? clamp((u - release) / span, 0, 1) : 1
    const s = smoothstep(raw)
    const x = frame.centreX + (xStart - frame.centreX) * s
    const y = frame.centreY + (dollyHeight - frame.centreY) * s
    const z = volZ + (dollyZ - volZ) * s
    // The eye arrives before the body: the look target runs the same path at
    // 1.5×, so the camera is already turned toward the newest block when it
    // gets there, and the yaw is back to 0 by the beat's end.
    const sLead = smoothstep(clamp(LOOK_LEAD * raw, 0, 1))
    const xTarget = frame.centreX + (xStart - frame.centreX) * sLead
    return { x, y, z, yaw: Math.atan2(-(xTarget - x), z - frame.z), pitch: 0 }
  }

  const p = approach < 1 ? clamp((u - approach) / (1 - approach), 0, 1) : 1
  const w = frieze.columns > 0 ? 1 / frieze.columns : 0.5
  return {
    x: xStart + (xEnd - xStart) * dollyEase(p, w),
    y: dollyHeight,
    z: dollyZ,
    yaw: 0,
    pitch: 0,
  }
}

/**
 * The far plane act two needs, applied with the frustum on the geometry key —
 * never per frame. Act one's image does not depend on the far plane, so this
 * changes depth precision and nothing else.
 */
export function sceneFar(frieze: FriezeExtent, g: SceneGeometry): number {
  return Math.max(g.far, volumeDistance(frieze, g) + 2 * g.spacing)
}

/** The camera's distance to the wall at `u`. */
function wallDistance(u: number, frieze: FriezeExtent, g: SceneGeometry): number {
  return actTwoPose(u, frieze, g).z - friezeFrame(frieze, g).z
}

/**
 * Fog through act two: act one's range at `u = 0` — where the wall stands one
 * spacing past the slot and reads about 40 % dissolved, like the next card down
 * the corridor — walking out to the wall's own distance across the release, and
 * tracking it from there.
 */
export function actTwoFogRange(
  u: number,
  frieze: FriezeExtent,
  g: SceneGeometry,
  t: number,
): { near: number; far: number } {
  const { release } = actTwoBeats(frieze.columns)
  const s = release > 0 ? smoothstep(clamp(u / release, 0, 1)) : 1
  const act1 = fogRange(g, t)
  const wall = fogRangeAt(wallDistance(u, frieze, g), g, t)
  return {
    near: act1.near + (wall.near - act1.near) * s,
    far: act1.far + (wall.far - act1.far) * s,
  }
}

/** Depth of field walks from the slot to the wall on the same release ease. */
export function actTwoFocusDistance(
  u: number,
  frieze: FriezeExtent,
  g: SceneGeometry,
): number {
  const { release } = actTwoBeats(frieze.columns)
  const s = release > 0 ? smoothstep(clamp(u / release, 0, 1)) : 1
  return g.D + (wallDistance(u, frieze, g) - g.D) * s
}

/**
 * The title plane's distance in act two: kept in front of the wall, because at
 * 393×851 `titleDistance` is 5.0 and the dolly sits at 4.69. The switch is
 * invisible — `worldPerPx` scales with the distance, so the title's PIXEL size
 * is distance-invariant by construction.
 */
export function actTwoTitleDistance(dWall: number, g: SceneGeometry): number {
  return Math.min(g.titleDistance, 0.8 * dWall)
}

/**
 * The tallest frieze that still fits the frame at the dolly distance — the
 * bound any row count must respect. It is NOT a constant: it falls with the
 * viewport's height, to 7 at 820×821 and 6 at 1280×720, because the 144 px cell
 * floor binds first and act two has no vertical camera travel to recover what
 * overflows. Eight rows sat above this bound on every viewport shorter than
 * ~833 px and the overflow went off the top permanently; six sits under it
 * everywhere in the matrix. Assert against it rather than against a number.
 */
export function maxRowsInFrame(g: SceneGeometry): number {
  return Math.floor((FRIEZE_CELL_W / FRIEZE_CELL_H) * (g.heightPx / FRIEZE_CELL_MIN_PX))
}

/* ── Act two · the reading cursor, the title and the stills ──────────────── */

/** How far through the dolly beat `u` sits, 0 before it starts. */
function dollyProgress(u: number, frieze: FriezeExtent): number {
  const { approach } = actTwoBeats(frieze.columns)
  if (approach >= 1) return 1
  return clamp((u - approach) / (1 - approach), 0, 1)
}

/**
 * The reading cursor, in columns — the SCROLL's column budget, not the camera's
 * position. Linear in the dolly's progress while the camera follows
 * `dollyEase`, so the two disagree by up to one column's share at each end of
 * the beat and coincide through the middle (Assumption 22).
 *
 * That disagreement is accepted, and deliberate: only a linear cursor visits
 * every column, so `blockAt` can name a one-column block that the camera's
 * clamped range never reaches. Driving the title from camera `x` instead would
 * silently skip such a block, which is exactly what the acceptance forbids.
 */
export function dollyCursor(u: number, frieze: FriezeExtent): number {
  return frieze.columns * dollyProgress(u, frieze)
}

/** The block index under the cursor, or `−1` before the dolly begins. */
export function blockIndexAt(u: number, frieze: FriezeExtent): number {
  const { approach } = actTwoBeats(frieze.columns)
  if (u < approach || frieze.blocks.length === 0) return -1
  const col = Math.min(Math.floor(dollyCursor(u, frieze)), frieze.columns - 1)
  for (let k = frieze.blocks.length - 1; k >= 0; k--) {
    if (col >= frieze.blocks[k].startCol) return k
  }
  return 0
}

/** The block under the cursor, or `null` before the dolly begins. */
export function blockAt(u: number, frieze: FriezeExtent): FriezeBlockExtent | null {
  const k = blockIndexAt(u, frieze)
  return k < 0 ? null : frieze.blocks[k]
}

/**
 * A title morph in ACT-TWO TITLE SPACE: `−1` is act one's last card, `0` is
 * `all work`, and `1 + k` is block `k`. The rig maps those onto texture indices.
 */
export interface ActTwoTitle {
  from: number
  to: number
  frac: number
}

/**
 * Half-widths of the morph window at boundary `k`, in columns: half a column
 * each side, clipped to half the neighbouring block. Clipping is what keeps the
 * windows around a ONE-column block from overlapping, while still giving every
 * boundary a window of its own.
 */
function windowHalves(k: number, frieze: FriezeExtent): { hl: number; hr: number } {
  const blocks = frieze.blocks
  return {
    hl: k === 0 ? 0 : Math.min(0.5, blocks[k - 1].columns / 2),
    hr: Math.min(0.5, blocks[k].columns / 2),
  }
}

/**
 * Which two titles the seam is between at `u`, and how far it has crossed.
 *
 * The release morphs card four's name into `all work` over the whole beat; the
 * approach holds `all work`; the dolly morphs inside a window around each block
 * boundary and rests on the block's year between them. `seamFor` applies
 * `settleFrac` downstream, so every window rests at both ends — and the release
 * window's plateau is what holds card four's name for the first 15 % of it.
 */
export function actTwoTitle(u: number, frieze: FriezeExtent): ActTwoTitle {
  const { release, approach } = actTwoBeats(frieze.columns)
  if (u <= release) {
    return { from: -1, to: 0, frac: release > 0 ? clamp(u / release, 0, 1) : 1 }
  }
  if (u < approach) return { from: 0, to: 0, frac: 0 }

  const cursor = dollyCursor(u, frieze)
  for (let k = 0; k < frieze.blocks.length; k++) {
    const { hl, hr } = windowHalves(k, frieze)
    const lo = frieze.blocks[k].startCol - hl
    const hi = frieze.blocks[k].startCol + hr
    // Half-open, so a cursor landing exactly on the seam between two touching
    // windows belongs to one of them and never to both.
    if (cursor >= lo && cursor < hi && hi > lo) {
      return { from: k, to: k + 1, frac: clamp((cursor - lo) / (hi - lo), 0, 1) }
    }
  }
  const index = Math.max(0, blockIndexAt(u, frieze))
  return { from: 1 + index, to: 1 + index, frac: 0 }
}

/**
 * One discrete still under reduced motion. Every act-two channel — camera, fog,
 * focus, title distance, title index and the card-four fade — is derived from
 * THIS, never from the live `u`. Four channels each reading the live playhead is
 * how a "still" acquires a slow drift that no test looks for.
 */
export interface ActTwoStill {
  /** −1 = the volume shot, else the block index. */
  index: number
  /** The single u every act-two function is evaluated at for this still. */
  u: number
  /** Camera x for this still. */
  x: number
}

/** Which still `u` falls in: the volume shot before the dolly, then one per block. */
export function actTwoStill(
  u: number,
  frieze: FriezeExtent,
  g: SceneGeometry,
): ActTwoStill {
  const index = blockIndexAt(u, frieze)
  const { release, approach } = actTwoBeats(frieze.columns)
  if (index < 0) return { index, u: release, x: 0 }
  const block = frieze.blocks[index]
  const { left } = friezeFrame(frieze, g)
  const { xStart, xEnd } = dollyRange(frieze, g)
  const centreX = left + (block.startCol + block.columns / 2) * FRIEZE_CELL_W
  return { index, u: approach, x: clamp(centreX, xStart, xEnd) }
}

/**
 * The still's camera pose. It takes the DESCRIPTOR, not a raw `u`, so a caller
 * cannot accidentally sample a still off a live playhead.
 */
export function actTwoStillPose(
  still: ActTwoStill,
  frieze: FriezeExtent,
  g: SceneGeometry,
): ActTwoPose {
  return { ...actTwoPose(still.u, frieze, g), x: still.x }
}

/**
 * The playhead that parks the reading cursor on a continuous column coordinate.
 * A cell gives `cell.col + cell.span / 2`.
 *
 * This is the WHOLE of pipeline 1's contribution to targeting.
 * `playheadForItem(itemId, layout, extent)` belongs to pipeline 2's
 * `src/utils/friezeTargets.ts`, which composes this with the cell lookup —
 * `sceneMotion` stays pure and ignorant of the content model (Assumption 15).
 */
export function playheadForColumn(col: number, frieze: FriezeExtent): number {
  const { approach } = actTwoBeats(frieze.columns)
  const p = frieze.columns > 0 ? clamp(col / frieze.columns, 0, 1) : 0
  return actTwoPlayhead(approach + (1 - approach) * p)
}

/** …and the same for a block's centre column. */
export function playheadForBlock(k: number, frieze: FriezeExtent): number {
  const block = frieze.blocks[k]
  if (!block) return actTwoPlayhead(actTwoBeats(frieze.columns).approach)
  return playheadForColumn(block.startCol + block.columns / 2, frieze)
}

export { DEG }
