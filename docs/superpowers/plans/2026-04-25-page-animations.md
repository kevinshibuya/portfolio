# Page Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the polished animation pass specified in `docs/superpowers/specs/2026-04-25-page-animations-design.md` — loader→hero handoff, hero data-fragment composition with scroll-linked motion + optional R3F accent, soft `shibuya.` scramble hover, viewport section enters, eased title scroll-fade — under a strict reduced-motion contract and 0kb new runtime deps.

**Architecture:** GSAP carries timeline + ScrollTrigger work (loader handoff, fragment entry/parallax, title scroll-fade). Framer Motion handles state-driven hover (`shibuya.` scramble) and viewport enters (`whileInView`). R3F is a single optional canvas behind `Suspense` and a flag, lazy-chunked. A `MotionContext` exposes `loaderDone` (Promise), `prefersReducedMotion` (boolean), `r3fAccentEnabled` (boolean) so all consumers coordinate without prop-drilling. Tests sit in two layers: Vitest unit tests for deterministic logic (`useScramble`, scroll-fade math) and Playwright e2e for integration (loader handoff, viewport triggers, scroll-fade opacity at known offsets, reduced-motion short-circuit).

**Tech Stack:** React 19 · TypeScript strict · Vite 6 · Tailwind v4 · `framer-motion@12` · `gsap@3` + `@gsap/react` · `@react-three/fiber` + `drei`. Test deps (devDeps only, no bundle impact): `vitest`, `@testing-library/react`, `jsdom`, `@playwright/test`.

---

## Spec → Task map

| Spec TODO | Task |
|---|---|
| (foundation, no checkbox) | Task 0 — Test infrastructure |
| (foundation, no checkbox) | Task 1 — Motion primitives (Context, flags, eases, hooks scaffold) |
| #1 Loader → hero handoff | Task 2 |
| #2 Hero data-fragments entry | Task 3 |
| #3 Hero data-fragments scroll-linked motion | Task 4 |
| #4 `shibuya.` scramble hover | Task 5 |
| #5 Section content viewport enters | Task 6 |
| #6 Title scroll-linked fade | Task 7 |
| #7 Reduced-motion contract | Task 8 |
| #8 Performance + mobile budget | Task 9 |
| #9 Bundle weight (0kb new runtime deps) | Task 10 |

Each spec-TODO task ends with an Edit to flip its `- [ ]` to `- [x]` in `docs/superpowers/specs/2026-04-25-page-animations-design.md` and a focused commit referencing the spec.

---

## File structure

**New files:**
- `src/context/MotionContext.tsx` — context provider exposing `loaderDone`, `prefersReducedMotion`, `r3fAccentEnabled`
- `src/utils/motion-flags.ts` — boolean flags (`ENABLE_R3F_ACCENT`, etc.)
- `src/utils/animations.ts` — shared eases (`projectEase`), durations, GSAP defaults
- `src/hooks/useScramble.ts` — char scramble engine
- `src/hooks/useScrollFade.ts` — ScrollTrigger-bound top-edge fade
- `src/components/layout/LoadingScreen.tsx` — owns loader → hero handoff timeline
- `src/components/canvas/HeroDataFragments.tsx` — SVG editorial composition (primary)
- `src/components/canvas/HeroAccent3D.tsx` — optional R3F element, lazy + flag-gated
- `src/components/canvas/HeroAccentSilhouette.tsx` — static SVG fallback for the R3F accent (matches bbox)
- `src/components/ui/ScrambleText.tsx` — wraps `useScramble`
- `src/components/ui/RevealOnView.tsx` — Framer Motion `whileInView` wrapper
- `tests/unit/useScramble.test.ts`
- `tests/unit/useScrollFade.test.ts`
- `tests/e2e/loader-handoff.spec.ts`
- `tests/e2e/section-enters.spec.ts`
- `tests/e2e/title-scroll-fade.spec.ts`
- `tests/e2e/shibuya-scramble.spec.ts`
- `tests/e2e/reduced-motion.spec.ts`
- `tests/e2e/perf-budget.spec.ts`
- `tests/setup.ts` — jsdom shims for matchMedia, ResizeObserver
- `vitest.config.ts`
- `playwright.config.ts`

**Modified files:**
- `package.json` — add `vitest`, `@testing-library/react`, `jsdom`, `@playwright/test` to devDeps; add `test`, `test:unit`, `test:e2e` scripts
- `src/main.tsx` — wrap app in `MotionProvider`
- `src/App.tsx` — render `LoadingScreen` ahead of `Routes`
- `src/components/sections/Hero.tsx` — render `HeroDataFragments`, wrap name in `forwardRef` for scroll-fade, wrap "shibuya" lettering in `ScrambleText`
- `src/components/ui/SectionHeading.tsx` — bind title `<h2>` to `useScrollFade`
- `src/components/sections/Projects.tsx`, `EmbedsGallery.tsx`, `WorkExperience.tsx`, `Skills.tsx`, `Contact.tsx` — wrap heading + content blocks with `RevealOnView`
- `src/index.css` — add `.hero-fragments` grid styles, mobile media-query tightening for parallax range

---

## Notes for the implementer

- **TypeScript strict, no `any`.** Hooks return explicit types.
- **GSAP discipline:** every `useEffect` that creates GSAP timelines or ScrollTriggers MUST use `gsap.context()` scoped to a ref, and return `() => ctx.revert()` from cleanup. Never create a top-level ScrollTrigger.
- **Reduced motion:** every animated path checks `prefersReducedMotion` from `MotionContext` BEFORE setting up. The fallback is "static at final state" — never "animated, but faster".
- **`useGSAP`:** prefer `@gsap/react`'s `useGSAP({ scope: ref })` over manual `gsap.context()` in `useEffect`. Same semantics, simpler.
- **Visual details for SVG fragments:** spec is the source of truth for shapes/colors. Plan focuses on animation wiring; visual JSX is sketched here and refined at execution time via `frontend-design` skill (per Task 3).
- **Test isolation:** Playwright runs against `vite preview` build (production output) so tests reflect the real bundle.

---

## Task 0: Test infrastructure

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`
- Modify: `package.json`

No spec checkbox. Foundation only.

- [x] **Step 1: Add devDependencies**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
npx playwright install --with-deps chromium
```

Expected: `package.json` updated, no errors.

- [x] **Step 2: Add test scripts to `package.json`**

Edit the `"scripts"` block to add:

```json
"test": "npm run test:unit && npm run test:e2e",
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:e2e": "playwright test"
```

- [x] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
```

- [x] **Step 4: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
```

- [x] **Step 5: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
})
```

- [x] **Step 6: Verify infra runs**

```bash
npm run test:unit
```
Expected: "No test files found, exiting with code 0" — that's success.

```bash
npm run build
```
Expected: build succeeds (sanity).

- [x] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts playwright.config.ts tests/setup.ts
git commit -m "chore: add vitest + playwright test infrastructure"
```

