/**
 * The playhead axis: where the scene sits in the document, and back again.
 *
 * A LEAF. It imports nothing, and it must stay that way — `sceneMotion.ts`
 * imports it, so a single import in the other direction is a cycle, and these
 * are top-level `const`s evaluated at module init, so the cycle would be a
 * white screen rather than a wrong number.
 *
 * Why it exists at all: the nav's `#archive` link has to turn a playhead into a
 * document `scrollY`, and `navTarget.ts` is reached from `Header.tsx` and
 * `Home.tsx`, both eager. Importing that arithmetic from `sceneMotion.ts` put
 * the whole 1250-line motion module — camera poses, fog, depth of field, title
 * morphs, frieze framing — into `index.js`, which had only ever reached it
 * through the lazy `Projects.tsx`. Measured at 9 146 B, and the bytes are not
 * the point: once the eager graph reaches `sceneMotion`, every line added to it
 * afterwards is an eager byte, and the chunk-byte ceiling stops being a guard
 * against exactly this.
 *
 * So the split is by QUESTION, not by size. This file answers "where in the
 * document is the scene's playhead?" — svh extents, the playhead axis, beats as
 * positions on it, and playhead → scrollY. `sceneMotion.ts` keeps "what does
 * the scene LOOK like at this playhead?", and re-exports every name below so
 * its own importers are untouched.
 *
 * Nothing may be added here for symmetry. Whatever lives in this file is eager,
 * whether or not the scene is ever scrolled to.
 *
 * `MAX_SEG`, `PLAYHEAD_SPAN` and `ACT_ONE_SCRUB_SVH` are exported only because
 * `sceneMotion` still reads them; they were private to it before the split and
 * are NOT re-exported from there, so its public surface is unchanged.
 */

/** Featured projects in the corridor; the wrapper height is coupled to this. */
export const CARD_COUNT = 4

/** Last act-one segment: card four settled in its slot. */
export const MAX_SEG = CARD_COUNT - 1

/** Playhead where the scene begins: the overture line stands alone in cream. */
export const OVERTURE_START = -1.5

/** Playhead units the wrapper spans: 1 overture + 0.5 approach + 3 card segments. */
export const PLAYHEAD_SPAN = MAX_SEG - OVERTURE_START

/**
 * Here because the closure needs it, not because it belongs to the playhead.
 * `sceneMotion` calls it three dozen times and re-exports it; it has no better
 * home, and giving it one would be a third module for one line.
 */
export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

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

/** Act one's scrub range, in svh: the wrapper less the viewport the pin holds. */
export const ACT_ONE_SCRUB_SVH = ACT_ONE_SVH - 100

/** Act two's own scrub. No frieze, no act two — and no zero divisor. */
export function actTwoSvh(columns: number): number {
  if (columns <= 0) return 0
  return ACT_TWO_RELEASE_SVH + ACT_TWO_APPROACH_SVH + ACT_TWO_SVH_PER_COLUMN * columns
}

/** The whole wrapper: act one's 550 svh plus whatever the frieze asks for. */
export function sceneWrapperSvh(columns: number): number {
  return ACT_ONE_SVH + actTwoSvh(columns)
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

/** Act-two progress `u` → playhead. */
export function actTwoPlayhead(u: number): number {
  return ACT_TWO_START + clamp(u, 0, 1)
}

/** The playhead the `#archive` nav link lands on: the whole frieze in frame. */
export function volumeShotPlayhead(columns: number): number {
  return actTwoPlayhead(actTwoBeats(columns).release)
}

/**
 * The document `scrollY` at which `playheadFor` returns exactly `playhead`, for
 * a wrapper starting at `wrapperTop` whose scrub range is `height − viewport`.
 *
 * The exact inverse of `playheadFor` on BOTH pieces, and today's function when
 * `columns = 0`. It takes a number and never an item id: this module has no
 * cells and must not import the content model. Pipeline 2's
 * `playheadForItem(itemId, layout, extent)` composes this with
 * `playheadForColumn`.
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
