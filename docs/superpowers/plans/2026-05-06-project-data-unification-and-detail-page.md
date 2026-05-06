# Project Data Unification + Modular Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **CRITICAL — checkbox discipline (per CLAUDE.md):** After each step's command/edit lands successfully, the implementer MUST `Edit` the corresponding `- [ ]` to `- [x]` in this file BEFORE moving to the next step. Do not batch ticks at the end of a task. The same rule applies to the matching `## TODO` boxes in `docs/superpowers/specs/2026-05-06-project-data-unification-and-detail-page-design.md` — those tick when the relevant task lands and visual/automated verification passes.

**Goal:** Centralize all 8 portfolio projects into a single ranked list, restructure Selected Work + Archive around an explicit `highlight` flag, and replace the bland `/projects/:slug` page with a modular block-driven detail page that matches the rest of the site's animation grammar.

**Architecture:** Extend `Project` with `highlight`/`highlightOrder` and an optional `Block[]` story field. `Projects.tsx` filters to highlights with order ≤ 4. `Archive.tsx` adds a new `featured` sort that pins highlights at the top, becomes the default, and renders highlight rows with cream bg + blue stripe + ★. `/projects/:slug` rebuilds around `Hero`, `Cover`, a `BlockRenderer` over 9 typed blocks, and a Framer Motion entrance choreography (back → eyebrow → title char-split → tagline word-stagger → CTAs → stats → cover scale-in). Per-project hand-curated content lives in `src/data/projects.ts`; screenshots in `public/images/projects/<slug>/`.

**Tech Stack:** React 19, TypeScript strict, Vite 6, TailwindCSS v4, Framer Motion v12, Vitest 4, Playwright 1.59, react-i18next.

**Spec:** `docs/superpowers/specs/2026-05-06-project-data-unification-and-detail-page-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/types/content.ts` | edit | Adds `Bilingual`, `Stat`, `ScreenshotPair`, `RouteEntry`, `FigureSrc`, `Block` (tagged union), `ProjectType`. Extends `Project` with optional ranking + content fields. Keeps legacy `featured` until cleanup. |
| `src/utils/animations.ts` | edit | Adds 6 new variants: `titleCharSplit`, `titleChar`, `taglineWordSplit`, `taglineWord`, `pullquoteStripe`, `pullquoteText`. |
| `src/components/projectDetail/inlineMarkdown.tsx` | new | Pure function `parseInline(text: string): ReactNode[]` — single-pass tokenizer for `**bold**`, `*italic*`, `[label](url)`. |
| `tests/unit/projectDetail/inlineMarkdown.test.ts` | new | Vitest suite covering plain text, bold, italic-as-blue-accent, link, multiple marks in sequence, edge cases (unmatched, empty, escapes-not-supported). |
| `src/data/projects.ts` | rewrite | All 8 projects with `highlight`/`highlightOrder`. Drops `interactive-embeds` and `editorial-cms`. Drops `featured: true` from new entries (legacy field still on type until task 10). |
| `src/components/sections/Projects.tsx` | edit | Filter changes to `highlight && (highlightOrder ?? 99) <= 4`, sorted by `highlightOrder`. |
| `src/data/archive.ts` | edit | `ArchiveItem` gains `highlight?`, `highlightOrder?`. Adds exported `byFeatured(a, b)` comparator. `fromProjects()` carries highlight info. Static export still date-desc-sorted. |
| `tests/unit/data/archive.test.ts` | edit | Update `featuredCount` from 4 → 8. Add cases for `byFeatured`, `highlight` flag on items. |
| `src/components/sections/Archive.tsx` | edit | Adds `featured` to `SortKey`, flips default state to `'featured'`, adds sort branch using `byFeatured`, renders highlight rows with `.archive-row--highlight` class + ★. |
| `src/i18n/locales/en.json` | edit | Adds `sections.archive.sort.featured`. Expands `projectDetail.*`. |
| `src/i18n/locales/pt.json` | edit | Same keys, PT translations. |
| `src/components/projectDetail/blocks/Paragraph.tsx` | new | Renders `paragraph` block — narrow column, inline-markdown rendering, fade-up on scroll. |
| `src/components/projectDetail/blocks/Heading.tsx` | new | Renders `heading` block (h2 or h3). |
| `src/components/projectDetail/blocks/Pullquote.tsx` | new | Renders `pullquote` with stripe-wipe entrance. |
| `src/components/projectDetail/blocks/Divider.tsx` | new | Section break (thin mist hr). |
| `src/components/projectDetail/blocks/Figure.tsx` | new | Renders `figure` with `inset`/`wide`/`bleed` widths. |
| `src/components/projectDetail/blocks/FigurePair.tsx` | new | Two figures side-by-side. |
| `src/components/projectDetail/blocks/FigureGrid.tsx` | new | N-figure grid with stagger. |
| `src/components/projectDetail/blocks/StatRow.tsx` | new | Inline stats row. |
| `src/components/projectDetail/blocks/RouteList.tsx` | new | Optional `<details>` collapsible sitemap list. |
| `src/components/projectDetail/BlockRenderer.tsx` | new | Switch on `block.type`, dispatch to per-block component. Receives `lang`. |
| `src/components/projectDetail/Hero.tsx` | new | Orchestrated mount choreography (back → eyebrow → title char-split → tagline word-stagger → CTAs → stats). |
| `src/components/projectDetail/Cover.tsx` | new | Hero cover image with scale-in entrance; gradient fallback. |
| `src/components/projectDetail/StackSection.tsx` | new | Centered eyebrow + tech chips. |
| `src/components/projectDetail/Footnotes.tsx` | new | Renders `mockedServices` as italic small-text list (only if non-empty). |
| `src/pages/ProjectDetail.tsx` | rewrite | Thin orchestrator: pull project by slug, render Hero → Cover → BlockRenderer (if story) → Stack → RouteList? → Footnotes? → Contact + Footer. Preserves Lenis scroll-reset + lazy chunk warming. |
| `src/index.css` | edit | Adds `.project-detail-*` rules (hero typography, narrow story column, full-bleed breakouts, pullquote stripe, figure caption, route-list details, stat-row, footnotes). Adds `.archive-row--highlight` (cream bg, blue inset stripe) + `.archive-star` (blue ★, 14px). |
| `public/images/projects/<slug>/desktop/*.png` | new | Hand-copied screenshots, per highlight at minimum. |
| `public/images/projects/<slug>/mobile/*.png` | new | Mobile screenshots. |

---

## Task 1: Foundation — types + animation variants

**Files:**
- Modify: `src/types/content.ts`
- Modify: `src/utils/animations.ts`

**Acceptance criteria:**
- `npm run build` is clean (no TS errors, no warnings).
- `npm run test:unit` passes (existing tests are unaffected; new fields are optional, new variants are pure additions).
- No runtime behavior changes.

- [x] **Step 1: Extend `src/types/content.ts`** — add new types and optional fields. Replace the existing file content with:

```ts
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

export type ProjectType = 'shipped' | 'learning'

export interface Bilingual {
  en: string
  pt: string
}

export interface Stat {
  value: string
  label: Bilingual
}

export interface ScreenshotPair {
  desktop?: string
  mobile?: string
  alt?: Bilingual
  route?: string
}

export interface RouteEntry {
  path: string
  label: string
}

export interface FigureSrc {
  src: string
  alt?: Bilingual
  caption?: Bilingual
}

export type Block =
  | { type: 'paragraph'; text: Bilingual }
  | { type: 'heading'; level: 2 | 3; text: Bilingual }
  | { type: 'pullquote'; text: Bilingual; attribution?: string }
  | { type: 'divider' }
  | {
      type: 'figure'
      src: string
      alt?: Bilingual
      caption?: Bilingual
      width: 'inset' | 'wide' | 'bleed'
    }
  | { type: 'figure-pair'; left: FigureSrc; right: FigureSrc }
  | { type: 'figure-grid'; items: FigureSrc[] }
  | { type: 'stat-row'; stats: Stat[] }
  | { type: 'route-list'; routes: RouteEntry[]; collapsible?: boolean }

export interface Project {
  // identity
  id: string
  slug: string
  title: Bilingual
  year: number

  // ranking
  highlight: boolean
  highlightOrder?: number

  // bento surface
  size?: BentoSize
  gradient?: string
  dark?: boolean

  // hero copy
  tagline?: Bilingual
  description: Bilingual
  stats?: Stat[]

  // links + meta
  liveUrl?: string
  githubUrl?: string
  techStack: string[]
  projectType?: ProjectType
  mockedServices?: string[]
  routes?: RouteEntry[]

  // visual
  coverImage: string
  images: string[]
  screenshots?: ScreenshotPair[]

  // story
  story?: Block[]

  // legacy — removed in task 10
  featured?: boolean
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

export type ArchiveKind = 'featured' | 'editorial' | 'personal' | 'oss' | 'freelance'

export interface ArchiveItem {
  id: string
  kind: ArchiveKind
  title: string | Bilingual
  type?: EmbedType
  editorial?: string
  date: string
  sortDate: number
  href: string
  internal: boolean
  gradient: string
  highlight?: boolean
  highlightOrder?: number
}

export function resolveTitle(item: ArchiveItem, lang: 'en' | 'pt'): string {
  if (typeof item.title === 'string') return item.title
  return item.title[lang]
}
```

- [x] **Step 2: Run build to verify types compile**

Run: `npm run build`
Expected: PASS — no TS errors. Existing entries in `src/data/projects.ts` still satisfy `Project` because `highlight` is the only new required field … wait — `highlight` is required. The current 4 entries lack it, so the build will fail at this step.

Fix in this same step: add a single `highlight: false` to each existing entry in `src/data/projects.ts` to keep the build green. Edit `src/data/projects.ts` and add `highlight: false,` after the `featured: true,` line on each of the 4 existing entries. (We will rewrite the whole file in Task 3; this is a temporary keep-alive.)

