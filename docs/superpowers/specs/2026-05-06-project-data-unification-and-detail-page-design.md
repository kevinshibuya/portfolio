# Project Data Unification + Modular Detail Page — Design

**Date:** 2026-05-06
**Status:** Drafted (pending user spec review)

## Summary

A three-pillar change to how projects are stored, listed, and presented:

1. **One centralized source of truth** for all projects (`src/data/projects.ts`), replacing the current 4-entry list with all 8 snapshots from `~/portfolio-snapshots/`. Two placeholder entries (`interactive-embeds`, `editorial-cms`) are removed.

2. **Highlight ranking** (`highlight: boolean` + `highlightOrder?: number`) drives both sections:
   - **Selected Work** shows highlights with `highlightOrder` 1–4 in the existing bento layout.
   - **Archive** gets a new `featured` sort that pins all highlights at the top in priority order, then mixes non-highlight projects + CSV embeds by date desc. `featured` becomes the new default sort. Highlight rows render with a cream background + 3px blue-400 left stripe + ★ blue-400 prefix on the title.

3. **Modular project detail page** (`/projects/:slug`) replaces the bland MVP page. Layout B: full-bleed hero + cover + narrow story column with full-bleed showcase breakouts. Hero, cover, and stack render automatically from the project's base fields (title, year, tagline, CTAs, screenshots, techStack); the optional `story: Block[]` field lets the curator hand-author a long-form narrative per project using a tagged-union content schema (paragraph / heading / pullquote / divider / figure / figure-pair / figure-grid / stat-row / route-list). A standard Framer Motion entrance sequence (back-link → eyebrow → title char-split → tagline word-stagger → CTAs → stats → cover scale-in) plus on-scroll reveals for story blocks brings the page in line with the rest of the site's animation grammar.

## Motivation

The current `projects.ts` lives in tension with reality: 4 hand-curated entries, two of which are placeholders without source data, while 8 fully captured snapshots sit unused at `~/portfolio-snapshots/`. The Selected Work bento grid and the Archive list each pull from different filtering logic on top of the same 4-entry list, and the project detail page renders a bare-bones gradient block + paragraph + tag chips with no animation, no screenshots, and no narrative — even though every snapshot has a 3–4 paragraph summary, structured metadata, and 6 captured screenshots ready to use.

Unifying around a single `Project` shape with explicit highlight ranking and a modular content blocks system means: (a) Selected Work and Archive both read from the same list with different filters; (b) snapshots feed into rich detail pages without bespoke code per project; (c) future authoring is one file change — add a new project entry, drop screenshots into `public/images/projects/<slug>/`, optionally write a custom `story` block array.

## Locked decisions (from brainstorm Q&A)

- **Highlights, in priority order (1 = top):**
  1. `painel-da-reconstrucao`
  2. `enquetes-gzh`
  3. `ia-na-redacao`
  4. `fotos-do-ano-2025`
  5. `peleia-gre-nal`
