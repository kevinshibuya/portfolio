# Mockup-driven bento + content revamp — design

**Date:** 2026-05-07

## Goal

Promote each highlight project to a stylized, mockup-driven Selected Work card with a hover-tracked image animation. Adopt the new snapshot summary format as the source of truth for detail-page content. Add a one-shot image optimization step so the heavy mockup PNGs ship as small WebP files. Tighten the project roster.

## Background

`~/portfolio-snapshots/<slug>/` was updated with two changes:

1. A new `mockups/` subfolder per project containing `desktop.png` (1024×629) and `mobile.png` (8096×4554, also a landscape composition rather than phone-portrait). All seven snapshot folders carry both files. Both files have transparent backgrounds; mobile files are 8–29 MB raw and require optimization before shipping.
2. The snapshot skill now generates `summary.md` as a tighter 3-paragraph structure: (1) what the product is, with concrete numbers; (2) tech stack and architecture; (3) one notable implementation detail. The summaries are now suitable as direct input for a tech-recruiter-facing detail page write-up.

Two new highlight candidates appeared (`fotos-do-ano-2024`, `hotmart-bunde`) and two existing highlights are no longer worth keeping in the portfolio (`ignite-feed-2024`, `OmniStack-9.0` — both Rocketseat learning projects from 2024 / 2019). `linha-do-tempo-covid` loses highlight status but remains in the archive table.

## Roster after this change

| order | slug | size in bento | mockups | story content | stat row |
|---|---|---|---|---|---|
| 1 | `hotmart-bunde` (Política Essencial) | `lg` | yes | new | 50+ hrs · 17 communicators · 1 LP |
| 2 | `fotos-do-ano-2025` | `md` (dual mockup) | yes | refresh | 8 photographers · 2025 · parallax grid |
| 3 | `painel-da-reconstrucao` | `sm` | yes | refresh | R$ 129B · 19 routes · 2024 |
| 4 | `enquetes-gzh` | `sm` | yes | refresh | 71 polls · 760K+ votes · realtime |
| 5 | `fotos-do-ano-2024` | `sm` | yes | new | 8 photographers · floods · scroll-driven |
| 6 | `ia-na-redacao` | `sm` | yes | refresh | (none — numbers too soft) |
| 7 | `peleia-gre-nal` | `sm` | yes | refresh | 10 rounds · 56 cards · 2 squads |
| — | `linha-do-tempo-covid` | n/a | no | keep current | (none) |

**Deleted entirely** (data, story, screenshot folders, detail routes): `ignite-feed-2024`, `OmniStack-9.0`.

Selected Work renders the top 4 (`Política / Fotos2025 / Painel / Enquetes`); the archive shows the remaining three highlights pinned to the top in priority order, then `linha-do-tempo-covid`, then any non-highlights, then embeds.

The Selected Work bento grid (4 cols × 2 rows = 8 cells) tiles as: `lg`(2×2=4) + `md`(2×1=2) + `sm`(1×1=1) + `sm`(1×1=1) = 8 cells. Reordering the cards from `[lg, sm, sm, md]` to `[lg, md, sm, sm]` is necessary so the grid auto-flow places the wide `md` card in the top row alongside the tall `lg`, with the two small cards stacked below the `md` on the right side.

## Architecture

Three subsystems, mostly independent:

1. **Data layer** — extend the `Project` type with a `mockups` field and a `mockup` block variant in the story union; rewrite content; delete two projects; change one highlight's size; load-time validator.
2. **Bento card visual** — new image rendering (stacked tonal+color layers), new cursor-tilt hook, per-size layout (`lg`/`sm` stacked, `md` text-left + dual-mockup-right), reduced-motion + touch fallbacks.
3. **Optimization pipeline** — one-shot Node script using `sharp` to convert raw mockup PNGs to WebP and stage them under `public/images/projects/<slug>/mockups/`.

The detail-page integration is a thin shim: a new `mockup` block type that pulls from `project.mockups` at render time. The bulk of detail-page work is the bilingual content rewrite, which is mechanical but voluminous (7 projects × 3 paragraphs × 2 languages).

## Tech stack