Re-run `npm run build`. Expected: PASS.

- [x] **Step 3: Add motion variants to `src/utils/animations.ts`** — append the following inside the file, after the existing `staggerContainer` and `REDUCED_MOTION_VARIANT` exports (do not modify any existing exports):

```ts
import type { Variants as _Variants } from 'framer-motion'

// --- Project detail page variants ---

export const titleCharSplit: _Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.2 },
  },
}

export const titleChar: _Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export const taglineWordSplit: _Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.5 },
  },
}

export const taglineWord: _Variants = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteStripe: _Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteText: _Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}
```

Note: The file already imports `Variants` at the top; you can drop the duplicate import alias if it conflicts. If the existing import is `import type { Variants, Transition } from 'framer-motion'`, just write the variants as `: Variants` instead of `: _Variants` and skip the alias import.

- [x] **Step 4: Run build + tests**

Run: `npm run build && npm run test:unit`
Expected: build PASS, all unit tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/types/content.ts src/utils/animations.ts src/data/projects.ts
git commit -m "feat(types,anim): add Project ranking + content types and detail-page variants

- Adds Bilingual, Stat, ScreenshotPair, RouteEntry, FigureSrc, Block types
- Extends Project with highlight, highlightOrder, story, screenshots, routes,
  mockedServices, projectType, stats (all optional except highlight)
- Adds 6 Framer Motion variants for the project detail page choreography
- Temporary highlight: false on existing 4 entries to keep build green;
  full data rewrite lands in the next task

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Inline markdown parser (TDD)

**Files:**
- Create: `src/components/projectDetail/inlineMarkdown.tsx`
- Create: `tests/unit/projectDetail/inlineMarkdown.test.ts`

**Acceptance criteria:**
- New tests pass; existing tests unaffected.
- Parser handles `**bold**`, `*italic*`, `[label](url)`, plain text, mixed sequences, unmatched markers (rendered as literal text), and empty input.

- [x] **Step 1: Write the failing test**

Create `tests/unit/projectDetail/inlineMarkdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseInline } from '../../../src/components/projectDetail/inlineMarkdown'

function html(text: string): string {
  return renderToStaticMarkup(<>{parseInline(text)}</>)
}

describe('parseInline', () => {
  it('renders plain text untouched', () => {
    expect(html('hello world')).toBe('hello world')
  })

  it('renders **bold** as <strong>', () => {
    expect(html('a **bold** b')).toBe('a <strong>bold</strong> b')
  })

  it('renders *italic* as <em>', () => {
    expect(html('a *italic* b')).toBe('a <em>italic</em> b')
  })

  it('renders [label](url) as anchor with target=_blank', () => {
    expect(html('go to [home](https://x.test)')).toBe(
      'go to <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">home</a>'
    )
  })

  it('handles multiple marks in one string', () => {
    expect(html('**bold** and *italic* and [link](https://x.test)')).toBe(
      '<strong>bold</strong> and <em>italic</em> and <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">link</a>'
    )
  })

  it('renders unmatched markers as literal text', () => {
    expect(html('a *missing close')).toBe('a *missing close')
    expect(html('[label](missing-paren')).toBe('[label](missing-paren')
  })

  it('returns empty array for empty string', () => {
    expect(parseInline('')).toEqual([])
  })

  it('does not treat ** as inline italic followed by another *', () => {
    // **bold** beats *italic* by alternation order
    expect(html('**a**')).toBe('<strong>a</strong>')
  })
})
```

This test file uses TSX (React fragment syntax) but Vitest's default JSX runtime needs the file to be `.tsx`. Rename to `tests/unit/projectDetail/inlineMarkdown.test.tsx` instead — the harness already supports both.

- [x] **Step 2: Run test — confirm it fails for missing module**

Run: `npm run test:unit -- inlineMarkdown`
Expected: FAIL — "Cannot find module '../../../src/components/projectDetail/inlineMarkdown'".

- [x] **Step 3: Implement the parser**

Create `src/components/projectDetail/inlineMarkdown.tsx`:

```tsx
import type { ReactNode } from 'react'

// Single-pass tokenizer: walks the string and emits ReactNode tokens for
// **bold**, *italic*, [label](url), and plain text. No nested marks. Unmatched
// markers fall through as literal text.

const BOLD = /^\*\*([^*]+?)\*\*/
const ITALIC = /^\*([^*]+?)\*/
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/

export function parseInline(input: string): ReactNode[] {
  if (!input) return []

  const out: ReactNode[] = []
  let i = 0
  let buffer = ''
  let key = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      out.push(buffer)
      buffer = ''
    }
  }

  while (i < input.length) {
    const rest = input.slice(i)
    const ch = input[i]

    // Try BOLD before ITALIC because both start with `*`.
    if (ch === '*') {
      const mB = rest.match(BOLD)
      if (mB) {
        flushBuffer()
        out.push(<strong key={key++}>{mB[1]}</strong>)
        i += mB[0].length
        continue
      }
      const mI = rest.match(ITALIC)
      if (mI) {
        flushBuffer()
        out.push(<em key={key++}>{mI[1]}</em>)
        i += mI[0].length
        continue
      }
    }

    if (ch === '[') {
      const mL = rest.match(LINK)
      if (mL) {
        flushBuffer()
        out.push(
          <a
            key={key++}
            href={mL[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
          >
            {mL[1]}
          </a>
        )
        i += mL[0].length
        continue
      }
    }

    // Fall through — buffer this char as literal text.
    buffer += ch
    i++
  }

  flushBuffer()
  return out
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- inlineMarkdown`
Expected: PASS — all 8 tests pass.

- [x] **Step 5: Commit**

```bash
git add src/components/projectDetail/inlineMarkdown.tsx tests/unit/projectDetail/inlineMarkdown.test.tsx
git commit -m "feat(detail): inline markdown parser for **bold**, *italic*, [link](url)

Pure single-pass tokenizer used by paragraph blocks on the project detail
page. *italic* renders as <em> (styled blue-400 in CSS); links open in a
new tab with rel=noopener noreferrer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Data rewrite — projects.ts + Selected Work filter swap

**Files:**
- Rewrite: `src/data/projects.ts`
- Modify: `src/components/sections/Projects.tsx`

**Acceptance criteria:**
- All 8 projects present, with `highlight` + `highlightOrder` per the locked priority. Bento sizes: painel=`lg`, fotos=`md`, enquetes=`sm`, ia-na-redacao=`sm`. peleia is highlight #5 (no bento size).
- `interactive-embeds` and `editorial-cms` removed.
- Selected Work renders the top 4 highlights in priority order (painel, enquetes, ia-na-redacao, fotos-do-ano).
- `npm run build` passes.
- `npm run dev` shows Selected Work with 4 cards in correct order at `http://localhost:5173`.

- [x] **Step 1: Rewrite `src/data/projects.ts`** — replace the file contents with all 8 projects. Bilingual content for `title`, `tagline`, `description` is the curator's primary authoring surface; the values below are the locked baseline (lowercased, editorial tone per the existing site's voice). PT translations are intentionally close to EN for now and can be polished in a separate authoring pass.

```ts
import type { Project } from '../types/content'

export const projects: Project[] = [
  {
    id: 'painel-da-reconstrucao',
    slug: 'painel-da-reconstrucao',
    title: { en: 'painel da reconstrução', pt: 'painel da reconstrução' },
    year: 2024,
    highlight: true,
    highlightOrder: 1,
    size: 'lg',
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
    coverImage: '',
    images: [],
  },
  {
    id: 'enquetes-gzh',
    slug: 'enquetes-gzh',
    title: { en: 'enquetes gzh', pt: 'enquetes gzh' },
    year: 2026,
    highlight: true,
    highlightOrder: 2,
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
    coverImage: '',
    images: [],
  },
  {
    id: 'ia-na-redacao',
    slug: 'ia-na-redacao',
    title: { en: 'ia na redação', pt: 'ia na redação' },
    year: 2025,
    highlight: true,
    highlightOrder: 3,
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
    coverImage: '',
    images: [],
  },
  {
    id: 'fotos-do-ano-2025',
    slug: 'fotos-do-ano-2025',
    title: { en: 'fotos do ano 2025', pt: 'fotos do ano 2025' },
    year: 2025,
    highlight: true,
    highlightOrder: 4,
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
    coverImage: '',
    images: [],
  },
  {
    id: 'peleia-gre-nal',
    slug: 'peleia-gre-nal',
    title: { en: 'peleia gre-nal', pt: 'peleia gre-nal' },
    year: 2024,
    highlight: true,
    highlightOrder: 5,
    gradient: 'linear-gradient(145deg, #DCF0FF, #6DB8FF)',
    tagline: {
      en: 'the porto alegre derby, mapped',
      pt: 'o clássico de porto alegre, mapeado',
    },
    description: {
      en: 'An interactive piece on the Gre-Nal — Porto Alegre\'s historic football derby — built for GZH\'s sports editorial.',
      pt: 'Peça interativa sobre o Gre-Nal — o clássico histórico de Porto Alegre — construída para a editoria de esportes da GZH.',
    },
    techStack: ['React', 'TypeScript', 'D3.js'],
    projectType: 'shipped',
    coverImage: '',
    images: [],
  },
  {
    id: 'linha-do-tempo-covid',
    slug: 'linha-do-tempo-covid',
    title: { en: 'linha do tempo covid', pt: 'linha do tempo covid' },
    year: 2021,
    highlight: false,
    gradient: 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
    tagline: {
      en: 'a timeline of the pandemic in rs',
      pt: 'uma linha do tempo da pandemia no rs',
    },
    description: {
      en: 'Interactive timeline of the COVID-19 pandemic in Rio Grande do Sul, with key dates, decisions, and case-count milestones.',
      pt: 'Linha do tempo interativa da pandemia de COVID-19 no Rio Grande do Sul, com datas-chave, decisões e marcos de casos.',
    },
    techStack: ['JavaScript', 'D3.js', 'HTML', 'CSS'],
    projectType: 'shipped',
    coverImage: '',
    images: [],
  },
  {
    id: 'ignite-feed-2024',
    slug: 'ignite-feed-2024',
    title: { en: 'ignite feed', pt: 'ignite feed' },
    year: 2024,
    highlight: false,
    gradient: 'linear-gradient(145deg, #C8D8F0, #8AAADA)',
    tagline: {
      en: 'rocketseat ignite course follow-along',
      pt: 'projeto guiado da rocketseat ignite',
    },
    description: {
      en: 'A LinkedIn-style feed app built as a follow-along for the Rocketseat Ignite React course, focused on component composition and state lifting patterns.',
      pt: 'App de feed estilo LinkedIn construído como projeto guiado do curso Rocketseat Ignite React, focado em composição de componentes e padrões de elevação de estado.',
    },
    techStack: ['React', 'TypeScript', 'Vite', 'CSS Modules'],
    projectType: 'learning',
    coverImage: '',
    images: [],
  },
  {
    id: 'OmniStack-9.0',
    slug: 'OmniStack-9.0',
    title: { en: 'aircnc (omnistack 9)', pt: 'aircnc (omnistack 9)' },
    year: 2019,
    highlight: false,
    gradient: 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
    tagline: {
      en: 'rest + sockets full-stack practice',
      pt: 'prática full-stack com rest + sockets',
    },
    description: {
      en: 'Rocketseat OmniStack Week 9 follow-along — a Node + MongoDB backend with two clients (React web, React Native) syncing in realtime over Socket.io.',
      pt: 'Projeto guiado da OmniStack Week 9 da Rocketseat — backend Node + MongoDB com dois clientes (React web, React Native) sincronizados em tempo real via Socket.io.',
    },
    techStack: ['React', 'React Native', 'Expo', 'Node.js', 'Express', 'MongoDB', 'Socket.io'],
    projectType: 'learning',
    coverImage: '',
    images: [],
  },
]
```