- **Non-highlights (kept as projects, not surfaced in Selected Work):** `linha-do-tempo-covid`, `ignite-feed-2024`, `OmniStack-9.0`.
- **Dropped:** `interactive-embeds` (gallery section already exists), `editorial-cms` "field notes" (placeholder, no snapshot).
- **Selected Work filter:** `highlight === true && highlightOrder <= 4`, sorted by `highlightOrder` asc. Bento layout (lg/md/sm sizes) preserved — `painel-da-reconstrucao` takes lg, others remap to md/sm.
- **Archive `featured` sort:** `[highlights by highlightOrder asc] + [non-highlight projects + CSV embeds interleaved by sortDate desc]`. `featured` is the new default sort key (replacing `newest`).
- **Highlight row treatment in Archive:** background `#F6F9FC` (cream, lighter than baseline sand `#EAF2F8`), 3px `#3A96E8` (blue-400) inset left stripe, ★ `#3A96E8` glyph prefixed to the title text. Hover keeps cream + stripe; the existing sand-on-hover behavior for non-highlight rows is unchanged.
- **All 8 projects link to `/projects/:slug`.** No external-only links for non-highlights — every project has rich snapshot data, so every project gets a detail page.
- **Detail page layout:** Layout B (full-bleed hero, wide cover, narrow story column, full-bleed showcase breakouts, stack chips footer). Wireframe in the brainstorm record at `.superpowers/brainstorm/<session>/content/page-layout.html`.
- **Content schema:** tagged-union `Block[]` with paragraph / heading / pullquote / divider / figure / figure-pair / figure-grid / stat-row / route-list. Inline markdown in paragraph text (`**bold**`, `*italic*` → blue-400 accent, `[label](url)`).
- **Image flow:** hand-curated. Screenshots copied from `~/portfolio-snapshots/<slug>/screenshots/` into `public/images/projects/<slug>/{desktop,mobile}/`. Snapshot dir is reference, not a build dependency.
- **Animation scope:** standard sequence — Framer Motion only. No GSAP, no R3F, no shared-element morph. Reuses `src/utils/animations.ts` `VARIANTS` and `STAGGER_PRESETS` plus three new variants (`titleCharSplit`, `taglineWordSplit`, `pullquoteStripe`). Reduced-motion collapses to instant fade.

## Scope

### In scope

- `src/types/content.ts` — extend `Project` with highlight + content fields; add `Block`, `InlineMark`, and supporting types.
- `src/data/projects.ts` — replace contents with all 8 snapshot-backed projects, hand-curated bilingual fields, optional `story?: Block[]` per project.
- `src/data/archive.ts` — adjust `fromProjects()` to set the highlight metadata on each `ArchiveItem`; introduce a new `featured` sort path; change default sort.
- `src/components/sections/Projects.tsx` — switch filter from `featured` to `highlight && highlightOrder <= 4`, sorted by `highlightOrder`.
- `src/components/sections/Archive.tsx` — add `featured` to the `SortKey` union, wire it as the initial state, render the new sort behavior, render highlight-row treatment (stripe + star + cream bg).
- `src/pages/ProjectDetail.tsx` — full rewrite. Hero block, cover, modular `Block[]` story renderer, stack/routes/footnotes, animation orchestration. Existing `Contact` + `Footer` lazy-load and Lenis scroll-snap behavior preserved.
- `src/components/projectDetail/` — new directory housing the page's sub-components: `Hero.tsx`, `Cover.tsx`, `BlockRenderer.tsx`, plus per-block components (`Paragraph.tsx`, `Heading.tsx`, `Pullquote.tsx`, `Figure.tsx`, `FigurePair.tsx`, `FigureGrid.tsx`, `StatRow.tsx`, `RouteList.tsx`, `Divider.tsx`).
- `src/components/projectDetail/inlineMarkdown.ts` — small helper that parses `**bold**`, `*italic*`, `[label](url)` into a React node tree.
- `src/utils/animations.ts` — add `titleCharSplit`, `taglineWordSplit`, `pullquoteStripe` variants and any needed stagger preset extensions.
- `src/index.css` — new `.project-detail-*` rules (hero typography, cover, narrow story column, full-bleed breakouts, highlight archive row treatment).
- `public/images/projects/<slug>/{desktop,mobile}/` — screenshots copied from snapshots (one-time manual copy; documented in repo README or commit message).
- `src/i18n/locales/{en,pt}.json` — add detail-page strings (`projectDetail.routes`, `projectDetail.notes`, etc.) plus archive `sort.featured` label.

### Out of scope

