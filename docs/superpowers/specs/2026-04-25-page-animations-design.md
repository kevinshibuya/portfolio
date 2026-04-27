# Page Animations Pass — Design Spec

A polished, restrained motion layer across the portfolio: a fluid loading-to-hero handoff, an editorial data-fragment composition on the right side of the hero with scroll-linked motion, a soft character-scramble hover on the `shibuya.` lettering, viewport-triggered enters for every section, and a continuous scroll-tied fade on titles as they pass the top edge. Simple, subtle, noticeable — never showy. Ships behind a strict reduced-motion contract and zero new bundle weight.

## TODO

- [x] Loading screen renders, fills its progress underline as assets resolve, and hands the `kevin` / `shibuya.` words off to their final hero positions without remount or visible discontinuity (bounding-box continuity verified at frame boundaries).
- [x] Hero right-side editorial data-fragment composition (6 fragments: bars, line chart, annotation, dot lattice, numeric callout, optional R3F accent) renders at final positions after a sequenced GSAP entry timeline triggered post-loader.
- [ ] Hero data-fragments respond to scroll progress via ScrollTrigger scrub (per-fragment parallax up to 80px, bar height +12% max, dot-lattice highlight advances), with R3F accent removable via `motion-flags.ts` without shifting other fragments.
- [ ] Hovering or focusing the `shibuya.` lettering triggers a 600ms soft character scramble (latin + katakana glyph pool) with 30ms per-character stagger that always settles to the exact glyphs `shibuya.`, and re-hovering within 800ms does not retrigger.
- [ ] Each section's heading and content enter via Framer Motion `whileInView` (fade-up or stagger-children) when the section's top crosses the viewport −10% margin, plays once, and is complete within 800ms.
- [ ] Hero name lines and every section heading fade continuously with scroll position via an eased (`power2.out`) ScrollTrigger scrub: opacity 1 at +80px from viewport top, opacity 0 at −120px from viewport top, opacity between 0.4 and 0.7 at −50px.
- [ ] When `prefers-reduced-motion: reduce` is set, every behavior short-circuits to its static fallback: loader resolves ≤200ms, hero fragments at final positions immediately, section enters instant, shibuya does not scramble, titles never scroll-fade.
- [ ] Lighthouse mobile run on the production build yields Performance ≥ 90 and CLS = 0; on Slow 4G + 4× CPU throttling, no long task during scroll exceeds 200ms; mobile (<768px) disables R3F accent and halves parallax range.
- [ ] Net new dependency weight is 0kb gzipped; any future addition over 20kb is gated by a flag.

## Context

The portfolio currently has a single section-level animation (Framer Motion `AnimatePresence` driving the rotating role text in `Hero.tsx`) and CSS hover transitions. The codebase already has all three animation libraries installed: `framer-motion@12`, `gsap@3` + `@gsap/react`, `@react-three/fiber`/`drei` + `three`. Reduced-motion handling is absent. No `docs/` folder existed before this spec.

The page is editorial-pastel: soft blue on cool cream, lowercase confident, Plus Jakarta Sans throughout, max-width 1440 with 80px side padding. Section flow on `Home`: Hero → Projects → EmbedsGallery → WorkExperience → Skills → Contact → Footer.

## Architecture

### Library lane assignment

The project's `CLAUDE.md` mandates a per-lane split between animation libraries. The five new behaviors map as follows:

| Behavior | Primary library | Rationale |
|---|---|---|
| Loading → hero handoff | GSAP timeline + `clip-path` tween | Multi-element choreography with shared timeline. |
| Hero data-fragments entry | GSAP timeline (after `loaderDone`) | Sequenced with the loader timeline. |
| Hero data-fragments scroll-linked motion | GSAP ScrollTrigger (`scrub`) | Pure scroll-progress mapping; ScrollTrigger is best-in-class. |
| Optional R3F accent | `@react-three/fiber` + `useFrame` | Already in stack; lazy + flag-gated. |
| `shibuya.` hover scramble | Framer Motion + `useScramble` hook | Component-local hover state, per-char stagger. |
| Section content enter on viewport | Framer Motion `whileInView` | Concise viewport-based enters. |
| Title scroll-linked fade | GSAP ScrollTrigger (`scrub`) | Same lane as fragment scroll motion. |

GSAP carries the new scroll/timeline work; Framer Motion handles state-driven and viewport-triggered enters; R3F is contained to a single optional element. Net: zero new dependencies.

### File layout

```
src/
  hooks/
    # (no custom reduced-motion hook — reuse `useReducedMotion` from framer-motion)
    useScramble.ts               # char scramble engine for shibuya hover
    useScrollFade.ts             # ScrollTrigger-bound top-edge fade
  components/
    canvas/
      HeroDataFragments.tsx      # SVG editorial composition (primary)
      HeroAccent3D.tsx           # optional R3F element, lazy + flag-gated
    layout/
      LoadingScreen.tsx          # owns loader → hero handoff timeline
    ui/
      ScrambleText.tsx           # wraps useScramble
      RevealOnView.tsx           # thin Framer Motion whileInView wrapper
  utils/
    animations.ts                # shared GSAP eases, durations, defaults
    motion-flags.ts              # ENABLE_R3F_ACCENT, etc.
  context/
    MotionContext.tsx            # exposes loaderDone, prefersReducedMotion, r3fAccentEnabled
```

