# Page Feel Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **After each step's command lands successfully, edit the corresponding `- [ ]` to `- [x]` in this plan file before proceeding to the next step.** When a task completes, also tick the matching `## TODO` box in the spec file (`docs/superpowers/specs/2026-05-02-page-feel-overhaul-design.md`).

**Goal:** Replace the current animation/scroll/typography/Hero feel with a cinematic spring-physics system, Lenis smooth scroll, refined type rhythm, and a decluttered Hero — delivering the polish the user described in the brainstorm.

**Architecture:** Pure Motion (framer-motion v12) with a small library of six spring-driven entry recipes. Lenis provides desktop smooth scroll, bypassed under reduced-motion. GSAP (and the GSAP-driven `useScrollFade` hook + `HeroDataFragments` component) is removed entirely. Hero collapses to four left-column elements + the rotating R3F accent on the right; the stats row relocates to a slim band between WorkExperience and Skills.

**Tech Stack:** React 19, TypeScript strict, Vite 6 + SWC, framer-motion v12, **lenis (new)**, react-three-fiber, react-i18next (with `<Trans>` for inline `<strong>` markup), TailwindCSS v4, vitest.

**Spec:** `docs/superpowers/specs/2026-05-02-page-feel-overhaul-design.md` (commits `d0eb91f` + `40e18b8`).

---

## Task ordering and parallelism

Tasks 1–9 (foundation + cleanup) **must run sequentially** — every later task depends on the new animation primitives, Lenis provider, and removed legacy.

Tasks 10–16 (per-section refactors) operate on **disjoint files** and are parallel-friendly — recommended for subagent-driven execution after foundation lands.

Task 17 (Stats + Home wiring) and Task 18 (final verification) run sequentially at the end.

```
[1] animations.ts ─→ [2] RevealOnView ─→ [3] Stagger ─→ [4] CSS ─→ [5] Lenis foundation
                                                                          ↓
                                                                    [6] anchor migration
                                                                          ↓
                                                            [7] useScrollFade call sites
                                                                          ↓
                                              [7.5] migrate LoadingScreen off GSAP
                                                                          ↓
                                              [8] delete useScrollFade + GSAP deps
                                                                          ↓
                                                          [9] delete HeroDataFragments
                                                                          ↓
              ┌─────────────────────────────┬───────────────┬────────────┬──────────────┬──────────┬─────────┐
              ↓                             ↓               ↓            ↓              ↓          ↓         ↓
       [10] Hero refactor      [11] WorkExp    [12] Skills   [13] Projects  [14] Embeds  [15] Contact  [16] Footer
              └─────────────────────────────┴───────────────┴────────────┴──────────────┴──────────┴─────────┘
                                                                          ↓
                                                                [17] Stats + Home insertion
                                                                          ↓
                                                                [18] verification pass
```

---

## Task 1: Rewrite the animation primitives module

**Files:**
- Modify (rewrite): `src/utils/animations.ts`
- Create: `tests/unit/animations.test.ts`

This module currently exports GSAP-coupled `durations`, `stagger`, `sectionEnterDefaults`, plus the `cubic-bezier` ease string. After this task it exports the spring presets, the six recipes as Framer `Variants`, the stagger presets, and the `staggerContainer()` factory — all GSAP imports gone.

- [x] **Step 1: Write the failing test**

```ts
// tests/unit/animations.test.ts
import { describe, it, expect } from 'vitest'
import {
  SPRINGS,
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  type RecipeName,
} from '../../src/utils/animations'

describe('SPRINGS', () => {
  it('exposes gentle, snappy, soft with type:spring', () => {
    for (const key of ['gentle', 'snappy', 'soft'] as const) {
      expect(SPRINGS[key].type).toBe('spring')
      expect(typeof SPRINGS[key].stiffness).toBe('number')
      expect(typeof SPRINGS[key].damping).toBe('number')
      expect(typeof SPRINGS[key].mass).toBe('number')
    }
  })
})

describe('VARIANTS', () => {
  const recipes: RecipeName[] = [
    'fadeUp', 'scaleIn', 'stampIn', 'cardReveal', 'slideInLeft', 'slideInRight',
  ]
  for (const r of recipes) {
    it(`${r} has hidden + visible states`, () => {
      const v = VARIANTS[r]
      expect(v.hidden).toBeDefined()
      expect(v.visible).toBeDefined()
    })
  }

  it('fadeUp goes from y +40 to y 0', () => {
    expect(VARIANTS.fadeUp.hidden).toMatchObject({ opacity: 0, y: 40 })
    expect(VARIANTS.fadeUp.visible).toMatchObject({ opacity: 1, y: 0 })
  })

  it('stampIn includes a blur filter on hidden', () => {
    expect(VARIANTS.stampIn.hidden).toMatchObject({ opacity: 0, scale: 1.15, filter: 'blur(2px)' })
    expect(VARIANTS.stampIn.visible).toMatchObject({ opacity: 1, scale: 1, filter: 'blur(0px)' })
  })

  it('slideInRight is a +32px x mirror of slideInLeft', () => {
    expect(VARIANTS.slideInLeft.hidden).toMatchObject({ x: -32 })
    expect(VARIANTS.slideInRight.hidden).toMatchObject({ x: 32 })
  })
})

describe('staggerContainer', () => {
  it('produces a parent variant whose visible.transition has the requested staggerChildren', () => {
    const v = staggerContainer(0.12, 0.08)
    expect(v.hidden).toEqual({})
    expect(v.visible).toMatchObject({
      transition: { staggerChildren: 0.12, delayChildren: 0.08 },
    })
  })

  it('defaults delayChildren to 0', () => {
    const v = staggerContainer(0.05)
    expect(v.visible).toMatchObject({
      transition: { staggerChildren: 0.05, delayChildren: 0 },
    })
  })
})

describe('STAGGER_PRESETS', () => {
  it('exposes named presets used by sections', () => {
    expect(STAGGER_PRESETS.workRows).toBeCloseTo(0.1)
    expect(STAGGER_PRESETS.skillsColumns).toBeCloseTo(0.12)
    expect(STAGGER_PRESETS.skillsItems).toBeCloseTo(0.06)
    expect(STAGGER_PRESETS.projectCards).toBeCloseTo(0.1)
    expect(STAGGER_PRESETS.embedRows).toBeCloseTo(0.05)
    expect(STAGGER_PRESETS.statValues).toBeCloseTo(0.12)
    expect(STAGGER_PRESETS.aboutPills).toBeCloseTo(0.08)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- animations`
Expected: FAIL — module currently exports `durations` / `stagger` / `sectionEnterDefaults`, not `SPRINGS` / `VARIANTS` / `STAGGER_PRESETS`.

- [x] **Step 3: Replace the entire contents of `src/utils/animations.ts` with:**