Note: `coverImage: ''` and empty `images: []` are placeholders. Screenshots wire up in Task 9. The page will show a gradient cover until then — verified in the spec's "Cover" section.

- [x] **Step 2: Update Selected Work filter in `src/components/sections/Projects.tsx`** — replace this line (currently around line 21):

```ts
const featured = projects.filter((p) => p.featured)
```

with:

```ts
const featured = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
```

- [x] **Step 3: Run build**

Run: `npm run build`
Expected: PASS — no TS errors. The new entries all satisfy `Project` (highlight required; legacy `featured` field is still on the type but optional).

- [x] **Step 4: Run unit tests — note the archive test will fail at this step**

Run: `npm run test:unit`
Expected: FAIL on `tests/unit/data/archive.test.ts` — `featuredCount` is now 8, not 4. This is correct behavior; we will update the test in Task 4.

- [x] **Step 5: Visual verification**

Run: `npm run dev`. Open `http://localhost:5173/`.
Expected: Selected Work section shows **4 bento cards** in this exact order: painel da reconstrução (large) · enquetes gzh (small) · ia na redação (small) · fotos do ano 2025 (medium). Cards link to `/projects/<slug>` (404 page until detail is rebuilt — that's fine for now). No console errors.

- [x] **Step 6: Commit**

```bash
git add src/data/projects.ts src/components/sections/Projects.tsx
git commit -m "feat(projects): unify data into single ranked list of 8 projects

- All 8 portfolio-snapshot projects in src/data/projects.ts with bilingual
  title/tagline/description, techStack, year, projectType, gradients
- highlight + highlightOrder per locked priority: painel(1) > enquetes(2) >
  ia-na-redacao(3) > fotos-do-ano(4) > peleia(5)
- Drops interactive-embeds and editorial-cms placeholders
- Selected Work now filters to highlight && highlightOrder <= 4, sorted by
  highlightOrder asc — preserves the 4-card 1lg/1md/2sm bento layout
- Cover images and story blocks left empty for now (wired in task 9)

The archive unit test will fail until task 4 updates its expectations.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Archive plumbing — extend `ArchiveItem`, add `byFeatured`, update tests

**Files:**
- Modify: `src/data/archive.ts`
- Modify: `tests/unit/data/archive.test.ts`

**Acceptance criteria:**
- `ArchiveItem` carries `highlight` and `highlightOrder` from the source `Project`.
- A pure exported `byFeatured(a, b): number` comparator returns: highlights before non-highlights, highlights ordered by `highlightOrder` asc, non-highlights ordered by `sortDate` desc.
- `tests/unit/data/archive.test.ts` is updated for the new project count and adds 3 cases for `byFeatured`.
- `npm run test:unit` passes.

- [x] **Step 1: Extend `fromProjects()` in `src/data/archive.ts`** — find this block:

```ts
function fromProjects(): ArchiveItem[] {
  return projects.map((p) => ({
    id: `featured-${p.id}`,
    kind: 'featured' as const,
    title: p.title,
    date: String(p.year),
    sortDate: new Date(`${p.year}-12-31T00:00:00Z`).getTime(),
    href: `/projects/${p.slug}`,
    internal: true,
    gradient: p.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
  }))
}
```

and replace with:

```ts
function fromProjects(): ArchiveItem[] {
  return projects.map((p) => ({
    id: `featured-${p.id}`,
    kind: 'featured' as const,
    title: p.title,
    date: String(p.year),
    sortDate: new Date(`${p.year}-12-31T00:00:00Z`).getTime(),
    href: `/projects/${p.slug}`,
    internal: true,
    gradient: p.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
    highlight: p.highlight,
    highlightOrder: p.highlightOrder,
  }))
}
```

- [x] **Step 2: Add the `byFeatured` comparator at the end of `src/data/archive.ts`** — append:

```ts
// Sort comparator for the new "featured" archive sort key.
// Highlights first (by highlightOrder asc, missing order = 99),
// then non-highlights interleaved by sortDate desc.
export function byFeatured(a: ArchiveItem, b: ArchiveItem): number {
  const aIsH = a.kind === 'featured' && a.highlight === true
  const bIsH = b.kind === 'featured' && b.highlight === true
  if (aIsH && bIsH) {
    return (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99)
  }
  if (aIsH) return -1
  if (bIsH) return 1
  return b.sortDate - a.sortDate
}
```

- [x] **Step 3: Update existing archive tests** — open `tests/unit/data/archive.test.ts`, change line 13 from:

```ts
expect(featuredCount).toBe(4)
```

to:

```ts
expect(featuredCount).toBe(8)
```

- [x] **Step 4: Add `byFeatured` tests** — append the following describe block to `tests/unit/data/archive.test.ts`:

```ts
import { byFeatured } from '../../../src/data/archive'
import type { ArchiveItem } from '../../../src/types/content'

function mkItem(over: Partial<ArchiveItem>): ArchiveItem {
  return {
    id: 'x',
    kind: 'editorial',
    title: 't',
    date: '01/01/2024',
    sortDate: 0,
    href: '#',
    internal: false,
    gradient: '',
    ...over,
  }
}

describe('byFeatured', () => {
  it('puts highlights before non-highlights', () => {
    const h = mkItem({ kind: 'featured', highlight: true, highlightOrder: 3, sortDate: 1 })
    const n = mkItem({ kind: 'editorial', sortDate: 9999 })
    expect(byFeatured(h, n)).toBeLessThan(0)
    expect(byFeatured(n, h)).toBeGreaterThan(0)
  })

  it('orders highlights by highlightOrder ascending', () => {
    const h1 = mkItem({ kind: 'featured', highlight: true, highlightOrder: 1 })
    const h2 = mkItem({ kind: 'featured', highlight: true, highlightOrder: 2 })
    expect(byFeatured(h1, h2)).toBeLessThan(0)
    expect(byFeatured(h2, h1)).toBeGreaterThan(0)
  })

  it('orders non-highlights by sortDate desc', () => {
    const a = mkItem({ kind: 'editorial', sortDate: 100 })
    const b = mkItem({ kind: 'editorial', sortDate: 200 })
    expect(byFeatured(a, b)).toBeGreaterThan(0) // a is older, sorts after
    expect(byFeatured(b, a)).toBeLessThan(0)
  })

  it('treats kind=featured without highlight=true as non-highlight', () => {
    const fakeFeatured = mkItem({ kind: 'featured', highlight: false, sortDate: 100 })
    const editorial = mkItem({ kind: 'editorial', sortDate: 200 })
    expect(byFeatured(fakeFeatured, editorial)).toBeGreaterThan(0)
  })
})
```

- [x] **Step 5: Run tests**

Run: `npm run test:unit`
Expected: PASS — all archive tests pass, including the 4 new `byFeatured` cases.

- [x] **Step 6: Run build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/data/archive.ts tests/unit/data/archive.test.ts
git commit -m "feat(archive): carry highlight info on items and add byFeatured comparator

- ArchiveItem.fromProjects copies highlight + highlightOrder from Project
- New byFeatured(a, b) pure comparator: highlights first by order,
  non-highlights by sortDate desc
- Archive test updated for 8 projects (was 4) plus 4 new cases for byFeatured

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Archive UI — `featured` sort, default state, highlight row treatment, i18n

**Files:**
- Modify: `src/components/sections/Archive.tsx`
- Modify: `src/index.css`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

**Acceptance criteria:**
- Archive defaults to `featured` sort on page load.
- Sort dropdown lists `featured` first, then `newest`, `oldest`, `az`, `za`.
- Highlight rows render with cream bg + 3px blue-400 left stripe + leading ★ on title; non-highlight rows unchanged.
- Hover behavior: highlight rows stay cream (don't darken to sand on hover); non-highlight rows still darken to sand on hover.
- All 5 highlights pin to the top in priority order.
- `npm run build` passes; visual smoke at `/` shows correct ordering and styling.

- [x] **Step 1: Add `featured` to the SortKey union and flip default state in `src/components/sections/Archive.tsx`** — find these lines:

```ts
type SortKey = 'newest' | 'oldest' | 'az' | 'za'
```

```ts
const [sort, setSort] = useState<SortKey>('newest')
```

and update:

```ts
type SortKey = 'featured' | 'newest' | 'oldest' | 'az' | 'za'
```

```ts
const [sort, setSort] = useState<SortKey>('featured')
```

- [x] **Step 2: Add the featured sort branch and import** — at the top of the file, change the `archive` import line from:

```ts
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
  archiveKinds,
} from '../../data/archive'
```

to:

```ts
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
  archiveKinds,
  byFeatured,
} from '../../data/archive'
```

Then in the `filtered` useMemo, find the existing sort chain (the `if (sort === 'newest')` block) and prepend a `featured` branch:

```ts
if (sort === 'featured') result = [...result].sort(byFeatured)
else if (sort === 'newest') result = [...result].sort((a, b) => b.sortDate - a.sortDate)
else if (sort === 'oldest') result = [...result].sort((a, b) => a.sortDate - b.sortDate)
else if (sort === 'az')
  result = [...result].sort((a, b) =>
    resolveTitle(a, lang).localeCompare(resolveTitle(b, lang), collation)
  )
