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
      pt: 'Painel de dados sempre atualizado para a GZH, que monitora cada real — público e privado — investido na reconstrução após as enchentes de maio de 2024 no Rio Grande do Sul.',
    },
    stats: [
      { value: 'R$ 129B', label: { en: 'tracked', pt: 'rastreado' } },
      { value: '19', label: { en: 'routes', pt: 'rotas' } },
      { value: '2024', label: { en: 'launched', pt: 'lançado' } },
    ],
    pitch: {
      en: "a long-running *data dashboard* for GZH, tracking every real spent on rio grande do sul's flood recovery.",
      pt: 'um *painel de dados* sempre atualizado para a GZH, que monitora cada real investido na recuperação das enchentes do rio grande do sul.',
    },
    whatShipped: {
      en: "a next.js 14 app router project in typescript, exported as static html and served on azion's edge — no node runtime. one 488 KB JSON, denormalized by the newsroom, feeds 19 routes through a tiny SWR-backed data layer. UI primitives from mantine and nextui.",
      pt: 'projeto em next.js 14 com app router e typescript, exportado para html estático e servido na edge da azion — sem Node em runtime. um único JSON de 488 KB, já denormalizado pela redação, alimenta as 19 rotas através de uma camada enxuta de dados em cima de SWR. componentes de UI vêm da mantine e do nextui.',
    },
    trick: {
      en: 'a *selector layer* reduces the flat JSON into per-government, per-segment, and summary slices that each route consumes, all memoized so the same calculation never runs twice across a session. *three charting libraries* — highcharts, apexcharts, chart.js — share the same in-memory dataset, picked per chart type rather than per page.',
      pt: 'uma *camada de seletores* reduz o JSON plano em recortes por esfera de governo, por segmento e de sumário, cada um consumido por uma rota — e tudo memoizado, então o mesmo cálculo nunca se repete dentro de uma sessão. *três libs de gráficos* — highcharts, apexcharts, chart.js — dividem o mesmo dataset em memória, cada uma escolhida pelo tipo de gráfico, não pela página.',
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
      pt: 'Sistema de enquetes para a GZH: um backoffice para a redação e um widget de embed que os jornalistas plugam direto nas matérias, rodando sobre um único Firestore.',
    },
    stats: [
      { value: '71', label: { en: 'polls', pt: 'enquetes' } },
      { value: '760K+', label: { en: 'votes', pt: 'votos' } },
      { value: 'realtime', label: { en: 'sync', pt: 'sync' } },
    ],
    pitch: {
      en: 'two *real-time apps* over one firestore — a newsroom backoffice and a public vote widget that journalists drop into articles.',
      pt: 'dois *apps em tempo real* em cima de um firestore — um backoffice para a redação e um widget público que os jornalistas plugam nas matérias.',
    },
    whatShipped: {
      en: 'two apps over one firestore: a *backoffice* where editors create polls and copy embed snippets, and a *public widget* where readers vote and watch percentages update live. backoffice access is locked to grupo rbs google accounts; the embed loads any poll by id and streams updates straight from firestore.',
      pt: 'dois apps em cima de um firestore: um *backoffice* onde os editores criam as enquetes e copiam o snippet de embed, e um *widget público* onde os leitores votam e veem os percentuais subirem em tempo real. o backoffice é restrito a contas google do grupo rbs; o embed carrega qualquer enquete pelo id e transmite as atualizações direto do firestore.',
    },
    trick: {
      en: 'duplicate-vote detection uses a device id stored in `localStorage` as the *firestore document id itself* — so checking whether someone has voted is a single *O(1)* lookup against a known key, not a query. a confirmed vote then commits as one atomic write that increments the option tally and the running total together, so the public widget never sees a half-counted state.',
      pt: 'a detecção de voto duplicado usa um device id guardado em `localStorage` como *id do próprio documento* no firestore — então verificar se alguém já votou vira uma leitura *O(1)* direta numa chave conhecida, sem precisar de query. e um voto confirmado é uma escrita atômica só, que sobe o contador da opção e o total geral ao mesmo tempo — o widget público nunca pega uma contagem pela metade.',
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
    highlightOrder: 4,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #DCF0FF, #6DB8FF)',
    tagline: {
      en: 'how ai is changing the newsroom',
      pt: 'como a ia está mudando a redação',
    },
    description: {
      en: 'A special-feature page for Grupo RBS introducing how AI is being used inside their newsrooms — video testimonials from journalists, opinion articles, and the editorial guidelines that frame the use. Shipped as an MVP to validate internal adoption before scaling into a full platform.',
      pt: 'Página especial do Grupo RBS mostrando como a IA já está sendo usada dentro das redações — depoimentos em vídeo de jornalistas, artigos de opinião e as diretrizes editoriais que orientam esse uso. Lançado como MVP para validar a adoção interna antes de investir numa evolução maior.',
    },
    techStack: ['React', 'Vite', 'TailwindCSS v4', 'Emotion'],
    pitch: {
      en: 'an *internal grupo rbs hub* where journalists share how they actually use ai — built as an MVP to measure newsroom adoption before scaling into a full editorial platform.',
      pt: 'um *hub interno do grupo rbs* onde os próprios jornalistas contam como usam ia no dia a dia — construído como um MVP para medir a adoção da redação antes de evoluir para uma plataforma editorial completa.',
    },
    whatShipped: {
      en: 'a react + vite spa deployed as a static build on a private rbs host, supporting both video testimonials and long-form articles inside the same editorial shell. content is published from a single JSON file so the newsroom can keep iterating on the format while the MVP proves its value. tailwind v4 with a touch of emotion.',
      pt: 'spa react + vite com build estático servida num host privado da rbs, com suporte tanto a depoimentos em vídeo quanto a artigos longos dentro do mesmo shell editorial. o conteúdo é publicado a partir de um único arquivo JSON, então a redação consegue continuar iterando no formato enquanto o MVP prova seu valor. tailwind v4 com um toque de emotion.',
    },
    trick: {
      en: '*one shared course shell* — sidebar list, main panel, progress tracker — backs both the video player and the article reader, so adding a new editorial format becomes a new block type rather than a new screen. articles ship as ordered arrays of typed blocks (paragraphs, pull-quotes) rather than HTML strings, so styling is applied *structurally* by the renderer instead of leaking into the copy.',
      pt: '*um único shell de curso* — lista lateral, painel principal e barra de progresso — serve ao mesmo tempo o player de vídeo e o leitor de artigo, então adicionar um novo formato editorial vira um novo tipo de bloco, não uma nova tela. os artigos chegam como arrays ordenados de blocos tipados (parágrafos, citações em destaque) em vez de blobs de HTML, então o estilo é aplicado *estruturalmente* pelo renderer, sem se misturar ao conteúdo.',
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
    highlightOrder: 6,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #F4F8FE, #A2D2FF)',
    tagline: {
      en: 'a photo retrospective for the year',
      pt: 'a retrospectiva fotográfica do ano',
    },
    description: {
      en: 'Year-end photo retrospective for GZH — a curated longform of the most striking images of 2025, presented as an immersive scroll experience.',
      pt: 'Retrospectiva fotográfica de fim de ano para a GZH — um longform curado das imagens mais marcantes de 2025, montado como uma leitura imersiva guiada pelo scroll.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2025', label: { en: 'retrospective', pt: 'retrospectiva' } },
      { value: 'parallax', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: "GZH's year-end *photo retrospective* — eight staff photographers, eight scroll-driven sections, one fullscreen lightbox.",
      pt: 'a *retrospectiva fotográfica* de fim de ano da GZH — oito fotógrafos do quadro, oito seções comandadas pelo scroll, um lightbox em tela cheia.',
    },
    whatShipped: {
      en: 'a no-backend single-page app built with vite 6, react 18, typescript, and SWC. all copy and image manifests live inline in one source file — one section component per photographer. brightcove iframes embed directly so the react tree never owns the player lifecycle.',
      pt: 'spa sem backend feita em vite 6, react 18, typescript e SWC. toda a copy e os manifestos de imagem ficam inline num único arquivo de fonte — um componente de seção para cada fotógrafo. os iframes do brightcove embedam direto, então a árvore react nunca cuida do ciclo de vida do player.',
    },
    trick: {
      en: "scroll is driven entirely by *motion's scroll hooks*, scoped per-section. one progress value feeds the parallax y-offsets, opacity reveals, image-width compression, and the sticky author-rail drift — all on `transform` and `opacity` so the work stays on the GPU compositor. parallax thumbnail positions are deterministic and memoized across scroll ticks.",
      pt: 'o scroll é todo comandado pelos *hooks de scroll do motion*, com escopo por seção. um único valor de progresso alimenta os deslocamentos de parallax, as revelações por opacidade, a compressão de largura das fotos e o deslize vertical da coluna do autor — tudo em `transform` e `opacity` para o trabalho ficar na GPU. as posições dos thumbnails são determinísticas e memoizadas entre frames de scroll.',
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
      pt: 'Peça interativa sobre o Gre-Nal — o clássico histórico de Porto Alegre — feita para a editoria de esportes da GZH.',
    },
    stats: [
      { value: '10', label: { en: 'rounds', pt: 'rodadas' } },
      { value: '56', label: { en: 'cards', pt: 'cartas' } },
      { value: '2', label: { en: 'squads', pt: 'elencos' } },
    ],
    pitch: {
      en: "a *super trunfo card duel* themed around porto alegre's gre-nal — pick a side, play ten rounds against the house, watch a podium decide it.",
      pt: 'um *duelo de super trunfo* no clima do gre-nal — escolha um lado, dispute dez rodadas contra a máquina e deixe o pódio decidir o resultado.',
    },
    whatShipped: {
      en: 'a single-route react + vite spa with emotion styling. game progression is a *client-side state machine* (intro → rules → team picker → 10 × {draw → stat-pick → result} → podium) with no URL transitions. all roster data, player stats, and matchup logic ship as static assets — 56 athlete portraits, four stat icons, podium illustrations.',
      pt: 'spa react + vite de rota única com emotion. a progressão do jogo é uma *máquina de estados no cliente* (intro → regras → escolha de time → 10 × {saca → escolhe atributo → resultado} → pódio), sem trocar de URL. todos os dados de elenco, atributos e a lógica de confronto vão como assets estáticos — 56 retratos, quatro ícones de atributo e as ilustrações de pódio.',
    },
    trick: {
      en: 'the *gangorra* — a score-delta momentum visualization — swaps between three pre-baked webp illustrations via framer motion easing. card-flip reveals are choreographed in *two sequential phases*: opponent card reveal first, then stat-row highlight on the winning attribute — producing a TV-style result read rather than a single-frame cut. a portrait-orientation gate enforces vertical layout.',
      pt: 'a *gangorra* — uma visualização do momentum em cima da diferença de pontos — alterna entre três webps pré-renderizados com easing do framer motion. e as viradas de carta são coreografadas em *duas fases sequenciais*: primeiro a carta do adversário é virada, depois o atributo vencedor é destacado na linha — uma leitura no ritmo da televisão, não um corte seco. no celular, uma trava de orientação retrato segura o layout no vertical.',
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
      pt: 'Landing page de vendas do Política Essencial, curso online brasileiro que ensina os fundamentos da política do zero, em mais de 50 horas de vídeo-aulas ministradas por 17 comunicadores de redes sociais. Um funil de conversão puro — sem login, sem carrinho, sem área de pagamento; o checkout fica no Hotmart.',
    },
    stats: [
      { value: '50+ hrs', label: { en: 'course content', pt: 'conteúdo do curso' } },
      { value: '17', label: { en: 'communicators', pt: 'comunicadores' } },
      { value: '1', label: { en: 'LP funnel', pt: 'funil único' } },
    ],
    pitch: {
      en: "an *in-page sales funnel* for a 50+ hour political-fundamentals course — hotmart's checkout opens inside a modal so readers never leave, and each communicator's referral link rewrites the hero around them.",
      pt: 'um *funil de vendas em uma página só* para um curso de 50+ horas de fundamentos da política — o checkout do hotmart abre num modal, o leitor nunca precisa sair da página, e o link próprio de cada comunicador reescreve a hero em torno dele.',
    },
    whatShipped: {
      en: 'a react + vite spa on cloudflare pages, styled with tailwind v4. the entire scrapbook visual language — paper textures, washi tape, torn edges, layered shadows, hand-cut portrait cutouts — is composed from a small toolkit of utility primitives, so each section reads like a different page of a physical zine. checkout, professor data, and copy all live in-repo as static assets — no CMS, no auth, no backend.',
      pt: 'spa react + vite no cloudflare pages, com tailwind v4. toda a linguagem visual de scrapbook — texturas de papel, fitas washi, bordas rasgadas, sombras em camadas, retratos recortados à mão — é montada em cima de um kit enxuto de utilitários, e cada seção acaba lembrando uma página diferente de uma fanzine de papel. checkout, dados dos professores e copy ficam todos no próprio repo como assets estáticos — sem CMS, sem login, sem backend.',
    },
    trick: {
      en: "the whole funnel is *one page*: clicking any CTA opens hotmart's checkout *inside an in-page modal* — readers never leave the domain, so the context-switch that usually kills conversion is gone. every personalized communicator link (`?ref=<slug>`) rearranges the hero so that professor becomes the *centerpiece* with the other 16 orbiting them, auto-applies their coupon, and forwards their slug to hotmart's producer analytics so commissions split cleanly. result: a near-perfect *core web vitals* score (97% good LCP, 640 ms page load) and *1.3k visitors in two weeks* on pure SEO — the page hadn't even been posted to social yet.",
      pt: 'o funil inteiro vive em *uma página só*: clicar em qualquer CTA abre o checkout do hotmart *num modal por cima da página* — o leitor não sai do domínio em nenhum momento, então a troca de contexto que costuma matar conversão deixa de existir. e cada link personalizado de comunicador (`?ref=<slug>`) reorganiza a hero para colocar aquele professor no *centro*, com os outros 16 orbitando em volta, aplica o cupom dele automaticamente e ainda manda o slug para o analytics de produtor do hotmart — a comissão se divide certinho. o resultado: *core web vitals* quase perfeitos (97% de LCP bom, 640 ms de carregamento) e *1,3 mil visitantes em duas semanas* só por SEO — a página ainda nem tinha sido posta nas redes sociais.',
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
      pt: 'Retrospectiva fotojornalística de fim de ano da Zero Hora — oito fotógrafos do quadro, uma imagem de cada sobre as enchentes de maio de 2024 no Rio Grande do Sul. Galeria editorial comandada pelo scroll, com wordmark fixo e depoimentos em vídeo.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2024', label: { en: 'flood retrospective', pt: 'retrospectiva das enchentes' } },
      { value: 'scroll', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: "*zero hora's 2024 photo retrospective* — eight staff photographers, one image each from the may floods, told as a single first-person record.",
      pt: 'a *retrospectiva fotográfica 2024* da zero hora — oito fotógrafos do quadro, uma foto de cada sobre as enchentes de maio, costuradas num único relato em primeira pessoa.',
    },
    whatShipped: {
      en: 'a vite-built react spa, statically exported and served under `/especiais/fotos-do-ano-2024/`. each section pairs a featured flood photograph, a first-person caption from the photographer, an embedded video testimonial from that same photographer, and a black-and-white portrait headshot. typography in hepta slab via google fonts.',
      pt: 'spa em react + vite, exportada como estática e servida em `/especiais/fotos-do-ano-2024/`. cada seção junta uma foto-destaque das enchentes, uma legenda em primeira pessoa do fotógrafo, um depoimento em vídeo do próprio e um retrato em preto-e-branco. tipografia em hepta slab via google fonts.',
    },
    trick: {
      en: "the *scroll-driven sticky wordmark* — 'ZEROHORA — fotos do ano 2024' — stays fixed over the hero, tracks scroll position, fades, repositions to each photographer panel's top-right kicker, and *switches color from peach to white* as dark-background photo panels slide underneath. the layout alternates full-bleed photographic panels with peach narrative panels to pace the disaster narrative.",
      pt: "o *wordmark fixo, comandado pelo scroll* — 'ZEROHORA — fotos do ano 2024' — fica preso sobre a hero, acompanha o rolar da página, desbota, se reposiciona no canto superior direito de cada painel de fotógrafo e *muda de cor, de pêssego para branco*, quando passa por cima de painéis de fundo escuro. o layout alterna painéis fotográficos sangrando até a borda com painéis narrativos em pêssego, dando o ritmo da narrativa do desastre.",
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