```ts
import type { Variants, Transition } from 'framer-motion'

// Spring presets (from hotmart-bunde reference). Tune in-place if visual feel needs adjustment.
export const SPRINGS = {
  gentle: { type: 'spring', stiffness: 100, damping: 20, mass: 1.0 },
  snappy: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
  soft:   { type: 'spring', stiffness: 80,  damping: 25, mass: 1.2 },
} as const satisfies Record<string, Transition>

export type SpringName = keyof typeof SPRINGS

// Recipe library — each is a Framer Variants object with hidden + visible states.
export const VARIANTS = {
  fadeUp: {
    hidden:  { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: SPRINGS.gentle },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: SPRINGS.snappy },
  },
  stampIn: {
    hidden:  { opacity: 0, scale: 1.15, filter: 'blur(2px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: SPRINGS.snappy },
  },
  cardReveal: {
    hidden:  { opacity: 0, y: 30, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: SPRINGS.soft },
  },
  slideInLeft: {
    hidden:  { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0, transition: SPRINGS.gentle },
  },
  slideInRight: {
    hidden:  { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0, transition: SPRINGS.gentle },
  },
} as const satisfies Record<string, Variants>

export type RecipeName = keyof typeof VARIANTS

// Stagger presets keyed by section role. Values in seconds.
export const STAGGER_PRESETS = {
  workRows: 0.1,
  skillsColumns: 0.12,
  skillsItems: 0.06,
  projectCards: 0.1,
  embedRows: 0.05,
  statValues: 0.12,
  aboutPills: 0.08,    // reserved for future use
  ctaPair: 0.08,
} as const

export function staggerContainer(stagger: number, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  }
}

// Reduced-motion fallback variant. RevealOnView and Stagger consume this when
// prefersReducedMotion is true — pure opacity, no transform, no blur.
export const REDUCED_MOTION_VARIANT: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- animations`
Expected: PASS — all describe blocks green.

- [x] **Step 5: Commit**

```bash
git add src/utils/animations.ts tests/unit/animations.test.ts
git commit -m "feat(animations): replace GSAP module with Motion spring recipes"
```

- [x] **Step 6: Tick spec checkbox**

Edit `docs/superpowers/specs/2026-05-02-page-feel-overhaul-design.md` and change the line `- [ ] src/utils/animations.ts rewritten…` to `- [x]`.

---

## Task 2: Extend RevealOnView with `recipe` and `delay` props

**Files:**
- Modify: `src/components/ui/RevealOnView.tsx`

The existing component supports three legacy variants (`fade`, `fade-up`, `stagger-children`). Replace them with the new recipe vocabulary while keeping default behavior reasonable for any unmigrated call sites: when no `recipe` is supplied, default to `fadeUp`. The legacy names get an internal alias so accidentally-unmigrated usages still render something sensible. Also accept a `delay` prop (seconds) that gets injected into the visible transition.

- [x] **Step 1: Replace the file contents with:**

```tsx
import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  VARIANTS,
  REDUCED_MOTION_VARIANT,
  type RecipeName,
} from '../../utils/animations'

// Legacy string aliases so any not-yet-migrated call sites still render.
// Removed in Task 16's cleanup once every consumer uses RecipeName directly.
const LEGACY_ALIASES: Record<string, RecipeName> = {
  'fade': 'fadeUp',
  'fade-up': 'fadeUp',
  'stagger-children': 'fadeUp',  // legacy stagger now handled by <Stagger>
}

interface RevealOnViewProps {
  recipe?: RecipeName | keyof typeof LEGACY_ALIASES
  /** Backwards-compat alias for `recipe`. Removed after Task 16. */
  variant?: keyof typeof LEGACY_ALIASES
  /** Backwards-compat — silently ignored. Stagger now lives in <Stagger>. Removed after Task 16. */
  staggerAmount?: number
  delay?: number          // seconds added to the visible transition delay
  className?: string
  children: React.ReactNode
  /** Override the default viewport-amount (0.2). Use 0.0 when an element is
   *  taller than the viewport and would otherwise never trigger. */
  amount?: number
}

function resolveRecipe(input: RevealOnViewProps['recipe' | 'variant']): RecipeName {
  if (!input) return 'fadeUp'
  if (input in LEGACY_ALIASES) return LEGACY_ALIASES[input as keyof typeof LEGACY_ALIASES]
  return input as RecipeName
}

export function RevealOnView({
  recipe,
  variant,
  staggerAmount: _staggerAmount,
  delay = 0,
  className,
  children,
  amount = 0.2,
}: RevealOnViewProps) {
  const { prefersReducedMotion } = useMotion()

  if (prefersReducedMotion) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount }}
        variants={REDUCED_MOTION_VARIANT}
      >
        {children}
      </motion.div>
    )
  }

  const recipeName = resolveRecipe(recipe ?? variant)
  const base = VARIANTS[recipeName]

  // If a delay was requested, splice it into the visible variant's transition
  // without mutating the shared VARIANTS object.
  const variants: Variants = delay
    ? {
        hidden: base.hidden,
        visible: {
          ...(base.visible as object),
          transition: {
            ...((base.visible as { transition?: object }).transition ?? {}),
            delay,
          },
        },
      }
    : base

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}
```

- [x] **Step 2: Verify the build still passes**

Run: `npm run build`
Expected: PASS — no TS errors. The legacy `variant` and `staggerAmount` props are kept as backwards-compat shims so existing call sites continue to type-check. They will be removed in Task 16's cleanup after every section refactor lands.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/RevealOnView.tsx
git commit -m "feat(reveal): switch RevealOnView to new recipe vocabulary"
```

- [x] **Step 4: Tick spec checkbox**

Tick `- [ ] RevealOnView accepts recipe and delay props…` in the spec.

---

## Task 3: Create the `<Stagger>` wrapper component

**Files:**
- Create: `src/components/ui/Stagger.tsx`

A small parent wrapper that emits `staggerContainer(stagger, delayChildren)` as its variants and renders Motion-aware children. Each child is wrapped in a `<motion.div>` that consumes the parent's stagger via `variants={VARIANTS[childRecipe]}`. Avoids reinventing the variant wiring at every list-rendering site.

- [x] **Step 1: Create `src/components/ui/Stagger.tsx`:**

```tsx
import React from 'react'
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  VARIANTS,
  REDUCED_MOTION_VARIANT,
  staggerContainer,
  type RecipeName,
} from '../../utils/animations'

interface StaggerProps {
  /** Recipe applied to each direct child */
  recipe: RecipeName
  /** Stagger delay between children, seconds */
  stagger: number
  /** Delay before the first child fires, seconds */
  delayChildren?: number
  amount?: number
  className?: string
  children: React.ReactNode
}

export function Stagger({
  recipe,
  stagger,
  delayChildren = 0,
  amount = 0.2,
  className,
  children,
}: StaggerProps) {
  const { prefersReducedMotion } = useMotion()

  // Reduced motion: no stagger, no transform — children just opacity-fade in unison.
  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(stagger, delayChildren)
  const childVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS[recipe]

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={parentVariants}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return <motion.div variants={childVariants}>{child}</motion.div>
      })}
    </motion.div>
  )
}
```

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/Stagger.tsx
git commit -m "feat(stagger): add Stagger wrapper for list-style reveals"
```

- [x] **Step 4: Tick spec checkbox**

Tick `- [ ] New <Stagger> component implemented…` in the spec.

---

## Task 4: CSS — type ramp + spacing utility + global `<strong>` style

**Files:**
- Modify: `src/index.css`

Apply every typographic change from spec §4. Add the new `.section-spacing-content` utility (96px gap between heading and content) and the global `strong` rule.

- [x] **Step 1: Apply the type ramp updates**

