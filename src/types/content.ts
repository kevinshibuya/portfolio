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

export interface Project {
  id: string
  slug: string
  title: { en: string; pt: string }
  tagline?: { en: string; pt: string }
  description: { en: string; pt: string }
  techStack: string[]
  year: number
  liveUrl?: string
  githubUrl?: string
  coverImage: string
  images: string[]
  featured: boolean
  size?: BentoSize
  gradient?: string
  dark?: boolean
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
