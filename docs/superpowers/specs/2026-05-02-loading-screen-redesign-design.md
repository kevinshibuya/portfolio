# Loading Screen Redesign — Ink-Drawn Name with Periwinkle Cursor

**Date:** 2026-05-02
**Scope:** Replace the existing `LoadingScreen` component (and the entire fixed-panel-mirror-of-hero approach) with an in-place SVG-drawn name handoff. Hero owns its own pre-draw state; no separate cover panel.

---

## Motivation

The current loader is a fixed full-viewport panel that mirrors the hero's `<h1>` markup, then teleports its words to the hero's measured pixel coordinates at runtime via `getBoundingClientRect`. This is fragile: the runtime measurement runs inside `document.fonts.ready`, depends on the hero being mounted at the same moment, and produces visible misalignment when font metrics, viewport size, or DOM order shift between the loader render and the hero render. The user has reported the words are "not even properly aligned."

Beyond the bug, the loader is uninteresting — a static name with a horizontal progress underline that fades out. There is no narrative beat between page-load-finished and hero-arrived; the loader simply disappears.

The replacement is a single coherent visual moment: the hero name is *drawn* as outlined SVG strokes from the very first frame, paced by actual loading progress, and a periwinkle cursor dot — the same dot that lives in the nav availability indicator — rides along beneath the active line of writing. When the draw completes, the strokes ink-fill, the dot blooms on the period, then floats up to the nav. The "loader" is just the hero in its drawing-in state, and the handoff is a continuous physical motion (the dot flying home), not a fade.

---

## Locked decisions (from brainstorm)

1. **Architecture:** no separate loader panel. The page renders normally from frame 1, but the SVG name component renders in its mid-draw state and every other element on the page is gated invisible. The "loader" is a state of the hero, not a sibling.
2. **Pen style:** P2 — letters draw in parallel with a left-to-right per-glyph stagger (~80ms apart). 13 glyphs total (5 in `kevin` + 7 in `shibuya` + period), ~1.4s nominal draw at uncapped progress.
3. **Cursor dot:** present during draw. Single periwinkle dot (`#8AAADA` / `--periwinkle-300`, same as the nav availability indicator) gliding just below the active baseline. X position mapped from honest `progress` (load-driven). Lifts (fades 120ms) between `kevin` and `shibuya.`
4. **No track line behind the dot.** Composition stays uncluttered.
5. **Endgame** (when `progress === 1`): strokes ink-fill, dot blooms on the period with a halo, then floats to the nav availability dot's runtime-measured position. As the dot arrives, the header fades in around it; the loader's dot fades out as the nav dot fades in (both periwinkle at the same coordinates — perceptually one object).
6. **Honest progress driver:** synthetic ramp toward 92% over `LOADER_MIN_DURATION_MS`, snaps to 100% when both `window load` and `document.fonts.ready` resolve. Stalled loads dwell near 92% with the last letter or two partially drawn — the partial state is itself the "still loading" signal.
7. **Reduced motion:** skip the draw and post-draw beats entirely. Render name fully filled, nav dot in place, fire hero cascade after the existing `LOADER_REDUCED_MOTION_MAX_MS` floor.

---

## Design

### 1. Composition

The page tree under `App` keeps `Header`, `SmoothScroll`, `Hero`, and downstream sections, all rendered from frame 1. A new `loaderState` signal (in `MotionContext`) gates visibility:

| Element | Visible during draw? | Visible during ink-fill + dot float? | Visible after handoff? |
|---|---|---|---|
| SVG `HeroNameDrawing` (new, mounts inside `Hero`) | yes — drawing | yes — filling | yes — final state, identical to hero name |
| Periwinkle cursor dot (new, body-portal element) | yes — gliding | yes — blooming, then flying | no — fades as nav dot fades in |
| `Header` | no (`opacity: 0`) | crossfades in during dot float | yes |
| Hero role line, description, CTAs, `HeroAccent3D` | no (`opacity: 0`, gated by existing `RevealOnView gate={gate}`) | starts cascading at T+500ms after draw completes | yes |
| Sections below the fold | rendered normally; not gated (their reveals are scroll-driven anyway, and the page is scroll-locked during the loader) | scroll-locked released; existing IntersectionObserver triggers fire on scroll | yes |