Open `src/index.css`. For each rule below, locate the existing selector (line numbers from the spec's exploration; expect drift) and update the value:

| Selector | Property | New value |
|---|---|---|
| `.hero-name` | `font-size` | `clamp(64px, 11vw, 192px)` |
| `.hero-name` | `line-height` | `0.92` |
| `.hero-role-prefix` | `font-size` | `clamp(22px, 2.4vw, 36px)` |
| `.hero-role` | `font-size` | `clamp(24px, 2.6vw, 40px)` |
| `.hero-desc` | `line-height` | `1.75` |
| (any `.section-desc` or equivalent) | `line-height` | `1.7` |
| `.btn` | `font-size` | `13px` |
| `.btn` | `padding` | `16px 28px` |
| `.hero-stat-v` (will be relocated; rule stays in CSS) | `font-size` | `40px` |
| `.hero-stat-v` | `font-weight` | `700` |

If a class name above doesn't exist verbatim, search for the equivalent by visual purpose — don't invent new ones. The existing CSS uses kebab-case classnames matching the JSX in `src/components/sections/Hero.tsx`.

- [x] **Step 2: Add the `.section-spacing-content` utility**

Append (somewhere in `src/index.css`, near the other section/layout utilities):

```css
/* Replaces ad-hoc 64px gaps between section heading and body content. */
.section-spacing-content {
  margin-top: 96px;
}
```

- [x] **Step 3: Add the global `strong` rule**

Append (near the other typography base rules):

```css
/* Body-copy emphasis. Distinct from <em>, which renders as italic blue-400. */
strong {
  font-weight: 600;
  color: var(--color-ink, #111822);
  font-style: normal;
}
```

If the codebase uses `@theme` color tokens instead of CSS variables, replace `var(--color-ink, #111822)` with the project's existing ink reference (e.g. `theme(colors.ink)` or whatever pattern other rules use).

- [x] **Step 4: Add Hero left-column gap utilities**

Append:

```css
/* Hero left column inter-element gaps (spec §1) */
.hero-main { display: flex; flex-direction: column; }
.hero-main .hero-name + .hero-supplementary { margin-top: 48px; }
.hero-supplementary .hero-role-line + .hero-desc { margin-top: 32px; }
.hero-supplementary .hero-desc + .hero-cta { margin-top: 48px; }
```

If `.hero-main` already declares `display: flex`, leave that line out. The `+`-selector rules are additive and will cleanly slot above existing tighter defaults.

- [x] **Step 5: Verify the dev server still loads**

Run: `npm run dev` (background OK)
Expected: dev server boots; visit `localhost:5173`, confirm hero is still visually intact (just larger gaps and slightly smaller name) and no CSS console errors.

- [x] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat(css): type ramp tightening + spacing rhythm + global strong style"
```

- [x] **Step 7: Tick spec checkboxes**

Tick `- [ ] Type ramp updates applied in index.css…`, `- [ ] New heading→content 96px spacing utility applied…`, and `- [ ] Global strong style added to index.css…` in the spec.

---

## Task 5: Lenis foundation — install + provider + hook + App.tsx wrap

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/components/layout/SmoothScroll.tsx`
- Create: `src/hooks/useLenis.ts`
- Modify: `src/App.tsx`

- [x] **Step 1: Install lenis**

```bash
npm install lenis
```

Expected output: lenis added to dependencies. Confirm with:

```bash
node -e "console.log(require('./package.json').dependencies.lenis)"
```

Expected: a version string like `^1.x.y`.

- [x] **Step 2: Create the Lenis context + provider**

Create `src/components/layout/SmoothScroll.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useMotion } from '../../context/MotionContext'

const LenisCtx = createContext<Lenis | null>(null)

export function useLenisContext(): Lenis | null {
  return useContext(LenisCtx)
}

interface SmoothScrollProps {
  children: React.ReactNode
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const { prefersReducedMotion } = useMotion()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      lenisRef.current = null
      return
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      // smoothTouch is a Lenis option in some versions; if your installed
      // version doesn't accept it, the touch path defaults to native momentum.
      // @ts-expect-error - present at runtime, may not be in the type defs
      smoothTouch: false,
    })
    lenisRef.current = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [prefersReducedMotion])

  return <LenisCtx.Provider value={lenisRef.current}>{children}</LenisCtx.Provider>
}
```

- [x] **Step 3: Create the `useLenis` hook**

Create `src/hooks/useLenis.ts`:

```ts
import { useCallback } from 'react'
import { useLenisContext } from '../components/layout/SmoothScroll'

interface ScrollOpts {
  /** Lenis tween duration in seconds (default 1.2). */
  duration?: number
  /** Pixel offset from the target's top (e.g. -80 to leave header room). */
  offset?: number
}

export function useLenis(): {
  scrollTo: (target: string | HTMLElement, opts?: ScrollOpts) => void
} {
  const lenis = useLenisContext()

  const scrollTo = useCallback(
    (target: string | HTMLElement, opts: ScrollOpts = {}) => {
      const { duration = 1.2, offset = 0 } = opts

      if (lenis) {
        lenis.scrollTo(target, { duration, offset })
        return
      }

      // Fallback: reduced-motion or pre-mount path. Use native scroll.
      const el = typeof target === 'string'
        ? document.querySelector(target) as HTMLElement | null
        : target
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY + offset
      window.scrollTo({ top, behavior: 'auto' })
    },
    [lenis]
  )

  return { scrollTo }
}
```

- [x] **Step 4: Wrap App in `<SmoothScroll>`**

Edit `src/App.tsx`. Wrap the `<Routes>` element (everything below the `Header`) inside `<SmoothScroll>`:

```tsx
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'
import { LoadingScreen } from './components/layout/LoadingScreen'
import { SmoothScroll } from './components/layout/SmoothScroll'

function App() {
  return (
    <>
      <LoadingScreen />
      <Header />
      <SmoothScroll>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
        </Routes>
      </SmoothScroll>
    </>
  )
}

export default App
```

- [x] **Step 5: Smoke-test in the dev server**

Run (background OK): `npm run dev`
Open `localhost:5173` and scroll with the mouse wheel. Expected: scroll feels noticeably smoothed (interpolated easing on each wheel tick). No console errors. Touch devices (or Chrome DevTools mobile emulation) should fall back to native momentum.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/layout/SmoothScroll.tsx src/hooks/useLenis.ts src/App.tsx
git commit -m "feat(scroll): add Lenis-based SmoothScroll provider + useLenis hook"
```

- [x] **Step 7: Tick spec checkboxes**

Tick both `- [ ] SmoothScroll provider implemented…` and `- [ ] useLenis() hook implemented…` in the spec.

---

## Task 6: Migrate anchor handlers to `lenis.scrollTo`

**Files:**
- Modify: `src/components/sections/Hero.tsx` (only the `go()` handler — the larger Hero refactor lives in Task 10)
- Modify: `src/components/layout/Header.tsx` (and any nav-link component it imports)

The current `go()` in `Hero.tsx:59-64` calls `target.scrollIntoView({ behavior: 'smooth' })`. Replace with `lenis.scrollTo`. Same for any anchor handler in `Header.tsx`.

- [x] **Step 1: Update Hero's anchor handler**

Open `src/components/sections/Hero.tsx`. At the top, add (alongside other hook imports):

```tsx
import { useLenis } from '../../hooks/useLenis'
```

Inside the `Hero()` function, after the existing `useMotion()` line, add:

```tsx
const { scrollTo } = useLenis()
```

Replace the `go()` function:

```tsx
const go = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  scrollTo(`#${id}`, { duration: 1.2 })
}
```

- [x] **Step 2: Update Header anchor links**

Open `src/components/layout/Header.tsx`. Locate every place where a nav anchor calls `scrollIntoView` or sets `window.location.hash`. Replace with the `useLenis().scrollTo` pattern shown in Step 1. If the Header component doesn't currently use any smooth-scroll behavior on anchor clicks (i.e. the links are plain `href="#section"`), add an `onClick` handler that does:

```tsx
import { useLenis } from '../../hooks/useLenis'
// inside the component:
const { scrollTo } = useLenis()
const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  e.preventDefault()
  scrollTo(`#${id}`, { duration: 1.2 })
}
// each anchor: <a href={`#${id}`} onClick={(e) => handleAnchor(e, id)}>...</a>
```

- [x] **Step 3: Smoke-test anchor links**

Run (background OK): `npm run dev`
Click each of the nav links (work / interactives / experience / skills / contact) and the hero "collaborate" CTA. Expected: each click smooth-scrolls via Lenis to the correct section. No native scroll jump.

- [x] **Step 4: Commit**

```bash
git add src/components/sections/Hero.tsx src/components/layout/Header.tsx
git commit -m "feat(scroll): migrate anchor handlers to lenis.scrollTo"
```

(No spec checkbox tick — covered by the `useLenis()` checkbox already ticked in Task 5.)

---

## Task 7: Remove `useScrollFade` call sites

**Files:**
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/components/sections/Contact.tsx`
- Modify: `src/components/ui/SectionHeading.tsx`