else if (sort === 'za')
  result = [...result].sort((a, b) =>
    resolveTitle(b, lang).localeCompare(resolveTitle(a, lang), collation)
  )
```

- [x] **Step 3: Add `featured` as the first sort option** — find the `sortOptions` useMemo and update to:

```ts
const sortOptions = useMemo(
  () => [
    { value: 'featured', label: t('sections.archive.sort.featured') },
    { value: 'newest', label: t('sections.archive.sort.newest') },
    { value: 'oldest', label: t('sections.archive.sort.oldest') },
    { value: 'az', label: t('sections.archive.sort.az') },
    { value: 'za', label: t('sections.archive.sort.za') },
  ],
  [t]
)
```

- [x] **Step 4: Render highlight row treatment in `ArchiveRow`** — find the `ArchiveRow` function. The rendered `<Link>` and `<a>` currently have `className="archive-row"`. Update to add a conditional class and a leading star inside `inner`. Replace the entire `ArchiveRow` body with:

```tsx
function ArchiveRow({ idx, item, lang, reduced }: ArchiveRowProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const num = String(idx + 1).padStart(2, '0')
  const title = resolveTitle(item, lang)
  const isHighlight = item.kind === 'featured' && item.highlight === true
  const delay = reduced ? 0 : Math.min((idx % PAGE_SIZE) * (STAGGER_MS / 1000), 0.4)

  const inner = (
    <>
      <span className="archive-num">{num}</span>
      <div className="archive-preview" style={{ background: item.gradient }} />
      <span className="archive-title">
        {isHighlight && <span className="archive-star" aria-hidden>★</span>}
        {title}
      </span>
      <span className="archive-kind">{item.kind}</span>
      <span className="archive-type">{item.type ? item.type.toLowerCase() : '—'}</span>
      <span className="archive-editorial">{item.editorial ?? '—'}</span>
      <span className="archive-date">{item.date}</span>
      <span className="archive-arrow">↗</span>
    </>
  )

  const motionProps = {
    initial: { opacity: 0, x: reduced ? 0 : -16 },
    animate: inView ? { opacity: 1, x: 0 } : { opacity: 0, x: reduced ? 0 : -16 },
    transition: { duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const, delay },
  }

  const rowClass = `archive-row${isHighlight ? ' archive-row--highlight' : ''}`

  return (
    <motion.div ref={ref} className="archive-row-wrap" {...motionProps}>
      {item.internal ? (
        <Link to={item.href} className={rowClass}>
          {inner}
        </Link>
      ) : (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
          {inner}
        </a>
      )}
    </motion.div>
  )
}
```

- [x] **Step 5: Add CSS rules in `src/index.css`** — append these rules near the existing `.archive-row` rules (search for `.archive-row {` to find the section, add after the existing rules):

```css
.archive-row--highlight {
  background: var(--cream);
  box-shadow: inset 3px 0 0 var(--blue-400);
}
.archive-row--highlight:hover {
  background: var(--cream);
}
.archive-star {
  color: var(--blue-400);
  margin-right: 6px;
  font-size: 14px;
  vertical-align: 1px;
}
```

If `--cream` and `--blue-400` aren't defined, look up the existing variable names in `:root` and substitute the right tokens (e.g. `#F6F9FC` and `#3A96E8`).

- [x] **Step 6: Add i18n strings**

In `src/i18n/locales/en.json`, find the `sections.archive.sort` block and add `featured` as the first key:

```json
"sort": {
  "featured": "featured",
  "newest": "newest first",
  "oldest": "oldest first",
  "az": "a–z",
  "za": "z–a"
}
```

In `src/i18n/locales/pt.json`, do the same:

```json
"sort": {
  "featured": "destaques",
  "newest": "mais recentes",
  "oldest": "mais antigos",
  "az": "a–z",
  "za": "z–a"
}
```

(Verify the existing PT keys for "newest"/"oldest" match what's in the file before saving — only add `featured`, don't reformat the rest.)

- [x] **Step 7: Run build + tests**

Run: `npm run build && npm run test:unit`
Expected: PASS.

- [x] **Step 8: Visual verification**

Run: `npm run dev`. Open `http://localhost:5173/`.

Verify:
1. Archive section sort dropdown defaults to "featured" (or "destaques" with PT toggle).
2. The first 5 rows are the 5 highlights in priority order: painel da reconstrução, enquetes gzh, ia na redação, fotos do ano 2025, peleia gre-nal.
3. Each highlight row has cream background, 3px blue left stripe, and a blue ★ before the title.
4. Hovering a highlight row keeps the cream bg (no darken).
5. Hovering a non-highlight row still darkens to sand (current behavior preserved).
6. Switching sort to "newest" mixes everything by date as before.

- [x] **Step 9: Commit**

```bash
git add src/components/sections/Archive.tsx src/index.css src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(archive): featured sort + highlight row treatment

- Adds 'featured' to SortKey union, becomes default initial sort
- Sort dropdown lists 'featured' first, with i18n keys (en/pt)
- Highlight rows render with cream bg + 3px blue-400 inset stripe + blue
  star prefix on title; hover stays cream so highlights don't darken
- Non-highlight rows unchanged — same sand-on-hover behavior

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 10: Tick spec TODO boxes for the archive work**

In `docs/superpowers/specs/2026-05-06-project-data-unification-and-detail-page-design.md`, tick:
- The `Update src/data/archive.ts` TODO
- The `Add featured to SortKey...` TODO
- The `Render highlight-row treatment...` TODO

(The `archive.sort.featured` i18n key TODO is also covered by this commit; tick it.)

---

## Task 6: Block components

**Files:**
- Create: `src/components/projectDetail/blocks/Paragraph.tsx`
- Create: `src/components/projectDetail/blocks/Heading.tsx`
- Create: `src/components/projectDetail/blocks/Pullquote.tsx`
- Create: `src/components/projectDetail/blocks/Divider.tsx`
- Create: `src/components/projectDetail/blocks/Figure.tsx`
- Create: `src/components/projectDetail/blocks/FigurePair.tsx`
- Create: `src/components/projectDetail/blocks/FigureGrid.tsx`
- Create: `src/components/projectDetail/blocks/StatRow.tsx`
- Create: `src/components/projectDetail/blocks/RouteList.tsx`
- Create: `src/components/projectDetail/BlockRenderer.tsx`

**Acceptance criteria:**
- Each block component is a functional React component with a single `block` prop typed to its specific Block variant, plus `lang: 'en' | 'pt'`.
- Each component owns its own `whileInView` reveal (using `viewport={{ once: true, amount: 0.2 }}`) and respects `useMotion().prefersReducedMotion`.
- `BlockRenderer` exhaustively switches on `block.type`. TypeScript narrows correctly for each case.
- `npm run build` passes (components are unused at this point — that's fine).

- [x] **Step 1: `src/components/projectDetail/blocks/Paragraph.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { parseInline } from '../inlineMarkdown'
import type { Block } from '../../../types/content'

type ParagraphBlock = Extract<Block, { type: 'paragraph' }>

interface Props {
  block: ParagraphBlock
  lang: 'en' | 'pt'
}

export function Paragraph({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.p
      className="project-detail-paragraph"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {parseInline(block.text[lang])}
    </motion.p>
  )
}
```

- [x] **Step 2: `src/components/projectDetail/blocks/Heading.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type HeadingBlock = Extract<Block, { type: 'heading' }>

interface Props {
  block: HeadingBlock
  lang: 'en' | 'pt'
}

export function Heading({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const Tag = `h${block.level}` as 'h2' | 'h3'
  return (
    <motion.div
      className={`project-detail-heading project-detail-heading--h${block.level}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tag>{block.text[lang]}</Tag>
    </motion.div>
  )
}
```

- [x] **Step 3: `src/components/projectDetail/blocks/Pullquote.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { pullquoteStripe, pullquoteText } from '../../../utils/animations'
import type { Block } from '../../../types/content'

type PullquoteBlock = Extract<Block, { type: 'pullquote' }>

interface Props {
  block: PullquoteBlock
  lang: 'en' | 'pt'
}

export function Pullquote({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.blockquote
      className="project-detail-pullquote"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      <motion.span
        className="project-detail-pullquote-stripe"
        variants={prefersReducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : pullquoteStripe}
        aria-hidden
      />
      <motion.span
        className="project-detail-pullquote-text"
        variants={prefersReducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : pullquoteText}
      >
        {block.text[lang]}
      </motion.span>
      {block.attribution && (
        <cite className="project-detail-pullquote-cite">— {block.attribution}</cite>
      )}
    </motion.blockquote>
  )
}
```

- [x] **Step 4: `src/components/projectDetail/blocks/Divider.tsx`**

```tsx
export function Divider() {
  return <hr className="project-detail-divider" />
}
```

- [x] **Step 5: `src/components/projectDetail/blocks/Figure.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type FigureBlock = Extract<Block, { type: 'figure' }>

interface Props {
  block: FigureBlock
  lang: 'en' | 'pt'
}

export function Figure({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.figure
      className={`project-detail-figure project-detail-figure--${block.width}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <img
        src={block.src}
        alt={block.alt?.[lang] ?? ''}
        loading="lazy"
        className="project-detail-figure-img"
      />
      {block.caption && (
        <figcaption className="project-detail-figure-caption">
          {block.caption[lang]}
        </figcaption>
      )}
    </motion.figure>
  )
}
```

- [x] **Step 6: `src/components/projectDetail/blocks/FigurePair.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block, FigureSrc } from '../../../types/content'

type FigurePairBlock = Extract<Block, { type: 'figure-pair' }>

interface Props {
  block: FigurePairBlock
  lang: 'en' | 'pt'
}

function PairItem({ item, lang }: { item: FigureSrc; lang: 'en' | 'pt' }) {
  return (
    <figure className="project-detail-figure-pair-item">
      <img
        src={item.src}
        alt={item.alt?.[lang] ?? ''}
        loading="lazy"
        className="project-detail-figure-img"
      />
      {item.caption && (
        <figcaption className="project-detail-figure-caption">{item.caption[lang]}</figcaption>
      )}
    </figure>
  )
}

export function FigurePair({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.div
      className="project-detail-figure-pair"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <PairItem item={block.left} lang={lang} />
      <PairItem item={block.right} lang={lang} />
    </motion.div>
  )
}
```

- [x] **Step 7: `src/components/projectDetail/blocks/FigureGrid.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { staggerContainer } from '../../../utils/animations'
import type { Block, FigureSrc } from '../../../types/content'

type FigureGridBlock = Extract<Block, { type: 'figure-grid' }>

interface Props {
  block: FigureGridBlock
  lang: 'en' | 'pt'
}

export function FigureGrid({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.div
      className="project-detail-figure-grid"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(0.08)}
    >
      {block.items.map((item: FigureSrc, i: number) => (
        <motion.figure
          key={i}
          className="project-detail-figure-grid-item"
          variants={
            prefersReducedMotion
              ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
              : {
                  hidden: { opacity: 0, scale: 0.96 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }
          }
        >
          <img
            src={item.src}
            alt={item.alt?.[lang] ?? ''}
            loading="lazy"
            className="project-detail-figure-img"
          />
          {item.caption && (
            <figcaption className="project-detail-figure-caption">
              {item.caption[lang]}
            </figcaption>
          )}
        </motion.figure>
      ))}
    </motion.div>
  )
}
```

- [x] **Step 8: `src/components/projectDetail/blocks/StatRow.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { staggerContainer, STAGGER_PRESETS } from '../../../utils/animations'
import type { Block } from '../../../types/content'

type StatRowBlock = Extract<Block, { type: 'stat-row' }>

interface Props {
  block: StatRowBlock
  lang: 'en' | 'pt'
}

export function StatRow({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.dl
      className="project-detail-stat-row"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(STAGGER_PRESETS.statValues)}
    >
      {block.stats.map((s, i) => (
        <motion.div
          key={i}
          className="project-detail-stat"
          variants={
            prefersReducedMotion
              ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
              : {
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }
          }
        >
          <dt className="project-detail-stat-value">{s.value}</dt>
          <dd className="project-detail-stat-label">{s.label[lang]}</dd>
        </motion.div>
      ))}
    </motion.dl>
  )
}
```

- [x] **Step 9: `src/components/projectDetail/blocks/RouteList.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type RouteListBlock = Extract<Block, { type: 'route-list' }>

interface Props {
  block: RouteListBlock
  lang: 'en' | 'pt'
}

export function RouteList({ block, lang: _lang }: Props) {
  // `lang` is part of the unified BlockRenderer signature but route labels
  // are not bilingual in the schema; underscore-prefix satisfies
  // tsconfig.app.json's noUnusedParameters: true.
  void _lang
  const { prefersReducedMotion } = useMotion()
  const Wrapper = block.collapsible ? 'details' : 'div'

  return (
    <motion.div
      className="project-detail-route-list"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.5 }}
    >
      <Wrapper>
        {block.collapsible && (
          <summary className="project-detail-route-list-summary">
            {block.routes.length} routes
          </summary>
        )}
        <ul className="project-detail-route-list-items">
          {block.routes.map((r) => (
            <li key={r.path} className="project-detail-route-list-item">
              <code className="project-detail-route-path">{r.path}</code>
              <span className="project-detail-route-label">{r.label}</span>
            </li>
          ))}
        </ul>
      </Wrapper>
    </motion.div>
  )
}
```

Note: `lang` is destructured into `_lang` and discarded with `void _lang` because tsconfig.app.json has `noUnusedParameters: true`. The `lang` prop stays in `Props` so `BlockRenderer` can pass it uniformly to every block component.

- [x] **Step 10: `src/components/projectDetail/BlockRenderer.tsx`**

```tsx
import type { Block } from '../../types/content'
import { Paragraph } from './blocks/Paragraph'
import { Heading } from './blocks/Heading'
import { Pullquote } from './blocks/Pullquote'
import { Divider } from './blocks/Divider'
import { Figure } from './blocks/Figure'
import { FigurePair } from './blocks/FigurePair'
import { FigureGrid } from './blocks/FigureGrid'
import { StatRow } from './blocks/StatRow'
import { RouteList } from './blocks/RouteList'

