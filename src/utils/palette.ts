/** Shader tricolor, contrast-audited (plan table). Index-rotated row tints. */
export const ACCENTS = ['#E64D66', '#4D80E6', '#E6CC4D'] as const
export type Accent = (typeof ACCENTS)[number]
export function accentFor(index: number): Accent {
  return ACCENTS[index % ACCENTS.length]
}