The hook itself is deleted in Task 8. This task removes its usage from every consumer first so the deletion is safe.

- [x] **Step 1: Remove from Hero.tsx**

Edit `src/components/sections/Hero.tsx`:
- Delete the import line `import { useScrollFade } from '../../hooks/useScrollFade'`
- Delete the call `useScrollFade(nameRef)` (currently around line 26)
- The `nameRef` ref itself is still used by JSX, so keep `const nameRef = useRef<HTMLHeadingElement>(null)` and the `ref={nameRef}` on the `<h1>`

- [x] **Step 2: Remove from Contact.tsx**

Edit `src/components/sections/Contact.tsx`:
- Delete the import line `import { useScrollFade } from '../../hooks/useScrollFade'`
- Delete the call `useScrollFade(contactTitleRef)` (around line 22)
- Keep the `contactTitleRef` declaration and `ref` binding if other code uses them

- [x] **Step 3: Remove from SectionHeading.tsx**

Edit `src/components/ui/SectionHeading.tsx`:
- Delete the import line `import { useScrollFade } from '../../hooks/useScrollFade'`
- Delete the call `useScrollFade(titleRef)` (around line 20)
- Keep `titleRef` if it's bound to JSX

- [x] **Step 4: Verify no `useScrollFade` references remain in src/**

```bash
grep -rn "useScrollFade" src/
```

Expected: only the hook file itself (`src/hooks/useScrollFade.ts`) — no consumers.

- [x] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/components/sections/Hero.tsx src/components/sections/Contact.tsx src/components/ui/SectionHeading.tsx
git commit -m "chore(scrollfade): remove useScrollFade call sites (heading-fade dropped per spec §6)"
```

- [x] **Step 7: Tick spec checkbox**

Tick `- [ ] useScrollFade(...) calls removed from Hero.tsx, SectionHeading.tsx, and Contact.tsx…` in the spec.

---

## Task 7.5: Migrate LoadingScreen off GSAP

> **Why this task exists:** The original plan assumed `HeroDataFragments` was the only GSAP consumer. After Task 1, `LoadingScreen.tsx` was discovered to also use GSAP heavily (`useGSAP` + `gsap.timeline` + two `gsap.set` calls). A backwards-compat shim `projectEaseGsap = 'power3.out'` was added to `animations.ts` (commit `2780fe8`) to keep the build green during Tasks 2–7. This task migrates LoadingScreen so Task 8 can uninstall GSAP cleanly. See spec §6 item 5.

**Files:**
- Modify: `src/components/layout/LoadingScreen.tsx`

The current file uses GSAP for three things, all of which port to Motion / direct DOM:

1. **`gsap.set(wordsRef.current, { x: dx, y: dy })`** (line 51, runtime offset alignment) — replace with direct `wordsRef.current.style.transform = \`translate3d(${dx}px, ${dy}px, 0)\``.
2. **`gsap.set('[data-loader-panel]', { autoAlpha: 0 })`** (line 99, reduced-motion fast path) — `autoAlpha` = opacity + visibility. Replace with two direct mutations on the root ref: `el.style.opacity = '0'` and `el.style.visibility = 'hidden'`.
3. **`gsap.timeline().to('[data-loader-panel]', { autoAlpha: 0, duration: 0.4, ease: projectEaseGsap, delay: 0.12 })`** (lines 107–119, panel fade-out) — replace with Motion's `animate()` from `framer-motion`. The 0.12s delay + 0.4s tween + ease equivalent + `onComplete` callback all map directly. Set `visibility: hidden` in the `onComplete` to preserve the autoAlpha behavior.

The `useGSAP` hook + `import { gsap } from 'gsap'` + `import { useGSAP } from '@gsap/react'` + `import { projectEaseGsap } from '../../utils/animations'` are all removed. The replacement is a plain `useEffect` with a cleanup that cancels the in-flight `animate()` controller if the component unmounts mid-tween.

`power3.out` in GSAP ≈ cubic-bezier `[0.215, 0.61, 0.355, 1]`. Use that tuple as Motion's `ease`.

- [x] **Step 1: Apply the rewrite**

Replace the contents of `src/components/layout/LoadingScreen.tsx` with:

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { LOADER_MIN_DURATION_MS, LOADER_REDUCED_MOTION_MAX_MS } from '../../utils/motion-flags'

// power3.out approximation as a cubic-bezier tuple. Motion accepts both named
// eases and tuples; a tuple keeps the curve explicit and matches GSAP's
// power3.out shape ~1:1 across the 0.4s window.
const POWER3_OUT: [number, number, number, number] = [0.215, 0.61, 0.355, 1]

export function LoadingScreen() {
  const { resolveLoader, prefersReducedMotion } = useMotion()
  const root = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  // Lock body scroll while the loader covers the viewport. Cleanup restores
  // it if the component unmounts before the handoff completes (fast nav, HMR).
  useLayoutEffect(() => {
    document.body.dataset.loaderState = 'loading'
    return () => {
      if (document.body.dataset.loaderState === 'loading') {
        delete document.body.dataset.loaderState
      }
    }
  }, [])

  // Runtime measurement: align loader words to exact hero word positions.
  // Wait for `document.fonts.ready` first — measuring before Plus Jakarta Sans
  // has decoded gives fallback-font metrics, and the bbox would shift on swap.
  useLayoutEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (cancelled || !wordsRef.current) return

      const loaderKevin = wordsRef.current.querySelector<HTMLElement>(
        '[data-loader-word="kevin"]'
      )
      const heroKevin = document.querySelector<HTMLElement>(
        '[data-hero-word="kevin"]'
      )
      if (!loaderKevin || !heroKevin) return

      const lb = loaderKevin.getBoundingClientRect()
      const hb = heroKevin.getBoundingClientRect()
      const dy = hb.top - lb.top
      const dx = hb.left - lb.left

      if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) {
        wordsRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Track asset readiness and drive progress 0 → 1
  useEffect(() => {
    const start = performance.now()
    const minDelay = prefersReducedMotion
      ? LOADER_REDUCED_MOTION_MAX_MS
      : LOADER_MIN_DURATION_MS

    const finish = () => {
      const elapsed = performance.now() - start
      const wait = Math.max(0, minDelay - elapsed)
      setTimeout(() => setProgress(1), wait)
    }

    const id = window.setInterval(() => {
      const elapsed = performance.now() - start
      setProgress(Math.min(0.92, elapsed / minDelay))
    }, 30)

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

  // Handoff: when progress reaches 1, fade the panel out (or skip the tween
  // entirely under reduced motion) and resolve the loader gate.
  useEffect(() => {
    if (progress < 1) return
    const panel = root.current
    if (!panel) return

    const finalize = () => {
      // autoAlpha equivalent — set visibility AFTER opacity hits 0 so the
      // node stops painting and stops capturing pointer events.
      panel.style.visibility = 'hidden'
      document.body.dataset.loaderState = 'done'
      resolveLoader()
      setDone(true)
    }

    if (prefersReducedMotion) {
      panel.style.opacity = '0'
      finalize()
      return
    }

    const controls = animate(panel, { opacity: 0 }, {
      duration: 0.4,
      delay: 0.12,
      ease: POWER3_OUT,
      onComplete: finalize,
    })

    return () => {
      controls.stop()
    }
  }, [progress, prefersReducedMotion, resolveLoader])

  if (done) return null

  return (
    <div
      ref={root}
      data-loader-panel
      className="loader-screen"
      role="status"
      aria-live="polite"
    >
      {/*
        Structural mirror of .hero > .hero-main > h1.hero-name.
        Approximate CSS layout; fine-tuned at runtime via useLayoutEffect
        measuring the actual hero word positions and applying a transform.
      */}
      <div className="loader-hero-mirror">
        <div className="loader-hero-main">
          <div ref={wordsRef} className="loader-hero-name">
            <span
              data-loader-word="kevin"
              className="loader-hero-name-line loader-hero-name-line--ink"
            >
              kevin
            </span>
            <span
              data-loader-word="shibuya"
              className="loader-hero-name-line loader-hero-name-line--ghost"
            >
              shibuya.
            </span>
          </div>
          <div
            data-loader-progress
            data-value={progress}
            className="loader-underline"
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <span className="sr-only">loading</span>
    </div>
  )
}
```

- [x] **Step 2: Confirm no remaining gsap imports in LoadingScreen**

```bash
grep -n "gsap" src/components/layout/LoadingScreen.tsx
```

Expected: zero output.

- [x] **Step 3: Build verification**

Run: `npm run build`
Expected: PASS — no TS errors. (The `projectEaseGsap` shim still exists in `animations.ts` at this point; it's removed in Task 8 step 1a.)

- [x] **Step 4: Visual smoke test**

Run: `npm run dev` (background OK)
Reload `localhost:5173` with cache disabled. Expected:
- Loader panel appears with `kevin / shibuya.`
- Underline progress fills left → right
- After hold, panel fades out over ~0.4s (delay 0.12s before fade starts)
- Panel becomes hidden (no pointer interception); hero takes over
- Hero word positions match where the loader words were sitting (no visible jump)

Then reload with `prefers-reduced-motion: reduce` (DevTools → Rendering). Expected: panel disappears instantly when progress hits 1, no fade.

- [x] **Step 5: Commit**

```bash
git add src/components/layout/LoadingScreen.tsx
git commit -m "refactor(loader): migrate LoadingScreen off GSAP to Motion's animate()"
```

- [x] **Step 6: Tick spec checkbox**

Tick `- [ ] LoadingScreen.tsx migrated off GSAP…` in the spec.

---

## Task 8: Delete `useScrollFade` + remove GSAP from deps + update bundle-deps test

**Files:**
- Delete: `src/hooks/useScrollFade.ts`, `tests/unit/useScrollFade.test.ts`
- Modify: `src/utils/animations.ts` (remove `projectEaseGsap` shim), `package.json`, `package-lock.json`, `tests/unit/bundle-deps.test.ts`

- [x] **Step 1: Delete the hook + its test**

```bash
rm src/hooks/useScrollFade.ts tests/unit/useScrollFade.test.ts
```

- [x] **Step 1a: Remove the `projectEaseGsap` shim from `src/utils/animations.ts`**

After Task 7.5, no consumer needs this re-export. Delete the trailing block:

```ts
// Backwards-compat shim — LoadingScreen and HeroDataFragments still pass this
// to GSAP tweens. Removed when LoadingScreen is migrated off GSAP and
// HeroDataFragments is deleted (see plan Tasks 8 + 9).
export const projectEaseGsap = 'power3.out'
```

Verify: `grep -rn "projectEaseGsap" src/` — expected zero output.

- [x] **Step 2: Uninstall GSAP packages**

```bash
npm uninstall gsap @gsap/react
```

Expected: both packages removed from `dependencies` in `package.json` and from `node_modules`.

- [x] **Step 3: Update bundle-deps test allowlist**

Edit `tests/unit/bundle-deps.test.ts`:
- Remove `'@gsap/react'` and `'gsap'` from the `allowed` set
- Add `'lenis'` to the `allowed` set (alphabetically, between `i18next` and `react`)

The result should look like:

```ts
const allowed = new Set([
  '@react-three/drei', '@react-three/fiber',
  '@tailwindcss/vite', 'framer-motion',
  'i18next', 'lenis', 'react', 'react-dom', 'react-i18next',
  'react-router-dom', 'tailwindcss', 'three',
])
```

- [x] **Step 4: Run the unit test suite to confirm both bundle-deps & animations pass**

Run: `npm run test:unit`
Expected: PASS — bundle-deps reflects the new allowlist; animations test still passes; useScramble test still passes (untouched). useScrollFade test no longer exists.

- [x] **Step 5: Confirm no remaining gsap imports in src/**

```bash
grep -rn "from 'gsap" src/ ; grep -rn "@gsap/react" src/
```

Expected: zero output.

- [x] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(deps): remove gsap + @gsap/react; delete useScrollFade hook"
```

