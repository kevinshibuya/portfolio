# Plan 1 — Warm paper tokens · Scene 0 hero · Scene 1 byline

**For agentic workers:** Execute tasks in order. Each task is a self-contained slice with a Files
boundary, a Consumes/Produces interface block, a RED acceptance test authored here (read-only — you
make it pass, you never edit it), complete-or-contract-level Work, exact commands with expected
output, and a commit step. **Tick each step's `- [ ]` → `- [x]` in THIS file immediately after that
step's command lands successfully, before starting the next step** (project checkbox discipline — do
not batch ticks). If anything is ambiguous for your rung, stop and return `blocked: <ambiguity>`; the
orchestrator re-dispatches up-ladder. Do not create branches or touch git config; the branch
`design/work-first-press-revamp` is already checked out.

## Goal

Land the first slice of the work-first press revamp: swap the token layer to warm paper neutrals,
rebuild Scene 0 (hero) around the untouched ink-draw entrance with a solid-blue period-free surname +
static canonical title + pointer-lit paper grain, delete the retired R3F icosahedron accent, and
build Scene 1 (the byline) including the reusable rosette-halftone shader primitive (portrait consumer
here; the wipe consumer is Plan 2). Existing below-hero sections may look odd on the new neutrals —
that is acceptable and restyled in later plans.

## Architecture

- **Token layer** (`src/index.css` `@theme` + `:root`): warm paper family re-points the existing
  `cream`/`sand`/`mist` token *values*; the blue scale and ink are kept. Token *names* are unchanged
  so all 52 existing `var(--…)` consumers keep reading tokens with zero component churn.
- **Scene 0 hero** (`src/components/sections/Hero.tsx` + `HeroNameDrawing.tsx` + `HeroPaperGrain.tsx`):
  the SVG ink-draw entrance (trace + ink-fill, curtain handshake, refs) is **inviolable** — only the
  surname glyph source (drop the period), its viewBox width, the sr-only h1 text, and the `--ghost`
  fill color change. Canonical title is static and leads; the existing role-cycle logic is kept and
  re-presented as a clean crossfade. The R3F accent (`HeroAccent3D` + `HeroAccentSilhouette`) and its
  now-dead feature flag (`ENABLE_R3F_ACCENT`, `r3fAccentEnabled`) are deleted. A cheap non-R3F
  pointer-lit grain layer mounts only after `entranceDone` (same deferral pattern the R3F accent used).
- **Halftone primitive** (`src/canvas/halftone/`): a drei `shaderMaterial` (`HalftoneMaterial`) built
  **once** with the full uniform set for BOTH the portrait develop (mode 0) and Plan 2's goes-to-press
  wipe (mode 1). `<HalftonePortrait>` is the first consumer. One WebGL context, `frameloop="demand"`,
  IntersectionObserver-gated mount, DPR capped, with mobile / no-WebGL / reduced-motion falling back to
  a pre-baked duotone `<img>`. The exported interface is locked in Task 5's Produces block — Plan 2
  depends on it verbatim.
- **Scene 1 byline** (`src/components/sections/Byline.tsx`): asymmetric layout, `<HalftonePortrait>`
  scrubbed by a Framer `useScroll` progress MotionValue, real caption, first-person specifics
  paragraph, one scanned-handwriting margin note rendered from a placeholder image asset. Wired into
  `Home.tsx` between Hero and the rest.
- **Placeholder assets**: real portrait + handwriting scan are owner deliverables. This plan generates
  clearly-marked solid-tone placeholders and documents a single-point filename swap.

## Tech Stack

React 19 + TypeScript (strict, no `any`) · Vite 6 + SWC · TailwindCSS v4 via CSS `@theme` (no config
file) · Framer Motion v12 (state-tied + MotionValue scrub) · GSAP + ScrollTrigger (not used in this
plan) · React Three Fiber `@react-three/fiber@9` + `@react-three/drei@10` + `three@0.183` (halftone
shader) · react-i18next (EN + PT-BR) · Lenis smoothing (existing) · Vitest 4 (jsdom) · Playwright 1.59
(desktop-chromium + mobile-chromium against `npm run preview` on :4173).

## Global Constraints (hard requirements — copied from the spec)

- **Voice: lowercase everywhere.** Name set solid, stroke-free, period-free. No `word + blue italic
  word + period` heading formula. No spaced em-dashes in reader-facing prose (separators use `·` or
  restructure). Every string authored natively in BOTH `en` and `pt-BR`.
- **Ink-draw hero entrance is inviolable and unchanged.** Do not touch its trace/ink-fill timing,
  curtain await, ref mechanism, or `onComplete`→`resolveEntrance` wiring. Hero LCP unchanged; the grain
  layer is deferred behind `entranceDone`.
- **Zero pins site-wide; native scroll (Lenis smoothing).** Exactly one WebGL context in this plan,
  scroll-range gated, DPR capped. This plan builds the halftone shader; the single goes-to-press wipe
  is Plan 2 — do not build a wipe here.
- **Mobile + reduced-motion tell the same story statically**: pre-baked duotone image, no shader, no
  pointer light.
- **Re-render above an in-flight `whileInView(once)` stagger freezes children at opacity 0.** Route all
  pointer/scroll state through MotionValues + leaf components; never `setState` in a parent during the
  entrance cascade.
- **Animation library lanes never mix on one animation**: Framer Motion for state-tied + MotionValue
  scrub; GSAP only inside `gsap.context()` with cleanup (unused here); R3F for the shader only.
- **jsdom gotcha:** `HeroNameDrawing` detects the missing `getBBox` API and resolves `entranceDone`
  immediately in jsdom. Any test that needs un-resolved entrance state MUST `vi.mock` `HeroNameDrawing`.
- **App-shell/hero tasks verify with a real-browser mount smoke** (headless Playwright: page loads,
  root renders, zero console errors) IN ADDITION to typecheck/lint/unit. Lighthouse audits run against
  `npx vite preview` (:4173), never the dev server.
- **Placeholder assets** are owner deliverables — use clearly-marked placeholder files with a single,
  documented swap point.

## Commands (canonical)

| purpose | command | expected |
|---|---|---|
| typecheck | `npx tsc -b --noEmit` | exits 0, no output |
| lint | `npm run lint` | exits 0, no errors |
| unit (all) | `npm run test:unit` | all files pass |
| unit (one) | `npx vitest run <path>` | target file passes |
| e2e smoke | `npx playwright test <path> --project=desktop-chromium` | passing |
| build | `npm run build` | `tsc -b` clean + vite build succeeds |
| preview + lighthouse | `npx vite preview --port 4173` then Lighthouse mobile preset | perf ≥ 90, a11y ≥ 95 |

> Note: `npm run preview` runs `wrangler dev`; for Lighthouse use `npx vite preview --port 4173` per
> the project's Lighthouse note. Playwright's own `webServer` already builds + serves on :4173.

---

## Task 1 — Warm paper neutral tokens

**Model:** editor-sonnet-low
**Spec TODO:** `Design tokens: warm paper neutral set replaces cool cream/sand/mist; blue scale + ink kept; all components read from tokens`

### Files
- `src/index.css` — modify: re-point the three neutral token values in the `@theme` block AND the
  `:root` block; ALSO fix `.loader-mark` (~line 324) whose `color: #F6F9FC` fallback hex must become
  `color: var(--cream);` (it is light text on the ink loader curtain — semantically the cream token).
