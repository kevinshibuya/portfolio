export type WorkMode = 'in-person' | 'remote'

export interface WorkExperience {
  id: number
  company: string
  role: { en: string; pt: string }
  period: Bilingual
  location?: string
  workMode?: WorkMode
  description: { en: string[]; pt: string[] }
  technologies: string[]
  highlight?: Bilingual
}

export type BentoSize = 'lg' | 'md' | 'sm'

export type ProjectType = 'shipped' | 'learning'

export interface Bilingual {
  en: string
  pt: string
}

export interface Stat {
  value: string
  label: Bilingual
}

export interface Mockups {
  desktop: string        // detail-page hero (target ≥2000px width)
  desktopBento: string   // bento card (1024px native)
  mobile: string         // shared (2000px)
  stackCover?: string    // Selected Work card (1024×608 top-crop webp)
}

export interface Project {
  // identity
  id: string
  slug: string
  title: Bilingual
  year: number
  origin?: Origin

  // ranking
  highlight: boolean
  highlightOrder?: number

  // bento surface
  size?: BentoSize
  gradient?: string
  dark?: boolean

  // hero copy
  tagline?: Bilingual
  description: Bilingual
  stats?: Stat[]

  // editorial digest (required — every detail page renders this digest)
  pitch: Bilingual
  whatShipped?: Bilingual
  trick?: Bilingual

  // links + meta
  liveUrl?: string
  githubUrl?: string
  techStack: string[]
  projectType?: ProjectType

  // visual
  mockups?: Mockups
}

export type EmbedType =
  | 'SIMULADOR'
  | 'MAPA INTERATIVO'
  | 'QUIZ'
  | 'CALCULADORA'
  | 'INFOGRAFICO'
  | 'BUSCADOR'
  | 'GALERIA'

export interface Embed {
  publicationDate: string
  editorial: string
  type: EmbedType
  link: string
  title: string
  imagePreview?: string
}

export type Origin = 'professional' | 'freelance' | 'personal'

export interface ArchiveItem {
  id: string
  title: string | Bilingual
  origin: Origin
  caseStudy?: { slug: string }
  type?: EmbedType
  editorial?: string
  date: string
  sortDate: number
  year: number
  href: string
  internal: boolean
  serial: number
}

export function resolveTitle(item: ArchiveItem, lang: 'en' | 'pt'): string {
  if (typeof item.title === 'string') return item.title
  return item.title[lang]
}
