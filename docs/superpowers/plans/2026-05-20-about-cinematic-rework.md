# About — Cinematic Scroll Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking — implementers MUST flip `- [ ]` to `- [x]` immediately after each step's command lands successfully, before proceeding to the next step.

**Goal:** Replace the current "bio + 4 tactics" About section with a pinned, all-in-canvas cinematic experience driven by a Sketchfab CC-BY tin-robot model that disassembles across three scroll-driven beats (past → present → future), with a DOM-only fallback for mobile and reduced-motion users.

**Architecture:** Outer 300vh wrapper + inner `position: sticky` 100vh container. Inside the sticky, a transparent R3F `<Canvas>` holds the toy model (per-part scroll-driven transforms via Framer `useScroll` + `useTransform`) plus three drei `<Text>` billboards (eyebrow, headline-behind, body-caption, counter — content swaps per beat with opacity crossfades). A `sr-only` DOM twin sibling carries the same text content for screen readers. The orchestrator (`About.tsx`) picks between `<AboutScene>` (lazy-loaded canvas) and `<AboutFallback>` (poster image + stacked articles) based on `useReducedMotion()` + viewport width.

**Tech Stack:** React 19 + TypeScript strict; Vite 6; `@react-three/fiber` 9 + `@react-three/drei` 10 (drei `<Text>`, `useGLTF`, `<Line>`); `framer-motion` 12 (`useScroll`, `useTransform`, `useReducedMotion`); `react-i18next` 16; `three` 0.183; Vitest 4 + RTL + Playwright 1.59 for tests.

---

## File Map

**Create:**
- `src/hooks/useMediaQuery.ts` — SSR-safe matchMedia hook
- `src/hooks/useMediaQuery.test.ts`
- `src/data/aboutBeats.ts` — typed 3-beat array (i18n keys + part-choreography seeds)
- `src/components/ui/AboutFallback.tsx` — DOM-only fallback
- `src/components/ui/AboutFallback.test.tsx`
- `src/components/canvas/AboutScene/index.ts` — re-export for clean lazy import
- `src/components/canvas/AboutScene/AboutScene.tsx` — `<Canvas>` + Suspense + camera + lights
- `src/components/canvas/AboutScene/Scene.tsx` — scene graph composition
- `src/components/canvas/AboutScene/ToyModel.tsx` — loads `/models/about-toy.glb`, applies palette, animates parts per scroll
- `src/components/canvas/AboutScene/BeatText.tsx` — drei `<Text>` billboard with per-beat opacity transform
- `src/components/canvas/AboutScene/useAboutProgress.ts` — wraps Framer `useScroll`, exposes per-beat opacity motion values + scroll-progress motion value
- `src/components/canvas/AboutScene/useAboutProgress.test.ts`
- `src/components/canvas/AboutScene/scatterMath.ts` — pure deterministic scatter / spread offset utilities
- `src/components/canvas/AboutScene/scatterMath.test.ts`
- `scripts/capture-about-poster.mjs` — one-off Playwright capture for the fallback poster
- `tests/e2e/about-cinematic.spec.ts`
- `public/models/about-toy.glb` (binary, committed)
- `public/images/about-toy-poster.webp` (binary, committed)
- `public/images/about-toy-poster.png` (binary, committed)

**Modify:**
- `src/components/sections/About.tsx` — full rewrite as orchestrator
- `src/i18n/locales/en.json` — remove `sections.about.title/bio/tactics`; add `sections.about.label`, `sections.about.beats[0..2].{eyebrow,title,body}`, `sections.footer.modelAttribution`
- `src/i18n/locales/pt.json` — same shape, PT copy
- `src/components/layout/Footer.tsx` — render `sections.footer.modelAttribution` in meta row
- `src/index.css` — remove `.about-grid`, `.about-bio*`, `.about-tactic*` rules; add `.about-outer { height: 300vh }`, `.about-sticky { position: sticky; top: 0; height: 100vh }`, `.sr-only` if not already present
- `src/pages/Home.tsx` — remove the MarqueeDivider above the About section if present; keep the one below

---

## Task 1 — Branch setup + commit existing artifacts

**Files:**
- Read: working tree state
- Move: brainstorm-session scripts to a stable location or delete

- [x] **Step 1: Verify working tree state**

Run: `git status --porcelain && git branch --show-current`
Expected: branch is `main`. Output may show new spec + scripts written during brainstorm.

- [x] **Step 2: Create feature branch from main**

```bash
git checkout -b feat/about-cinematic-rework
```

Expected: `Switched to a new branch 'feat/about-cinematic-rework'`

- [x] **Step 3: Remove one-off brainstorm scripts that aren't reusable**

```bash
rm -f scripts/capture-noomo.mjs scripts/capture-noomo-hold.mjs scripts/capture-noomo-full.mjs
```

Keep `scripts/capture-scroll-site.mjs` — it's the reusable tool authored during the spec phase.

- [x] **Step 4: Stage spec + plan + reusable script and commit**