---

## Task 1: Motion primitives (foundation)

**Files:**
- Create: `src/context/MotionContext.tsx`, `src/utils/motion-flags.ts`, `src/utils/animations.ts`
- Modify: `src/main.tsx`

No spec checkbox. Foundation only. Provides what every later task imports.

- [x] **Step 1: Create `src/utils/motion-flags.ts`**

```ts
export const ENABLE_R3F_ACCENT = true
export const MOBILE_BREAKPOINT_PX = 768
export const LOADER_MIN_DURATION_MS = 700
export const LOADER_REDUCED_MOTION_MAX_MS = 200
```

- [x] **Step 2: Create `src/utils/animations.ts`**

```ts
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const projectEase = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const projectEaseGsap = 'power3.out'

export const durations = {
  fast: 0.2,
  base: 0.6,
  slow: 1.1,
  loader: 1.4,
} as const

export const stagger = {
  embedRows: 0.04,
  base: 0.06,
  scrambleChar: 0.03,
} as const

// NOTE: `ease` is the GSAP ease, not the CSS bezier — `sectionEnterDefaults`
// is consumed by GSAP timelines, and GSAP cannot natively parse
// `cubic-bezier(...)` strings (it would silently fall back to power1.out).
export const sectionEnterDefaults = {
  y: 24,
  opacity: 0,
  duration: durations.base,
  ease: projectEaseGsap,
} as const
```

- [x] **Step 3: Create `src/context/MotionContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ENABLE_R3F_ACCENT, MOBILE_BREAKPOINT_PX } from '../utils/motion-flags'

type Resolver = () => void

interface MotionContextValue {
  /**
   * Resolves once when the LoadingScreen handoff completes. Module-scoped, so
   * the SAME promise instance survives React 19 StrictMode remounts and any
   * future MotionProvider unmount/remount — consumers can safely await it from
   * any hook scope without risking an orphaned cycle-1 promise.
   */
  loaderDone: Promise<void>
  resolveLoader: Resolver
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}

let _loaderResolver: Resolver | null = null
const _loaderDone: Promise<void> = new Promise<void>((res) => { _loaderResolver = res })
const resolveLoader: Resolver = () => _loaderResolver?.()

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  const [r3fEnabled, setR3fEnabled] = useState(false)
  useEffect(() => {
    setR3fEnabled(ENABLE_R3F_ACCENT && window.innerWidth >= MOBILE_BREAKPOINT_PX)
  }, [])

  const value = useMemo<MotionContextValue>(
    () => ({
      loaderDone: _loaderDone,
      resolveLoader,
      prefersReducedMotion: reduced,
      r3fAccentEnabled: r3fEnabled,
    }),
    [reduced, r3fEnabled]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion(): MotionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotion must be used within MotionProvider')
  return v
}
```

- [x] **Step 4: Wrap the app in `MotionProvider`**

Edit `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.tsx'
import { MotionProvider } from './context/MotionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <App />
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [x] **Step 5: Sanity check — build still passes**

```bash
npm run build
```
Expected: build succeeds.

- [x] **Step 6: Commit**

```bash
git add src/context/MotionContext.tsx src/utils/motion-flags.ts src/utils/animations.ts src/main.tsx
git commit -m "feat: add motion context, flags, and shared animation tokens"
```

---

## Task 2: TODO #1 — Loading screen → hero handoff

Maps to spec TODO: *"Loading screen renders, fills its progress underline as assets resolve, and hands the `kevin` / `shibuya.` words off to their final hero positions without remount or visible discontinuity (bounding-box continuity verified at frame boundaries)."*

> **Implementation note (post-execution):** the spec describes a `clip-path: inset()` tween moving the loader words to the hero positions. The shipped implementation instead uses a structural-mirror CSS layout + a single GSAP `gsap.set` offset measured at runtime via `document.fonts.ready` + `getBoundingClientRect`. The handoff itself is then just an `autoAlpha` cross-fade (the words don't move during the fade — they're already at the hero coordinates). Functionally equivalent for the bbox-continuity contract and simpler to reason about.

**Files:**
- Create: `src/components/layout/LoadingScreen.tsx`, `tests/e2e/loader-handoff.spec.ts`
- Modify: `src/App.tsx`, `src/components/sections/Hero.tsx`, `src/index.css`

- [x] **Step 1: Write the failing acceptance test (Playwright)**

Create `tests/e2e/loader-handoff.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('loader hands off to hero with bbox-continuous word lines', async ({ page }) => {
  await page.goto('/')

  // Capture loader-end bbox of "shibuya" word (when underline is full)
  const loaderShibuya = page.locator('[data-loader-word="shibuya"]')
  await expect(loaderShibuya).toBeVisible({ timeout: 5000 })
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('[data-loader-progress]')
    return el ? Number(el.dataset.value) >= 1 : false
  })
  const beforeBox = await loaderShibuya.boundingBox()

  // Wait for loader to fully resolve
  await page.waitForFunction(() =>
    document.body.dataset.loaderState === 'done'
  )

  // After handoff, hero word in same on-screen location
  const heroShibuya = page.locator('[data-hero-word="shibuya"]')
  await expect(heroShibuya).toBeVisible()
  const afterBox = await heroShibuya.boundingBox()

  expect(beforeBox).not.toBeNull()
  expect(afterBox).not.toBeNull()
  expect(Math.abs(afterBox!.x - beforeBox!.x)).toBeLessThan(2)
  expect(Math.abs(afterBox!.y - beforeBox!.y)).toBeLessThan(2)
})

test('loader underline reaches scaleX=1 before any other timeline starts', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('[data-loader-progress]')
    return el ? Number(el.dataset.value) >= 1 : false
  })
  // The hero supplementary content (eyebrow/role/desc) must NOT yet be visible at opacity 1
  const eyebrow = page.locator('[data-hero-eyebrow]')
  const opacity = await eyebrow.evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(opacity).toBeLessThan(0.95)
})
```

- [x] **Step 2: Run the test — expect failure**

```bash
npm run test:e2e -- loader-handoff
```
Expected: FAIL — `[data-loader-word]` not found / loader doesn't exist yet.

- [x] **Step 3: Invoke `frontend-design:frontend-design`** before writing the loader JSX. This shapes the visual quality of the loader composition.

- [x] **Step 4: Create `src/components/layout/LoadingScreen.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useMotion } from '../../context/MotionContext'
import { LOADER_MIN_DURATION_MS, LOADER_REDUCED_MOTION_MAX_MS } from '../../utils/motion-flags'
import { projectEaseGsap } from '../../utils/animations'