- Embeds gallery (`EmbedsGallery.tsx`) — unchanged.
- Embeds CSV ingestion — unchanged.
- Existing Contact / Footer behavior — unchanged. The detail page already lazy-loads them; we keep that.
- Page-transition / shared-element morph from bento card → detail page. Standard route mount only.
- GSAP ScrollTrigger or R3F additions on the detail page.
- A blog / case-study CMS. The `Block[]` schema is all in TypeScript, hand-authored.
- Per-project SEO/OG metadata (separate concern, can be added later).
- Snapshot sync script (one-time copy is enough for now).
- Tests for `Block[]` rendering — UI-only; visual verification suffices per CLAUDE.md.

## Architecture

### Type changes (`src/types/content.ts`)

```ts
export type BentoSize = 'lg' | 'md' | 'sm'

export type ProjectType = 'shipped' | 'learning'

export interface Bilingual { en: string; pt: string }

export interface Stat { value: string; label: Bilingual }

export interface ScreenshotPair {
  desktop?: string                 // public/-relative URL
  mobile?: string                  // public/-relative URL
  alt?: Bilingual
  route?: string                   // optional path label, e.g. "/dados-gerais"
}

export interface RouteEntry { path: string; label: string }

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
  | { type: 'figure'; src: string; alt?: Bilingual; caption?: Bilingual; width: 'inset' | 'wide' | 'bleed' }
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
  highlightOrder?: number          // required when highlight === true; 1 = top

  // surface (bento)
  size?: BentoSize                 // applies only for highlights with order <= 4
  gradient?: string                // bento + cover fallback
  dark?: boolean                   // bento dark variant

  // hero copy
  tagline?: Bilingual
  description: Bilingual           // 1–2 sentence eyebrow synopsis (kept; reused as fallback)
  stats?: Stat[]                   // optional hero stat-row

  // links + meta
  liveUrl?: string                 // canonical_url from snapshot
  githubUrl?: string
  techStack: string[]
  projectType?: ProjectType
  mockedServices?: string[]        // optional footnote
  routes?: RouteEntry[]            // optional sitemap

  // visual
  coverImage: string               // legacy field — kept; first desktop screenshot for new pages
  images: string[]                 // legacy field — kept; may go unused for new pages
  screenshots?: ScreenshotPair[]   // structured replacement

  // story
  story?: Block[]                  // long-form narrative blocks; if absent, the page renders hero + cover + stack only (no story column)
}
```

`Project` keeps existing fields (`coverImage`, `images`, `featured`) as legacy for any code we miss in the migration. The new `highlight` flag is the source of truth going forward; we **remove `featured` from the type** at the end of the migration after confirming nothing reads it.

### Highlight ordering — derivation rules

- `highlight: true` requires `highlightOrder` to be a positive integer, unique within the dataset.
- `highlightOrder` 1 through 4 → render in Selected Work bento, sorted asc.
- `highlightOrder` ≥ 5 → still pinned to the top of Archive `featured` sort, but skipped in Selected Work.
- Highlights have implicit precedence over non-highlights in `featured` sort regardless of `highlightOrder` value.

### Selected Work (`Projects.tsx`)

Replace:

```ts
const featured = projects.filter((p) => p.featured)
```

with:

```ts
const featured = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
```

