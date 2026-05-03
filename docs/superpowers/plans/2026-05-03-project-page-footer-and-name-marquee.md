# Project page closing + footer name marquee — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append the existing `Contact` + `Footer` to project detail pages, and replace the static `.footer-big` outline with a `<FooterNameMarquee />` that traces "kevin shibuya" twice in blue, cross-fades to cream-25%, and runs an infinite leftward marquee.

**Architecture:** One new component (`src/components/ui/FooterNameMarquee.tsx`) owns the trace + cross-fade + marquee state machine. The `Footer` shell stays simple (it just renders the new component plus the existing bottom meta row). The project page change is a small structural edit to add lazy-loaded Contact + Footer below the project content. CSS lives in `src/index.css` alongside the existing `.footer-*` block.

**Tech Stack:** React 19, TypeScript strict, Vite 6, Framer Motion v12 (`useReducedMotion`), `react-i18next`, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-03-project-page-footer-and-name-marquee-design.md`

**After each step's command lands successfully, edit the corresponding `- [ ]` to `- [x]` in this file before proceeding to the next step.** Plan + spec checkbox discipline is mandatory (see `CLAUDE.md`).

---

## Task 1: FooterNameMarquee — TDD (tests + implementation)

**Spec sections:** Architecture, SVG geometry per copy, Timing constants, Stroke states, Reduced motion

**Files:**
- Create: `tests/unit/FooterNameMarquee.test.tsx`
- Create: `src/components/ui/FooterNameMarquee.tsx`

- [x] **Step 1: Write the failing test file**

Create `tests/unit/FooterNameMarquee.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { FooterNameMarquee } from '../../src/components/ui/FooterNameMarquee'

function renderWithProviders() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MotionProvider>
        <FooterNameMarquee />
      </MotionProvider>
    </I18nextProvider>
  )
}