interface Props {
  blocks: Block[]
  lang: 'en' | 'pt'
}

export function BlockRenderer({ blocks, lang }: Props) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <Paragraph key={i} block={block} lang={lang} />
          case 'heading':
            return <Heading key={i} block={block} lang={lang} />
          case 'pullquote':
            return <Pullquote key={i} block={block} lang={lang} />
          case 'divider':
            return <Divider key={i} />
          case 'figure':
            return <Figure key={i} block={block} lang={lang} />
          case 'figure-pair':
            return <FigurePair key={i} block={block} lang={lang} />
          case 'figure-grid':
            return <FigureGrid key={i} block={block} lang={lang} />
          case 'stat-row':
            return <StatRow key={i} block={block} lang={lang} />
          case 'route-list':
            return <RouteList key={i} block={block} lang={lang} />
          default: {
            // Exhaustiveness guard
            const _exhaustive: never = block
            return _exhaustive
          }
        }
      })}
    </>
  )
}
```

- [x] **Step 11: Run build**

Run: `npm run build`
Expected: PASS — no TS errors. Components are unused (warnings about unused exports are OK; they get used in Task 7+).

- [ ] **Step 12: Commit**

```bash
git add src/components/projectDetail/
git commit -m "feat(detail): block components and BlockRenderer

Nine functional block components — paragraph, heading, pullquote, divider,
figure, figure-pair, figure-grid, stat-row, route-list — each owning its
own whileInView reveal and reduced-motion fallback. BlockRenderer
exhaustively switches on block.type with a never-guard.

Components are unused until the page rewrite in the next task.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Detail page sub-components — Hero, Cover, StackSection, Footnotes + CSS

**Files:**
- Create: `src/components/projectDetail/Hero.tsx`
- Create: `src/components/projectDetail/Cover.tsx`
- Create: `src/components/projectDetail/StackSection.tsx`
- Create: `src/components/projectDetail/Footnotes.tsx`
- Modify: `src/index.css`

**Acceptance criteria:**
- Hero owns the orchestrated mount choreography (back → eyebrow → title char-split → tagline word-stagger → CTAs → stats), each step delayed by ~0.05–0.1s.
- Cover scales in as the last hero step with a 0.95s offset; falls back to gradient when `coverImage` is empty.
- StackSection renders centered eyebrow + tech chips.
- Footnotes returns null when `mockedServices` is empty.
- CSS additions cover all `.project-detail-*` classes referenced in Task 6 + 7.
- `npm run build` passes.

- [ ] **Step 1: `src/components/projectDetail/Hero.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import {
  titleCharSplit,
  titleChar,
  taglineWordSplit,
  taglineWord,
  REDUCED_MOTION_VARIANT,
} from '../../utils/animations'
import { StatRow } from './blocks/StatRow'
import type { Project } from '../../types/content'

interface Props {
  project: Project
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero({ project, lang }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const title = project.title[lang]
  const tagline = project.tagline?.[lang]

  return (
    <header className="project-detail-hero">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
      >
        <Link to="/" className="project-detail-back">
          ← {t('projectDetail.back')}
        </Link>
      </motion.div>

      <motion.span
        className="project-detail-eyebrow"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
      >
        {project.year}{project.projectType ? ` · ${project.projectType}` : ''}
      </motion.span>

      <motion.h1
        className="project-detail-title"
        variants={prefersReducedMotion ? REDUCED_MOTION_VARIANT : titleCharSplit}
        initial="hidden"
        animate="visible"
        aria-label={title}
      >
        {prefersReducedMotion
          ? title
          : title.split('').map((ch, i) => (
              <motion.span
                key={i}
                variants={titleChar}
                style={{ display: 'inline-block', whiteSpace: ch === ' ' ? 'pre' : 'normal' }}
                aria-hidden
              >
                {ch}
              </motion.span>
            ))}
      </motion.h1>

      {tagline && (
        <motion.p
          className="project-detail-tagline"
          variants={prefersReducedMotion ? REDUCED_MOTION_VARIANT : taglineWordSplit}
          initial="hidden"
          animate="visible"
          aria-label={tagline}
        >
          {prefersReducedMotion
            ? tagline
            : tagline.split(/\s+/).map((word, i) => (
                <motion.span
                  key={i}
                  variants={taglineWord}
                  style={{ display: 'inline-block', marginRight: '0.25em' }}
                  aria-hidden
                >
                  {word}
                </motion.span>
              ))}
        </motion.p>
      )}

      {(project.liveUrl || project.githubUrl) && (
        <motion.div
          className="project-detail-ctas"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.65, ease: EASE }}
        >
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              {t('projectDetail.liveDemo')}
              <span className="btn-arrow">→</span>
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
            >
              {t('projectDetail.sourceCode')}
              <span className="btn-arrow">→</span>
            </a>
          )}
        </motion.div>
      )}

      {project.stats && project.stats.length > 0 && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.75, ease: EASE }}
        >
          <StatRow block={{ type: 'stat-row', stats: project.stats }} lang={lang} />
        </motion.div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: `src/components/projectDetail/Cover.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import type { Project } from '../../types/content'