Bento sizes are locked: `painel-da-reconstrucao` (highlight #1) → `lg`, `fotos-do-ano-2025` (#4) → `md`, `enquetes-gzh` (#2) and `ia-na-redacao` (#3) → `sm`. This preserves the current 4-card grid (1 lg + 1 md + 2 sm) layout.

### Archive `featured` sort

In `src/data/archive.ts`, expand `fromProjects()` to copy highlight info onto each `ArchiveItem`:

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

`ArchiveItem` gains optional `highlight?: boolean` and `highlightOrder?: number` fields.

In `Archive.tsx`, the `SortKey` union becomes:

```ts
type SortKey = 'featured' | 'newest' | 'oldest' | 'az' | 'za'
```

Initial state: `useState<SortKey>('featured')`. The new sort branch:

```ts
if (sort === 'featured') {
  result = [...result].sort((a, b) => {
    const aIsH = a.kind === 'featured' && a.highlight === true
    const bIsH = b.kind === 'featured' && b.highlight === true
    if (aIsH && bIsH) return (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99)
    if (aIsH) return -1
    if (bIsH) return 1
    return b.sortDate - a.sortDate
  })
}
```

Sort dropdown gains a `featured` option (label from i18n: `archive.sort.featured`), shown first.

### Highlight row visual

`ArchiveRow` component picks up an `isHighlight` boolean from the item and renders an extra class on the wrapping `<a>` / `<Link>`:

```tsx
<Link to={item.href} className={`archive-row${isHighlight ? ' archive-row--highlight' : ''}`}>
  {isHighlight && <span className="archive-star" aria-hidden>★</span>}
  ... existing inner ...
</Link>
```

The `★` glyph is positioned absolutely or as a leading sibling of the title (decision in CSS: leading sibling is simpler and won't fight grid math). CSS:

```css
.archive-row--highlight {
  background: var(--cream);                       /* #F6F9FC */
  box-shadow: inset 3px 0 0 var(--blue-400);      /* #3A96E8 */
}
.archive-row--highlight:hover {
  background: var(--cream);                       /* hover override; the stripe stays */
}
.archive-row--highlight .archive-star {
  color: var(--blue-400);
  margin-right: 6px;
  font-size: 14px;
}
.archive-row--highlight .archive-title {
  /* title color stays ink; only the leading star is blue */
}
```

The non-highlight `.archive-row:hover` already uses `var(--bg-sand)` darkening — the `--highlight` variant overrides hover with the same cream so it doesn't darken on hover. Star is wrapped in `aria-hidden` since "highlight" isn't a meaningful screen-reader label by itself; if needed, a `sr-only "highlight project: "` prefix on the title can be added later.

### Project detail page

`src/pages/ProjectDetail.tsx` becomes a thin wrapper that:

1. Pulls the project by slug (existing pattern).
2. Renders `<NotFound />` (existing branch).
3. Renders `<Hero project={project} />`, `<Cover project={project} />`, `<BlockRenderer blocks={project.story} />` only if `project.story` is non-empty, then `<StackSection project={project} />`, optional `<RouteList ... />`, optional `<Footnotes ... />`, then `<Contact />` + `<Footer />` (already lazy-loaded).
4. Continues to handle the Lenis scroll-to-top + lazy chunk warming exactly as today.

There is no auto-derived "default story." If `story` is unset, the page is hero + cover + stack only. The curator authors a `story: Block[]` per project when they want narrative — translating the relevant prose from `~/portfolio-snapshots/<slug>/summary.md` into bilingual paragraph blocks (and any pullquote / figure / route-list breakouts they choose). This keeps the data model honest about what's hand-curated vs. machine-derived, and avoids needing a markdown loader.

### `Block` renderer (`src/components/projectDetail/BlockRenderer.tsx`)

A thin switch that dispatches each block to its component, passing `lang` and `prefersReducedMotion`. The narrow column wraps inset/text blocks; wide and bleed figures break out via CSS (`grid-column: full-bleed` or negative margins). Each block component owns its own `whileInView` reveal so lazy-mounted blocks don't depend on a single page-level orchestrator.

### Inline markdown (`inlineMarkdown.ts`)

Pure function: `(text: string) => ReactNode[]`. Parses three patterns:

- `**bold**` → `<strong>` (semibold, ink)
- `*italic*` → `<em>` (Plus Jakarta Sans italic, color `var(--blue-400)`) — matches the in-title accent treatment
- `[label](url)` → `<a target="_blank" rel="noopener noreferrer" className="prose-link">`

Implementation: regex-tokenize in a single pass with anchored alternation; build a `ReactNode[]` from the tokens. No nesting (e.g. `**bold *with italic***`) — first-pass parser rejects that and renders flat. Edge cases: escaped `\*` and `\[` are not supported (out of scope; if a literal asterisk is needed, the curator writes the paragraph in a different block or uses Unicode `∗`).

### Animation orchestration

A new module `src/utils/animations.ts` (existing file) gains:

```ts
export const titleCharSplit = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
}

export const titleChar = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export const taglineWordSplit = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.5 },
  },
}

export const taglineWord = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteStripe = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteText = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}
```

`Hero` component runs an orchestrated mount sequence with explicit `delay` on each child. `Cover` reveals on mount as the last hero step. Story blocks use `whileInView` with `once: true, amount: 0.2`. Reduced-motion guard via the existing `useMotion()` context: when active, all animations collapse to `REDUCED_MOTION_VARIANT`.

### Routing

No router changes needed — `/projects/:slug` already exists. The `useLayoutEffect` scroll-reset and Lenis `scrollTo(0, { immediate: true, force: true })` handling stays. Lazy chunks for Contact / Footer keep their warm-at-idle pattern.

## File-by-file change list

```
src/types/content.ts                          edit  (extend Project, add Block + supporting types)
src/data/projects.ts                          rewrite  (8 entries, new shape)
src/data/archive.ts                           edit  (carry highlight info, add featured sort)
src/components/sections/Projects.tsx          edit  (filter by highlight + order)
src/components/sections/Archive.tsx           edit  (featured sort, highlight row class, default state)
src/pages/ProjectDetail.tsx                   rewrite  (thin orchestrator)
src/components/projectDetail/Hero.tsx         new
src/components/projectDetail/Cover.tsx        new
src/components/projectDetail/BlockRenderer.tsx new
src/components/projectDetail/StackSection.tsx new
src/components/projectDetail/Footnotes.tsx    new
src/components/projectDetail/blocks/Paragraph.tsx     new
src/components/projectDetail/blocks/Heading.tsx       new
src/components/projectDetail/blocks/Pullquote.tsx     new
src/components/projectDetail/blocks/Divider.tsx       new
src/components/projectDetail/blocks/Figure.tsx        new
src/components/projectDetail/blocks/FigurePair.tsx    new
src/components/projectDetail/blocks/FigureGrid.tsx    new
src/components/projectDetail/blocks/StatRow.tsx       new
src/components/projectDetail/blocks/RouteList.tsx     new
src/components/projectDetail/inlineMarkdown.ts        new
src/utils/animations.ts                       edit  (add 5 new variants)
src/index.css                                 edit  (project-detail-* + archive-row--highlight)
src/i18n/locales/en.json                      edit  (sort.featured + projectDetail strings)
src/i18n/locales/pt.json                      edit  (same)
public/images/projects/<slug>/desktop/*.png   new   (copied from snapshots, 5 highlights minimum)
public/images/projects/<slug>/mobile/*.png    new   (copied from snapshots)
```

## Migration order

This work is non-trivial so it must be done in dependency order to keep the build green at every step:

1. **Types first.** Extend `Project`, add `Block` and supporting types. Build still passes because the new fields are optional.
2. **Data.** Rewrite `projects.ts` with all 8 entries, hand-authored bilingual content. Drop `interactive-embeds`, `editorial-cms`. Build passes — old `featured` field removed last.
3. **Archive plumbing.** Carry highlight info through `ArchiveItem`; add `featured` sort branch; flip default. Test the section in dev.
4. **Selected Work filter.** Switch to `highlight && order <= 4`. Test in dev.
5. **Detail page.** Build sub-components bottom-up (blocks → renderer → hero/cover → page rewrite). Wire animations last.
6. **Screenshots.** Copy snapshot screenshots into `public/images/projects/`. Verify all 5 highlights render images; non-highlight projects can fall back to gradient cover until images are added.
7. **Cleanup.** Remove `featured` from `Project` type; verify no code references it.

## Accessibility

- **Star icon** is decorative; wrapped in `aria-hidden`. The "highlight" semantic isn't load-bearing for screen-reader users — the title and link are.
- **Hero title** uses real `<h1>`. Eyebrow uses `<span>` with semantic small-caps via CSS, not a visual `<h2>`.
- **Pullquote** uses `<blockquote>` with optional `<cite>` for attribution.
- **Figures** use `<figure>` + `<figcaption>` when caption is present. `alt` attribute always set (defaults to empty string when omitted, marking as decorative).
- **Route list** is a real `<ul>`. When `collapsible: true`, uses a `<details>`/`<summary>` element so it works without JS.
- **Reduced motion** collapses all entrance animations to instant fades (existing `REDUCED_MOTION_VARIANT` pattern).
- **Focus order**: back link → title → CTAs → in-flow links inside paragraphs → live URL → repo URL.

## Performance

- Detail page is already route-split via React Router. Hero/Cover/Block components live in a single chunk imported eagerly when the route mounts.
- Screenshots: `<img loading="lazy">` for everything below the cover. Cover image uses `loading="eager" fetchpriority="high"` since it's part of the LCP payload.
- Plus Jakarta Sans is already loaded via `/public/fonts/`; the title's massive lowercase render uses the same family.
- No new third-party libraries.
- Lenis smooth-scroll behavior preserved.

## Testing strategy

Per CLAUDE.md, this is UI work, so visual verification stands in for unit tests. Manual checks:

- `npm run build` produces a clean build (no TS errors, no warnings).
- `npm run dev` and visit `/`:
  - Selected Work shows 4 cards in priority order (painel, enquetes, ia-na-redacao, fotos-do-ano).
  - Archive defaults to `featured` sort; first 5 rows are the 5 highlights with cream bg + blue stripe + ★ prefix, in priority order.
  - Switching sort to `newest` mixes everything by date as before.
  - Each highlight row click navigates to `/projects/<slug>`.
- Visit `/projects/painel-da-reconstrucao` (data-rich, has 19 routes):
  - Hero entrance choreography plays on mount: back → eyebrow → title char-split → tagline → CTAs → stats → cover.
  - Story content reveals on scroll (paragraphs fade-up, pullquote stripe-wipe, figures scale-in).
  - Route list renders, collapsible if marked so.
  - Stack chips at the bottom; mocked-services footnote if non-empty.
  - Contact + Footer load on scroll-to-bottom (existing behavior preserved).
- Visit `/projects/OmniStack-9.0` (no `canonical_url`):
  - No "live ↗" CTA, just "github ↗" if `githubUrl` is set, else no CTAs.
  - Hero, story, screenshots all render.
- Reduced-motion: `prefers-reduced-motion: reduce` in DevTools — entrance is instant, no char split, no scroll reveals.
- ≤720px viewport: hero typography reflows, story column stays readable, full-bleed figures clamp to viewport width.
- 404 path `/projects/does-not-exist`: existing not-found fallback unchanged.

## TODO

- [ ] Extend `Project` in `src/types/content.ts` with `highlight`, `highlightOrder`, `tagline`, `stats`, `story`, `screenshots`, `routes`, `mockedServices`, `projectType`, plus add `Block`, `Bilingual`, `Stat`, `ScreenshotPair`, `RouteEntry`, `FigureSrc` types. Build still passes.
- [ ] Rewrite `src/data/projects.ts` with all 8 snapshot-backed projects. Hand-curate bilingual `title`, `tagline`, `description`, `techStack`, `liveUrl`, `githubUrl`, `year`, optional `stats`, optional `story`. Set `highlight` + `highlightOrder` per the locked priority. Drop `interactive-embeds` and `editorial-cms`. Drop the `featured` field on the new entries.
- [ ] Copy screenshots from `~/portfolio-snapshots/<slug>/screenshots/{desktop,mobile}/` into `public/images/projects/<slug>/{desktop,mobile}/` for at least the 5 highlights. Wire `coverImage` and `screenshots` arrays in each project entry.
- [ ] Update `src/data/archive.ts`: carry `highlight` + `highlightOrder` onto `ArchiveItem`; export type updated. Existing sort behavior unchanged.
- [ ] Add `featured` to `SortKey` union in `src/components/sections/Archive.tsx`; flip initial sort state to `'featured'`; add the `featured` sort branch (highlights by order, then everything else by date desc); add `archive.sort.featured` i18n key with both `en` and `pt` strings; render new option first in the sort dropdown.
- [ ] Render highlight-row treatment in `ArchiveRow`: leading `★` glyph (aria-hidden) + class `archive-row--highlight`. Add `.archive-row--highlight` CSS rules to `src/index.css` (cream bg, 3px blue-400 inset stripe, hover stays cream, star color blue-400).
- [ ] Update `src/components/sections/Projects.tsx`: filter to `highlight === true && (highlightOrder ?? 99) <= 4`, sort by `highlightOrder` asc.
- [ ] Add 5 new motion variants to `src/utils/animations.ts`: `titleCharSplit`, `titleChar`, `taglineWordSplit`, `taglineWord`, `pullquoteStripe`, `pullquoteText`. Reduced-motion variants for each.
- [ ] Create `src/components/projectDetail/inlineMarkdown.ts` with single-pass tokenizer for `**bold**`, `*italic*`, `[label](url)`. Returns `ReactNode[]`.
- [ ] Create `src/components/projectDetail/blocks/{Paragraph,Heading,Pullquote,Divider,Figure,FigurePair,FigureGrid,StatRow,RouteList}.tsx`. Each owns its own `whileInView` reveal and reduced-motion fallback.
- [ ] Create `src/components/projectDetail/BlockRenderer.tsx` — switch on `block.type`, pass `lang` and motion props.
- [ ] Create `src/components/projectDetail/{Hero,Cover,StackSection,Footnotes}.tsx`. Hero owns the orchestrated mount choreography (back → eyebrow → title char-split → tagline word-stagger → CTAs → stats); Cover owns the cover-image scale-in revealing as the last hero step.
- [ ] Rewrite `src/pages/ProjectDetail.tsx` as a thin orchestrator: pull project by slug, render the new sub-components in order, preserve existing Lenis scroll-reset + lazy `Contact` + `Footer` warming.
- [ ] Add `.project-detail-*` CSS rules to `src/index.css`: hero typography (title clamp, tagline, eyebrow), cover styling, narrow story column (max-w-prose ~620px, centered), full-bleed breakouts (negative margin or `grid-column`), stat-row, pullquote (blue stripe), figure caption, route-list `<details>` styling.
- [ ] Add `projectDetail.*` strings to `src/i18n/locales/{en,pt}.json` (back link, year label, stack label, routes label, notes label, etc.) plus `archive.sort.featured`.
- [ ] Remove the legacy `featured` field from `Project` type once no code references it; remove from any leftover entries.
- [ ] `npm run build` clean (no TS errors, no warnings).
- [ ] Visual verification on `/`: Selected Work renders 4 cards in priority order; Archive defaults to `featured` with 5 highlights pinned + cream-stripe-star treatment; switching sort works.
- [ ] Visual verification on `/projects/painel-da-reconstrucao`: hero choreography, story reveals on scroll, pullquote stripe-wipe, figure scale-in, stack chips, route list, footnote, Contact + Footer at bottom.
- [ ] Visual verification on `/projects/OmniStack-9.0` (no canonical_url, learning project): hero CTAs adapt (only github or none), story still renders, no broken images.
- [ ] Visual verification with `prefers-reduced-motion: reduce`: instant fades, no char split, no scroll reveals.
- [ ] Visual verification at ≤720px viewport: hero scales, story column stays legible, full-bleed figures clamp to viewport.
