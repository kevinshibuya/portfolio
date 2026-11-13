/**
 * The playhead axis: where the scene sits in the document, and back again.
 *
 * A LEAF. It imports nothing, and it must stay that way — `sceneMotion.ts`
 * imports it, so a single import in the other direction is a cycle, and these
 * are top-level `const`s evaluated at module init, so the cycle would be a
 * white screen rather than a wrong number.
 *
 * The split is by QUESTION, not by size. This file answers "where in the
 * document is the scene's playhead?" — the wrapper's svh, the playhead axis and
 * playhead → scrollY. `sceneMotion.ts` keeps "what does the scene LOOK like at
 * this playhead?", and re-exports every public name below so its own importers
 * are untouched.
 *
 * Nothing may be added here for symmetry. A module that only needs the axis can
 * import it without pulling in the whole motion module.
 *
 * `MAX_SEG` and `PLAYHEAD_SPAN` are exported only because `sceneMotion` reads
 * them; they are NOT re-exported from there.
 */

/** Featured projects in the corridor; the wrapper height is coupled to this. */
export const CARD_COUNT = 4

/** Last segment: card four settled in its slot, as the wrapper ends. */
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

/**
 * The scroll wrapper's height, in svh: 4.5 playhead units at 100 svh each, plus
 * the one viewport the pin itself occupies. Card four settles as it ends; there
 * is no hold beat after it.
 */
export const SCENE_WRAPPER_SVH = (PLAYHEAD_SPAN + 1) * 100

/**
 * The document `scrollY` at which `playheadFor` returns exactly `playhead`, for
 * a wrapper starting at `wrapperTop` whose scrub range is `height − viewport`.
 * The exact inverse of `playheadFor` on `[OVERTURE_START, MAX_SEG]`.
 */
export function scrollTargetFor(
  playhead: number,
  wrapperTop: number,
  wrapperHeight: number,
  viewportHeight: number,
): number {
  const scrub = wrapperHeight - viewportHeight
  return wrapperTop + ((playhead - OVERTURE_START) / PLAYHEAD_SPAN) * scrub
}
