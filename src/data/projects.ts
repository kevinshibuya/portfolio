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
      mobile: '/images/projects/painel-da-reconstrucao/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/painel-da-reconstrucao/desktop/01-dados-gerais.png',
        mobile: '/images/projects/painel-da-reconstrucao/mobile/01-dados-gerais.png',
        route: '/dados-gerais',
      },
      {
        desktop: '/images/projects/painel-da-reconstrucao/desktop/02-caminho-dinheiro.png',
        mobile: '/images/projects/painel-da-reconstrucao/mobile/02-caminho-dinheiro.png',
        route: '/caminho-dinheiro',
      },
      {
        desktop: '/images/projects/painel-da-reconstrucao/desktop/03-estradas-afetadas.png',
        mobile: '/images/projects/painel-da-reconstrucao/mobile/03-estradas-afetadas.png',
        route: '/estradas-afetadas',
      },
    ],
    routes: [
      { path: '/dados-gerais', label: 'Dados gerais' },
      { path: '/caminho-dinheiro', label: 'Caminho do dinheiro' },
      { path: '/estradas-afetadas', label: 'Estradas afetadas' },
      { path: '/infraestrutura', label: 'Infraestrutura' },
      { path: '/moradias', label: 'Moradias' },
      { path: '/hospitais', label: 'Hospitais' },
      { path: '/escolas-publicas', label: 'Escolas públicas' },
      { path: '/ajudas-sociais', label: 'Ajudas sociais' },
      { path: '/auxilios-cidadao', label: 'Auxílios ao cidadão' },
      { path: '/empresas-beneficios', label: 'Empresas e benefícios' },
      { path: '/credito-setor-produtivo', label: 'Crédito ao setor produtivo' },
      { path: '/aeroporto-salgado-filho', label: 'Aeroporto Salgado Filho' },
      { path: '/impacto-voos', label: 'Impacto nos voos' },
      { path: '/acoes-contencao-e-prevencao', label: 'Ações de contenção e prevenção' },
      { path: '/estado-recursos', label: 'Recursos do estado' },
      { path: '/entenda-medidas', label: 'Entenda as medidas' },
      { path: '/entenda-termos', label: 'Entenda os termos' },
      { path: '/como-funciona', label: 'Como funciona' },
      { path: '/leia-mais', label: 'Leia mais' },
    ],
    story: [
      {
        type: 'paragraph',
        text: {
          en: 'A long-running data dashboard for **GZH** (Grupo RBS, Rio Grande do Sul\'s largest news outlet) tracking every public and private real spent on reconstruction after the May 2024 floods that displaced hundreds of thousands of people across the state. Published as part of GZH\'s *especiais* editorial section under the "Pra Cima, RS" reconstruction coverage.',
          pt: 'Um dashboard de longa duração para a **GZH** (Grupo RBS, maior veículo do Rio Grande do Sul) acompanhando cada real público e privado investido na reconstrução após as enchentes de maio de 2024 que deslocaram centenas de milhares de pessoas no estado. Publicado na seção *especiais* da GZH sob a cobertura "Pra Cima, RS".',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The project is a Next.js 14 App Router build that ships as a fully static export. It pulls a single denormalized JSON dataset (refreshed periodically by the newsroom) and recomputes its summary tables, segment breakdowns, and per-government cuts on the client through memoized selectors — so adding a new view is a routing-and-charting exercise rather than a backend change.',
          pt: 'O projeto é um build Next.js 14 (App Router) que faz deploy como export estático completo. Ele consome um único dataset JSON desnormalizado (atualizado periodicamente pela redação) e recalcula tabelas de resumo, breakdowns por segmento e cortes por esfera de governo no cliente, com selectors memoizados — então adicionar uma nova view é exercício de roteamento e gráficos, não mudança de backend.',
        },
      },
      {
        type: 'figure-pair',
        left: {
          src: '/images/projects/painel-da-reconstrucao/desktop/01-dados-gerais.png',
          alt: { en: 'Dados gerais — desktop', pt: 'Dados gerais — desktop' },
          caption: { en: '/dados-gerais — desktop', pt: '/dados-gerais — desktop' },
        },
        right: {
          src: '/images/projects/painel-da-reconstrucao/mobile/01-dados-gerais.png',
          alt: { en: 'Dados gerais — mobile', pt: 'Dados gerais — mobile' },
          caption: { en: '/dados-gerais — mobile', pt: '/dados-gerais — mobile' },
        },
      },
      {
        type: 'pullquote',
        text: {
          en: 'The interesting design pressure is keeping a heavy data product fast and legible inside a brand frame that has to match the rest of GZH.',
          pt: 'A pressão de design interessante é manter um produto pesado de dados rápido e legível dentro de uma identidade que precisa combinar com o resto da GZH.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'There are 19 dedicated routes covering dimensions like infrastructure, housing, hospitals, schools, social aid, citizen aid, the Salgado Filho airport, road blockages, and flight impact — each with its own charting strategy across Highcharts, ApexCharts, Chart.js, and a Leaflet map of state and federal road closures.',
          pt: 'São 19 rotas dedicadas cobrindo dimensões como infraestrutura, moradia, hospitais, escolas, ajuda social, auxílio ao cidadão, o aeroporto Salgado Filho, bloqueios em estradas e impacto nos voos — cada uma com sua própria estratégia de visualização entre Highcharts, ApexCharts, Chart.js e um mapa Leaflet de bloqueios em estradas estaduais e federais.',
        },
      },
    ],
  },
  {
    id: 'enquetes-gzh',
    slug: 'enquetes-gzh',
    title: { en: 'enquetes gzh', pt: 'enquetes gzh' },
    year: 2026,
    highlight: true,
    highlightOrder: 4,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #C8D8F0, #8AAADA)',
    tagline: {
      en: 'realtime polls, two apps, one firestore',
      pt: 'enquetes em tempo real, dois apps, um firestore',
    },
    description: {
      en: 'Poll/survey system for GZH: a backoffice for the newsroom and an embed widget journalists drop into articles, sharing one Firestore backend.',
      pt: 'Sistema de enquetes para a GZH: um backoffice para a redação e um widget embed que jornalistas inserem em artigos, com backend único no Firestore.',
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
      mobile: '/images/projects/enquetes-gzh/mockups/mobile.webp',
    },
    images: [],
    story: [
      {
        type: 'paragraph',
        text: {
          en: 'A poll/survey system built for **Gauchazh (GZH)**, the digital newsroom of Grupo RBS. Two React apps share a single Firestore backend: a backoffice where the newsroom creates and manages polls, and a public embed widget journalists drop into articles via the GZH iframe loader.',
          pt: 'Sistema de enquetes construído para a **Gauchazh (GZH)**, redação digital do Grupo RBS. Dois apps React compartilham um único backend Firestore: um backoffice para a redação criar e gerenciar enquetes, e um widget embed público que jornalistas inserem em artigos pelo loader de iframe da GZH.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The interesting part was the vote-storage model: instead of counting docs in a subcollection at read time, each survey carries a *voteCounts* map and a *totalVotes* counter that get bumped via a Firestore atomic increment together with the per-device write. That\'s what made the live progress bars cheap enough to drive from a public-facing widget without a server in front of Firestore.',
          pt: 'A parte interessante foi o modelo de armazenamento dos votos: em vez de contar docs em subcoleção na leitura, cada survey carrega um mapa *voteCounts* e um contador *totalVotes* que são incrementados de forma atômica pelo Firestore junto com o registro por dispositivo. Foi o que tornou as barras de progresso ao vivo baratas o suficiente para um widget público sem servidor na frente do Firestore.',
        },
      },
    ],
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
    projectType: 'shipped',
    coverImage: '/images/projects/ia-na-redacao/desktop/01-landing.png',
    mockups: {
      desktop: '/images/projects/ia-na-redacao/mockups/desktop.webp',
      mobile: '/images/projects/ia-na-redacao/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/ia-na-redacao/desktop/01-landing.png',
        mobile: '/images/projects/ia-na-redacao/mobile/01-landing.png',
        route: '/',
      },
      {
        desktop: '/images/projects/ia-na-redacao/desktop/02-videos.png',
        mobile: '/images/projects/ia-na-redacao/mobile/02-videos.png',
        route: '/#course',
      },
      {
        desktop: '/images/projects/ia-na-redacao/desktop/03-articles.png',
        mobile: '/images/projects/ia-na-redacao/mobile/03-articles.png',
        route: '/#course',
      },
    ],
    story: [
      {
        type: 'paragraph',
        text: {
          en: 'A special-feature page for **Grupo RBS / GZH** introducing how AI is being used inside their newsrooms. The site collects short video testimonials from journalists who use AI day-to-day — cleaning audio, generating captions, adapting TV reports for digital, drafting headlines, summarizing long documents — alongside opinion articles and the company\'s editorial guidelines for AI use.',
          pt: 'Página especial do **Grupo RBS / GZH** apresentando como a IA está sendo usada dentro das redações. O site reúne depoimentos em vídeo de jornalistas que usam IA no dia a dia — limpando áudio, gerando legendas, adaptando reportagens de TV para o digital, redigindo títulos, resumindo documentos longos — ao lado de artigos de opinião e das diretrizes editoriais da empresa para o uso de IA.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The codebase is a JSON-driven React + Vite SPA. Course copy, the seven video entries (title, author, category, tags, duration), and the four long-form articles with structured paragraph/quote blocks all live in a single `course-content.json` file that the built bundle fetches at runtime. There is no backend — the site is purely static, with `.mp4` videos and `.webp` thumbnails served from `assets/`. Updating the page is editing one JSON file.',
          pt: 'A base de código é uma SPA React + Vite movida por JSON. Os textos do curso, os sete vídeos (título, autor, categoria, tags, duração) e os quatro artigos longos com blocos estruturados de parágrafo/citação ficam todos em um único `course-content.json` que o bundle busca em runtime. Não há backend — o site é totalmente estático, com vídeos `.mp4` e thumbnails `.webp` servidos de `assets/`. Atualizar a página é editar um arquivo JSON.',
        },
      },
      {
        type: 'figure-pair',
        left: {
          src: '/images/projects/ia-na-redacao/desktop/02-videos.png',
          alt: { en: 'Course view — videos', pt: 'Visualização do curso — vídeos' },
          caption: { en: 'course view — desktop', pt: 'visualização do curso — desktop' },
        },
        right: {
          src: '/images/projects/ia-na-redacao/mobile/02-videos.png',
          alt: { en: 'Course view — mobile', pt: 'Visualização do curso — mobile' },
          caption: { en: 'course view — mobile', pt: 'visualização do curso — mobile' },
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The pattern that makes this work as a publishing surface is the *JSON-as-CMS* split — code ships once, editors push content updates without touching the bundle. The article schema is also worth noting: each article is a list of typed blocks (`paragraph`, `quote`) rather than a blob of HTML, which keeps the rendered layout consistent across pieces and lets editors mark pull-quotes structurally instead of styling them inline.',
          pt: 'O padrão que faz isto funcionar como superfície de publicação é a separação *JSON-como-CMS* — o código sobe uma vez, os editores publicam atualizações de conteúdo sem tocar no bundle. Vale destacar o schema dos artigos: cada artigo é uma lista de blocos tipados (`paragraph`, `quote`) em vez de um bloco de HTML, o que mantém o layout consistente entre as peças e deixa os editores marcarem citações em destaque de forma estrutural em vez de estilizá-las inline.',
        },
      },
    ],
  },
  {
    id: 'fotos-do-ano-2025',
    slug: 'fotos-do-ano-2025',
    title: { en: 'fotos do ano 2025', pt: 'fotos do ano 2025' },
    year: 2025,
    highlight: true,
    highlightOrder: 2,
    size: 'md',
    gradient: 'linear-gradient(145deg, #F4F8FE, #A2D2FF)',
    tagline: {
      en: 'a photo retrospective for the year',
      pt: 'a retrospectiva fotográfica do ano',
    },
    description: {
      en: 'Year-end photo retrospective for GZH — a curated longform of the most striking images of 2025, presented as an immersive scroll experience.',
      pt: 'Retrospectiva fotográfica de fim de ano para a GZH — um longform curado com as imagens mais marcantes de 2025, em uma experiência de scroll imersiva.',
    },
    techStack: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/fotos-do-ano-2025/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/fotos-do-ano-2025/mockups/desktop.webp',
      mobile: '/images/projects/fotos-do-ano-2025/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/fotos-do-ano-2025/desktop/01-hero.png',
        mobile: '/images/projects/fotos-do-ano-2025/mobile/01-hero.png',
        route: '/',
      },
      {
        desktop: '/images/projects/fotos-do-ano-2025/desktop/03-photographer-feature.png',
        mobile: '/images/projects/fotos-do-ano-2025/mobile/03-photographer-feature.png',
        route: '/#photographer',
      },
      {
        desktop: '/images/projects/fotos-do-ano-2025/desktop/04-parallax-gallery.png',
        mobile: '/images/projects/fotos-do-ano-2025/mobile/04-parallax-gallery.png',
        route: '/#gallery',
      },
    ],
    story: [
      {
        type: 'paragraph',
        text: {
          en: 'A long-form, scroll-driven editorial gallery built for **Zero Hora**\'s year-end photojournalism retrospective. Eight GZH photographers each get a dedicated section featuring a headline image, an embedded video testimonial, and a parallax-scattered grid of supporting photos. The page deploys under `/especiais/fotos-do-ano-2025/` as part of the publication\'s *especiais* subpath.',
          pt: 'Uma galeria editorial longa, guiada por scroll, construída para a retrospectiva de fim de ano de fotojornalismo da **Zero Hora**. Oito fotógrafos da GZH ganham uma seção dedicada com uma imagem-título, um depoimento em vídeo e uma grid de fotos de apoio espalhada com parallax. A página é publicada em `/especiais/fotos-do-ano-2025/` dentro da subpasta *especiais* da publicação.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The site is a single Vite + React app with no backend — every section reads from inline data and renders out of `public/assets/`. The interesting surface is the scroll choreography: each section uses Framer Motion\'s `useScroll` against a per-section ref and maps progress through `useTransform` to drive parallax depth, gradient reveals, image carousels, and a vignette-to-text title transition over the hero. Per-section squares are positioned via a deterministic generator (two columns, even vertical spacing, fixed speed multipliers) so layouts stay stable across renders while still feeling hand-placed.',
          pt: 'O site é um único app Vite + React sem backend — cada seção lê dados inline e renderiza a partir de `public/assets/`. A parte interessante é a coreografia de scroll: cada seção usa `useScroll` do Framer Motion contra uma ref própria e mapeia o progresso por `useTransform` para conduzir profundidade de parallax, revelações de gradiente, carrosséis de imagens e a transição vinheta-para-título sobre o hero. As placas de cada seção são posicionadas por um gerador determinístico (duas colunas, espaçamento vertical uniforme, multiplicadores de velocidade fixos) para que os layouts fiquem estáveis entre renders e ainda assim pareçam feitos à mão.',
        },
      },
      {
        type: 'figure',
        src: '/images/projects/fotos-do-ano-2025/desktop/04-parallax-gallery.png',
        alt: { en: 'Parallax photo grid', pt: 'Grid de fotos com parallax' },
        caption: { en: 'a per-photographer parallax grid', pt: 'um grid de parallax por fotógrafo' },
        width: 'wide',
      },
      {
        type: 'pullquote',
        text: {
          en: 'Motion\'s reduced-motion-aware animations keep the GPU on transforms and opacity only.',
          pt: 'As animações conscientes de reduced-motion mantêm a GPU restrita a transforms e opacidade.',
        },
      },
    ],
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
    techStack: ['React', 'TypeScript', 'D3.js'],
    projectType: 'shipped',
    coverImage: '/images/projects/peleia-gre-nal/desktop/01-intro.png',
    mockups: {
      desktop: '/images/projects/peleia-gre-nal/mockups/desktop.webp',
      mobile: '/images/projects/peleia-gre-nal/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/peleia-gre-nal/desktop/01-intro.png',
        mobile: '/images/projects/peleia-gre-nal/mobile/01-intro.png',
        route: 'intro',
      },
      {
        desktop: '/images/projects/peleia-gre-nal/desktop/03-team-pick.png',
        mobile: '/images/projects/peleia-gre-nal/mobile/03-team-pick.png',
        route: 'team picker',
      },
      {
        desktop: '/images/projects/peleia-gre-nal/desktop/04-combat.png',
        mobile: '/images/projects/peleia-gre-nal/mobile/04-combat.png',
        route: 'combat',
      },
    ],
    story: [
      {
        type: 'paragraph',
        text: {
          en: '**Peleia Gre-Nal** is a browser card game embedded inside Grupo RBS\' Gaúcha ZH portal. It is a simplified *Super Trunfo* (Top Trumps) duel between Grêmio and Internacional squads, where the reader picks a club, draws a player card, and chooses one stat — height, age, Gre-Nais played, Gre-Nais won — to face off against a "GZH" opponent across ten rounds.',
          pt: 'O **Peleia Gre-Nal** é um card game de navegador embarcado no portal Gaúcha ZH do Grupo RBS. É um duelo simplificado de *Super Trunfo* entre os elencos do Grêmio e do Internacional: o leitor escolhe um clube, saca uma carta de jogador e escolhe um atributo — altura, idade, Gre-Nais jogados, Gre-Nais vencidos — para enfrentar um oponente "GZH" ao longo de dez rodadas.',
        },
      },
      {
        type: 'figure-pair',
        left: {
          src: '/images/projects/peleia-gre-nal/desktop/03-team-pick.png',
          alt: { en: 'Team picker', pt: 'Seleção de time' },
          caption: { en: 'team picker — desktop', pt: 'seleção de time — desktop' },
        },
        right: {
          src: '/images/projects/peleia-gre-nal/desktop/04-combat.png',
          alt: { en: 'Combat round', pt: 'Rodada de combate' },
          caption: { en: 'combat round — desktop', pt: 'rodada de combate — desktop' },
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The interactive is a single-page React application built with Vite. The flow is a small state machine — intro → rules → team picker → ten alternating combat rounds → final result — animated with Framer Motion for the card flips and the *gangorra* (seesaw) momentum indicator that tilts toward whichever side is ahead. Player data ships as static assets: 56 athlete portraits in `assets/athletes/`, country flags, and stat icons. The game is purely client-side; there is no backend.',
          pt: 'A peça é uma aplicação React de página única feita com Vite. O fluxo é uma pequena máquina de estado — intro → regras → seleção de time → dez rodadas de combate alternadas → resultado final — animada com Framer Motion para as viradas das cartas e para a *gangorra* de momentum que pende para o lado que está à frente. Os dados dos jogadores vêm como assets estáticos: 56 retratos de atletas em `assets/athletes/`, bandeiras de países e ícones de atributos. O jogo é puramente client-side; não há backend.',
        },
      },
    ],
  },
  {
    id: 'linha-do-tempo-covid',
    slug: 'linha-do-tempo-covid',
    title: { en: 'linha do tempo covid', pt: 'linha do tempo covid' },
    year: 2025,
    highlight: false,
    highlightOrder: 99,
    gradient: 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
    tagline: {
      en: 'five years of the pandemic, told year by year',
      pt: 'cinco anos da pandemia, contados ano a ano',
    },
    description: {
      en: 'Interactive feature for Gaúcha ZH marking five years since the start of the COVID-19 pandemic — seven full-height tiles (2019–2025) that collapse into a per-year chronological timeline.',
      pt: 'Especial interativo da Gaúcha ZH marcando cinco anos do início da pandemia de COVID-19 — sete blocos de altura total (2019–2025) que colapsam em uma linha do tempo cronológica por ano.',
    },
    techStack: ['React 18', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/linha-do-tempo-covid/desktop/01-home.png',
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/linha-do-tempo-covid/desktop/01-home.png',
        mobile: '/images/projects/linha-do-tempo-covid/mobile/01-home.png',
        route: 'home',
      },
      {
        desktop: '/images/projects/linha-do-tempo-covid/desktop/03-2021-timeline.png',
        mobile: '/images/projects/linha-do-tempo-covid/mobile/03-2021-timeline.png',
        route: 'timeline',
      },
    ],
    story: [
      {
        type: 'paragraph',
        text: {
          en: 'A single-page interactive feature for **Gaúcha ZH** marking five years since the start of the COVID-19 pandemic. The landing screen is split into seven full-height vertical tiles, one per year from 2019 to 2025, each backed by a black-and-white photo from RBS / AFP archives. Clicking a tile collapses the strip to a thin selector and reveals a chronological timeline of milestones for that year — first WHO notice, first Brazilian case, vaccination rollout, end of the global health emergency.',
          pt: 'Especial interativo de página única para a **Gaúcha ZH** marcando cinco anos do início da pandemia de COVID-19. A tela inicial é dividida em sete blocos verticais de altura total, um por ano de 2019 a 2025, cada um apoiado por uma foto em preto e branco dos arquivos da RBS / AFP. Clicar em um bloco colapsa a faixa em um seletor fino e revela uma linha do tempo cronológica dos marcos daquele ano — primeira nota da OMS, primeiro caso no Brasil, vacinação, fim da emergência sanitária global.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The year strip is a flex row whose children grow on hover (`flex: 1.5` on the active tile, `0.9` on the others) and animate to a compact 80px-tall selector once a year is picked, with an `AnimatePresence` swap between timeline panels. The timeline panel itself is data-driven: a single `Record<string, TimelineEvent[]>` describes every date, paragraph, and image — editing the story is editing the array.',
          pt: 'A faixa de anos é um flex row cujos filhos crescem no hover (`flex: 1.5` no bloco ativo, `0.9` nos demais) e animam até um seletor compacto de 80px de altura quando um ano é selecionado, com uma troca por `AnimatePresence` entre painéis. O painel em si é guiado por dados: um único `Record<string, TimelineEvent[]>` descreve cada data, parágrafo e imagem — editar a história é editar o array.',
        },
      },
    ],
  },
  {
    id: 'hotmart-bunde',
    slug: 'hotmart-bunde',
    title: { en: 'política essencial', pt: 'política essencial' },
    year: 2026,
    highlight: true,
    highlightOrder: 1,
    size: 'lg',
    gradient: 'linear-gradient(145deg, #FFE5D9, #F4A582)',
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
    techStack: ['React 18', 'TypeScript', 'Vite 6', 'TailwindCSS v4', 'Framer Motion', 'Lenis', 'Cloudflare Pages'],
    projectType: 'shipped',
    liveUrl: 'https://politicaessencial.com',
    coverImage: '/images/projects/hotmart-bunde/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/hotmart-bunde/mockups/desktop.webp',
      mobile: '/images/projects/hotmart-bunde/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/hotmart-bunde/desktop/01-hero.png',
        mobile: '/images/projects/hotmart-bunde/mobile/01-hero.png',
        route: 'hero',
      },
      {
        desktop: '/images/projects/hotmart-bunde/desktop/02-modulos.png',
        mobile: '/images/projects/hotmart-bunde/mobile/03-modulos.png',
        route: 'módulos',
      },
      {
        desktop: '/images/projects/hotmart-bunde/desktop/03-sobre.png',
        mobile: '/images/projects/hotmart-bunde/mobile/02-sobre.png',
        route: 'sobre',
      },
    ],
    story: [
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "A sales landing page for **Política Essencial**, a Brazilian online course teaching political fundamentals from zero through 50+ hours of video lessons taught by a roster of 17 social-media communicators. The page is the sole funnel: a visitor arrives, reads the pitch, scrolls through course modules and FAQ, and clicks through to Hotmart for checkout. The course itself is hosted on Hotmart, so the landing carries no auth, no cart, no payment surface — pure conversion copy and brand presentation. Live at [politicaessencial.com](https://politicaessencial.com).",
          pt: 'Landing page de vendas do **Política Essencial**, curso online brasileiro que ensina fundamentos políticos do zero em 50+ horas de vídeo-aulas conduzidas por 17 comunicadores de redes sociais. A página é o funil único: o visitante chega, lê a oferta, navega pelos módulos e FAQ, e clica para o checkout no Hotmart. O curso fica hospedado no Hotmart, então a landing não tem auth, carrinho, ou área de pagamento — é puramente cópia de conversão e apresentação de marca. No ar em [politicaessencial.com](https://politicaessencial.com).',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The codebase is a single-page React 18 + TypeScript SPA built with **Vite 6** and styled with **TailwindCSS v4**. The visual identity is a custom scrapbook/collage system — paper textures, torn-edge dividers, washi-tape strips, photo cutouts, brush-stroke backgrounds, and a layered shadow vocabulary — all expressed as reusable Tailwind utility classes (`.paper-texture`, `.washi-tape-*`, `.torn-edge-*`, `.scrapbook-shadow`) and a small set of primitive components (`PaperCard`, `WashiTape`, `TornPaperSection`, `PhotoCutout`). Smooth scrolling runs through Lenis; section transitions and scroll reveals use Motion (Framer Motion). Deployed to Cloudflare Pages via Wrangler.',
          pt: 'A base de código é uma SPA React 18 + TypeScript com **Vite 6** e **TailwindCSS v4**. A identidade visual é um sistema de scrapbook/colagem feito sob medida — texturas de papel, divisores rasgados, fitas washi, recortes fotográficos, fundos de pincelada e um vocabulário de sombras em camadas — expressos como classes utilitárias do Tailwind (`.paper-texture`, `.washi-tape-*`, `.torn-edge-*`, `.scrapbook-shadow`) e um pequeno conjunto de primitivos (`PaperCard`, `WashiTape`, `TornPaperSection`, `PhotoCutout`). Scroll suave via Lenis; transições e revelações via Motion (Framer Motion). Deploy em Cloudflare Pages via Wrangler.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: 'The notable piece is the hero professor-circles section: 17 instructor portraits orbit a centerpiece, with per-regime manual position overrides in `src/components/hero/professorOverrides.ts` and a `?edit=1` URL flag that turns the layout into an in-browser tuning mode for dragging circles into place. Edge wrinkles on paper elements are generated procedurally via a `wrinkledClipPath` utility plus a `useWrinkledEdges` hook, so each card\'s torn edge is unique. SEO is heavy and intentional — the document head ships *Organization*, *WebSite*, *WebPage*, *Course* (with `Offer` price and `CourseInstance` workload), and *FAQPage* JSON-LD blocks plus full Open Graph and Twitter Card metadata in pt-BR.',
          pt: 'O detalhe notável é a seção hero dos círculos de professores: 17 retratos orbitando um centro, com posições manualmente sobrescritas por regime de breakpoint em `src/components/hero/professorOverrides.ts` e uma flag `?edit=1` na URL que transforma o layout em modo de ajuste no navegador, permitindo arrastar os círculos para a posição desejada. As bordas enrugadas dos elementos de papel são geradas proceduralmente via utility `wrinkledClipPath` e hook `useWrinkledEdges`, fazendo cada borda rasgada ser única. SEO é denso e intencional: a head inclui blocos JSON-LD de *Organization*, *WebSite*, *WebPage*, *Course* (com `Offer` de preço e `CourseInstance`), e *FAQPage*, mais Open Graph e Twitter Card completos em pt-BR.',
        },
      },
    ],
  },
  {
    id: 'fotos-do-ano-2024',
    slug: 'fotos-do-ano-2024',
    title: { en: 'fotos do ano 2024', pt: 'fotos do ano 2024' },
    year: 2024,
    highlight: true,
    highlightOrder: 5,
    size: 'sm',
    gradient: 'linear-gradient(145deg, #FFD9C5, #E89B7A)',
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
    techStack: ['React', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/fotos-do-ano-2024/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/fotos-do-ano-2024/mockups/desktop.webp',
      mobile: '/images/projects/fotos-do-ano-2024/mockups/mobile.webp',
    },
    images: [],
    screenshots: [
      {
        desktop: '/images/projects/fotos-do-ano-2024/desktop/01-hero.png',
        mobile: '/images/projects/fotos-do-ano-2024/mobile/01-hero.png',
        route: 'hero',
      },
      {
        desktop: '/images/projects/fotos-do-ano-2024/desktop/02-photographer-section.png',
        mobile: '/images/projects/fotos-do-ano-2024/mobile/02-photographer-section.png',
        route: 'photographer',
      },
      {
        desktop: '/images/projects/fotos-do-ano-2024/desktop/03-beira-rio-aerial.png',
        mobile: '/images/projects/fotos-do-ano-2024/mobile/03-beira-rio-aerial.png',
        route: 'beira-rio',
      },
    ],
    story: [
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "A scroll-driven editorial gallery shipped as **Zero Hora**'s year-end 2024 photojournalism retrospective. Readers land on a peach-pink gradient cover bearing the 'ZEROHORA — Fotos do ano 2024' wordmark, scroll through an intro by editor Ivan Pacheco, and into eight photographer sections — Mateus Bruxel, André Ávila, Duda Fortes, Jeff Botega, Renan Mattos, Ronaldo Bernardi, Camila Hermes, and Jonathan Heckler. Each photographer contributes one image from the May 2024 Rio Grande do Sul floods, making the page a collective first-person record of the disaster across eight viewpoints.",
          pt: 'Galeria editorial guiada por scroll, lançada como retrospectiva fotojornalística de fim de ano da **Zero Hora** em 2024. O leitor entra por uma capa em gradiente pêssego com o wordmark "ZEROHORA — Fotos do ano 2024", passa por uma introdução do editor Ivan Pacheco, e desce por oito seções de fotógrafos — Mateus Bruxel, André Ávila, Duda Fortes, Jeff Botega, Renan Mattos, Ronaldo Bernardi, Camila Hermes, e Jonathan Heckler. Cada fotógrafo contribui com uma imagem das enchentes de maio de 2024 no Rio Grande do Sul, tornando a página um registro coletivo em primeira pessoa do desastre por oito ângulos.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: 'The deployed bundle is a Vite-built React SPA, statically exported and served under `/especiais/fotos-do-ano-2024/`. Each section pairs a featured flood photograph, a short first-person caption, an embedded HTML5 `<video>` testimonial pointing directly at `assets/<Photographer>.mp4`, and a black-and-white portrait headshot. Award badge PNGs (`selo_ari.png`, `selo_apa.png`) are composited over specific photos via absolute positioning. Typography is Hepta Slab via Google Fonts; analytics run through Google Tag Manager.',
          pt: 'O bundle no ar é uma SPA React feita com Vite, com export estático sob `/especiais/fotos-do-ano-2024/`. Cada seção combina uma foto de destaque das enchentes, uma legenda curta em primeira pessoa, um depoimento em vídeo `<video>` HTML5 apontando direto para `assets/<Photographer>.mp4`, e um retrato em preto e branco. Selos de prêmios (`selo_ari.png`, `selo_apa.png`) são compostos sobre fotos específicas via posicionamento absoluto. Tipografia em Hepta Slab via Google Fonts; analytics via Google Tag Manager.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "The defining piece is the scroll-driven sticky wordmark: 'ZEROHORA — Fotos do ano 2024' stays fixed over the hero, tracks scroll position, fades, repositions to each photographer panel's top-right kicker, and switches color from peach to white as dark-background photo panels slide underneath. The layout alternates full-bleed photographic panels with peach narrative panels containing first-person bios, portrait headshots, and inline video players — a rhythm that paces the disaster narrative without overwhelming it.",
          pt: 'A peça central é o wordmark fixo guiado por scroll: "ZEROHORA — Fotos do ano 2024" se mantém preso sobre o hero, acompanha o scroll, esmaece, reposiciona-se para o canto superior direito de cada painel de fotógrafo, e muda de cor de pêssego para branco quando painéis de fundo escuro deslizam por baixo. O layout alterna painéis fotográficos de borda a borda com painéis narrativos pêssego contendo biografias em primeira pessoa, retratos, e players de vídeo inline — um ritmo que dá compasso à narrativa do desastre sem sobrecarregar.',
        },
      },
    ],
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
    if (!p.mockups?.desktop || !p.mockups?.mobile) {
      throw new Error(
        `Project "${p.id}" is a Selected Work highlight but is missing mockups`
      )
    }
  }
}
