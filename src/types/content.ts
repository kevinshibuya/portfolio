export interface Bilingual {
  en: string
  pt: string
}

export type Lang = keyof Bilingual

export type WorkMode = 'in-person' | 'remote'

export interface WorkExperience {
  id: number
  company: string
  role: Bilingual
  period: Bilingual
  location: Bilingual
  workMode: WorkMode
  description: { en: string[]; pt: string[] }
  technologies: string[]
  highlight?: Bilingual
}

export interface Stat {
  value: string
  label: Bilingual
}

export type Origin = 'professional' | 'freelance' | 'personal'

/** Where a project stands today; the label is translated in the locale files. */
export type ProjectStatus = 'live' | 'published' | 'prelaunch' | 'internal' | 'mvp'

/**
 * The captures of a project, served from /images/work/<slug>/.
 * Desktop captures are 16:9 (`d<n>.webp`), one caption each, the first being
 * the project's cover. Phone captures (`m<n>.webp`) are 560 wide.
 */
export interface ProjectShots {
  desktop: Bilingual[]
  mobile: { count: number; height: number }
}

export interface Project {
  id: string
  slug: string
  title: Bilingual
  year: number
  origin?: Origin
  /** Rank on the home page and in the next-project chain, 1 first. */
  order: number
  client: string
  /** What Kevin did on it, in two or three words. */
  role: Bilingual
  /** Who built it: developers, and who it was made with. */
  team: Bilingual
  status: ProjectStatus

  /** Two or three words: the kind of thing it is. */
  kind: Bilingual
  /** One line: what it is and one result. The description on its page and beside its frame. */
  line: Bilingual
  /** The one paragraph of its page, about fifty words. */
  body: Bilingual

  /** One line: what it is. */
  summary: Bilingual
  /** One line: one result. */
  result: Bilingual
  /** Page description for search engines and link previews. */
  description: Bilingual
  stats?: Stat[]

  pitch: Bilingual
  whatShipped?: Bilingual
  trick?: Bilingual

  liveUrl?: string
  githubUrl?: string
  techStack: string[]
  shots: ProjectShots
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
  /** dd/mm/yyyy */
  publicationDate: string
  editorial: string
  type: EmbedType
  link: string
  title: string
}

/** One capture or recording of a project, as built by the media pass into `media.json`. */
export interface MediaStill {
  id: string
  type: 'still'
  /** A desktop capture or a phone capture. */
  shape: 'wide' | 'phone'
  w: number
  h: number
  src: string
  srcset?: string
  /** An earlier still of the same screen in another state. */
  like?: string
}

export interface MediaClip {
  id: string
  type: 'clip'
  shape: 'wide' | 'phone'
  w: number
  h: number
  poster: string
  webm: string
  mp4: string
  /** The still that shows the screen this recording opens on. */
  twin?: string
}

export type MediaItem = MediaStill | MediaClip
