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
 * STATIC section accent, not this rotation — see T9/T11). The yellow slot emits
 * the ink-muted step instead of #7A6800: the deep yellow DOES pass small-text AA
 * on cream (4.94:1, measured 2026-09-02), but at small sizes it reads dark-olive,
 * so the substitution is an aesthetic rule, kept deliberately. Large text and
 * decoration use ACCENTS_DEEP_LARGE. The raw ACCENTS stay for on-ink uses
 * (--row-tint).
 */
export const ACCENTS_DEEP = ['#B22B47', '#2A54B5', 'rgba(11,14,20,0.62)'] as const
export type AccentDeep = (typeof ACCENTS_DEEP)[number]
export function accentDeepFor(index: number): AccentDeep {
  return ACCENTS_DEEP[index % ACCENTS_DEEP.length]
}

/**
 * On-light triplet for LARGE text (WCAG large: ≥ 24px regular / ≥ 18.66px bold)
 * and for decorative marks, index-aligned with ACCENTS. Measured on cream
 * #F5F2EC: 5.64 / 6.20 / 4.94. Unlike ACCENTS_DEEP, the yellow slot carries a
 * real hex — large text is where the aesthetic dark-olive objection does not
 * apply, and a decorative mark left as raw #E6CC4D would sit at 1.43 on cream,
 * effectively invisible. Set as the per-row `--row-tint-deep-large` channel.
 */
export const ACCENTS_DEEP_LARGE = ['#B22B47', '#2A54B5', '#7A6800'] as const
export type AccentDeepLarge = (typeof ACCENTS_DEEP_LARGE)[number]
export function accentDeepLargeFor(index: number): AccentDeepLarge {
  return ACCENTS_DEEP_LARGE[index % ACCENTS_DEEP_LARGE.length]
}
