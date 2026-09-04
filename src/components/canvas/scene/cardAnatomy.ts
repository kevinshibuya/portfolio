import { CARD_W, CARD_H } from '../../../utils/sceneMotion'

/**
 * The Shadway card, in world units — the same anatomy the DOM card stack used,
 * lifted into the scene. Every measurement is the design's px value over the
 * 620px card width, so the proportions survive whatever size the card renders.
 *
 * Shared by Corridor (which builds the meshes) and SceneRig (which projects the
 * body band to place the DOM overlay), so the two can never drift apart.
 */

/** 12px of white frame around the cover. */
export const CARD_PAD = (12 / 620) * CARD_W
export const CARD_RADIUS = (16 / 620) * CARD_W
export const COVER_RADIUS = (10 / 620) * CARD_W

export const COVER_W = CARD_W - 2 * CARD_PAD
/** The cover is a 16/9.5 landscape crop, seated against the card's top edge. */
export const COVER_H = COVER_W * (9.5 / 16)
export const COVER_Y = CARD_H / 2 - CARD_PAD - COVER_H / 2

/** The white band under the cover; the DOM overlay rides inside it. */
export const BAND_H = CARD_H - 2 * CARD_PAD - COVER_H
export const BAND_TOP_Y = -CARD_H / 2 + CARD_PAD + BAND_H
export const BAND_BOTTOM_Y = -CARD_H / 2 + CARD_PAD

/** Cover sits just proud of the frame so the two never z-fight. */
export const COVER_Z = 0.002