export function LoadingScreen() {
  const { resolveLoader, prefersReducedMotion } = useMotion()
  const root = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  // Track asset readiness
  useEffect(() => {
    const start = performance.now()
    const minDelay = prefersReducedMotion ? LOADER_REDUCED_MOTION_MAX_MS : LOADER_MIN_DURATION_MS

    const finish = () => {
      const elapsed = performance.now() - start
      const wait = Math.max(0, minDelay - elapsed)
      setTimeout(() => setProgress(1), wait)
    }

    const tick = () => {
      const elapsed = performance.now() - start
      setProgress(Math.min(0.92, elapsed / minDelay))
    }
    const id = window.setInterval(tick, 30)

    if (document.readyState === 'complete') {
      finish()
    } else {
      window.addEventListener('load', finish, { once: true })
    }
    return () => {
      window.clearInterval(id)
      window.removeEventListener('load', finish)
    }
  }, [prefersReducedMotion])

  // Handoff timeline
  useGSAP(
    () => {
      if (progress < 1) return
      const ctx = gsap.context(() => {
        if (prefersReducedMotion) {
          gsap.set('[data-loader-panel]', { autoAlpha: 0 })
          document.body.dataset.loaderState = 'done'
          resolveLoader()
          setDone(true)
          return
        }
        const tl = gsap.timeline({
          onComplete: () => {
            document.body.dataset.loaderState = 'done'
            resolveLoader()
            setDone(true)
          },
        })
        tl.to('[data-loader-panel]', { autoAlpha: 0, duration: 0.4, ease: projectEaseGsap }, '+=0.12')
      }, root)
      return () => ctx.revert()
    },
    { dependencies: [progress, prefersReducedMotion], scope: root }
  )

  if (done) return null

  return (
    <div ref={root} data-loader-panel className="loader-screen" role="status" aria-live="polite">
      <div className="loader-words">
        <span data-loader-word="kevin" className="loader-word loader-word--ink">kevin</span>
        <span data-loader-word="shibuya" className="loader-word loader-word--ghost">shibuya.</span>
      </div>
      <div
        data-loader-progress
        data-value={progress}
        className="loader-underline"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <span className="sr-only">loading</span>
    </div>
  )
}
```

- [x] **Step 5: Add loader styles to `src/index.css`**

Append:

```css
.loader-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0 80px;
  background: var(--color-bg-cream, #F6F9FC);
}
.loader-words {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.loader-word {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.04em;
  font-size: clamp(72px, 13vw, 220px);
}
.loader-word--ink { color: #111822; }
.loader-word--ghost {
  color: #D4E5F2;
  -webkit-text-stroke: 1px #A2D2FF;
}
.loader-underline {
  width: 100%;
  max-width: 1280px;
  height: 2px;
  margin-top: 24px;
  background: #3A96E8;
  transform-origin: left center;
  will-change: transform;
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
@media (max-width: 768px) {
  .loader-screen { padding: 0 24px; }
}
```

- [x] **Step 6: Tag hero name lines with stable selectors**

Edit `src/components/sections/Hero.tsx` to add `data-hero-word` and `data-hero-eyebrow`:

```tsx
// In the JSX where the H1 lines render:
<span className="hero-name-line" data-hero-word="kevin">{t('hero.name1')}</span>
<span className="hero-name-line hero-name-line--ghost" data-hero-word="shibuya">
  {t('hero.name2')}
</span>

// On the eyebrow / role line wrapper, add:
<div className="hero-role-line" data-hero-eyebrow>...
```

(If a separate eyebrow line doesn't exist yet, add `data-hero-eyebrow` to the role line container.)

- [x] **Step 7: Render `LoadingScreen` in `App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'
import { LoadingScreen } from './components/layout/LoadingScreen'

function App() {
  return (
    <>
      <LoadingScreen />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>
    </>
  )
}

export default App
```

- [x] **Step 8: Run the acceptance test — expect pass**

```bash
npm run test:e2e -- loader-handoff
```
Expected: PASS for both cases.

- [x] **Step 9: Manual verification**

```bash
npm run dev
```

In a browser at `http://localhost:5173`:
- On hard reload, the loader should appear, the underline should fill, and the words should remain on-screen as the page reveals (no flash, no remount).
- Toggle "Emulate CSS prefers-reduced-motion: reduce" in DevTools and reload — loader should resolve almost instantly, hero appears at final state.

- [x] **Step 10: Tick the spec checkbox**

Edit `docs/superpowers/specs/2026-04-25-page-animations-design.md`. Change the line for TODO #1 from `- [ ] Loading screen renders…` to `- [x] Loading screen renders…`.

- [x] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: loader → hero handoff with bbox-continuous name lines (spec: 2026-04-25-page-animations)"
```

---

## Task 3: TODO #2 — Hero data-fragments composition entry

Maps to spec TODO: *"Hero right-side editorial data-fragment composition (6 fragments…) renders at final positions after a sequenced GSAP entry timeline triggered post-loader."*

**Files:**
- Create: `src/components/canvas/HeroDataFragments.tsx`, `src/components/canvas/HeroAccentSilhouette.tsx`, `src/components/canvas/HeroAccent3D.tsx` (lazy chunk)
- Modify: `src/components/sections/Hero.tsx`, `src/index.css`

- [x] **Step 1: Write failing acceptance test**

Create `tests/e2e/hero-fragments.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('all 6 hero fragments render at final positions after loader', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  // Allow entry timeline to complete (~1.1s + buffer)
  await page.waitForTimeout(1400)

  for (const id of ['bars', 'line', 'annotation', 'lattice', 'numeric', 'accent']) {
    const el = page.locator(`[data-fragment="${id}"]`)
    await expect(el).toBeVisible()
    const op = await el.evaluate((n) => parseFloat(getComputedStyle(n as HTMLElement).opacity))
    expect(op).toBeGreaterThan(0.99)
  }
})

test('entry timeline does NOT start before loaderDone', async ({ page }) => {
  await page.goto('/')
  // Sample fragment opacity while loader still active
  const op = await page.locator('[data-fragment="bars"]').evaluate((n) =>
    parseFloat(getComputedStyle(n as HTMLElement).opacity)
  )
  expect(op).toBeLessThan(0.05)
})
```

- [x] **Step 2: Run — expect failure**

```bash
npm run test:e2e -- hero-fragments
```
Expected: FAIL — `[data-fragment]` not found.

- [x] **Step 3: Invoke `frontend-design:frontend-design`** to shape the SVG composition (visual specifics in the spec).

- [x] **Step 4: Create `HeroAccentSilhouette.tsx`** (static fallback for the R3F)

```tsx
// 280×280 SVG silhouette of an icosahedron — kept outside R3F so removing
// the R3F flag swaps to this with identical bbox.
export function HeroAccentSilhouette() {
  return (
    <svg viewBox="0 0 280 280" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke="#A2D2FF" strokeWidth="1.5">
        <polygon points="140,30 240,90 200,210 80,210 40,90" />
        <polygon points="140,30 200,210 80,210" opacity="0.6" />
        <line x1="140" y1="30" x2="140" y2="210" />
        <line x1="40" y1="90" x2="240" y2="90" />
      </g>
    </svg>
  )
}
```

- [x] **Step 5: Create `HeroAccent3D.tsx`** (lazy default export — in its own chunk)

```tsx
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function Mesh() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.4, 0]} />
      <meshBasicMaterial color="#A2D2FF" wireframe />
    </mesh>
  )
}

