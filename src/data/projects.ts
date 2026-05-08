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
      desktopBento: '/images/projects/painel-da-reconstrucao/mockups/desktop-bento.webp',
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
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "A long-running data dashboard for **GZH** (Grupo RBS, Rio Grande do Sul's largest news outlet) tracking every public and private real spent on reconstruction after the May 2024 floods. Headline figures cover **R$ 129 billion** in promised funds, broken down across federal, state, and combined budgets and **19 dedicated routes** — housing, hospitals, public schools, social aid, citizen aid, credit for productive sectors, prevention works, the Salgado Filho airport, flight impact — each with its own charting strategy and a Leaflet map of state and federal road blockages.",
          pt: 'Dashboard de longa duração para a **GZH** (Grupo RBS, maior veículo do Rio Grande do Sul) acompanhando cada real público e privado investido na reconstrução após as enchentes de maio de 2024. Os números de capa cobrem **R$ 129 bilhões** em recursos prometidos, segmentados por orçamentos federal, estadual e combinado em **19 rotas dedicadas** — moradias, hospitais, escolas públicas, ajudas sociais, auxílios ao cidadão, crédito ao setor produtivo, ações de prevenção, o aeroporto Salgado Filho, impacto nos voos — cada uma com sua estratégia de visualização própria, mais um mapa Leaflet de bloqueios em estradas estaduais e federais.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: "The frontend is a **Next.js 14** App Router project in TypeScript built with `output: 'export'` and deployed as static HTML/JS on Azion's edge — no Node runtime. The data layer is a single 488 KB `public/data.json` denormalized by the newsroom and fetched through `useDataFetching` (SWR-backed). UI primitives come from Mantine and NextUI; layout splits between SCSS Modules and Tailwind. Charts span three libraries off the same in-memory dataset — *Highcharts* (gauges, area time-series), *ApexCharts* (stacked bars), *Chart.js* (doughnuts). Apollo Client queries the GZH GraphQL endpoint to pull editorial articles tagged per segment (e.g. `moradias-painel`) into nine routes, paginated via `react-paginate`.",
          pt: 'O frontend é um projeto **Next.js 14** App Router em TypeScript com `output: "export"` e deploy estático na edge da Azion — sem runtime Node. A camada de dados é um único `public/data.json` de 488 KB desnormalizado pela redação e consumido via hook `useDataFetching` (SWR por baixo). Primitivos de UI vêm de Mantine e NextUI; o layout divide entre SCSS Modules e Tailwind. Gráficos passam por três bibliotecas sobre o mesmo dataset em memória — *Highcharts* (gauges, séries temporais em área), *ApexCharts* (barras empilhadas), *Chart.js* (rosquinhas). Apollo Client consulta o GraphQL da GZH para puxar artigos taggeados por segmento (ex. `moradias-painel`) em nove rotas, com paginação via `react-paginate`.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "The pattern that holds it together is the selector layer in `src/lib/utils.ts` — `calculateSumarioData`, `calculateRecursosData`, `calculateSegmentoData` reduce the flat JSON into the per-government, per-segment, and summary shapes each route consumes. Results are cached by `memoizedCalculation`, a `Map`-backed memoization keyed by call site so totals are not recomputed across re-renders. `useDataFetching` exposes those selectors alongside a `currentSegment` filter and a `DEFAULT_ESTADUAL_MANUAL_TOTAL` constant that lets editors hand-correct the state-level total without redeploying the static bundle.",
          pt: 'O padrão que sustenta a peça é a camada de selectors em `src/lib/utils.ts` — `calculateSumarioData`, `calculateRecursosData`, `calculateSegmentoData` reduzem o JSON achatado para os formatos por esfera de governo, por segmento, e de sumário que cada rota consome. Os resultados são cacheados por `memoizedCalculation`, uma memoização ancorada em `Map` chaveada por call site, para que totais não sejam recalculados entre re-renders. `useDataFetching` expõe esses selectors ao lado de um filtro `currentSegment` e da constante `DEFAULT_ESTADUAL_MANUAL_TOTAL`, que permite editores corrigirem manualmente o total estadual sem novo deploy.',
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
    stats: [
      { value: '71', label: { en: 'polls', pt: 'enquetes' } },
      { value: '760K+', label: { en: 'votes', pt: 'votos' } },
      { value: 'realtime', label: { en: 'sync', pt: 'sync' } },
    ],
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
    story: [
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "**Enquetes GZH** is a live-voting system for *Gauchazh (GZH)*, the digital newsroom of Grupo RBS. It ships as two separate apps over a single Firestore backend: a **backoffice** where editors create polls, edit options, end live polls, and copy a CMS-ready embed snippet to the clipboard; and a **public embed widget** where a reader picks an option, confirms their vote, and watches progress bars and percentages update in real time. At capture time the system had **71 published polls** and **760,776 recorded votes**, with top polls in the 33k–144k-vote range.",
          pt: '**Enquetes GZH** é um sistema de votação ao vivo para a *Gauchazh (GZH)*, redação digital do Grupo RBS. Sai como dois apps separados sobre um único backend Firestore: um **backoffice** onde editores criam enquetes, editam opções, encerram votações ao vivo, e copiam um snippet de embed pronto para o CMS; e um **widget de embed público** onde o leitor escolhe uma opção, confirma o voto, e vê barras e percentuais se atualizando em tempo real. Na captura, o sistema tinha **71 enquetes publicadas** e **760.776 votos registrados**, com as enquetes mais populares na faixa de 33k a 144k votos.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: "Both apps are **React 18 + TypeScript + Vite (SWC)**, styled with Tailwind CSS on top of *shadcn/ui* + *Radix UI* primitives. They initialize a single named Firestore database (`db-enquetes-bbb-prd`) and deploy under `gauchazh.clicrbs.com.br/especiais/`. The backoffice authenticates via Firebase Auth Google OAuth popup, domain-locked to `@zerohora.com.br` and `@gruporbs.com.br`. The embed loads a poll by `?poll_id=` query parameter (falling back to the most recent survey) and drives live percentages via a Firestore `onSnapshot` subscription on the survey document — no aggregation at read time.",
          pt: 'Ambos os apps são **React 18 + TypeScript + Vite (SWC)**, estilizados com Tailwind sobre primitivos *shadcn/ui* + *Radix UI*. Os dois inicializam um único banco Firestore nomeado (`db-enquetes-bbb-prd`) e fazem deploy sob `gauchazh.clicrbs.com.br/especiais/`. O backoffice autentica via Firebase Auth Google OAuth popup, restrito a domínios `@zerohora.com.br` e `@gruporbs.com.br`. O embed carrega uma enquete pelo query param `?poll_id=` (com fallback para a survey mais recente) e move percentuais ao vivo via assinatura `onSnapshot` do Firestore no documento — sem agregação na leitura.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "Duplicate-vote detection uses a `localStorage` device ID as the Firestore document ID under `votes/{pollId}/userVotes/{deviceId}`, making the check an O(1) `getDoc` with no server round-trip for repeat visitors. A confirmed vote runs a single `updateDoc` that increments `voteCounts.{optionId}` and `totalVotes` atomically via Firestore `increment()`. Per-category UI theming (green for *Esporte*, yellow/pink for everything else, including distinct pulse keyframes on vote confirmation) is applied through inline styles rather than Tailwind class names — a deliberate workaround for Tailwind's build-time purge of dynamically constructed class strings.",
          pt: 'A detecção de voto duplicado usa um device ID em `localStorage` como ID do documento Firestore sob `votes/{pollId}/userVotes/{deviceId}`, transformando o check em um `getDoc` O(1) sem round-trip ao servidor para visitantes recorrentes. Um voto confirmado dispara um único `updateDoc` que incrementa `voteCounts.{optionId}` e `totalVotes` atomicamente via `increment()` do Firestore. O theming por categoria (verde para *Esporte*, amarelo/rosa para o resto, com keyframes de pulse distintos na confirmação) é aplicado por inline styles em vez de classes Tailwind — workaround deliberado para o purge build-time do Tailwind sobre strings de classe construídas dinamicamente.',
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
      desktopBento: '/images/projects/ia-na-redacao/mockups/desktop-bento.webp',
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
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "An internal **Grupo RBS** resource — accessible only from the company network — where journalists across the newsroom share how they use AI in their daily production work. Past a 'Entrar no Curso' gate, users land on a dashboard with three tabs (VÍDEOS, ARTIGOS, DÚVIDAS): **seven short video testimonials** from named journalists covering audio cleanup, caption generation, TV-to-digital adaptation, radio-bulletin generation, and document summarization with NotebookLM; and **four long-form articles** including RBS's editorial AI guidelines and opinion pieces from the editorial board. Selecting any item opens a course-style player with a sidebar listing all content with per-item progress, a main panel showing the embedded `.mp4` or rendered article body, and `Anterior / Marcar como Concluído / Próximo` navigation.",
          pt: 'Recurso interno do **Grupo RBS** — acessível apenas pela rede da empresa — onde jornalistas de toda a redação compartilham como usam IA no dia a dia. Após uma porta "Entrar no Curso", o usuário cai em um dashboard com três abas (VÍDEOS, ARTIGOS, DÚVIDAS): **sete depoimentos curtos em vídeo** de jornalistas nomeados cobrindo limpeza de áudio, geração de legendas, adaptação de matérias de TV para digital, geração de boletins de rádio, e resumos de documentos com NotebookLM; e **quatro artigos longos** incluindo as diretrizes editoriais de IA da RBS e opiniões do conselho editorial. Selecionar um item abre um player estilo curso com sidebar listando todos os conteúdos com progresso por item, painel principal exibindo o `.mp4` embedado ou o corpo do artigo, e navegação `Anterior / Marcar como Concluído / Próximo`.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: "The codebase is a **React + Vite SPA** deployed as a static build under the `/ia-na-redacao/` subpath on a Grupo RBS internal host. Styling is **Tailwind v4** with a small amount of Emotion CSS-in-JS. There is no backend and no client-side router; view transitions between the dashboard, video player, and article reader are managed entirely through component state (`useState`). All editorial content is served from `data/course-content.json`, fetched once at runtime via `fetch('/ia-na-redacao/data/course-content.json')`; video media is served as plain `.mp4` files with sibling `.webp` thumbnails under `assets/videos/`.",
          pt: 'A base de código é uma **SPA React + Vite** com deploy estático sob o subpath `/ia-na-redacao/` em um host interno da Grupo RBS. Estilo em **Tailwind v4** com um pouco de Emotion CSS-in-JS. Não há backend nem roteador cliente; transições entre dashboard, player de vídeo, e leitor de artigo são geridas por state de componente (`useState`). Todo o conteúdo editorial vem de `data/course-content.json`, carregado uma vez em runtime via `fetch("/ia-na-redacao/data/course-content.json")`; vídeos são `.mp4` puros com thumbnails `.webp` em `assets/videos/`.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "`course-content.json` acts as the sole CMS layer: its `videos[]` schema carries id, title, duration, thumbnail, url, author, category, and tags; its `articles[]` schema replaces an HTML blob with an ordered `content[]` array of typed blocks — `paragraph` and `quote` — so the renderer can apply pull-quote styling structurally rather than through inline markup. The course shell (sidebar list + main panel + progress tracker) is a single shared layout reused for both the video player and the article reader, meaning progress tracking, completion marking, and sequential navigation work identically across content types. Adding content is editing one JSON file plus dropping media into `assets/videos/` — no code deploy.",
          pt: 'O `course-content.json` funciona como única camada de CMS: o schema `videos[]` carrega id, título, duração, thumbnail, url, autor, categoria, e tags; o `articles[]` substitui um blob de HTML por um array ordenado `content[]` de blocos tipados — `paragraph` e `quote` — para o renderer aplicar estilo de citação estruturalmente em vez de inline. O shell do curso (sidebar + painel principal + progress tracker) é um layout único reusado tanto para o player de vídeo quanto para o leitor de artigo, então progresso, conclusão, e navegação sequencial funcionam igual entre tipos. Publicar conteúdo é editar um JSON e soltar mídia em `assets/videos/` — sem novo deploy de código.',
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
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2025', label: { en: 'retrospective', pt: 'retrospectiva' } },
      { value: 'parallax', label: { en: 'driven', pt: 'driven' } },
    ],
    techStack: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'],
    projectType: 'shipped',
    coverImage: '/images/projects/fotos-do-ano-2025/desktop/01-hero.png',
    mockups: {
      desktop: '/images/projects/fotos-do-ano-2025/mockups/desktop.webp',
      desktopBento: '/images/projects/fotos-do-ano-2025/mockups/desktop-bento.webp',
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
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "A scroll-driven editorial gallery shipped on **GZH (Gaúcha ZH)** for *Zero Hora*'s year-end **2025** photojournalism retrospective. **Each of eight staff photographers** gets a dedicated section: a full-width headline photo, a Brightcove video testimonial embed, a left-rail narrative bio, an Ari/Apa award badge where applicable, and a parallax grid of supporting images. Readers scroll linearly through all eight sections from a circular grayscale vignette hero; clicking any photo opens a keyboard-navigable fullscreen lightbox.",
          pt: 'Galeria editorial guiada por scroll, no **GZH (Gaúcha ZH)** para a retrospectiva fotojornalística de fim de ano de **2025** da *Zero Hora*. **Cada um dos oito fotógrafos** do quadro fixo ganha uma seção dedicada: uma foto-título de borda a borda, um depoimento em vídeo embedado via Brightcove, uma biografia narrativa em coluna lateral, selos de prêmios Ari/Apa quando aplicáveis, e uma grid parallax de imagens de apoio. O leitor desce linearmente pelas oito seções a partir de um hero em vinheta circular em escala de cinza; clicar em qualquer foto abre um lightbox fullscreen com navegação por teclado.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: "The codebase is a no-backend SPA built with **Vite 6**, **React 18**, **TypeScript**, and the SWC compiler plugin. All copy and image manifests are co-located inline in `App.tsx` — one `<PhotographerSection>` instance per photographer — with static assets under `public/assets/MELHORES DO ANO/<photographer>/`. Brightcove player iframes are embedded directly so the React tree never owns the player lifecycle. Styling is **Tailwind CSS 3** via PostCSS with autoprefixer. Because the page deploys to a subpath rather than a domain root, `vite.config.ts` sets `base: '/especiais/fotos-do-ano-2025/'` and every asset reference is composed through `import.meta.env.BASE_URL`.",
          pt: 'A base de código é uma SPA sem backend feita com **Vite 6**, **React 18**, **TypeScript**, e o plugin compilador SWC. Toda a copy e os manifestos de imagem ficam co-localizados em `App.tsx` — uma instância de `<PhotographerSection>` por fotógrafo — com assets estáticos em `public/assets/MELHORES DO ANO/<photographer>/`. Os iframes do Brightcove são embedados diretamente, então a árvore React nunca controla o ciclo de vida do player. Estilo em **Tailwind CSS 3** via PostCSS com autoprefixer. Como a página faz deploy em subpath e não em raiz de domínio, `vite.config.ts` define `base: "/especiais/fotos-do-ano-2025/"` e cada referência de asset passa por `import.meta.env.BASE_URL`.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "Scroll animation is driven entirely by **Motion (Framer Motion)** `useScroll` + `useTransform` bindings scoped per-section ref: `scrollYProgress` feeds `useTransform` calls that drive parallax Y-offsets, opacity reveals, image-width compression, and a sticky author-rail vertical drift — all on `transform` and `opacity` to stay on the GPU compositor thread. Supporting photos are laid out by a `generateSquares` helper that assigns deterministic two-column percentage positions with per-index speed multipliers from a fixed array, then memoized with `useMemo` so the position set is stable across scroll ticks. Thumbnail variants (`thumbs/` subdirectory) are derived at render time via a path-manipulation helper and used for the parallax grid; full-resolution images load only inside the lightbox.",
          pt: 'A animação de scroll é guiada por inteiro por **Motion (Framer Motion)** `useScroll` + `useTransform` com escopo por ref de seção: `scrollYProgress` alimenta chamadas `useTransform` que conduzem offsets de parallax em Y, revelações por opacity, compressão de largura de imagem, e um drift vertical na coluna do autor sticky — tudo em `transform` e `opacity` para se manter na thread compositora da GPU. As fotos de apoio são distribuídas por um helper `generateSquares` que atribui posições percentuais determinísticas em duas colunas com multiplicadores de velocidade por índice de um array fixo, memoizadas via `useMemo` para o conjunto de posições ficar estável entre frames de scroll. Variantes de thumbnail (subdir `thumbs/`) são derivadas em tempo de render via helper de path e usadas no grid parallax; imagens em resolução cheia só carregam dentro do lightbox.',
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
    stats: [
      { value: '10', label: { en: 'rounds', pt: 'rodadas' } },
      { value: '56', label: { en: 'cards', pt: 'cartas' } },
      { value: '2', label: { en: 'squads', pt: 'elencos' } },
    ],
    techStack: ['React', 'TypeScript', 'D3.js'],
    projectType: 'shipped',
    coverImage: '/images/projects/peleia-gre-nal/desktop/01-intro.png',
    mockups: {
      desktop: '/images/projects/peleia-gre-nal/mockups/desktop.webp',
      desktopBento: '/images/projects/peleia-gre-nal/mockups/desktop-bento.webp',
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
      { type: 'mockup', variant: 'desktop' },
      {
        type: 'paragraph',
        text: {
          en: "**Peleia Gre-Nal** is a browser-based card game published as an *especial* (long-form interactive) on Grupo RBS' Gaúcha ZH portal. It is a *Super Trunfo* (Top Trumps) duel themed around the Gre-Nal derby: the reader picks Grêmio or Internacional, then plays **10 rounds** in which they draw a player card and choose one of four stats — *Altura* (height), *Idade* (age), *Gre-Nais disputados* (derbies played), *Vitórias em Gre-Nais* (derbies won) — to compare against a 'GZH' opponent card. The higher stat wins the round; after ten rounds, a podium screen declares the winner.",
          pt: '**Peleia Gre-Nal** é um card game de navegador publicado como *especial* (interativo longform) no portal Gaúcha ZH do Grupo RBS. É um duelo *Super Trunfo* tematizado pelo Gre-Nal: o leitor escolhe Grêmio ou Internacional e joga **10 rodadas** sacando uma carta de jogador e escolhendo um de quatro atributos — *Altura*, *Idade*, *Gre-Nais disputados*, *Vitórias em Gre-Nais* — para comparar contra uma carta "GZH". O maior atributo vence a rodada; depois de dez rodadas, uma tela de pódio declara o vencedor.',
        },
      },
      {
        type: 'paragraph',
        text: {
          en: "The app is a single-page **React** app bundled with **Vite** and styled with **Emotion**. React Router is present but the app is effectively single-route — game progression is a client-side state machine (intro → rules → team picker → 10 × {draw → stat-pick → result} → podium) with no URL transitions. **Framer Motion** drives card flips, screen transitions, and the *gangorra* (seesaw) momentum indicator. All roster data, player stats, and matchup logic ship as static client-side assets — no backend, no API calls. The asset bundle includes **56 athlete portraits**, 17 country-flag nationality badges, four stat icons, and bronze/silver/gold medal + podium illustrations.",
          pt: 'O app é uma SPA **React** empacotada com **Vite** e estilizada com **Emotion**. React Router está presente mas o app é efetivamente single-route — a progressão do jogo é uma state machine client-side (intro → regras → seleção de time → 10 × {saca → escolhe atributo → resultado} → pódio) sem transições de URL. **Framer Motion** controla viradas de carta, transições de tela, e o indicador de momentum *gangorra*. Todos os dados de elenco, atributos de jogador, e lógica de comparação saem como assets estáticos client-side — sem backend, sem chamadas de API. O bundle inclui **56 retratos de atletas**, 17 selos de bandeira de nacionalidade, quatro ícones de atributos, e ilustrações de medalha bronze/prata/ouro + pódio.',
        },
      },
      { type: 'mockup', variant: 'mobile' },
      {
        type: 'paragraph',
        text: {
          en: "The most distinctive piece is the *gangorra* — a score-delta momentum visualization that swaps between three pre-baked WebP illustrations (`gangorra-gremio`, `gangorra-inter`, `gangorra-empate`) via Framer Motion easing. Card-flip reveals are choreographed in two sequential phases — opponent card reveal first, then stat-row highlight on the winning attribute — producing a TV-style result read rather than a single-frame cut. A portrait-orientation gate (`rotate_phone.webp`) fires on small landscape viewports, enforcing the portrait-first layout.",
          pt: 'A peça mais distintiva é a *gangorra* — uma visualização de momentum por diferença de pontos que troca entre três WebPs pré-renderizados (`gangorra-gremio`, `gangorra-inter`, `gangorra-empate`) via easing do Framer Motion. As viradas de carta são coreografadas em duas fases sequenciais — revelação da carta adversária primeiro, depois destaque na linha do atributo vencedor — produzindo uma leitura de resultado estilo TV em vez de corte de frame único. Uma porta de orientação retrato (`rotate_phone.webp`) dispara em viewports pequenos em paisagem, forçando o layout retrato.',
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
      desktopBento: '/images/projects/hotmart-bunde/mockups/desktop-bento.webp',
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
      desktopBento: '/images/projects/fotos-do-ano-2024/mockups/desktop-bento.webp',
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
    if (!p.mockups?.desktop || !p.mockups?.desktopBento || !p.mockups?.mobile) {
      throw new Error(
        `Project "${p.id}" is a Selected Work highlight but is missing mockups`
      )
    }
  }
}
