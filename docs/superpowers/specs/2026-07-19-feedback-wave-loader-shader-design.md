# Feedback Wave — Smooth Shader, Ink-Bleed Loader, Shared Canvas, Float Fix

**Date:** 2026-07-19 · **Branch:** `design/webgl-pivot` (continues on top of the completed WebGL pivot, HEAD `df13723`)
**Source:** Kevin's manual taste-testing pass (HANDOFF "Kevin's open calls" item 1). All design decisions below were made interactively (visual companion session `.superpowers/brainstorm/27358-1784491298`).

## Decisions (ratified by Kevin)

1. **Shader look:** fully smooth — remove the pixel-quantization pass; keep the 1.5 DPR cap.
2. **Loader:** concept "B · paint-filled mark" — centered **ks.** whose glyphs are transparent windows onto the live shader, editorial meta in the four corners — with exit "B1 · ink bleed" (stains dissolve the ink to reveal the hero). The horizontal curtain split is retired.
3. **Entrance:** "reveal finished hero" — the bleed IS the entrance. The GSAP rise cascade (role/name/meta) is retired. This supersedes the old "entrance cascade is inviolable" rule by Kevin's explicit call.
4. **Contact/Footer stage:** hero's fluid-waves shader at "dimmed murmur" strength (~30%) replaces `LiningWavesBackdrop` (deleted).
5. **WorkRow float:** first-hover fly-in from top-left is a bug; float must materialize at the cursor.

## 1 · Smooth shader (both canvases)

In the fragment shader, compute UVs directly from `screen_coords` — delete the `floor(screen_coords * (1/pixel_size)) * pixel_size` quantization, the `pixel_filter` uniform, and the `PIXEL_FILTER` constant. Everything else (seeded scatter warp, tricolor paint math, contrast fold) is unchanged. DPR cap stays 1.5 — with no hard quantization edges, 1.5 is visually clean and the perf envelope is untouched.

## 2 · Shared canvas component

Extract the WebGL boilerplate (context setup, shader compile/link, resize, rAF loop, IO pause, reduced-motion static frame, context-loss → fallback, cleanup) plus the shader source into **`src/components/canvas/FluidWaves.tsx`**, parameterized by:

- `variant: 'hero' | 'backdrop'` — controls class/test-id and the dimming treatment.
- Backdrop dimming is CSS on the canvas element: `opacity: ~0.32` + `filter: saturate(0.7)` over the page ink (equivalent to mixing the paint toward `--bg`; no shader changes needed).

Consumers:

- **Hero**: `FluidWavesHero` becomes a thin wrapper (or is replaced by `<FluidWaves variant="hero">`); scrim, fallback div, and test-ids (`fluid-waves-fallback`) keep working.
- **Contact/Footer stage** (`Home.tsx`): `LiningWavesBackdrop` is deleted (component + styles + tests); the existing `stageApproached` lazy-mount gate now mounts `<FluidWaves variant="backdrop">`. Max-2-canvases rule still holds.
- Each `FluidWaves` instance gets its own random seed (hero and backdrop scatter independently).

**rAF gate change:** the loop starts at mount (subject to IO visibility + reduced motion), not at `entranceDone`. This is what makes the shader already animate during the loader bleed and kills the frozen-shader-for-seconds symptom.

## 3 · Loader: translucent ks. + ink-bleed exit

**Structure** (still painted from `index.html` at first byte, inline CSS, before the bundle arrives):

- Full-viewport overlay containing one inline `<svg>`: an ink (`#0B0E14`) rect masked by a `<mask>` = white rect + **black ks. glyph `<path>` outlines** (static paths extracted once from Plus Jakarta Sans 700 — no `<text>`, no font dependency, no FOUT morph) + (during exit) black stain blobs.
- The glyph windows are literal holes: whatever is behind the overlay shows through.
- Behind the overlay, inside the loader element: a dim tricolor CSS-gradient stand-in (subtly animated) so the windows read as paint from the very first frame, pre-React. When React mounts, the real hero canvas (already looping) sits behind it; the stand-in fades out and the windows now show live shader. The swap must be seamless (stand-in mimics the dimmed paint character).
- Corner meta: four corners of small **cream HTML text on the ink** (crisp, not windows): `kevin shibuya / senior front-end engineer` (TL), `porto alegre, br / −30.03, −51.23` (TR), `portfolio · 2026` (BL), `react · typescript · webgl` (BR). Hardcoded EN — the loader is pre-i18n brand surface; documented as accepted behavior.

**Exit sequence** (orchestrated from `main.tsx`, which already owns the lift):

1. React mounted + min-dwell elapsed (keep ~600 ms dwell, 3 s hard fallback) → start the bleed.
2. GSAP (imported in `main.tsx`) grows 5–6 stain blobs in the SVG mask at staggered points/delays over ~900 ms total, until the ink is fully dissolved. Blobs get organic edges via an SVG `feTurbulence`+`feDisplacementMap` filter on the mask's stain group; if the filter proves unreliable on any target browser, smooth-edged stains are the accepted graceful fallback (no feature gate needed — it degrades visually only).
3. Loader element removed → `resolveCurtain()` → `resolveEntrance()` immediately (no cascade). `data-loading` overflow lock is held until removal.
4. **Reduced motion:** no bleed — keep today's simple opacity fade (~150 ms) and the static single-frame shader.