describe('FooterNameMarquee', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders 24 SVG paths total (12 per copy × 2 copies)', () => {
    const { container } = renderWithProviders()
    const paths = container.querySelectorAll('.footer-marquee-track svg path')
    expect(paths).toHaveLength(24)
  })

  it('renders two NameCopy SVGs as children of the marquee track', () => {
    const { container } = renderWithProviders()
    const svgs = container.querySelectorAll('.footer-marquee-track > svg')
    expect(svgs).toHaveLength(2)
    // Each SVG should have 12 paths (5 kevin + 7 shibuya, period dropped)
    svgs.forEach((svg) => {
      expect(svg.querySelectorAll('path')).toHaveLength(12)
    })
  })

  it('translates the shibuya glyph group by (2900, 0) in each copy', () => {
    const { container } = renderWithProviders()
    const groups = container.querySelectorAll('[data-shibuya-group]')
    expect(groups).toHaveLength(2)
    groups.forEach((g) => {
      expect(g.getAttribute('transform')).toBe('translate(2900, 0)')
    })
  })

  it('renders an sr-only h2 with the bigText i18n value', () => {
    const { container } = renderWithProviders()
    const h2 = container.querySelector('h2.sr-only')
    expect(h2?.textContent).toBe('kevin shibuya')
  })

  it('uses an aria-hidden marquee container so SR users only hear the h2', () => {
    const { container } = renderWithProviders()
    const marquee = container.querySelector('.footer-marquee')
    expect(marquee?.getAttribute('aria-hidden')).toBe('true')
  })
})
```

- [x] **Step 2: Run the test to confirm it fails (component does not exist yet)**

```bash
npm run test:unit -- tests/unit/FooterNameMarquee.test.tsx
```

Expected: FAIL — module `'../../src/components/ui/FooterNameMarquee'` not found.

- [x] **Step 3: Create the component**

Create `src/components/ui/FooterNameMarquee.tsx`:

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import {
  NAME_KEVIN,
  NAME_SHIBUYA,
  NAME_ASCENT,
  NAME_DESCENT,
} from '../../data/glyphPaths'

type Phase = 'idle' | 'tracing' | 'crossfade' | 'marquee'

/** Per-glyph stagger delay, in ms. */
const STAGGER_MS = 80
/** Per-glyph trace (stroke-dashoffset 1→0) duration, in ms. */
const TRACE_DUR_MS = 800
/** Breath between copy 1 finishing and copy 2 starting, in ms. */
const PAUSE_BETWEEN_COPIES_MS = 120
/** Stroke color/width cross-fade duration, in ms (matches hero ink-fill). */
const CROSSFADE_DUR_MS = 650

/** Footer text is "kevin shibuya" — drop the period glyph from NAME_SHIBUYA. */
const SHIBUYA_GLYPHS = NAME_SHIBUYA.glyphs.slice(0, 7)
const KEVIN_GLYPHS = NAME_KEVIN.glyphs

/** Inter-word + inter-copy spacing, in glyph viewBox units (1000-em font). */
const WORD_GAP = 300
const INTER_COPY_GAP = 300

/** x-offset applied to the shibuya glyph group within each copy. */
const SHIBUYA_X_OFFSET = NAME_KEVIN.totalAdvance + WORD_GAP // 2900

const LAST_SHIBUYA = SHIBUYA_GLYPHS[SHIBUYA_GLYPHS.length - 1]
const SHIBUYA_LOCAL_END = LAST_SHIBUYA.x + LAST_SHIBUYA.advance // 3790

/** Per-copy SVG viewBox width: kevin + word-gap + shibuya + inter-copy gap. */
const VIEWBOX_WIDTH = SHIBUYA_X_OFFSET + SHIBUYA_LOCAL_END + INTER_COPY_GAP // 6990
const VIEWBOX_HEIGHT = NAME_ASCENT + NAME_DESCENT // 1070

interface NameCopyProps {
  refs: MutableRefObject<(SVGPathElement | null)[]>
  phase: Phase
}

function glyphClassName(phase: Phase): string {
  const isFinal = phase === 'crossfade' || phase === 'marquee'
  const isCrossfade = phase === 'crossfade'
  return [
    'footer-marquee-glyph',
    isFinal ? 'footer-marquee-glyph--final' : '',
    isCrossfade ? 'footer-marquee-glyph--crossfade' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function NameCopy({ refs, phase }: NameCopyProps): React.JSX.Element {
  const cls = glyphClassName(phase)
  return (
    <svg
      className="footer-marquee-track-copy"
      viewBox={`0 ${-NAME_ASCENT} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMinYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {KEVIN_GLYPHS.map((g, i) => (
        <path
          key={`k-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          d={g.d}
          className={cls}
        />
      ))}
      <g transform={`translate(${SHIBUYA_X_OFFSET}, 0)`} data-shibuya-group>
        {SHIBUYA_GLYPHS.map((g, i) => (
          <path
            key={`s-${i}`}
            ref={(el) => {
              refs.current[KEVIN_GLYPHS.length + i] = el
            }}
            d={g.d}
            className={cls}
          />
        ))}
      </g>
    </svg>
  )
}

export function FooterNameMarquee(): React.JSX.Element {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  // Reduced motion skips IDLE / TRACING / CROSSFADE entirely and lands in
  // the visual end-state (cream-stroked, single static copy) from mount.
  const [phase, setPhase] = useState<Phase>(
    prefersReducedMotion ? 'marquee' : 'idle'
  )

  const trackRef = useRef<HTMLDivElement>(null)
  const copy1Refs = useRef<(SVGPathElement | null)[]>([])
  const copy2Refs = useRef<(SVGPathElement | null)[]>([])

  // Reduced motion: imperatively land the single rendered copy in its final
  // dashoffset:0 state before first paint, so paths render stroked instead
  // of invisible (the base CSS rule starts dashoffset:1 = hidden).
  useLayoutEffect(() => {
    if (!prefersReducedMotion) return
    const paths = copy1Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )
    paths.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '0'
    })
  }, [prefersReducedMotion])

  // IDLE → TRACING: arm the IntersectionObserver. Set initial dashoffset:1
  // on every path so the trace can animate from hidden.
  useEffect(() => {
    if (prefersReducedMotion) return
    if (phase !== 'idle') return

    const track = trackRef.current
    if (!track) return

    const allPaths = [...copy1Refs.current, ...copy2Refs.current].filter(
      (p): p is SVGPathElement => p !== null
    )

    // jsdom (vitest) doesn't run SVG layout — feature-detect a browser-only
    // API and short-circuit straight to the marquee phase there.
    if (typeof allPaths[0]?.getBBox !== 'function') {
      setPhase('marquee')
      return
    }

    allPaths.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '1'
    })

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          observer.disconnect()
          setPhase('tracing')
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(track)

    return () => {
      observer.disconnect()
    }
  }, [prefersReducedMotion, phase])

  // TRACING: drive copy 1 then copy 2 sequentially, schedule the crossfade
  // phase flip. The marquee phase is scheduled by the next effect so its
  // cleanup never accidentally cancels a pending crossfade-→-marquee timer.
  useEffect(() => {
    if (phase !== 'tracing') return

    const copy1 = copy1Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )
    const copy2 = copy2Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )

    // Reset transitions before scheduling new ones (mirrors HeroNameDrawing).
    ;[...copy1, ...copy2].forEach((p) => {
      p.style.transition = 'none'
    })
    void document.body.offsetHeight

    const copy1Duration = (copy1.length - 1) * STAGGER_MS + TRACE_DUR_MS
    const copy2StartDelay = copy1Duration + PAUSE_BETWEEN_COPIES_MS
    const copy2Duration = (copy2.length - 1) * STAGGER_MS + TRACE_DUR_MS
    const totalTrace = copy2StartDelay + copy2Duration

    const rafId = requestAnimationFrame(() => {
      copy1.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
      copy2.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${copy2StartDelay + i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
    })

    // When the trace is done, clear inline transitions (which only cover
    // stroke-dashoffset). Otherwise they would override the CSS rule for
    // the --crossfade class transition (which covers stroke + stroke-width).
    const crossfadeTimer = window.setTimeout(() => {
      ;[...copy1Refs.current, ...copy2Refs.current].forEach((p) => {
        if (p) p.style.transition = ''
      })
      setPhase('crossfade')
    }, totalTrace + 50)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(crossfadeTimer)
    }
  }, [phase])

  // CROSSFADE → MARQUEE: hold for CROSSFADE_DUR_MS, then flip to marquee.
  useEffect(() => {
    if (phase !== 'crossfade') return
    const marqueeTimer = window.setTimeout(() => {
      setPhase('marquee')
    }, CROSSFADE_DUR_MS)
    return () => {
      window.clearTimeout(marqueeTimer)
    }
  }, [phase])

  return (
    <>
      <h2 className="sr-only">{t('footer.bigText')}</h2>
      <div className="footer-marquee" aria-hidden="true">
        <div
          ref={trackRef}
          className={`footer-marquee-track footer-marquee-track--${phase}`}
        >
          <NameCopy refs={copy1Refs} phase={phase} />
          {!prefersReducedMotion && (
            <NameCopy refs={copy2Refs} phase={phase} />
          )}
        </div>
      </div>
    </>
  )
}
```

- [x] **Step 4: Run the unit test to confirm it passes**

```bash
npm run test:unit -- tests/unit/FooterNameMarquee.test.tsx
```

Expected: PASS — all 5 tests green. (jsdom short-circuits to phase='marquee' so paths render in their final state, but the structural assertions don't care about animation state.)

- [x] **Step 5: Run full unit suite to confirm no regressions**

```bash
npm run test:unit
```

Expected: PASS — all existing tests green plus the 5 new ones.

- [x] **Step 6: Run typecheck**

```bash
npm run build
```

Expected: PASS — no TS errors. (The build will succeed even though the CSS rules don't exist yet; the component just renders unstyled glyphs at this point.)

- [ ] **Step 7: Commit**

```bash
git add tests/unit/FooterNameMarquee.test.tsx src/components/ui/FooterNameMarquee.tsx
git commit -m "feat(footer): FooterNameMarquee component + unit tests (trace, crossfade, marquee state machine)"
```

---

## Task 2: Marquee CSS — full-bleed track, glyph stroke states, keyframes

**Spec sections:** CSS, Stroke states, Reduced motion

**Files:**
- Modify: `src/index.css` (replace the `.footer-big` rule and add `.footer-marquee*` rules)

- [ ] **Step 1: Replace the `.footer-big` block with the new marquee rules**

In `src/index.css`, find the existing block (around lines 873–885):

```css
.footer-big {
  font-size: clamp(80px, 18vw, 280px);
  font-weight: 700;
  line-height: 0.88;
  letter-spacing: -0.06em;
  text-transform: lowercase;
  color: transparent;
  -webkit-text-stroke: 1px rgba(246, 249, 252, 0.25);
  margin: 0 0 48px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
```

Replace it with:

```css
/* =========================================================================
   FOOTER NAME MARQUEE
   "kevin shibuya" trace + crossfade + infinite marquee. Replaces the static
   .footer-big outline. The track lives inside .footer (which has 80px LR
   padding); negative margin breaks out so the marquee runs edge-to-edge of
   the viewport while the bottom meta row keeps its gutter.
   ========================================================================= */
.footer-marquee {
  margin-left: -80px;
  margin-right: -80px;
  margin-bottom: 48px;
  overflow: hidden;
}
.footer-marquee-track {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  font-size: clamp(80px, 18vw, 280px);
  line-height: 0.88;
}
.footer-marquee-track-copy {
  display: block;
  flex-shrink: 0;
  height: 1em;
  width: auto;
  overflow: visible;
}
.footer-marquee-glyph {
  fill: transparent;
  stroke: var(--blue-400);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.footer-marquee-glyph--final {
  stroke: rgba(246, 249, 252, 0.25);
  stroke-width: 6;
}
.footer-marquee-glyph--crossfade {
  transition:
    stroke 650ms cubic-bezier(0.22, 1, 0.36, 1),
    stroke-width 650ms cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-marquee-track--marquee {
  animation: footer-marquee-scroll 45s linear infinite;
  will-change: transform;
}
@keyframes footer-marquee-scroll {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .footer-marquee-track--marquee { animation: none; }
}
```

- [ ] **Step 2: Update the responsive breakpoints to match footer's reduced gutter**

In `src/index.css`, inside the existing `@media (max-width: 1100px)` block (around line 901), find:

```css
@media (max-width: 1100px) {
  .nav, .hero, .section, .section--contact, .footer {
    padding-left: 40px;
    padding-right: 40px;
  }
```

Add right after that selector group, still inside the same media query:

```css
  .footer-marquee {
    margin-left: -40px;
    margin-right: -40px;
  }
```

In the same file, inside the `@media (max-width: 720px)` block (around line 922), find:

```css
@media (max-width: 720px) {
  /* …existing rules… */
  .hero, .section, .section--contact, .footer {
    padding-left: 20px;
    padding-right: 20px;
  }
```

Add right after that selector group, still inside the same media query:

```css
  .footer-marquee {
    margin-left: -20px;
    margin-right: -20px;
  }
```

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run build
npm run lint
```

Expected: both pass (no TS or ESLint errors). (The build also picks up the new CSS via Vite's CSS pipeline.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(footer): marquee CSS — full-bleed track, glyph stroke states, keyframes"
```

---

## Task 3: Wire FooterNameMarquee into Footer.tsx

**Spec sections:** Architecture (Component shape)

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace the `motion.div.footer-big` block with `<FooterNameMarquee />`**

Replace the entire contents of `src/components/layout/Footer.tsx` with:

```tsx
import { useTranslation } from 'react-i18next'
import { FooterNameMarquee } from '../ui/FooterNameMarquee'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <FooterNameMarquee />
      <div className="footer-bottom">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
```

(We drop the `motion` import and the `SPRINGS` import — neither is used after the replacement.)

- [ ] **Step 2: Run typecheck and full unit suite**

```bash
npm run build
npm run test:unit
```

Expected: PASS — clean build, all unit tests still green.

- [ ] **Step 3: Visual smoke check on Home**

```bash
npm run dev
```

Open `http://localhost:5173/`, scroll to the footer, and verify (these will be re-checked in the verification task — this is just a smoke check):
- The trace plays in blue, copy 1 then copy 2 sequentially.
- A coordinated cross-fade lands the strokes at cream-25% / width-6.
- The marquee starts and loops.
- The bottom row (copyright + built-with) renders unchanged.

If something is visibly broken at this stage, fix it before proceeding (most likely culprit: a CSS class typo against the JSX). Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(footer): wire FooterNameMarquee into Footer; drop static footer-big"
```

---

## Task 4: Project Detail page — append Contact + Footer (lazy-loaded)

**Spec sections:** Project Detail page changes

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: Add lazy imports + chunk warmer + Suspense + restructured `<main>`**

Replace the entire contents of `src/pages/ProjectDetail.tsx` with:

```tsx
import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tag } from '../components/ui/Tag'
import { projects } from '../data/projects'
import { useLenis } from '../hooks/useLenis'

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
    // Snap both native scroll and Lenis's internal target to 0 BEFORE
    // first paint. duration: 0 alone still goes through one Lenis lerp
    // tick, which the user reads as a visible scroll-to-top animation.
    // immediate + force bypass the lerp; window.scrollTo handles the
    // pre-Lenis-mount path.
    window.scrollTo(0, 0)
    scrollTo(0, { immediate: true, force: true })
  }, [scrollTo])

  // Warm the lazy chunks at idle so the first scroll doesn't show a placeholder.
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
          style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
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
      <section className="section" style={{ paddingTop: '160px' }}>
        <Link
          to="/"
          className="btn btn--ghost"
          style={{ marginBottom: '48px' }}
        >
          ← {t('projectDetail.back')}
        </Link>

        <div
          style={{
            background: project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
            borderRadius: '18px',
            aspectRatio: '16 / 9',
            marginBottom: '40px',
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(26, 21, 18, 0.2)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            textTransform: 'lowercase',
            fontSize: 'clamp(32px, 4vw, 56px)',
          }}
        >
          {project.title[lang]}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <h1 className="section-title" style={{ margin: 0 }}>
            {project.title[lang]}
          </h1>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--bark)',
              textTransform: 'lowercase',
              letterSpacing: '0.08em',
            }}
          >
            {t('projectDetail.year')}: {project.year}
          </span>
        </div>

        <p className="section-desc" style={{ marginBottom: '32px' }}>
          {project.description[lang]}
        </p>

        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--blue-400)',
              textTransform: 'lowercase',
              letterSpacing: '0.15em',
              marginBottom: '12px',
            }}
          >
            {t('projectDetail.stack')}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {project.techStack.map((tech) => (
              <Tag key={tech} label={tech.toLowerCase()} variant="pill" />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
        </div>
      </section>

      <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
        <Contact />
        <Footer />
      </Suspense>
    </main>
  )
}
```

Key structural changes from the previous file:
- `<main className="section">` becomes plain `<main>`; the project content moves into a child `<section className="section">` so Contact + Footer can sit as siblings of the section without inheriting `.section`'s padding.
- Lazy imports for `Contact` and `Footer` mirror `Home.tsx`'s pattern.
- Idle chunk-warmer effect (also matches `Home.tsx`).
- The not-found branch gets the same `<main> + <section className="section">` shape for consistency.

- [ ] **Step 2: Run typecheck and full unit suite**

```bash
npm run build
npm run test:unit
```

Expected: PASS — clean build, all unit tests still green.

- [ ] **Step 3: Visual smoke check on a project page**

```bash
npm run dev
```

Open `http://localhost:5173/`, click into any project card, and verify:
- The project content renders identically to before (back button, hero block, title, year, description, stack, live/source buttons).
- Below the live/source buttons, the Contact section renders.
- Below Contact, the Footer renders with the marquee.
- Scrolling down to the footer triggers the trace + cross-fade + marquee on the project page (same behavior as Home).

If anything is off, fix it before proceeding. Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat(project-page): append Contact + Footer below project content"
```

---

## Task 5: Verification — full visual + functional pass

**Spec sections:** Testing strategy

**Files:** None modified — this task is verification only.

- [ ] **Step 1: Clean build + lint + full test suite**

```bash
npm run build
npm run lint
npm run test:unit
```

Expected: all three pass cleanly.

- [ ] **Step 2: Run Playwright e2e suite**

```bash
npm run test:e2e
```

Expected: all existing e2e tests pass. (We did not add new e2e tests for the footer; the existing `reduced-motion.spec.ts` and `section-enters.spec.ts` should remain green.)

- [ ] **Step 3: Manual visual verification — Home page footer**

```bash
npm run dev
```

On `http://localhost:5173/`:
- [ ] Scroll smoothly to the footer; trace begins when footer is ≥30% in view.
- [ ] Copy 1 traces in blue, glyph by glyph (k→e→v→i→n→s→h→i→b→u→y→a).
- [ ] After ~120ms breath, copy 2 traces sequentially.
- [ ] After copy 2 finishes, all 24 paths simultaneously cross-fade stroke from blue to cream-25% AND stroke-width from 12 to 6 over 650ms.
- [ ] Marquee starts moving leftward at ~45s/cycle.
- [ ] Watch a full cycle — confirm seamless wrap, no visible jump at the 50% mark.
- [ ] Scroll up and back down to the footer — trace does NOT replay (once-per-mount semantics).

- [ ] **Step 4: Manual visual verification — project page footer**

Still on the dev server:
- [ ] Click a project card → project page loads.
- [ ] Scroll to the footer; the trace plays again on this page (fresh mount).
- [ ] Contact section is visible above the footer.
- [ ] Live/source button row is still visible above Contact.
- [ ] Click the back button → return to Home; scroll restores correctly (existing behavior, should not have regressed).

- [ ] **Step 5: Manual visual verification — mobile width**

Open Chrome devtools → device toolbar → set viewport to 375×667 (or any width ≤720px):
- [ ] The marquee runs edge-to-edge of the viewport (no 80px gutter visible at the sides).
- [ ] The trace + marquee still function (font-size scales down via `clamp(80px, 18vw, 280px)`).
- [ ] The bottom meta row stays inside the 20px gutter.
- [ ] Resize from 375 → 1100 → 1440 — verify the marquee remains full-bleed at every breakpoint and the bottom meta row keeps its gutter.

- [ ] **Step 6: Manual visual verification — reduced motion**

In Chrome devtools → Rendering tab → "Emulate CSS media feature `prefers-reduced-motion`" → set to "reduce". Reload the page:
- [ ] Footer renders a single static "kevin shibuya" in cream-25% stroke.
- [ ] No trace flash, no cross-fade, no marquee animation.
- [ ] Visually matches the previous footer-big appearance (single static outline).
- [ ] Same behavior on a project page — single static copy, no animation.

- [ ] **Step 7: Manual visual verification — i18n parity**

Toggle the language pill in the nav (EN ↔ PT):
- [ ] Footer marquee text remains "kevin shibuya" in both languages (the `footer.bigText` value is identical in en.json and pt.json).
- [ ] Bottom meta row updates to the localized copyright/builtWith strings.

Stop the dev server.

- [ ] **Step 8: Final commit (if any tweaks were needed during verification)**

If verification surfaced any issues that required code changes, commit them now. Otherwise this step is a no-op:

```bash
git status
# If clean, no commit needed.
# If dirty, commit the tweaks with a fix message.
```

- [ ] **Step 9: Tick the spec TODO checklist**

Open `docs/superpowers/specs/2026-05-03-project-page-footer-and-name-marquee-design.md` and tick every item under `## TODO` from `- [ ]` to `- [x]`. Commit:

```bash
git add docs/superpowers/specs/2026-05-03-project-page-footer-and-name-marquee-design.md
git commit -m "docs(spec): tick TODO checklist — project page closing + footer marquee shipped"
```