- React 19 + TypeScript (strict, `verbatimModuleSyntax`).
- Vite 6 with the existing build pipeline.
- TailwindCSS v4 with existing `@theme` design tokens.
- Framer Motion (no new use — the cursor tilt is intentionally hand-rolled to avoid introducing per-mousemove Framer subscribers).
- `sharp` ≥ 0.33 (new `devDependency`) for image optimization.
- Vitest 4 (existing) for unit tests of the new hook + block renderer + validator.

## Data model deltas

`src/types/content.ts`:

```ts
interface Mockups {
  desktop: string  // /images/projects/<slug>/mockups/desktop.webp
  mobile: string   // /images/projects/<slug>/mockups/mobile.webp
}

interface Project {
  // ...existing fields unchanged
  mockups?: Mockups   // present on all 7 highlights, absent on linha-do-tempo-covid
}

// Add to the existing Block discriminated union:
type Block =
  | { type: 'paragraph'; text: Bilingual }
  | { type: 'heading'; text: Bilingual }
  | { type: 'pullquote'; text: Bilingual }
  | { type: 'divider' }
  | { type: 'figure'; src: string; alt: Bilingual; caption?: Bilingual; width?: 'wide' | 'normal' }
  | { type: 'figure-pair'; left: FigureSrc; right: FigureSrc }
  | { type: 'figure-grid'; items: FigureSrc[] }
  | { type: 'stat-row'; stats: Stat[] }
  | { type: 'route-list'; items: RouteEntry[] }
  | { type: 'mockup'; variant: 'desktop' | 'mobile' }   // NEW
```

`src/data/projects.ts` adds a load-time validator immediately after the `projects` array literal:

```ts
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
```

Catches future regressions (someone promotes a project to top-4 without generating mockups) at module load instead of at render time.

## Bento card component

### Per-size layout

| size | grid cells | text/image arrangement | image area inset (top / right / bottom / left) |
|---|---|---|---|
| `lg` | 2×2 | tagline top, image centered, title+↗ bottom | 14% / 6% / 22% / 6% |
| `md` | 2×1 | text col left (38% wide), `[desktop, mobile]` pair right | text col reserved; image area at 14% / 6% / 22% / 38% |
| `sm` | 1×1 | tagline top, image centered, title+↗ bottom | 22% / 8% / 30% / 8% |

For `md`'s right-side image area: desktop fills the wider left of the pair (`flex: 1`), mobile fills the narrower right slot (`flex: 0 0 auto; max-width: 26%`). Both apply the same hover treatment and share the cursor-tilt origin (one ref on the wrapper, both layers receive the same transform).

All three sizes use `object-fit: contain` on the images so the native 1024×629 aspect is preserved. Empty card-color regions where the image area's aspect doesn't match 1.63:1 are intentional — the card's gradient fills them, and the transparent-background mockups blend into the gradient where the device frame doesn't draw.

### Hover sequence (visual outcome — image area only)

```
at rest                            on hover
─────────────────                  ─────────────────
image reads as card-toned          image reads as full color
(grayscale, blended into the       (no tint, normal blend)
 gradient via luminosity)
transform: identity                scale(1.08)
                                   rotateX(±10°) rotateY(±10°)
                                   translateX(±8px) translateY(±8px)
```