- [x] **Step 8: Tick spec checkboxes**

Tick `- [ ] src/hooks/useScrollFade.ts deleted; tests/unit/useScrollFade.test.ts deleted`, `- [ ] gsap and @gsap/react removed…`, and `- [ ] lenis added…` in the spec.

---

## Task 9: Delete `HeroDataFragments` + remove its mount in Hero

**Files:**
- Delete: `src/components/canvas/HeroDataFragments.tsx`
- Modify: `src/components/sections/Hero.tsx` (remove the lazy import + Suspense block)

- [x] **Step 1: Remove the import and JSX from Hero.tsx**

Edit `src/components/sections/Hero.tsx`:
- Delete lines 14-16 (the `const HeroDataFragments = lazy(...)` block) and the surrounding comment
- Delete the JSX at the bottom of the return:

```tsx
<Suspense fallback={null}>
  <HeroDataFragments />
</Suspense>
```

- If `Suspense` and `lazy` are no longer used elsewhere in this file, remove them from the React import line

- [x] **Step 2: Delete the canvas file**

```bash
rm src/components/canvas/HeroDataFragments.tsx
```

- [x] **Step 3: Verify no remaining HeroDataFragments references**

```bash
grep -rn "HeroDataFragments" src/
```

Expected: zero output.

- [x] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS.

- [x] **Step 5: Smoke-test the Hero**

Run (background OK): `npm run dev`
Visit `localhost:5173`. Expected: Hero right side now shows only `HeroAccent3D` (the rotating 3D object). The bars/line/lattice/"47"/hexagon-with-FIG-label collage is gone. No console errors, no missing-component warnings.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(hero): delete HeroDataFragments — single rotating accent only"
```

- [x] **Step 7: Tick spec checkbox**

Tick `- [ ] HeroDataFragments.tsx deleted; no remaining imports…` in the spec.

---

## Task 10: Hero refactor — staged choreography, layout, max-w, gaps, `<Trans>`

**Files:**
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/pt.json` (only `hero.description`)
- Modify: `src/index.css` (small follow-up — see "Carry-over from Task 4 review" below)

This is the user-facing centerpiece. All foundational primitives are now available. The choreography uses Motion variants with explicit `delay` per element rather than the loader-driven `is-revealed` class — that legacy mechanism stays for backwards compat where it's still needed but the Hero left column now drives its own timing.

**Carry-over from Task 4 code review:** `.hero-main` is currently declared in TWO non-adjacent blocks in `src/index.css` — the original block (with `position/z-index/align-self/max-width`) plus a tail block at end-of-file (with `display: flex; flex-direction: column;`). While editing Hero CSS in this task, MERGE the two blocks: move `display: flex; flex-direction: column;` up into the original `.hero-main` block, then leave the four "Hero left column inter-element gaps" sibling-selector rules grouped together at the bottom under their existing comment header. Cascade outcome stays identical; maintainability improves (no risk of a future edit missing the tail block).