`SectionHeading` is patched in place (not duplicated) to consume `useScrollFade`.

### Coordination

`LoadingScreen.tsx` exposes a `loaderDone: Promise<void>` that resolves when the curtain finishes. `HeroDataFragments` subscribes to it and only starts its entry timeline after — guaranteeing no overlap. The rest of the page's section-enter animations are independent of the loader and triggered by viewport intersection. A `MotionContext` provides:

- `loaderDone: Promise<void>`
- `prefersReducedMotion: boolean`
- `r3fAccentEnabled: boolean` (resolved at mount: `motion-flags.ts` flag AND viewport ≥ 768px)

## Per-behavior design

### 1. Loading screen → hero handoff

Full-viewport panel with `bg-bg-cream` (`#F6F9FC`) — same as the page bg, so no flash. Content centered and pre-sized to the hero typography:

- Line 1: `kevin` in ink (becomes hero `name1`)
- Line 2: `shibuya.` in mist with blue-300 stroke (becomes hero `name2`)
- 2px-tall blue-400 underline beneath the words, `scaleX: 0 → 1`, anchored left, tied to `document.readyState` + `Image.decode()` on critical hero assets, with a min-display floor of 700ms.

GSAP timeline (~1.4s post-load):

1. Underline scaleX progresses from 0 to current asset-load fraction.
2. At fraction = 1, brief settle (120ms).
3. `clip-path: inset()` (or `gsap.to` on absolute coords) moves both word-lines from loader-centered positions to hero positions in parallel.
4. Eyebrow, role line, description, CTAs, stats fade-up with stagger as the words settle.
5. The cream background is shared — no panel exit needed.

`role="status"` + `aria-live="polite"` with text "loading" while active; cleared on done.

**Reduced-motion fallback:** loader panel still renders to cover any in-flight asset load (CLS protection), but contents are static — no underline, no clip-path tween. As soon as critical assets resolve (or 200ms elapses, whichever comes first), the panel removes and the hero is shown with words already at their final positions and the rest of the hero fading in over 150ms.

### 2. Hero right-side: editorial data-fragment composition + R3F accent

A `grid-cols-4 grid-rows-4` filling the right column. Six fragments (1 optional), monochrome blue palette + ink ticks, all hand-built SVG except the R3F:

1. **Bar fragment** — 5 vertical bars, ascending heights, blue-200 fill. Span 2×3.
2. **Line fragment** — sketched line chart, 8 points, dust stroke, one blue-400 highlighted point. Span 2×2.
3. **Annotation block** — uppercase dust caption ("fig. 01 — 2026") with mist underline. Span 1×1.
4. **Dot lattice** — 7×5 grid, mist dots, one blue-400 highlight. Span 2×2.
5. **Numeric callout** — oversized stroked-outline number ("47") in blue-300. Span 1×2.
6. *(Optional)* **R3F accent** — small canvas (~280×280), slowly-rotating wireframe icosahedron in blue-200. Lazy-loaded behind `Suspense` whose fallback is a static SVG silhouette of the same shape and bounding box (so flag-off is layout-invisible). Span 1×1.

**Entry animation** (GSAP timeline, fires after `loaderDone`, total ~1.1s with overlapping starts):

- Bars stagger-extend from baseline (transform-origin bottom).
- Line draws via `stroke-dashoffset`.
- Dots stagger-fade in waves.
- Number scales-up from 0.92.
- R3F canvas fades opacity 0 → 1.

Eases use the project ease `cubic-bezier(0.22, 1, 0.36, 1)`.

**Scroll-linked motion** (ScrollTrigger, `scrub: 1`, range = top of hero → bottom of hero):

- Each fragment carries `data-parallax-speed` (0.05–0.35), translateY scaled to scroll progress, max 80px.
- Bar fragment heights extend up to +12%.
- Dot-lattice highlight advances along the lattice as scroll progresses.

Mobile (<768px): parallax max 40px, R3F accent off regardless of flag.

**Reduced-motion fallback:** all fragments at final positions on first paint, no entry, no parallax, no R3F rotation (icosahedron static).

### 3. `shibuya.` soft character scramble

`ScrambleText.tsx` wraps `useScramble`. Each character renders as a `<span>` inside an `aria-hidden` clone; the real text node stays unchanged for screen readers.

On `mouseenter` or `focus` of the parent:

- Total duration: 600ms.
- Per-char start staggered by 30ms.
- Each char cycles through 4–6 random glyphs from `[a-z]` ∪ a katakana pool (`シブヤトウキョウ` plus 6 others) before settling to its true glyph.
- The `.` does not scramble — it color-shifts to blue-400 and back.
- Re-hover within 800ms of the last cycle's start (i.e. 200ms cool-down after the 600ms cycle settles) does NOT retrigger.

**Reduced-motion fallback:** no scramble. Hover triggers a 200ms ease of fill from mist to blue-400 and back when the cursor leaves.

### 4. Section content enter on viewport

`RevealOnView` accepts `variant: 'fade-up' | 'fade' | 'stagger-children'` and `delay`. Defaults: `y: 24 → 0`, `opacity: 0 → 1`, duration 600ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`, `viewport={{ once: true, margin: '-10% 0px' }}`. Stagger applies to direct children at 60ms intervals (40ms for embed rows).

Applied to:

- Each section's `SectionHeading` and immediate description (`fade-up`)
- Project bento cards (`stagger-children`)
- Embed rows (`stagger-children`, 40ms)
- Work accordion rows (`fade-up`)
- Skills columns (`stagger-children`)
- Contact CTA block (`fade-up`)

**Reduced-motion fallback:** opacity straight to 1, no y-translate, no stagger.

### 5. Title scroll-linked fade

`useScrollFade(ref, { startOffset, endOffset, ease })` binds an element to a ScrollTrigger that scrubs opacity based on the element top's distance from the viewport top.

- Curve: `gsap.parseEase('power2.out')`
- Start: opacity = 1 while element top ≥ +80px below viewport top.
- End: opacity = 0 when element top ≤ −120px (i.e. 120px above viewport top).
- Range: 200px band above the top edge.
- Mobile: range tightened to 140px (start +60, end −80).

Applied to: hero `name1` + `name2` (faded together as one group), every `SectionHeading` em-accented title. NOT applied to body content.

**Reduced-motion fallback:** no scroll-tied fade. Titles stay at full opacity always.

## Cross-cutting concerns

### Accessibility

- Every behavior reads Framer Motion's `useReducedMotion()` and short-circuits to its static fallback. The hook subscribes to `matchMedia('(prefers-reduced-motion: reduce)')` change events. For non-React contexts (e.g. GSAP code outside hooks), the same value is exposed via `MotionContext`.
- Loader uses `role="status"` + `aria-live="polite"`, cleared when done.
- All text content remains in the DOM at the right semantic level throughout.
- Focus order is unchanged during loader; not trapped.
- Shibuya scramble animates an `aria-hidden` clone; the real glyphs are unchanged.
- Color contrast is not affected (no animated color shifts on body text).

### Performance & mobile

- All GSAP transforms target `transform`/`opacity` only (no layout-triggering props).
- `will-change: transform` set during active timelines, removed on cleanup.
- ScrollTrigger uses `fastScrollEnd: true`; one shared ticker.
- Mobile (<768px): parallax range halved, R3F accent disabled, scroll-fade range tightened.
- Hero data-fragments are SVG with viewBox scaling — no rasterization on resize.
- `LoadingScreen` reserves the full viewport — CLS = 0 across handoff.
- Fragments use absolute positioning within the right grid column; layout is grid-fixed.

### Bundle

- Net new deps: 0kb gzipped.
- R3F accent: already lazy-chunked, removed via `r3fAccentEnabled = false`.
- Any future motion dep > 20kb gzipped requires an explicit flag and a note in the spec.

## Acceptance test approach

Two layers, ATDD-driven by the `feat` skill:

1. **Vitest unit tests** — deterministic logic only:
   - `useReducedMotion` reflects the media-query state and updates on change.
   - `useScramble` always settles to the target string after `duration`.
   - `useScrollFade` math: given element-top y, returns expected eased opacity.

2. **Playwright e2e** — integration:
   - Loader → hero handoff: snapshot bbox of `kevin` / `shibuya.` words at t=0 (loader end) and t=hero-settled, assert continuity (Δ < 1px).
   - Section enters: scroll to each section, assert opacity transition completes within 800ms.
   - Title scroll-fade: scroll to known offsets, assert measured opacity within tolerance bands.
   - Reduced-motion mode: emulate `prefers-reduced-motion: reduce`, reload, assert no clip-path/parallax/scramble runs and loader resolves ≤200ms.

`feat` works one TODO at a time: failing acceptance test → minimum implementation to green → refactor → tick the box.

## Out of scope (for this spec)

- Cursor follower or magnetic hover effects (existing minimal cursor stays as-is).
- Page transitions on route change (`/projects/:slug`) — separate spec if desired.
- Smooth-scroll library swap (preserving current `useSmoothScroll` direction is not part of this pass).
- Marquee divider redesign — kept as-is.

## Branch & implementation handoff

After spec approval, work proceeds on `feat/page-animations`. Implementation is driven by the `feat` skill, ticking TODO boxes as each acceptance test passes. A `retro` follows completion to capture animation-specific lessons (timing, debugging, library boundaries, mobile gotchas).