Body scroll is locked via the existing `data-loader-state="loading"` attribute. The lock is released when the dot completes its flight to the nav (not when the draw completes — the user would otherwise be able to scroll mid-flight and lose the choreography).

### 2. Components and responsibilities

```
src/
  components/
    layout/
      LoadingScreen.tsx          # DELETE — replaced by hero-owned drawing
    sections/
      Hero.tsx                   # Renders <HeroNameDrawing/> in place of <h1>
                                 #   for the duration of the loader. After
                                 #   handoff, swaps to the existing <h1>.
    ui/
      HeroNameDrawing.tsx        # NEW — SVG name, owns draw + ink-fill +
                                 #   period bloom. Reads progress from
                                 #   MotionContext.
      LoadingCursor.tsx          # NEW — periwinkle dot. Body-portal'd.
                                 #   Reads progress + drawDone signal.
                                 #   Computes path from current bounds and
                                 #   nav-dot bounds at runtime.
  context/
    MotionContext.tsx            # Add: progress (0..1), drawDone (Promise),
                                 #   handoffDone (Promise). loaderDone is
                                 #   redefined as handoffDone (back-compat
                                 #   for Hero gate prop).
  data/
    glyphPaths.ts                # NEW — pre-extracted SVG path data for
                                 #   "kevin" + "shibuya." in Plus Jakarta
                                 #   Sans 700, plus per-glyph offsets and
                                 #   total stroke lengths. Built by a
                                 #   one-time Node script (see §5).
  hooks/
    useLoaderProgress.ts         # NEW — owns the synthetic ramp + load
                                 #   detection. Single source of truth for
                                 #   progress value.
```

The existing `LoadingScreen.tsx`, its CSS rules (`.loader-screen`, `.loader-hero-mirror`, `.loader-hero-main`, `.loader-hero-name`, `.loader-hero-name-line`, `.loader-hero-name-line--ink`, `.loader-hero-name-line--ghost`, `.loader-underline`), and the `data-loader-word` / runtime-measurement code are all removed.

### 3. Glyph rendering

Plus Jakarta Sans is a variable TTF at `/public/fonts/`. We use `opentype.js` in a one-shot Node script (`scripts/extract-glyph-paths.mjs`, checked in but not part of the build) to extract the SVG path `d` attribute for each glyph in `kevin shibuya.` at `weight: 700`. Output is a single TypeScript constant in `src/data/glyphPaths.ts`:

```ts
export interface GlyphPath {
  char: string
  d: string                  // SVG path data
  advance: number            // x-advance for layout
  totalLength: number        // measured via SVGGeometryElement.getTotalLength
                             //   on a hidden mount, baked at build time
}

export const NAME_GLYPHS: { kevin: GlyphPath[]; shibuya: GlyphPath[] } = { ... }
// Path data is normalized to a 1000-unit em. The SVG's viewBox + width
// scale it to whatever pixel size the hero <h1> would be at the current
// viewport — matching .hero-name font-size: clamp(64px, 11vw, 192px) with
// line-height: 0.92 and letter-spacing: -0.05em.
```