interface Props {
  project: Project
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Cover({ project, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const hasImage = project.coverImage && project.coverImage.length > 0
  const fallbackBg = project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)'

  return (
    <motion.div
      className="project-detail-cover"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
      style={hasImage ? undefined : { background: fallbackBg }}
    >
      {hasImage ? (
        <img
          src={project.coverImage}
          alt={project.title[lang]}
          loading="eager"
          /* fetchpriority is non-standard in TS — set via setAttribute or omit */
          className="project-detail-cover-img"
        />
      ) : (
        <span className="project-detail-cover-fallback">{project.title[lang]}</span>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 3: `src/components/projectDetail/StackSection.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Tag } from '../ui/Tag'
import { useMotion } from '../../context/MotionContext'
import { staggerContainer } from '../../utils/animations'
import type { Project } from '../../types/content'

interface Props {
  project: Project
}

export function StackSection({ project }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  if (!project.techStack || project.techStack.length === 0) return null

  return (
    <motion.section
      className="project-detail-stack"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(0.04)}
    >
      <h2 className="project-detail-stack-label">{t('projectDetail.stack')}</h2>
      <div className="project-detail-stack-chips">
        {project.techStack.map((tech) => (
          <motion.span
            key={tech}
            variants={
              prefersReducedMotion
                ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                : {
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                  }
            }
          >
            <Tag label={tech.toLowerCase()} variant="pill" />
          </motion.span>
        ))}
      </div>
    </motion.section>
  )
}
```

- [ ] **Step 4: `src/components/projectDetail/Footnotes.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { Project } from '../../types/content'

interface Props {
  project: Project
}

export function Footnotes({ project }: Props) {
  const { t } = useTranslation()
  if (!project.mockedServices || project.mockedServices.length === 0) return null

  return (
    <aside className="project-detail-footnotes">
      <p className="project-detail-footnotes-label">{t('projectDetail.notes')}</p>
      <ul className="project-detail-footnotes-list">
        {project.mockedServices.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 5: Add CSS to `src/index.css`** — append the following block at the end of the file:

```css
/* =====================================================================
 * Project detail page
 * =====================================================================*/

.project-detail-hero {
  padding-top: 160px;
  margin-bottom: 32px;
}

.project-detail-back {
  display: inline-block;
  margin-bottom: 48px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: var(--bark);
  text-decoration: none;
  transition: color 0.2s;
}
.project-detail-back:hover { color: var(--blue-400); }

.project-detail-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin-bottom: 12px;
}

.project-detail-title {
  font-size: clamp(48px, 9vw, 140px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 0.95;
  margin: 0 0 16px;
  text-transform: lowercase;
  color: var(--ink);
}

.project-detail-tagline {
  font-size: clamp(16px, 1.4vw, 20px);
  line-height: 1.4;
  color: var(--bark);
  max-width: 620px;
  margin: 0 0 24px;
}

.project-detail-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.project-detail-stat-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  margin: 24px 0 0;
  padding: 0;
}
.project-detail-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}
.project-detail-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}
.project-detail-stat-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: var(--dust);
  margin: 0;
}

.project-detail-cover {
  border-radius: 18px;
  aspect-ratio: 16 / 9;
  margin: 40px 0;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.project-detail-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.project-detail-cover-fallback {
  color: rgba(26, 21, 18, 0.2);
  font-family: var(--font-sans);
  font-weight: 700;
  text-transform: lowercase;
  font-size: clamp(32px, 4vw, 56px);
}

/* Story column — narrow reading width with full-bleed breakouts */
.project-detail-story {
  max-width: 1280px;
  margin: 0 auto;
}
.project-detail-paragraph,
.project-detail-heading,
.project-detail-pullquote,
.project-detail-route-list,
.project-detail-figure--inset {
  max-width: 620px;
  margin-left: auto;
  margin-right: auto;
}
.project-detail-paragraph {
  font-size: 17px;
  line-height: 1.7;
  color: var(--ink);
  margin: 0 auto 1.4em;
}
.project-detail-paragraph em {
  color: var(--blue-400);
  font-style: italic;
}
.project-detail-paragraph strong {
  font-weight: 600;
  color: var(--ink);
}
.project-detail-paragraph .prose-link {
  color: var(--blue-400);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

.project-detail-heading--h2 h2 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 32px auto 16px;
  text-transform: lowercase;
  color: var(--ink);
}
.project-detail-heading--h3 h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 24px auto 12px;
  text-transform: lowercase;
  color: var(--ink);
}

.project-detail-pullquote {
  position: relative;
  padding: 8px 0 8px 18px;
  margin: 32px auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.project-detail-pullquote-stripe {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--blue-400);
  transform-origin: top;
  display: block;
}
.project-detail-pullquote-text {
  display: block;
  font-style: italic;
  font-size: 22px;
  line-height: 1.4;
  color: var(--blue-400);
}
.project-detail-pullquote-cite {
  font-style: normal;
  font-size: 12px;
  color: var(--dust);
  letter-spacing: 0.08em;
  text-transform: lowercase;
}

.project-detail-divider {
  border: 0;
  border-top: 1px solid var(--mist);
  margin: 48px auto;
  max-width: 620px;
}

/* Figures: inset stays in the column; wide breaks out to story container; bleed = full viewport */
.project-detail-figure { margin: 40px 0; }
.project-detail-figure--inset { width: 100%; }
.project-detail-figure--wide { max-width: 1280px; margin-left: auto; margin-right: auto; }
.project-detail-figure--bleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}
.project-detail-figure-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
}
.project-detail-figure--bleed .project-detail-figure-img { border-radius: 0; }
.project-detail-figure-caption {
  font-size: 12px;
  color: var(--dust);
  letter-spacing: 0.04em;
  margin-top: 8px;
  text-align: center;
}

.project-detail-figure-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 1280px;
  margin: 40px auto;
}
.project-detail-figure-pair-item { margin: 0; }
@media (max-width: 720px) {
  .project-detail-figure-pair { grid-template-columns: 1fr; }
}

.project-detail-figure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  max-width: 1280px;
  margin: 40px auto;
}
.project-detail-figure-grid-item { margin: 0; }

.project-detail-route-list { margin: 32px auto; }
.project-detail-route-list-summary {
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin-bottom: 12px;
}
.project-detail-route-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
  row-gap: 6px;
  column-gap: 16px;
}
.project-detail-route-list-item { display: contents; }
.project-detail-route-path {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--blue-400);
}
.project-detail-route-label {
  font-size: 13px;
  color: var(--bark);
}

.project-detail-stack { text-align: center; margin: 64px 0 32px; }
.project-detail-stack-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin-bottom: 16px;
}
.project-detail-stack-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.project-detail-footnotes {
  max-width: 620px;
  margin: 32px auto;
  font-style: italic;
  color: var(--dust);
}
.project-detail-footnotes-label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-style: normal;
  color: var(--dust);
  margin-bottom: 6px;
}
.project-detail-footnotes-list {
  list-style: disc;
  padding-left: 1.2em;
  font-size: 12px;
  line-height: 1.5;
}
```

If `--ink`, `--bark`, `--dust`, `--cream`, `--mist`, `--blue-400`, `--font-sans` aren't already defined as CSS variables, search `src/index.css` for the existing `:root` block and substitute the right names (the spec's color section lists the hex values: ink `#111822`, bark `#2A4060`, dust `#6A8CAA`, cream `#F6F9FC`, mist `#D4E5F2`, blue-400 `#3A96E8`).

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: PASS — no TS errors. Components are still unused; ProjectDetail.tsx hasn't been updated yet.

- [ ] **Step 7: Commit**

```bash
git add src/components/projectDetail/Hero.tsx src/components/projectDetail/Cover.tsx src/components/projectDetail/StackSection.tsx src/components/projectDetail/Footnotes.tsx src/index.css
git commit -m "feat(detail): hero choreography, cover, stack section, footnotes + CSS

Hero owns the orchestrated mount sequence (back → eyebrow → title char-split
→ tagline word-stagger → CTAs → stats), each delayed against the page mount.
Cover scales in as the last hero step with a gradient fallback when no image.
StackSection renders centered eyebrow + tech chips with stagger; Footnotes
renders mockedServices as italic small text or null when empty.

CSS adds project-detail-* rules: hero typography (clamped title, tagline,
eyebrow), cover styling, narrow 620px story column with inset/wide/bleed
figure widths, pullquote stripe, route-list grid, stack chips, footnotes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Detail page rewrite — `ProjectDetail.tsx` + final i18n + visual verification

**Files:**
- Rewrite: `src/pages/ProjectDetail.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