```bash
git add docs/superpowers/specs/2026-05-20-about-cinematic-rework-design.md \
        docs/superpowers/plans/2026-05-20-about-cinematic-rework.md \
        scripts/capture-scroll-site.mjs
git commit -m "$(cat <<'EOF'
docs(about): spec + plan for cinematic scroll rework

Replaces bio + 4-tactic About with pinned, all-in-canvas cinematic
driven by a disassembling Sketchfab CC-BY tin-robot model across three
beats (past/present/future). DOM-only fallback for mobile + reduced
motion. Also commits scripts/capture-scroll-site.mjs — generic
Playwright tool for scroll-driven reference-site analysis.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [x] **Step 5: Verify clean state**

Run: `git status && git log --oneline -2`
Expected: working tree clean, latest commit is the docs commit on `feat/about-cinematic-rework`.

---

## Task 2 — `useMediaQuery` hook

**Files:**
- Create: `src/hooks/useMediaQuery.ts`
- Create: `src/hooks/useMediaQuery.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/hooks/useMediaQuery.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  let listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = false

  beforeEach(() => {
    listeners = []
    currentMatches = false
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: currentMatches,
      media: q,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== cb)
      },
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false on first render (SSR-safe)', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    // First render returns false; the effect runs synchronously in RTL but
    // we explicitly assert the *initial* return path is safe.
    expect(typeof result.current).toBe('boolean')
  })

  it('reflects matchMedia after mount', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    expect(result.current).toBe(true)
  })

  it('updates when matchMedia change event fires', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    expect(result.current).toBe(false)
    act(() => {
      listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(result.current).toBe(true)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useMediaQuery.test.ts`
Expected: FAIL — `Cannot find module './useMediaQuery'`

- [x] **Step 3: Implement the hook**

Create `src/hooks/useMediaQuery.ts`:

```ts
import { useEffect, useState } from 'react'

/**
 * SSR-safe matchMedia subscription. Returns `false` on first render so
 * Hydration matches what the server (which has no `window`) would produce.
 * After mount, returns the current match and subscribes to changes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useMediaQuery.test.ts`
Expected: 3 tests passing.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useMediaQuery.ts src/hooks/useMediaQuery.test.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add SSR-safe useMediaQuery

Needed by the About orchestrator to pick between the canvas scene
(desktop, no reduced-motion) and the DOM fallback (mobile or reduced
motion). Returns false on first render to match SSR/hydration; updates
on matchMedia change events after mount.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Beat data + i18n keys

**Files:**
- Create: `src/data/aboutBeats.ts`
- Modify: `src/i18n/locales/en.json` (add new keys, keep old ones for now)
- Modify: `src/i18n/locales/pt.json` (add new keys, keep old ones for now)

- [x] **Step 1: Create beats data module**

Create `src/data/aboutBeats.ts`:

```ts
/**
 * Single source of truth for the About cinematic beats.
 * Both <AboutScene> (canvas) and <AboutFallback> (DOM) read from this.
 *
 * `partSeeds` is a deterministic per-part scatter seed lookup. Used in
 * scatterMath to compute scattered positions. Keyed by semantic part name
 * — actual key names depend on the chosen .glb's mesh names (resolved at
 * model-load time; missing keys fall back to a hashed default).
 */
export interface AboutBeat {
  /** Stable id for keys, tests, and DOM landmarks. */
  id: 'origin' | 'present' | 'future'
  /** i18n key for the small top-left eyebrow ("01 — origin", etc.). */
  eyebrowKey: string
  /** i18n key for the big headline rendered behind the toy. */
  titleKey: string
  /** i18n key for the body caption at the bottom. */
  bodyKey: string
}

export const ABOUT_BEATS: readonly AboutBeat[] = [
  {
    id: 'origin',
    eyebrowKey: 'sections.about.beats.0.eyebrow',
    titleKey: 'sections.about.beats.0.title',
    bodyKey: 'sections.about.beats.0.body',
  },
  {
    id: 'present',
    eyebrowKey: 'sections.about.beats.1.eyebrow',
    titleKey: 'sections.about.beats.1.title',
    bodyKey: 'sections.about.beats.1.body',
  },
  {
    id: 'future',
    eyebrowKey: 'sections.about.beats.2.eyebrow',
    titleKey: 'sections.about.beats.2.title',
    bodyKey: 'sections.about.beats.2.body',
  },
] as const

/** Returns the active beat index given scrollYProgress 0..1. Clamped. */
export function beatIndexAtProgress(p: number): 0 | 1 | 2 {
  if (p < 1 / 3) return 0
  if (p < 2 / 3) return 1
  return 2
}
```

- [x] **Step 2: Add new i18n keys (EN)**

Open `src/i18n/locales/en.json` and add the following inside `sections.about` (do NOT remove existing keys yet — that happens in a later task once consumers are migrated):

```json
"label": "about kevin — three-beat cinematic",
"attribution": "3D model · {{author}} · CC-BY",
"beats": [
  {
    "eyebrow": "01 — origin",
    "title": "how i got here.",
    "body": "as a kid i'd disassemble my toys to see how they worked. my first website in college was an epiphany — i finally got to assemble something. seven years on, i'm still refining the same skill."
  },
  {
    "eyebrow": "02 — present",
    "title": "how i work now.",
    "body": "fullstack across data viz, real-time systems, ai tooling, and sales funnels — with a method that compounds. brazilian, based in porto alegre."
  },
  {
    "eyebrow": "03 — what's next",
    "title": "where it's going.",
    "body": "thinking-with-ai daily. building systems whose users are agents, not just humans — and refining the practice that makes that work shippable."
  }
]
```

Also add into `sections.footer`:

```json
"modelAttribution": "3D model · {{author}} · CC-BY"
```

- [x] **Step 3: Add new i18n keys (PT)**

Open `src/i18n/locales/pt.json` and add the same structure under `sections.about`:

```json
"label": "sobre o kevin — cinemática em três tempos",
"attribution": "modelo 3D · {{author}} · CC-BY",
"beats": [
  {
    "eyebrow": "01 — origem",
    "title": "como cheguei aqui.",
    "body": "quando criança eu desmontava meus brinquedos pra ver como funcionavam. meu primeiro site na faculdade foi uma epifania — finalmente eu podia montar algo. sete anos depois, ainda refino a mesma habilidade."
  },
  {
    "eyebrow": "02 — presente",
    "title": "como trabalho hoje.",
    "body": "fullstack em visualização de dados, sistemas em tempo real, ferramentas de ia e funis de vendas — com um método que acumula. brasileiro, em porto alegre."
  },
  {
    "eyebrow": "03 — o que vem",
    "title": "pra onde vai.",
    "body": "pensar-com-ia todo dia. construindo sistemas cujos usuários são agentes, não só humanos — e refinando a prática que torna esse trabalho enviável."
  }
]
```

And inside `sections.footer`:

```json
"modelAttribution": "modelo 3D · {{author}} · CC-BY"
```

- [x] **Step 4: Run vitest to confirm no test regressions**

Run: `npm run test:unit`
Expected: all existing unit tests pass (the new keys are additive).

- [x] **Step 5: Type-check the new data module**

Run: `npx tsc -b --noEmit`
Expected: clean.

- [x] **Step 6: Commit**

```bash
git add src/data/aboutBeats.ts src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "$(cat <<'EOF'
feat(about): add beats data + new i18n keys

Three-beat narrative (origin/present/future) with eyebrow + title +
body per beat. Old sections.about.title/bio/tactics keys remain for now
— removed in a later task once the new components consume the new keys.

Also adds sections.footer.modelAttribution and sections.about.attribution
i18n strings for the upcoming CC-BY credit line.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `<AboutFallback>` (DOM-only)

**Files:**
- Create: `src/components/ui/AboutFallback.tsx`
- Create: `src/components/ui/AboutFallback.test.tsx`
- Modify: `src/index.css` (append fallback styles)

- [x] **Step 1: Write the failing test**

Create `src/components/ui/AboutFallback.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutFallback } from './AboutFallback'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Return a recognizable string per key path so the test can assert
      // each beat's content reaches the DOM.
      const map: Record<string, string> = {
        'sections.about.beats.0.eyebrow': '01 — origin',
        'sections.about.beats.0.title': 'how i got here.',
        'sections.about.beats.0.body': 'as a kid …',
        'sections.about.beats.1.eyebrow': '02 — present',
        'sections.about.beats.1.title': 'how i work now.',
        'sections.about.beats.1.body': 'fullstack …',
        'sections.about.beats.2.eyebrow': "03 — what's next",
        'sections.about.beats.2.title': "where it's going.",
        'sections.about.beats.2.body': 'thinking-with-ai …',
      }
      return map[key] ?? key
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}))

describe('<AboutFallback>', () => {
  it('renders three beats with title + body each', () => {
    render(<AboutFallback />)
    expect(screen.getByText('how i got here.')).toBeInTheDocument()
    expect(screen.getByText('how i work now.')).toBeInTheDocument()
    expect(screen.getByText("where it's going.")).toBeInTheDocument()
    expect(screen.getByText('as a kid …')).toBeInTheDocument()
    expect(screen.getByText('fullstack …')).toBeInTheDocument()
    expect(screen.getByText('thinking-with-ai …')).toBeInTheDocument()
  })

  it('renders the poster image with empty alt (decorative)', () => {
    render(<AboutFallback />)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('alt', '')
    expect(img.getAttribute('src') || '').toContain('about-toy-poster')
  })

  it('does NOT render a <canvas>', () => {
    const { container } = render(<AboutFallback />)
    expect(container.querySelector('canvas')).toBeNull()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/AboutFallback.test.tsx`
Expected: FAIL — `Cannot find module './AboutFallback'`

- [x] **Step 3: Implement the component**

Create `src/components/ui/AboutFallback.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { ABOUT_BEATS } from '../../data/aboutBeats'

export function AboutFallback() {
  const { t } = useTranslation()

  return (
    <section
      id="about"
      className="about-fallback"
      aria-label={t('sections.about.label')}
    >
      <picture className="about-fallback__media">
        <source
          srcSet="/images/about-toy-poster.webp"
          type="image/webp"
        />
        <img
          src="/images/about-toy-poster.png"
          alt=""
          width={640}
          height={640}
          loading="lazy"
          decoding="async"
        />
      </picture>

      {ABOUT_BEATS.map((beat) => (
        <article key={beat.id} className="about-fallback__beat">
          <div className="about-fallback__eyebrow">
            {t(beat.eyebrowKey)}
          </div>
          <h3 className="about-fallback__title">{t(beat.titleKey)}</h3>
          <p className="about-fallback__body">{t(beat.bodyKey)}</p>
        </article>
      ))}
    </section>
  )
}
```

- [x] **Step 4: Append fallback styles to `src/index.css`**

Append at the end of `src/index.css` (or after the existing About-related rules section if there's a logical place):

```css
/* About — DOM fallback (mobile + reduced-motion) */
.about-fallback {
  padding: 96px 24px;
  max-width: 640px;
  margin-inline: auto;
}
.about-fallback__media {
  display: block;
  margin-bottom: 48px;
}
.about-fallback__media img {
  width: 100%;
  height: auto;
  border-radius: 14px;
}
.about-fallback__beat {
  margin-bottom: 56px;
}
.about-fallback__beat:last-child {
  margin-bottom: 0;
}
.about-fallback__eyebrow {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faded, #6A8CAA);
  margin-bottom: 12px;
}
.about-fallback__title {
  font-weight: 800;
  font-size: 32px;
  letter-spacing: -0.02em;
  line-height: 0.95;
  color: var(--text-ink, #111822);
  margin: 0 0 16px;
}
.about-fallback__body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-bark, #2A4060);
  margin: 0;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ui/AboutFallback.test.tsx`
Expected: 3 tests passing.

- [x] **Step 6: Commit**

```bash
git add src/components/ui/AboutFallback.tsx \
        src/components/ui/AboutFallback.test.tsx \
        src/index.css
git commit -m "$(cat <<'EOF'
feat(about): add DOM-only AboutFallback for mobile/reduced-motion

Stacked editorial layout: poster image + three articles (eyebrow,
title, body) per beat. No canvas, no R3F import. Lazy poster image,
empty alt (decorative — the text below is the content).

Orchestrator wires this up in a later task; for now the component is
unused but green.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `About.tsx` orchestrator (fallback only; canvas branch stubbed)

**Files:**
- Modify: `src/components/sections/About.tsx` — full rewrite

- [x] **Step 1: Replace About.tsx**

Overwrite `src/components/sections/About.tsx` with:

```tsx
import { lazy, Suspense } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { AboutFallback } from '../ui/AboutFallback'

// Lazy-load the canvas branch so mobile users never download the R3F bundle.
// The canvas module is implemented in a later task; until then this import
// resolves to a tiny stub that just renders the fallback.
const AboutScene = lazy(() =>
  import('../canvas/AboutScene').then((m) => ({ default: m.AboutScene })),
)

const ABOUT_BREAKPOINT = '(max-width: 900px)'

export function About() {
  const reduced = useReducedMotion() ?? false
  const isMobile = useMediaQuery(ABOUT_BREAKPOINT)

  if (reduced || isMobile) {
    return <AboutFallback />
  }

  return (
    <Suspense fallback={<AboutFallback />}>
      <AboutScene />
    </Suspense>
  )
}
```

- [x] **Step 2: Create the temporary canvas stub**

So the import resolves cleanly while the real canvas is built in later tasks, create `src/components/canvas/AboutScene/index.ts`:

```ts
export { AboutScene } from './AboutScene'
```

And create the stub `src/components/canvas/AboutScene/AboutScene.tsx`:

```tsx
import { AboutFallback } from '../../ui/AboutFallback'

/**
 * STUB — the real canvas scene is built in Tasks 11–17. Until then,
 * the orchestrator's desktop branch falls back to AboutFallback so the
 * page still renders end-to-end at every commit.
 */
export function AboutScene() {
  return <AboutFallback />
}
```

- [x] **Step 3: Build and verify nothing broke**

Run: `npm run build`
Expected: clean. Only the pre-existing HeroAccent3D chunk-size advisory.

- [x] **Step 4: Run dev server, open in browser, eyeball the About section**

Run: `npm run dev`
Expected: visiting `http://localhost:5173`, the About section renders the fallback (poster + 3 articles) regardless of viewport width — the stub forces the fallback path everywhere for now.

Kill dev server with Ctrl+C.

- [x] **Step 5: Commit**

```bash
git add src/components/sections/About.tsx \
        src/components/canvas/AboutScene/index.ts \
        src/components/canvas/AboutScene/AboutScene.tsx
git commit -m "$(cat <<'EOF'
feat(about): replace section with orchestrator + stub canvas

About.tsx now picks between AboutFallback (mobile/reduced-motion) and
a lazy-loaded AboutScene (desktop). The canvas stub forwards to the
fallback so every commit between here and Task 17 still renders.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Remove dead i18n keys + CSS

**Files:**
- Modify: `src/i18n/locales/en.json` — remove `sections.about.title`, `sections.about.bio`, `sections.about.tactics`
- Modify: `src/i18n/locales/pt.json` — same
- Modify: `src/index.css` — remove `.about-grid`, `.about-bio-wrap`, `.about-bio`, `.about-tactics`, `.about-tactic*` rules
- Modify: `src/pages/Home.tsx` — remove MarqueeDivider above About if present

- [x] **Step 1: Find dead CSS by inspection**

Run: `grep -n "about-grid\|about-bio\|about-tactic" src/index.css`
Save the line ranges for deletion. Open `src/index.css`, find each rule block, delete the rules.

- [x] **Step 2: Remove dead i18n keys**

In `src/i18n/locales/en.json`, delete keys `sections.about.title`, `sections.about.bio`, `sections.about.tactics`.

Same in `src/i18n/locales/pt.json`.

- [x] **Step 3: Check `src/pages/Home.tsx` for MarqueeDivider above About**

Run: `grep -n "About\|MarqueeDivider" src/pages/Home.tsx`

If there's a `<MarqueeDivider>` immediately above `<About />`, delete that JSX line.

If there's NO MarqueeDivider above About already, nothing to change here — note it in the commit message.

- [x] **Step 4: Build + run unit tests + lint**

Run: `npm run build && npm run lint && npm run test:unit`
Expected: all green. If anything fails, it's because something still consumed an old key — restore the key and find the leftover caller before retrying.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/pt.json src/index.css src/pages/Home.tsx
git commit -m "$(cat <<'EOF'
refactor(about): remove dead bio/tactics i18n + CSS

Old About content (title, bio paragraph, four tactics) and their grid
styles are unused after the orchestrator rewrite. Also drops the
MarqueeDivider above the About section so the canvas-on-cream entry
is the divider.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Footer CC-BY attribution

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [x] **Step 1: Find the meta row**

Run: `grep -n "meta\|copy\|all rights" src/components/layout/Footer.tsx`

Identify the meta row JSX (usually the bottom of the footer where copyright lives).

- [x] **Step 2: Add the attribution line**

Insert into the meta row a `<span>` (or whatever the existing meta-item element is) reading:

```tsx
<span className="footer-meta__attribution">
  {t('sections.footer.modelAttribution', { author: 'TBD-replaced-Task-17' })}
</span>
```

The actual author string is filled in during Task 19 once the .glb is downloaded and we know who made it. For this task, the literal `'TBD-replaced-Task-17'` is the placeholder — Task 19 explicitly searches for and replaces it.

- [x] **Step 3: Build + verify renders**

Run: `npm run build && npm run dev`
Expected: footer shows `3D model · TBD-replaced-Task-17 · CC-BY` (or PT equivalent).

Kill dev server.

- [x] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "$(cat <<'EOF'
feat(footer): add CC-BY attribution line (placeholder)

Placeholder author string ('TBD-replaced-Task-17') is replaced in
Task 19 once the .glb is downloaded and the Sketchfab metadata gives
us the actual author name.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Download + inspect + prep the 3D model

**Files:**
- Create: `public/models/about-toy.glb`
- Append: `docs/superpowers/plans/2026-05-20-about-cinematic-rework.md` (this file) — implementer pastes the inspection output below this task

- [x] **Step 1: Download model A from Sketchfab**

User downloaded `vintage_toy_robot.glb` from Sketchfab (UID `7780d6de101b47e085fc5397f7e33701`), placed at `public/models/about-toy.glb` (2.8 MB original). Author: **Tom Scudder** (CC Attribution).

- [x] **Step 2: Inspect the scene graph**

```
generator: Sketchfab-16.65.0
extensionsUsed: KHR_materials_clearcoat
Meshes: 32 separate primitives (all TRIANGLES), all named "ToyRobot:..." (pCube*, pCylinder*, pSphere*, polySurface*).
Textures (original): 3 × 1024² PNG (baseColor, metallicRoughness, normal) totaling 2.1 MB — stripped at runtime override + at build time via texture detach.
```

- [x] **Step 3: Decide path based on mesh count**

32 meshes — well above the 4-mesh threshold. Path: **use as-is**. No Blender split needed. Skip Steps 4 + 5.

- [x] **Step 4 (only if Step 3 routed here): Open in Blender + split by loose parts**

Not applicable — Step 3 routed to "use as-is" (32 separable meshes already present).

- [x] **Step 5 (only if loose-parts split failed): Fall back to model B or D**

Not applicable — primary model A worked.

- [x] **Step 6: Optimize**

Plan command `gltf-transform optimize` with defaults RAN `join` which fused all 32 meshes into 1 — discovered on first attempt, original was restored from a fresh copy from `~/Downloads/`. Re-ran with `--join false --flatten false --compress draco`. Mesh count stayed at 32; size went from 2.8 MB → 2.32 MB.

Then ran a one-off node script to **detach all texture references from materials** and `dispose()` the orphaned textures (since runtime palette override discards them anyway). Final: 162 KB. Script ran with `@gltf-transform/core@4.3.0` + `@gltf-transform/extensions` + `draco3dgltf@1.5.7` installed locally in `/tmp` (not added as project deps).

- [x] **Step 7: Verify file size**

162 KB — well under the 500 KB target.

- [x] **Step 8: Commit the model + inspection notes**

```bash
git add public/models/about-toy.glb docs/superpowers/plans/2026-05-20-about-cinematic-rework.md
git commit -m "$(cat <<'EOF'
chore(about): commit prepared 3D model

Sketchfab CC-BY model downloaded, [as-is | split via Blender loose-parts |
fallback to model B/D — fill in], material-stripped, draco-optimized.
Inspection output recorded in the plan file.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — `scatterMath` utility (pure)

**Files:**
- Create: `src/components/canvas/AboutScene/scatterMath.ts`
- Create: `src/components/canvas/AboutScene/scatterMath.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/canvas/AboutScene/scatterMath.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { scatterOffset, spreadDirection } from './scatterMath'

describe('scatterOffset', () => {
  it('is deterministic per index', () => {
    const a = scatterOffset(3)
    const b = scatterOffset(3)
    expect(a.x).toBe(b.x)
    expect(a.y).toBe(b.y)
    expect(a.z).toBe(b.z)
  })

  it('differs across indices', () => {
    const a = scatterOffset(0)
    const b = scatterOffset(1)
    expect(a.equals(b)).toBe(false)
  })

  it('stays within the documented scatter bounds (|x|,|y| <= 2, |z| <= 1.5)', () => {
    for (let i = 0; i < 20; i++) {
      const o = scatterOffset(i)
      expect(Math.abs(o.x)).toBeLessThanOrEqual(2)
      expect(Math.abs(o.y)).toBeLessThanOrEqual(2)
      expect(Math.abs(o.z)).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('spreadDirection', () => {
  it('returns a normalized outward direction from origin', () => {
    const pos = new Vector3(1, 0, 0)
    const dir = spreadDirection(pos)
    expect(dir.length()).toBeCloseTo(1, 5)
    expect(dir.x).toBeGreaterThan(0)
  })

  it('adds upward bias to the direction', () => {
    const pos = new Vector3(0, 0, 1)
    const dir = spreadDirection(pos)
    expect(dir.y).toBeGreaterThan(0)
  })

  it('handles parts at origin without NaN', () => {
    const pos = new Vector3(0, 0, 0)
    const dir = spreadDirection(pos)
    expect(Number.isFinite(dir.x)).toBe(true)
    expect(Number.isFinite(dir.y)).toBe(true)
    expect(Number.isFinite(dir.z)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/canvas/AboutScene/scatterMath.test.ts`
Expected: FAIL — `Cannot find module './scatterMath'`.

- [ ] **Step 3: Implement scatterMath**

Create `src/components/canvas/AboutScene/scatterMath.ts`:

```ts
import { Vector3 } from 'three'

// Deterministic LCG seeded by index. Mulberry-like, returns floats in [-1, 1].
function rand(seed: number, salt: number): number {
  let s = (seed * 9301 + salt * 49297) % 233280
  s = (s + 233280) % 233280
  return (s / 116640) - 1  // -> roughly [-1, 1]
}

/**
 * Deterministic per-part scatter offset. Used to compute the "scattered"
 * starting position: `scattered = assembled + scatterOffset(index)`.
 *
 * Bounded so all parts stay visible inside the camera's frustum even
 * at fully-scattered (progress = 0).
 */
export function scatterOffset(index: number): Vector3 {
  return new Vector3(
    rand(index, 13) * 2,
    rand(index, 27) * 2,
    rand(index, 41) * 1.5,
  )
}

/**
 * Per-part outward spread direction (beat 3 — "spreading"). Normalized,
 * with a +0.2 upward bias to evoke "lift / agency" rather than just
 * radial scatter. Falls back to a unit-Y vector if the part sits exactly
 * at origin.
 */
export function spreadDirection(assembledPosition: Vector3): Vector3 {
  const radial = assembledPosition.clone()
  if (radial.length() < 1e-4) {
    return new Vector3(0, 1, 0)
  }
  radial.normalize()
  radial.y += 0.2
  return radial.normalize()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/canvas/AboutScene/scatterMath.test.ts`
Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/AboutScene/scatterMath.ts src/components/canvas/AboutScene/scatterMath.test.ts
git commit -m "$(cat <<'EOF'
feat(about-canvas): add deterministic scatter/spread math

scatterOffset returns a stable [-2,2] x [-2,2] x [-1.5,1.5] vector per
part index — used to compute the "scattered" starting position of each
toy mesh part. spreadDirection returns a normalized outward vector with
a +0.2y bias for the beat-3 "spreading" choreography.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — `useAboutProgress` hook (Framer scroll wrapper)

**Files:**
- Create: `src/components/canvas/AboutScene/useAboutProgress.ts`
- Create: `src/components/canvas/AboutScene/useAboutProgress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/canvas/AboutScene/useAboutProgress.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { beatOpacityRange } from './useAboutProgress'

describe('beatOpacityRange', () => {
  it('beat 0: opacity fades in by 0.05, fully visible until 0.33, fades out by 0.44', () => {
    expect(beatOpacityRange(0)).toEqual([0, 0.05, 0.33, 0.44])
  })

  it('beat 1: opacity fades in by 0.39, fully visible until 0.66, fades out by 0.77', () => {
    expect(beatOpacityRange(1)).toEqual([0.22, 0.39, 0.66, 0.77])
  })

  it('beat 2: opacity fades in by 0.72, fully visible until end', () => {
    expect(beatOpacityRange(2)).toEqual([0.55, 0.72, 1, 1])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/canvas/AboutScene/useAboutProgress.test.ts`
Expected: FAIL — `Cannot find module './useAboutProgress'`.

- [ ] **Step 3: Implement the hook + the pure helper**

Create `src/components/canvas/AboutScene/useAboutProgress.ts`:

```ts
import { useScroll, useTransform, type MotionValue } from 'framer-motion'
import type { RefObject } from 'react'

/**
 * Returns the 4-stop opacity range for beat `i` (0, 1, or 2) over the
 * section's 0..1 scroll progress.
 *
 * Each beat occupies one third of the scroll range with ~22% crossfade
 * overlap into the next beat:
 *   beat 0: [0,     0.05, 0.33, 0.44]
 *   beat 1: [0.22,  0.39, 0.66, 0.77]
 *   beat 2: [0.55,  0.72, 1,    1   ]
 */
export function beatOpacityRange(i: 0 | 1 | 2): [number, number, number, number] {
  if (i === 0) return [0, 0.05, 0.33, 0.44]
  if (i === 1) return [0.22, 0.39, 0.66, 0.77]
  return [0.55, 0.72, 1, 1]
}

export interface AboutProgress {
  /** 0..1 across the entire 300vh outer wrapper. */
  scrollYProgress: MotionValue<number>
  /** Opacity 0..1 for each beat's billboard group. */
  beatOpacity: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
}

export function useAboutProgress(outerRef: RefObject<HTMLElement | null>): AboutProgress {
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  const beat0 = useTransform(scrollYProgress, beatOpacityRange(0), [0, 1, 1, 0])
  const beat1 = useTransform(scrollYProgress, beatOpacityRange(1), [0, 1, 1, 0])
  const beat2 = useTransform(scrollYProgress, beatOpacityRange(2), [0, 1, 1, 1])

  return { scrollYProgress, beatOpacity: [beat0, beat1, beat2] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/canvas/AboutScene/useAboutProgress.test.ts`
Expected: 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/AboutScene/useAboutProgress.ts src/components/canvas/AboutScene/useAboutProgress.test.ts
git commit -m "$(cat <<'EOF'
feat(about-canvas): add useAboutProgress scroll-progress hook

Wraps Framer useScroll over the outer 300vh wrapper. Returns the 0..1
scroll progress motion value plus per-beat opacity motion values with
~22% crossfade overlap between consecutive beats. Pure helper
(beatOpacityRange) is unit-tested.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — `<ToyModel>` (loads .glb, applies palette, rest pose)

**Files:**
- Create: `src/components/canvas/AboutScene/ToyModel.tsx`

This task ships the toy in its assembled state, with palette-overridden materials. No scroll animation yet — that's Task 13.

- [ ] **Step 1: Implement ToyModel**

Create `src/components/canvas/AboutScene/ToyModel.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group, Mesh, MeshStandardMaterial } from 'three'

const MODEL_URL = '/models/about-toy.glb'

// Portfolio palette mapped to a small set of materials. Parts get assigned
// in a stable order so the palette distribution is deterministic across
// renders.
const PALETTE: ReadonlyArray<{ color: string; metalness: number; roughness: number }> = [
  { color: '#A2D2FF', metalness: 0.35, roughness: 0.45 }, // blue-300 — main body
  { color: '#D4E5F2', metalness: 0.20, roughness: 0.55 }, // mist     — accents
  { color: '#6A8CAA', metalness: 0.50, roughness: 0.30 }, // dust     — joints / smaller parts
  { color: '#3A96E8', metalness: 0.40, roughness: 0.40 }, // blue-400 — highlight
]

useGLTF.preload(MODEL_URL)

export function ToyModel() {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  // Collect mesh refs in a stable, ordered list. Used by Task 13 to
  // animate per-part transforms.
  const partsRef = useRef<Mesh[]>([])

  useEffect(() => {
    const meshes: Mesh[] = []
    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const m = obj as Mesh
        meshes.push(m)
      }
    })
    partsRef.current = meshes

    // Apply palette override — deterministic by mesh index in traversal order.
    meshes.forEach((mesh, i) => {
      const swatch = PALETTE[i % PALETTE.length]
      mesh.material = new MeshStandardMaterial({
        color: swatch.color,
        metalness: swatch.metalness,
        roughness: swatch.roughness,
      })
      // Cache the assembled rest pose so Task 13 can lerp from/to it.
      mesh.userData.assembled = {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
      }
    })
  }, [scene])

  // Centre the model: drei's useGLTF returns the scene at whatever origin
  // the model was authored with. The group wrapper lets us recentre + scale.
  const transform = useMemo(() => ({
    scale: 1.2,
    position: [0, -0.3, 0] as [number, number, number],
  }), [])

  return (
    <group ref={groupRef} {...transform}>
      <primitive object={scene} />
    </group>
  )
}
```

- [ ] **Step 2: Build to verify imports resolve**

Run: `npm run build`
Expected: passes. drei + three are already in deps.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/AboutScene/ToyModel.tsx
git commit -m "$(cat <<'EOF'
feat(about-canvas): add ToyModel — loads glb + palette override

Loads /models/about-toy.glb via drei useGLTF, traverses meshes, caches
each part's assembled rest pose in userData (consumed by Task 13's
scroll choreography), and replaces materials with portfolio palette
swatches (sky-blue / mist / dust / blue-400). No scroll animation yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — `<BeatText>` (drei Text billboard)

**Files:**
- Create: `src/components/canvas/AboutScene/BeatText.tsx`

- [ ] **Step 1: Implement BeatText**

Create `src/components/canvas/AboutScene/BeatText.tsx`:

```tsx
import { Text } from '@react-three/drei'
import { animated, useSpring } from '@react-spring/three'
import type { MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const FONT_URL = '/fonts/PlusJakartaSans-VariableFont_wght.ttf'

interface BeatTextProps {
  content: string
  position: [number, number, number]
  fontSize: number
  fontWeight: number
  color: string
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
  maxWidth?: number
  /** Framer motion value driving 0..1 opacity. */
  opacity: MotionValue<number>
}

/**
 * Drei <Text> wrapper that bridges a Framer MotionValue into the THREE
 * material's fillOpacity. Framer motion values can't drive THREE props
 * directly, so we subscribe and store the latest value in React state
 * (cheap — opacity only updates while the user is actively scrolling).
 */
export function BeatText({
  content,
  position,
  fontSize,
  fontWeight,
  color,
  anchorX = 'center',
  anchorY = 'middle',
  maxWidth,
  opacity,
}: BeatTextProps) {
  const [op, setOp] = useState(opacity.get())
  const lastRef = useRef(op)

  useEffect(() => {
    const unsub = opacity.on('change', (v) => {
      // Skip render if change is below perceptual threshold — avoids
      // re-rendering canvas children every animation frame.
      if (Math.abs(v - lastRef.current) > 0.005) {
        lastRef.current = v
        setOp(v)
      }
    })
    return () => unsub()
  }, [opacity])

  return (
    <Text
      position={position}
      font={FONT_URL}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      maxWidth={maxWidth}
      fillOpacity={op}
      // Match the portfolio's wireframe-leaning aesthetic — no outline
      // unless we deliberately add one in a later polish task.
    >
      {content}
    </Text>
  )
}
```

- [ ] **Step 2: Build to verify imports**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/AboutScene/BeatText.tsx
git commit -m "$(cat <<'EOF'
feat(about-canvas): add BeatText drei Text billboard

Wraps drei <Text> with a Framer MotionValue → THREE fillOpacity bridge.
Subscribes to the motion value (only re-renders on perceptible
opacity change) and forwards content + positioning + Plus Jakarta Sans
to the underlying Troika SDF text.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — `<ToyModel>` part choreography (scroll-driven)

**Files:**
- Modify: `src/components/canvas/AboutScene/ToyModel.tsx`

- [ ] **Step 1: Replace ToyModel with the choreographed version**

Replace the file from Task 11 with:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { MotionValue } from 'framer-motion'
import { scatterOffset, spreadDirection } from './scatterMath'

const MODEL_URL = '/models/about-toy.glb'

const PALETTE: ReadonlyArray<{ color: string; metalness: number; roughness: number }> = [
  { color: '#A2D2FF', metalness: 0.35, roughness: 0.45 },
  { color: '#D4E5F2', metalness: 0.20, roughness: 0.55 },
  { color: '#6A8CAA', metalness: 0.50, roughness: 0.30 },
  { color: '#3A96E8', metalness: 0.40, roughness: 0.40 },
]

useGLTF.preload(MODEL_URL)

interface ToyModelProps {
  /** 0..1 scroll progress across the About section. */
  progress: MotionValue<number>
}

interface PartCache {
  mesh: Mesh
  assembled: Vector3
  scattered: Vector3
  spread: Vector3
}

const _tmp = new Vector3()

function lerpClamped(a: number, b: number, t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return a + (b - a) * c
}

function positionForProgress(part: PartCache, p: number, out: Vector3): Vector3 {
  if (p < 0.33) {
    const t = p / 0.33
    out.lerpVectors(part.scattered, part.assembled, t)
  } else if (p < 0.66) {
    out.copy(part.assembled)
  } else {
    const t = (p - 0.66) / 0.34
    _tmp.copy(part.spread).multiplyScalar(0.3).add(part.assembled)
    out.lerpVectors(part.assembled, _tmp, t)
  }
  return out
}

export function ToyModel({ progress }: ToyModelProps) {
  const groupRef = useRef<Group>(null)
  const partsRef = useRef<PartCache[]>([])
  const { scene } = useGLTF(MODEL_URL)

  useEffect(() => {
    const cache: PartCache[] = []
    let i = 0
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return
      const mesh = obj as Mesh
      const swatch = PALETTE[i % PALETTE.length]
      mesh.material = new MeshStandardMaterial({
        color: swatch.color,
        metalness: swatch.metalness,
        roughness: swatch.roughness,
      })
      const assembled = mesh.position.clone()
      cache.push({
        mesh,
        assembled,
        scattered: assembled.clone().add(scatterOffset(i)),
        spread: spreadDirection(assembled),
      })
      i++
    })
    partsRef.current = cache
  }, [scene])

  useFrame(() => {
    const p = progress.get()
    const parts = partsRef.current
    for (const part of parts) {
      positionForProgress(part, p, part.mesh.position)
    }
    if (groupRef.current) {
      // Subtle Y rotation during the "live" middle phase (0.33..0.66).
      const liveT = lerpClamped(0, 1, (p - 0.33) / 0.33)
      groupRef.current.rotation.y = liveT * (Math.PI / 6) // ~30°
    }
  })

  const transform = useMemo(() => ({
    scale: 1.2,
    position: [0, -0.3, 0] as [number, number, number],
  }), [])

  return (
    <group ref={groupRef} {...transform}>
      <primitive object={scene} />
    </group>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/AboutScene/ToyModel.tsx
git commit -m "$(cat <<'EOF'
feat(about-canvas): wire per-part scroll choreography

ToyModel now consumes a progress MotionValue and animates each mesh
part's position via useFrame:

- 0.00..0.33: lerp scattered -> assembled (parts converge)
- 0.33..0.66: hold at assembled; toy rotates ~30° on Y
- 0.66..1.00: lerp assembled -> assembled + spread*0.3 (parts spread)

scatterOffset(i) + spreadDirection(assembled) drive the per-part vectors
deterministically by mesh-traversal index.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — `<Scene>` (canvas scene graph composition)

**Files:**
- Create: `src/components/canvas/AboutScene/Scene.tsx`

- [ ] **Step 1: Implement Scene**

Create `src/components/canvas/AboutScene/Scene.tsx`:

```tsx
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { MotionValue } from 'framer-motion'
import { ToyModel } from './ToyModel'
import { BeatText } from './BeatText'
import { ABOUT_BEATS, beatIndexAtProgress } from '../../../data/aboutBeats'
import { useState, useEffect } from 'react'

interface SceneProps {
  scrollYProgress: MotionValue<number>
  beatOpacity: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
}

/**
 * Reads the current beat index off the scroll progress. Used to pick which
 * beat's strings the SHARED billboards (headline-behind, body-caption, etc.)
 * display. The per-beat opacity comes from useAboutProgress; this is just
 * about *which content* is shown at any given progress.
 */
function useActiveBeat(progress: MotionValue<number>): 0 | 1 | 2 {
  const [active, setActive] = useState<0 | 1 | 2>(beatIndexAtProgress(progress.get()))
  useEffect(() => {
    const unsub = progress.on('change', (v) => {
      const next = beatIndexAtProgress(v)
      setActive((cur) => (cur === next ? cur : next))
    })
    return () => unsub()
  }, [progress])
  return active
}

export function Scene({ scrollYProgress, beatOpacity }: SceneProps) {
  const { t } = useTranslation()
  const active = useActiveBeat(scrollYProgress)

  // Counter is derived from active (no opacity transform; counter is always visible).
  const counterText = `0${active + 1} / 03`

  return (
    <>
      <ambientLight intensity={0.6} color="#F6F9FC" />
      <directionalLight position={[3, 4, 5]} intensity={0.9} color="#FFFFFF" />

      <Suspense fallback={null}>
        <ToyModel progress={scrollYProgress} />
      </Suspense>

      {/* Headline behind the toy (one per beat — only the active beat's
          opacity is non-zero at any time, but rendering all three avoids
          a Troika SDF rebuild on beat change). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`headline-${beat.id}`}
          content={t(beat.titleKey)}
          position={[0, 0, -0.5]}
          fontSize={0.85}
          fontWeight={800}
          color="#D4E5F2"
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Eyebrow (top-left). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`eyebrow-${beat.id}`}
          content={t(beat.eyebrowKey)}
          position={[-2.2, 1.4, 1]}
          fontSize={0.18}
          fontWeight={400}
          color="#6A8CAA"
          anchorX="left"
          anchorY="top"
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Body caption (bottom-center). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`body-${beat.id}`}
          content={t(beat.bodyKey)}
          position={[0, -1.6, 0.5]}
          fontSize={0.2}
          fontWeight={500}
          color="#2A4060"
          anchorY="bottom"
          maxWidth={4.0}
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Counter (bottom-right) — single instance, content swaps. */}
      <BeatText
        content={counterText}
        position={[2.2, -1.6, 1]}
        fontSize={0.16}
        fontWeight={400}
        color="#6A8CAA"
        anchorX="right"
        anchorY="bottom"
        opacity={beatOpacity[2]}  // always-on after beat 2's enter; in practice opacity stays 1
      />
    </>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/AboutScene/Scene.tsx
git commit -m "$(cat <<'EOF'
feat(about-canvas): compose scene graph (toy + 3 beat billboards)

Lights, ToyModel, and three BeatText instances per beat (eyebrow,
headline-behind, body-caption) — each with its own opacity motion
value from useAboutProgress. Counter is a single instance whose content
derives from the active beat index. Renders all beats' billboards
simultaneously to avoid Troika SDF rebuilds on beat change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — `<AboutScene>` (canvas wrapper + outer sticky)

**Files:**
- Modify: `src/components/canvas/AboutScene/AboutScene.tsx` (replace stub)
- Append: `src/index.css` (sticky layout rules)

- [ ] **Step 1: Replace the stub**

Overwrite `src/components/canvas/AboutScene/AboutScene.tsx` with:

```tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { ABOUT_BEATS } from '../../../data/aboutBeats'
import { Scene } from './Scene'
import { useAboutProgress } from './useAboutProgress'

export function AboutScene() {
  const outerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress, beatOpacity } = useAboutProgress(outerRef)
  const { t } = useTranslation()

  return (
    <section id="about" className="about-outer" ref={outerRef}>
      {/* Accessibility twin — full content for screen readers. The canvas
          is decorative as far as a11y is concerned. */}
      <div className="sr-only" role="region" aria-label={t('sections.about.label')}>
        {ABOUT_BEATS.map((beat) => (
          <article key={beat.id}>
            <h3>{t(beat.titleKey)}</h3>
            <p>{t(beat.bodyKey)}</p>
          </article>
        ))}
      </div>

      <div className="about-sticky">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          aria-hidden="true"
        >
          <Scene scrollYProgress={scrollYProgress} beatOpacity={beatOpacity} />
        </Canvas>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Append sticky layout rules to `src/index.css`**

Append at the end of `src/index.css`:

```css
/* About — pinned cinematic */
.about-outer {
  position: relative;
  height: 300vh;
}
.about-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
/* sr-only — defensive copy (Tailwind v4 provides it by default but
   the rule below is the standard implementation in case our setup
   strips it). Safe to leave even if redundant. */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 4: Run dev server, eyeball desktop About**

Run: `npm run dev`
Expected: visiting `http://localhost:5173` on a desktop viewport (≥901px), the About section is now 300vh tall; the inner canvas pins as you scroll; the toy assembles → holds → spreads across the three thirds of scroll; the three beats' eyebrow/headline/body crossfade.

Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/AboutScene/AboutScene.tsx src/index.css
git commit -m "$(cat <<'EOF'
feat(about-canvas): wire AboutScene + outer sticky pin

300vh outer wrapper; sticky inner 100vh container; transparent Canvas
holds the Scene. Outer ref drives useAboutProgress. Hidden DOM twin
(sr-only) carries every beat's title + body for screen readers; the
canvas itself is aria-hidden.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Generate poster image

**Files:**
- Create: `scripts/capture-about-poster.mjs`
- Create: `public/images/about-toy-poster.webp`
- Create: `public/images/about-toy-poster.png`

- [ ] **Step 1: Implement the capture script**

Create `scripts/capture-about-poster.mjs`:

```js
// One-off poster capture for the About fallback. Loads the production
// build at http://localhost:4173, scrolls the About section to progress
// ~= 0.4 (toy fully assembled, no spread, no rotation midpoint), and
// crops a 640x640 centered on the canvas.
//
// Run: npm run preview (in another terminal) then
//      node scripts/capture-about-poster.mjs

import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const URL = 'http://localhost:4173/'
const VIEWPORT = { width: 1440, height: 900 }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'no-preference' })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// Find the About outer and compute the scrollY where progress ~= 0.4.
const aboutBox = await page.evaluate(() => {
  const el = document.querySelector('#about')
  if (!el) throw new Error('#about not found')
  const r = el.getBoundingClientRect()
  return { top: r.top + window.scrollY, height: r.height }
})
const targetY = Math.round(aboutBox.top + aboutBox.height * 0.4)
await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), targetY)
await page.waitForTimeout(800)

// Screenshot full viewport, then crop a 640x640 centered on the canvas.
const fullPath = '/tmp/about-poster-full.png'
await page.screenshot({ path: fullPath, fullPage: false })

const cx = VIEWPORT.width / 2
const cy = VIEWPORT.height / 2
await sharp(fullPath)
  .extract({ left: cx - 320, top: cy - 320, width: 640, height: 640 })
  .png({ quality: 100 })
  .toFile('public/images/about-toy-poster.png')
await sharp(fullPath)
  .extract({ left: cx - 320, top: cy - 320, width: 640, height: 640 })
  .webp({ quality: 80 })
  .toFile('public/images/about-toy-poster.webp')

await browser.close()
console.log('✓ poster written to public/images/about-toy-poster.{webp,png}')
```

- [ ] **Step 2: Install sharp (image processing)**

Run: `npm install --save-dev sharp`
Expected: clean install.

- [ ] **Step 3: Build + start preview server**

Run: `npm run build && npm run preview -- --port 4173 &`
Expected: server starts. Wait ~2s.

- [ ] **Step 4: Run the capture script**

Run: `node scripts/capture-about-poster.mjs`
Expected: stdout: `✓ poster written to public/images/about-toy-poster.{webp,png}`.

- [ ] **Step 5: Kill preview server**

Run: `kill %1` (or find + kill the preview process).

- [ ] **Step 6: Eyeball both files**

Open `public/images/about-toy-poster.webp` and `.png` in Finder / Preview. Expected: 640×640 image of the assembled toy on cream background, no scroll cursor or other UI visible. If the toy isn't centered or the image cropped wrong, rerun with adjusted cx/cy in the script.

- [ ] **Step 7: Commit**

```bash
git add scripts/capture-about-poster.mjs \
        public/images/about-toy-poster.webp \
        public/images/about-toy-poster.png \
        package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore(about): generate fallback poster image

640x640 webp + png crop captured from the desktop canvas at scroll
progress 0.4 (toy fully assembled, no rotation midpoint, no spread).
Script in scripts/capture-about-poster.mjs is rerunnable when the
model or palette changes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17 — Replace Footer attribution placeholder

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Look up the model author from Sketchfab metadata**

Run:
```bash
curl -s "https://api.sketchfab.com/v3/models/7780d6de101b47e085fc5397f7e33701" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['user']['displayName'])"
```
Expected: prints the author's display name (e.g. `Tom Scudder`).

If Task 8 fell back to model B or D, look up that model's UID instead.

- [ ] **Step 2: Replace the placeholder**

Open `src/components/layout/Footer.tsx`. Find the literal string `'TBD-replaced-Task-17'` (it might be `TBD-replaced-Task-17` from Task 7 — earlier numbering; just grep for `TBD-replaced`). Replace with the actual author name from Step 1.

Run: `grep -n "TBD-replaced" src/components/layout/Footer.tsx`
Expected after the edit: no matches.

- [ ] **Step 3: Build + eyeball footer**

Run: `npm run build && npm run dev`
Expected: footer meta row reads `3D model · [actual author] · CC-BY`.

Kill dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "$(cat <<'EOF'
chore(footer): fill in 3D model author attribution

Replaces the Task 7 placeholder with the actual Sketchfab author name
for the model that landed in Task 8.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18 — E2E tests

**Files:**
- Create: `tests/e2e/about-cinematic.spec.ts`

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/about-cinematic.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('About cinematic — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('about outer wrapper is ~300vh tall', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const heightInVh = await page.locator('#about').evaluate((el) => {
      const h = el.getBoundingClientRect().height
      return h / window.innerHeight
    })
    expect(heightInVh).toBeGreaterThan(2.8)
    expect(heightInVh).toBeLessThan(3.2)
  })

  test('inner container uses position: sticky', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const position = await page.locator('#about .about-sticky').evaluate(
      (el) => getComputedStyle(el as HTMLElement).position,
    )
    expect(position).toBe('sticky')
  })

  test('canvas renders inside the sticky', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('#about .about-sticky canvas')).toBeVisible()
  })

  test('accessibility twin contains all three beats', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const twin = page.locator('#about [role="region"]')
    await expect(twin).toBeAttached()
    const articles = twin.locator('article')
    await expect(articles).toHaveCount(3)
  })
})

test.describe('About cinematic — mobile fallback', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('no <canvas> rendered under #about', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const canvasCount = await page.locator('#about canvas').count()
    expect(canvasCount).toBe(0)
  })

  test('poster image present', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const img = page.locator('#about img').first()
    await expect(img).toBeVisible()
    const src = await img.getAttribute('src')
    expect(src || '').toContain('about-toy-poster')
  })

  test('three beat articles render', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const articles = page.locator('#about article')
    await expect(articles).toHaveCount(3)
  })
})

test.describe('About cinematic — reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } })

  test('falls back to DOM (no canvas)', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const canvasCount = await page.locator('#about canvas').count()
    expect(canvasCount).toBe(0)
    const articles = page.locator('#about article')
    await expect(articles).toHaveCount(3)
  })
})
```

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e -- about-cinematic`
Expected: all 9 tests pass.

If any fail, debug — likely culprits: (a) the loader gate (`loaderState === 'done'`) — check the existing tests use the same gate; (b) selector mismatch — verify with the dev server open.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/about-cinematic.spec.ts
git commit -m "$(cat <<'EOF'
test(about): e2e coverage for desktop pin + mobile + reduced-motion

Desktop suite asserts: 300vh outer, sticky inner, canvas rendered,
sr-only twin contains 3 articles.
Mobile suite (Pixel-class viewport): no canvas, poster image, 3 article
elements present.
Reduced-motion suite: same as mobile — no canvas, 3 articles.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 19 — Verification + visual sweep

**Files:**
- None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: clean. The HeroAccent3D advisory may now be joined by an AboutScene chunk advisory — that's expected (we lazy-load it).

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: unit (vitest) all green; e2e baseline parity (no NEW failures vs. main — 14 pre-existing failures may persist).

To confirm baseline parity:
```bash
# Save current branch test result, then:
git stash
git checkout main
npm run test:e2e 2>&1 | tee /tmp/baseline-e2e.txt
git checkout feat/about-cinematic-rework
git stash pop
npm run test:e2e 2>&1 | tee /tmp/branch-e2e.txt
diff <(grep -E 'failed|passed' /tmp/baseline-e2e.txt) <(grep -E 'failed|passed' /tmp/branch-e2e.txt)
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Lighthouse against `npm run preview`**

Run:
```bash
npm run build && npm run preview -- --port 4173 &
sleep 3
npx lighthouse http://localhost:4173 --only-categories=performance,accessibility --output=json --output-path=/tmp/about-lh.json --chrome-flags="--headless"
kill %1
python3 -c "import json; d=json.load(open('/tmp/about-lh.json')); print('Perf:', d['categories']['performance']['score']*100); print('A11y:', d['categories']['accessibility']['score']*100)"
```

Expected: Performance ≥ 90, Accessibility ≥ 95. **Per the codebase memory: only run Lighthouse against `npm run preview` (port 4173), NOT the dev server.**

- [ ] **Step 5: Manual visual sweep**

Run: `npm run dev` and walk through:
- **Desktop 1440×900**: scroll past Hero → About pin engages; toy assembles cleanly 0→33% of pin; holds + slow Y-rotation 33→66%; spreads (parts drift outward) 66→100%; eyebrow/headline/body fade between beats; counter ticks 01/03 → 02/03 → 03/03; pin releases; next section reads normally.
- **EN ↔ PT switch**: language toggle re-renders canvas text; no glyph loss, no layout jank.
- **Mobile 390×844 (Chrome devtools toggle)**: poster + 3 articles; no canvas in DOM; scroll is normal length.
- **System reduced-motion ON** (System Settings → Accessibility on macOS): desktop 1440 viewport now shows fallback, not canvas.

Kill dev server.

- [ ] **Step 6: Commit any small visual-sweep fixes if needed**

If the manual sweep surfaces issues (text size off, beat boundaries feel wrong, palette swatch misassignment) — make the smallest fix that resolves it, commit with a `fix(about):` prefix. If no issues, this step is a no-op.

- [ ] **Step 7: Tick spec TODOs**

Open `docs/superpowers/specs/2026-05-20-about-cinematic-rework-design.md`. For each `- [ ]` item, change to `- [x]` if the implementation now satisfies it. Anything that doesn't fit any existing TODO means the plan or spec missed a requirement — flag back to the controller before continuing.

- [ ] **Step 8: Commit spec ticks**

```bash
git add docs/superpowers/specs/2026-05-20-about-cinematic-rework-design.md
git commit -m "$(cat <<'EOF'
docs(about): tick spec TODOs satisfied by implementation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Final state check**

Run: `git status && git log --oneline -20`
Expected: working tree clean; ~18 commits ahead of main on `feat/about-cinematic-rework`.

---

## Self-Review Notes (controller, post-write)

1. **Spec coverage:** every `- [ ]` in the spec maps to a task above. Cross-check:
   - Orchestrator + lazy-load → Task 5
   - 3D model prep pipeline → Task 8
   - Scatter math + scroll choreography → Tasks 9–10, 13
   - drei `<Text>` + accessibility twin → Tasks 12, 15
   - Mobile + reduced-motion fallback → Tasks 4, 5
   - CC-BY footer attribution → Tasks 7, 17
   - i18n keys → Tasks 3, 6
   - Tests + Lighthouse → Tasks 18, 19
   - Section flow + MarqueeDivider removal → Task 6

2. **Type consistency:** `ABOUT_BEATS`, `beatIndexAtProgress`, `beatOpacityRange`, `scatterOffset`, `spreadDirection`, `PartCache`, `AboutProgress`, `BeatTextProps` — names used consistently across Task references.

3. **No placeholders:** every step has actual code or actual commands. The one defensible "TBD"-shaped value is the Task 7 footer placeholder, which is explicitly typed as `'TBD-replaced-Task-17'` and replaced in Task 17 — that's intentional pipeline state, not a plan gap.