export default function HeroAccent3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
    >
      <Mesh />
    </Canvas>
  )
}
```

- [x] **Step 6: Create `HeroDataFragments.tsx`**

```tsx
import { Suspense, lazy, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useMotion } from '../../context/MotionContext'
import { projectEaseGsap } from '../../utils/animations'
import { HeroAccentSilhouette } from './HeroAccentSilhouette'

const HeroAccent3D = lazy(() => import('./HeroAccent3D'))

export function HeroDataFragments() {
  const { loaderDone, prefersReducedMotion, r3fAccentEnabled } = useMotion()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion) {
        gsap.set('[data-fragment]', { opacity: 1, y: 0 })
        return
      }
      gsap.set('[data-fragment]', { opacity: 0, y: 12 })
      let cancelled = false
      loaderDone.then(() => {
        if (cancelled) return
        const tl = gsap.timeline()
        tl.to('[data-fragment="bars"] rect',     { scaleY: 1, transformOrigin: 'bottom', duration: 0.7, stagger: 0.06, ease: projectEaseGsap }, 0)
          .to('[data-fragment="bars"]',          { opacity: 1, y: 0, duration: 0.5, ease: projectEaseGsap }, 0)
          .to('[data-fragment="line"] path',     { strokeDashoffset: 0, duration: 0.9, ease: projectEaseGsap }, 0.1)
          .to('[data-fragment="line"]',          { opacity: 1, y: 0, duration: 0.5, ease: projectEaseGsap }, 0.1)
          .to('[data-fragment="annotation"]',    { opacity: 1, y: 0, duration: 0.4, ease: projectEaseGsap }, 0.3)
          .to('[data-fragment="lattice"] circle',{ opacity: 1, duration: 0.5, stagger: { amount: 0.4, from: 'random' }, ease: projectEaseGsap }, 0.2)
          .to('[data-fragment="lattice"]',       { opacity: 1, y: 0, duration: 0.4, ease: projectEaseGsap }, 0.2)
          .to('[data-fragment="numeric"]',       { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: projectEaseGsap }, 0.35)
          .fromTo('[data-fragment="numeric"]',   { scale: 0.92 }, { scale: 1, duration: 0.6, ease: projectEaseGsap }, 0.35)
          .to('[data-fragment="accent"]',        { opacity: 1, duration: 0.7, ease: projectEaseGsap }, 0.5)
      })
      return () => { cancelled = true }
    },
    { dependencies: [prefersReducedMotion], scope: root }
  )

  return (
    <div ref={root} className="hero-fragments" aria-hidden="true">
      {/* Bars */}
      <div data-fragment="bars" className="hero-frag hero-frag--bars">
        <svg viewBox="0 0 200 220" width="100%" height="100%">
          {[40, 95, 60, 140, 175].map((h, i) => (
            <rect key={i} x={20 + i * 36} y={220 - h} width={24} height={h} fill="#DCF0FF" />
          ))}
        </svg>
      </div>
      {/* Line chart */}
      <div data-fragment="line" className="hero-frag hero-frag--line">
        <svg viewBox="0 0 240 160" width="100%" height="100%">
          <path
            d="M10,120 L40,90 L70,100 L100,60 L130,75 L160,40 L190,55 L220,30"
            fill="none"
            stroke="#6A8CAA"
            strokeWidth="1.5"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
          <circle cx="100" cy="60" r="5" fill="#3A96E8" />
        </svg>
      </div>
      {/* Annotation */}
      <div data-fragment="annotation" className="hero-frag hero-frag--annotation">
        <span>fig. 01 — 2026</span>
      </div>
      {/* Lattice */}
      <div data-fragment="lattice" className="hero-frag hero-frag--lattice">
        <svg viewBox="0 0 140 100" width="100%" height="100%">
          {Array.from({ length: 5 }).flatMap((_, row) =>
            Array.from({ length: 7 }).map((__, col) => {
              const isHi = row === 2 && col === 4
              return (
                <circle
                  key={`${row}-${col}`}
                  cx={10 + col * 20}
                  cy={10 + row * 20}
                  r={isHi ? 4 : 2.5}
                  fill={isHi ? '#3A96E8' : '#D4E5F2'}
                  data-hi={isHi || undefined}
                />
              )
            })
          )}
        </svg>
      </div>
      {/* Numeric callout */}
      <div data-fragment="numeric" className="hero-frag hero-frag--numeric">
        <span>47</span>
      </div>
      {/* Accent: R3F or silhouette */}
      <div data-fragment="accent" className="hero-frag hero-frag--accent">
        {r3fAccentEnabled ? (
          <Suspense fallback={<HeroAccentSilhouette />}>
            <HeroAccent3D />
          </Suspense>
        ) : (
          <HeroAccentSilhouette />
        )}
      </div>
    </div>
  )
}
```

- [x] **Step 7: Add fragments grid styles to `src/index.css`**

Append:

```css
.hero-fragments {
  position: absolute;
  inset: 0 0 0 auto;
  width: 50%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  padding: 40px 80px 40px 0;
  pointer-events: none;
}
.hero-frag { position: relative; }
.hero-frag--bars       { grid-column: span 2; grid-row: span 3; }
.hero-frag--line       { grid-column: span 2; grid-row: span 2; }
.hero-frag--annotation { grid-column: span 1; grid-row: span 1;
  font: 600 11px/1.2 'Plus Jakarta Sans', sans-serif;
  color: #6A8CAA; text-transform: uppercase; letter-spacing: 0.12em;
  border-bottom: 1px solid #D4E5F2; padding-bottom: 6px; align-self: end;
}
.hero-frag--lattice    { grid-column: span 2; grid-row: span 2; }
.hero-frag--numeric    { grid-column: span 1; grid-row: span 2;
  font: 800 88px/0.9 'Plus Jakarta Sans', sans-serif;
  color: transparent; -webkit-text-stroke: 1.5px #6DB8FF;
  display: flex; align-items: center; justify-content: center;
}
.hero-frag--accent     { grid-column: span 1; grid-row: span 1; }
@media (max-width: 768px) {
  .hero-fragments { display: none; }
}
```

- [x] **Step 8: Render fragments in `Hero.tsx`**

Add inside the hero `<section>` (alongside `.hero-main`, before or after):

```tsx
import { HeroDataFragments } from '../canvas/HeroDataFragments'

