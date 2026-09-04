# Selected work: a scroll-driven 3D scene — design spec

**Date:** 2026-09-03
**Branch:** `feat/selected-work-scene` (off `staging`; merges back into `staging`, never `main` — `main` is frozen until the revamp ships)
**Replaces:** the pinned card stack + SVG gooey title in `src/components/sections/Projects.tsx`,
`src/components/ui/ProjectCardStack.tsx`, `src/components/ui/GooeyTitle.tsx`, `src/utils/stackMotion.ts`.
**Supersedes:** `2026-07-22-selected-work-card-stack-design.md` (mechanics). The light-chapter spec
(`2026-07-22-selected-work-light-chapter-design.md`, Plan B recolour) stays in force: the section
still opens the cream chapter.

## Intent

Selected Work stops being a card stack under a title and becomes a **scene**: a real 3D
environment rendered in a third canvas, where the four featured projects sit as cards along a
**corridor** in depth and scroll drives a **camera dolly** through it. A monumental title floats
in the frame and gooey-morphs between adjacent project names as the camera travels. Nothing on
the page pins or scrubs the way it does today; scroll is still the playhead, but the scene is
also **alive**: everything breathes on its own clock when the page is still.

Emotional target unchanged: confident, controlled, premium. Awake, not restless.

## Decisions (grilling, Kevin 2026-09-03)

