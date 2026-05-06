export interface WorkExperience {
  id: number
  company: string
  role: { en: string; pt: string }
  period: string
  description: { en: string[]; pt: string[] }
  technologies: string[]
  highlight?: { en: string; pt: string }
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

export interface ScreenshotPair {
  desktop?: string
  mobile?: string
  alt?: Bilingual
  route?: string
}

export interface RouteEntry {
  path: string
  label: string
}

export interface FigureSrc {
  src: string
  alt?: Bilingual
  caption?: Bilingual
}

export type Block =
  | { type: 'paragraph'; text: Bilingual }
  | { type: 'heading'; level: 2 | 3; text: Bilingual }
  | { type: 'pullquote'; text: Bilingual; attribution?: string }
  | { type: 'divider' }
  | {
      type: 'figure'
      src: string
      alt?: Bilingual
      caption?: Bilingual
      width: 'inset' | 'wide' | 'bleed'
    }
  | { type: 'figure-pair'; left: FigureSrc; right: FigureSrc }
  | { type: 'figure-grid'; items: FigureSrc[] }
  | { type: 'stat-row'; stats: Stat[] }
  | { type: 'route-list'; routes: RouteEntry[]; collapsible?: boolean }

export interface Project {
  // identity
  id: string
  slug: string
  title: Bilingual
  year: number

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

  // links + meta
  liveUrl?: string
  githubUrl?: string
  techStack: string[]
  projectType?: ProjectType
  mockedServices?: string[]
  routes?: RouteEntry[]

  // visual
  coverImage: string
  images: string[]
  screenshots?: ScreenshotPair[]

  // story
  story?: Block[]

  // legacy — removed in task 10
  featured?: boolean
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

export type ArchiveKind = 'featured' | 'editorial' | 'personal' | 'oss' | 'freelance'

export interface ArchiveItem {
  id: string
  kind: ArchiveKind
  title: string | Bilingual
  type?: EmbedType
  editorial?: string
  date: string
  sortDate: number
  href: string
  internal: boolean
  gradient: string
  highlight?: boolean
  highlightOrder?: number
}

export function resolveTitle(item: ArchiveItem, lang: 'en' | 'pt'): string {
  if (typeof item.title === 'string') return item.title
  return item.title[lang]
}