**Acceptance criteria:**
- `/projects/:slug` for any of the 8 projects renders Hero + Cover + (optional Story) + Stack + (optional RouteList) + (optional Footnotes) + Contact + Footer.
- Hero entrance choreography plays on mount in the order specified.
- Story blocks (when present) reveal on scroll using their own variants.
- Lenis scroll-reset and lazy-Contact/Footer warming behavior is preserved.
- Reduced-motion mode collapses all animations to instant fades.
- 404 path still renders the existing not-found fallback.

- [ ] **Step 1: Rewrite `src/pages/ProjectDetail.tsx`** — replace the file contents with:

```tsx
import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projects } from '../data/projects'
import { useLenis } from '../hooks/useLenis'
import { Hero } from '../components/projectDetail/Hero'
import { Cover } from '../components/projectDetail/Cover'
import { BlockRenderer } from '../components/projectDetail/BlockRenderer'
import { StackSection } from '../components/projectDetail/StackSection'
import { Footnotes } from '../components/projectDetail/Footnotes'
import { RouteList } from '../components/projectDetail/blocks/RouteList'

const Contact = lazy(() =>
  import('../components/sections/Contact').then((m) => ({ default: m.Contact }))
)
const Footer = lazy(() =>
  import('../components/layout/Footer').then((m) => ({ default: m.Footer }))
)

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const { scrollTo } = useLenis()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    scrollTo(0, { immediate: true, force: true })
  }, [scrollTo])

  useEffect(() => {
    const warm = () => {
      void import('../components/sections/Contact')
      void import('../components/layout/Footer')
    }
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (typeof ric === 'function') {
      ric(warm, { timeout: 2000 })
    } else {
      setTimeout(warm, 0)
    }
  }, [])

  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <main>
        <section
          className="section"
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h1 className="section-title" style={{ marginBottom: '16px' }}>
            {t('projectDetail.notFound')}
          </h1>
          <p className="section-desc" style={{ marginBottom: '32px' }}>
            {t('projectDetail.notFoundDescription')}
          </p>
          <Link to="/" className="btn btn--ghost" style={{ alignSelf: 'flex-start' }}>
            ← {t('projectDetail.back')}
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section">
        <Hero project={project} lang={lang} />
        <Cover project={project} lang={lang} />

        {project.story && project.story.length > 0 && (
          <div className="project-detail-story">
            <BlockRenderer blocks={project.story} lang={lang} />
          </div>
        )}

        <StackSection project={project} />

        {project.routes && project.routes.length > 0 && (
          <div className="project-detail-story">
            <RouteList
              block={{
                type: 'route-list',
                routes: project.routes,
                collapsible: project.routes.length > 8,
              }}
              lang={lang}
            />
          </div>
        )}

        <Footnotes project={project} />
      </section>

      <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
        <Contact />
        <Footer />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 2: Add `projectDetail.notes` strings to i18n**

In `src/i18n/locales/en.json`, find the `projectDetail` block and add `notes`:

```json
"projectDetail": {
  "back": "back to projects",
  "year": "year",
  "stack": "tech stack",
  "liveDemo": "live demo",
  "sourceCode": "source code",
  "notes": "notes",
  "notFound": "project not found",
  "notFoundDescription": "the project you're looking for doesn't exist."
}
```

In `src/i18n/locales/pt.json`, do the same with PT translations:

```json
"projectDetail": {
  "back": "voltar aos projetos",
  "year": "ano",
  "stack": "tecnologias",
  "liveDemo": "ver ao vivo",
  "sourceCode": "código fonte",
  "notes": "notas",
  "notFound": "projeto não encontrado",
  "notFoundDescription": "o projeto que você procura não existe."
}
```

(Verify the existing PT projectDetail strings before saving — only add `notes` and don't reformat the rest.)

- [ ] **Step 3: Run build + tests**

Run: `npm run build && npm run test:unit`
Expected: PASS.

- [ ] **Step 4: Visual verification on `/projects/painel-da-reconstrucao`**

Run: `npm run dev`. Navigate to `http://localhost:5173/projects/painel-da-reconstrucao`.

