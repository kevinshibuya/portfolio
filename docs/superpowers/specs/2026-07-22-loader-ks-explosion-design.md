# Loader exit: KS vignette explosion — design spec

**Date:** 2026-07-22
**Branch:** `design/webgl-pivot` (extends the feature-complete branch; merge decision still pending)
**Replaces:** the six-stain ink-bleed loader exit (`main.tsx` stain timeline + `.loader-stains` in `index.html`)

## Intent

The `ks.` glyph cutout in the loader mask already acts as a vignette — transparent windows
peeking at the live hero shader. Instead of dissolving the ink with growing stains, the cutout
itself becomes the exit: after a savoring dwell, the whole `ks.` mask contracts slightly
(anticipation), then explodes outward until the viewport sits entirely inside a letterform
window and the hero is fully revealed. A zoom-through-the-logo reveal.

Emotional target: confident, monumental, controlled power — Premium personality (0% overshoot,
signature house ease where a decelerate is wanted, accelerate family for the exit).

## Motion sequence (normal motion)

| # | Phase | What moves | Duration | Ease | Notes |
|---|-------|-----------|----------|------|-------|
| 1 | Peek (savor) | Nothing (shader drifts in windows) | dwell **1200ms** after React paint (was 600ms) | — | Stand-in gradient fades on mount as today; the extended dwell is the "vignette peeking" beat |
| 2 | Anticipation | Mask glyph group scales 1 → **0.96** | **0.18s** | house `0.22,1,0.36,1` (decelerate into the crouch) | Subtle gather; Premium-subtle 4% |
| 3 | Explosion | Mask glyph group scales 0.96 → **~45** | **~1.1s** | accelerating ease-in (`power4.in` start point; `expo.in` if too soft — tuned visually) | Slow creep out of the crouch, then blow-through. No inOut: the decel tail would play off-screen. No overshoot (it exits) |
| 3b | Secondary: meta labels | Both corner labels drift **~12px outward+down** and fade to 0 | **0.22s** | ease-in (accelerate — they exit) | Fires as the explosion launches. Not opacity-only |
| 4 | Handoff | `resolveCurtain()` + `resolveEntrance()` → hero text rise (unchanged) | fires at **~80% of the explosion** (tuned visually with the final curve) | — | GSAP `power4.in` is quintic (t⁵): the ink clears the lower-left name region (scale ≈ 15.6×) at ~80% of the explosion, not 50%. Keep the wall-clock `setTimeout` pattern (GSAP position callbacks proved unreliable here) |
| 5 | Cleanup | `finishLoader()` at explosion end | — | — | Unchanged: remove loader, release scroll lock, `data-loader-state="done"` |

Motion layers: **primary** = mask expansion; **secondary** = label drift+fade; **ambient** =
live shader drifting inside the windows (pre-existing).

Total post-paint time ≈ 1.2 + 0.18 + 1.1 ≈ **2.5s** (current bleed ≈ 3.1s — slightly shorter
overall despite the longer savor).

## Mechanics

- Animate a **new inner wrapper `<g class="loader-ks">`** around the three glyph paths inside
  `#loader-mask`, via GSAP `attr`/transform each frame. The existing outer
  `translate(30.74 39.34) scale(0.02861)` positioning group stays untouched.
- SVG mask re-rasterizes per frame → letterform edges stay vector-crisp at 45×. This is cheaper
  than the current bleed (which pushes six circles through an `feTurbulence` displacement filter
  per frame). Rejected alternative: CSS-transforming the whole SVG (GPU layer magnification →
  blurry edges at 45×).
- **Scale origin sits inside the `k` stem** so the blow-through ends fully transparent:
  stem spans glyph-x 60.5–191.75, full height → viewBox point **(34.35, 49.8)**. Origin math is
  viewport-independent (`preserveAspectRatio="xMidYMid slice"` crops what's visible, never the
  mask geometry).
- **End scale 45**: worst-case visible corner needs ~35× for the stem window to cover the
  viewport; 45 gives ~28% margin.
- Implementation: transform about a fixed point = `translate(ox oy) scale(s) translate(-ox -oy)`
  composed inside the wrapper `<g>`, driven by a single GSAP tween on a proxy value.

## Deletions

- The six `.loader-stains` circles and their `<g>` (index.html).
- The `#loader-stain-rough` `feTurbulence`/`feDisplacementMap` filter (index.html).
- `ENDS`, `DELAYS`, `STAIN_DURATION`, `STAIN_EASE`, stain query/timeline code (main.tsx) —
  replaced by the anticipation+explosion timeline.
- `.loader--handoff` label CSS opacity rule migrates to the GSAP label drift (3b) — the class
  hook may stay if the e2e specs key on it.

## Unchanged

- Loader paints at first byte; stand-in gradient + `.loader--mounted` reveal flow.
- Reduced motion: 200ms dwell, 150ms whole-loader opacity fade, **no explosion**, static shader
  frame. Untouched.
- 3s hard fallback (`MAX_WAIT_MS`), scroll-lock lifecycle, `data-loader-state` stamps,
  `entranceBypassed` SPA back-nav skip, defensive no-loader / GSAP-throw paths.
- Hero text rise itself (Framer, staggered, house ease) — only its trigger time shifts.
- GSAP-only lane for the one-shot exit (no Framer here).

## Verification

- Visual: explosion clears the full viewport at mobile portrait (390×844), desktop 16:9, and
  ultrawide 21:9 — no residual ink sliver at any corner (screenshot sweep at end scale).
- Handoff: name region fully clear of ink when the rise starts (screenshot at handoff frame).
- e2e: `loader` + `hero-entrance` specs updated for the new timeline constants; run
  `--workers=1` (parallel intro flake is contention, not regression — see HANDOFF).
- Reduced-motion spec still passes untouched.
- AA/contrast: unaffected — no text/background pair changes (hero scrim + rise unchanged).
- `npx tsc -b`, `npm run test:unit`, full Playwright serial run green.
- CLAUDE.md loader bullet rewritten to describe the explosion exit (keep it true).

## TODO

- [x] Stain circles, turbulence filter, and stain constants deleted; mask gains the `.loader-ks` wrapper group
- [x] Anticipation (0.96×, 0.18s, house) → explosion (→45×, ~1.1s, accelerating ease-in) timeline drives the mask wrapper about origin (34.35, 49.8)
- [x] Savor dwell extended to 1200ms (reduced-motion dwell stays 200ms)
- [x] Corner meta labels drift ~12px outward+down while fading (0.22s ease-in) at explosion launch
- [x] Handoff (`resolveCurtain`/`resolveEntrance`) fires when the ink has cleared the name region (~80% of explosion, visually tuned) via wall-clock setTimeout
- [x] Explosion fully clears the viewport at 390×844, 16:9, and 21:9 (no ink slivers)
- [x] Reduced-motion, hard-fallback, and defensive paths behave exactly as before
- [x] e2e loader/hero-entrance specs updated and green serial; unit + tsc green
- [x] CLAUDE.md loader/entrance bullets updated to match
