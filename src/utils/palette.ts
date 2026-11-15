/**
 * The site's colours. The first three are the hero paint, in the order the
 * shader mixes them; orange is also the one accent of every page. Cream and
 * black are the two solid grounds. The CSS tokens in index.css repeat these
 * hexes; the shader reads them here.
 */
export const PALETTE = {
  /** Deep international orange: the paint's body, and the accent. */
  orange: '#D94300',
  /** Periwinkle: the paint's light. */
  periwinkle: '#8DA8F2',
  /** Deep pink: the paint's third colour. */
  pink: '#E0306E',
  /** The light ground, and text on the dark one. */
  cream: '#F9F4EC',
  /** The dark ground, text on the light one, and every frame. */
  black: '#000000',
} as const

/** `#RRGGBB` as the 0..1 float triplet a `vec3` uniform takes. */
export function toVec3(hex: string): Float32Array {
  const n = Number.parseInt(hex.slice(1), 16)
  return new Float32Array([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255])
}
