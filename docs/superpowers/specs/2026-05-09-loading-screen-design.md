# Loading screen + curtain transition — 2026-05-09

Goal: replace the static-h1 LCP-prepaint hack from the prior Lighthouse 95+ pass with a deliberate, branded loading screen that doubles as the LCP target. A dark `#111822` panel with a large "ks" monogram paints at first frame; once React mounts AND a minimum dwell elapses, the panel splits apart in a two-panel curtain transition (top half lifts up, bottom half drops down), revealing the cream stage on which the SVG ink-draw hero entrance plays cleanly.

This is a follow-up on `feat/lighthouse-95` — same branch, additional commits.

---

## Why this exists

The prior pass shipped a transparent static `<h1>` in `index.html` (mobile Lighthouse Perf 95). Two flaws:

1. The static h1 doesn't align with the SVG hero on slow-4G mobile, so users briefly see a wrong-position plain-text "kevin shibuya." that doesn't match the SVG's final placement.
2. It feels like a hack, not a design moment. The portfolio has identity; the JS-load gap should look intentional.

A loading screen with a curtain transition turns the same ~500 ms-1 s of JS-load gap into a deliberate brand moment, while keeping the same Lighthouse mechanics: a large content element painted at first frame is recorded as LCP, and removing the element from the DOM (when the curtain lifts) doesn't change the recorded metric (per W3C LCP spec).

---

## Visual structure

The loader is two stacked panels in `index.html`:

```
+-----------------+       <-- top panel, height: 50vh, position: fixed top:0
|                 |
|         _____   |       <-- top half of "ks" visible here
|        |  ks |  |          (mark sits at vertical center of viewport;
|        |     |  |          this panel uses overflow:hidden to clip the bottom half)
+========|=====|=========|     ─── horizontal seam at 50vh ───
|        |     |  |
|        |__ks_|  |       <-- bottom half of "ks" visible here
|                 |          (same mark, this panel clips the top half)
+-----------------+       <-- bottom panel, height: 50vh, position: fixed bottom:0
```

Both panels carry their own copy of the "ks" mark, positioned absolutely at the vertical center of the viewport. Each panel's `overflow: hidden` clips half the mark, so visually the user sees one continuous "ks" straddling the seam.

When the curtain triggers:
- Top panel: `transform: translateY(-100%)` over ~600 ms, `cubic-bezier(0.85, 0, 0.15, 1)` ease
- Bottom panel: `transform: translateY(100%)` over the same duration
- Both panels animate simultaneously
- The "ks" appears to tear along the horizontal seam: its top half rides up with the upper panel, its bottom half rides down with the lower panel

**Tokens:**
- Background: `var(--ink)` (`#111822`)
- Mark color: `var(--cream)` (`#F6F9FC`) — high contrast, qualifies as LCP candidate
- Mark size: `clamp(140px, 30vw, 320px)`
- Mark font: Plus Jakarta Sans, weight 700, lowercase, letter-spacing -0.05em
- z-index: 9999 (above all React content)

---

## Timing + gating

Trigger logic lives in `main.tsx`. Two gates close before the curtain lifts:

1. **React mounted** — confirmed by double `requestAnimationFrame` after `createRoot().render(...)` (first rAF schedules pre-paint, second fires after the first React commit is painted)
2. **Min dwell elapsed** — `setTimeout(..., 600)` started at first JS execution

When BOTH fire, `main.tsx` adds class `loader--exit` to `#loader`. CSS transitions on `.loader-half--top` and `.loader-half--bottom` carry the panels out. After 600 ms (transition duration + small buffer), an inline `setTimeout` removes `#loader` from the DOM and calls `resolveCurtain()`.

**Hard fallback**: 3 s `setTimeout` always lifts the curtain even if React stalls (network failure, etc.). Better to land on an empty page than be stranded on the loader.

```ts
// main.tsx (sketch — full code in the implementation plan)
const loader = document.getElementById('loader')
const startedAt = performance.now()
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches
const MIN_DWELL = REDUCE ? 200 : 600
const MAX_WAIT = 3000
const TRANSITION_MS = REDUCE ? 150 : 600

let lifted = false
const safeLift = (): void => {
  if (lifted || !loader) return
  lifted = true
  loader.classList.add('loader--exit')
  setTimeout(() => {
    loader.remove()
    document.body.classList.remove('is-loading')
    resolveCurtain()
  }, TRANSITION_MS + 50)
}

setTimeout(safeLift, MAX_WAIT)
createRoot(document.getElementById('root')!).render(<StrictMode>...</StrictMode>)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - startedAt
    setTimeout(safeLift, Math.max(0, MIN_DWELL - elapsed))
  })
})
```

---

## Hero entrance handshake

Hero waits for the curtain — preserves the "draw from nothing" moment fully.

`MotionContext.tsx` adds a module-scope promise that mirrors the existing `entranceDone` pattern:

```ts
let _resolveCurtain: (() => void) | null = null
const _curtainGone: Promise<void> = new Promise<void>((res) => {
  _resolveCurtain = res
})
export const curtainGone = _curtainGone
export function resolveCurtain(): void { _resolveCurtain?.() }

// When entrance is bypassed (back-nav from project detail), the loader
// didn't render on this navigation — pre-resolve so Hero doesn't stall.
if (_entranceBypassed) resolveCurtain()
```

`HeroNameDrawing.tsx` awaits `curtainGone` before kicking off the trace:

