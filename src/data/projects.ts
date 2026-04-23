import type { Project } from '../types/content'

export const projects: Project[] = [
  {
    id: 'reconstruction-dashboard',
    slug: 'reconstruction-dashboard',
    title: {
      en: 'reconstruction',
      pt: 'reconstrução',
    },
    tagline: {
      en: 'federal flood recovery',
      pt: 'recuperação federal',
    },
    description: {
      en: 'Interactive dashboard tracking federal investments in the recovery from the May 2024 floods in Rio Grande do Sul. Provided transparency into government initiatives and inspired policy actions.',
      pt: 'Dashboard interativo acompanhando investimentos federais na recuperação das enchentes de maio de 2024 no Rio Grande do Sul. Proporcionou transparência em iniciativas governamentais e inspirou ações políticas.',
    },
    techStack: ['Next.js', 'TypeScript', 'Data Visualization', 'REST APIs'],
    year: 2024,
    liveUrl: 'https://gauchazh.clicrbs.com.br',
    coverImage: '/images/projects/reconstruction-dashboard.jpg',
    images: [],
    featured: true,
    size: 'lg',
    gradient: 'linear-gradient(145deg, #F8C5AE, #E07A56)',
  },
  {
    id: 'poll-system',
    slug: 'poll-system',
    title: {
      en: 'poll system',
      pt: 'enquetes',
    },
    tagline: {
      en: 'realtime engagement',
      pt: 'engajamento em tempo real',
    },
    description: {
      en: 'Custom-built poll system using Next.js and Firebase that replaced an existing paid service. Widely adopted across the company for editorial and audience engagement.',
      pt: 'Sistema de enquetes construído com Next.js e Firebase que substituiu serviço pago existente. Amplamente adotado pela empresa para engajamento editorial e de audiência.',
    },
    techStack: ['Next.js', 'Firebase', 'React', 'TypeScript'],
    year: 2023,
    coverImage: '/images/projects/poll-system.jpg',
    images: [],
    featured: true,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #D6E8CC, #A8C899)',
  },
  {
    id: 'interactive-embeds',
    slug: 'interactive-embeds',
    title: {
      en: 'embeds',
      pt: 'interativos',
    },
    tagline: {
      en: '250+ interactives',
      pt: '250+ interativos',
    },
    description: {
      en: 'Hundreds of interactive editorial pieces — simulators, quizzes, calculators, interactive maps — published on GZH, one of Brazil\'s largest news platforms.',
      pt: 'Centenas de peças editoriais interativas — simuladores, quizzes, calculadoras, mapas interativos — publicadas na GZH, uma das maiores plataformas de notícias do Brasil.',
    },
    techStack: ['React', 'TypeScript', 'D3.js', 'Leaflet', 'Data Journalism'],
    year: 2024,
    liveUrl: 'https://gauchazh.clicrbs.com.br',
    coverImage: '/images/projects/interactive-embeds.jpg',
    images: [],
    featured: true,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #EDE0D6, #B09080)',
  },
  {
    id: 'editorial-cms',
    slug: 'editorial-cms',
    title: {
      en: 'field notes',
      pt: 'editor de conteúdo',
    },
    tagline: {
      en: 'cms + editor',
      pt: 'cms + editor',
    },
    description: {
      en: 'A lightweight editorial CMS with inline preview, rich text, and first-class support for embed composition. Built to accelerate hands-on publishing workflows.',
      pt: 'Um CMS editorial leve com pré-visualização inline, rich text e suporte de primeira classe para composição de embeds. Construído para acelerar fluxos de publicação.',
    },
    techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    year: 2023,
    coverImage: '/images/projects/editorial-cms.jpg',
    images: [],
    featured: true,
    size: 'md',
    gradient: 'linear-gradient(145deg, #1A1512, #6B4F3E)',
    dark: true,
  },
]
