export type AboutFragmentId =
  | 'curiosity'
  | 'kid-toys'
  | 'how-it-worked'
  | 'present'
  | 'place'
  | 'future'

export interface AboutFragment {
  readonly id: AboutFragmentId
  readonly i18nKey: string
}

export const ABOUT_FRAGMENTS: readonly AboutFragment[] = [
  { id: 'curiosity',     i18nKey: 'sections.about.fragments.curiosity' },
  { id: 'kid-toys',      i18nKey: 'sections.about.fragments.kid-toys' },
  { id: 'how-it-worked', i18nKey: 'sections.about.fragments.how-it-worked' },
  { id: 'present',       i18nKey: 'sections.about.fragments.present' },
  { id: 'place',         i18nKey: 'sections.about.fragments.place' },
  { id: 'future',        i18nKey: 'sections.about.fragments.future' },
] as const

export const ABOUT_FRAGMENT_COUNT = ABOUT_FRAGMENTS.length