Verify (golden path — data-rich):
1. Page mounts with hero entrance choreography: back link fades in, eyebrow ("2024 · shipped") fades, title "painel da reconstrução" plays a per-character drop-in, tagline plays a per-word fade, CTAs ("live ↗") fade in, stat row (R$ 129B / 19 / 2024) fades in.
2. Cover element appears below the hero with a scale-in. Since `coverImage` is empty, falls back to the blue gradient with the title text overlay.
3. No story column (story is unset for this project — that's expected at this task; it gets authored in Task 9).
4. Stack section renders all 13 tech chips centered.
5. No route list (routes array is unset for this project — wired in Task 9).
6. No footnotes.
7. Scrolling further, Contact + Footer load (existing behavior).

- [ ] **Step 5: Visual verification on `/projects/OmniStack-9.0`** (no `liveUrl`, learning project)

Navigate to `http://localhost:5173/projects/OmniStack-9.0`.
Verify:
1. Hero renders with eyebrow "2019 · learning".
2. No "live demo" CTA (since `liveUrl` is unset). No "source code" CTA either (since `githubUrl` is unset). The CTAs row is omitted entirely.
3. No stats row.
4. Cover falls back to gradient.
5. Stack chips render the 7 listed technologies.
6. No 404, no broken images.

- [ ] **Step 6: Reduced-motion verification**

In Chrome DevTools, open the Rendering panel and set "Emulate CSS media feature prefers-reduced-motion" to "reduce". Reload `/projects/painel-da-reconstrucao`.
Verify:
1. Hero appears all at once with no character split, no word stagger, no scale-in.
2. Cover appears immediately (no scale-in).
3. Stack chips appear without stagger.

- [ ] **Step 7: Mobile viewport verification**

In DevTools, set viewport to 393×852 (iPhone 15 Pro preset). Reload.
Verify:
1. Hero title scales down via the `clamp` rule, stays readable.
2. CTAs wrap if needed.
3. Stat row wraps to 2 rows of 2 if needed.
4. No horizontal scroll.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProjectDetail.tsx src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(detail): rewrite ProjectDetail page using new modular blocks

ProjectDetail.tsx becomes a thin orchestrator: pulls project by slug,
renders Hero + Cover + (optional Story via BlockRenderer) + StackSection +
(optional RouteList) + Footnotes + lazy Contact + Footer. Preserves the
existing Lenis scroll-reset and idle chunk-warming. 404 fallback unchanged.

Adds projectDetail.notes i18n key (en + pt).

Story content and screenshots wire in next task — pages currently render
hero + gradient cover + stack only, which is expected and verified.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Per-project content — screenshots + story authoring

**Files:**
- Create: `public/images/projects/painel-da-reconstrucao/desktop/01-dados-gerais.png` (and 02, 03)
- Create: `public/images/projects/painel-da-reconstrucao/mobile/01-dados-gerais.png` (and 02, 03)
- Create: same shape for `enquetes-gzh`, `ia-na-redacao`, `fotos-do-ano-2025`, `peleia-gre-nal` (5 highlights minimum)
- Modify: `src/data/projects.ts` (set `coverImage`, optionally `screenshots`, `routes`, `mockedServices`, `story` per highlight)

**Acceptance criteria:**
- Each of the 5 highlights has at least one desktop screenshot at `public/images/projects/<slug>/desktop/01-*.png`, wired as `coverImage`.
- `painel-da-reconstrucao` has its 19 routes wired (it's the showcase for `route-list`) and authored `story` blocks demonstrating paragraph + figure-pair (desktop + mobile of `/dados-gerais`) + pullquote.
- At least one other highlight has at least 1 paragraph block authored.
- Build passes; visual smoke on `/projects/painel-da-reconstrucao` shows the cover image (not gradient), hero, story, stack, route list (collapsible since 19 > 8), and Contact+Footer.

- [ ] **Step 1: Copy screenshots from snapshots into `public/`** — run a one-time copy script. From the project root:

```bash
mkdir -p public/images/projects/painel-da-reconstrucao/desktop public/images/projects/painel-da-reconstrucao/mobile && \
cp ~/portfolio-snapshots/painel-da-reconstrucao/screenshots/desktop/*.png public/images/projects/painel-da-reconstrucao/desktop/ && \
cp ~/portfolio-snapshots/painel-da-reconstrucao/screenshots/mobile/*.png public/images/projects/painel-da-reconstrucao/mobile/

mkdir -p public/images/projects/enquetes-gzh/desktop public/images/projects/enquetes-gzh/mobile && \
cp ~/portfolio-snapshots/enquetes-gzh/screenshots/desktop/*.png public/images/projects/enquetes-gzh/desktop/ && \
cp ~/portfolio-snapshots/enquetes-gzh/screenshots/mobile/*.png public/images/projects/enquetes-gzh/mobile/

mkdir -p public/images/projects/ia-na-redacao/desktop public/images/projects/ia-na-redacao/mobile && \
cp ~/portfolio-snapshots/ia-na-redacao/screenshots/desktop/*.png public/images/projects/ia-na-redacao/desktop/ && \
cp ~/portfolio-snapshots/ia-na-redacao/screenshots/mobile/*.png public/images/projects/ia-na-redacao/mobile/

mkdir -p public/images/projects/fotos-do-ano-2025/desktop public/images/projects/fotos-do-ano-2025/mobile && \
cp ~/portfolio-snapshots/fotos-do-ano-2025/screenshots/desktop/*.png public/images/projects/fotos-do-ano-2025/desktop/ && \
cp ~/portfolio-snapshots/fotos-do-ano-2025/screenshots/mobile/*.png public/images/projects/fotos-do-ano-2025/mobile/

mkdir -p public/images/projects/peleia-gre-nal/desktop public/images/projects/peleia-gre-nal/mobile && \
cp ~/portfolio-snapshots/peleia-gre-nal/screenshots/desktop/*.png public/images/projects/peleia-gre-nal/desktop/ && \
cp ~/portfolio-snapshots/peleia-gre-nal/screenshots/mobile/*.png public/images/projects/peleia-gre-nal/mobile/
```

Verify each `desktop/` directory has at least one `.png` file. If a snapshot lacks screenshots, that highlight will simply fall back to the gradient cover.

- [ ] **Step 2: Update `painel-da-reconstrucao` entry in `src/data/projects.ts`** — add `coverImage`, `screenshots`, `routes`, `mockedServices`, and `story` fields. Replace the entry block (the first one) with:

```ts
{
  id: 'painel-da-reconstrucao',
  slug: 'painel-da-reconstrucao',
  title: { en: 'painel da reconstrução', pt: 'painel da reconstrução' },
  year: 2024,
  highlight: true,
  highlightOrder: 1,
  size: 'lg',
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
```

- [ ] **Step 3: Wire `coverImage` for the other 4 highlights** — update each entry to set `coverImage` to its first desktop screenshot. Example for `enquetes-gzh`:

```ts
coverImage: '/images/projects/enquetes-gzh/desktop/01-embed-vote.png',
```

For `ia-na-redacao`: `coverImage: '/images/projects/ia-na-redacao/desktop/01-landing.png',`
For `fotos-do-ano-2025`: `coverImage: '/images/projects/fotos-do-ano-2025/desktop/01-landing.png',` (verify the actual filename in the snapshot dir; substitute if different).
For `peleia-gre-nal`: `coverImage: '/images/projects/peleia-gre-nal/desktop/01-landing.png',` (same caveat).

If the actual filenames differ, run `ls public/images/projects/<slug>/desktop/` and use the first `.png` in alphabetical order.

- [ ] **Step 4: Add a 1-paragraph `story` to `enquetes-gzh`** — minimum bar so at least 2 highlights demonstrate the story flow:

```ts
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
      en: 'The interesting part was the vote-storage model: instead of counting docs in a subcollection at read time, each survey carries a `voteCounts` map and a `totalVotes` counter that get bumped via Firestore `increment()` together with the per-device write. That\'s what made the live progress bars cheap enough to drive from a public-facing widget without a server in front of Firestore.',
      pt: 'A parte interessante foi o modelo de armazenamento dos votos: em vez de contar docs em subcoleção na leitura, cada survey carrega um mapa `voteCounts` e um contador `totalVotes` que são incrementados via `increment()` do Firestore junto com o registro por dispositivo. Foi o que tornou as barras de progresso ao vivo baratas o suficiente para um widget público sem servidor na frente do Firestore.',
    },
  },
],
```

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS — no TS errors. Asset paths resolve at build time.

- [ ] **Step 6: Visual verification on `/projects/painel-da-reconstrucao`** (full-feature)

Run: `npm run dev`. Navigate to the page.
Verify:
1. Hero choreography plays.
2. Cover renders the actual `01-dados-gerais.png` image (not the gradient).
3. Story column renders: 2 paragraphs → figure-pair (desktop + mobile of `/dados-gerais`) → pullquote (with stripe wipe-in on scroll-into-view) → 1 final paragraph.
4. Stack chips render.
5. Route list renders 19 entries; collapsed by default (because `routes.length > 8` triggers `collapsible: true`); clicking the summary expands the list.
6. No footnotes (mockedServices is unset).
7. Contact + Footer load on scroll.

- [ ] **Step 7: Visual verification on `/projects/enquetes-gzh`**

Verify cover image renders, hero choreography plays, 2-paragraph story renders with `**Gauchazh (GZH)**` rendering as bold and `increment()` rendering as inline literal text (no markdown applied — that's the parser's expected behavior since backticks aren't a recognized mark).

- [ ] **Step 8: Commit**

```bash
git add public/images/projects/ src/data/projects.ts
git commit -m "feat(projects): wire screenshots, routes, and authored story for highlights

- Copies all 8 highlight screenshots into public/images/projects/<slug>/
  (desktop + mobile per snapshot), wires coverImage on each highlight
- Authors painel-da-reconstrucao story: 2 paragraphs → desktop+mobile
  figure-pair → pullquote → closing paragraph; wires its 19 routes
- Authors enquetes-gzh story (2 paragraphs covering the architectural
  punchline of the vote-storage model)
- Other 3 highlights (ia-na-redacao, fotos-do-ano-2025, peleia-gre-nal)
  get cover images only; story can be authored later

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Cleanup + final verification

**Files:**
- Modify: `src/types/content.ts`
- Modify: `src/data/projects.ts` (only if any `featured` field still lingers — Task 3 should have already dropped it from new entries)
- Modify: `tests/unit/data/archive.test.ts` (only if needed)

**Acceptance criteria:**
- `featured?: boolean` is removed from the `Project` type. No code references `p.featured`.
- `npm run build`, `npm run lint`, `npm run test:unit` all pass.
- Visual smoke check confirms Selected Work (4 cards in priority order), Archive (default `featured` sort with 5 highlights pinned), and `/projects/<slug>` (hero choreography, story when present, stack, optional routes, optional footnotes) all work.
- All spec TODO checkboxes ticked.

- [ ] **Step 1: Confirm no code references `p.featured`**

Run: `grep -rn "\.featured" src/ tests/ 2>&1 | grep -v node_modules`
Expected: Zero matches against the `Project.featured` field. Matches against `'featured'` as an `ArchiveItem.kind` are fine (those are string literals, not the field). Matches against `featured: true` in test fixtures are fine if they're for `ArchiveItem`. If any genuine `p.featured` references exist, fix them to use `p.highlight`.

- [ ] **Step 2: Remove `featured` from `Project` type** — open `src/types/content.ts`, find the legacy line:

```ts
  // legacy — removed in task 10
  featured?: boolean
```

and delete both the comment and the field.

- [ ] **Step 3: Run build, lint, tests**

Run: `npm run build && npm run lint && npm run test:unit`
Expected: PASS at every step.

- [ ] **Step 4: Visual smoke at `/`**

Run: `npm run dev`. Open `http://localhost:5173/`.
Verify:
1. Selected Work shows 4 cards: painel(lg) → enquetes(sm) → ia-na-redacao(sm) → fotos-do-ano(md). Click each — navigates to its detail page (cover renders for each since Step 3 of Task 9 wired images).
2. Archive defaults to `featured` sort; first 5 rows are highlights with cream bg + blue stripe + ★ in priority order.
3. Switch sort to `newest` → all 8 projects + embeds interleave by date.
4. Switch sort back to `featured` → highlights pin again.

- [ ] **Step 5: Visual smoke at `/projects/painel-da-reconstrucao`**

Hero entrance plays, cover image renders, story column renders (paragraphs + figure-pair + pullquote + closing paragraph), stack chips, collapsible route list (19 entries), Contact + Footer.

- [ ] **Step 6: Visual smoke at `/projects/OmniStack-9.0`**

Hero plays with eyebrow `2019 · learning`. No CTAs (no liveUrl, no githubUrl). Gradient cover (no image). Stack chips render. No story, no routes, no footnotes. No console errors. No 404.

- [ ] **Step 7: Reduced-motion smoke**

Toggle DevTools "Emulate prefers-reduced-motion: reduce". Reload `/projects/painel-da-reconstrucao`.
Verify all animations collapse to instant fades — no character split, no scroll reveals, no scale-in.

- [ ] **Step 8: Mobile viewport smoke at 393×852**

Reload `/projects/painel-da-reconstrucao` at iPhone 15 Pro emulation.
Verify hero scales, story column stays readable, figure-pair stacks vertically, route list still works, no horizontal scroll.

- [ ] **Step 9: Tick all remaining spec TODO boxes**

Open `docs/superpowers/specs/2026-05-06-project-data-unification-and-detail-page-design.md`. For each `- [ ]` item under `## TODO`, verify it's been done and tick `- [x]`. The full set should be:
- [x] All 22 spec TODOs ticked.

If any are unticked because the work landed but the box wasn't flipped, flip it now. If any are unticked because the work genuinely didn't happen, decide whether to add a follow-up task or revise the spec.

- [ ] **Step 10: Commit**

```bash
git add src/types/content.ts docs/superpowers/specs/2026-05-06-project-data-unification-and-detail-page-design.md
git commit -m "chore(types): remove legacy Project.featured field; tick spec TODOs

Project.featured was kept optional during the migration (tasks 1-9) so
existing data could remain typed. With nothing reading p.featured anymore,
the field is removed from the Project interface. All spec TODO boxes
ticked to reflect landed work.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Verification Summary

After all 10 tasks land, this should be true:

- **Build:** `npm run build` clean, no TS errors, no warnings.
- **Lint:** `npm run lint` clean.
- **Unit tests:** `npm run test:unit` passes (existing + new `inlineMarkdown` + new `byFeatured` cases + updated archive count).
- **Selected Work:** Renders 4 highlights in priority order (painel-da-reconstrucao → enquetes-gzh → ia-na-redacao → fotos-do-ano-2025) using current bento sizes.
- **Archive:** Defaults to `featured` sort. First 5 rows are the 5 highlights with cream bg + 3px blue stripe + ★ prefix. Switching to `newest`/`oldest`/`az`/`za` produces a flat sort over all 8 projects + ~280 embeds. Filters and search remain unchanged.
- **Detail page:** All 8 projects route to `/projects/<slug>`. Hero choreography plays on mount. Story renders only when authored. Stack always renders. Route list renders for `painel-da-reconstrucao`. Footnotes render only for projects with `mockedServices`. Contact + Footer load on scroll.
- **Reduced motion:** All entrance animations collapse to instant fade.
- **Spec checkboxes:** All TODO boxes in the spec ticked.