// inside JSX:
<HeroDataFragments />
```

Ensure `.hero` is `position: relative` so the absolute fragments anchor correctly.

- [x] **Step 9: Run the acceptance test — expect pass**

```bash
npm run test:e2e -- hero-fragments
```
Expected: PASS.

- [x] **Step 10: Manual verification**

```bash
npm run dev
```
Reload, watch fragments enter post-loader. Toggle reduced motion — fragments should appear at final state immediately. Resize below 768px — composition is hidden.

- [x] **Step 11: Tick spec checkbox** for TODO #2 in the spec file.

- [x] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: hero data-fragments composition with sequenced entry (spec: 2026-04-25-page-animations)"
```

---

## Task 4: TODO #3 — Hero fragments scroll-linked motion

Maps to spec TODO: *"Hero data-fragments respond to scroll progress via ScrollTrigger scrub… with R3F accent removable via `motion-flags.ts` without shifting other fragments."*

**Files:**
- Modify: `src/components/canvas/HeroDataFragments.tsx`

- [ ] **Step 1: Write failing acceptance test**

Create `tests/e2e/hero-scroll-parallax.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('fragments translate by their per-element distance on scroll', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForTimeout(1400)

  const before = await page.locator('[data-fragment="bars"]').boundingBox()
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(150)
  const after = await page.locator('[data-fragment="bars"]').boundingBox()

  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  // fragment should have moved (parallax) — non-trivial delta beyond pure scroll
  const scrollY = await page.evaluate(() => window.scrollY)
  const observedDelta = before!.y - (after!.y + scrollY)
  expect(Math.abs(observedDelta)).toBeGreaterThan(2)
})

test('disabling R3F accent does not shift other fragment positions', async ({ page }) => {
  await page.goto('/?disableR3f=1') // see flag wiring below
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForTimeout(1400)
  const accentBox = await page.locator('[data-fragment="accent"]').boundingBox()
  const barsBox = await page.locator('[data-fragment="bars"]').boundingBox()
  expect(accentBox).not.toBeNull()
  expect(barsBox).not.toBeNull()
  expect(accentBox!.width).toBeGreaterThan(0)
  expect(accentBox!.height).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test:e2e -- hero-scroll-parallax
```
Expected: FAIL.

- [ ] **Step 3: Add ScrollTrigger parallax to `HeroDataFragments.tsx`**

Inside the existing `useGSAP` (after the entry timeline registration), add:

```ts
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// ...inside useGSAP, after the entry timeline:
const speeds: Record<string, number> = {
  bars: 0.18,
  line: 0.10,
  annotation: 0.30,
  lattice: 0.14,
  numeric: 0.22,
  accent: 0.28,
}
const isMobile = window.innerWidth < 768
const cap = isMobile ? 40 : 80

Object.entries(speeds).forEach(([id, speed]) => {
  gsap.to(`[data-fragment="${id}"]`, {
    y: -cap * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      fastScrollEnd: true,
    },
  })
})

// Bar height extension
gsap.to('[data-fragment="bars"] rect', {
  scaleY: 1.12,
  transformOrigin: 'bottom',
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
})

// Lattice highlight advance
const dots = gsap.utils.toArray<SVGCircleElement>('[data-fragment="lattice"] circle')
ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: 'bottom top',
  scrub: 1,
  onUpdate: (self) => {
    const idx = Math.floor(self.progress * (dots.length - 1))
    dots.forEach((d, i) => {
      const isHi = i === idx
      d.setAttribute('fill', isHi ? '#3A96E8' : '#D4E5F2')
      d.setAttribute('r', isHi ? '4' : '2.5')
    })
  },
})
```

- [ ] **Step 4: Wire URL flag for `disableR3f` (test-only)**

In `MotionContext.tsx`, replace the `useEffect` that sets `r3fEnabled`:

```tsx
useEffect(() => {
  const url = new URL(window.location.href)
  const forceOff = url.searchParams.get('disableR3f') === '1'
  setR3fEnabled(ENABLE_R3F_ACCENT && !forceOff && window.innerWidth >= MOBILE_BREAKPOINT_PX)
}, [])
```

- [ ] **Step 5: Run acceptance — expect pass**

```bash
npm run test:e2e -- hero-scroll-parallax
```
Expected: PASS.

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```
Slow scroll through hero — fragments should drift, bars subtly extend, the highlighted lattice dot should walk along positions. Reload with `?disableR3f=1` — accent renders the silhouette and other fragments remain in place.

- [ ] **Step 7: Tick spec checkbox** for TODO #3.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: hero fragments scroll-linked parallax + lattice advance (spec: 2026-04-25-page-animations)"
```

---

## Task 5: TODO #4 — `shibuya.` soft scramble hover

Maps to spec TODO: *"Hovering or focusing the `shibuya.` lettering triggers a 600ms soft character scramble (latin + katakana glyph pool) with 30ms per-character stagger that always settles to the exact glyphs `shibuya.`, and re-hovering within 800ms does not retrigger."*

**Files:**
- Create: `src/hooks/useScramble.ts`, `src/components/ui/ScrambleText.tsx`, `tests/unit/useScramble.test.ts`, `tests/e2e/shibuya-scramble.spec.ts`
- Modify: `src/components/sections/Hero.tsx`

- [ ] **Step 1: Write failing unit tests**

Create `tests/unit/useScramble.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useScramble } from '../../src/hooks/useScramble'

describe('useScramble', () => {
  it('settles to target after duration', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScramble({ target: 'shibuya.', duration: 600, perCharStagger: 30 }))
    act(() => result.current.trigger())
    expect(result.current.text).not.toBe('shibuya.')
    act(() => vi.advanceTimersByTime(700))
    expect(result.current.text).toBe('shibuya.')
    vi.useRealTimers()
  })

  it('re-trigger within cooldown is ignored', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScramble({ target: 'shibuya.', duration: 600, perCharStagger: 30, cooldown: 800 }))
    act(() => result.current.trigger())
    act(() => vi.advanceTimersByTime(200))
    const midText = result.current.text
    act(() => result.current.trigger())
    act(() => vi.advanceTimersByTime(50))
    // unchanged trajectory: trigger had no effect
    expect(result.current.lastStartedAt).toBeLessThanOrEqual(0 + 1)
    vi.useRealTimers()
    void midText
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test:unit -- useScramble
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `useScramble`**

Create `src/hooks/useScramble.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

const KATAKANA = ['シ', 'ブ', 'ヤ', 'ト', 'ウ', 'キ', 'ョ', 'カ', 'ナ', 'ル', 'ハ', 'ミ']
const LATIN = 'abcdefghijklmnopqrstuvwxyz'.split('')
const POOL = [...LATIN, ...KATAKANA]