The script reads the TTF, walks the string, builds path data at a normalized em-size, and snapshots `getTotalLength` from a hidden DOM mount in a Puppeteer pass (or reads it from opentype.js's path commands directly — to be decided in plan). Path data is normalized to a 1000-unit em so the SVG can be scaled to any viewport via `transform: scale(...)` rather than re-extracting per breakpoint.

The string `kevin shibuya.` is fixed and never localized (the name is the same in EN and PT), so this extraction is one-time.

### 4. Choreography (timing)

All times are measured from `progress === 1` unless noted. The draw phase itself is progress-driven, so it has no fixed duration.

| T (ms) | Event | Duration | Notes |
|---|---|---|---|
| -∞ to 0 | Draw phase | varies | Each glyph's stroke `pathLength` interpolates from 0 to 1 over its allotted slice of `[0..1]` global progress. Per-glyph stagger and draw-window widths are sized so the period glyph (index 12) completes exactly at `progress === 1`; specific values land in the plan. The visual rule: at `progress === 1` the entire name is fully stroked, no glyph still in flight. Cursor dot rides at `cursorX(progress)` (see §5). |
| 0 | `progress === 1` reached | — | Triggers `drawDone.resolve()` and the post-draw beats below. |
| 0 → 400 | Ink fill | 400 | `kevin`'s strokes cross-fade from `stroke #3A96E8 fill none` to `stroke none fill var(--ink)`. `shibuya.` cross-fades to `stroke var(--blue-300) fill var(--mist)` (the existing ghost treatment). Letterforms do not move; only `stroke` and `fill` properties tween. |
| 0 → 500 | Period bloom | 500 | Cursor dot scales `1 → 1.15 → 1` and a halo ring expands `r=7 → r=22, opacity 0.4 → 0`. Dot remains at period coordinates. Parallel with ink fill. |
| 500 | Dot float-to-nav begins | — | Triggers in parallel: `handoffStart.resolve()`. |
| 500 → 1200 | Dot floats to nav availability dot position | 700 | `cubic-bezier(0.65, 0, 0.35, 1)`. Path measured at runtime from current SVG period coords to `document.querySelector('.nav-avail-dot').getBoundingClientRect()`. |
| 500 → 1700 | Hero cascade (existing `RevealOnView` chain via `gate` prop) | varies | The eye follows the dot up while the page builds in below it. The existing 0.18 / 0.52 / 0.78 / 1.04 / 1.28 second offsets in `Hero.tsx` are preserved; they're now offsets from `T+500ms`. |
| 1000 → 1200 | Header crossfade | 200 | Header `opacity 0 → 1` over the last 200ms of the dot's flight. |
| 1200 | Identity merge | 100 | Loader dot fades out (100ms); nav dot becomes visible (its existing CSS pulse takes over). Body scroll lock released. `handoffDone.resolve()`. |

Total: ~1.2s of post-draw choreography before scroll is unlocked, ~1.7s before the last hero element settles in.

Under reduced motion: skip rows 0–1200. At progress 1 (capped at `LOADER_REDUCED_MOTION_MAX_MS = 200`), set strokes to final fills, set nav dot visible in place, resolve `handoffDone` immediately, fire hero cascade. The existing reduced-motion path in `useReducedMotion()` consumers handles the rest.

### 5. Cursor dot path mathematics

The cursor dot is a single body-portal'd element with absolute positioning. Its job is:
- During draw: glide along a virtual baseline below the active line of writing.
- At `progress === 1`: settle on the period of `shibuya.`
- Float to the nav availability dot's coordinates.

**Position function during draw** (executed per `progress` tick). The dot tracks the *reading position*, which moves left-to-right along `kevin`'s baseline, then drops to `shibuya.`'s baseline. The two phases are split at `KEVIN_PHASE_END` (a constant chosen so the dot transitions to shibuya at the moment kevin's last glyph is fully drawn — exact value derived from the stagger function in the plan, ~0.45):

```
if (progress < KEVIN_PHASE_END - 0.03) {
  // dot rides kevin baseline; x lerps from kevin start to kevin end
  const t = progress / (KEVIN_PHASE_END - 0.03)
  cursorX = kevinStartX + t * kevinTotalWidth
  cursorY = kevinBaselineY + 14
  cursorOpacity = 1
} else if (progress < KEVIN_PHASE_END + 0.03) {
  // pen lift — fade out, then fade in at shibuya start
  cursorOpacity = progress < KEVIN_PHASE_END
    ? lerp(1, 0, (progress - (KEVIN_PHASE_END - 0.03)) / 0.03)
    : lerp(0, 1, (progress - KEVIN_PHASE_END) / 0.03)
} else if (progress < 1) {
  // dot rides shibuya baseline through to the period
  const t = (progress - (KEVIN_PHASE_END + 0.03)) / (1 - (KEVIN_PHASE_END + 0.03))
  cursorX = shibuyaStartX + t * shibuyaTotalWidth
  cursorY = shibuyaBaselineY + 14
  cursorOpacity = 1
} else {
  // pinned to period during bloom, then flies
  cursorX = periodX
  cursorY = periodY
}
```

`kevinStartX`, `kevinTotalWidth`, etc. come from the SVG's bounding rect computed at first render and on `resize`. The dot is positioned via `transform: translate3d(...)` rather than left/top to keep it on the compositor.

**Float-to-nav path:** straight `cubic-bezier(0.65, 0, 0.35, 1)` interpolation from `(periodX, periodY)` to the nav dot's measured `getBoundingClientRect()` center. No arc — the cubic-bezier ease gives enough organic feel without curving the path. Path is measured fresh at flight start; if the user resizes mid-flight the destination is locked at flight start (no chasing).

### 6. Progress driver (`useLoaderProgress`)

Single hook, owns the value:

```
- start = performance.now()
- minDelay = prefersReducedMotion ? 200 : 700  // existing constants
- raf loop:
    elapsed = now - start
    syntheticProgress = min(0.92, elapsed / minDelay)
    setProgress(max(progress, syntheticProgress))
- when window 'load' fires AND document.fonts.ready resolves:
    finish() — animate progress 0.92 → 1.0 over 240ms with easeOutCubic,
    then resolve drawDone
- if reduced motion: snap progress to 1 after minDelay; skip all post-draw beats
```

The `max(progress, synthetic)` guards against progress ever moving backward (which it shouldn't, but the raf + load-fire interleaving is worth defending against under HMR). Reading `document.fonts.ready` is necessary because the SVG glyphs are pre-extracted (no font dependency for the *draw*), but the hero's `<h1>` swap-in after handoff depends on Plus Jakarta Sans being loaded.

### 7. Hero swap-in

`Hero.tsx` currently always renders an `<h1 className="hero-name">` with two `<span>` children. The redesign changes this to:

```tsx
{handoffDone ? (
  <h1 className="hero-name">
    <RevealOnView recipe="stampIn" delay={0.18} gate={gate}>
      ...existing markup...
    </RevealOnView>
  </h1>
) : (
  <HeroNameDrawing />
)}
```

The handoff is *only* a swap of the markup — the SVG sits in the same DOM position with the same computed bbox, so there is no layout shift. The hero name's `<h1>` mounts only after `handoffDone`, at which point the SVG version unmounts. For accessibility, the `<HeroNameDrawing>` component renders an `<h1 className="sr-only">kevin shibuya.</h1>` alongside the SVG so screen readers see the name from frame 1.

### 8. Reduced motion fallback

When `prefersReducedMotion` is true:

- `useLoaderProgress` snaps progress to 1 after `LOADER_REDUCED_MOTION_MAX_MS = 200`.
- `HeroNameDrawing` renders all glyphs in their final ink-filled / ghost state from frame 1 (no draw animation).
- `LoadingCursor` does not mount at all.
- `handoffDone` resolves immediately at progress 1.
- Header and hero cascade fire on the existing reduced-motion code paths in `RevealOnView`.

### 9. CSS additions / removals

**Remove** all `.loader-screen`, `.loader-hero-*`, `.loader-underline` rules from `index.css` and the `html:has(...)` and `body[data-loader-state="loading"]` scroll-lock block (the lock is now driven by the new component setting the same attribute, so the CSS rule stays — only the loader markup is gone).

**Add** a small block for `HeroNameDrawing` and `LoadingCursor`:

```css
.hero-name-svg {
  display: block;
  width: 100%;
  height: auto;
  /* matches .hero-name font-size clamp via aspect-ratio + width */
}
.hero-name-svg .glyph-path {
  fill: none;
  stroke: var(--blue-400);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.loading-cursor {
  position: fixed;
  left: 0; top: 0;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--periwinkle-300);
  pointer-events: none;
  will-change: transform, opacity;
  z-index: 9998;  /* below any modal but above page content */
}
.loading-cursor-halo {
  position: absolute; inset: 0;
  border-radius: 50%;
  background: var(--periwinkle-300);
  opacity: 0;
}
```

### 10. Outstanding implementation details (deferred to plan)

The plan should resolve, before coding:

- Whether `getTotalLength` snapshotting needs Puppeteer or if opentype.js's path-command walker can compute total stroke length to within ~5% without a browser.
- Whether to portal `LoadingCursor` to `document.body` directly or to a dedicated `<div id="loader-portal" />` injected in `index.html` (avoids React 19 portal-into-body warning under StrictMode).
- Whether `HeroNameDrawing`'s SVG should size via `viewBox` + `width: 100%` (responsive) or via fixed pixel dimensions matched to the hero font-size at the current viewport (more accurate but adds a resize listener).
- Whether the `data-loader-state` attribute should move from `body` to `html` (currently both are needed for the iOS scroll lock; the plan should keep this if the lock semantics are unchanged).

---

## TODO

Acceptance criteria — each gets ticked when its automated test passes AND the visual review accepts it.

- [ ] One-time Node script `scripts/extract-glyph-paths.mjs` produces `src/data/glyphPaths.ts` containing `d` and `totalLength` for all 12 glyphs of `kevin shibuya.` at Plus Jakarta Sans 700.
- [ ] `useLoaderProgress` hook exists, exposes `{ progress, drawDone, handoffDone }`. Synthetic ramp to 0.92, snaps to 1 on window load + fonts ready. Reduced-motion path snaps to 1 after `LOADER_REDUCED_MOTION_MAX_MS`.
- [ ] `MotionContext` exports `progress`, `drawDone`, `handoffDone`. `loaderDone` is redefined as `handoffDone` (existing consumers in `Hero` continue to work without code changes).
- [ ] `HeroNameDrawing` component renders all 13 glyphs (5 + 7 + period) as `<motion.path>` elements, draws via `pathLength` driven by progress, with a per-glyph stagger sized so the period glyph completes exactly at `progress === 1`.
- [ ] `HeroNameDrawing` renders an `<h1 className="sr-only">kevin shibuya.</h1>` for screen readers from frame 1.
- [ ] At progress 1, `HeroNameDrawing`'s strokes ink-fill: `kevin` to solid ink, `shibuya.` to ghost (cream fill + `--blue-300` stroke). 400ms cross-fade.
- [ ] `LoadingCursor` body-portal'd component renders periwinkle dot at the position computed by the cursor-position function in §5. Lifts (fades 120ms) between `kevin` and `shibuya.`
- [ ] At progress 1, `LoadingCursor` blooms on the period (scale + halo expand, 500ms) then floats to the nav availability dot's `getBoundingClientRect` center (700ms cubic-bezier).
- [ ] On dot arrival, header fades in over the last 200ms of flight, loader cursor fades out, nav availability dot becomes visible, body scroll lock releases, `handoffDone` resolves.
- [ ] `Hero.tsx` swaps from `<HeroNameDrawing>` to `<h1>` on `handoffDone`; layout does not shift (SVG and `<h1>` occupy identical bbox).
- [ ] Old `LoadingScreen.tsx` deleted; CSS rules `.loader-screen`, `.loader-hero-*`, `.loader-underline` removed; `App.tsx` no longer imports `LoadingScreen`.
- [ ] Under `prefers-reduced-motion: reduce`, name renders fully ink-filled from frame 1, cursor never mounts, `handoffDone` resolves at `LOADER_REDUCED_MOTION_MAX_MS`, hero cascade fires on the existing reduced-motion code paths.
- [ ] `npm run build` succeeds. `npm run dev` shows the full choreography on a hard refresh; `prefers-reduced-motion: reduce` (DevTools) shows the no-animation fallback.
- [ ] Lighthouse mobile run shows no regression in LCP vs the current loader (the SVG is lighter than the loader panel + hero name combo, so this should improve).