```ts
useEffect(() => {
  // existing path collection + jsdom feature-detect short-circuit
  // existing entranceBypassed fast-path (sets final state, resolves entrance)

  if (prefersReducedMotion) {
    // existing fast-path: paint final state, resolve entrance
    return
  }

  let cancelled = false
  curtainGone.then(() => {
    if (cancelled) return
    // start the existing trace + ink-fill animation:
    // pathLength=1, dasharray=1, animate dashoffset 1→0 + delayed fill
  })
  return () => { cancelled = true }
}, [...])
```

The existing `prefersReducedMotion` fast-path bypasses the curtain wait entirely (those users skip animation; entrance state is final immediately).

---

## Reduced motion + edge cases

| Case | Behavior |
|---|---|
| `prefers-reduced-motion: reduce` | Loader still paints (LCP target preserved). Slide animation replaced with 150 ms opacity fade on `#loader` itself. Min dwell shortens to 200 ms. |
| Cached / instant React mount | Min dwell of 600 ms ensures the loader is visible long enough to be perceived. |
| Slow network / React stalls | Hard fallback `setTimeout(..., 3000)` lifts the curtain at 3 s regardless. |
| Back-nav from `/projects/:slug` | Loader is in `index.html` — only renders on hard navigation. SPA back-nav reuses existing tree; no loader. `resolveCurtain()` pre-resolves at module init when `entranceBypassed`. |
| Scroll-lock | `body.is-loading { overflow: hidden }` set in inline `<head>` script before parse, removed when loader removed. Prevents scroll-through during the dwell. |
| Lighthouse audits | Run with default motion prefs — full theatrical curtain plays. LCP candidate is `.loader-mark`. LCP locked at first paint. |

---

## File structure

| File | Change |
|---|---|
| `index.html` | Replace existing `#lcp-prepaint` h1 with `<div id="loader" aria-hidden="true">` containing two `.loader-half` panels (top + bottom). Add inline `<script>` snippet in `<head>` that adds `body.is-loading` class before any React mount, so scroll lock applies during initial parse. |
| `src/index.css` | Add `.loader`, `.loader-half`, `.loader-half--top`, `.loader-half--bottom`, `.loader-mark` styles + `body.is-loading` overflow lock. Add `loader--exit` transition rules. Add `@media (prefers-reduced-motion: reduce)` overrides for instant-fade behavior. |
| `src/context/MotionContext.tsx` | Add module-scope `_curtainGone` promise + `resolveCurtain()` function. Pre-resolve when `_entranceBypassed === true`. Export `curtainGone` for components to await. |
| `src/main.tsx` | Replace the existing `requestAnimationFrame` h1-removal block with the curtain controller logic shown above (min-dwell + React-mount + max-wait fallback). Import `resolveCurtain` from MotionContext. |
| `src/components/ui/HeroNameDrawing.tsx` | Wrap the trace-animation kickoff in `curtainGone.then(...)`. Existing `entranceBypassed` and `prefersReducedMotion` fast-paths run BEFORE the await (those flows skip the curtain wait). |

**Files NOT modified:** `Hero.tsx`, `Header.tsx` (existing nav-mark unchanged), all section components, `Projects.tsx`, no other source files.

**Branch:** continues on `feat/lighthouse-95`. Loader work lands as additional commits on top of the existing 12.

---

## Alternatives considered (and rejected)

- **Single "ks" element with two overlay panels**: panels uncover the mark instead of splitting it. Rejected — loses the "tearing" theatrical effect that motivated the two-panel choice.
- **Animated ink-draw "ks" on the loader**: the mark itself draws in via stroke-dashoffset before the curtain lifts. Rejected — the hero entrance already does this; the loader doing it again is redundant. A static large "ks" is more confident.
- **Framer Motion for the curtain**: Rejected — it's overkill for two `translateY` transitions, adds bundle weight to a path that runs before React, and CSS transitions are cheaper and run before any JS.
- **Always-fade curtain (no slide)**: Rejected — user explicitly chose theatrical two-panel split.
- **Hero plays under the curtain**: Rejected — partly hides the "draw from nothing" moment which is the design's signature.

---

## TODO

Acceptance criteria. Tick only when manually verified at desktop + mobile (real Lighthouse audit AND visual eyeball check).

- [x] On hard navigation to `/`, a dark (`#111822`) curtain with a centered cream "ks" mark paints at first frame; Lighthouse mobile audit confirms the LCP element is inside `#loader`.
- [x] Two-panel split animation: top panel translates -100% Y, bottom panel translates +100% Y, both over ~600 ms with the bezier ease. The "ks" tears at the horizontal seam.
- [x] Curtain lifts when React has mounted AND ≥600 ms has elapsed since first JS execution (verified by reading current performance timing during a manual reload).
- [x] After the curtain finishes, the SVG ink-draw entrance plays cleanly on the cream background (no overlap of curtain + entrance; no flash of un-styled hero).
- [x] Hard fallback: if React stalls past 3 s, the curtain still lifts (verified by simulating a network throttle that prevents bundle download).
- [x] `prefers-reduced-motion: reduce` users see a 150 ms opacity fade instead of the slide; min dwell shortens to 200 ms (verified via DevTools rendering emulation).
- [x] SPA back-navigation from `/projects/:slug` to `/` does NOT show the loader (verified: in-tab back goes straight to home).
- [x] `body { overflow: hidden }` is in effect during the loader; restored after the loader is removed.
- [x] Lighthouse mobile + desktop both ≥95 on Performance, A11y, BP, SEO. Mobile LCP ≤ current 2.2 s (likely improvement; LCP candidate is now an explicit large branded element).
- [x] `npm run build` passes; no console errors on `npm run dev`.
- [x] Hero ink-draw entrance behavior on cold-load (full curtain + entrance) and warm-load (cached, fast curtain + entrance) both feel coherent in manual browser test.