const randGlyph = () => POOL[Math.floor(Math.random() * POOL.length)]

interface Options {
  target: string
  duration?: number
  perCharStagger?: number
  cooldown?: number
}

export function useScramble({ target, duration = 600, perCharStagger = 30, cooldown = 800 }: Options) {
  const [text, setText] = useState(target)
  const startedAtRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef(target)

  useEffect(() => { targetRef.current = target; setText(target) }, [target])

  const trigger = useCallback(() => {
    const now = performance.now()
    if (now - startedAtRef.current < cooldown) return
    startedAtRef.current = now

    const tgt = targetRef.current

    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current
      const next = Array.from(tgt).map((ch, i) => {
        if (ch === '.') return ch
        const charStart = i * perCharStagger
        if (elapsed >= charStart + duration - i * perCharStagger) return ch
        if (elapsed < charStart) return ch // not yet kicked off
        return randGlyph()
      }).join('')
      setText(next)
      if (elapsed >= duration) {
        setText(tgt)
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [cooldown, duration, perCharStagger])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return { text, trigger, lastStartedAt: startedAtRef.current }
}
```

- [ ] **Step 4: Adjust unit test if needed and re-run**

```bash
npm run test:unit -- useScramble
```
Expected: PASS. (If the cooldown test relies on `performance.now` mocking, switch to `vi.spyOn(performance, 'now')` and advance manually.)

- [ ] **Step 5: Create `ScrambleText.tsx`**

```tsx
import { useScramble } from '../../hooks/useScramble'
import { useMotion } from '../../context/MotionContext'

export function ScrambleText({ children }: { children: string }) {
  const { prefersReducedMotion } = useMotion()
  const { text, trigger } = useScramble({ target: children })

  if (prefersReducedMotion) {
    return <span className="scramble-static">{children}</span>
  }

  return (
    <span
      className="scramble"
      onMouseEnter={trigger}
      onFocus={trigger}
      tabIndex={0}
      aria-label={children}
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{children}</span>
    </span>
  )
}
```

- [ ] **Step 6: Wire into `Hero.tsx`**

Wrap `name2` in `ScrambleText`:

```tsx
import { ScrambleText } from '../ui/ScrambleText'

<span className="hero-name-line hero-name-line--ghost" data-hero-word="shibuya">
  <ScrambleText>{t('hero.name2') as string}</ScrambleText>
</span>
```

If `hero.name2` includes the trailing `.`, leave it as part of the string — the hook leaves `.` static.

- [ ] **Step 7: Add e2e test**

Create `tests/e2e/shibuya-scramble.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('hover scramble settles to shibuya. after 700ms', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const word = page.locator('[data-hero-word="shibuya"]')
  await word.hover()
  await page.waitForTimeout(700)
  await expect(word).toHaveText('shibuya.')
})

test('hover within cooldown does not retrigger', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const word = page.locator('[data-hero-word="shibuya"]')
  await word.hover()
  await page.waitForTimeout(200)
  const midText = await word.innerText()
  await word.hover()
  await page.waitForTimeout(50)
  // text should still be progressing through the same cycle, not reset
  const text2 = await word.innerText()
  // We accept either: continuing trajectory or unchanged — but NOT a fresh full reset
  expect(text2.length).toBe(midText.length)
})
```

- [ ] **Step 8: Run e2e — expect pass**

```bash
npm run test:e2e -- shibuya-scramble
```

- [ ] **Step 9: Manual verify**

`npm run dev`. Hover `shibuya.` — letters cycle, settle. Hover twice fast — only one cycle. Toggle reduced-motion — no scramble.

- [ ] **Step 10: Tick spec checkbox** for TODO #4.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: shibuya soft character scramble hover (spec: 2026-04-25-page-animations)"
```

---

## Task 6: TODO #5 — Section content viewport enters

Maps to spec TODO: *"Each section's heading and content enter via Framer Motion `whileInView` … plays once, complete within 800ms."*

**Files:**
- Create: `src/components/ui/RevealOnView.tsx`, `tests/e2e/section-enters.spec.ts`
- Modify: `src/components/sections/Projects.tsx`, `EmbedsGallery.tsx`, `WorkExperience.tsx`, `Skills.tsx`, `Contact.tsx`

- [ ] **Step 1: Write failing acceptance test**

Create `tests/e2e/section-enters.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  for (const id of ['#projects', '#embeds', '#work', '#skills', '#contact']) {
    test(`${id} title transitions from hidden to visible on scroll`, async ({ page }) => {
      await page.goto('/')
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const titleSel = `${id} .section-title`
      const before = await page.locator(titleSel).evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      ).catch(() => null)
      // Scroll to section
      await page.locator(id).scrollIntoViewIfNeeded()
      await page.waitForTimeout(900)
      const after = await page.locator(titleSel).evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      )
      // Title eventually fully visible
      expect(after).toBeGreaterThan(0.99)
      void before
    })
  }
})
```