- `index.html` — modify: `<meta name="theme-color">` (~line 29) and `<meta name="msapplication-TileColor">`
  (~line 48) from `#F6F9FC` → `#F7F5F1`; the inline first-paint `.loader-mark` style (~line 369)
  `color: #F6F9FC` → `#F7F5F1` (inline styles can't read the token).
- `public/site.webmanifest` — modify: `background_color` and `theme_color` (lines 7-8) `#F6F9FC` → `#F7F5F1`.
- `tests/unit/tokens.test.ts` — create: the RED acceptance test (below).

> Deferred (documented, NOT this task): old-mist gradient literals in `src/components/sections/Projects.tsx:166`,
> `src/data/embeds.ts:67`, `src/data/archive.ts:24` are imagery gradients; re-point to the warm mist in the
> later section-restyle plan.

### Interfaces
- **Consumes:** nothing.
- **Produces:** token *values* changed; token *names* (`--cream`/`--sand`/`--mist`,
  `--color-cream`/`--color-sand`/`--color-mist`) unchanged so downstream consumers are untouched.

### Warm paper ramp (exact values — replace the cool values everywhere they appear in `@theme` and `:root`)

| token | old (cool) | new (warm paper) | role |
|---|---|---|---|
| `cream` / `color-cream` | `#F6F9FC` | `#F7F5F1` | page background / light text on ink |
| `sand` / `color-sand` | `#EAF2F8` | `#EFEAE1` | tonal section |
| `mist` / `color-mist` | `#D4E5F2` | `#E2DACB` | borders / ghost |

Blue scale (`--blue-*`, `--color-blue-*`), ink/bark/dust, and periwinkle tokens are **kept exactly**.

### Acceptance check (RED — authored here, read-only)
`tests/unit/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8')

describe('warm paper neutral tokens', () => {
  it('re-points cream/sand/mist to the warm paper family in both @theme and :root', () => {
    // two occurrences each: --color-<name> (@theme) and --<name> (:root)
    expect(css.match(/#F7F5F1/gi) ?? []).toHaveLength(2)
    expect(css.match(/#EFEAE1/gi) ?? []).toHaveLength(2)
    expect(css.match(/#E2DACB/gi) ?? []).toHaveLength(2)
  })

  it('drops the old cool cream/sand/mist neutral values', () => {
    expect(css).not.toMatch(/#F6F9FC/i) // old cream
    expect(css).not.toMatch(/#EAF2F8/i) // old sand
    expect(css).not.toMatch(/#D4E5F2/i) // old mist
  })

  it('keeps the blue scale and ink untouched', () => {
    expect(css).toMatch(/#3A96E8/i) // blue-400 accent
    expect(css).toMatch(/#111822/i) // ink
    expect(css).toMatch(/#1C6EC4/i) // blue-500
  })
})
```

### Steps
- [x] **Step 1:** Create `tests/unit/tokens.test.ts` with the code above. Run `npx vitest run tests/unit/tokens.test.ts` — expect FAIL (old values still present). RED confirmed.
- [x] **Step 2:** In `src/index.css` `@theme` block, set `--color-cream: #F7F5F1;`, `--color-sand: #EFEAE1;`, `--color-mist: #E2DACB;`.
- [x] **Step 3:** In `src/index.css` `:root` block, set `--cream: #F7F5F1;`, `--sand: #EFEAE1;`, `--mist: #E2DACB;`.
- [x] **Step 4:** In `src/index.css` `.loader-mark` (~line 324), change `color: #F6F9FC;` to `color: var(--cream);` (keep the comment). Without this the test's zero-old-values assertion cannot pass, and a third `#F7F5F1` literal would break the exactly-2 count.
- [x] **Step 5:** In `index.html`: theme-color (~29) and msapplication-TileColor (~48) → `#F7F5F1`; inline `.loader-mark` color (~369) → `#F7F5F1`. (Browser chrome + first-paint loader must match the warm paper.)
- [x] **Step 6:** In `public/site.webmanifest`: `background_color` and `theme_color` → `#F7F5F1`.
- [x] **Step 7:** Run `npx vitest run tests/unit/tokens.test.ts` — expect PASS (GREEN).
- [x] **Step 8:** Run `npx tsc -b --noEmit` and `npm run lint` — both clean.
- [x] **Step 9:** Commit: `feat(tokens): warm paper neutrals replace cool cream/sand/mist (tokens + chrome + loader)`.

### Verify before returning
- `npx vitest run tests/unit/tokens.test.ts` green · `npx tsc -b --noEmit` clean · `npm run lint` clean.

### Boundaries
- Out of scope: renaming tokens, editing any component, restyling sections that now look odd on the
  new neutrals, the blue/periwinkle/ink tokens.

---

## Task 2 — Hero + byline i18n copy (EN + PT-BR)

**Model:** editor-sonnet-low
**Spec TODO:** `i18n: all new strings authored EN + PT-BR natively; zero spaced em-dashes in reader-facing prose`

### Files
- `src/i18n/locales/en.json` — modify: add `hero.title`, replace `hero.description`, add `byline.*`.
- `src/i18n/locales/pt.json` — modify: the same keys, PT-BR values.
- `tests/unit/seo/press-copy.test.ts` — create: the RED acceptance test (below).

### Interfaces
- **Consumes:** nothing.
- **Produces:** i18n keys `hero.title`, `hero.description` (updated), `byline.caption`, `byline.body`,
  `byline.marginNoteAlt`, `byline.portraitAlt` in both locales. Consumed by Task 4 (hero) and Task 8
  (byline).

### Exact strings

**`en.json`** — under `hero`, add `"title"` and replace `"description"`:
```json
"title": "senior front-end engineer · react/typescript",
"description": "<strong>rough ideas → shipped products.</strong> 249 pieces, read by millions across southern brazil.",
```
**`en.json`** — add a top-level `"byline"` block (place it after the `hero` block). The `body` uses a
colon, not a spaced em-dash (spaced em-dashes are banned in reader-facing prose):
```json
"byline": {
  "caption": "kevin, porto alegre",
  "body": "i'm a front-end engineer in porto alegre. for seven years i've built interactive journalism at gzh: simulators, maps, quizzes, live polls. 249 pieces, read by millions across southern brazil. what i chase is the second a reader stops scrolling because the thing on the page actually works.",
  "marginNoteAlt": "handwritten margin note: ship it, then make it sing",
  "portraitAlt": "kevin shibuya, high-contrast portrait"
},
```

**`pt.json`** — under `hero`, add `"title"` and replace `"description"`:
```json
"title": "engenheiro front-end sênior · react/typescript",
"description": "<strong>do esboço ao produto final.</strong> 249 peças, lidas por milhões no sul do brasil.",
```
**`pt.json`** — add a top-level `"byline"` block after the `hero` block:
```json
"byline": {
  "caption": "kevin, porto alegre",
  "body": "sou engenheiro front-end em porto alegre. há sete anos construo jornalismo interativo na gzh: simuladores, mapas, quizzes, enquetes ao vivo. 249 peças, lidas por milhões no sul do brasil. o que eu persigo é o segundo em que o leitor para de rolar porque a coisa na página realmente funciona.",
  "marginNoteAlt": "nota à mão na margem: publica, depois faz cantar",
  "portraitAlt": "kevin shibuya, retrato em alto contraste"
},
```

### Acceptance check (RED — authored here, read-only)
`tests/unit/seo/press-copy.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

const readerFacing = (o: Record<string, unknown>): string[] => {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v as object).forEach(walk)
  }
  walk(o)
  return out
}

describe('press revamp copy', () => {
  it('adds a canonical hero title in both locales', () => {
    expect(en.hero.title).toBe('senior front-end engineer · react/typescript')
    expect(pt.hero.title).toBe('engenheiro front-end sênior · react/typescript')
  })

  it('retires the "a team of one" tagline', () => {
    expect(en.hero.description).not.toMatch(/team of one/i)
    expect(pt.hero.description).not.toMatch(/time de um/i)
    expect(en.hero.description).toMatch(/249 pieces/)
    expect(pt.hero.description).toMatch(/249 peças/)
  })

  it('authors the byline block in both locales', () => {
    for (const loc of [en, pt] as const) {
      expect(loc.byline.caption).toBe('kevin, porto alegre')
      expect(loc.byline.body.length).toBeGreaterThan(120)
      expect(loc.byline.marginNoteAlt.length).toBeGreaterThan(0)
      expect(loc.byline.portraitAlt.length).toBeGreaterThan(0)
    }
  })

  it('has zero spaced em-dashes anywhere in reader-facing prose', () => {
    for (const loc of [en, pt] as const) {
      for (const s of readerFacing(loc as unknown as Record<string, unknown>)) {
        expect(s.includes(' — '), `spaced em-dash in: "${s}"`).toBe(false)
      }
    }
  })
})
```

### Steps
- [x] **Step 1:** Create `tests/unit/seo/press-copy.test.ts` with the code above. Run `npx vitest run tests/unit/seo/press-copy.test.ts` — expect FAIL (keys missing). RED confirmed.
- [x] **Step 2:** Edit `src/i18n/locales/en.json`: add `hero.title`, replace `hero.description`, add the `byline` block (use the em-dash-free `body`). Keep JSON valid (commas).
- [x] **Step 3:** Edit `src/i18n/locales/pt.json`: the same keys with the PT-BR values above.
- [x] **Step 4:** Run `npx vitest run tests/unit/seo/press-copy.test.ts tests/unit/seo/i18n-roles.test.ts` — both PASS (GREEN; the roles test must still pass since `roles` is untouched).
- [x] **Step 5:** Run `npx tsc -b --noEmit` and `npm run lint` — clean.
- [x] **Step 6:** Commit: `feat(i18n): canonical hero title + byline copy (en + pt-br)`.

### Verify before returning
- `npx vitest run tests/unit/seo/press-copy.test.ts` green · roles test still green · JSON parses · lint clean.

### Boundaries
- Out of scope: nav item strings/rename, removing `hero.stats`/`stats`/`sections.*` keys (later plans),
  editing components. Do NOT delete existing keys — other sections still read them this plan.

> **Known transient contradiction (reviewed, accepted):** the still-rendered Stats section shows
> "250+" (`src/data/stats.ts:24`) while the new hero/byline copy says "249". This coexists until the
> Stats section is retired in a later plan. "249" is an owner-supplied published count NOT derivable
> from repo data (`embeds.csv` has 162 rows) — the owner must confirm the real count before the
> archive plan ships its "249 pieces" masthead.

---

## Task 3 — HeroPaperGrain leaf component (pointer-lit paper grain)

**Model:** implementer-sonnet-medium
**Spec TODO:** `Scene 0: … pointer-lit grain layer deferred behind entranceDone …`

### Files
- `src/components/ui/HeroPaperGrain.tsx` — create: the grain layer leaf component.
- `src/index.css` — modify: add the `.hero-paper-grain*` styles (append near the hero section styles).
- `tests/unit/HeroPaperGrain.test.tsx` — create: the RED acceptance test (below).

### Interfaces
- **Consumes:** `useMotion()` (`prefersReducedMotion`).
- **Produces:**
```ts
// src/components/ui/HeroPaperGrain.tsx
export function HeroPaperGrain(): JSX.Element
```
  A self-contained leaf. Owns its pointer MotionValues internally; **never calls `setState` on
  pointer move** (routes pointer → MotionValue → CSS custom property via `useMotionTemplate` /
  `motionValue.on`). Consumed by Task 4 (Hero mounts it only after `entranceDone`).

### Work (full behavioral contract — internal structure is your choice within these constraints)

Render a single `aria-hidden`, `pointer-events: none` element `<motion.div className="hero-paper-grain">`
positioned to cover the hero. It has two visual layers:
1. **Grain texture** — a static, tileable noise via an inline SVG `feTurbulence` data-URI background
   (keep the data-URI tiny; total component runtime cost < 2KB, no new dependency). Idle behavior:
   slow drift only, via a CSS `@keyframes` translating `background-position` (no JS loop, no pulse).
2. **Pointer light** — a soft radial-gradient highlight that follows the pointer. Its position is
   driven by two `useMotionValue`s (`x`, `y`, initialized to the hero center as `50%`/`40%`), updated
   by a `pointermove` listener on `window` (attached in a `useEffect`, cleaned up on unmount). Map the
   values into CSS with `useMotionTemplate` and apply via `style={{ '--lx': lx, '--ly': ly }}` on the
   motion.div (or on an inner light element). **No React state updates in the pointer handler.**

Reduced motion / coarse pointer: when `prefersReducedMotion` is true, render only the static grain
layer (no pointer listener, no light element, no drift keyframe) so the reduced-motion story is a flat
paper texture. Detect coarse pointer with `window.matchMedia('(pointer: coarse)').matches` and likewise
skip the pointer light (grain drift may remain).

CSS (append to `src/index.css`):
```css
/* Pointer-lit paper grain — Scene 0. Deferred behind entranceDone by Hero.
   Cheap non-R3F texture layer: static feTurbulence grain + a pointer-follow
   radial light. Idle = grain drift only; no pulses. */
.hero-paper-grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  /* the pointer light, positioned by --lx/--ly (set from MotionValues) */
  background:
    radial-gradient(
      420px circle at var(--lx, 50%) var(--ly, 40%),
      rgba(255, 255, 255, 0.55),
      rgba(255, 255, 255, 0) 60%
    );
  mix-blend-mode: soft-light;
}
.hero-paper-grain::before {
  content: "";
  position: absolute;
  inset: -20%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  opacity: 0.5;
  mix-blend-mode: multiply;
  animation: grain-drift 18s linear infinite;
}
@keyframes grain-drift {
  0%   { background-position: 0 0; }
  100% { background-position: 180px 180px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-paper-grain { background: none; }
  .hero-paper-grain::before { animation: none; }
}
```

### Acceptance check (RED — authored here, read-only)
`tests/unit/HeroPaperGrain.test.tsx`:
```ts
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { HeroPaperGrain } from '../../src/components/ui/HeroPaperGrain'

describe('HeroPaperGrain', () => {
  it('renders an aria-hidden, non-interactive grain layer', () => {
    const { container } = render(
      <MotionProvider><HeroPaperGrain /></MotionProvider>,
    )
    const layer = container.querySelector('.hero-paper-grain')
    expect(layer).not.toBeNull()
    expect(layer!.getAttribute('aria-hidden')).toBe('true')
  })

  it('does not throw on a window pointermove (MotionValue path, no setState)', () => {
    render(<MotionProvider><HeroPaperGrain /></MotionProvider>)
    expect(() =>
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 })),
    ).not.toThrow()
  })
})
```

### Steps
- [x] **Step 1:** Create `tests/unit/HeroPaperGrain.test.tsx` with the code above. Run `npx vitest run tests/unit/HeroPaperGrain.test.tsx` — expect FAIL (component missing). RED confirmed.
- [x] **Step 2:** Create `src/components/ui/HeroPaperGrain.tsx` per the behavioral contract. Render `<motion.div className="hero-paper-grain" aria-hidden="true">`.
- [x] **Step 3:** Append the `.hero-paper-grain*` CSS block above to `src/index.css`.
- [x] **Step 4:** Run `npx vitest run tests/unit/HeroPaperGrain.test.tsx` — expect PASS (GREEN).
- [x] **Step 5:** Run `npx tsc -b --noEmit` and `npm run lint` — clean (no `any`).
- [x] **Step 6:** Commit: `feat(hero): pointer-lit paper grain leaf component`.

### Verify before returning
- Unit test green · typecheck clean · lint clean · pointer handler uses MotionValues only (grep the
  file: no `useState`/`setState` reacting to pointer events).

### Boundaries
- Out of scope: mounting the grain (Task 4 does that), any R3F, any new npm dependency, `setState` on
  pointer move.

---

## Task 4 — Scene 0 hero rebuild + R3F accent deletion + dead-flag cleanup

**Model:** integrator-opus-high
**Spec TODO:** `Scene 0: entrance untouched, solid surname, static canonical title + crossfade role cycle, pointer-lit grain layer deferred behind entranceDone, R3F accent components deleted`

### Files
- `src/components/sections/Hero.tsx` — modify: remove all `HeroAccent3D`/`HeroAccentSilhouette` imports
  + lazy-load state + the `.hero-accent-mount` block; add the static canonical title (`hero.title`);
  mount `<HeroPaperGrain />` only after `entranceDone` (reuse the existing `gate`/deferral pattern);
  keep the role-cycle logic and re-present it as a crossfade; keep the description (now the new copy)
  and CTAs; add a plain mono `scroll ↓` cue.
- `src/components/ui/HeroNameDrawing.tsx` — modify (surgical, do NOT touch trace/ink-fill/curtain
  logic): filter the trailing period glyph from the shibuya word, recompute the shibuya viewBox width
  from the last kept glyph, and set the sr-only h1 text to `kevin shibuya` (no period).
- `src/components/canvas/HeroAccent3D.tsx` — **delete**.
- `src/components/canvas/HeroAccentSilhouette.tsx` — **delete**.
- `src/context/MotionContext.tsx` — modify: remove the `r3fAccentEnabled` field, the `r3fEnabled`
  state/effect, and the `ENABLE_R3F_ACCENT` import.
- `src/utils/motion-flags.ts` — modify: remove the `ENABLE_R3F_ACCENT` export (keep the others).
- `src/index.css` — modify: change `.hero-name-drawing-glyph--ghost` to solid blue (no stroke); remove
  the `.hero-accent-mount` rules (lines ~1308, ~1343–1362 region); add `.hero-title` + `.hero-scroll-cue`
  styles; add `position: relative; z-index: 1` to `.hero-main` if not already (it is) so grain sits behind.
- `tests/unit/Hero.test.tsx` — modify: replace the HeroAccent3D deferral test with the grain-deferral
  test (RED authored below).
- `tests/unit/HeroNameDrawing.test.tsx` — modify: update the surname assertions (RED authored below).
- `tests/e2e/perf-budget.spec.ts` — modify: delete the now-meaningless
  `test.describe('mobile viewport disables R3F accent')` block (the accent no longer exists).

### Interfaces
- **Consumes:** `hero.title` + updated `hero.description` (Task 2); `HeroPaperGrain` (Task 3);
  `useMotion()` (`entranceDone`, `resolveEntrance`, `prefersReducedMotion`).
- **Produces:** hero renders a static canonical title leading, crossfading role cycle beneath, new copy
  line, solid-blue period-free surname, deferred grain layer, mono scroll cue; R3F accent + dead flag
  gone.

### Work (design intent + hard constraints — shape is yours to judge)

1. **Delete the accent.** Remove both accent files and every reference. In `Hero.tsx` delete the
   `HeroAccent3DLazy` type, the `HeroAccent3D` import-in-state effect, the `Suspense`/silhouette
   fallback, and the `<RevealOnView … className="hero-accent-mount">` wrapper entirely.
2. **Dead-flag cleanup** (forward-compat trap — the plan-review lesson): `ENABLE_R3F_ACCENT` and
   `r3fAccentEnabled` are now dead. Remove `r3fAccentEnabled` from `MotionContextValue`, delete the
   `r3fEnabled` state + its effect, drop it from the `useMemo` value + deps, remove the
   `ENABLE_R3F_ACCENT` import (keep `MOBILE_BREAKPOINT_PX` only if still used — it is only used by that
   effect, so remove the import entirely if the effect is gone), and delete `export const
   ENABLE_R3F_ACCENT` from `motion-flags.ts`. Verify nothing else imports either symbol
   (`grep -rn 'ENABLE_R3F_ACCENT\|r3fAccentEnabled\|MOBILE_BREAKPOINT_PX' src tests` after editing).
3. **Static canonical title leads.** Above the role line, render the canonical title as static,
   legible text: `<p className="hero-title">{t('hero.title')}</p>` (lowercase, mono/`·` separator per
   the string). It leads; the role cycle sits beneath it.
4. **Role cycle = clean crossfade.** Keep the existing `roles`/`roleIdx`/`startCycling`/`cycleRole`
   logic and the `AnimatePresence mode="wait"` crossfade verbatim (no variable-weight morph). It stays
   gated on `gate` (entrance-complete). Keep it clickable/keyboard-accessible as today.
5. **Surname solid blue, period-free.** In `HeroNameDrawing.tsx`: derive
   `const shibuyaGlyphs = NAME_SHIBUYA.glyphs.filter((g) => g.char !== '.')`; render `shibuyaGlyphs`
   instead of `NAME_SHIBUYA.glyphs`; compute the viewBox width as
   `const shibuyaWidth = shibuyaGlyphs.length ? shibuyaGlyphs[shibuyaGlyphs.length - 1].x + shibuyaGlyphs[shibuyaGlyphs.length - 1].advance : NAME_SHIBUYA.totalAdvance`
   and use it in `viewBoxShibuya`; set the sr-only h1 to `kevin shibuya`. In `index.css` change
   `.hero-name-drawing-glyph--ghost` to `{ fill: var(--blue-400); stroke: transparent; }` (solid blue,
   no outline). **Do not touch** the trace/ink-fill effect, the curtain await, refs, `pathLength`
   logic, or `onComplete` timing. **Known + accepted timing consequence (reviewed, do not "fix"):**
   `totalTrace = (allPaths.length - 1) * STAGGER_MS + TRACE_DUR_MS`, so tracing 12 glyphs instead of 13
   ends the entrance exactly one stagger (80ms) earlier. That is intrinsic to the ratified period
   removal; per-glyph timing, stagger, and the curtain handshake are unchanged. Do NOT pad the
   duration back to the 13-glyph total.
6. **Grain deferral.** Mount `<HeroPaperGrain />` as the first child of the hero, behind `.hero-main`
   (grain `z-index:0`, main `z-index:1`), and only after `entranceDone` — reuse the existing `gate`
   state (`gate` already flips on `entranceDone.then`). Render `{gate && <HeroPaperGrain />}`. This
   keeps LCP unchanged and avoids the entrance-cascade freeze (gate flips AFTER the stagger).
7. **Scroll cue.** Add a plain mono `scroll ↓` cue at the bottom of the hero (`<div className=
   "hero-scroll-cue">scroll ↓</div>`), gated behind `gate` via a `RevealOnView` if you want it to
   appear after entrance; keep it static (no bounce loop under reduced motion).

CSS additions (author to match the paper palette; keep lowercase mono aesthetic):
```css
.hero-title {
  font-family: var(--font-mono);
  font-size: clamp(13px, 1.5vw, 16px);
  letter-spacing: 0.02em;
  color: var(--bark);
  text-transform: lowercase;
  margin: 0 0 4px;
}
.hero-scroll-cue {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--dust);
  text-transform: lowercase;
}
```

### Acceptance check A (RED — replaces the body of `tests/unit/Hero.test.tsx`, read-only once written)
```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// Stub the grain leaf so we can assert mount timing by DOM presence.
vi.mock('../../src/components/ui/HeroPaperGrain', () => ({
  HeroPaperGrain: () => <div data-testid="hero-grain-stub" />,
}))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => false }
})

// HeroNameDrawing resolves entranceDone immediately in jsdom (missing getBBox);
// replace with an inert stub so the test owns the before-entrance timing.
vi.mock('../../src/components/ui/HeroNameDrawing', () => ({
  HeroNameDrawing: () => <div data-testid="hero-name-drawing-stub" />,
}))

import '../../src/i18n'
import { MotionProvider, resolveEntrance } from '../../src/context/MotionContext'
import { Hero } from '../../src/components/sections/Hero'

describe('Hero — grain layer deferral', () => {
  it('mounts HeroPaperGrain only after entranceDone resolves', async () => {
    render(<MotionProvider><Hero /></MotionProvider>)

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.queryByTestId('hero-grain-stub')).toBeNull()

    await act(async () => {
      resolveEntrance()
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.queryByTestId('hero-grain-stub')).not.toBeNull()
    })
  })

  it('renders the static canonical title', () => {
    render(<MotionProvider><Hero /></MotionProvider>)
    expect(screen.getByText('senior front-end engineer · react/typescript')).toBeInTheDocument()
  })
})
```

### Acceptance check B (RED — replaces the surname assertions in `tests/unit/HeroNameDrawing.test.tsx`)
Update the two affected assertions to:
```ts
  it('renders 5 kevin glyphs and 7 shibuya glyphs (period dropped) as SVG paths', () => {
    const { container } = render(
      <MotionProvider><HeroNameDrawing /></MotionProvider>
    )
    const kevinSvg = container.querySelector('[data-name-word="kevin"]')
    const shibuyaSvg = container.querySelector('[data-name-word="shibuya"]')
    expect(kevinSvg!.querySelectorAll('path')).toHaveLength(5)
    expect(shibuyaSvg!.querySelectorAll('path')).toHaveLength(7)
  })

  it('renders a screen-reader-only h1 with the period-free name', () => {
    const { container } = render(
      <MotionProvider><HeroNameDrawing /></MotionProvider>
    )
    const sr = container.querySelector('h1.sr-only')
    expect(sr?.textContent).toBe('kevin shibuya')
  })
```
And in the `data-name-glyph` test, change the last index assertion from `"12"` to `"11"` (kevin 0–4,
shibuya 5–11 after dropping the period).

### Steps
- [x] **Step 1:** Rewrite `tests/unit/Hero.test.tsx` to Acceptance check A. Update `tests/unit/HeroNameDrawing.test.tsx` per Acceptance check B. Run `npx vitest run tests/unit/Hero.test.tsx tests/unit/HeroNameDrawing.test.tsx` — expect FAIL. RED confirmed.
- [x] **Step 2:** Edit `HeroNameDrawing.tsx`: filter the period glyph, recompute `shibuyaWidth`/`viewBoxShibuya`, set sr-only h1 to `kevin shibuya`. Do not touch trace/ink-fill/curtain logic.
- [x] **Step 3:** In `src/index.css`: set `.hero-name-drawing-glyph--ghost { fill: var(--blue-400); stroke: transparent; }`; remove the `.hero-accent-mount` rules; add `.hero-title` + `.hero-scroll-cue`.
- [x] **Step 4:** Rewrite `Hero.tsx`: delete accent imports/state/mount; add `<p className="hero-title">{t('hero.title')}</p>` leading; keep role crossfade + description + CTAs; render `{gate && <HeroPaperGrain />}` first child; add the scroll cue.
- [x] **Step 5:** Delete `src/components/canvas/HeroAccent3D.tsx` and `src/components/canvas/HeroAccentSilhouette.tsx`.
- [x] **Step 6:** Edit `MotionContext.tsx` (drop `r3fAccentEnabled`, `r3fEnabled` state/effect, imports) and `motion-flags.ts` (drop `ENABLE_R3F_ACCENT`). Run `grep -rn 'ENABLE_R3F_ACCENT\|r3fAccentEnabled\|HeroAccent' src tests` — expect only the deleted perf-budget block remaining (fixed next step).
- [x] **Step 7:** In `tests/e2e/perf-budget.spec.ts` delete the `test.describe('mobile viewport disables R3F accent')` block.
- [x] **Step 8:** Run `npx vitest run tests/unit/Hero.test.tsx tests/unit/HeroNameDrawing.test.tsx` — expect PASS (GREEN).
- [x] **Step 9:** Run `npm run test:unit` (full suite) — all green (no lingering references).
- [x] **Step 10:** Run `npx tsc -b --noEmit` and `npm run lint` — clean.
- [x] **Step 11:** Browser mount smoke — run `npx playwright test tests/e2e/hero-entrance.spec.ts --project=desktop-chromium`. Expect: kevin + shibuya words visible, entrance completes, zero console errors. (Playwright builds + serves on :4173 automatically.) — kevin+shibuya visible, entrance reaches `loaderState==='done'` within 4s, scroll locks/unlocks, zero console errors (verified via throwaway spec). One PRE-EXISTING sub-test fails on a stale `.nav-avail-dot` assertion (feature dropped in 5972e7b) — out of Task 4 scope, not touched.
- [x] **Step 12:** Commit: `feat(hero): scene 0 rebuild — solid surname, canonical title, paper grain; drop r3f accent`.

### Verify before returning
- Unit (full) green · typecheck clean · lint clean · `hero-entrance.spec` green with zero console
  errors · `grep -rn 'HeroAccent\|ENABLE_R3F_ACCENT\|r3fAccentEnabled' src tests` returns nothing.

### Boundaries
- Out of scope: byline, halftone, nav item rename, restyling below-hero sections. Do NOT alter the
  ink-draw trace/ink-fill timing, curtain handshake, or `resolveEntrance` wiring.

---

## Task 5 — Halftone material primitive (build once; Plan 2 reuses)

**Model:** deep-reasoner-opus-xhigh
**Spec TODO:** `Halftone shader primitive built once (rosette duotone, screen angles) and reused for portrait develop + single goes-to-press wipe with CMYK register-lock; mobile + reduced-motion fallbacks in place` (portrait half here; wipe half in Plan 2)

### Files
- `src/canvas/halftone/halftoneMath.ts` — create: pure, unit-tested helpers.
- `src/canvas/halftone/HalftoneMaterial.ts` — create: the drei `shaderMaterial` (GLSL, both modes).
- `tests/unit/canvas/halftoneMath.test.ts` — create: the RED acceptance test (below).

### Interfaces
- **Consumes:** `three`, `@react-three/drei` (`shaderMaterial`), `@react-three/fiber` (`extend`).
- **Produces (LOCKED — Plan 2 depends on this verbatim; do not change signatures later):**
```ts
// src/canvas/halftone/halftoneMath.ts
export const ROSETTE_ANGLES_DEG: { c: 15; m: 75; y: 0; k: 45 }
/** [C, M, Y, K] authentic rosette screen angles in RADIANS. */
export function rosetteAnglesRad(): [number, number, number, number]
/** Coarse→fine dot frequency scrub. Clamps p to [0,1]. Defaults coarse=8, fine=120. */
export function frequencyForProgress(p: number, coarse?: number, fine?: number): number
/** Device-pixel-ratio cap for dot math. Returns min(max(raw,1), cap). Default cap=2. */
export function cappedDpr(raw: number, cap?: number): number

// src/canvas/halftone/HalftoneMaterial.ts
import * as THREE from 'three'
export interface HalftoneUniformValues {
  uSource: THREE.Texture | null   // sampled image (portrait) or render target
  uResolution: THREE.Vector2      // px size of the drawn quad (aspect-correct dot grid)
  uFrequency: number              // dots across the shorter axis (coarse≈8 → fine≈120)
  uAngles: THREE.Vector4          // per-channel screen angles (rad): x=C y=M z=Y w=K
  uRegister: THREE.Vector4        // per-channel registration offset in px; (0,0,0,0)=locked
  uInkDark: THREE.Color           // duotone ink (default #111822)
  uInkLight: THREE.Color          // duotone paper (default #F7F5F1)
  uMode: number                   // 0 = duotone develop, 1 = cmyk register-lock wipe
  uCoverage: number               // wipe ink coverage 0..1 (mode 1 only; mode 0 ignores)
  uDpr: number                    // capped DPR baked into dot math
}
/** drei shaderMaterial. JSX intrinsic <halftoneMaterial/> registered via extend({ HalftoneMaterial }).
 *  Default uniforms: uMode=0, uFrequency=8, uAngles=rosetteAnglesRad(), uRegister=(0,0,0,0),
 *  uInkDark=#111822, uInkLight=#F7F5F1, uCoverage=0, uDpr=1, uResolution=(1,1), uSource=null. */
export const HalftoneMaterial: /* ReturnType<typeof shaderMaterial> */ unknown
```

### Work (irreducible shader reasoning — you author the GLSL; contract above is fixed)

Build a single drei `shaderMaterial('HalftoneMaterial', uniforms, vertexGLSL, fragmentGLSL)` and register
it with `extend({ HalftoneMaterial })` so `<halftoneMaterial ref/>` is usable in R3F. The fragment
shader must implement an **authentic rosette halftone**:

- Sample `uSource` for local tone. Build a rotated screen per ink using `uAngles` (rotate UV by the
  channel angle, tile at `uFrequency` cells across the shorter axis using `uResolution` for aspect
  correction and `uDpr` for device scaling), compute per-cell dot coverage by comparing the tone
  against radial distance from the cell center (classic AM/amplitude-modulated dot growth).
- **Mode 0 (duotone develop):** two inks only — mix `uInkLight`↔`uInkDark` by the halftone coverage of
  a single luminance screen (use the K angle, or a luminance-driven dot). `uFrequency` is the develop
  control: low = coarse dots (undeveloped), high = fine dots (developed). `uRegister`/`uCoverage`
  ignored.
- **Mode 1 (cmyk register-lock wipe):** four screens at the C/M/Y/K angles, each offset by its
  `uRegister` component (visible misregistration), converging to lock at `uRegister → 0`. `uCoverage`
  drives global ink coverage 0→1 (dots grow until solid ink). This mode is exercised by Plan 2's wipe —
  build it now but it needs no consumer in this plan. Keep octave/loop counts bounded for low-end GPUs.

Guard rails: no external GLSL deps; keep the fragment shader within a single `shaderMaterial`; ensure
`uSource=null` renders a flat `uInkLight` fill (so a not-yet-loaded texture doesn't NaN). Cap loops.
Declare `uMode` as `uniform float uMode;` in the GLSL and branch with `uMode < 0.5` (not an int
uniform) — three.js int-uniform coercion is a known footgun with drei shaderMaterial.

Because GLSL cannot be unit-tested in jsdom, the shader's *correctness* is verified by the browser
smoke in Task 8 (portrait canvas renders, zero console errors) + visual review. The **pure helpers**
(`halftoneMath.ts`) get the real vitest cycle below.

### Acceptance check (RED — authored here, read-only)
`tests/unit/canvas/halftoneMath.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  ROSETTE_ANGLES_DEG,
  rosetteAnglesRad,
  frequencyForProgress,
  cappedDpr,
} from '../../../src/canvas/halftone/halftoneMath'

describe('halftoneMath', () => {
  it('exposes authentic rosette screen angles', () => {
    expect(ROSETTE_ANGLES_DEG).toEqual({ c: 15, m: 75, y: 0, k: 45 })
  })

  it('converts rosette angles to radians in C,M,Y,K order', () => {
    const [c, m, y, k] = rosetteAnglesRad()
    const d2r = (d: number) => (d * Math.PI) / 180
    expect(c).toBeCloseTo(d2r(15), 6)
    expect(m).toBeCloseTo(d2r(75), 6)
    expect(y).toBeCloseTo(d2r(0), 6)
    expect(k).toBeCloseTo(d2r(45), 6)
  })

  it('scrubs frequency coarse→fine, clamped to [0,1]', () => {
    expect(frequencyForProgress(0)).toBeCloseTo(8, 6)
    expect(frequencyForProgress(1)).toBeCloseTo(120, 6)
    expect(frequencyForProgress(0.5)).toBeCloseTo(64, 6)
    expect(frequencyForProgress(-3)).toBeCloseTo(8, 6)   // clamp low
    expect(frequencyForProgress(9)).toBeCloseTo(120, 6)  // clamp high
    expect(frequencyForProgress(0.5, 10, 20)).toBeCloseTo(15, 6) // custom range
  })

  it('caps DPR to [1, cap]', () => {
    expect(cappedDpr(3)).toBe(2)
    expect(cappedDpr(0.5)).toBe(1)
    expect(cappedDpr(1.5)).toBe(1.5)
    expect(cappedDpr(3, 3)).toBe(3)
  })
})
```

### Steps
- [x] **Step 1:** Create `tests/unit/canvas/halftoneMath.test.ts` with the code above. Run `npx vitest run tests/unit/canvas/halftoneMath.test.ts` — expect FAIL (module missing). RED confirmed.
- [x] **Step 2:** Create `src/canvas/halftone/halftoneMath.ts` with the four exports. Run the test — expect PASS (GREEN).
- [x] **Step 3:** Create `src/canvas/halftone/HalftoneMaterial.ts`: the drei `shaderMaterial` with the exact default uniforms above, both-mode fragment GLSL, and `extend({ HalftoneMaterial })`. Declare the `halftoneMaterial` JSX intrinsic (module-augment `@react-three/fiber`'s `ThreeElements` — no `any`).
- [x] **Step 4:** Run `npx tsc -b --noEmit` and `npm run lint` — clean (no `any`; GLSL strings are fine).
- [ ] **Step 5:** Commit: `feat(halftone): rosette duotone shader material + math helpers (build once)`.

### Verify before returning
- `npx vitest run tests/unit/canvas/halftoneMath.test.ts` green · typecheck clean · lint clean · the
  Produces interface matches this block byte-for-byte (Plan 2 depends on it).

### Boundaries
- Out of scope: the portrait consumer (Task 7), any `<Canvas>`, the goes-to-press wipe consumer
  (Plan 2), changing the locked interface.

---

## Task 6 — Placeholder assets + documented swap point

**Model:** editor-sonnet-low
**Spec TODO:** (supports) `Scene 1 byline: … one scanned-handwriting note … asymmetric layout …` — placeholder half.

### Files
- `scripts/gen-placeholder-assets.mjs` — create: a `sharp` script that writes the three placeholders.
- `public/images/portrait-placeholder.jpg` — generated: source image for the halftone shader.
- `public/images/portrait-duotone-placeholder.jpg` — generated: pre-baked duotone fallback `<img>`.
- `public/images/margin-note-placeholder.png` — generated: transparent handwriting-note placeholder.
- `public/images/README-placeholders.md` — create: the single-point swap documentation.

### Interfaces
- **Consumes:** `sharp` (already a devDependency).
- **Produces:** three placeholder files at fixed paths (consumed by Task 8 byline) + swap doc.

### Work (complete — transcribe)

`scripts/gen-placeholder-assets.mjs`:
```js
// Generates clearly-marked PLACEHOLDER assets for the Scene 1 byline.
// Owner deliverables (real portrait + scanned handwriting) replace these at the
// SAME paths — see public/images/README-placeholders.md. Run: node scripts/gen-placeholder-assets.mjs
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/images')

const W = 1200, H = 1500 // 4:5 portrait

// 1. Source portrait placeholder — flat warm-paper tone with a centered label.
const label = (text, color) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <rect width="100%" height="100%" fill="#c9c4bb"/>
     <text x="50%" y="50%" font-family="monospace" font-size="52"
       fill="${color}" text-anchor="middle" dominant-baseline="middle">${text}</text>
   </svg>`,
)
await sharp(label('PLACEHOLDER PORTRAIT', '#2A4060'))
  .jpeg({ quality: 82 }).toFile(resolve(OUT, 'portrait-placeholder.jpg'))

// 2. Pre-baked duotone fallback — ink/paper two-tone version of the same.
await sharp(label('PLACEHOLDER DUOTONE', '#111822'))
  .tint({ r: 0x88, g: 0x9a, b: 0xb2 })
  .jpeg({ quality: 82 }).toFile(resolve(OUT, 'portrait-duotone-placeholder.jpg'))

// 3. Handwriting margin-note placeholder — transparent PNG with a faint scrawl label.
const note = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200">
     <text x="0" y="70" font-family="cursive" font-size="34" fill="#2A4060"
       opacity="0.7" transform="rotate(-4 0 70)">ship it, then make it sing</text>
     <text x="0" y="120" font-family="monospace" font-size="16" fill="#6A8CAA"
       opacity="0.6">[ placeholder — swap with scanned handwriting ]</text>
   </svg>`,
)
await sharp(note).png().toFile(resolve(OUT, 'margin-note-placeholder.png'))

console.log('placeholder assets written to public/images/')
```

`public/images/README-placeholders.md`:
```md
# Byline placeholder assets — single-point swap

These are CLEARLY-MARKED placeholders generated by `scripts/gen-placeholder-assets.mjs`.
Owner deliverables replace them at the SAME filenames/paths — no code change required.

| file | role | replace with |
|---|---|---|
| `portrait-placeholder.jpg` | source sampled by the halftone shader | real high-contrast, strong-key-light portrait (4:5, ≥1200×1500) |
| `portrait-duotone-placeholder.jpg` | pre-baked duotone `<img>` fallback (mobile / no-webgl / reduced-motion) | duotone (ink `#111822` / paper `#F7F5F1`) export of the same portrait |
| `margin-note-placeholder.png` | scanned-handwriting margin note | transparent-background scan of the real handwritten note |

Swap = overwrite these three files. Do not rename them; `Byline.tsx` references these exact paths.
```

### Acceptance check (asset task — explicit criteria, no vitest)
Files exist at the exact paths with the right formats/dimensions. Verified by the command in Step 3.

### Steps
- [ ] **Step 1:** Create `scripts/gen-placeholder-assets.mjs` and `public/images/README-placeholders.md` with the content above.
- [ ] **Step 2:** Run `node scripts/gen-placeholder-assets.mjs` — expect `placeholder assets written to public/images/`.
- [ ] **Step 3:** Verify: `node -e "import('sharp').then(async ({default:s})=>{for(const f of ['portrait-placeholder.jpg','portrait-duotone-placeholder.jpg','margin-note-placeholder.png']){const m=await s('public/images/'+f).metadata();console.log(f,m.format,m.width+'x'+m.height)}})"` — expect three lines: two `jpeg 1200x1500`, one `png 520x200`.
- [ ] **Step 4:** Commit: `chore(byline): generate placeholder portrait + handwriting assets`.

### Verify before returning
- Three files present with correct format/dimensions · README swap doc present.

### Boundaries
- Out of scope: the Byline component, wiring, any real photography, committing large binaries beyond
  these three small placeholders.

---

## Task 7 — HalftonePortrait consumer + fallbacks + mount gating

**Model:** integrator-opus-high
**Spec TODO:** `Scene 1 byline: portrait develop … ` (portrait consumer + fallbacks) and the fallback half of the halftone TODO.

### Files
- `src/canvas/halftone/HalftonePortrait.tsx` — create: the R3F consumer + fallbacks.
- `tests/unit/canvas/HalftonePortrait.test.tsx` — create: the RED acceptance test (below).

### Interfaces
- **Consumes:** `HalftoneMaterial` + `halftoneMath` (Task 5); `three`, `@react-three/fiber`
  (`Canvas`, `useFrame`, `useThree`), `@react-three/drei` (`useTexture`); `framer-motion`
  (`MotionValue`, `useMotionValueEvent`); `useMotion()` (`prefersReducedMotion`).
- **Produces (LOCKED — Task 8 + Plan 2 depend on this):**
```ts
// src/canvas/halftone/HalftonePortrait.tsx
import type { MotionValue } from 'framer-motion'
export interface HalftonePortraitProps {
  src: string                    // source image url (sampled by the shader)
  fallbackSrc: string            // pre-baked duotone <img> for mobile / no-webgl / reduced-motion
  progress: MotionValue<number>  // 0→1 develop scrub (coarse→fine dot frequency)
  alt: string
  inkDark?: string               // default '#111822'
  inkLight?: string              // default '#F7F5F1'
  className?: string
}
export function HalftonePortrait(props: HalftonePortraitProps): JSX.Element
```

### Work (design intent + constraints — shape is yours)

Decide which path to render at mount using a pure predicate (extract it so the test can drive it — see
below):
- **Fallback `<img src={fallbackSrc} alt={alt} className={className}/>`** when ANY of:
  `prefersReducedMotion`, no WebGL (`hasWebGL()` returns false), or coarse-pointer/mobile
  (`window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768`). Under reduced motion
  the image is static; otherwise the fallback may fade in on `progress` — keep it simple.
- **Shader path** otherwise: a single `<Canvas frameloop="demand" dpr={cappedDpr(devicePixelRatio)}>`
  rendering a full-quad mesh with `<halftoneMaterial>`. Load `src` via drei `useTexture`; set
  `uSource`, `uResolution`, `uInkDark`/`uInkLight`, `uMode={0}`. Drive `uFrequency` from `progress`
  via `useMotionValueEvent(progress, 'change', p => { material.uFrequency = frequencyForProgress(p); invalidate() })`
  (the `frameloop="demand"` + `invalidate()` pattern — no continuous render). **Stale-mount guard
  (review finding, required):** the Canvas mounts late (IO-gated) while `progress` may already be
  nonzero — on material/texture ready, initialize `material.uFrequency = frequencyForProgress(progress.get())`
  and call `invalidate()` once, in addition to the change subscription; never rely on a future scroll
  event for first paint. **Gate the Canvas mount with an IntersectionObserver** so the one WebGL
  context only initializes when the portrait is near the viewport (unmount/pause when far). One GL
  context total.

Export a small pure helper for the RED test (no `any`):
```ts
export function shouldUseFallback(env: {
  reducedMotion: boolean
  hasWebGL: boolean
  coarseOrMobile: boolean
}): boolean {
  return env.reducedMotion || !env.hasWebGL || env.coarseOrMobile
}
export function hasWebGL(): boolean // try creating a webgl context on a throwaway canvas; false on failure
```

jsdom has no WebGL, so `HalftonePortrait` in tests must resolve to the fallback path (do not mount
`<Canvas>` in jsdom — the predicate handles this since `hasWebGL()` returns false in jsdom).

### Acceptance check (RED — authored here, read-only)
`tests/unit/canvas/HalftonePortrait.test.tsx`:
```ts
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { motionValue } from 'framer-motion'
import { MotionProvider } from '../../../src/context/MotionContext'
import {
  HalftonePortrait,
  shouldUseFallback,
} from '../../../src/canvas/halftone/HalftonePortrait'

describe('shouldUseFallback', () => {
  it('falls back on reduced motion, no webgl, or coarse/mobile', () => {
    const base = { reducedMotion: false, hasWebGL: true, coarseOrMobile: false }
    expect(shouldUseFallback(base)).toBe(false)
    expect(shouldUseFallback({ ...base, reducedMotion: true })).toBe(true)
    expect(shouldUseFallback({ ...base, hasWebGL: false })).toBe(true)
    expect(shouldUseFallback({ ...base, coarseOrMobile: true })).toBe(true)
  })
})

describe('HalftonePortrait (jsdom → fallback, no WebGL)', () => {
  it('renders the pre-baked duotone fallback img with alt text in jsdom', () => {
    const { container } = render(
      <MotionProvider>
        <HalftonePortrait
          src="/images/portrait-placeholder.jpg"
          fallbackSrc="/images/portrait-duotone-placeholder.jpg"
          progress={motionValue(0)}
          alt="kevin shibuya, high-contrast portrait"
        />
      </MotionProvider>,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('/images/portrait-duotone-placeholder.jpg')
    expect(img!.getAttribute('alt')).toBe('kevin shibuya, high-contrast portrait')
  })
})
```

### Steps
- [ ] **Step 1:** Create `tests/unit/canvas/HalftonePortrait.test.tsx` with the code above. Run `npx vitest run tests/unit/canvas/HalftonePortrait.test.tsx` — expect FAIL. RED confirmed.
- [ ] **Step 2:** Create `src/canvas/halftone/HalftonePortrait.tsx` per the contract: `shouldUseFallback`, `hasWebGL`, fallback `<img>` path, and the IntersectionObserver-gated `<Canvas frameloop="demand">` shader path driving `uFrequency` from `progress`.
- [ ] **Step 3:** Run `npx vitest run tests/unit/canvas/HalftonePortrait.test.tsx` — expect PASS (GREEN; jsdom takes the fallback path).
- [ ] **Step 4:** Run `npx tsc -b --noEmit` and `npm run lint` — clean (no `any`).
- [ ] **Step 5:** Commit: `feat(halftone): HalftonePortrait consumer with fallback + mount gating`.

### Verify before returning
- Unit green · typecheck clean · lint clean · jsdom path renders the fallback `<img>` (never mounts a
  `<Canvas>` in jsdom).

### Boundaries
- Out of scope: the Byline layout/wiring (Task 8), the goes-to-press wipe (Plan 2), changing the locked
  material interface, continuous `useFrame` rendering (must be demand-driven).

---

## Task 8 — Scene 1 byline section + wiring + CSS

**Model:** integrator-opus-high
**Spec TODO:** `Scene 1 byline: portrait develop, real caption, one scanned-handwriting note, asymmetric layout, bilingual copy`

### Files
- `src/components/sections/Byline.tsx` — create: the byline section.
- `src/index.css` — modify: add `.byline*` styles.
- `src/pages/Home.tsx` — modify: lazy-import + render `<Byline />` between Hero and the rest; add to the
  idle-warm list.
- `tests/unit/Byline.test.tsx` — create: the RED acceptance test (below).

### Interfaces
- **Consumes:** `byline.*` i18n (Task 2); `HalftonePortrait` (Task 7); the three placeholder assets
  (Task 6); `framer-motion` `useScroll` (element-scoped progress); `react-i18next`.
- **Produces:** `export function Byline(): JSX.Element` rendering `<section id="byline" className="byline">`.

### Work (design intent + constraints — asymmetric composition is yours to judge)

Layout: an asymmetric two-column composition (e.g. portrait column offset from a wider text column;
mobile stacks). Contents:
- **Portrait:** `<HalftonePortrait src="/images/portrait-placeholder.jpg"
  fallbackSrc="/images/portrait-duotone-placeholder.jpg" progress={scrollYProgress}
  alt={t('byline.portraitAlt')} />`. Derive `scrollYProgress` from
  `const ref = useRef<HTMLDivElement>(null); const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })`
  and set `ref` on the section root. Passing a MotionValue keeps the scrub off React state (no
  entrance-freeze risk, no per-component scroll listener beyond Framer's shared one). Plan 2 may swap
  the source of `progress` to the global Lenis MotionValue; the `HalftonePortrait` prop contract is
  unchanged.
- **Caption:** a real caption `<figcaption className="byline-caption">{t('byline.caption')}</figcaption>`.
- **Body:** first-person specifics paragraph `<p className="byline-body">{t('byline.body')}</p>`.
- **Margin note:** ONE scanned-handwriting note rendered from the image asset:
  `<img className="byline-margin-note" src="/images/margin-note-placeholder.png" alt={t('byline.marginNoteAlt')} />`,
  absolutely positioned in the margin (asymmetric), aria-labelled by its alt.

Wire into `Home.tsx`: add `const Byline = lazy(() => import('../components/sections/Byline').then(m => ({ default: m.Byline })))`,
render `<Byline />` as the FIRST child inside the below-hero `<Suspense>` group (before `<Projects />`),
and add `void import('../components/sections/Byline')` to the idle-warm effect.

CSS (`.byline*`): author to the paper palette — asymmetric grid, portrait ~380–460px column, generous
whitespace, mono caption, readable body measure (max ~640px), margin note rotated slightly and offset.
Reduced-motion: layout is fully static (the portrait fallback handles the no-motion story).

### Acceptance check (RED — authored here, read-only)
`tests/unit/Byline.test.tsx`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the R3F consumer so jsdom never touches WebGL and we assert wiring only.
vi.mock('../../src/canvas/halftone/HalftonePortrait', () => ({
  HalftonePortrait: (props: { alt: string }) => (
    <img data-testid="halftone-portrait" alt={props.alt} src="stub" />
  ),
}))

import '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Byline } from '../../src/components/sections/Byline'

describe('Byline', () => {
  it('renders caption, body, portrait, and one margin note', () => {
    const { container } = render(<MotionProvider><Byline /></MotionProvider>)
    expect(container.querySelector('section#byline')).not.toBeNull()
    expect(screen.getByText('kevin, porto alegre')).toBeInTheDocument()
    expect(screen.getByText(/front-end engineer in porto alegre/i)).toBeInTheDocument()
    expect(screen.getByTestId('halftone-portrait')).toBeInTheDocument()
    // exactly one handwriting margin note
    expect(container.querySelectorAll('.byline-margin-note')).toHaveLength(1)
    expect(container.querySelector('.byline-margin-note')!.getAttribute('alt'))
      .toMatch(/ship it/i)
  })
})
```

### Steps
- [ ] **Step 1:** Create `tests/unit/Byline.test.tsx` with the code above. Run `npx vitest run tests/unit/Byline.test.tsx` — expect FAIL. RED confirmed.
- [ ] **Step 2:** Create `src/components/sections/Byline.tsx` per the contract (`useScroll` progress, `HalftonePortrait`, caption, body, margin-note img). Root `<section id="byline" className="byline" ref={ref}>`.
- [ ] **Step 3:** Append `.byline*` styles to `src/index.css`.
- [ ] **Step 4:** Edit `src/pages/Home.tsx`: add the lazy `Byline` import, render `<Byline />` first inside the Suspense group, add it to the idle-warm effect.
- [ ] **Step 5:** Run `npx vitest run tests/unit/Byline.test.tsx` — expect PASS (GREEN).
- [ ] **Step 6:** Run `npm run test:unit` (full) — all green.
- [ ] **Step 7:** Run `npx tsc -b --noEmit` and `npm run lint` — clean.
- [ ] **Step 8:** Browser mount smoke — `npx playwright test tests/e2e/hero-entrance.spec.ts tests/e2e/section-enters.spec.ts --project=desktop-chromium`. Expect: page loads, hero + byline render, zero console errors. Manually confirm (or via a quick Playwright scriptlet) the byline `#byline` section is present and the portrait renders (canvas on desktop, `<img>` fallback on `--project=mobile-chromium`).
- [ ] **Step 9:** Commit: `feat(byline): scene 1 — halftone portrait develop, caption, margin note`.

### Verify before returning
- Unit (full) green · typecheck clean · lint clean · byline visible in the browser smoke with zero
  console errors · mobile-chromium shows the `<img>` fallback (no WebGL context).

### Boundaries
- Out of scope: Scene 2+ (timeline/wipe/scene-3/archive/contact), nav rename, removing below-hero
  sections, the goes-to-press wipe. Exactly one WebGL context — do not add a second `<Canvas>`.

---

## Verification (whole plan → spec TODOs)

Run from repo root after Task 8. Map each command to the spec TODOs this plan covers.

| step | command | expected | covers spec TODO |
|---|---|---|---|
| typecheck | `npx tsc -b --noEmit` | exits 0 | all |
| lint | `npm run lint` | exits 0 | all |
| unit | `npm run test:unit` | all green (incl. tokens, press-copy, HeroPaperGrain, Hero, HeroNameDrawing, halftoneMath, HalftonePortrait, Byline) | 1, 2, 5, partial 4 |
| e2e hero smoke | `npx playwright test tests/e2e/hero-entrance.spec.ts --project=desktop-chromium` | green, zero console errors | 2 (Scene 0), 14 |
| e2e byline/sections | `npx playwright test tests/e2e/section-enters.spec.ts --project=desktop-chromium` | green | 5 |
| e2e mobile fallback | `npx playwright test tests/e2e/hero-entrance.spec.ts --project=mobile-chromium` | green; no WebGL context; portrait `<img>` fallback | 4 (mobile/RM story), 13 |
| reduced motion | `npx playwright test tests/e2e/reduced-motion.spec.ts` | green | 13 |
| perf budget | `npx playwright test tests/e2e/perf-budget.spec.ts` | green (R3F-accent describe removed) | 14 |
| build | `npm run build` | `tsc -b` clean + vite build succeeds | all |
| lighthouse | `npx vite preview --port 4173` → Lighthouse mobile preset | performance ≥ 90, accessibility ≥ 95; LCP unchanged vs current | 14 |

**Spec TODO coverage for Plan 1:**
- ✅ TODO 1 — Design tokens: warm paper neutrals (Task 1).
- ✅ TODO 2 — Scene 0 hero: entrance untouched, solid period-free surname, static canonical title +
  crossfade role cycle, pointer-lit grain deferred behind `entranceDone`, R3F accent deleted (Tasks 3, 4).
- ◑ TODO 4 (partial) — Halftone shader built once (portrait develop + fallbacks here; the goes-to-press
  wipe consumer is Plan 2, but mode 1 is authored now) (Tasks 5, 7).
- ✅ TODO 5 — Scene 1 byline: portrait develop, real caption, one scanned-handwriting note, asymmetric
  layout, bilingual copy (Tasks 6, 7, 8).
- ✅ TODO 12 — i18n: new strings authored EN + PT-BR, zero spaced em-dashes (Task 2).
- ◑ TODO 13 (partial) — reduced-motion + mobile stories for Scene 0/1 verified (portrait fallback,
  static grain); remaining scenes in later plans.
- ◑ TODO 14 (partial) — Lighthouse on `vite preview`, LCP unchanged, Playwright mount smoke green for
  the touched shell (Tasks 4, 8 + Verification).

Out of scope for Plan 1 (later plans): TODOs 3 (ink brush), 6 (Scene 2 timeline), 7 (goes-to-press
wipe consumer), 8 (Scene 3 artifacts), 9 (archive), 10 (contact), 11 (retired-elements audit).

**Pre-execution review gate (per CLAUDE.md):** before Task 1, run a fresh-context Opus pass over this
plan's mandated code (runtime/boot assumptions, the inviolable-entrance edit in Task 4, the locked
halftone interface, dead-flag removal completeness) PLUS a codex-review cross-vendor pass. Fix the plan
before Task 1, not the tasks after.
