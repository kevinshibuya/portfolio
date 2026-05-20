# About — Cinematic Scroll Rework (Design Spec)

Replace the existing two-column "bio + 4 tactics" About section with a pinned, all-in-canvas cinematic experience inspired by [labs.noomoagency.com](https://labs.noomoagency.com). A wind-up tin-robot toy disassembles and re-assembles across three scroll-driven beats that tell a chronological personal story — past (childhood / origins), present (current craft), future (AI-augmented engineering). No `SectionHeading`, no MarqueeDivider above, no left-column tactics — the section becomes a single immersive moment between Hero and WorkExperience.

Story arc grounded in user-authored material; centerpiece sourced from Sketchfab CC-BY model (with named technical fallback chain). The four existing "tactics" are deleted in this rework — methodology may surface in case studies or a future dedicated section, not here.

## TODO

- [ ] `src/components/sections/About.tsx` rewritten as a thin orchestrator: chooses `<AboutScene>` (canvas) on desktop with full motion, or `<AboutFallback>` (DOM-only poster + stacked text) on mobile (`max-width: 900px`) or under `prefers-reduced-motion: reduce`
- [ ] Existing About content removed: bio paragraph, 4 numbered tactics, `SectionHeading`, `Stagger` use, `.about-grid` / `.about-bio*` / `.about-tactic*` CSS — replaced wholesale
- [ ] i18n keys `sections.about.title`, `sections.about.bio`, `sections.about.tactics[]` removed from `en.json` and `pt.json`; new keys added: `sections.about.label` (a11y label for the section landmark), `sections.about.attribution` (3D model credit string), and `sections.about.beats[0..2].{eyebrow,title,body}` in both EN and PT
- [ ] New module `src/data/aboutBeats.ts` exports a typed `BEATS` array of length 3, each item: `{ id, titleKey, bodyKey, eyebrowKey, choreography: { /* part-position deltas per beat boundary */ } }`. Single source of truth consumed by both `<AboutScene>` and `<AboutFallback>`
- [ ] New directory `src/components/canvas/AboutScene/` with: `AboutScene.tsx` (top-level lazy-loaded entry, owns the `<Canvas>` + Suspense), `Scene.tsx` (scene graph: lights, `<ToyModel>`, three `<BeatText>` instances, counter), `ToyModel.tsx` (loads `/models/about-toy.glb` via `useGLTF` from drei, traverses children, exposes per-part refs, applies palette material override), `BeatText.tsx` (drei `<Text>` billboard wrapper handling font load, anchor, opacity transform), `useAboutProgress.ts` (Framer `useScroll` + `useTransform` hook reading the outer wrapper's scrollYProgress 0→1)
- [ ] New `src/components/ui/AboutFallback.tsx`: DOM-only fallback rendering `<picture>` with `about-toy-poster.webp` (with `.png` fallback `<source>`) + three `<article>` blocks (one per beat) stacked vertically. Uses the existing `Stagger` recipe for viewport-entry fade-up; no R3F import, no canvas
- [ ] 3D model lives at `public/models/about-toy.glb`. Sourced from Sketchfab — primary candidate "Vintage Toy Robot" (Horikawa Star Strider, UID `7780d6de101b47e085fc5397f7e33701`, CC-BY, 8.7k vertices, 16.7k faces). Secondary "Cowboy Tin Robot" (UID `80e43481b20648a7940fd8737a30bafe`, CC-BY, 9.2k vertices). Engineering fallback "Robot No.1 Rigged Animated" (UID `9f8f0c6fc1ce4fc08e19ead884ee4b98`, CC-BY) chosen only if neither A nor B yields separable parts after Blender inspection. Final selection recorded in the implementation plan's Task 1 output
- [ ] Model preparation pipeline (one-time, during implementation): (a) download glb from Sketchfab, (b) inspect with `npx gltf-transform inspect public/models/about-toy.glb` and write the scene tree to the plan's Task 1 notes, (c) if model has ≥4 separable mesh nodes use as-is; if model is one fused mesh open in Blender and run `Edit Mode → Select All → P → By Loose Parts`, rename loose parts to semantic names (`head`, `torso`, `arm-l`, `arm-r`, `leg-l`, `leg-r`, `key`, `base`, `antenna` — actual names depend on the model), re-export glb; if loose-parts separation fails, switch to secondary, then fallback model. (d) Optimize with `npx gltf-transform optimize` (draco + dedup). Target: <500 KB on disk
- [ ] Runtime material override: `<ToyModel>` traverses the loaded scene graph and replaces each mesh's `material` with a new `MeshStandardMaterial` colored from the portfolio palette (sky-blue `#A2D2FF` / mist `#D4E5F2` / dust `#6A8CAA`). Source textures discarded. Identical material logic for all three candidate models so the page renders consistently regardless of which one shipped
- [ ] Outer wrapper in `About.tsx` is `300vh` tall on desktop; inner `<div>` wrapping the canvas is `100vh` with `position: sticky; top: 0` — pinning achieved via CSS sticky, no GSAP ScrollTrigger
- [ ] `useAboutProgress` reads `scrollYProgress` from `useScroll({ target: outerRef })` for the outer wrapper, with `offset: ['start start', 'end end']`. Returns the 0→1 progress motion value plus three derived per-beat opacity motion values
- [ ] `<ToyModel>` part choreography (deterministic, scroll-driven, no `useFrame` ticking):
  - progress `0.00 → 0.33`: per-part `position = lerp(scatteredPosition, assembledPosition, t)` where `scatteredPosition = assembledPosition + scatterOffset` and `scatterOffset` is a per-part deterministic vector seeded by part index (e.g., `new THREE.Vector3((seed * 13.37) % 4 - 2, (seed * 7.13) % 4 - 2, (seed * 11.1) % 3 - 1.5)`)
  - progress `0.33 → 0.66`: parts hold at `assembledPosition`; whole toy rotates `~30°` on Y axis (rotation = `lerp(0, π/6, t)`)
  - progress `0.66 → 1.00`: per-part `position = lerp(assembledPosition, assembledPosition + spreadDirection * 0.3, t)`, where `spreadDirection` is the part's outward radial vector from origin with `+0.2y` bias; a network of thin drei `<Line>` segments connecting parts fades in (`opacity = useTransform([0.66, 1.0], [0, 0.6])`)
- [ ] Camera: `<PerspectiveCamera makeDefault position={[0, 0, 5]} fov={35}>`, static — no orbit, no zoom, no `useFrame` movement. All visual change comes from animating scene contents, not the camera
- [ ] Lighting: one `<ambientLight intensity={0.6} color="#F6F9FC">` plus one `<directionalLight position={[3, 4, 5]} intensity={0.9} color="#FFFFFF">`. No shadow maps
- [ ] Background: canvas is transparent (`gl={{ alpha: true }}`); the page's `bg-bg-cream` shows through. A single large `<mesh>` at `z = -10` with a soft sky-blue gradient `<meshBasicMaterial>` provides atmosphere
- [ ] Three `<BeatText>` billboards rendered as children of the scene root, plus a small counter and a headline-behind:
  - `eyebrow` (top-left, e.g., `01 — origin`): small caps, drei `<Text>` font weight 400, `fontSize ~0.18`, color `#6A8CAA` (dust), `anchorX="left" anchorY="top"`, position `[-2.2, 1.4, 1]`
  - `headline-behind` (centered behind toy, e.g., `how i got here.`): drei `<Text>` font weight 800, `fontSize ~0.85`, color `#D4E5F2` (mist), `anchorX="center" anchorY="middle"`, position `[0, 0, -0.5]`
  - `body-caption` (bottom-center): drei `<Text>` font weight 500, `fontSize ~0.2`, color `#2A4060` (bark), `maxWidth=4.0`, `anchorX="center" anchorY="bottom"`, position `[0, -1.6, 0.5]`
  - `counter` (bottom-right, e.g., `01 / 03`): drei `<Text>` font weight 400, `fontSize ~0.16`, color `#6A8CAA`, `anchorX="right" anchorY="bottom"`, position `[2.2, -1.6, 1]`
- [ ] Beat-text crossfade: each of eyebrow/headline-behind/body-caption uses three swappable string sources keyed by beat index. The string shown at scroll progress `p` is `beats[clamp(floor(p * 3), 0, 2)].t(key)`. Each individual `<BeatText>` group has `opacity = useTransform(scrollYProgress, [enterStart, enterEnd, exitStart, exitEnd], [0, 1, 1, 0])` so beats fade out as the next fades in with `~22%` overlap of the scroll range
- [ ] Counter (`01 / 03`, `02 / 03`, `03 / 03`) reads `Math.min(Math.floor(scrollYProgress * 3), 2) + 1` and renders `{n} / 03` — static `/ 03` denominator
- [ ] drei `<Text>` font: load Plus Jakarta Sans variable TTF from `/fonts/PlusJakartaSans-VariableFont_wght.ttf` (existing file). Each `<BeatText>` passes the URL as the `font` prop. Weight set per element via `fontWeight` (Troika supports variable font axes)
- [ ] Accessibility twin: a `<div className="sr-only" role="region" aria-label={t('sections.about.label')}>` sibling to the canvas wrapper. Contains three `<article>` blocks (one per beat) with `<h3>` (title) + `<p>` (body) — visible to screen readers, hidden visually. `<canvas>` element receives `aria-hidden="true"`
- [ ] `<AboutFallback>` for mobile + reduced-motion:
  - Renders directly, no Suspense, no canvas import
  - Layout: container `padding: 96px 24px`, centered single column, max-width 640px
  - `<picture>` at the top: `<source srcset="/images/about-toy-poster.webp" type="image/webp">` + `<img src="/images/about-toy-poster.png" alt="" loading="lazy" decoding="async" width="640" height="640">`. Poster generated during implementation with a small one-off Playwright script that loads `http://localhost:4173`, scrolls the About section so progress ≈ 0.4 (toy fully assembled, no spread, no lines), screenshots a 640×640 crop centered on the canvas, and emits both `.webp` (q=80) and `.png` (lossless) variants — committed to `public/images/`. Script lives at `scripts/capture-about-poster.mjs`
  - Below the image, three `<article>` per beat: small caps eyebrow, `<h3>` title (font weight 800), `<p>` body. Margin-bottom between articles, no separators
  - Existing `Stagger` recipe handles viewport-entry fade-up so the fallback still reads as part of the page's editorial language
  - No `position: sticky`, no 300vh wrapper
- [ ] Orchestrator chooser in `About.tsx`:
  ```tsx
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 900px)')
  if (reduce || isMobile) return <AboutFallback />
  return <Suspense fallback={null}><AboutScene /></Suspense>
  ```
  `useReducedMotion` is `framer-motion`'s built-in hook (already used in `src/context/MotionContext.tsx` — returns `null` on first render, then the resolved value; coerce with `?? false`). `useMediaQuery` does not exist yet — add it as a small new hook in `src/hooks/useMediaQuery.ts` (SSR-safe: returns `false` before mount, subscribes to a `MediaQueryList` on effect, returns current match; cleans up on unmount). Initial mount returns the fallback unconditionally for one paint to keep LCP cheap, then re-evaluates on the next tick
- [ ] `<AboutScene>` is lazy-loaded: `const AboutScene = lazy(() => import('../canvas/AboutScene/AboutScene'))` — keeps the 3D bundle out of mobile users' download. Suspense fallback is `null` (during the brief desktop-canvas chunk load the section just shows blank; sticky positioning keeps the layout stable)
- [ ] Page integration in `src/pages/Home.tsx`:
  - About stays between Hero and WorkExperience (no flow change)
  - Remove the MarqueeDivider above About (the canvas-on-cream entry IS the divider — having an editorial ghost-text marquee fight the cinematic is the wrong call)
  - Keep the MarqueeDivider below About (re-entry into the page's normal editorial rhythm before WorkExperience)
- [ ] Anchor id `id="about"` retained on the outer wrapper for the existing nav anchor scroll
- [ ] CC-BY attribution: add a small "3D model · {author} · CC-BY" line to the existing footer meta row (`src/components/layout/Footer.tsx`). Author name pulled from the Sketchfab metadata at implementation time; both EN and PT i18n strings get the credit line under a new key `sections.footer.modelAttribution`
- [ ] Tests:
  - Unit (Vitest): `useAboutProgress` math + per-beat opacity boundary detection + part-position lerp utility (pure functions, no R3F needed)
  - Component (RTL): `<AboutFallback>` renders all 3 beats' title + body, image present, no canvas; orchestrator picks fallback when `useReducedMotion` returns true OR when `useMediaQuery('(max-width: 900px)')` returns true (mock both, test the matrix)
  - e2e desktop (`desktop-chromium` project): scroll to `#about`, assert outer wrapper height ~300vh, sticky engaged (computed `position` on inner wrapper is `sticky`), scroll progressively and assert `01 / 03 → 02 / 03 → 03 / 03` counter text at appropriate scroll offsets, accessibility twin (`.sr-only [role="region"]`) contains all three beat bodies in DOM
  - e2e mobile (`mobile-chromium` Pixel 5): `<canvas>` selector absent under `#about`, all three beat titles visible in DOM, poster `<img>` loaded
  - e2e reduced-motion (`contextOptions: { reducedMotion: 'reduce' }`): same as mobile — no canvas, all beats visible
  - Visual: capture `npm run preview` at scroll progress 0.0 / 0.33 / 0.66 / 1.0 via `scripts/capture-scroll-site.mjs` for the plan's record + this spec's appendix
- [ ] `npm run build` passes — TypeScript strict, no new warnings (the HeroAccent3D chunk-size advisory may grow because of the AboutScene bundle; that's expected, document it in the plan)
- [ ] `npm run lint` passes — 0 errors, no new warnings
- [ ] `npm run test` passes — new unit + RTL tests green; existing baseline (14 pre-existing failures on `main`) is not regressed
- [ ] Lighthouse on `npm run preview` (port 4173, NOT dev server — per the codebase memory): desktop Performance ≥ 90, Accessibility ≥ 95. Document any regression vs. current main in the plan's verification step
- [ ] Visual sweep at 1440px (desktop): scroll past Hero → About pins; toy assembles smoothly 0→33%; toy holds + rotates 33→66%; toy spreads + lines fade in 66→100%; pin releases; MarqueeDivider then WorkExperience reads normally. EN and PT both verified
- [ ] Visual sweep at 390px (mobile): `<picture>` poster renders, three beat articles stack readably, no canvas in DOM, scroll is normal
- [ ] Visual sweep at 1440px with system reduced-motion ON: fallback DOM shown, no canvas

## Context

The existing About section (shipped 2026-05-19, spec `2026-05-19-about-section-design.md`) is a sticky-bio + 4-tactic grid that positions Kevin as an opinionated AI engineer through codified practice tactics. It works, but it commits to a stance ("I work this way") rather than a story ("here's how I got here, here's where I'm going"). The methodology framing leaves no oxygen for personal narrative, and the visual treatment — flat editorial grid — is the same language as the rest of the page (Skills, WorkExperience). About becomes indistinguishable from the page's other content blocks.

The user has decided the section should be a *moment* instead of a content block — a single immersive cinematic between Hero and WorkExperience that earns its place by carrying the personal story the rest of the page implies but never tells. The toy-disassembly metaphor lands because it's literally the user's earliest memory of engineering curiosity ("I'd disassemble my toys to look at the components"). The disassembly mechanism — a child's hand undoing a wind-up tin robot to see the gears — visualizes the same impulse that produced the portfolio.

Three beats, chronological:
- **01 — origin** (`how i got here.`): as a kid I disassembled my toys to see how they worked. My first website in college was an epiphany — finally I could *assemble* something. Seven years on, I'm still refining the same skill.
- **02 — present** (`how i work now.`): data viz, real-time systems, AI tooling, sales funnels — fullstack with a method that compounds. (Synthesized from the existing bio + project portfolio.)
- **03 — what's next** (`where it's going.`): thinking-with-AI daily; building systems for AI agents, not just human users.

The "all-in-canvas" rendering choice (per the user's selection of Approach 1 over the HTML-overlay alternative) commits to maximum visual unification — text and toy share the same rendering surface, lighting, camera. The accessibility twin (hidden DOM with the same content) is the contract that keeps this choice from regressing screen-reader access. The mobile and reduced-motion fallbacks (a poster image + stacked DOM articles) ensure the section degrades to a magazine spread rather than a broken canvas.

The Sketchfab CC-BY model + runtime palette override is the load-bearing simplification — we use a found object instead of building bespoke geometry, but we recolor it so it reads as a "figure" in the portfolio's design language rather than as a vintage product photo. The fallback chain (A → B → D) acknowledges the one residual technical uncertainty (mesh separability), bounded to a 15–30 min decision in Task 1 of the implementation plan.

## Out of Scope

- Sound. Noomo uses background ambience; this rework does not. (User did not select the noomo "interaction gate" feature, and audio adds non-trivial UX + a11y cost.)
- Click-and-hold to advance. The section is scroll-driven only.
- Bento, tactics grid, or any preserved fragment of the prior About design. Everything in the prior About section is replaced.
- A separate "method" section. The 4 deleted tactics may resurface elsewhere in the future, but that's a different spec.
- Camera animation (orbit / zoom). Only scene contents move.
- Real-time particle effects, shaders beyond drei's `<Text>` and `<Line>` defaults, post-processing.
- Dynamic asset loading (variant models, A/B testing). One model, locked at build time.

## Non-Goals

- Pixel-matching noomo. We're inspired by the pattern (pin + canvas + scroll-driven progress + layered text reveal); we're not reproducing the orb-jellyfish-shards visual.
- Beating noomo on raw visual fidelity. Their custom shaders + bespoke 3D are out of our budget. The win comes from the metaphor being earned (the toy is *Kevin's* metaphor, not a generic premium-portfolio orb).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Chosen model has fused mesh, can't be cleanly disassembled | Fallback chain (A → B → D). D is explicitly rigged-animated, guaranteeing separable bones |
| 3D model + canvas chunk hurts Lighthouse Performance | Lazy-load `<AboutScene>`; mobile users never download it; desktop budget verified against `npm run preview` |
| drei `<Text>` font load delays first canvas paint | Same Plus Jakarta Sans file the rest of the page already loads. Browser cache hit, no extra network |
| Canvas-text accessibility regression vs. prior DOM-text About | Hidden DOM twin contains every word; `<canvas>` is `aria-hidden`. e2e test asserts the twin's content |
| Reduced-motion users get a broken experience | Orchestrator returns `<AboutFallback>` (no canvas, no pin) under `prefers-reduced-motion: reduce` |
| Disassembly choreography reads as "broken" rather than "intentional" | Choreography is deterministic + scroll-progress driven; tunable in `aboutBeats.ts`; visual sweep in Task N catches misreads |
| CC-BY attribution forgotten | Explicit TODO above + spec-reviewer subagent verifies before merge |