**Carry-over from Task 7 code review:** `nameRef` in Hero.tsx is now functionally dead — only `useScrollFade(nameRef)` consumed it, and that call was removed in Task 7. The ref still attaches to the `<h1>` but nothing reads it. While rewriting the Hero JSX in this task, drop the `nameRef` declaration AND its `ref={nameRef}` binding. (`suppRef` is independent — it's still load-bearing for the `is-revealed` reveal effect.)

- [x] **Step 1: Plan the JSX rewrite**

The new Hero structure (left column only — right side `HeroAccent3D` block stays untouched):

```tsx
<section id="top" className="hero">
  <div className="hero-main">
    <h1 className="hero-name" ref={nameRef}>
      <RevealOnView recipe="stampIn" delay={0.18}>
        <span className="hero-name-line" data-hero-word="kevin">{t('hero.name1')}</span>
        <span className="hero-name-line hero-name-line--ghost" data-hero-word="shibuya">
          <ScrambleText>{t('hero.name2') as string}</ScrambleText>
        </span>
      </RevealOnView>
    </h1>

    <div className="hero-supplementary" ref={suppRef} data-hero-eyebrow>
      <RevealOnView recipe="slideInLeft" delay={0.52}>
        <div className="hero-role-line">
          <span className="hero-role-prefix">{t('hero.rolePrefix')}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${lang}-${roleIdx}`}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="hero-role"
            >
              {activeRole}
            </motion.span>
          </AnimatePresence>
        </div>
      </RevealOnView>

      <RevealOnView recipe="fadeUp" delay={0.78}>
        <p className="hero-desc max-w-[640px]">
          <Trans i18nKey="hero.description" components={{ strong: <strong /> }} />
        </p>
      </RevealOnView>

      <RevealOnView recipe="scaleIn" delay={1.04}>
        <div className="hero-cta">
          <a href="#contact" onClick={go('contact')} className="btn btn--primary">
            {t('hero.cta.collaborate')}
            <span className="btn-arrow">→</span>
          </a>
          <Link to="/resume" className="btn btn--ghost">
            {t('hero.cta.resume')}
            <span className="btn-arrow">↓</span>
          </Link>
        </div>
      </RevealOnView>
    </div>
  </div>

  {/* Stats row REMOVED — relocates in Task 17 */}

  {/* Right column: HeroAccent3D + HeroAccentSilhouette were previously mounted
      *inside* HeroDataFragments (now deleted). This task ADDS a fresh mount
      below — they must be lazy-loaded behind a Suspense boundary so the R3F
      bundle stays out of the LCP critical path. The components themselves
      (in src/components/canvas/) are untouched; only the mount site moves. */}
  <RevealOnView recipe="fadeUp" delay={1.28}>
    <Suspense fallback={null}>
      <HeroAccent3D />
      {/* HeroAccentSilhouette is the fallback; mount it under HeroAccent3D's
          internal R3F Suspense or as a sibling, depending on the existing
          component pattern — read both files and follow the convention. */}
    </Suspense>
  </RevealOnView>
</section>
```

Add `Suspense, lazy` back to the React import in Hero.tsx (Task 9 stripped them assuming Task 10 wouldn't need them — they're needed again now). Lazy-import HeroAccent3D using the same pattern as Home.tsx's section lazy-loads.

- [x] **Step 2: Apply the rewrite**

Edit `src/components/sections/Hero.tsx`:
- Add `import { Trans } from 'react-i18next'` and `import { RevealOnView } from '../ui/RevealOnView'` to the imports
- Replace the entire `return (...)` body with the structure above
- Delete the `hero-stats` `<div>` block (the 3-stat row, currently lines 127-134)
- The `useEffect` that adds `is-revealed` to `suppRef` after `loaderDone` (lines 44-55) is now redundant for visibility — but if `.is-revealed` is also keyed in CSS for any other purpose, leave the effect alone. If the only effect of `.is-revealed` was opacity, you can also remove the corresponding CSS rule that sets `.hero-supplementary { opacity: 0 }` and the `.is-revealed` override. Inspect `src/index.css` to confirm.
- Keep the `useScramble` integration (`<ScrambleText>`) and the role-cycler `useEffect` exactly as they are
- Find the existing `HeroAccent3D` JSX (Suspense + lazy load); wrap whatever currently mounts `<HeroAccent3D />` in `<RevealOnView recipe="fadeUp" delay={1.28}>`

- [x] **Step 3: Update the hero description i18n key with `<strong>` markup**

Edit `src/i18n/locales/en.json`. Find `hero.description`. Wrap two or three key phrases in `<strong>`. Example:

```json
"description": "<strong>full-stack developer</strong> specializing in interactive journalism and digital experiences — transforming <strong>data and narratives</strong> into engaging <strong>visual stories.</strong>"
```

Edit `src/i18n/locales/pt.json` and apply the equivalent `<strong>` wrapping in the Portuguese translation.

- [x] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Visual smoke test**

Run: `npm run dev` (background OK)
Reload `localhost:5173`. Expected:
- Name lands first with `stampIn` (slight scale-from-1.15 + blur-clear) at ~180ms
- Role line slides in from the left at ~520ms
- Description fades up at ~780ms with two or three bolded phrases visible
- CTA pair scales in at ~1040ms
- Right-side HeroAccent3D fades up at ~1280ms; rotation continues afterward
- The 3 stats are gone from above the fold
- Vertical spacing inside the left column feels generous (48/32/48)
- Description column doesn't sprawl past ~640px

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Hero.tsx src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(hero): staged choreography + decluttered layout + bold-emphasis description"
```

- [ ] **Step 7: Tick spec checkbox**

Tick `- [ ] Hero left column uses staged-timeline mount choreography…` in the spec.

---

## Task 11: WorkExperience refactor

**Files:**
- Modify: `src/components/sections/WorkExperience.tsx`
- Modify: `src/i18n/locales/en.json`, `pt.json` (only the WorkExperience section description if `<strong>` is added)

- [ ] **Step 1: Read the current file** to learn the current row markup and any existing RevealOnView usage:

```bash
sed -n '1,200p' src/components/sections/WorkExperience.tsx
```

- [ ] **Step 2: Apply the recipe mapping**

Wrap the section heading in `<RevealOnView recipe="stampIn">`. Wrap the rows list in `<Stagger recipe="slideInLeft" stagger={STAGGER_PRESETS.workRows}>` (import `Stagger` and `STAGGER_PRESETS`). Each direct child of `<Stagger>` is one row.

The accordion expand-on-click stays Framer's existing `AnimatePresence` height-auto pattern — do not touch that.

If the section has a description paragraph, constrain it with `className="... max-w-[640px]"` and wrap any emphasized phrases in `<Trans i18nKey="..." components={{ strong: <strong /> }}/>` (mirroring the Hero pattern from Task 10).

Add the `.section-spacing-content` utility to whichever container groups heading-and-content (typically the wrapping `<div>` around the rows).

- [ ] **Step 3: Build & smoke**

Run: `npm run build` → PASS.
`npm run dev` → scroll to Work section → confirm rows enter from the left in sequence.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/WorkExperience.tsx src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(work): apply slideInLeft stagger to rows + max-w on description"
```

---

## Task 12: Skills refactor

**Files:**
- Modify: `src/components/sections/Skills.tsx`

- [ ] **Step 1: Read the current file** to identify column/item structure.

- [ ] **Step 2: Apply the mapping**

Wrap the section heading in `<RevealOnView recipe="stampIn">`. The three numbered columns are wrapped in an outer `<Stagger recipe="slideInLeft" stagger={STAGGER_PRESETS.skillsColumns}>`. Inside each column, the list of items is wrapped in an inner `<Stagger recipe="slideInLeft" stagger={STAGGER_PRESETS.skillsItems}>`.

Apply `.section-spacing-content` to the container holding the columns, and `max-w-[640px]` to any section description paragraph.

- [ ] **Step 3: Build & smoke**

`npm run dev` → scroll to Skills → columns enter left-to-right, then items inside each column cascade.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Skills.tsx
git commit -m "feat(skills): nested slideInLeft stagger across columns + items"
```

