export interface Stat {
  /** Pre-formatted display value, e.g. "7+" — matches handoff. */
  value: string
  labelKey: string
}

export interface StatRow {
  /** Pre-formatted display value, e.g. "7+", "R$ 129B", "760k". */
  value: string
  /** i18n key for the annotation sentence (EN + PT). */
  annotationKey: string
  /** Optional case-study link rendered inline at the end of the annotation. */
  caseStudy?: {
    /** Matches `Project.slug` in `src/data/projects.ts`. */
    slug: string
    /** i18n key for the link text. */
    labelKey: string
  }
}

export const heroStats: Stat[] = [
  { value: '7+',   labelKey: 'hero.stats.years' },
  { value: '3+',   labelKey: 'hero.stats.projects' },
  { value: '250+', labelKey: 'hero.stats.embeds' },
]

export const statsReceipt: StatRow[] = [
  {
    value: '7+',
    annotationKey: 'stats.receipt.years',
  },
  {
    value: '250+',
    annotationKey: 'stats.receipt.interactives',
  },
  {
    value: 'R$ 129B',
    annotationKey: 'stats.receipt.reconstruction',
    caseStudy: {
      slug: 'painel-da-reconstrucao',
      labelKey: 'stats.receipt.reconstruction_cta',
    },
  },
  {
    value: '760k',
    annotationKey: 'stats.receipt.votes',
    caseStudy: {
      slug: 'enquetes-gzh',
      labelKey: 'stats.receipt.votes_cta',
    },
  },
]
