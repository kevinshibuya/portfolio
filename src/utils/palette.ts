/** Shader tricolor, contrast-audited (plan table). Index-rotated row tints. */
export const ACCENTS = ['#E64D66', '#4D80E6', '#E6CC4D'] as const
export type Accent = (typeof ACCENTS)[number]
export function accentFor(index: number): Accent {
  return ACCENTS[index % ACCENTS.length]
}

/**
 * On-light deep triplet, index-rotated, index-aligned with ACCENTS. Set as the
 * per-project `--row-tint-deep` channel for on-light text-bearing uses (the
 * spec's two-channel mandate; the eyebrow numeral is instead pinned to the
 * STATIC section accent, not this rotation — see T9/T11). The yellow slot CANNOT
 * meet small-text AA on cream (a 4.5:1 deep-yellow reads dark-olive), so it emits
 * the ink-muted step instead — the spec's yellow small-text exemption. The raw
 * ACCENTS stay for on-ink uses (--row-tint).
 */
export const ACCENTS_DEEP = ['#B22B47', '#2A54B5', 'rgba(11,14,20,0.62)'] as const
export type AccentDeep = (typeof ACCENTS_DEEP)[number]
export function accentDeepFor(index: number): AccentDeep {
  return ACCENTS_DEEP[index % ACCENTS_DEEP.length]
}