---

## Task 13: Projects refactor

**Files:**
- Modify: `src/components/sections/Projects.tsx`
- Modify: `src/i18n/locales/en.json`, `pt.json` (project titles/descriptions if `<strong>` is added)

- [ ] **Step 1: Read the current file** to identify card structure (size: lg / md / sm).

- [ ] **Step 2: Apply the mapping**

Wrap the section heading in `<RevealOnView recipe="stampIn">`.

The bento grid wraps in `<Stagger recipe="cardReveal" stagger={STAGGER_PRESETS.projectCards}>`. **Crucial:** order children so the `lg` (2×2) card is **first** in source order — it gets the stagger lead so it lands first as the visual anchor. If the existing source order doesn't already have the `lg` card first, reorder the JSX (or, if the grid is data-driven, sort the items array so featured/lg cards come first).

Card titles can use the `<em>` italic blue accent (existing pattern). Card descriptions, if present, use `<Trans>` + `<strong>` for one or two emphasized phrases per card.

Apply `.section-spacing-content` and `max-w-[640px]` on description.

- [ ] **Step 3: Build & smoke**

`npm run dev` → scroll to Projects → confirm `lg` card enters first, others follow in stagger.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Projects.tsx src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(projects): cardReveal stagger w/ lg-card lead + bold-emphasis copy"
```

---

## Task 14: EmbedsGallery refactor

**Files:**
- Modify: `src/components/sections/EmbedsGallery.tsx`

- [ ] **Step 1: Read the current file** to confirm row structure.

- [ ] **Step 2: Apply the mapping**

Wrap the section heading in `<RevealOnView recipe="stampIn">`. Wrap the row list in `<Stagger recipe="slideInLeft" stagger={STAGGER_PRESETS.embedRows}>`. Note this stagger is fast (50ms) — many rows, faster cadence per spec §2.

Apply `.section-spacing-content` and `max-w-[640px]` on description.

- [ ] **Step 3: Build & smoke**

`npm run dev` → scroll to Embeds → rows enter rapid-fire from the left, no stalls.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/EmbedsGallery.tsx
git commit -m "feat(embeds): fast slideInLeft stagger across numbered rows"
```

---

## Task 15: Contact refactor

**Files:**
- Modify: `src/components/sections/Contact.tsx`
- Modify: `src/i18n/locales/en.json`, `pt.json` (contact body if `<strong>` is added)

**Carry-over from Task 4 code review:** Contact + Footer are the only ink-background sections. Task 4 added a global `strong { color: var(--ink); }` rule. Verify any `<strong>` markup added here renders legibly on the dark background; if it doesn't, add a defensive override `.section--dark strong, .contact strong, .footer strong { color: var(--cream); }` (use whichever scoping selector matches the actual DOM).

**Carry-over from Task 7 code review:** `contactTitleRef` in Contact.tsx is now functionally dead — only `useScrollFade(contactTitleRef)` consumed it, and that call was removed in Task 7. The ref still attaches but nothing reads it. While editing Contact JSX in this task, drop the `contactTitleRef` declaration AND its `ref={contactTitleRef}` binding.

- [ ] **Step 1: Read the current file**.

- [ ] **Step 2: Apply the mapping**

Wrap the section heading in `<RevealOnView recipe="stampIn">`. Wrap the body / link list in `<RevealOnView recipe="fadeUp">`. The submit button (if present) wraps in `<RevealOnView recipe="scaleIn">`.

Apply `.section-spacing-content` and `max-w-[640px]` on body. Convert any string with emphasis to `<Trans>` + `<strong>`.

- [ ] **Step 3: Build & smoke**

`npm run dev` → scroll to Contact → heading stamps in, body fades up, submit scales in.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Contact.tsx src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(contact): heading stampIn + body fadeUp + button scaleIn"
```

---

## Task 16: Footer refactor

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Read the current file**.

- [ ] **Step 2: Apply the mapping**

Locate the outlined `kevin shibuya` wordmark element. Wrap it in `<RevealOnView recipe="fadeUp">`. To use the `soft` spring specifically (slowest settle), import `SPRINGS` and pass an inline override:

If the wordmark already lives inside a `<motion.div>` or similar, you can swap to:

```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0, transition: SPRINGS.soft }}
  viewport={{ once: true, amount: 0.3 }}
>
  {/* wordmark JSX */}
</motion.div>
```

Otherwise add a `RevealOnView`-style wrapper but use the inline `motion.div` shown above to override the default `gentle` spring. (RevealOnView always uses VARIANTS' default spring; for the special-case `soft` override on a single element, the inline form is cleanest.)

- [ ] **Step 3: Build & smoke**

`npm run dev` → scroll to footer → confirm wordmark fades up with a noticeably slower settle than other elements.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(footer): wordmark fadeUp with soft spring as page coda"
```

- [ ] **Step 5: After Tasks 11-16, tick the spec checkbox**

After all section refactors are done, tick `- [ ] WorkExperience, Skills, Projects, EmbedsGallery, Contact each apply their assigned recipes per the mapping table` and `- [ ] <Trans> migration completed for every i18n string containing <strong>…` in the spec.

---

## Task 17: Stats section + Home.tsx insertion

**Files:**
- Create: `src/components/sections/Stats.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Locate the stats data source**

```bash
sed -n '1,30p' src/data/stats.ts
```

This is currently consumed by `Hero.tsx` (now removed). Confirm it exports `heroStats` with shape `{ value, labelKey }[]` — the new Stats component will import the same data.

- [ ] **Step 2: Create the Stats section**

Create `src/components/sections/Stats.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { heroStats } from '../../data/stats'
import { useMotion } from '../../context/MotionContext'
import { Stagger } from '../ui/Stagger'
import { STAGGER_PRESETS } from '../../utils/animations'

interface CountUpProps {
  /** Numeric target (e.g. 7, 250). The "+" suffix is added in JSX. */
  target: number
  /** Animation duration in ms (~1.4s per spec). */
  durationMs?: number
}

function CountUp({ target, durationMs = 1400 }: CountUpProps) {
  const { prefersReducedMotion } = useMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [display, setDisplay] = useState(prefersReducedMotion ? target : 0)

  useEffect(() => {
    if (!inView || prefersReducedMotion) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, durationMs, prefersReducedMotion])

  return <span ref={ref}>{display}</span>
}

