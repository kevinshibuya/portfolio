export interface Stat {
  value: number
  prefix: string
  labelKey: string // i18n key under "hero.stats"
}

export const heroStats: Stat[] = [
  { value: 7, prefix: '+', labelKey: 'hero.stats.years' },
  { value: 3, prefix: '+', labelKey: 'hero.stats.projects' },
  { value: 250, prefix: '+', labelKey: 'hero.stats.embeds' },
]
