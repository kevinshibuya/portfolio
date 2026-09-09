import { CARD_W, CARD_MAX_PX, CAPTION_NAME_PX } from '../../../utils/sceneMotion'
import { CAPTION_GAP_PX, CAPTION_INSET_WORLD } from './cardAnatomy'
import { CELL_LINE_HEIGHT, CELL_META_WEIGHT, CELL_META_WORLD, CELL_TITLE_WEIGHT } from './friezeText'
import type { BoxRun, TextLine } from './textTexture'

/**
 * What a card says when it is embedded in act two's wall (third amendment).
 *
 * The corridor's caption is one two-line coloured texture with an arrow beside
 * it. The wall's is two planes and no arrow, for two reasons the amendment
 * settles: hover tints the TITLE alone, which a single texture cannot express,
 * and the arrow is a hover affordance the rig slides, which act two forbids.
 *
 * The body band holds two rows and no more — the arithmetic is asserted in
 * `textTexture.test.ts` — so the title takes row one and the origin word and
 * the serial share row two at its two ends. A block whose every cell is a case
 * study has nowhere to put its year count, and then its top-left card carries
 * it at the right of the title row (`countCell` returning null is that case).
 */

/** Title em, in world units: the card's own 26 px over its 620 px width. */
export const WALL_TITLE_WORLD = (CAPTION_NAME_PX / CARD_MAX_PX) * CARD_W
/** Muted em: the wall's own meta size, so card and cells set the same text. */
export const WALL_META_WORLD = CELL_META_WORLD
export const WALL_CAPTION_LINE_HEIGHT = CELL_LINE_HEIGHT
/** The two rows together, in world units. Must stay inside `BAND_H`. */
export const WALL_CAPTION_H = (WALL_TITLE_WORLD + WALL_META_WORLD) * WALL_CAPTION_LINE_HEIGHT
/** The caption's width: the whole band, since no arrow reserves any of it. */
export const WALL_CAPTION_W = CARD_W - 2 * CAPTION_INSET_WORLD
/** Space kept between the two ends of a row. */
export const WALL_CAPTION_GAP_WORLD = (CAPTION_GAP_PX / CARD_MAX_PX) * CARD_W

/** The title is drawn as coverage; `material.color` carries the ink. */
export const WALL_TITLE_COVERAGE = '#FFFFFF'
/**
 * The muted plane's ink, drawn OPAQUE at full glyph coverage — transparency
 * only for antialiasing. Not `rgba(11,14,20,.62)` composited at draw time: the
 * card's frame is white and the wall is cream, so that alpha would resolve to
 * two different greys, and neither is what blending into the composer's linear
 * target produces.
 */
export const WALL_MUTED_COLOR = '#646566'

const TITLE_ROW = 0
const META_ROW = 1
const COLLAPSE_SEPARATOR = ' · '

export interface WallCaptionText {
  title: string
  /** The origin word, or empty for a professional piece. */
  origin: string
  serial: string
  /** The block's piece count, when this card is the one carrying it. */
  count?: string
}

export interface WallCaptionRuns {
  /** The tinted plane: white coverage the card's material colours. */
  title: BoxRun[]
  /** The muted plane: the count, the origin and the serial, never tinted. */
  muted: BoxRun[]
}

/**
 * The runs of both planes, at `scale` texels per world unit. `measure` reports
 * a run's ink width in the same px — `measureLine` in the scene, anything
 * deterministic in a test.
 */
export function wallCaptionRuns(
  text: WallCaptionText,
  scale: number,
  measure: (line: TextLine) => number,
): WallCaptionRuns {
  const metaEm = WALL_META_WORLD * scale
  const boxPx = WALL_CAPTION_W * scale
  const gapPx = WALL_CAPTION_GAP_WORLD * scale
  const muted = (over: Partial<BoxRun>): BoxRun => ({
    text: '',
    fontPx: metaEm,
    weight: CELL_META_WEIGHT,
    color: WALL_MUTED_COLOR,
    row: META_ROW,
    align: 'left',
    ...over,
  })

  const runs: BoxRun[] = []
  let titleMax = boxPx

  if (text.count) {
    const count = muted({ text: text.count, row: TITLE_ROW, align: 'right' })
    runs.push(count)
    // The count is block-owned decoration, so it takes its slot from the title
    // rather than overprinting it.
    titleMax = Math.max(0, boxPx - measure(count) - gapPx)
  }

  const serial = muted({ text: text.serial, align: 'right' })
  if (!text.origin) {
    runs.push(serial)
  } else {
    const origin = muted({ text: text.origin })
    if (measure(origin) + gapPx + measure(serial) <= boxPx) {
      runs.push(origin, serial)
    } else {
      // A guard, not the expected path: the origin words are short, but one
      // long enough to reach the serial collapses the row into a single line.
      runs.push(muted({ text: text.origin + COLLAPSE_SEPARATOR + text.serial }))
    }
  }

  return {
    title: [
      {
        text: text.title,
        fontPx: WALL_TITLE_WORLD * scale,
        weight: CELL_TITLE_WEIGHT,
        color: WALL_TITLE_COVERAGE,
        row: TITLE_ROW,
        align: 'left',
        maxWidthPx: titleMax,
      },
    ],
    muted: runs,
  }
}
