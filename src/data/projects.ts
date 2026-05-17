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
      en: "a next.js 14 app router project in typescript, exported as static html and served on azion's edge — no node runtime. one 488 KB JSON, denormalized by the newsroom, feeds 19 routes through a tiny SWR-backed data layer. UI primitives from mantine and nextui.",
      pt: "projeto next.js 14 app router em typescript, exportado como html estático e hospedado na edge da azion — sem runtime node. um único JSON de 488 KB, denormalizado pela redação, alimenta 19 rotas por uma camada de dados enxuta baseada em SWR. primitivos de UI vêm de mantine e nextui.",
    },
    trick: {
      en: 'a *selector layer* reduces the flat JSON into per-government, per-segment, and summary slices that each route consumes, all memoized so the same calculation never runs twice across a session. *three charting libraries* — highcharts, apexcharts, chart.js — share the same in-memory dataset, picked per chart type rather than per page.',
      pt: 'uma *camada de selectors* reduz o JSON achatado em recortes por esfera, por segmento e de sumário que cada rota consome — tudo memoizado, então o mesmo cálculo nunca roda duas vezes na mesma sessão. *três libs de chart* — highcharts, apexcharts, chart.js — compartilham o mesmo dataset em memória, escolhidas por tipo de gráfico em vez de por página.',
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
      en: 'two apps over one firestore: a *backoffice* where editors create polls and copy embed snippets, and a *public widget* where readers vote and watch percentages update live. backoffice access is locked to grupo rbs google accounts; the embed loads any poll by id and streams updates straight from firestore.',
      pt: 'dois apps sobre um firestore: um *backoffice* onde editores criam enquetes e copiam snippets de embed, e um *widget público* onde leitores votam e veem percentuais ao vivo. o backoffice é restrito a contas google do grupo rbs; o embed carrega qualquer enquete por id e transmite as atualizações direto do firestore.',
    },
    trick: {
      en: 'duplicate-vote detection uses a device id stored in `localStorage` as the *firestore document id itself* — so checking whether someone has voted is a single *O(1)* lookup against a known key, not a query. a confirmed vote then commits as one atomic write that increments the option tally and the running total together, so the public widget never sees a half-counted state.',
      pt: 'a detecção de voto duplicado usa um device id em `localStorage` como *id do próprio documento* no firestore — então verificar se alguém já votou é uma leitura *O(1)* contra uma chave conhecida, não uma query. um voto confirmado é uma única escrita atômica que incrementa o contador da opção e o total geral juntos, então o widget público nunca enxerga um estado parcialmente contado.',
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
      en: 'a react + vite spa deployed as a static build on a private rbs host. all editorial content comes from a single JSON file fetched at runtime; navigation between dashboard, video player, and article reader runs purely on react state — no backend, no client-side router. tailwind v4 with a touch of emotion.',
      pt: 'spa react + vite com build estático em host privado da rbs. todo o conteúdo editorial vem de um único arquivo JSON carregado em runtime; a navegação entre dashboard, player de vídeo e leitor de artigo roda em estado react puro — sem backend, sem roteador. tailwind v4 com um toque de emotion.',
    },
    trick: {
      en: '*one shared course shell* — sidebar list, main panel, progress tracker — backs both the video player and the article reader. articles ship as ordered arrays of typed blocks (paragraphs, pull-quotes) rather than HTML strings, so styling is applied *structurally* by the renderer instead of leaking into the copy. publishing is one JSON edit plus dropping media into the assets folder.',
      pt: '*um único shell de curso* — sidebar, painel principal e progress tracker — atende tanto o player de vídeo quanto o leitor de artigo. os artigos chegam como arrays ordenados de blocos tipados (parágrafos, citações em destaque) em vez de strings de HTML, então o estilo é aplicado *estruturalmente* pelo renderer, sem vazar para a copy. publicar é editar um JSON e soltar a mídia na pasta de assets.',
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
      en: 'a no-backend single-page app built with vite 6, react 18, typescript, and SWC. all copy and image manifests live inline in one source file — one section component per photographer. brightcove iframes embed directly so the react tree never owns the player lifecycle.',
      pt: 'spa sem backend feita com vite 6, react 18, typescript e SWC. toda a copy e os manifestos de imagem ficam inline num único arquivo — um componente de seção por fotógrafo. iframes do brightcove embedam direto, então a árvore react nunca controla o ciclo do player.',
    },
    trick: {
      en: "scroll is driven entirely by *motion's scroll hooks*, scoped per-section. one progress value feeds the parallax y-offsets, opacity reveals, image-width compression, and the sticky author-rail drift — all on `transform` and `opacity` so the work stays on the GPU compositor. parallax thumbnail positions are deterministic and memoized across scroll ticks.",
      pt: 'o scroll é guiado por inteiro pelos *hooks de scroll do motion*, com escopo por seção. um único valor de progresso alimenta os offsets de parallax, as revelações por opacidade, a compressão de largura e o drift vertical da coluna do autor — tudo em `transform` e `opacity` para o trabalho ficar na GPU. as posições dos thumbnails são determinísticas e memoizadas entre frames de scroll.',
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
      en: 'a single-route react + vite spa with emotion styling. game progression is a *client-side state machine* (intro → rules → team picker → 10 × {draw → stat-pick → result} → podium) with no URL transitions. all roster data, player stats, and matchup logic ship as static assets — 56 athlete portraits, four stat icons, podium illustrations.',
      pt: 'spa react + vite de rota única com emotion. a progressão do jogo é uma *state machine no cliente* (intro → regras → seleção → 10 × {saca → escolhe atributo → resultado} → pódio) sem transições de URL. todos os dados de elenco, atributos e lógica de comparação saem como assets estáticos — 56 retratos, quatro ícones, ilustrações de pódio.',
    },
    trick: {
      en: 'the *gangorra* — a score-delta momentum visualization — swaps between three pre-baked webp illustrations via framer motion easing. card-flip reveals are choreographed in *two sequential phases*: opponent card reveal first, then stat-row highlight on the winning attribute — producing a TV-style result read rather than a single-frame cut. a portrait-orientation gate enforces vertical layout.',
      pt: 'a *gangorra* — visualização de momentum por diferença de pontos — alterna entre três webps pré-renderizados via easing do framer motion. as viradas de carta são coreografadas em *duas fases sequenciais*: revelação da carta adversária primeiro, depois destaque no atributo vencedor — leitura estilo TV em vez de corte de frame único. uma porta de orientação retrato força o layout vertical.',
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
      en: "an *in-page sales funnel* for a 50+ hour political-fundamentals course — hotmart's checkout opens inside a modal so readers never leave, and each communicator's referral link rewrites the hero around them.",
      pt: 'um *funil de vendas numa página só* para um curso de 50+ horas de fundamentos políticos — o checkout do hotmart abre num modal, o leitor nunca sai, e cada link de referência de comunicador reescreve a hero em torno dele.',
    },
    whatShipped: {
      en: 'a react + vite spa on cloudflare pages, styled with tailwind v4. the entire scrapbook visual language — paper textures, washi tape, torn edges, layered shadows, hand-cut portrait cutouts — is composed from a small toolkit of utility primitives, so each section reads like a different page of a physical zine. checkout, professor data, and copy all live in-repo as static assets — no CMS, no auth, no backend.',
      pt: 'spa react + vite no cloudflare pages, com tailwind v4. toda a linguagem visual de scrapbook — texturas de papel, fitas washi, bordas rasgadas, sombras em camadas, retratos recortados à mão — é montada a partir de um pequeno conjunto de primitivos utilitários, então cada seção parece uma página diferente de uma fanzine impressa. checkout, dados dos professores e copy ficam todos no repo como assets estáticos — sem CMS, sem auth, sem backend.',
    },
    trick: {
      en: "the whole funnel is *one page*: clicking any CTA opens hotmart's checkout *inside an in-page modal* — readers never leave the domain, so the context-switch that usually kills conversion is gone. every personalized communicator link (`?ref=<slug>`) rearranges the hero so that professor becomes the *centerpiece* with the other 16 orbiting them, auto-applies their coupon, and forwards their slug to hotmart's producer analytics so commissions split cleanly. result: a near-perfect *core web vitals* score (97% good LCP, 640 ms page load) and *1.3k visitors in two weeks* on pure SEO — the page hadn't even been posted to social yet.",
      pt: 'o funil inteiro é *uma página só*: clicar em qualquer CTA abre o checkout do hotmart *num modal sobre a própria página* — o leitor nunca sai do domínio, então a quebra de contexto que costuma matar a conversão desaparece. cada link personalizado de comunicador (`?ref=<slug>`) rearranja a hero para colocar aquele professor no *centro*, com os outros 16 orbitando, aplica o cupom dele automaticamente e encaminha o slug para o analytics de produtor do hotmart — comissão dividida corretamente. resultado: *core web vitals* quase perfeitos (97% de LCP bom, 640 ms de carregamento) e *1.3k visitantes em duas semanas* só por SEO — a página ainda nem tinha ido para as redes sociais.',
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
      en: 'a vite-built react spa, statically exported and served under `/especiais/fotos-do-ano-2024/`. each section pairs a featured flood photograph, a first-person caption from the photographer, an embedded video testimonial from that same photographer, and a black-and-white portrait headshot. typography in hepta slab via google fonts.',
      pt: 'spa react com vite, exportada estaticamente e servida sob `/especiais/fotos-do-ano-2024/`. cada seção combina uma foto-destaque das enchentes, uma legenda em primeira pessoa, um depoimento em vídeo do próprio fotógrafo e um retrato em preto-e-branco. tipografia em hepta slab via google fonts.',
    },
    trick: {
      en: "the *scroll-driven sticky wordmark* — 'ZEROHORA — fotos do ano 2024' — stays fixed over the hero, tracks scroll position, fades, repositions to each photographer panel's top-right kicker, and *switches color from peach to white* as dark-background photo panels slide underneath. the layout alternates full-bleed photographic panels with peach narrative panels to pace the disaster narrative.",
      pt: "o *wordmark fixo guiado por scroll* — 'ZEROHORA — fotos do ano 2024' — fica preso sobre o hero, acompanha o scroll, esmaece, reposiciona-se no canto superior direito de cada painel e *muda de cor de pêssego para branco* quando painéis de fundo escuro passam por baixo. o layout alterna painéis fotográficos de borda a borda com painéis narrativos pêssego para dar compasso à narrativa.",
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