export function Stats() {
  const { t } = useTranslation()

  // heroStats values look like "7+", "3+", "250+". Strip the "+" for count-up,
  // re-append in JSX. If the data shape changes, adjust here.
  const parsed = heroStats.map((s) => ({
    raw: s.value,
    n: parseInt(String(s.value).replace(/\D+/g, ''), 10) || 0,
    suffix: String(s.value).replace(/[\d\s]+/g, ''),
    labelKey: s.labelKey,
  }))

  return (
    <section id="stats" className="stats">
      <div className="stats-inner">
        <Stagger
          recipe="stampIn"
          stagger={STAGGER_PRESETS.statValues}
          className="stats-grid"
        >
          {parsed.map((s) => (
            <div key={s.labelKey} className="stats-item">
              <span className="hero-stat-v">
                <CountUp target={s.n} />{s.suffix}
              </span>
              <span className="hero-stat-l">{t(s.labelKey)}</span>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add CSS for the slim band**

Append to `src/index.css`:

```css
/* Stats slim-band section (Task 17). py-32 = 128px top/bottom. */
.stats {
  padding: 128px 80px;
}
.stats-inner {
  max-width: 1440px;
  margin: 0 auto;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  text-align: center;
}
.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
@media (max-width: 768px) {
  .stats { padding: 96px 24px; }
  .stats-grid { grid-template-columns: 1fr; gap: 32px; }
}
```

- [ ] **Step 4: Insert Stats into Home.tsx**

Edit `src/pages/Home.tsx`. Add a lazy import alongside the others:

```tsx
const Stats = lazy(() =>
  import('../components/sections/Stats').then((m) => ({ default: m.Stats }))
)
```

Add `void import('../components/sections/Stats')` to the `warm()` function.

In the JSX, insert `<Stats />` between `<WorkExperience />` and `<Skills />`. Note: the **current** order in Home.tsx is `Hero → Projects → EmbedsGallery → WorkExperience → Skills → Contact → Footer` (different from CLAUDE.md's documented order). Stats goes immediately after `WorkExperience` regardless of the surrounding sections:

```tsx
<Suspense fallback={<div style={{ minHeight: '100vh' }} aria-hidden />}>
  <Projects />
  <EmbedsGallery />
  <WorkExperience />
  <Stats />
  <Skills />
  <Contact />
  <Footer />
</Suspense>
```

- [ ] **Step 5: Build & smoke**

Run: `npm run build` → PASS.
`npm run dev` → scroll past WorkExperience → confirm Stats slim band appears with the three numerals counting up from 0 to their target values, staggered 120ms apart. Numerals have the `40px / 700` weight.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Stats.tsx src/pages/Home.tsx src/index.css
git commit -m "feat(stats): slim band w/ stampIn stagger + count-up; insert after Work"
```

- [ ] **Step 7: Tick spec checkbox**

Tick `- [ ] <Stats /> section component implemented…` in the spec.

---

## Task 18: Final verification pass

**Files:** `src/components/ui/RevealOnView.tsx` (small cleanup step), then verification only.

- [ ] **Step 0: Remove the backwards-compat shims from RevealOnView**

Now that every section refactor has migrated to `recipe`-prop usage, remove the legacy aliases. Edit `src/components/ui/RevealOnView.tsx`:
- Delete the `variant?:` and `staggerAmount?:` lines from `RevealOnViewProps`
- Delete the `variant` and `staggerAmount: _staggerAmount` parameters from the function signature
- Replace `resolveRecipe(recipe ?? variant)` with `resolveRecipe(recipe)`
- Update the `LEGACY_ALIASES` const: drop the `'stagger-children'` entry (it was only there for the old `staggerAmount` path)

Then verify nothing else uses the legacy props:

```bash
grep -rn "staggerAmount\|variant=" src/components/sections/ src/components/layout/ src/components/ui/ src/pages/
```

Expected: zero output (or only matches inside `RevealOnView.tsx`'s own legacy-alias comments). If anything in `src/` still passes `variant=` or `staggerAmount=`, migrate it to `recipe=` + `<Stagger>` before continuing.

Run: `npm run build` → PASS.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: 0 TS errors, vite build succeeds.

- [ ] **Step 2: Unit tests**

```bash
npm run test:unit
```

Expected: PASS — `bundle-deps`, `animations`, `useScramble` all green. (`useScrollFade` test is gone.)

- [ ] **Step 3: Reduced-motion sweep**

Open the dev server (`npm run dev`). In Chrome DevTools → Rendering panel → set `Emulate CSS media feature prefers-reduced-motion: reduce`. Reload.

Expected:
- Every section reveal collapses to a 200ms opacity-only fade
- No transforms, scales, or blurs
- Lenis is bypassed — wheel scrolling feels native (no smoothing interpolation)
- Stats numerals appear at final values (no count-up animation)
- Anchor link clicks still work, scroll is instantaneous (`behavior: 'auto'`)

- [ ] **Step 4: Mobile sweep**

DevTools → Device toolbar → iPhone 14 Pro (or any touch device emulation). Scroll. Expected: native iOS-style momentum, no Lenis interference. Pull-to-refresh gesture still triggers the browser's reload (not blocked).

- [ ] **Step 5: Anchor link sweep**

Click each Header link (work, interactives, experience, skills, contact) and the Hero CTA buttons. Expected: each click smooth-scrolls via Lenis to the correct section's `id`.

- [ ] **Step 6: Lighthouse**

Run a Lighthouse mobile audit on the production preview:

```bash
npm run build && npm run preview
```

Open `localhost:4173` in Chrome incognito → Lighthouse → Mobile → Performance.

Expected: score ≥ 91. (Removing GSAP saves ~70KB gz; adding Lenis costs ~5KB gz; net savings should preserve or improve the existing 91.)

- [ ] **Step 7: Visual smoke test — full page top-to-bottom**

Reload `localhost:4173` (clean cache: DevTools → Network → Disable cache). Scroll slowly from Hero to Footer. Verify each section's recipe matches the mapping table (spec §2):
- Hero: 5-step staged choreography (180/520/780/1040/1280ms)
- Projects: bento cards `cardReveal`, lg first
- Embeds: rows fast-stagger `slideInLeft`
- WorkExperience: rows `slideInLeft` 100ms stagger
- Stats: numerals `stampIn` + count-up 120ms stagger
- Skills: columns + items nested `slideInLeft`
- Contact: heading stamps, body fades, button scales
- Footer: wordmark `fadeUp` with `soft` (slowest) spring

If anything's off, raise a follow-up task — do **not** silently mutate animations.ts to compensate.

- [ ] **Step 8: Tick remaining spec checkboxes + commit**

Tick the remaining boxes in the spec:
- `- [ ] Reduced-motion behavior verified manually in DevTools…`
- `- [ ] npm run build passes with no errors`
- `- [ ] npm run test:unit passes…`
- `- [ ] Lighthouse mobile ≥ 91`
- `- [ ] Visual smoke test approved by user…` (this last one needs the user's actual sign-off — present screenshots or a live walkthrough; do not self-tick this one)

```bash
git add docs/superpowers/specs/2026-05-02-page-feel-overhaul-design.md
git commit -m "chore: tick spec checkboxes after final verification pass"
```

---

## Notes for the implementer

- **Spec checkbox discipline:** every task has a spec-tick step. Do **not** batch ticks at the end — tick as you go, otherwise the `feat`/retro skills can't read progress.
- **i18n `<Trans>` pattern:** the markup `<strong>foo</strong>` inside a translation string is rendered correctly only when consumed via `<Trans i18nKey="…" components={{ strong: <strong /> }} />`. A plain `t('hero.description')` will render the literal `<strong>` text.
- **Section ordering reality:** `Home.tsx` order is `Hero → Projects → EmbedsGallery → WorkExperience → Skills → Contact → Footer` (not CLAUDE.md's stated order). Stats inserts immediately after `WorkExperience`. Don't reorder the rest in this spec.
- **MarqueeDivider:** intentionally not placed in this spec. Left alone.
- **`useScrollFade` deletion is intentional behavior loss.** The scroll-progress heading-fade is gone from this spec; will be redesigned later. Don't reintroduce it via Motion's `useScroll` as a "fix" — that's out of scope.
- **`useScramble` and `ScrambleText`:** preserved as-is on the duo-name's second line. Don't touch.
- **`HeroAccent3D` and `HeroAccentSilhouette`:** preserved as-is. Don't touch the R3F internals; only wrap the mount in a `RevealOnView` for entry animation.
