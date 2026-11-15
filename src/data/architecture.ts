import type { Bilingual } from '../types/content'

/**
 * How a project is put together, as a few pipelines read left to right.
 * `outside` marks a service the project does not own; `store` marks where
 * the data rests. Every name here comes from the project's own notes.
 */
export interface ArchNode {
  label: string | Bilingual
  sub?: string | Bilingual
  kind?: 'own' | 'outside' | 'store'
}

export interface ArchLane {
  label: Bilingual
  nodes: ArchNode[]
}

export interface Architecture {
  lanes: ArchLane[]
  caption: Bilingual
}

export const architectures: Record<string, Architecture> = {
  'radar-legislativo': {
    lanes: [
      {
        label: { en: 'ingest, every night', pt: 'ingestão, toda noite' },
        nodes: [
          { label: { en: 'Câmara open data', pt: 'dados da Câmara' }, sub: { en: 'REST and CSV', pt: 'REST e CSV' }, kind: 'outside' },
          { label: 'scraper', sub: { en: 'cron, 03:00', pt: 'cron, 03:00' } },
          { label: 'PostgreSQL 17', sub: 'TypeORM', kind: 'store' },
        ],
      },
      {
        label: { en: 'draft', pt: 'rascunho' },
        nodes: [
          { label: { en: 'a voting', pt: 'uma votação' }, sub: { en: 'pending', pt: 'pendente' }, kind: 'store' },
          { label: { en: 'Bull queue', pt: 'fila Bull' }, sub: 'Redis' },
          { label: 'OpenAI API', sub: { en: 'models rotate', pt: 'modelos em rodízio' }, kind: 'outside' },
          { label: { en: 'summary', pt: 'resumo' }, sub: { en: 'generated', pt: 'gerado' }, kind: 'store' },
        ],
      },
      {
        label: { en: 'review and publish', pt: 'revisão e publicação' },
        nodes: [
          { label: { en: 'back office', pt: 'back-office' }, sub: 'Next.js 16' },
          { label: { en: 'an editor', pt: 'um editor' }, sub: { en: 'approves it', pt: 'aprova' } },
          { label: 'camara-api', sub: 'NestJS 11' },
          { label: { en: 'public site', pt: 'site público' }, sub: 'React 19, Vite' },
        ],
      },
    ],
    caption: {
      en: 'Postgres is the source of truth: each summary is a row that moves from pending to generated to approved. The back office writes to it directly; the public site reads only what was approved.',
      pt: 'O Postgres é a fonte da verdade: cada resumo é uma linha que passa de pendente a gerado e a aprovado. O back-office escreve direto nele; o site público lê só o que foi aprovado.',
    },
  },
  'enquetes-gzh': {
    lanes: [
      {
        label: { en: 'publish a poll', pt: 'publicar uma enquete' },
        nodes: [
          { label: { en: 'an editor', pt: 'um editor' }, sub: { en: 'Google sign-in', pt: 'login Google' }, kind: 'outside' },
          { label: { en: 'back office', pt: 'back-office' }, sub: 'React 18, Vite' },
          { label: 'Cloud Firestore', sub: 'surveys', kind: 'store' },
          { label: { en: 'embed snippet', pt: 'snippet de embed' }, sub: { en: 'into the CMS', pt: 'para o CMS' } },
        ],
      },
      {
        label: { en: 'vote', pt: 'votar' },
        nodes: [
          { label: { en: 'an article', pt: 'uma matéria' }, sub: 'GZH', kind: 'outside' },
          { label: { en: 'embed widget', pt: 'widget de embed' }, sub: { en: 'in an iframe', pt: 'em um iframe' } },
          { label: { en: 'the vote', pt: 'o voto' }, sub: { en: 'keyed by device', pt: 'chave: o aparelho' }, kind: 'store' },
          { label: { en: 'the tally', pt: 'a contagem' }, sub: 'increment()', kind: 'store' },
        ],
      },
      {
        label: { en: 'watch it live', pt: 'acompanhar ao vivo' },
        nodes: [
          { label: 'Cloud Firestore', sub: 'onSnapshot', kind: 'store' },
          { label: { en: 'every open widget', pt: 'todo widget aberto' }, sub: { en: 'live counts', pt: 'contagem ao vivo' } },
        ],
      },
    ],
    caption: {
      en: 'Two static apps over one Firestore. A vote is stored under the reader’s device id, so checking for a duplicate is one read, and every open widget listens to the poll’s document for live counts.',
      pt: 'Dois apps estáticos sobre um Firestore. O voto é gravado sob o id do aparelho do leitor, então checar duplicidade é uma única leitura, e todo widget aberto escuta o documento da enquete para a contagem ao vivo.',
    },
  },
  'painel-da-reconstrucao': {
    lanes: [
      {
        label: { en: 'data', pt: 'dados' },
        nodes: [
          { label: 'data.json', sub: { en: '517 budget actions', pt: '517 ações de orçamento' }, kind: 'store' },
          { label: { en: 'data hook', pt: 'hook de dados' }, sub: { en: 'one fetch', pt: 'um fetch' } },
          { label: { en: 'calculators', pt: 'calculadoras' }, sub: { en: 'memoised', pt: 'memoizadas' } },
          { label: { en: 'charts and map', pt: 'gráficos e mapa' }, sub: 'Highcharts, Leaflet' },
        ],
      },
      {
        label: { en: 'news', pt: 'notícias' },
        nodes: [
          { label: 'GZH CMS', sub: 'GraphQL', kind: 'outside' },
          { label: 'Apollo Client' },
          { label: { en: 'latest news', pt: 'últimas notícias' }, sub: { en: 'on each theme', pt: 'em cada tema' } },
        ],
      },
      {
        label: { en: 'ship', pt: 'publicação' },
        nodes: [
          { label: 'next build', sub: { en: 'static export', pt: 'export estático' } },
          { label: { en: 'storage bucket', pt: 'bucket' }, sub: 'Google Cloud', kind: 'outside' },
          { label: 'Azion', sub: { en: 'edge CDN', pt: 'CDN na edge' }, kind: 'outside' },
          { label: 'GZH', sub: { en: 'for subscribers', pt: 'para assinantes' }, kind: 'outside' },
        ],
      },
    ],
    caption: {
      en: 'There is no server. The newsroom commits one JSON file; the app derives every total, segment and chart from it in the browser, and the build is a folder of static files on an edge CDN.',
      pt: 'Não há servidor. A redação commita um arquivo JSON; o app deriva dele, no navegador, cada total, segmento e gráfico, e o build é uma pasta de arquivos estáticos em uma CDN na edge.',
    },
  },
  'chat-da-hora': {
    lanes: [
      {
        label: { en: 'ask', pt: 'perguntar' },
        nodes: [
          { label: { en: 'a question', pt: 'uma pergunta' }, sub: { en: 'in Portuguese', pt: 'em português' }, kind: 'outside' },
          { label: { en: 'chat client', pt: 'cliente de chat' }, sub: 'React 18, Vite' },
          { label: { en: 'n8n workflow', pt: 'workflow n8n' }, sub: 'Azure OpenAI' },
        ],
      },
      {
        label: { en: 'answer', pt: 'responder' },
        nodes: [
          { label: 'query builder', sub: { en: 'one SQL template', pt: 'um molde de SQL' } },
          { label: 'BigQuery', sub: 'LIMIT 20', kind: 'outside' },
          { label: 'insight builder', sub: { en: 'reads the rows', pt: 'lê as linhas' } },
          { label: { en: 'the answer', pt: 'a resposta' }, sub: 'Markdown', kind: 'store' },
        ],
      },
    ],
    caption: {
      en: 'Three agents, each with one job. The first may only fill one SQL template, the executor caps every query at twenty rows, and the last reads the rows under written rules for each field.',
      pt: 'Três agentes, cada um com uma tarefa. O primeiro só pode preencher um molde de SQL, o executor limita toda consulta a vinte linhas, e o último lê as linhas sob regras escritas para cada campo.',
    },
  },
}

/** What a reader should know about the pictures of a project before trusting them. */
export const mediaNotes: Record<string, Bilingual> = {
  'chat-da-hora': {
    en: 'The answer on screen is illustrative: the live pipeline runs only inside the RBS network.',
    pt: 'A resposta na tela é ilustrativa: o pipeline real só roda dentro da rede da RBS.',
  },
}
