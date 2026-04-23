export interface Stat {
  /** Pre-formatted display value, e.g. "7+" — matches handoff. */
  value: string
  labelKey: string
}

export const heroStats: Stat[] = [
  { value: '7+',   labelKey: 'hero.stats.years' },
  { value: '3+',   labelKey: 'hero.stats.projects' },
  { value: '250+', labelKey: 'hero.stats.embeds' },
]