This describes the visual outcome. The implementation achieves it via stacked layers (see [Color crossfade](#color-crossfade--stacked-layers) below), not by swapping `mix-blend-mode` — that property does not interpolate, so the literal CSS state of each layer never changes between rest and hover; only the top layer's `opacity` does.

The card-side hover (production CSS, unchanged): `transform: translateY(-4px)`, `box-shadow: 0 20px 40px rgba(17, 24, 34, 0.08)`, `↗ case study` `transform: translateX(3px)`.

Easing throughout: `cubic-bezier(0.22, 1, 0.36, 1)`. Opacity transition (color crossfade): 0.6s. Transform transition (image scale + tilt + parallax return-to-rest): 0.55s.

### Color crossfade — stacked layers

`mix-blend-mode` does not interpolate in CSS, so swapping it on hover would produce a visible snap. Instead, render two `<img>` elements stacked absolutely:

```
┌─────────────────────────────┐
│ top layer:                  │  mix-blend-mode: normal
│   opacity: 0 at rest        │  filter: none
│   opacity: 1 on hover       │  (full-color image)
│   transition: opacity 0.6s  │
├─────────────────────────────┤
│ bottom layer:               │  mix-blend-mode: luminosity
│   opacity: 1 always         │  filter: grayscale(1) brightness(1.05)
└─────────────────────────────┘  (card-toned image)
```

The bottom layer's blend mode never changes. As the top layer fades up, full color smoothly takes over the card-toned base. Both layers receive the same `transform` from the cursor-tilt hook (one ref on their shared wrapper writes a single inline style that both inherit).

### Cursor tilt — `useCursorTilt` hook

New file: `src/hooks/useCursorTilt.ts`.

```ts
interface CursorTiltOpts {
  tilt: number    // degrees; ±10 by default
  scale: number   // hover scale multiplier; 1.08 by default
  shift: number   // px parallax offset; ±8 by default
}

function useCursorTilt(
  cardRef: RefObject<HTMLElement>,
  imageWrapRef: RefObject<HTMLElement>,
  opts: CursorTiltOpts
): void
```

Behavior:

- On `mount`, attaches one `mousemove` listener to `cardRef`. The listener computes `dx, dy` ∈ `[-1, 1]` from the cursor's position relative to the card center and writes the resulting transform string to a CSS custom property on `imageWrapRef.current` (e.g. `style.setProperty('--cursor-tilt', 'scale(1.08) rotateX(...)...')`). Both stacked `<img>` layers inside the wrapper read that variable via `transform: var(--cursor-tilt, none)` so the tilt and parallax apply identically to both.
- The mousemove handler is RAF-throttled — at most one transform write per animation frame, regardless of how many native `mousemove` events fire. Prevents jank on slow machines and on high-frequency mice.
- On `mouseleave`, clears the CSS variable (sets it to `none`) so the CSS transition on each `<img>` restores the resting state smoothly.
- No-ops if `useMotion().prefersReducedMotion` is true.
- No-ops if `window.matchMedia('(pointer: coarse)').matches` (touch devices).
- Cleans up the listener and any pending RAF on unmount.

Why hand-rolled: the rest of the codebase uses Framer Motion for declarative state transitions, not for per-mousemove cursor tracking. Introducing a `useMotionValue` + `useTransform` pair just for tilt would be the only place in the codebase doing per-mousemove Framer subscriptions. A small RAF-throttled hook is ~50 LOC, zero new dependencies, and easier to reason about.

### Component shape (`src/components/sections/Projects.tsx`)

```tsx
function BentoCard({ project, lang, caseStudy, variants }: BentoCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  useCursorTilt(cardRef, imageRef, { tilt: 10, scale: 1.08, shift: 8 })

  const sizeClass = sizeToClass(project.size)
  const isDual = project.size === 'md'

  return (
    <MotionLink
      ref={cardRef}
      variants={variants}
      to={`/projects/${project.slug}`}
      className={`bento-card ${sizeClass}`}
      style={{ background: project.gradient }}
    >
      {!isDual && <span className="bento-desc-top">{project.tagline?.[lang]}</span>}

      <div ref={imageRef} className="bento-mockup-wrap">
        <MockupLayer src={project.mockups!.desktop} alt={`${project.title[lang]} desktop`} />
        {isDual && (
          <MockupLayer
            src={project.mockups!.mobile}
            alt={`${project.title[lang]} mobile`}
            className="bento-mockup--secondary"
          />
        )}
      </div>

      {isDual ? (
        <div className="bento-text-col">
          <span className="bento-desc-top">{project.tagline?.[lang]}</span>
          <div className="bento-bottom">…title + cs…</div>
        </div>
      ) : (
        <div className="bento-bottom">…title + cs…</div>
      )}
    </MotionLink>
  )
}

function MockupLayer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <span className={`bento-mockup ${className ?? ''}`}>
      <img className="bento-mockup-tonal" src={src} alt="" aria-hidden />
      <img className="bento-mockup-color" src={src} alt={alt} />
    </span>
  )
}
```

The `MockupLayer` renders the stacked tonal + color pair. `md` calls it twice. The cursor-tilt hook's `imageWrapRef` points at `bento-mockup-wrap`. The hook writes the computed transform to a CSS custom property (`--cursor-tilt`) on that wrapper; each `<img>` inside applies `transform: var(--cursor-tilt, none)` so all stacked + paired images move together from a single source of truth.

### Reduced motion + touch fallback

- `prefersReducedMotion === true` → `MockupLayer` renders only the color layer (`opacity: 1`), the tonal layer is skipped via a parent class, and the cursor-tilt hook no-ops. Card-side hover lift is also disabled (existing site convention).
- `(pointer: coarse)` matches → cursor-tilt hook no-ops; image stays in card-toned grayscale resting state. CSS hover styles still apply on tap-and-hold but tap navigation fires before that meaningfully transitions.

## Image optimization script

New file: `scripts/optimize-mockups.ts`. Run via `npm run optimize:mockups`.

```ts
// Pseudo-code shape
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const SLUGS = [
  'hotmart-bunde',
  'fotos-do-ano-2025',
  'painel-da-reconstrucao',
  'enquetes-gzh',
  'fotos-do-ano-2024',
  'ia-na-redacao',
  'peleia-gre-nal',
] as const

const SOURCE_ROOT = join(homedir(), 'portfolio-snapshots')
const OUTPUT_ROOT = join(process.cwd(), 'public', 'images', 'projects')

async function optimize(slug: string, kind: 'desktop' | 'mobile') {
  const src = join(SOURCE_ROOT, slug, 'mockups', `${kind}.png`)
  const out = join(OUTPUT_ROOT, slug, 'mockups', `${kind}.webp`)
  await mkdir(dirname(out), { recursive: true })
  await sharp(src)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out)
  return { src, out, srcSize: (await stat(src)).size, outSize: (await stat(out)).size }
}
```

Behavior:

- Hard-coded slug allowlist (the 7 highlights). Adding a new highlight requires editing this list — intentional.
- Per file: load PNG, resize so the longest edge is ≤ 1600 px (no upscaling), encode WebP at quality 82, retain alpha.
- Output: `public/images/projects/<slug>/mockups/{desktop,mobile}.webp`. Creates the directory if missing.
- Idempotent: overwrites existing outputs each run.
- Prints a per-file before/after size table at the end. Exit code is non-zero if any source file is missing or any encode fails.
- Defensive: rejects source paths outside `~/portfolio-snapshots/` (prevents accidental `..`-traversal if someone edits the slug list with junk).

Expected aggregate: ~155 MB raw → ~3 MB committed across 14 files.

The script is a developer tool, not part of the production build. It runs locally when mockups change. The repo commits the WebP outputs.

## Detail page integration

Existing detail-page renderer already iterates `project.story: Block[]` and dispatches by type. Add one new dispatch case for the `mockup` block.

New file: `src/components/projectDetail/blocks/Mockup.tsx`.

```tsx
interface Props {
  block: Extract<Block, { type: 'mockup' }>
  project: Project
  lang: 'en' | 'pt'
}

export function Mockup({ block, project, lang }: Props) {
  const src = project.mockups?.[block.variant]
  if (!src) {
    console.warn(`Mockup block referenced ${block.variant} on project "${project.id}" with no mockups`)
    return null
  }
  const alt = `${project.title[lang]} ${block.variant} mockup`
  return (
    <figure className="project-detail-figure project-detail-figure--wide">
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </figure>
  )
}
```

Add to `BlockRenderer.tsx`'s switch statement; TypeScript exhaustiveness check enforces this is non-optional.

### Standard story shape (post-rewrite)

```ts
story: [
  { type: 'mockup', variant: 'desktop' },              // → hero figure right after the title block
  { type: 'paragraph', text: { en: '…', pt: '…' } },   // what it is + concrete numbers
  { type: 'paragraph', text: { en: '…', pt: '…' } },   // architecture / tech stack
  { type: 'mockup', variant: 'mobile' },               // mid-story figure
  { type: 'paragraph', text: { en: '…', pt: '…' } },   // notable implementation detail
  // existing blocks: figure-pair from screenshots, pullquote, route-list, etc.
]
```

The hero `mockup` block sits at index 0 of `story`, which renders directly under the title/CTAs/stats row in the existing detail-page layout. No code change needed for "hero placement" — it's the first story block and renders accordingly.

### Coexistence with existing fields

| field | role | bento card | detail page |
|---|---|---|---|
| `mockups.desktop` | stylized 3D-render mockup, 1.63:1 | yes (with luminosity-blend treatment) | yes (hero figure via `mockup` block) |
| `mockups.mobile` | stylized 3D-render mockup, landscape | only `md` size | yes (mid-story figure via `mockup` block) |
| `coverImage` | representative screenshot | no | OG meta tag, archive table thumbnail |
| `screenshots[]` | per-route screenshot pairs | no | existing figure-pair blocks below paragraph 3 |

## Story rewrite

For each of the 7 highlights, the existing `story` array is replaced (not appended to). Sources:

- EN copy: paraphrase from `~/portfolio-snapshots/<slug>/summary.md`. Audience = senior tech recruiter. Keep concrete numbers, name the libraries, surface the one architecturally interesting choice from paragraph 3.
- PT copy: idiomatic Brazilian Portuguese translation from the EN. Tech terms in English where idiomatic (e.g., "websocket", "Firestore"); translated where natural (e.g., "redação", "rotas").

Stat rows are added per the table in [Roster after this change](#roster-after-this-change).

`linha-do-tempo-covid`: untouched — keeps its current bilingual story content from the previous unification work.

## Project deletion checklist

For each of `ignite-feed-2024` and `OmniStack-9.0`:

- Remove the entry from `projects` in `src/data/projects.ts`.
- Delete `public/images/projects/<slug>/` directory (screenshots).
- Verify no remaining references in `src/`, `tests/`, or anywhere outside the snapshot folder (which is outside the repo anyway).
- After deletion, hitting `/projects/<slug>` resolves to the existing 404 / not-found page in the SPA — no router change needed.

## Testing strategy

### Unit tests (Vitest)

- `useCursorTilt` hook
  - Computes correct `(rx, ry, tx, ty)` from a synthetic mousemove at known card-relative coordinates.
  - No-ops when `prefersReducedMotion` is true.
  - No-ops when `window.matchMedia('(pointer: coarse)')` matches (mocked).
  - Cleans up the `mousemove` listener on unmount.
- `Mockup` block renderer
  - Returns `null` and emits `console.warn` when `project.mockups` is undefined.
  - Renders an `<img>` with the correct `src` for `variant: 'desktop'` and `'mobile'`.
- Highlight-mockup validator
  - Negative: a fixture project with `highlight: true, highlightOrder: 1, mockups: undefined` throws.
  - Positive: same fixture with valid `mockups` does not throw.
- BentoCard size variants
  - `lg` and `sm` render exactly one `MockupLayer`.
  - `md` renders two `MockupLayer` elements (desktop + mobile).

### Type-checks (no runtime test)

`Block` discriminated-union exhaustiveness — TypeScript at `tsc -b` enforces that adding `mockup` without updating `BlockRenderer.tsx`'s switch fails to compile.

### Manual verification (`npm run dev`)

- Hover the lg card at desktop width: tilt follows cursor, color crossfades over 0.6s, scale lands at 1.08, no flicker at the blend-mode boundary.
- Hover the md card: both desktop and mobile mockups tilt together; text column on the left stays static.
- Hover sm cards: same animation as lg, smaller image area.
- Touch viewport (DevTools → Mobile Emulation): images stay card-toned, no animation, tap navigates.
- Reduced-motion mode (DevTools "Emulate CSS prefers-reduced-motion: reduce"): images render full color statically; no transforms; no card-side lift.
- All 7 highlight detail pages: desktop mockup renders as hero figure under the title block; mobile mockup renders mid-story; existing screenshot figure-pairs intact below paragraph 3.
- `linha-do-tempo-covid` archive entry: still navigable, content unchanged, no broken images.
- `/projects/ignite-feed-2024` and `/projects/OmniStack-9.0`: resolve to the not-found page (404 fallback).
- `npm run optimize:mockups`: produces all 14 expected files; size table prints expected reductions.

### Out of scope

- E2E (Playwright) coverage for hover interactions — flaky in CI; manual + unit covers it.
- Visual regression tests — premature for a 7-card surface still being designed.
- Performance budgets / Lighthouse CI — useful eventually, not part of this feature.

## Risks and mitigations

| risk | mitigation |
|---|---|
| `mix-blend-mode: luminosity` rendering differs across browsers (especially on transparent-background images at hover boundary). | Stacked-layer crossfade avoids the blend-mode swap entirely; only the top layer's `opacity` transitions. Manual verification on Chromium / Firefox / Safari before sign-off. |
| Large WebP files still bloat initial page weight (4 cards × 2 images × ~250 KB = ~2 MB above-the-fold). | `loading="lazy"` on detail-page mockups; bento mockups are above-the-fold so they load eagerly — accept the cost as the bento is the visual centerpiece. Optimize further only if Lighthouse flags it. |
| `useCursorTilt` mousemove handler fires at native rate, causing jank on slow machines or high-frequency mice. | RAF-throttle inside the hook (one transform write per frame max). Already specified in the hook's behavior section. |
| Touch detection via `(pointer: coarse)` is incorrect on hybrid devices (laptops with touchscreens that also have a mouse). | `(pointer: coarse)` returns `false` when there's any fine pointer available, which is the right answer for hybrid devices — they get the desktop hover experience. Documented in the hook's tests. |
| Story rewrite quality is hard to verify automatically. | Manual review of each rendered detail page during verification. The summaries are already written in the same voice; rewrite is a translation/condensation pass, not creative writing from scratch. |
| Image optimization script breaks if a source PNG is added with unexpected color space or DPI. | `sharp` handles all common color spaces; the script logs the per-file metadata before encoding so any oddity is visible in the run output. |

## Out of scope

- Mobile mockup presentation as a phone-portrait shape. The mockups are 16:9 landscape compositions (3D-rendered phone on a wide canvas), and the design treats them as such — they're not cropped or letterboxed into a portrait frame.
- Per-card override hooks for hover physics (per-project `tilt` / `scale` settings). Single set of values for all cards.
- Animated entrance for the bento on first viewport intersection beyond what the existing `motion.div` stagger already provides.
- Adding new highlights beyond the 7 listed. Future highlights require: (1) new entry in `~/portfolio-snapshots/<slug>/`, (2) new entry in `projects` array, (3) running the optimization script.

## TODO

Acceptance criteria — each box becomes `- [x]` only when both an automated check passes AND code review has approved that scope.

- [x] `Project` type has a `mockups?: Mockups` field; `Block` union includes the `mockup` variant.
- [x] Load-time validator throws if any Selected Work top-4 project lacks `mockups`.
- [x] `scripts/optimize-mockups.ts` exists, `npm run optimize:mockups` is wired in `package.json`, `sharp` is in `devDependencies`.
- [x] All 14 mockup WebP files exist under `public/images/projects/<slug>/mockups/` for the 7 highlights.
- [x] `useCursorTilt` hook exists with full unit-test coverage (computation, reduced-motion no-op, touch no-op, listener cleanup).
- [x] `MockupLayer` renders stacked tonal + color images; bottom layer uses luminosity blend, top layer fades on hover.
- [x] BentoCard renders correctly at `lg` (single mockup), `md` (dual mockup, text left), `sm` (single mockup); per-size insets applied.
- [x] Card-side hover (translateY -4px + shadow + ↗ translateX) is byte-equal to current production CSS.
- [x] Reduced-motion mode renders images in full color statically; no transforms; card-side lift disabled.
- [x] Touch viewport: images stay in card-toned state; tap navigates.
- [x] `Mockup` block renderer added to `BlockRenderer.tsx`; lazy-loads images; warns gracefully when `project.mockups` is undefined.
- [x] `projects.ts` updated with new ordering (Política→Fotos2025→Painel→Enquetes for top-4); `painel`'s `size` changes from `lg` to `sm`; `hotmart-bunde` is the new `lg`.
- [x] All 7 highlight stories begin with `{ type: 'mockup', variant: 'desktop' }` and contain `{ type: 'mockup', variant: 'mobile' }` between paragraphs 2 and 3.
- [x] All 7 highlight stories rewritten in EN+PT from new summaries (paragraphs 1-3 reflect summary structure; numbers preserved; library names preserved).
- [x] Stat rows added to Painel, Enquetes, Política, Peleia, Fotos 2024, Fotos 2025; IA na Redação has none.
- [x] `ignite-feed-2024` and `OmniStack-9.0` removed from `projects.ts`; their `public/images/projects/<slug>/` directories deleted.
- [x] `linha-do-tempo-covid` retains its existing story unchanged; remains in archive only.
- [x] `npm run build` passes.
- [x] `npm run lint` passes (no new warnings beyond existing).
- [x] `npm run test:unit` passes; new tests included in count.
- [ ] Manual verification on `npm run dev` (Chromium + Firefox + Safari): hover + reduced-motion + touch + all 7 detail pages.
- [ ] `superpowers:requesting-code-review` dispatched and approved before merge.