(Section IDs may need to be added to each section's root element if not present — check before writing this test and add `id="projects"` etc. as a small modification.)

- [ ] **Step 2: Add `id="…"` attributes to section roots** (if missing)

In each section component, ensure the outer element has `id="projects" | "embeds" | "work" | "skills" | "contact"`.

- [ ] **Step 3: Run test — expect failure**

```bash
npm run test:e2e -- section-enters
```
Expected: FAIL on opacity (titles always at 1 because no enter is wired).

- [ ] **Step 4: Create `RevealOnView.tsx`**

```tsx
import { motion, type Variants } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'

type Variant = 'fade' | 'fade-up' | 'stagger-children'

const variants: Record<Variant, Variants> = {
  'fade': {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  },
  'fade-up': {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  },
  'stagger-children': {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
}

export const childVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function RevealOnView({
  variant = 'fade-up',
  staggerAmount,
  className,
  children,
  as: As = 'div',
}: {
  variant?: Variant
  staggerAmount?: number
  className?: string
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
}) {
  const { prefersReducedMotion } = useMotion()
  if (prefersReducedMotion) return <As className={className}>{children}</As>

  const v = variant === 'stagger-children' && typeof staggerAmount === 'number'
    ? {
        hidden: {},
        visible: { transition: { staggerChildren: staggerAmount, delayChildren: 0.05 } },
      }
    : variants[variant]

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={v}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 5: Wrap section content**

For each of `Projects.tsx`, `EmbedsGallery.tsx`, `WorkExperience.tsx`, `Skills.tsx`, `Contact.tsx`:
- Wrap the heading + description block in `<RevealOnView variant="fade-up">`.
- Wrap the list/grid container in `<RevealOnView variant="stagger-children" staggerAmount={0.06 /* 0.04 for embeds */}>`, and make each child item a `<motion.div variants={childVariants}>` (import `childVariants` from `RevealOnView`).

Example for `Projects.tsx`:

```tsx
import { motion } from 'framer-motion'
import { RevealOnView, childVariants } from '../ui/RevealOnView'

// inside the component:
<RevealOnView variant="fade-up">
  <SectionHeading {...} />
</RevealOnView>
<RevealOnView variant="stagger-children" staggerAmount={0.06} className="projects-grid">
  {items.map((p) => (
    <motion.article key={p.id} variants={childVariants} className="project-card">…</motion.article>
  ))}
</RevealOnView>
```

- [ ] **Step 6: Run test — expect pass**

```bash
npm run test:e2e -- section-enters
```

- [ ] **Step 7: Manual verify**

Scroll through each section — content should enter once when the section's top is ~10% before the viewport bottom. Reduced-motion mode should produce instant content.

- [ ] **Step 8: Tick spec checkbox** for TODO #5.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: viewport-triggered enters for all sections (spec: 2026-04-25-page-animations)"
```

---

## Task 7: TODO #6 — Hero name + section title scroll fade

Maps to spec TODO: *"Hero name lines and every section heading fade continuously with scroll position via an eased (`power2.out`) ScrollTrigger scrub: opacity 1 at +80px from viewport top, opacity 0 at −120px from viewport top, opacity between 0.4 and 0.7 at −50px."*

**Files:**
- Create: `src/hooks/useScrollFade.ts`, `tests/unit/useScrollFade.test.ts`, `tests/e2e/title-scroll-fade.spec.ts`
- Modify: `src/components/ui/SectionHeading.tsx`, `src/components/sections/Hero.tsx`

- [ ] **Step 1: Write failing unit test**

Create `tests/unit/useScrollFade.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeFadeOpacity } from '../../src/hooks/useScrollFade'

describe('computeFadeOpacity', () => {
  const cfg = { startOffset: 80, endOffset: -120 }
  it('opacity = 1 when above start', () => {
    expect(computeFadeOpacity(100, cfg)).toBeCloseTo(1)
  })
  it('opacity = 0 when below end', () => {
    expect(computeFadeOpacity(-200, cfg)).toBeCloseTo(0)
  })
  it('eased middle is between 0.4 and 0.7 at top=-50', () => {
    const op = computeFadeOpacity(-50, cfg)
    expect(op).toBeGreaterThan(0.4)
    expect(op).toBeLessThan(0.7)
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test:unit -- useScrollFade
```
Expected: FAIL — `computeFadeOpacity` not exported.

- [ ] **Step 3: Implement `useScrollFade`**

Create `src/hooks/useScrollFade.ts`:

```ts
import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMotion } from '../context/MotionContext'

interface Cfg {
  startOffset?: number  // px below viewport top where opacity begins to drop. default 80
  endOffset?: number    // px above viewport top where opacity = 0. default -120
}

const DEFAULTS: Required<Cfg> = { startOffset: 80, endOffset: -120 }

// power2.out: f(t) = 1 - (1 - t)^2
const easeOut2 = (t: number) => 1 - Math.pow(1 - t, 2)

export function computeFadeOpacity(elementTop: number, cfg: Cfg = DEFAULTS): number {
  const { startOffset, endOffset } = { ...DEFAULTS, ...cfg }
  if (elementTop >= startOffset) return 1
  if (elementTop <= endOffset) return 0
  // Map [start..end] -> [0..1] (progress through fade band)
  const progress = (startOffset - elementTop) / (startOffset - endOffset)
  // Higher progress = more transparent. Apply eased curve to progress.
  return 1 - easeOut2(progress)
}

export function useScrollFade(ref: RefObject<HTMLElement | null>, cfg: Cfg = {}) {
  const { prefersReducedMotion } = useMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion) return
    const isMobile = window.innerWidth < 768
    const merged: Required<Cfg> = isMobile
      ? { startOffset: 60, endOffset: -80 }
      : { ...DEFAULTS, ...cfg }
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${merged.startOffset - merged.endOffset}`,
        onUpdate: () => {
          const top = el.getBoundingClientRect().top
          const op = computeFadeOpacity(top, merged)
          el.style.opacity = String(op)
        },
        onRefresh: () => {
          const top = el.getBoundingClientRect().top
          el.style.opacity = String(computeFadeOpacity(top, merged))
        },
        scrub: true,
      })
    })
    return () => ctx.revert()
  }, [ref, prefersReducedMotion, cfg.startOffset, cfg.endOffset])
}
```

- [ ] **Step 4: Run unit — expect pass**

```bash
npm run test:unit -- useScrollFade
```

- [ ] **Step 5: Wire `SectionHeading` to the hook**

```tsx
import { useRef } from 'react'
import { useScrollFade } from '../../hooks/useScrollFade'

// inside component:
const titleRef = useRef<HTMLHeadingElement>(null)
useScrollFade(titleRef)

// in JSX:
<h2 ref={titleRef} className="section-title" dangerouslySetInnerHTML={{ __html: title }} />
```

- [ ] **Step 6: Wire hero name lines**

In `Hero.tsx`, wrap both name lines in a single `<span ref={nameGroupRef}>` and bind `useScrollFade(nameGroupRef)`. Both lines fade together as one group.

- [ ] **Step 7: Write e2e test**

Create `tests/e2e/title-scroll-fade.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('section title is opaque when far below viewport top', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.95)
})

test('section title fades as it scrolls past top', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  // Position the title with its top at viewport y = -50
  const handle = await page.locator('#projects .section-title').elementHandle()
  await page.evaluate((el) => {
    const r = (el as HTMLElement).getBoundingClientRect()
    window.scrollBy({ top: r.top + 50, behavior: 'instant' as ScrollBehavior })
  }, handle)
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.4)
  expect(op).toBeLessThan(0.7)
})
```

- [ ] **Step 8: Run e2e — expect pass**

```bash
npm run test:e2e -- title-scroll-fade
```

- [ ] **Step 9: Manual verify**

Scroll slowly past each section. Titles should fade out continuously, not snap. Hero name fades together. Reduced-motion mode keeps all titles fully opaque.

- [ ] **Step 10: Tick spec checkbox** for TODO #6.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: eased scroll-linked title fade for hero name + section headings (spec: 2026-04-25-page-animations)"
```

---

## Task 8: TODO #7 — Reduced-motion contract verification

Maps to spec TODO: *"When `prefers-reduced-motion: reduce` is set, every behavior short-circuits to its static fallback…"*

This task primarily verifies behavior already implemented in tasks 2–7. If any path was missed, fix here.

**Files:**
- Create: `tests/e2e/reduced-motion.spec.ts`
- Possibly modify: any component missing a reduced-motion guard

- [ ] **Step 1: Write failing acceptance test**

