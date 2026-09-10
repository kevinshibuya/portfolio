import { CARD_W, CARD_H, CARD_MAX_PX } from '../../../utils/sceneMotion'

/**
 * The Shadway card, in world units — the same anatomy the DOM card stack used,
 * lifted into the scene. Every measurement is the design's px value over the
 * 620px card width, so the proportions survive whatever size the card renders.
 *
 * Shared by Corridor (which builds the meshes) and Caption (which sets its
 * planes in the body band), so the two can never drift apart.
 */

/** 12px of white frame around the cover. */
export const CARD_PAD = (12 / 620) * CARD_W
export const CARD_RADIUS = (16 / 620) * CARD_W
export const COVER_RADIUS = (10 / 620) * CARD_W

export const COVER_W = CARD_W - 2 * CARD_PAD
/** The cover is a 16/9.5 landscape crop, seated against the card's top edge. */
export const COVER_H = COVER_W * (9.5 / 16)
export const COVER_Y = CARD_H / 2 - CARD_PAD - COVER_H / 2

/** The white band under the cover; the caption sits inside it. */
export const BAND_H = CARD_H - 2 * CARD_PAD - COVER_H
export const BAND_TOP_Y = -CARD_H / 2 + CARD_PAD + BAND_H
export const BAND_BOTTOM_Y = -CARD_H / 2 + CARD_PAD

/** Cover sits just proud of the frame so the two never z-fight. */
export const COVER_Z = 0.002
/** The caption planes sit proud of the frame too, above the cover's step. */
export const CAPTION_Z = 0.003

/**
 * The caption, in design px over the 620-px card (the name's 26 px is
 * CAPTION_NAME_PX in sceneMotion, where the legibility rule reads it): name
 * and subtitle left-aligned at the frame pad, the arrow right-aligned at it.
 */
export const CAPTION_INSET_PX = 12
export const CAPTION_SUBTITLE_PX = 14
export const CAPTION_LINE_GAP_PX = 4
export const CAPTION_ARROW_PX = 22
/** Space kept between the caption text and the arrow. */
export const CAPTION_GAP_PX = 12

/** The caption's inset, in world units: where every caption plane starts. */
export const CAPTION_INSET_WORLD = (CAPTION_INSET_PX / CARD_MAX_PX) * CARD_W

/**
 * Embedded in act two's wall the card's layers draw in this order rather than
 * depth-testing against it: at the volume shot the wall and the card's frame
 * quantise to the same depth, and a tested cover would be rejected in places
 * (Q9). The caption draws last, over both.
 */
export const WALL_ORDER = { frame: 0, cover: 1, caption: 2 } as const
