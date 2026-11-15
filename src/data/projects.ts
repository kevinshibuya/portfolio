import type { Project } from '../types/content'

export const projects: Project[] = [
  // Facts from the product's repository (private) at its main branch on 2026-11-10: its architecture
  // document, its nine decision records and the code they name. The role is the one the product's own
  // landing page states. No price, no model name and no person but Kevin appears here.
  {
    id: 'consilia-ia',
    kind: { en: 'AI briefings for legislative offices', pt: 'briefings com IA para gabinetes parlamentares' },
    line: {
      en: 'Before each commitment on a legislator’s agenda, the office gets a briefing in which every line says where it came from.',
      pt: 'Antes de cada compromisso da agenda de um parlamentar, o gabinete recebe um briefing em que cada linha diz de onde veio.',
    },
    body: {
      en: 'A product for the offices of Brazilian legislators, which Kevin built as its co-founder and CTO. It reads what the legislative houses publish and what the office itself keeps, writes the briefing for each commitment on the agenda and answers questions in a chat. One Next.js app on one Postgres: the database keeps each office apart, and a citation loses its number when the quote is not in the source.',
      pt: 'Um produto para gabinetes de parlamentares brasileiros, que Kevin construiu como cofundador e CTO. Ele lê o que as casas legislativas publicam e o que o próprio gabinete guarda, escreve o briefing de cada compromisso da agenda e responde perguntas em um chat. Um app Next.js sobre um Postgres: o banco separa um gabinete do outro, e uma citação perde o número quando o trecho citado não está na fonte.',
    },
    slug: 'consilia-ia',
    title: { en: 'Consilia IA', pt: 'Consilia IA' },
    year: 2026,
    client: 'Consilia IA',
    role: { en: 'co-founder and CTO', pt: 'cofundador e CTO' },
    team: { en: 'sole engineer, with Claude Code agents', pt: 'único engenheiro, com agentes do Claude Code' },
    status: 'live',
    summary: {
      en: 'Preparation copilot for the offices of Brazilian legislators: a briefing, questions and context for each commitment on the agenda, every line tied to its source.',
      pt: 'Copiloto de preparação para gabinetes de parlamentares brasileiros: briefing, perguntas e contexto para cada compromisso da agenda, cada linha ligada à sua fonte.',
    },
    result: {
      en: 'One Next.js app on one Postgres, 19 tables under row-level security, and a landing page with a WebGL corridor',
      pt: 'Um app Next.js sobre um Postgres, 19 tabelas sob segurança por linha e uma landing page com um corredor em WebGL',
    },
    shots: {
      desktop: [
        { en: 'Landing page: the wordmark over the documents', pt: 'Landing page: o nome sobre os documentos' },
        { en: 'The app’s Hoje screen: the day’s agenda and suggested questions', pt: 'A tela Hoje do app: a agenda do dia e as perguntas sugeridas' },
        { en: 'Landing page: the dive through the wordmark', pt: 'Landing page: o mergulho por dentro do nome' },
        { en: 'Landing page: a question and its answer, typed in', pt: 'Landing page: uma pergunta e sua resposta, digitadas' },
        { en: 'Landing page: the sources carousel', pt: 'Landing page: o carrossel das fontes' },
        { en: 'Landing page: an answer, annotated line by line', pt: 'Landing page: uma resposta, anotada linha a linha' },
        { en: 'Landing page: the corridor, at the agenda', pt: 'Landing page: o corredor, na agenda' },
        { en: 'Landing page: the corridor, at the phone message', pt: 'Landing page: o corredor, na mensagem do celular' },
        { en: 'Landing page: one panel for each legislative house', pt: 'Landing page: um painel para cada casa legislativa' },
        { en: 'Landing page: the principles', pt: 'Landing page: os princípios' },
        { en: 'The week’s agenda, each commitment with its state', pt: 'A agenda da semana, cada compromisso com seu estado' },
        { en: 'A briefing: what will happen, what to do', pt: 'Um briefing: o que vai acontecer, o que fazer' },
        { en: 'A chat answer with its citations', pt: 'Uma resposta do chat com as citações' },
        { en: 'A source open in the reader, the cited passage marked', pt: 'Uma fonte aberta no leitor, com o trecho citado marcado' },
        { en: 'The office’s documents and the public collection', pt: 'Os documentos do gabinete e a coleção pública' },
      ],
      mobile: { count: 7, height: 1039 },
    },
    order: 1,
    description: {
      en: 'Consilia IA, a preparation copilot for the offices of Brazilian legislators: before each commitment on the agenda it writes the office’s briefing, and every line says where it came from. Kevin built it as co-founder and CTO: one Next.js app on Postgres with isolation enforced by the database, and a landing page with a scroll-driven WebGL corridor.',
      pt: 'Consilia IA, um copiloto de preparação para gabinetes de parlamentares brasileiros: antes de cada compromisso da agenda ele escreve o briefing do gabinete, e cada linha diz de onde veio. Kevin o construiu como cofundador e CTO: um app Next.js sobre Postgres com isolamento garantido pelo banco, e uma landing page com um corredor em WebGL guiado pelo scroll.',
    },
    stats: [
      { value: '19', label: { en: 'tables under RLS', pt: 'tabelas sob RLS' } },
      { value: '3', label: { en: 'retrieval arms', pt: 'braços de busca' } },
      { value: '9', label: { en: 'recorded decisions', pt: 'decisões registradas' } },
    ],
    pitch: {
      en: 'A *preparation copilot* for the offices of Brazilian legislators: before each commitment on the agenda it writes the briefing, split into what will happen and what to do, and *every line says where it came from*.',
      pt: 'Um *copiloto de preparação* para gabinetes de parlamentares brasileiros: antes de cada compromisso da agenda ele escreve o briefing, dividido entre o que vai acontecer e o que fazer, e *cada linha diz de onde veio*.',
    },
    whatShipped: {
      en: 'The app is *one Next.js 16 application on one Postgres*, with a private storage bucket and one model module that every call passes through. There is no worker and no external queue: jobs are rows the app drains by posting to itself, one job per pass under an advisory lock, and every screen polls. Documents go in as pages, sections and passages, with OCR for scanned pages, and land in *pgvector*; paid ingestion output is stored by content hash, so the same file is never paid for twice. The *landing page* is a separate Vite package, prerendered in Portuguese and English: a scroll-driven dive through the wordmark, a raw WebGL shader field under the navy sections, and a three.js corridor the camera dollies through, which falls back to a stacked list under reduced motion or without WebGL2.',
      pt: 'O app é *uma aplicação Next.js 16 sobre um Postgres*, com um bucket privado de arquivos e um único módulo de modelos por onde toda chamada passa. Não há worker nem fila externa: os jobs são linhas que o app drena postando para si mesmo, um job por passada sob um advisory lock, e toda tela faz polling. Os documentos entram como páginas, seções e trechos, com OCR nas páginas digitalizadas, e vão para o *pgvector*; a saída paga da ingestão é guardada pelo hash do conteúdo, então o mesmo arquivo nunca é pago duas vezes. A *landing page* é um pacote Vite separado, pré-renderizado em português e inglês: um mergulho por dentro do nome guiado pelo scroll, um campo de shader em WebGL puro sob as seções azul-marinho e um corredor em three.js que a câmera atravessa, que vira uma lista empilhada com movimento reduzido ou sem WebGL2.',
    },
    trick: {
      en: 'Isolation between offices is *enforced by the database*, not by the application: a request runs as a login role that cannot bypass row-level security, inside a transaction that names the acting user, so a query that forgets the user returns nothing. Retrieval fuses up to *three ranked arms* (the question, the question with the one before it, and a keyword search on its rare words only) by reciprocal rank fusion, which puts a passage two arms agree on above one arm’s first hit. And a citation carries the exact words it rests on: the render checks them against the passage, and *a quote the source does not hold loses its number*.',
      pt: 'O isolamento entre gabinetes é *garantido pelo banco*, não pela aplicação: uma requisição roda com um role de login que não pode contornar a segurança por linha, dentro de uma transação que nomeia o usuário, então uma query que esquece o usuário não devolve nada. A busca funde até *três braços ranqueados* (a pergunta, a pergunta junto com a anterior e uma busca por palavra-chave só nas palavras raras) por reciprocal rank fusion, que põe um trecho em que dois braços concordam acima do primeiro resultado de um braço só. E uma citação carrega as palavras exatas em que se apoia: a renderização confere essas palavras com o trecho, e *uma citação que a fonte não contém perde o número*.',
    },
    techStack: [
      'Next.js 16', 'React 19', 'TypeScript', 'PostgreSQL', 'pgvector', 'Prisma', 'Supabase', 'AI SDK',
      'assistant-ui', 'Tailwind CSS', 'Vite', 'three.js', 'GSAP', 'Lenis', 'Vercel', 'Cloudflare Pages',
    ],
    liveUrl: 'https://consiliaia.com.br',
  },
  {
    id: 'radar-legislativo',
    kind: { en: 'legislative data platform', pt: 'plataforma de dados legislativos' },
    line: {
      en: 'Daily data from the Chamber of Deputies, with AI-drafted voting summaries an editor approves first.',
      pt: 'Votações da Câmara dos Deputados todo dia, com resumos por IA que um editor aprova.',
    },
    body: {
      en: 'A scraper keeps Postgres in step with the Chamber of Deputies’ open data. A queue drafts a plain-language summary of each voting, and an editor approves, edits or rejects it in the back office. The public site shows only what was approved: votes by party and state, deputy profiles, an expense ranking.',
      pt: 'Um scraper mantém o Postgres em dia com os dados abertos da Câmara dos Deputados. Uma fila rascunha um resumo em linguagem simples de cada votação, e um editor aprova, edita ou rejeita no back-office. O site público mostra só o que foi aprovado: votos por partido e estado, perfis de deputados, um ranking de despesas.',
    },
    slug: 'radar-legislativo',
    title: { en: 'Radar Legislativo', pt: 'Radar Legislativo' },
    year: 2026,
    client: 'Grupo RBS',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'architecture, full-stack', pt: 'arquitetura, full-stack' },
    team: { en: 'solo', pt: 'solo' },
    status: 'unlaunched',
    summary: {
      en: 'Legislative-data platform for Grupo RBS: open data in daily, AI-drafted voting summaries, and an editor’s approval before anything goes public.',
      pt: 'Plataforma de dados legislativos do Grupo RBS: dados abertos todo dia, resumos de votações rascunhados por IA e a aprovação de um editor antes de qualquer publicação.',
    },
    result: {
      en: 'Three apps in one monorepo, shipped by GitLab CI to Kubernetes on GCP',
      pt: 'Três apps em um monorepo, publicados pelo GitLab CI no Kubernetes do GCP',
    },
    shots: {
      desktop: [
        { en: 'Voting detail with the AI-written summary', pt: 'Detalhe da votação com o resumo escrito por IA' },
        { en: 'Back office: an editor reviews an AI draft', pt: 'Back-office: um editor revisa um rascunho de IA' },
        { en: 'Deputy profile', pt: 'Perfil de deputado' },
        { en: 'Expense transparency ranking', pt: 'Ranking de transparência de despesas' },
        { en: 'Back-office dashboard', pt: 'Painel do back-office' },
      ],
      mobile: { count: 3, height: 1214 },
    },
    order: 2,
    description: {
      en: 'Legislative-data platform built for Grupo RBS, finished but never launched: a NestJS/PostgreSQL backend that ingested the Chamber of Deputies open data daily, an AI pipeline that drafted voting summaries for editorial approval, and a public React site with voting and expense visualizations.',
      pt: 'Plataforma de dados legislativos feita para o Grupo RBS, concluída e nunca lançada: back-end NestJS/PostgreSQL que ingeria diariamente os dados abertos da Câmara dos Deputados, pipeline de IA que rascunhava resumos de votações para aprovação editorial e site público em React com visualizações de votações e despesas.',
    },
    pitch: {
      en: 'A newsroom platform over the Brazilian Chamber of Deputies, *finished but never launched*: a scraper kept Postgres in sync with the official open-data API, an *AI pipeline drafted voting summaries*, and nothing reached the public site before a *human editor approved it*.',
      pt: 'Uma plataforma de redação sobre a Câmara dos Deputados, *concluída e nunca lançada*: um scraper mantinha o Postgres em dia com a API oficial de dados abertos, um *pipeline de IA rascunhava resumos das votações*, e nada chegava ao site público antes de um *editor humano aprovar*.',
    },
    whatShipped: {
      en: 'Three apps in one monorepo: a *NestJS API* that scrapes the Câmara open-data API on a rate-limited daily cron (per-deputy sync plus batch CSV ingestion, with self-healing runs that fail stuck syncs), a *Next.js back office* where editors review, edit, approve or regenerate every AI draft, and a public *React site* with per-party voting visualizations, deputy profiles and an expense-transparency ranking. GitLab CI tests all three and ships Docker images to Kubernetes on GCP.',
      pt: 'Três apps em um monorepo: uma *API NestJS* que raspa a API de dados abertos da Câmara em um cron diário com rate limit (sync por deputado mais ingestão de CSV em lote, com runs auto-reparáveis que derrubam syncs travados), um *back-office Next.js* onde editores revisam, editam, aprovam ou regeneram cada rascunho de IA, e um *site público em React* com visualizações de votação por partido, perfis de deputados e um ranking de transparência de despesas. O GitLab CI testa os três e publica imagens Docker no Kubernetes do GCP.',
    },
    trick: {
      en: 'The AI pipeline treats Postgres as the source of truth: a *partial unique index* allows at most one in-flight generation per voting, and workers *claim rows with conditional updates* so a redelivered job can never resurrect a finished one. Model calls rotate through a Redis-backed ladder that tells daily quotas apart from per-minute limits, and every output passes a *prompt-injection filter* (random delimiters in, no HTML/URLs out) before it can even be saved.',
      pt: 'O pipeline de IA trata o Postgres como fonte da verdade: um *índice único parcial* permite no máximo uma geração em andamento por votação, e os workers *reivindicam linhas com updates condicionais*, então um job reentregue nunca ressuscita um registro finalizado. As chamadas de modelo giram por uma escada de fallback no Redis que separa cota diária de limite por minuto, e toda saída passa por um *filtro anti prompt injection* (delimitadores aleatórios na entrada, nada de HTML/URLs na saída) antes mesmo de poder ser salva.',
    },
    techStack: [
      'NestJS', 'PostgreSQL', 'TypeORM', 'Redis', 'Bull', 'Next.js', 'React 19',
      'Vite', 'TanStack Query', 'Tailwind CSS', 'OpenAI API', 'Docker', 'Kubernetes', 'GitLab CI',
    ],
  },
  {
    id: 'painel-da-reconstrucao',
    kind: { en: 'data dashboard', pt: 'painel de dados' },
    line: {
      en: 'Every real spent on Rio Grande do Sul’s flood recovery: R$ 129B tracked across 19 routes.',
      pt: 'Cada real investido na reconstrução do Rio Grande do Sul: R$ 129 bi rastreados em 19 rotas.',
    },
    body: {
      en: 'A long-running dashboard for GZH. One JSON file, compiled by the newsroom, feeds 19 static routes served from the edge with no server behind them. A layer of selectors cuts it by government, by segment and into summaries, and the charts and the map all draw from the same data in memory.',
      pt: 'Um painel de longa duração para a GZH. Um único JSON, compilado pela redação, alimenta 19 rotas estáticas servidas na edge, sem servidor por trás. Uma camada de seletores recorta os dados por esfera de governo, por segmento e em sumários, e os gráficos e o mapa leem o mesmo conjunto em memória.',
    },
    slug: 'painel-da-reconstrucao',
    title: { en: 'Painel da Reconstrução', pt: 'Painel da Reconstrução' },
    year: 2024,
    client: 'GZH · Grupo RBS',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'front-end', pt: 'front-end' },
    team: { en: '1 developer, GZH newsroom', pt: '1 dev, redação GZH' },
    status: 'live',
    summary: {
      en: 'Data dashboard for GZH tracking every real spent on Rio Grande do Sul’s recovery from the May 2024 floods.',
      pt: 'Painel de dados da GZH que acompanha cada real investido na reconstrução do Rio Grande do Sul após as enchentes de maio de 2024.',
    },
    result: {
      en: 'R$ 129B tracked across 19 routes, served as static HTML from the edge',
      pt: 'R$ 129 bi rastreados em 19 rotas, servidos como HTML estático na edge',
    },
    shots: {
      desktop: [
        { en: 'Overview: total and federal resources', pt: 'Visão geral: recursos totais e federais' },
        { en: 'Where the money goes, by segment', pt: 'O caminho do dinheiro, por segmento' },
        { en: 'Map of affected roads', pt: 'Mapa das estradas afetadas' },
      ],
      mobile: { count: 3, height: 939 },
    },
    order: 4,
    description: {
      en: 'Long-running data dashboard for GZH tracking every public and private real spent on reconstruction after the May 2024 floods in Rio Grande do Sul.',
      pt: 'Painel de dados sempre atualizado para a GZH, que monitora cada real (público e privado) investido na reconstrução após as enchentes de maio de 2024 no Rio Grande do Sul.',
    },
    stats: [
      { value: 'R$ 129B', label: { en: 'tracked', pt: 'rastreado' } },
      { value: '19', label: { en: 'routes', pt: 'rotas' } },
      { value: '2024', label: { en: 'launched', pt: 'lançado' } },
    ],
    pitch: {
      en: 'A long-running *data dashboard* for GZH, tracking every real spent on Rio Grande do Sul’s flood recovery.',
      pt: 'Um *painel de dados* sempre atualizado para a GZH, que monitora cada real investido na recuperação das enchentes do Rio Grande do Sul.',
    },
    whatShipped: {
      en: 'A Next.js 14 App Router project in TypeScript, exported as static HTML and served on Azion’s edge, with no Node runtime. One 488 KB JSON, denormalized by the newsroom, feeds 19 routes through a tiny SWR-backed data layer. UI primitives from Mantine and NextUI.',
      pt: 'Projeto em Next.js 14 com App Router e TypeScript, exportado para HTML estático e servido na edge da Azion, sem Node em runtime. Um único JSON de 488 KB, já denormalizado pela redação, alimenta as 19 rotas através de uma camada enxuta de dados em cima de SWR. Componentes de UI vêm da Mantine e do NextUI.',
    },
    trick: {
      en: 'A *selector layer* reduces the flat JSON into per-government, per-segment, and summary slices that each route consumes, all memoized so the same calculation never runs twice across a session. *Three charting libraries* (Highcharts, ApexCharts, Chart.js) share the same in-memory dataset, picked per chart type rather than per page.',
      pt: 'Uma *camada de seletores* reduz o JSON plano em recortes por esfera de governo, por segmento e de sumário, cada um consumido por uma rota, e tudo memoizado, então o mesmo cálculo nunca se repete dentro de uma sessão. *Três libs de gráficos* (Highcharts, ApexCharts, Chart.js) dividem o mesmo dataset em memória, cada uma escolhida pelo tipo de gráfico, não pela página.',
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
    liveUrl: 'https://gauchazh.clicrbs.com.br/especiais/painel-da-reconstrucao/',
  },
  {
    id: 'enquetes-gzh',
    kind: { en: 'live voting system', pt: 'sistema de votação ao vivo' },
    line: {
      en: 'Live polls for the GZH newsroom: 71 polls, 760K votes, and 144K on one BBB 26 eviction.',
      pt: 'Enquetes ao vivo para a redação da GZH: 71 no total, 760 mil votos, 144 mil num paredão do BBB 26.',
    },
    body: {
      en: 'Two real-time apps over one Firestore. Editors create a poll in the back office and copy its embed; readers vote inside the article and watch the percentages move. Each vote is one atomic write, each duplicate check a single read. It replaced a paid service.',
      pt: 'Dois apps em tempo real sobre um Firestore. Os editores criam a enquete no back-office e copiam o embed; os leitores votam dentro da matéria e veem os percentuais se moverem. Cada voto é uma escrita atômica, cada checagem de duplicidade uma única leitura. Substituiu um serviço pago.',
    },
    slug: 'enquetes-gzh',
    title: { en: 'Enquetes GZH', pt: 'Enquetes GZH' },
    year: 2025,
    client: 'GZH · Grupo RBS',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'full-stack', pt: 'full-stack' },
    team: { en: 'solo', pt: 'solo' },
    status: 'live',
    summary: {
      en: 'Live-voting system for GZH: a newsroom back office and a poll widget journalists embed in articles.',
      pt: 'Sistema de votação ao vivo da GZH: um back-office para a redação e um widget de enquete que os jornalistas embedam nas matérias.',
    },
    result: {
      en: '71 live polls and 760K+ votes, 144K of them on one BBB 26 eviction; replaced a paid service',
      pt: '71 enquetes ao vivo e mais de 760 mil votos, 144 mil num só paredão do BBB 26; substituiu um serviço pago',
    },
    shots: {
      desktop: [
        { en: 'Back office: the poll list', pt: 'Back-office: a lista de enquetes' },
        { en: 'Embed widget after a vote, percentages live', pt: 'Widget de embed após o voto, com percentuais ao vivo' },
        { en: 'Embed widget before a vote', pt: 'Widget de embed antes do voto' },
      ],
      mobile: { count: 3, height: 939 },
    },
    order: 3,
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
      en: 'Two *real-time apps* over one Firestore: a newsroom backoffice and a public vote widget that journalists drop into articles.',
      pt: 'Dois *apps em tempo real* em cima de um Firestore: um backoffice para a redação e um widget público que os jornalistas plugam nas matérias.',
    },
    whatShipped: {
      en: 'Two apps over one Firestore: a *backoffice* where editors create polls and copy embed snippets, and a *public widget* where readers vote and watch percentages update live. Backoffice access is locked to Grupo RBS Google accounts; the embed loads any poll by ID and streams updates straight from Firestore.',
      pt: 'Dois apps em cima de um Firestore: um *backoffice* onde os editores criam as enquetes e copiam o snippet de embed, e um *widget público* onde os leitores votam e veem os percentuais subirem em tempo real. O backoffice é restrito a contas Google do Grupo RBS; o embed carrega qualquer enquete pelo ID e transmite as atualizações direto do Firestore.',
    },
    trick: {
      en: 'Duplicate-vote detection uses a device ID stored in `localStorage` as the *Firestore document ID itself*, so checking whether someone has voted is a single *O(1)* lookup against a known key, not a query. A confirmed vote then commits as one atomic write that increments the option tally and the running total together, so the public widget never sees a half-counted state.',
      pt: 'A detecção de voto duplicado usa um device ID guardado em `localStorage` como *ID do próprio documento* no Firestore, então verificar se alguém já votou vira uma leitura *O(1)* direta numa chave conhecida, sem precisar de query. E um voto confirmado é uma escrita atômica só, que sobe o contador da opção e o total geral ao mesmo tempo, então o widget público nunca pega uma contagem pela metade.',
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
    liveUrl: 'https://gauchazh.clicrbs.com.br/especiais/enquetes-gzh-backoffice',
  },
  {
    id: 'chatbot-analitico-redacao',
    kind: { en: 'AI analyst', pt: 'analista de IA' },
    line: {
      en: 'Ask in plain Portuguese; three agents answer from the newsroom’s BigQuery audience data.',
      pt: 'A pergunta vai em português; três agentes respondem com os dados de audiência da redação no BigQuery.',
    },
    body: {
      en: 'A chat client over an n8n workflow on Azure OpenAI. One agent writes the SQL from a single locked template, an executor runs it on BigQuery under a hard limit of twenty rows, and a third agent writes the answer. The agents’ instructions are versioned beside the app.',
      pt: 'Um cliente de chat sobre um workflow no n8n com Azure OpenAI. Um agente escreve o SQL a partir de um único molde travado, um executor roda a consulta no BigQuery com limite fixo de vinte linhas, e um terceiro agente escreve a resposta. As instruções dos agentes são versionadas junto do app.',
    },
    slug: 'chat-da-hora',
    title: { en: 'Chat da Hora', pt: 'Chat da Hora' },
    year: 2025,
    client: 'GZH · Lab IA 2026',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'front-end, agent prompts', pt: 'front-end, prompts dos agentes' },
    team: { en: '1 developer, competition entry', pt: '1 dev, projeto de competição' },
    status: 'mvp',
    summary: {
      en: 'AI analyst for the GZH newsroom: ask in plain Portuguese, and three agents answer from BigQuery audience data.',
      pt: 'Analista de IA para a redação da GZH: a pergunta vai em português e três agentes respondem com os dados de audiência no BigQuery.',
    },
    result: {
      en: 'The Lab IA 2026 MVP that earned Plexus’s investment',
      pt: 'O MVP do Lab IA 2026 que conquistou o investimento da Plexus',
    },
    shots: {
      desktop: [
        { en: 'The chat client, with example questions', pt: 'O cliente de chat, com perguntas de exemplo' },
      ],
      mobile: { count: 0, height: 1214 },
    },
    order: 7,
    description: {
      en: 'AI chat tool for GZH editors and product managers: ask in plain Portuguese ("qual o mês com mais acessos em 2025?") and get back a formatted analyst answer over the newsroom\'s BigQuery audience data. Built as an MVP for Lab IA 2026 (Abraji + Google + Plexus + Blue Engine Collaborative): the multi-agent workflow proved out end-to-end, but the tool never went to production in the newsroom. Plexus\'s investment is what takes it there.',
      pt: 'ferramenta de chat com IA pros editores e PMs da GZH: perguntam em português direto ("qual o mês com mais acessos em 2025?") e recebem uma resposta analítica formatada, batendo no BigQuery de audiência da redação. construído como MVP do Lab IA 2026 (Abraji + Google + Plexus + Blue Engine Collaborative): o pipeline multi-agente funcionou fim a fim, mas a ferramenta não chegou a virar produto na redação. é justamente esse o salto que o investimento da Plexus banca.',
    },
    stats: [
      { value: '3', label: { en: 'agents', pt: 'agentes' } },
      { value: 'Plexus', label: { en: 'invested', pt: 'investiu' } },
      { value: 'Lab IA', label: { en: '2026', pt: '2026' } },
    ],
    pitch: {
      en: 'An *AI analyst* the newsroom talks to in plain Portuguese: three agents on n8n turn the question into SQL, run it against BigQuery, and write the answer back in natural language.',
      pt: 'Um *analista de IA* com quem a redação conversa em português: três agentes no n8n viram a pergunta em SQL, rodam no BigQuery e devolvem a resposta em linguagem natural.',
    },
    whatShipped: {
      en: 'A React 18 + Vite chat client backed by an *agentic n8n workflow* on Azure OpenAI. The pipeline is three agents: a *query-builder* synthesises a BigQuery SQL statement against the newsroom’s consolidated article-audience table, a BigQuery executor runs it under a hard `LIMIT 20` rule, and an *insight-builder agent* writes the final Markdown answer in Brazilian Portuguese, with rankings, percentages, and site-vs-app splits. Agent instruction sets are versioned alongside the frontend, so prompt changes ship as code.',
      pt: 'Cliente de chat em React 18 + Vite por cima de um *workflow agêntico no n8n* rodando em Azure OpenAI. O pipeline tem três agentes: o *query-builder* monta um SQL em BigQuery em cima da tabela consolidada de audiência da redação, um executor roda a query com a regra fixa de `LIMIT 20`, e o *insight-builder* devolve a resposta em Markdown em português, com rankings, porcentagens e divisão site vs app. As instruções dos agentes ficam versionadas junto do frontend, então mexer no prompt é um commit.',
    },
    trick: {
      en: 'The real engineering is in *prompt discipline*, not in glue code. The query-builder agent is locked to *one aggregation template* (fixed grouping key, fixed projection shape, fixed `SUM()` over the pageview columns) and a non-negotiable `LIMIT 20`, so the LLM never wanders off into ad-hoc query shapes that blow up the bill or return one row when it should return twenty. The insight agent has explicit *field-reading guardrails* (examples of correct vs incorrect interpretations) that stop it from confusing a month-number column with a pageview count. Shipping the agents as versioned Markdown next to the app means every guardrail is a diff and every regression is a revert.',
      pt: 'A engenharia de verdade tá na *disciplina de prompt*, não no código de cola. O query-builder é trancado num *único molde de agregação* (chave de agrupamento fixa, projeções fixas, `SUM()` fixo nas colunas de pageview) e num `LIMIT 20` inegociável, então o LLM nunca sai inventando query maluca que estoura conta ou devolve uma linha quando devia devolver vinte. O agente de insight tem *grades de leitura de campo* explícitas (exemplos do que é certo e do que é errado interpretar) que impedem ele de confundir a coluna do mês com uma contagem de pageviews. E como os agentes são Markdowns versionados ao lado do app, cada salvaguarda é um diff e cada regressão é um revert.',
    },
    techStack: ['React 18', 'Vite', 'n8n', 'Azure OpenAI', 'BigQuery', 'react-markdown'],
  },
  {
    id: 'ia-na-redacao',
    kind: { en: 'internal newsroom hub', pt: 'hub interno da redação' },
    line: {
      en: 'Grupo RBS journalists show how they use AI: video testimonials, articles and editorial guidelines.',
      pt: 'Jornalistas do Grupo RBS mostram como usam IA: depoimentos em vídeo, artigos e diretrizes editoriais.',
    },
    body: {
      en: 'A static single-page app on a private RBS host. One shell, with a list, a main panel and a progress bar, serves both the video player and the article reader, and everything is published from a single JSON file, so the newsroom could change the format while the pilot ran.',
      pt: 'Uma SPA estática em um host privado da RBS. Um único shell, com lista, painel principal e barra de progresso, serve o player de vídeo e o leitor de artigos, e tudo é publicado a partir de um único arquivo JSON, então a redação podia mudar o formato enquanto o piloto rodava.',
    },
    slug: 'ia-na-redacao',
    title: { en: 'IA na Redação', pt: 'IA na Redação' },
    year: 2025,
    client: 'Grupo RBS',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'front-end', pt: 'front-end' },
    team: { en: '1 developer, RBS newsroom', pt: '1 dev, redação RBS' },
    status: 'internal',
    summary: {
      en: 'Internal Grupo RBS hub where journalists show how they use AI: video testimonials, articles and editorial guidelines.',
      pt: 'Hub interno do Grupo RBS em que jornalistas mostram como usam IA: depoimentos em vídeo, artigos e diretrizes editoriais.',
    },
    result: {
      en: 'Shipped as an MVP to measure newsroom adoption',
      pt: 'Lançado como MVP para medir a adoção na redação',
    },
    shots: {
      desktop: [
        { en: 'Landing', pt: 'Entrada' },
        { en: 'Video testimonials', pt: 'Depoimentos em vídeo' },
        { en: 'Articles', pt: 'Artigos' },
      ],
      mobile: { count: 3, height: 1214 },
    },
    order: 8,
    description: {
      en: 'A special-feature page for Grupo RBS introducing how AI is being used inside their newsrooms: video testimonials from journalists, opinion articles, and the editorial guidelines that frame the use. Shipped as an MVP to validate internal adoption before scaling into a full platform.',
      pt: 'Página especial do Grupo RBS mostrando como a IA já está sendo usada dentro das redações: depoimentos em vídeo de jornalistas, artigos de opinião e as diretrizes editoriais que orientam esse uso. Lançado como MVP para validar a adoção interna antes de investir numa evolução maior.',
    },
    techStack: ['React', 'Vite', 'TailwindCSS v4', 'Emotion'],
    pitch: {
      en: 'An *internal Grupo RBS hub* where journalists share how they actually use AI, built as an MVP to measure newsroom adoption before scaling into a full editorial platform.',
      pt: 'Um *hub interno do Grupo RBS* onde os próprios jornalistas contam como usam IA no dia a dia, construído como um MVP para medir a adoção da redação antes de evoluir para uma plataforma editorial completa.',
    },
    whatShipped: {
      en: 'A React + Vite SPA deployed as a static build on a private RBS host, supporting both video testimonials and long-form articles inside the same editorial shell. Content is published from a single JSON file so the newsroom could keep iterating on the format while the MVP proved its value. Tailwind v4 with a touch of Emotion.',
      pt: 'SPA React + Vite com build estático servida num host privado da RBS, com suporte tanto a depoimentos em vídeo quanto a artigos longos dentro do mesmo shell editorial. O conteúdo é publicado a partir de um único arquivo JSON, então a redação conseguia continuar iterando no formato enquanto o MVP provava seu valor. Tailwind v4 com um toque de Emotion.',
    },
    trick: {
      en: '*One shared course shell* (sidebar list, main panel, progress tracker) backs both the video player and the article reader, so adding a new editorial format becomes a new block type rather than a new screen. Articles ship as ordered arrays of typed blocks (paragraphs, pull-quotes) rather than HTML strings, so styling is applied *structurally* by the renderer instead of leaking into the copy.',
      pt: '*Um único shell de curso* (lista lateral, painel principal e barra de progresso) serve ao mesmo tempo o player de vídeo e o leitor de artigo, então adicionar um novo formato editorial vira um novo tipo de bloco, não uma nova tela. Os artigos chegam como arrays ordenados de blocos tipados (parágrafos, citações em destaque) em vez de blobs de HTML, então o estilo é aplicado *estruturalmente* pelo renderer, sem se misturar ao conteúdo.',
    },
  },
  {
    id: 'fotos-do-ano-2025',
    kind: { en: 'photo retrospective', pt: 'retrospectiva fotográfica' },
    line: {
      en: 'GZH’s year in photographs: eight staff photographers, eight scroll-driven sections.',
      pt: 'O ano da GZH em fotografias: oito fotógrafos, oito seções guiadas pelo scroll.',
    },
    body: {
      en: 'A single page with no back end. Each photographer has a section driven by one scroll progress value: it moves the parallax offsets, the reveals, the width of the images and the drift of the author’s column, all on transform and opacity.',
      pt: 'Uma página única, sem back-end. Cada fotógrafo tem uma seção comandada por um único valor de progresso do scroll: ele move os deslocamentos de parallax, as revelações, a largura das imagens e o deslize da coluna do autor, tudo em transform e opacity.',
    },
    slug: 'fotos-do-ano-2025',
    title: { en: 'Fotos do Ano 2025', pt: 'Fotos do Ano 2025' },
    year: 2025,
    client: 'GZH · Zero Hora',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'front-end', pt: 'front-end' },
    team: { en: '1 developer, 8 photographers', pt: '1 dev, 8 fotógrafos' },
    status: 'published',
    summary: {
      en: 'GZH’s year-end photo retrospective: the most striking images of 2025 as an immersive scroll.',
      pt: 'Retrospectiva fotográfica de fim de ano da GZH: as imagens mais marcantes de 2025 em uma leitura imersiva guiada pelo scroll.',
    },
    result: {
      en: 'Eight photographers, eight scroll-driven sections, no back end',
      pt: 'Oito fotógrafos, oito seções guiadas pelo scroll, nenhum back-end',
    },
    shots: {
      desktop: [
        { en: 'Opening', pt: 'Abertura' },
        { en: 'A photographer feature', pt: 'Destaque de um fotógrafo' },
        { en: 'Parallax gallery', pt: 'Galeria com parallax' },
      ],
      mobile: { count: 3, height: 939 },
    },
    order: 10,
    description: {
      en: 'Year-end photo retrospective for GZH: a curated longform of the most striking images of 2025, presented as an immersive scroll experience.',
      pt: 'Retrospectiva fotográfica de fim de ano para a GZH: um longform curado das imagens mais marcantes de 2025, montado como uma leitura imersiva guiada pelo scroll.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2025', label: { en: 'retrospective', pt: 'retrospectiva' } },
      { value: 'parallax', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: 'GZH’s year-end *photo retrospective*: eight staff photographers, eight scroll-driven sections, one fullscreen lightbox.',
      pt: 'A *retrospectiva fotográfica* de fim de ano da GZH: oito fotógrafos do quadro, oito seções comandadas pelo scroll, um lightbox em tela cheia.',
    },
    whatShipped: {
      en: 'A no-backend single-page app built with Vite 6, React 18, TypeScript, and SWC. All copy and image manifests live inline in one source file, one section component per photographer. Brightcove iframes embed directly so the React tree never owns the player lifecycle.',
      pt: 'SPA sem backend feita em Vite 6, React 18, TypeScript e SWC. Toda a copy e os manifestos de imagem ficam inline num único arquivo de fonte, um componente de seção para cada fotógrafo. Os iframes do Brightcove embedam direto, então a árvore React nunca cuida do ciclo de vida do player.',
    },
    trick: {
      en: 'Scroll is driven entirely by *Motion’s scroll hooks*, scoped per-section. One progress value feeds the parallax y-offsets, opacity reveals, image-width compression, and the sticky author-rail drift, all on `transform` and `opacity` so the work stays on the GPU compositor. Parallax thumbnail positions are deterministic and memoized across scroll ticks.',
      pt: 'O scroll é todo comandado pelos *hooks de scroll do Motion*, com escopo por seção. Um único valor de progresso alimenta os deslocamentos de parallax, as revelações por opacidade, a compressão de largura das fotos e o deslize vertical da coluna do autor, tudo em `transform` e `opacity` para o trabalho ficar na GPU. As posições dos thumbnails são determinísticas e memoizadas entre frames de scroll.',
    },
    techStack: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'],
  },
  {
    id: 'hotmart-bunde',
    kind: { en: 'sales landing page', pt: 'landing page de vendas' },
    line: {
      en: 'One page sells a 50-hour course: 1.3k visitors in two weeks on search alone.',
      pt: 'Uma página vende um curso de 50 horas: 1,3 mil visitantes em duas semanas só por busca.',
    },
    body: {
      en: 'The whole funnel is one page. Any call to action opens Hotmart’s checkout in a modal, so a reader never leaves, and each communicator’s own link rebuilds the hero around them, applies their coupon and credits the sale. 97% of visits get a good LCP.',
      pt: 'O funil inteiro é uma página. Qualquer chamada abre o checkout do Hotmart em um modal, então o leitor nunca sai, e o link de cada comunicador reorganiza a hero em torno dele, aplica o cupom e credita a venda. 97% das visitas têm LCP bom.',
    },
    slug: 'hotmart-bunde',
    title: { en: 'Política Essencial', pt: 'Política Essencial' },
    year: 2026,
    client: 'Política Essencial',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'freelance, front-end', pt: 'freelancer, front-end' },
    team: { en: 'solo', pt: 'solo' },
    status: 'live',
    summary: {
      en: 'Sales landing page for a 50+ hour online course on political fundamentals, with Hotmart’s checkout inside the page.',
      pt: 'Landing page de vendas de um curso online de 50+ horas sobre fundamentos da política, com o checkout do Hotmart dentro da página.',
    },
    result: {
      en: '1.3k visitors in two weeks on SEO alone, 97% good LCP',
      pt: '1,3 mil visitantes em duas semanas só por SEO, 97% de LCP bom',
    },
    shots: {
      desktop: [
        { en: 'Landing hero', pt: 'Hero da landing' },
        { en: 'Course modules', pt: 'Módulos do curso' },
        { en: 'About the course', pt: 'Sobre o curso' },
      ],
      mobile: { count: 3, height: 1214 },
    },
    origin: 'freelance',
    order: 6,
    description: {
      en: 'Sales landing page for Política Essencial, a Brazilian online course teaching political fundamentals from zero through 50+ hours of video lessons by 17 social-media communicators. Pure conversion funnel: no auth, no cart, no payment surface; checkout lives on Hotmart.',
      pt: 'Landing page de vendas do Política Essencial, curso online brasileiro que ensina os fundamentos da política do zero, em mais de 50 horas de vídeo-aulas ministradas por 17 comunicadores de redes sociais. Um funil de conversão puro: sem login, sem carrinho, sem área de pagamento; o checkout fica no Hotmart.',
    },
    stats: [
      { value: '50+ hrs', label: { en: 'course content', pt: 'conteúdo do curso' } },
      { value: '17', label: { en: 'communicators', pt: 'comunicadores' } },
      { value: '1', label: { en: 'LP funnel', pt: 'funil único' } },
    ],
    pitch: {
      en: 'An *in-page sales funnel* for a 50+ hour political-fundamentals course: Hotmart’s checkout opens inside a modal so readers never leave, and each communicator’s referral link rewrites the hero around them.',
      pt: 'Um *funil de vendas em uma página só* para um curso de 50+ horas de fundamentos da política: o checkout do Hotmart abre num modal, o leitor nunca precisa sair da página, e o link próprio de cada comunicador reescreve a hero em torno dele.',
    },
    whatShipped: {
      en: 'A React + Vite SPA on Cloudflare Pages, styled with Tailwind v4. The entire scrapbook visual language (paper textures, washi tape, torn edges, layered shadows, hand-cut portrait cutouts) is composed from a small toolkit of utility primitives, so each section reads like a different page of a physical zine. Checkout, professor data, and copy all live in-repo as static assets: no CMS, no auth, no backend.',
      pt: 'SPA React + Vite no Cloudflare Pages, com Tailwind v4. Toda a linguagem visual de scrapbook (texturas de papel, fitas washi, bordas rasgadas, sombras em camadas, retratos recortados à mão) é montada em cima de um kit enxuto de utilitários, e cada seção acaba lembrando uma página diferente de uma fanzine de papel. Checkout, dados dos professores e copy ficam todos no próprio repo como assets estáticos: sem CMS, sem login, sem backend.',
    },
    trick: {
      en: 'The whole funnel is *one page*: clicking any CTA opens Hotmart’s checkout *inside an in-page modal*; readers never leave the domain, so the context-switch that usually kills conversion is gone. Every personalized communicator link (`?ref=<slug>`) rearranges the hero so that professor becomes the *centerpiece* with the other 16 orbiting them, auto-applies their coupon, and forwards their slug to Hotmart’s producer analytics so commissions split cleanly. Result: a near-perfect *Core Web Vitals* score (97% good LCP, 640 ms page load) and *1.3k visitors in two weeks* on pure SEO. The page hadn’t even been posted to social yet.',
      pt: 'O funil inteiro vive em *uma página só*: clicar em qualquer CTA abre o checkout do Hotmart *num modal por cima da página*; o leitor não sai do domínio em nenhum momento, então a troca de contexto que costuma matar conversão deixa de existir. E cada link personalizado de comunicador (`?ref=<slug>`) reorganiza a hero para colocar aquele professor no *centro*, com os outros 16 orbitando em volta, aplica o cupom dele automaticamente e ainda manda o slug para o analytics de produtor do Hotmart, e a comissão se divide certinho. O resultado: *Core Web Vitals* quase perfeitos (97% de LCP bom, 640 ms de carregamento) e *1,3 mil visitantes em duas semanas* só por SEO. A página ainda nem tinha sido posta nas redes sociais.',
    },
    techStack: ['React 18', 'TypeScript', 'Vite 6', 'TailwindCSS v4', 'Framer Motion', 'Lenis', 'Cloudflare Pages'],
    liveUrl: 'https://politicaessencial.com',
  },
  {
    id: 'fotos-do-ano-2024',
    kind: { en: 'photo retrospective', pt: 'retrospectiva fotográfica' },
    line: {
      en: 'Zero Hora’s record of the May 2024 floods: eight photographers, one image and one testimony each.',
      pt: 'O registro da Zero Hora sobre as enchentes de maio de 2024: oito fotógrafos, uma imagem e um depoimento de cada.',
    },
    body: {
      en: 'A scroll-driven gallery. Each section pairs a flood photograph with the photographer’s own caption, a video testimony and a portrait. A wordmark stays over the page, follows the scroll and turns from peach to white as dark panels pass under it.',
      pt: 'Uma galeria guiada pelo scroll. Cada seção junta uma foto das enchentes, a legenda do próprio fotógrafo, um depoimento em vídeo e um retrato. Um wordmark fica sobre a página, acompanha o scroll e passa de pêssego a branco quando painéis escuros passam por baixo.',
    },
    slug: 'fotos-do-ano-2024',
    title: { en: 'Fotos do Ano 2024', pt: 'Fotos do Ano 2024' },
    year: 2024,
    client: 'Zero Hora',
    // Drafted from the repo history and the CV, then corrected and confirmed by Kevin (2026-11-14).
    role: { en: 'front-end', pt: 'front-end' },
    team: { en: '1 developer, 8 photographers', pt: '1 dev, 8 fotógrafos' },
    status: 'published',
    summary: {
      en: 'Zero Hora’s photo retrospective of the May 2024 floods: eight staff photographers, one image and one testimony each.',
      pt: 'Retrospectiva fotográfica da Zero Hora sobre as enchentes de maio de 2024: oito fotógrafos, uma imagem e um depoimento de cada.',
    },
    result: {
      en: 'A scroll-driven gallery whose wordmark follows the reader',
      pt: 'Uma galeria guiada pelo scroll, com um wordmark que acompanha o leitor',
    },
    shots: {
      desktop: [
        { en: 'Aerial photograph of the flooded Beira-Rio stadium', pt: 'Foto aérea do estádio Beira-Rio alagado' },
        { en: 'A photographer’s section, with a video testimonial', pt: 'Seção de um fotógrafo, com depoimento em vídeo' },
        { en: 'Opening wordmark', pt: 'Wordmark de abertura' },
      ],
      mobile: { count: 3, height: 1214 },
    },
    order: 9,
    description: {
      en: 'Year-end photojournalism retrospective for Zero Hora: eight staff photographers, each contributing one image from the May 2024 Rio Grande do Sul floods. Scroll-driven editorial gallery with sticky wordmark and embedded video testimonials.',
      pt: 'Retrospectiva fotojornalística de fim de ano da Zero Hora: oito fotógrafos do quadro, uma imagem de cada sobre as enchentes de maio de 2024 no Rio Grande do Sul. Galeria editorial comandada pelo scroll, com wordmark fixo e depoimentos em vídeo.',
    },
    stats: [
      { value: '8', label: { en: 'photographers', pt: 'fotógrafos' } },
      { value: '2024', label: { en: 'flood retrospective', pt: 'retrospectiva das enchentes' } },
      { value: 'scroll', label: { en: 'driven', pt: 'driven' } },
    ],
    pitch: {
      en: '*Zero Hora’s 2024 photo retrospective*: eight staff photographers, one image each from the May floods, told as a single first-person record.',
      pt: 'A *retrospectiva fotográfica 2024* da Zero Hora: oito fotógrafos do quadro, uma foto de cada sobre as enchentes de maio, costuradas num único relato em primeira pessoa.',
    },
    whatShipped: {
      en: 'A Vite-built React SPA, statically exported and served under `/especiais/fotos-do-ano-2024/`. Each section pairs a featured flood photograph, a first-person caption from the photographer, an embedded video testimonial from that same photographer, and a black-and-white portrait headshot. Typography in Hepta Slab via Google Fonts.',
      pt: 'SPA em React + Vite, exportada como estática e servida em `/especiais/fotos-do-ano-2024/`. Cada seção junta uma foto-destaque das enchentes, uma legenda em primeira pessoa do fotógrafo, um depoimento em vídeo do próprio e um retrato em preto-e-branco. Tipografia em Hepta Slab via Google Fonts.',
    },
    trick: {
      en: 'The *scroll-driven sticky wordmark*, ‘ZEROHORA — fotos do ano 2024’, stays fixed over the hero, tracks scroll position, fades, repositions to each photographer panel’s top-right kicker, and *switches color from peach to white* as dark-background photo panels slide underneath. The layout alternates full-bleed photographic panels with peach narrative panels to pace the disaster narrative.',
      pt: 'O *wordmark fixo, comandado pelo scroll*, ‘ZEROHORA — fotos do ano 2024’, fica preso sobre a hero, acompanha o rolar da página, desbota, se reposiciona no canto superior direito de cada painel de fotógrafo e *muda de cor, de pêssego para branco*, quando passa por cima de painéis de fundo escuro. O layout alterna painéis fotográficos sangrando até a borda com painéis narrativos em pêssego, dando o ritmo da narrativa do desastre.',
    },
    techStack: ['React', 'Vite', 'TailwindCSS', 'Framer Motion'],
  },
  // Kevin's own public repositories. Every fact and number below comes from the
  // repository's README as of 2026-11-12, the date of the commit it was read at.
  {
    id: 'promptfall',
    kind: { en: 'idle RPG plugin', pt: 'plugin de RPG idle' },
    line: {
      en: 'An idle RPG above the Claude Code prompt: each tool call Claude makes spawns an enemy.',
      pt: 'Um RPG idle acima do prompt do Claude Code: cada chamada de ferramenta gera um inimigo.',
    },
    body: {
      en: 'A Claude Code plugin. Each tool call Claude makes spawns an enemy, a turn with ten or more ends in a turn boss, and each prompt is a short rest. Under the band, a pane holds the long game: heroes, a market, chat, leaderboards, a world boss every three hours. One integer-only simulation runs on client and server.',
      pt: 'Um plugin do Claude Code. Cada chamada de ferramenta do Claude gera um inimigo, um turno com dez ou mais termina num chefe de turno, e cada prompt é um descanso curto. Abaixo da faixa, um painel guarda o jogo longo: heróis, mercado, chat, rankings e um chefe mundial a cada três horas. Uma só simulação, só com aritmética inteira, roda no cliente e no servidor.',
    },
    slug: 'promptfall',
    title: { en: 'Promptfall', pt: 'Promptfall' },
    year: 2026,
    origin: 'personal',
    order: 5,
    // Shown through the `project.personal` label, since `origin` is personal.
    client: 'Kevin Shibuya',
    // The README: features start as a spec and decisions, agents in Claude Code build the tickets, the owner reviews each batch.
    role: { en: 'specs, decisions, review', pt: 'specs, decisões, revisão' },
    team: { en: 'solo, with Claude Code agents', pt: 'solo, com agentes do Claude Code' },
    status: 'building',
    summary: {
      en: 'An idle fantasy RPG that runs inside Claude Code as a plugin, where a party of three heroes fights above the prompt while Claude works.',
      pt: 'Um RPG de fantasia idle que roda dentro do Claude Code como plugin: um grupo de três heróis luta acima do prompt enquanto o Claude trabalha.',
    },
    result: {
      en: 'Twelve zones at three tiers, 40 item bases, 72 enemies, and 457 tests in the sim alone',
      pt: 'Doze zonas em três níveis, 40 bases de item, 72 inimigos e 457 testes só na simulação',
    },
    shots: {
      desktop: [
        { en: 'The Market tab, drawn as windows in a baked-in pixel font', pt: 'A aba Mercado, desenhada em janelas com uma fonte pixelada embutida' },
        { en: 'The 40 item bases', pt: 'As 40 bases de item' },
        { en: 'A zone boss under a tall prompt: the stage shrinks to fit', pt: 'Um chefe de zona sob um prompt alto: o palco encolhe para caber' },
        { en: 'The Promptwyrm, one of four world bosses', pt: 'O Promptwyrm, um dos quatro chefes mundiais' },
        { en: 'When Claude compacts its context, the party camps and heals', pt: 'Quando o Claude compacta o contexto, o grupo acampa e se cura' },
        { en: 'A legendary drop rises out of the chest', pt: 'Um item lendário sobe do baú' },
        { en: 'The Heroes tab: the roster, stats and gear', pt: 'A aba Heróis: o elenco, os atributos e o equipamento' },
        { en: 'The four classes in their drawn poses', pt: 'As quatro classes em suas poses desenhadas' },
      ],
      mobile: { count: 1, height: 1253 },
    },
    description: {
      en: 'Promptfall, an idle fantasy RPG that runs inside Claude Code as a plugin: each tool call spawns an enemy, each prompt rests the party, and a pane holds a market, chat, leaderboards and a world boss. A work in progress: the public server is offline, so the game runs on an in-process server or one you host.',
      pt: 'Promptfall, um RPG de fantasia idle que roda dentro do Claude Code como plugin: cada chamada de ferramenta gera um inimigo, cada prompt dá descanso ao grupo, e um painel reúne mercado, chat, rankings e um chefe mundial. Em andamento: o servidor público está fora do ar, então o jogo roda no servidor embutido no plugin ou num que você hospede.',
    },
    stats: [
      { value: '12', label: { en: 'zones', pt: 'zonas' } },
      { value: '40', label: { en: 'item bases', pt: 'bases de item' } },
      { value: '72', label: { en: 'enemies', pt: 'inimigos' } },
    ],
    pitch: {
      en: 'An *idle RPG* in the band above the Claude Code prompt: Claude’s tool calls spawn the enemies, and its first rule is that *the game never gets in the way of the work*.',
      pt: 'Um *RPG idle* na faixa acima do prompt do Claude Code: as chamadas de ferramenta do Claude geram os inimigos, e a primeira regra é que *o jogo nunca atrapalha o trabalho*.',
    },
    whatShipped: {
      en: 'A *Claude Code plugin* that draws the band and the pane, and a host that is *one Node program on SQLite*, shipped as a Docker image behind Caddy. The band draws one scene three ways (a pixel image in Ghostty and kitty, half-block text cells in other terminals, an SVG on the desktop app), checked by 83 golden scenarios. The public server is offline for now, so the game runs on the in-process server or one you host; the public listing, hero skills, the challenge tower and PvP do not exist yet.',
      pt: 'Um *plugin do Claude Code* que desenha a faixa e o painel, e um host que é *um só programa Node sobre SQLite*, entregue como imagem Docker atrás do Caddy. A faixa desenha a mesma cena de três jeitos (imagem em pixels no Ghostty e no kitty, células de meio bloco nos outros terminais, um SVG no app desktop), conferidos por 83 cenários golden. O servidor público está fora do ar por enquanto, então o jogo roda no servidor embutido no plugin ou num que você hospede; a listagem pública, as habilidades dos heróis, a torre de desafios e o PvP ainda não existem.',
    },
    trick: {
      en: 'The server cannot see Claude’s tools, failures or compactions, only a batch a client claims. So the four *reactive events* (Haste, Enrage, Camp, Guard) shape the fight and *never change rewards*: an event that paid would be the first thing a script could farm. The same integer-only sim runs on both sides, so the server replays every batch and rolls every drop. And saves *migrate by snapshot transform*: the sim is at version 19, and each bump ships a migration with golden fixtures.',
      pt: 'O servidor não enxerga as ferramentas, as falhas nem as compactações do Claude, só o lote que um cliente diz ter jogado. Por isso os quatro *eventos reativos* (Haste, Enrage, Camp, Guard) mudam a luta e *nunca mudam a recompensa*: um evento que pagasse seria a primeira coisa que um script iria farmar. A mesma simulação de aritmética inteira roda dos dois lados, então o servidor refaz cada lote e sorteia cada drop. E os saves *migram por transformação de snapshot*: a simulação está na versão 19, e cada versão nova traz uma migração com fixtures golden.',
    },
    techStack: ['TypeScript', 'Node.js', 'Claude Code plugins', 'SQLite', 'Zod', 'Vitest', 'Docker', 'Caddy', 'Cloudflare R2'],
    githubUrl: 'https://github.com/kevinshibuya/promptfall',
  },
]