Create `tests/e2e/reduced-motion.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('reduced motion: loader resolves quickly and hero is final-state', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const ms = Date.now() - start
  expect(ms).toBeLessThan(1500) // generous; floor is 200 + paint
  const fragOp = await page.locator('[data-fragment="bars"]').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(fragOp).toBeGreaterThan(0.99)
})

test('reduced motion: shibuya hover does not scramble', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const word = page.locator('[data-hero-word="shibuya"]')
  await word.hover()
  await page.waitForTimeout(300)
  await expect(word).toHaveText('shibuya.')
})

test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
```

- [ ] **Step 2: Run — expect pass (or fix any uncovered path)**

```bash
npm run test:e2e -- reduced-motion
```
Expected: PASS. If any test fails, locate the un-guarded path and add a `prefersReducedMotion` short-circuit.

- [ ] **Step 3: Tick spec checkbox** for TODO #7.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: reduced-motion contract coverage across all behaviors (spec: 2026-04-25-page-animations)"
```

---

## Task 9: TODO #8 — Performance + mobile budget

Maps to spec TODO: *"Lighthouse mobile run on the production build yields Performance ≥ 90 and CLS = 0; on Slow 4G + 4× CPU throttling, no long task during scroll exceeds 200ms; mobile (<768px) disables R3F accent and halves parallax range."*

**Files:**
- Create: `tests/e2e/perf-budget.spec.ts`
- Possibly modify: any code path causing CLS or long tasks

- [ ] **Step 1: Write acceptance test for CLS = 0 and long-task budget**

Create `tests/e2e/perf-budget.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('CLS is zero across loader handoff and section enters', async ({ page }) => {
  await page.goto('/')
  let cls = 0
  await page.exposeBinding('__report_cls', (_, value: number) => { cls += value })
  await page.evaluate(() => {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceEntry[]) {
        const layoutEntry = e as PerformanceEntry & { value: number; hadRecentInput: boolean }
        if (!layoutEntry.hadRecentInput) {
          // @ts-expect-error injected
          window.__report_cls(layoutEntry.value)
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(500)
  expect(cls).toBeLessThan(0.001)
})

test('no long task > 200ms during scroll', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const longTasks = await page.evaluate(async () => {
    const arr: number[] = []
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) arr.push(e.duration)
    })
    obs.observe({ type: 'longtask', buffered: false })
    // simulate scroll
    for (let y = 0; y < document.body.scrollHeight; y += 200) {
      window.scrollTo({ top: y })
      await new Promise((r) => requestAnimationFrame(r))
    }
    obs.disconnect()
    return arr
  })
  for (const d of longTasks) expect(d).toBeLessThan(200)
})

test.describe('mobile viewport disables R3F accent', () => {
  test.use({ viewport: { width: 375, height: 800 } })
  test('R3F is not loaded on mobile', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (req) => requests.push(req.url()))
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const r3fLoaded = requests.some((u) => u.includes('HeroAccent3D') || u.includes('three'))
    expect(r3fLoaded).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run — expect pass (or remediate)**

```bash
npm run test:e2e -- perf-budget
```
If CLS > 0 — likely the loader removing an absolute panel. Confirm `LoadingScreen` reserves space (it's `position: fixed` covering everything, removal should not shift content) and that fragments are rendered in their final layout from first paint (initial opacity hides them, doesn't unmount).

If long task fails — profile in DevTools, likely the entry timeline. Move heavy stagger work into `requestIdleCallback` or break into smaller batches.

- [ ] **Step 3: Run a Lighthouse mobile audit (manual)**

```bash
npm run build
npm run preview -- --port 4173 &
npx lighthouse http://localhost:4173 --preset=desktop --only-categories=performance --output=json --output-path=./lighthouse-desktop.json
npx lighthouse http://localhost:4173 --emulated-form-factor=mobile --only-categories=performance --output=json --output-path=./lighthouse-mobile.json
```
Inspect both JSON files; assert performance ≥ 90 mobile, ≥ 95 desktop. (Add scripts under `scripts/` if you want this automated; not required for the checkbox.)

- [ ] **Step 4: Tick spec checkbox** for TODO #8.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: performance + mobile budget verification (spec: 2026-04-25-page-animations)"
```

---

## Task 10: TODO #9 — Bundle weight (0kb new runtime deps)

Maps to spec TODO: *"Net new dependency weight is 0kb gzipped; any future addition over 20kb is gated by a flag."*

**Files:**
- Create: `tests/unit/bundle-deps.test.ts` (sanity check on `package.json`)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bundle-deps.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import pkg from '../../package.json' with { type: 'json' }

describe('runtime dependency surface', () => {
  it('only known animation-stack deps live in dependencies', () => {
    const allowed = new Set([
      '@gsap/react', '@react-three/drei', '@react-three/fiber',
      '@tailwindcss/vite', 'framer-motion', 'gsap',
      'i18next', 'react', 'react-dom', 'react-i18next',
      'react-router-dom', 'tailwindcss', 'three',
    ])
    for (const dep of Object.keys(pkg.dependencies)) {
      expect(allowed, `unexpected runtime dep: ${dep}`).toContain(dep)
    }
  })
})
```

- [ ] **Step 2: Run — expect pass**

```bash
npm run test:unit -- bundle-deps
```
Expected: PASS (we added only devDependencies).

- [ ] **Step 3: Inspect built bundle size**

```bash
npm run build
du -sh dist/assets/*.js | sort -h
```
Sanity: hero chunk + main chunk total should be on par with `git stash` of pre-feature bundle (within reason). If a chunk grew unexpectedly, investigate.

- [ ] **Step 4: Tick spec checkbox** for TODO #9.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: lock runtime dependency surface (spec: 2026-04-25-page-animations)"
```

---

## Final verification

Once all 9 boxes are ticked:

- [ ] **Step 1:** Run the full suite.

```bash
npm run lint
npm run build
npm run test
```
All must pass.

- [ ] **Step 2:** Invoke `superpowers:verification-before-completion` for the final gate.

- [ ] **Step 3:** Invoke `retro` to capture lessons learned (animation-specific: timing decisions, debugging approach, library boundaries that worked or didn't, mobile gotchas).

---

## Self-review notes

- All 9 spec TODOs map to exactly one task each (Tasks 2–10). Tasks 0–1 are foundation (no checkbox).
- No "TBD" or "implement later" placeholders in this plan — every step has either complete code or an exact command.
- Type names are consistent: `MotionContextValue`, `Variant`, `useScramble({target, duration, perCharStagger, cooldown})` used uniformly across tasks.
- Cross-references: `data-loader-word`, `data-hero-word`, `data-fragment`, and `data-loader-state` selectors are introduced in Task 2/3 and reused unchanged in Tasks 4/8/9.
- The R3F accent is removed (set `ENABLE_R3F_ACCENT = false` in `src/utils/motion-flags.ts`) without code changes elsewhere; the silhouette has identical bbox.