Total intro ≈ 1.5 s (dwell + bleed), comparable to today's curtain.

## 4 · Entrance retirement

- `Hero.tsx`: delete the entrance timeline (paint bloom, role rise, name-line masked rises, meta fade). The hero renders in its settled final state from first React paint — the current `entranceBypassed` path effectively becomes the only path. Role cycling, scrim, anatomy, markup all unchanged.
- `MotionContext` keeps its public shape (`curtainGone`, `entranceDone`, resolvers) so consumers don't churn; `resolveEntrance()` now fires at bleed completion. Audit remaining `entranceDone` consumers (canvas gate is being removed; check role-cycle timing, tests) during planning.
- Entrance-related CSS (`.hero-mask`/`.hero-line` clip machinery) may be deleted if nothing else uses it; keep the class names on the DOM only if tests/styling still reference them, otherwise simplify markup.
- Back-nav replay behavior is unchanged by definition (it already skipped to settled state).

## 5 · WorkRow float first-hover fix

In `WorkRow.tsx` `onMouseEnter`: teleport the tracking values to the pointer position **before** making the float visible — `cursorX`/`cursorY` AND `springX`/`springY` via MotionValue `.jump()` (Framer Motion v12; verify exact API with context7 — the intent is: no spring animation from the initial `(-400, -400)`, zero movement on materialize). Subsequent in-row tracking keeps the spring feel. Applies to Projects and Archive automatically (shared component).

## 6 · Verification & budgets

- **Baseline (measured 2026-07-19, `npx vite preview` on branch HEAD `df13723`):** Lighthouse perf 97 / a11y 100 / bp 100 / seo 100, LCP 0.9 s; unit 60/60; e2e 38 pass / 2 skip.
- **Budgets for this wave:** perf ≥ 95, LCP ≤ 1.5 s (LCP is *expected* to shift from the loader mark to the hero name — the mask windows are not LCP candidates; the settled hero name paints at React mount and is LCP-eligible). If a budget is breached, that is a defect to fix, not to renegotiate.
- **AA:** recompute the contrast table rows for Contact/Footer text over worst-case dimmed paint (brightest tricolor region × 0.32 over `#0B0E14`). Hero pairs unchanged (scrim untouched). Standing rule applies: verified, not hoped.
- Unit + e2e specs asserting the curtain/entrance (loader classes, hero entrance states, LiningWavesBackdrop) are updated as one batch **before** implementation tasks begin (baseline-verify rule).
- Real-browser mount smoke for the loader sequence: page loads → windows show paint → bleed reveals settled hero → zero console errors. Manual visual confirmation by Kevin at the end.

## 7 · Docs & memory

- `CLAUDE.md` Design Direction: rewrite Canvases (shared `FluidWaves`, backdrop variant, no `LiningWavesBackdrop`), Loader/Entrance sections (ink-bleed loader, settled hero, no cascade), NO-list additions (curtain split, rise cascade, `LiningWavesBackdrop`), keep max-2-canvases.
- Memory updates: `feedback_hero_entrance_inviolable` (superseded by Kevin's reveal-finished-hero call), `feedback_entrancedone_test_pollution` (stale — HeroNameDrawing long deleted; entrance gate now trivial).

## Out of scope

ProjectDetail dark polish, legacy CSS-var alias cleanup, pt.json `projectDetail.routesCount_*` (all pre-existing accepted debt), any section reordering, nav changes.

## TODO (acceptance criteria — tick only on passing test + review)

- [ ] Shader renders smooth (no visible quantization blocks) on both canvases; DPR cap 1.5 retained; scatter/tricolor character preserved.
- [ ] Single shared `FluidWaves` component powers hero (full) and contact/footer backdrop (dimmed ~30%); `LiningWavesBackdrop` fully deleted (component, styles, tests, imports).
- [ ] Backdrop keeps lazy mount near viewport, IO pause, reduced-motion static frame, WebGL-failure fallback; hero fallback test-id still passes.
- [ ] Shader rAF loop runs from mount (no `entranceDone` gate): paint is visibly animating during the loader bleed and immediately on hero reveal.
- [ ] Loader shows ks. glyph-window mark (path outlines, no font dependency) + four-corner cream meta from first paint; windows show paint pre-React via the gradient stand-in, live shader post-mount, seamless swap.
- [ ] Ink-bleed exit: staggered organic stains dissolve the ink over ~900 ms revealing the settled hero; loader removed; `resolveCurtain()`/`resolveEntrance()` fire; reduced-motion path = simple fade + static frame.
- [ ] Hero entrance cascade deleted; hero renders settled from first React paint; role cycling and back-nav behavior unchanged.
- [ ] WorkRow float materializes at the cursor on first hover (no fly-in from top-left) in Projects and Archive; tracking spring feel unchanged within the row.
- [ ] Full battery green: unit + e2e (updated as one pre-implementation batch), typecheck, lint.
- [ ] Lighthouse on `npx vite preview`: perf ≥ 95, LCP ≤ 1.5 s (baseline 97 / 0.9 s recorded above).
- [ ] AA contrast table recomputed for contact/footer text over dimmed paint; all affected pairs pass.
- [ ] CLAUDE.md Design Direction + memory files updated to the new system.