| # | decision |
|---|---|
| Q1 | A WebGL scene in a **third canvas**. The invariant becomes *at most two canvases live at once, three mounted*, enforced by the existing off-screen pause. ADR 0009. |
| Q2 | The scene is **cream**: a lit void with cream fog. The section stays the first child of `#chapter-light`; the hero's cream dissolve, the nav flip and the tonal arc are untouched. |
| Q3 | **Dolly.** Cards sit along a corridor in depth; scroll moves the camera forward; each card grows, settles in the slot, then passes the lens. Cards ahead are visible in the fog. |
| Q4 | The title is **in-scene**: a camera-attached plane whose shader does the blur-mix-threshold morph on two text textures (Anton). A visually hidden DOM heading mirrors it. |
| Q5 | Environment: cream fog, a **floor plane carrying blurred shadows** of the cards, a tricolor halo per card, film grain, and **depth of field**. No particles. Floor reflection cut. *Amended in plan review (2026-09-03): the shadows are per-card blurred blob planes on the floor (tinted, no render pass), not a `ContactShadows` pass, which would also cast the title and the halos; grain is desktop-only.* |
| Q6 | A card is the **cover image only** in-scene (rounded plane). Name, `year · tech · tech` and the `view` pill are a **DOM overlay** anchored to the settled front card's projected rect. |
| Q7 | Settled front card **tilts ≤ 6°** toward the pointer (0.15 s lerp, frame loop, no state); the title parallaxes the opposite way at a quarter of the tilt. Touch gets nothing. |
| Q8 | Wrapper **`450svh`**: a 50svh **approach** (card 1 surfaces from the fog while the eyebrow and title resolve), then 100svh per card. |
| Q9 | Reduced motion keeps the pin, renders **on demand**, camera jumps between slot positions at segment midpoints, no morph, no tilt, no ambient, no depth of field. No WebGL / context loss → a plain DOM list of the four cards, no pin. |
| Q10 | Done = Kevin rates the scene designer-grade on the running app at desktop and phone widths, and the section's tests are rewritten. **Performance-specific testing is deferred until this version of the portfolio is live in production**; the existing e2e jank assertions stay (Q19). |
| Q11 | Renderer: **React Three Fiber** (`three`, `@react-three/fiber`, `@react-three/postprocessing` + `postprocessing` for depth of field). Loaded in the section's lazy chunk. Allowlist test updated. *Amended in plan review: `@react-three/drei` is not added (blob shadows replace `ContactShadows`; the camera is R3F's default).* |
| Q12 | Depth of field: focus distance tracks the **slot**; the title sits inside the focal range so it is crisp at rest; modest bokeh, no visible discs; **desktop only**. *Amended in Task 7 (2026-09-04): desktop AND hardware-accelerated only — a software rasteriser skips the composer (422 ms/frame measured under SwiftShader). `worldFocusDistance`/`worldFocusRange` shipped, not the normalised fallback.* |
| Q13 | Floor is the same cream as the fog (no visible horizon, read only through shadows). Cards hover above it. The title casts no shadow. *Amended in plan review: the approved "camera slightly below card centre, 3–5° down" projects the settled card into the upper half of the frame, on top of the title band. The plan's geometry contract is the authority: hover 0.2 card heights, camera ABOVE the card centre (0.61 card heights on desktop, 1.0 on phones), 8° downward pitch; worked framing 1440×900: card 33–83 % from top, title 17–31 %, floor contact 93 %.* |
| Q14 | Phone: **same scene, one layout.** Card ≈ 88vw, lateral corridor offsets scale down with viewport aspect, tilt and depth of field off, contact shadows on. Landscape covers only. |
| Q15 | Tricolor per card = `accentFor(index)` as a **material colour**: a soft low-alpha radial **halo** behind the card; the card's blob shadow is ink mixed 25 % toward `accentDeepFor(index)`; the `view` pill arrow keeps its raw `--row-tint` in the DOM. |
| Q16 | Title in the **upper third** of the frame, camera-relative; card slot centre-lower. Approaching cards rise toward the title band from the horizon and settle just beneath it; while still behind the title plane their tops overlap the band's bottom edge slightly, which is the crossing moment. *(Wording amended in plan review after working the projection.)* |
| Q17 | DOM layer over the scene: the eyebrow (`01 · selected work`) top-left, and the front-card meta overlay. **No position counter.** |
| Q18 | Scroll velocity feeds the ambient layer: a flick adds energy (≤ 4° yaw, signed by direction) that decays in ~0.6 s. |
| Q19 | The e2e CLS (< 0.001) and long-task (≤ 300 ms during scrub) assertions **keep running** against the new scene. |
| Q20 | Vocabulary: **Scene**, **Corridor**, **Slot**, **Approach**, **Playhead** (glossary in `CONTEXT.md`). "Stage" survives only in CSS class names until renamed. |
| Q21 | **Ambient layer**: every pose is `scrollPose(playhead) + ambient(time)`, both pure, read in the frame loop, zero React state per frame. Scroll owns sequence, position, camera and morph; time owns the breath. Energy = **breathing** (~1 % of card height, 4–7 s periods, per-card phase). ADR 0010. |
| Q22 | Ambient is **off** under reduced motion. |
| Q23 | Continuous frame loop while on screen, paused off screen by IntersectionObserver (as `FluidWaves`); on demand under reduced motion. The DOM overlay follows the front card's projected rect every frame by direct style writes. |
| Q24 | Records: ADR 0009 (third canvas via R3F, live-canvas invariant), ADR 0010 (scroll is the playhead, time is the breath — supersedes 0005's "scroll alone"), and a lane rule in `CLAUDE.md`. |
| Q25 | Tests: `stackMotion.ts` + its unit test deleted; `sceneMotion.ts` pure helpers TDD'd; scrub, reduced-motion and a new no-WebGL e2e; CLS/long-task kept. |
| Q26 | The chunk warms on idle after LCP like every below-fold section; covers load through Suspense behind the existing `100vh` shell; the scene fades in over ~0.4 s when ready, never popping mid-scroll. |

## Scene anatomy

**Section** `#projects.section.projects-scene-section` (still first inside `#chapter-light`, cream, `overflow: visible`):

- `nav.scene-skiplinks` — visually-hidden-until-focused index, one `<Link>` per featured project (kept from today).
- `div.scene-scroll` — `height: 450svh`, the scroll wrapper (Framer `useScroll` target). Height is COUPLED to n = 4: 50svh approach + 4 × 100svh.
- `div.scene-sticky` — `position: sticky; top: 0; height: 100svh; overflow: hidden`.
  - `div.scene-canvas-wrap` — holds the R3F `<Canvas>`; `data-canvas="selected-work-scene"`, `data-paused` / `data-static` like the other canvases; opacity 0 → 1 over 0.4 s once textures resolve.
  - `p.scene-eyebrow` — `01 · selected work` (today's `.stack-eyebrow`, unchanged look: muted, uppercase, 0.18 em tracking, deep-pink numeral).
  - `h2.scene-title-sr` — visually hidden, current project title (`title[lang]`), updated from `frontIndex`.
  - `div.scene-meta` — the front-card overlay: `.scene-meta-name` (Jakarta 700, ink), `.scene-meta-subtitle` (`year · tech · tech`, ink-muted), `.scene-meta-pill` (`<Link>` to `/projects/:slug`; ink pill, cream `view` text, arrow in raw `--row-tint`). Positioned every frame from the front card's projected bottom edge; opacity follows the settle window (visible only while the card is settled; `pointer-events: none` otherwise); the link is interactive only for `frontIndex`. Visible cream/ink `:focus-visible` ring.
- `div.scene-fallback` — rendered INSTEAD of `.scene-scroll` when WebGL is unavailable or after context loss: four framed cards (cover, name, subtitle, `view` link) in normal flow, no pin. Uses the light-chapter card anatomy (white, 16 px radius, hairline border).

**Inside the canvas** (R3F, `dpr={[1, 1.5]}`, `gl={{ alpha: false, antialias: true }}`, clear colour = `--color-surface-light` `#F5F2EC` so the canvas edge is invisible against the section; colour management set so the cream matches sRGB exactly):

- **Camera**: perspective, sits slightly below card centre with a 3–5° downward tilt; its z is a pure function of the playhead (Scroll mapping below). Title plane and the depth-of-field focus are attached to it.
- **Fog**: `THREE.Fog` in cream; near/far tuned so the next card is visibly soft, the two behind it are ghosts. Fog density drifts ±3 % on the ambient clock.
- **Floor**: a large cream plane under the corridor (same hex as fog, no visible horizon). Each card has its own soft blurred blob-shadow plane on the floor, ink mixed toward its deep tint, lightening as the card bobs up. No shadow render pass.
- **Corridor**: four cards at positions `i = 0..3` along −z at a fixed spacing, alternating a lateral offset (±~0.35 card widths) and a small yaw (∓~8°) so each card faces the camera as it arrives. On phones the lateral offset scales down with aspect.
- **Card**: a rounded-corner plane (radius in the fragment shader, 16 px equivalent) carrying `mockups.stackCover` (1024×608 webp, top-crop) on a white 12 px-equivalent frame with a hairline edge — the Shadway anatomy in 3D. Hovers ~⅓ card height above the floor.
- **Halo**: a larger plane behind each card with a radial-gradient shader in `accentFor(i)`, normal blending, low peak alpha (~0.35), pulsing ±15 % on the ambient clock.
- **Title**: camera-relative plane in the upper third (positioned from the camera pose every frame; not parented to R3F's default camera, which is outside the scene graph), monumental Anton (equivalent to `clamp(56px, 9vw, 150px)`), ink. Two text textures (current, next) drawn on an offscreen 2D canvas at the capped DPR, `document.fonts.load` awaited; re-drawn on language change. The fragment shader reproduces today's morph: incoming/outgoing blur that grows toward the midpoint, alpha mix, then a hard threshold (today's `255 −170` matrix as `smoothstep`). Blur technique is the plan's call (mip LOD sampling is the candidate) — the acceptance bar is visual parity with today's gooey morph.
- **Depth of field**: `@react-three/postprocessing` `DepthOfField` (desktop only, `pointer: fine` and width ≥ 768); focus distance = distance to the slot; focal range wide enough that the title stays crisp; bokeh scale modest.
- **Grain**: a subtle film grain in the post pass (desktop) or in the card/halo shaders (phone).

## Scroll mapping (pure functions, unit-tested, `src/utils/sceneMotion.ts`)

- Framer `useScroll({ target: wrapper, offset: ['start start', 'end end'] })` → `scrollYProgress` `p ∈ [0, 1]`. Scrub distance is 350svh (450 − the 100svh sticky stage).
- **Playhead** `seg = p · 3.5 − 0.5`, range `[−0.5, 3]`: `seg = i` means card `i` is in the slot; `seg = −0.5` is the start of the approach (camera half a spacing behind card 0, card 0 surfacing from the fog).
- **Settle plateaus** kept from today: within each unit segment the transition occupies the middle 70 % (`settleFrac`), so pin edges and every integer `seg` are settled states.
- Helpers, explicit return types, all pure:
  - `playheadFor(p): number`
  - `segmentFor(seg, n): { index, frac }` and `settleFrac(frac)` (carried over)
  - `cameraZ(seg): number` — eased through `settleFrac` per segment
  - `cardPose(i, seg, aspect): { x, y, z, yaw, opacity }` — corridor position, lateral offset scaled by aspect, fade over the last 0.3 before the card passes the lens
  - `focusDistance(seg): number`
  - `morphValues(frac): { incoming, outgoing }` (carried over)
  - `ambientOffset(i, t): { y, yaw, pitch, haloAlpha }` — sines on per-card periods (4–7 s) and phases; amplitude 1 % of card height, ±1.5°
  - `velocityEnergy(prev, v, dt): number` — 0.15 s attack, 0.6 s decay; yields the ≤ 4° yaw and up to 2× ambient amplitude
- **Frame loop** (`useFrame`): reads `scrollYProgress.get()` and `useVelocity(scrollYProgress).get()`, the clock, and the pointer; writes object transforms, uniforms, the focus distance and the overlay's `style.transform` directly. **Zero React state per frame.**
- **`frontIndex`** state flips only when `settleFrac(frac) ≥ 0.5` (reduced motion: `Math.round`), and feeds only non-visual attrs: the overlay `<Link>`, aria, the SR heading text, the `--row-tint*` vars.
- **Pointer tilt**: settled card only, ≤ 6°, lerped 0.15 s in the loop; title parallax at ¼, opposite sign.

## Lanes

- The **R3F frame loop reads Framer MotionValues**; Framer never animates a three object; GSAP stays entrance-only. Framer's own lane (state-driven DOM motion) still owns the overlay's opacity transitions and the section's DOM entrance.
- Scroll owns sequence, position, camera and morph; **time owns the breath** (ADR 0010).

## Accessibility

- Keyboard: skip-link index (kept), overlay `view` link with a visible focus ring; buried cards have no DOM presence, so nothing to hide.
- Screen readers: the visually hidden `h2` names the current project; the canvas is `aria-hidden`.
- Contrast: the overlay reads the Plan B on-light table (name ink on white/cream ≥ 15:1, subtitle ink-muted 5.2:1, pill cream-on-ink). The in-scene title is ink on cream fog: ≥ 15:1 at rest; during a morph it is decorative (the SR heading carries the name).
- Reduced motion: Q9. No WebGL: the DOM fallback list.

## Canvas rules (shared with `FluidWaves`)

- DPR capped at 1.5; IntersectionObserver toggles `frameloop` `always` ↔ `never` and `data-paused`; reduced motion → `frameloop="demand"`, `data-static="true"`, `invalidate()` on `frontIndex` change and resize.
- Context loss → `setWebglFailed(true)` → the DOM fallback, permanent for the session.
- **Invariant**: at most two canvases live at once (hero + scene overlap only across the hero's dissolve band; backdrop is far below), three mounted.

## Dependencies

Added to `dependencies` and to the allowlist in `tests/unit/bundle-deps.test.ts`: `three`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing` (no `@react-three/drei`). All of them import only from the section's lazy chunk; `Home.tsx` warms it on idle after LCP as it does today.

## Tests

- **Unit**: `tests/unit/sceneMotion.test.ts` (replaces `stackMotion.test.ts`): playhead range, settle plateaus, camera monotonic in `seg`, card pose continuity at pass-through, focus distance equals the slot distance at integer `seg`, morph symmetry at the midpoint, ambient zero-mean and bounded, velocity energy attack/decay bounds. `bundle-deps.test.ts` allowlist updated.
- **E2E**: `scene-scrub.spec.ts` (midpoints change the front project via the SR heading and the overlay link; reversing restores; the link navigates), `scene-reduced-motion.spec.ts` (pins, `data-static`, swaps without flight, overlay swaps instantly), `scene-no-webgl.spec.ts` (Chromium launched with WebGL disabled → `.scene-fallback` with four links, no pin). `perf-budget.spec.ts` untouched and passing.
- Selector-only updates in `light-chapter`, `nav-on-light`, `section-enters`, `reduced-motion` specs as needed.
- Browser smoke per slice (loads, root renders, zero console errors) per the global rules; Lighthouse on the production build is advisory only (Q10).

## Out of scope

Floor reflection, particles, a portrait art set, a position counter, the perf harness itself (deferred to production), any change to the hero, Archive, or the chapter's other sections beyond selectors.

## Records to update

- `docs/adr/0009-selected-work-scene-is-a-third-canvas-rendered-by-r3f.md`, `docs/adr/0010-scroll-is-the-playhead-time-is-the-breath.md` (0005 marked superseded in part).
- `CLAUDE.md`: Selected Work bullet rewritten; canvas invariant reworded (two live, three mounted); NO list: "a third canvas anywhere" → "a fourth canvas", "the R3F hero accent" stays; the lane rule; Tech Stack's R3F line becomes true again.
- `CONTEXT.md`: Selected Work scene, Scene, Corridor, Slot, Approach, Playhead; the canvas invariant; the R3F contradiction resolved.
- `README.md`: the 3D layer line becomes accurate.

## TODO

- [x] Scene renders in a third canvas inside `#chapter-light`, cream, invisible canvas edge, and the hero dissolve/nav flip are unchanged.
- [x] Scroll dollies the camera through the four-card corridor; every integer playhead is a settled state; reversing scroll reverses the motion exactly.
- [x] The in-scene title morphs between adjacent names with visual parity to today's gooey morph, crisp at rest, in both languages.
- [x] Floor shadows, tricolor halos, fog and depth of field (desktop) render as specified; no particles, no reflection.
- [x] The scene breathes at idle (Q21 amplitudes) and gains energy on a flick; zero React state per frame (`frontIndex` feeds only non-visual attrs).
- [x] Overlay meta tracks the settled card, links to the project, has a visible focus ring; skip-link index and SR heading work.
- [x] Reduced motion: pinned, static, on-demand renders, instant swaps, no ambient. No WebGL / context loss: the DOM fallback list.
- [x] Phone: same scene at ≈ 88vw cards, tilt and DoF off, shadows on.
- [x] Canvas rules: DPR ≤ 1.5, off-screen pause, `data-*` attrs, at most two live canvases.
- [x] Tests per the Tests section pass; CLS and long-task e2e assertions pass unchanged.
- [x] Records updated (ADR 0009, 0010; CLAUDE.md; CONTEXT.md; README).
- [ ] Kevin rates the scene designer-grade on the running app at desktop and phone widths.
