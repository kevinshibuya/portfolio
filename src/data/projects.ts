import type { Project } from '../types/content'

export const projects: Project[] = [
  {
    id: 'painel-da-reconstrucao',
    slug: 'painel-da-reconstrucao',
    title: { en: 'painel da reconstrução', pt: 'painel da reconstrução' },
    year: 2024,
    highlight: true,
    highlightOrder: 3,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #A2D2FF, #3A96E8)',
    tagline: {
      en: 'federal flood recovery, mapped over 19 routes',
      pt: 'recuperação federal das enchentes em 19 rotas',
    },
    description: {
      en: 'Long-running data dashboard for GZH tracking every public and private real spent on reconstruction after the May 2024 floods in Rio Grande do Sul.',
      pt: 'Dashboard de longa duração para a GZH que acompanha cada real público e privado investido na reconstrução após as enchentes de maio de 2024 no Rio Grande do Sul.',
    },
    stats: [
      { value: 'R$ 129B', label: { en: 'tracked', pt: 'rastreado' } },
      { value: '19', label: { en: 'routes', pt: 'rotas' } },
      { value: '2024', label: { en: 'launched', pt: 'lançado' } },
    ],
    pitch: {
      en: "a long-running *data dashboard* for GZH, tracking every real spent on rio grande do sul's flood recovery.",
      pt: 'um *painel de dados* de longa duração para a GZH, que acompanha cada real gasto na recuperação das enchentes do rio grande do sul.',
    },
    whatShipped: {
      en: "a static next.js 14 bundle on azion's edge — one 488 KB `data.json` powers 19 routes, three charting libraries, and a leaflet map.",
      pt: 'bundle estático next.js 14 na edge da azion — um `data.json` de 488 KB alimenta 19 rotas, três libs de chart e um mapa leaflet.',
    },
    trick: {
      en: 'a *selector layer* in `src/lib/utils.ts` reduces the flat JSON into per-government, per-segment, and summary shapes — memoized by call site so totals never recompute across re-renders.',
      pt: 'uma *camada de selectors* em `src/lib/utils.ts` reduz o JSON achatado em recortes por esfera, por segmento e de sumário — memoizada por call site, sem recálculo entre re-renders.',
    },
    techStack: [
      'Next.js 14',
      'TypeScript',
      'React 18',
      'Highcharts',
      'ApexCharts',
      'Chart.js',
      'Leaflet',
      'Apollo Client',
      'GraphQL',
      'SWR',
      'Mantine',
      'NextUI',
      'Framer Motion',
    ],
    projectType: 'shipped',
    liveUrl: 'https://gauchazh.clicrbs.com.br/especiais/painel-da-reconstrucao/',
    coverImage: '/images/projects/painel-da-reconstrucao/desktop/01-dados-gerais.png',
    mockups: {
      desktop: '/images/projects/painel-da-reconstrucao/mockups/desktop.webp',
      desktopBento: '/images/projects/painel-da-reconstrucao/mockups/desktop-bento.webp',
      mobile: '/images/projects/painel-da-reconstrucao/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'enquetes-gzh',
    slug: 'enquetes-gzh',
    title: { en: 'enquetes gzh', pt: 'enquetes gzh' },
    year: 2026,
    highlight: true,
    highlightOrder: 2,
    size: 'md',
    gradient: 'linear-gradient(145deg, #C8D8F0, #8AAADA)',
    tagline: {
      en: 'realtime polls, two apps, one firestore',
      pt: 'enquetes em tempo real, dois apps, um firestore',
    },
    description: {
      en: 'Poll/survey system for GZH: a backoffice for the newsroom and an embed widget journalists drop into articles, sharing one Firestore backend.',
      pt: 'Sistema de enquetes para a GZH: um backoffice para a redação e um widget embed que jornalistas inserem em artigos, com backend único no Firestore.',
    },
    stats: [
      { value: '71', label: { en: 'polls', pt: 'enquetes' } },
      { value: '760K+', label: { en: 'votes', pt: 'votos' } },
      { value: 'realtime', label: { en: 'sync', pt: 'sync' } },
    ],
    pitch: {
      en: 'two *real-time apps* over one firestore — a newsroom backoffice and a public vote widget that journalists drop into articles.',
      pt: 'dois *apps em tempo real* sobre um firestore — um backoffice para a redação e um widget público que jornalistas inserem em matérias.',
    },
    whatShipped: {
      en: 'react 18 + vite + shadcn/ui. backoffice google-auth locked to `@gruporbs.com.br`; embed loads any poll by `?poll_id=` and streams percentages via `onSnapshot`.',
      pt: 'react 18 + vite + shadcn/ui. backoffice com google-auth restrito a `@gruporbs.com.br`; embed carrega qualquer enquete por `?poll_id=` e transmite percentuais via `onSnapshot`.',
    },
    trick: {
      en: 'duplicate-vote detection uses a `localStorage` device ID as the firestore doc ID — *O(1) check, zero server round-trip* for repeat visitors; vote commits via atomic `increment()`.',
      pt: 'a detecção de voto duplicado usa um device id em `localStorage` como id do documento firestore — *check O(1), sem round-trip* para visitantes recorrentes; o voto entra por `increment()` atômico.',
    },
    techStack: [
      'React 18',
      'TypeScript',
      'Vite',
      'Firebase Firestore',
      'Firebase Auth',
      'Firebase Cloud Functions',
      'Tailwind CSS',
      'shadcn/ui',
      'React Router 7',
    ],
    projectType: 'shipped',
    liveUrl: 'https://gauchazh.clicrbs.com.br/especiais/enquetes-gzh-backoffice',
    coverImage: '/images/projects/enquetes-gzh/desktop/01-embed-vote.png',
    mockups: {
      desktop: '/images/projects/enquetes-gzh/mockups/desktop.webp',
      desktopBento: '/images/projects/enquetes-gzh/mockups/desktop-bento.webp',
      mobile: '/images/projects/enquetes-gzh/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'ia-na-redacao',
    slug: 'ia-na-redacao',
    title: { en: 'ia na redação', pt: 'ia na redação' },
    year: 2025,
    highlight: true,
    highlightOrder: 6,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #DCF0FF, #6DB8FF)',
    tagline: {
      en: 'how ai is changing the newsroom',
      pt: 'como a ia está mudando a redação',
    },
    description: {
      en: 'A special-feature page for Grupo RBS introducing how AI is being used inside their newsrooms — video testimonials from journalists, opinion articles, and the editorial guidelines.',
      pt: 'Página especial do Grupo RBS apresentando como a IA está sendo usada nas redações — depoimentos em vídeo de jornalistas, artigos de opinião e diretrizes editoriais.',
    },
    techStack: ['React', 'Vite', 'TailwindCSS v4', 'Emotion'],
    pitch: {
      en: 'an *internal grupo rbs hub* where journalists share how they actually use ai — seven video testimonials, four long-form articles, no backend.',
      pt: 'um *hub interno do grupo rbs* onde jornalistas compartilham como usam ia no dia a dia — sete vídeos curtos, quatro artigos longos, sem backend.',
    },
    whatShipped: {
      en: 'a react + vite spa on a private rbs host. one `course-content.json` is the cms; navigation between dashboard, player, and reader runs purely on `useState`.',
      pt: 'spa react + vite em host privado da rbs. um `course-content.json` faz de cms; navegação entre dashboard, player e leitor é pura `useState`.',
    },
    trick: {
      en: '*one shared course shell* — sidebar list + main panel + progress tracker — backs both the video player and the article reader, so completion and sequential navigation work identically across content types.',
      pt: '*um único shell de curso* — sidebar + painel principal + progress tracker — atende o player de vídeo e o leitor de artigo, então progresso e navegação sequencial funcionam igual entre tipos.',
    },
    projectType: 'shipped',
    coverImage: '/images/projects/ia-na-redacao/desktop/01-landing.png',
    mockups: {
      desktop: '/images/projects/ia-na-redacao/mockups/desktop.webp',
      desktopBento: '/images/projects/ia-na-redacao/mockups/desktop-bento.webp',
      mobile: '/images/projects/ia-na-redacao/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'fotos-do-ano-2025',
    slug: 'fotos-do-ano-2025',
    title: { en: 'fotos do ano 2025', pt: 'fotos do ano 2025' },
    year: 2025,
    highlight: true,
    highlightOrder: 4,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #F4F8FE, #A2D2FF)',
    tagline: {
      en: 'a photo retrospective for the year',
      pt: 'a retrospectiva fotográfica do ano',
    },
    description: {
      en: 'Year-end photo retrospective for GZH — a curated longform of the most striking images of 2025, presented as an immersive scroll experience.',
      pt: 'Retrospectiva fotográfica de fim de ano para a GZH — um longform curado com as imagens mais marcantes de 2025, em uma experiência de scroll imersiva.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2025', label: { en: 'retrospective', pt: 'retrospectiva' } },
      { value: 'parallax', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: "GZH's year-end *photo retrospective* — eight staff photographers, eight scroll-driven sections, one fullscreen lightbox.",
      pt: 'a *retrospectiva fotográfica* de fim de ano da GZH — oito fotógrafos do quadro, oito seções guiadas por scroll, um lightbox fullscreen.',
    },
    whatShipped: {
      en: 'a no-backend vite 6 + react 18 spa, deployed under `/especiais/fotos-do-ano-2025/`. all copy inline in `App.tsx`; brightcove iframes own the video lifecycle.',
      pt: 'spa vite 6 + react 18 sem backend, sob `/especiais/fotos-do-ano-2025/`. toda a copy mora em `App.tsx`; iframes do brightcove cuidam do ciclo do vídeo.',
    },
    trick: {
      en: "scroll is driven entirely by *motion's `useScroll` + `useTransform`*, with a `generateSquares` helper laying out parallax thumbnails on stable deterministic positions — every animation stays on `transform` and `opacity`.",
      pt: 'o scroll é guiado por *`useScroll` + `useTransform` do motion*, com `generateSquares` distribuindo thumbnails parallax em posições determinísticas estáveis — toda animação fica em `transform` e `opacity`.',
    },
    techStack: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/fotos-do-ano-2025/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/fotos-do-ano-2025/mockups/desktop.webp',
      desktopBento: '/images/projects/fotos-do-ano-2025/mockups/desktop-bento.webp',
      mobile: '/images/projects/fotos-do-ano-2025/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'peleia-gre-nal',
    slug: 'peleia-gre-nal',
    title: { en: 'peleia gre-nal', pt: 'peleia gre-nal' },
    year: 2024,
    highlight: true,
    highlightOrder: 7,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #DCF0FF, #6DB8FF)',
    tagline: {
      en: 'the porto alegre derby, mapped',
      pt: 'o clássico de porto alegre, mapeado',
    },
    description: {
      en: "An interactive piece on the Gre-Nal — Porto Alegre's historic football derby — built for GZH's sports editorial.",
      pt: 'Peça interativa sobre o Gre-Nal — o clássico histórico de Porto Alegre — construída para a editoria de esportes da GZH.',
    },
    stats: [
      { value: '10', label: { en: 'rounds', pt: 'rodadas' } },
      { value: '56', label: { en: 'cards', pt: 'cartas' } },
      { value: '2', label: { en: 'squads', pt: 'elencos' } },
    ],
    pitch: {
      en: "a *super trunfo card duel* themed around porto alegre's gre-nal — pick a side, play ten rounds against the house, watch a podium decide it.",
      pt: 'um *duelo de super trunfo* tematizado pelo gre-nal — escolha um lado, jogue dez rodadas contra a casa, e um pódio decide o resultado.',
    },
    whatShipped: {
      en: 'a single-route react + vite + emotion spa. game progression is a client-side state machine; 56 athlete portraits, four stat icons, and bronze/silver/gold medals ship as static assets.',
      pt: 'spa react + vite + emotion de rota única. a progressão é uma state machine no cliente; 56 retratos, quatro ícones de atributo e medalhas bronze/prata/ouro são estáticos.',
    },
    trick: {
      en: 'the *gangorra* swaps between three pre-baked webp illustrations to visualize score momentum, and card reveals run in two sequential phases — opponent card first, then winning-stat highlight — for a TV-style read.',
      pt: 'a *gangorra* alterna entre três webps pré-renderizados para visualizar o momentum, e cada carta vira em duas fases — primeiro a do adversário, depois o destaque no atributo vencedor — leitura estilo TV.',
    },
    techStack: ['React', 'TypeScript', 'D3.js'],
    projectType: 'shipped',
    coverImage: '/images/projects/peleia-gre-nal/desktop/01-intro.png',
    mockups: {
      desktop: '/images/projects/peleia-gre-nal/mockups/desktop.webp',
      desktopBento: '/images/projects/peleia-gre-nal/mockups/desktop-bento.webp',
      mobile: '/images/projects/peleia-gre-nal/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'hotmart-bunde',
    slug: 'hotmart-bunde',
    title: { en: 'política essencial', pt: 'política essencial' },
    year: 2026,
    highlight: true,
    highlightOrder: 1,
    size: 'lg',
    dark: true,
    gradient: 'linear-gradient(145deg, #2A4060, #111822)',
    tagline: {
      en: 'scrapbook landing for a 50+ hour course',
      pt: 'landing artesanal para um curso de 50+ horas',
    },
    description: {
      en: "Sales landing page for Política Essencial, a Brazilian online course teaching political fundamentals from zero through 50+ hours of video lessons by 17 social-media communicators. Pure conversion funnel — no auth, no cart, no payment surface; checkout lives on Hotmart.",
      pt: 'Landing page de vendas do Política Essencial, curso online brasileiro que ensina fundamentos políticos do zero em 50+ horas de vídeo-aulas conduzidas por 17 comunicadores de redes sociais. Funil puro de conversão — sem auth, carrinho, ou área de pagamento; checkout no Hotmart.',
    },
    stats: [
      { value: '50+ hrs', label: { en: 'course content', pt: 'conteúdo do curso' } },
      { value: '17', label: { en: 'communicators', pt: 'comunicadores' } },
      { value: '1', label: { en: 'LP funnel', pt: 'funil único' } },
    ],
    pitch: {
      en: 'a *scrapbook landing* for a 50+ hour political-fundamentals course — pure conversion funnel, no auth, no cart, no payment surface.',
      pt: 'uma *landing artesanal* para um curso de 50+ horas de fundamentos políticos — funil puro de conversão, sem auth, sem carrinho, sem pagamento.',
    },
    whatShipped: {
      en: 'a react 18 + vite 6 spa on cloudflare pages, with tailwind v4 expressing the entire scrapbook system as utility classes — paper textures, washi tape, torn edges, layered shadows.',
      pt: 'spa react 18 + vite 6 no cloudflare pages, com tailwind v4 expressando o sistema scrapbook todo como classes utilitárias — texturas de papel, fitas washi, bordas rasgadas e sombras em camadas.',
    },
    trick: {
      en: 'a *`?edit=1` url flag* turns the 17-instructor hero into an in-browser tuning mode, letting per-regime overrides be dragged into place without a redeploy.',
      pt: 'uma *flag `?edit=1` na url* transforma o hero dos 17 professores em modo de ajuste no navegador, permitindo arrastar overrides por regime sem novo deploy.',
    },
    techStack: ['React 18', 'TypeScript', 'Vite 6', 'TailwindCSS v4', 'Framer Motion', 'Lenis', 'Cloudflare Pages'],
    projectType: 'shipped',
    liveUrl: 'https://politicaessencial.com',
    coverImage: '/images/projects/hotmart-bunde/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/hotmart-bunde/mockups/desktop.webp',
      desktopBento: '/images/projects/hotmart-bunde/mockups/desktop-bento.webp',
      mobile: '/images/projects/hotmart-bunde/mockups/mobile.webp',
    },
    images: [],
  },
  {
    id: 'fotos-do-ano-2024',
    slug: 'fotos-do-ano-2024',
    title: { en: 'fotos do ano 2024', pt: 'fotos do ano 2024' },
    year: 2024,
    highlight: true,
    highlightOrder: 5,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #DCF0FF, #A2D2FF)',
    tagline: {
      en: 'eight viewpoints on the may 2024 floods',
      pt: 'oito olhares sobre as enchentes de maio de 2024',
    },
    description: {
      en: "Year-end photojournalism retrospective for Zero Hora — eight staff photographers, each contributing one image from the May 2024 Rio Grande do Sul floods. Scroll-driven editorial gallery with sticky wordmark and embedded video testimonials.",
      pt: 'Retrospectiva fotojornalística de fim de ano da Zero Hora — oito fotógrafos do quadro fixo, cada um com uma imagem das enchentes de maio de 2024 no Rio Grande do Sul. Galeria editorial guiada por scroll, com wordmark fixo e depoimentos em vídeo.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2024', label: { en: 'flood retrospective', pt: 'retrospectiva das enchentes' } },
      { value: 'scroll', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: "*zero hora's 2024 photo retrospective* — eight staff photographers, one image each from the may floods, told as a single first-person record.",
      pt: 'a *retrospectiva fotográfica 2024* da zero hora — oito fotógrafos do quadro, uma imagem de cada das enchentes de maio, contada como um único registro em primeira pessoa.',
    },
    whatShipped: {
      en: 'a vite-built react spa under `/especiais/fotos-do-ano-2024/`. each section pairs a featured photo, a first-person caption, an inline `<video>` testimonial, and a black-and-white portrait.',
      pt: 'spa react com vite sob `/especiais/fotos-do-ano-2024/`. cada seção combina foto-destaque, legenda em primeira pessoa, depoimento `<video>` inline e retrato em preto-e-branco.',
    },
    trick: {
      en: 'a *scroll-driven sticky wordmark* tracks position over the hero, repositions to each panel\'s top-right kicker, and switches color from peach to white as dark photo panels slide underneath.',
      pt: 'um *wordmark fixo guiado por scroll* acompanha o hero, reposiciona-se no canto superior direito de cada painel e troca de pêssego para branco quando painéis escuros passam por baixo.',
    },
    techStack: ['React', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/fotos-do-ano-2024/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/fotos-do-ano-2024/mockups/desktop.webp',
      desktopBento: '/images/projects/fotos-do-ano-2024/mockups/desktop-bento.webp',
      mobile: '/images/projects/fotos-do-ano-2024/mockups/mobile.webp',
    },
    images: [],
  },
]

// Module-load-time validator: every Selected Work top-4 highlight must
// have both a desktop and mobile mockup. Catches regressions where someone
// promotes a project to top-4 without generating its mockup assets.
{
  const selectedWork = projects.filter(
    (p) => p.highlight && (p.highlightOrder ?? 99) <= 4
  )
  for (const p of selectedWork) {
    if (!p.mockups?.desktop || !p.mockups?.desktopBento || !p.mockups?.mobile) {
      throw new Error(
        `Project "${p.id}" is a Selected Work highlight but is missing mockups`
      )
    }
  }
}
