# Architecture

How each surface of the site works today. One section per surface, present tense, current tree only.

Read the section for the surface you are about to touch. The rules you obey every turn are in `CLAUDE.md`; the reasoning behind a choice is in `docs/adr/`.

## Index

| Surface | Main files | Section |
| --- | --- | --- |
| Tokens and palette | `src/index.css`, `src/utils/palette.ts` | [Palette and tokens](#palette-and-tokens) |
| Type | `index.html`, `src/index.css` | [Typography](#typography) |
| Canvases | `src/components/canvas/FluidWaves.tsx`, `src/components/canvas/SelectedWorkScene.tsx`, `src/components/canvas/webglProbe.ts` | [Canvases](#canvases) |
| Loader, entrance | `index.html`, `src/main.tsx`, `src/context/MotionContext.tsx`, `src/hooks/useScrollLockDuringEntrance.ts` | [Loader and entrance](#loader-and-entrance) |
| Hero | `src/components/sections/Hero.tsx` | [Hero](#hero) |
| Nav | `src/components/layout/Header.tsx` | [Nav](#nav) |
| Light chapter | `src/pages/Home.tsx`, `src/index.css` | [Light chapter](#light-chapter) |
| Selected Work scene, card links | `src/components/sections/Projects.tsx`, `src/components/canvas/scene/`, `src/utils/playhead.ts`, `src/utils/sceneMotion.ts`, `src/utils/projectMeta.ts` | [Selected Work scene](#selected-work-scene) |
| More work, volume sentence | `src/components/sections/MoreWork.tsx` | [More work](#more-work) |
| All work, Stream | `src/pages/AllWork.tsx`, `src/components/sections/Stream.tsx`, `src/utils/pageMeta.ts`, `public/sitemap.xml` | [All work and the stream](#all-work-and-the-stream) |
| Work Experience, More work and Stream case-study rows | `src/components/ui/WorkRow.tsx`, `src/components/sections/WorkExperience.tsx` | [WorkRow](#workrow) |
| Contact, Footer | `src/components/sections/Contact.tsx`, `src/components/layout/Footer.tsx` | [Contact and Footer stage](#contact-and-footer-stage) |
| Animation, smooth scroll | `src/utils/animations.ts`, `src/components/ui/RevealOnView.tsx`, `src/components/ui/Stagger.tsx`, `src/components/layout/SmoothScroll.tsx`, `src/hooks/useLenis.ts` | [Animation lanes](#animation-lanes) |
| Routes, sections, tonal rhythm | `src/App.tsx`, `src/pages/Home.tsx`, `src/pages/ProjectDetail.tsx`, `src/components/projectDetail/`, `src/components/sections/Skills.tsx`, `src/components/ui/SectionHeading.tsx`, `src/components/ui/Tag.tsx`, `src/index.css` | [Layout and section flow](#layout-and-section-flow) |
| Content, data, strings | `src/types/content.ts`, `src/data/`, `src/i18n/` | [Content model](#content-model) |
| Performance harness | `perf/run.mjs`, `perf/lib/`, `perf/scenarios/`, `perf/baseline.json`, `scripts/scene-title-identity.mjs` | [Performance harness](#performance-harness) |

Direction: dark ink plus WebGL shader craft. Monumental and confident, in a lowercase voice: headings, nav, prose, tech tags, places and roles stay lowercase, and only the names of projects and companies keep their own capitals, wherever they appear (ADR 0014; full sentence case was tried and declined). Cream text on near-black ink, with a tricolor accent carried entirely by two raw-shader canvases and rotated per-row tints. The page runs a tonal arc: dark ink at both ends, a cream light chapter through the middle (Selected Work to Skills), dark again at the Contact/Footer stage. The project detail pages and All work stay ink throughout.

## Palette and tokens

Canonical tokens live in `src/index.css` under `@theme` and `:root`. Every ratio is in `docs/contrast.md`, which is recomputed as a unit whenever a hex moves.

Base and text, on ink:

- `--color-bg` / `--bg` `#0B0E14` (page ink), `--color-bg-tonal` / `--bg-tonal` `#131722` (tonal section).
- `--color-text` / `--text` `#F5F2EC` (cream, body and display), `--color-text-muted` / `--text-muted` `#C9C4BA`, `--color-text-faded` / `--text-faded` `#A8A49C`. Hairline borders `rgba(245,242,236,0.13)`.

Tricolor accent, the only color on the site, shared by the shaders and the `accentFor()` row tints: `--color-accent-pink` `#E64D66`, `--color-accent-blue` `#4D80E6`, `--color-accent-yellow` `#E6CC4D`. A lighter hover value `#7AA0ED` covers hover states through the legacy `--blue-200` / `--blue-300` / `--blue-500` aliases; it has no token of its own.

On-light set, the light chapter's system: `--color-surface-light` `#F5F2EC` (cream ground), `--color-surface-light-tonal` `#EDE9E0` (the tonal step), `--color-ink-on-light` `#0B0E14` (primary text), `--color-ink-on-light-muted` `rgba(11,14,20,.62)` (always-visible small text), `--color-ink-on-light-faded` `rgba(11,14,20,.40)` (aria-hidden decoration only, never always-visible text), `--color-hairline-on-light` `rgba(11,14,20,.12)`. Deep tricolor: `--color-accent-pink-deep` `#B22B47`, `--color-accent-blue-deep` `#2A54B5`, `--color-accent-yellow-deep` `#7A6800`.

**The yellow rule.** Deep yellow `#7A6800` measures 4.94:1 on cream and does pass small-text AA. It is nonetheless swapped for the ink-muted step in small text, because at small sizes it reads dark-olive. That is an aesthetic rule, deliberately kept, not a contrast failure. Large text and decorative marks use the real hex.

**Three palette helpers, three row channels** (`src/utils/palette.ts`). `accentFor(i)` returns raw tricolor for use on ink. `accentDeepFor(i)` returns the on-light small-text channel, whose yellow slot emits ink-muted. `accentDeepLargeFor(i)` returns the on-light large-text and decoration channel, whose yellow slot emits `#7A6800`. `WorkRow.tsx` sets all three on every row as `--row-tint`, `--row-tint-deep` and `--row-tint-deep-large`.

Accent is applied per row through `accentFor(index)` (`ACCENTS = ['#E64D66','#4D80E6','#E6CC4D']`, index-rotated) as the `--row-tint` CSS var. Per-row tints always rotate. A section-level mark may pin a static accent (the nth-child `.skills-dot`); an individual component never picks a color for itself.

**Legacy aliases.** `--cream`, `--sand`, `--mist`, `--ink`, `--bark`, `--dust`, `--blue-*` and `--periwinkle-*` remain in `:root`, remapped onto the dark system so the whole light-era stylesheet flips without a rewrite. Role names kept their vars, so `--cream` is now dark (page bg) and `--ink` is now light (text). New work reads the canonical `--color-*` / `--text` / `--bg` names. The aliases are accepted debt, not a pattern to extend. Decision: ADR 0003.

## Typography

Plus Jakarta Sans, variable 200 to 800, self-hosted WOFF2 under `/public/fonts/` (WOFF2 replaced the TTF source; see the `@font-face` block in `index.html`). It is both the display and the body face, in the lowercase voice. Project and company names keep their capitals: the corridor captions, More work and Stream rows, Work Experience row titles, the detail page hero and the document title render a name as authored, with no CSS transform and no runtime lowercasing. The Anton scene title is a heading and stays lowercase (`titleTexture.ts` lowercases what it draws). There is no `--font-mono`.

**The Anton fence.** Anton (self-hosted, weight 400, latin and latin-ext, `font-display: swap`, preloaded) is used by the Selected Work morphing title and by nothing else. Jakarta is the site voice.

## Canvases

Three canvases are mounted; at most two run at once.

- **`FluidWaves`** (`src/components/canvas/FluidWaves.tsx`) is one shared raw-WebGL component with `variant: 'hero' | 'backdrop'`. The hero variant is the full-strength background: seeded scattered wave motion, tricolor paint, smooth, with no pixel quantization. The backdrop variant is the same shader dimmed in CSS (`opacity: 0.22; filter: saturate(0.7)`) behind Contact/Footer, lazy-mounted as the stage nears the viewport, with `dissolveStrength` 0. Each instance seeds independently.
- **`SelectedWorkScene`** (`src/components/canvas/SelectedWorkScene.tsx` plus `src/components/canvas/scene/`) is the third canvas and the only one rendered by React Three Fiber. It lives in the Projects lazy chunk. Decision: ADR 0009.

**The hero dissolve.** The hero variant runs a shader-side organic cream dissolve at the bottom of its band: a 2D fBm field dragged by the flow coordinate, a narrow threshold window plus a low-frequency sweep, and a hard cream floor. The hero section is `130svh` and melts into the cream Selected Work chapter. `DISSOLVE_NOISE_AMP` and `CREAM_FLOOR` are top-of-file constants; the threshold window and the low-frequency sweep are inline literals inside the shader source further down.

**The scroll-coupled clock.** Both `FluidWaves` variants run a scroll-coupled sim clock: scroll velocity adds a small boost to the shader time rate, about 1.5x on steady scroll and capped at 2x on a flick, with a 0.15 s attack and 0.9 s decay, velocity read per-frame inside the rAF loop. Paint stirs while the page moves and settles with follow-through.

**Shared canvas rules.** `devicePixelRatio` is capped at 1.5. An `IntersectionObserver` sets `data-paused="true"` off-screen for every canvas, reduced motion included, and halts the rAF loop. `prefers-reduced-motion` renders one static frame (`data-static="true"`) and never starts the loop. Context loss falls back permanently for the session: the hero to a gradient div `data-testid="fluid-waves-fallback"`, the backdrop to the stage ink. The hero rAF loop runs from mount with no entrance gate, so paint animates during the loader exit. Canvas ids are `data-canvas="fluid-waves"` and `data-canvas="fluid-waves-backdrop"`.

**R3F applies those same rules through the real canvas.** The attributes go on `gl.domElement` in `onCreated` and in the visibility effects, never as `<Canvas>` props, which R3F forwards to its wrapper div. Pausing is `frameloop` toggling `'always'` and `'never'`; reduced motion is `frameloop="demand"` plus `invalidate()` on scroll and resize.

**Warm-up.** After the entrance the scene warms at idle: `compileAsync`, `initTexture`, then one off-screen frame, and it flags `data-warm="true"`. Without it the first live frame costs roughly 0.5 to 1.2 s on real hardware, exactly as the reader arrives.

**Postprocessing gate.** Depth of field and grain mount on desktop and on hardware-accelerated GPUs only. A software rasteriser skips the composer, so headless Playwright never renders it; `tests/e2e/scene-effects.spec.ts` spoofs a hardware renderer string to keep that path covered.

## Loader and entrance

The loader is an inline SVG in `index.html`, so it paints before the bundle. An ink `#0B0E14` rect is masked by static `ks.` glyph-outline windows (paths extracted from Plus Jakarta Sans 700, no font dependency) that reveal the shader. The windows sit in a `<g class="loader-ks">` wrapper that GSAP scales for the exit. Behind it a dim tricolor CSS-gradient stand-in drifts subtly and reads as paint pre-React; on mount the stand-in fades to reveal the live, already-looping hero canvas through the windows.

Two bottom-corner cream-on-ink HTML meta labels stand in the loader: `portfolio · 2026` bottom-left and `react · typescript · webgl` bottom-right, both hardcoded EN.

**The exit** is orchestrated in `src/main.tsx`. After React paints plus a savor dwell of about 1.2 s (200 ms under reduced motion, 3 s hard fallback), the whole `ks.` cutout contracts to 0.96x over 0.18 s on the house ease (anticipation), then explodes to 45x over 1.1 s on `power4.in`. The quintic accelerates; an inOut's deceleration tail would play off-screen. The origin is near-center (viewBox 53.65, 50), inside the s glyph's upper-bowl spine. The mark itself is optically centered on "ks" (`translate(34.52 …)`, with the trailing dot excluded from centering), so the expansion reads centered and the viewport ends inside a letterform window: ink gone, hero revealed.

Corner labels drift 12 px outward and down while fading over 0.22 s at launch. `resolveEntrance()` fires at about 92 % of the explosion on a wall-clock `setTimeout`, once the ink has cleared the name region; `finishLoader()` removes the loader at 100 %. Under reduced motion the loader is a 150 ms opacity fade over a static shader frame, with no explosion.

**Then the hero text rises.** Once `entranceDone` resolves at the 92 % handoff, `src/components/sections/Hero.tsx` flips `entered` and the role line plus the two name lines rise from `y:125%` out of their `.hero-line-mask` clips, staggered on the house ease in Framer. Reduced motion and SPA back-navigation (`entranceBypassed`) go straight to the settled state with no rise. `MotionContext` holds `entranceDone` and its resolver; `main.tsx` is the sole gate resolver on the normal path.

## Hero

`src/components/sections/Hero.tsx`. A `min-height:130svh` section, where the extra roughly 30svh is the shader's cream-dissolve band, holding an absolute `100svh` `.hero-zone` that re-anchors the text plane so the name and role never fall into the dissolve. The canvas sits absolute behind the text. There is no scrim layer.

Anatomy: a monumental bottom-left signature name `h1.hero-name` reading `kevin` / `shibuya.` at `clamp(64px,12vw,200px)`, weight 700, line-height about 0.92, letter-spacing −0.03em, cream. Each line is a `.hero-line` span inside its own `.hero-line-mask` clip row; overflow is released to visible once `.hero-bottom.is-entered`, so the role focus ring and glyph descenders are not clipped at rest. A cycling role line sits directly above the name (`.hero-role`, inside a `.hero-line-mask.hero-role-line`, cycled by click or keyboard), where `roles[0]` is the canonical title `senior front-end engineer · react/typescript`.

**Hero text contrast is a documented AA exemption, owner-ratified.** The hero text (name, role, dark-context nav) renders plain cream directly on raw shader paint: no scrim, no text-shadow halo, no shader-side darkening of any kind between the text and the paint. This deliberately fails AA over the brightest paint. Soft treatments proved unsatisfiable at roughly 1.8 to 2.3:1 over worst-case yellow, and a worst-pixel 4.5:1 needs a near-opaque halo, which was rejected aesthetically. Keep it as it is: the owner accepts the tradeoff.

The sole sanctioned exception is an opt-in `@media (prefers-contrast: more)` layer for users whose OS asks for more contrast: dense ink halos on the name and role, and the dark-context nav takes its scrolled-style ink bar full-time. The default presentation stays untouched. The canonical record is the `.hero-zone` comment block in `src/index.css`. Decision: ADR 0004.

## Nav

Dark-restyled on the canonical tokens: brand mark left, links center, EN/PT toggle right.

**Four links, all to sections:** `work`, `experience`, `stack` and `contact` (`nav.*`), to `#projects`, `#work`, `#skills` and `#contact`. All work has no nav item; it is reached from the volume sentence (ADR 0014). On `/` a click scrolls to the section through Lenis over 1.2 s. Anywhere else it routes to `/` with `state.scrollToId`, and `Home.tsx` applies the scroll once the lazy section mounts, re-trying as the document grows for up to 1.5 s. The centre links are hidden under 720 px. `.nav-link` rests at `rgba(245,242,236,.85)`, near-full cream, because the `--text-faded` gray read muddy on raw hero paint; hover lifts to full `--text`. There is no availability pill, and no hero meta block either; `location` lives in the footer.

**`.nav--on-light`** is the cream-chapter variant: links at `--color-ink-on-light-muted` lifting to ink on hover, a deep-blue underline and brand dot, an ink brand tile with cream text, and a scrolled background of `rgba(245,242,236,.85)` over a light hairline.

It is toggled by an `IntersectionObserver` on `#chapter-light` with `rootMargin: -8% 0px -91% 0px`. The observed element is the whole chapter; the band is unchanged, because a `rootMargin` cannot express a chapter. A `MutationObserver` re-arms it for the lazy chunk. `theme-color` swaps with it: `#F5F2EC` on-light, `#0B0E14` otherwise.

## Light chapter

One wrapper element `#chapter-light` in `src/pages/Home.tsx` holds, in order, `#projects`, `#work` and `#skills` · three children. More work lives INSIDE `#projects`, after the scene ([More work](#more-work)). It paints `--color-surface-light` and carries a scoped re-declaration of the canonical tokens: the nine shorthands (`--bg`, `--bg-tonal`, `--text`, `--text-muted`, `--text-faded`, `--hairline`, `--accent-pink`, `--accent-blue`, `--accent-yellow`) **and eight `--color-*` mirrors**, seventeen declarations in all. Add a token to the chapter and you set both halves, or the inversion is partial. So every descendant rule that already reads a canonical token inverts with zero per-rule edits.

**The wrapper is a plain block on purpose: it carries no `overflow` and no `position`.** The `position: sticky` stage inside `#projects` needs the viewport as its scroll container, and either property on an ancestor silently breaks the pin.

`--text-faded` is remapped to the muted value inside the chapter. No alpha between 0.62 and ink is both AA-passing and visually distinct from 0.62, so the faded step survives only on `.workrow-index`, applied by hand. **`.workrow-arrow` is deliberately excluded from that rule**: on the expandable row it is the only visible cue that the row opens, inside a `<button aria-expanded>`, which makes it a WCAG 1.4.11 state indicator that `aria-hidden` does not exempt. It falls through to `--text-faded`, which the scope remaps to muted (5.23:1). See `docs/contrast.md` row 3b.

**A rule inside the light chapter reads a canonical token, never a legacy alias.** The inversion works by re-declaring the canonical tokens, and an alias is invisible to that scope: it keeps resolving to cream and renders cream text on cream.

**The one thing the scope cannot reach is an inline custom property.** `--row-tint*` are set on the `.workrow` style attribute (`src/components/ui/WorkRow.tsx`), and an inline value beats any ancestor declaration. So every raw-tint consumer in the chapter is overridden explicitly: the `.work-*` panel marks (`.work-mode-dot`, `.work-bullets li::before`, the `.work-highlight` border), `.work-highlight-label`, and the WorkRow title hover tint.

**Tonal rhythm:** Selected Work cream (More work included), Work Experience cream, Skills tonal. Skills alone carries `.section--sand` and inherits the tonal step through the scope. Nothing here is composed separately for cream.

**Exit veil** (`.chapter-exit-veil`): 30svh, `--color-surface-light-tonal` to `--bg`, `aria-hidden`, a pure gradient. The first stop must equal the background of the chapter's LAST child, and Skills carries `.section--sand`; starting it on plain cream puts a 1.08:1 hard edge at the one seam whose purpose is not having one. `tests/e2e/light-chapter.spec.ts` asserts the two agree. It is a sibling placed after `#chapter-light`, never a child: its gradient ends in `var(--bg)`, which the scope resolves to cream, so nesting it would erase the fade. No text ever sits in a veil band.

**There is no CSS entry veil.** The hero's `100svh` `.hero-zone` is inviolable, and the entry ramp is the shader's cream dissolve across the hero's lower 30svh (grep `dissolve` in `src/components/canvas/FluidWaves.tsx`, `hero-zone` in `src/components/sections/Hero.tsx`).

`html` and `body` stay ink, so overscroll edges are dark.

## Selected Work scene

The page centerpiece: a real 3D environment in the third canvas, four featured projects along a corridor that scroll dollies the camera through. The scene ends when card four settles. Code in `src/components/sections/Projects.tsx`, `src/components/canvas/SelectedWorkScene.tsx` and `src/components/canvas/scene/`, with the pure helpers in `src/utils/sceneMotion.ts` and the playhead axis in `src/utils/playhead.ts`. Decisions: ADR 0009 (third canvas via R3F), ADR 0010 (scroll is the playhead, time is the breath), ADR 0011 (the card is the object), ADR 0014 (the scene ends at the corridor). Specs and plans: `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md` and their plans.

### Anatomy

`section#projects.section.projects-scene-section` is **full-bleed**: it overrides `.section`'s 1440 cap and 80/20 px gutters to `max-width: none` with zero side padding (written as `padding-left`/`padding-right` longhands), because the corridor overflows the frame by design (a card mid-approach, the overture past 0.7 of the width) and that overflow has to clip at the viewport edge, not 80 px inside it. `.scene-fallback` and `.more-work` carry their own gutters instead.

Inside, in order: a static `h2.scene-title-sr.sr-only` naming the section, first so the no-WebGL fallback is named too; `ul.scene-cardlinks`, the four card links ([Keyboard and screen-reader path](#keyboard-and-screen-reader-path)); `div.scene-scroll` (the `useScroll` target), holding `div.scene-sticky` (100svh, pinned), then `div.scene-inner`, holding `div.scene-canvas-wrap[aria-hidden][data-ready]`; and last, after the wrapper, More work ([More work](#more-work)), in normal flow.

`.scene-scroll`'s height is an **inline style**, `SCENE_WRAPPER_SVH` from `src/utils/playhead.ts`, **550svh**: 4.5 playhead units at 100svh each, plus the one viewport the pin itself occupies. The same number is published as `data-svh` for the e2e helper and the perf scripts. The CSS carries `position` and `margin-top` only.

No eyebrow, no overlay, and no DOM element tracks the settled card: the card carries its own caption and is pressable (ADR 0011).

### Corridor and playhead

**The playhead axis lives in `src/utils/playhead.ts`, a leaf that imports nothing.** It holds `CARD_COUNT`, `OVERTURE_START`, the wrapper's svh and `scrollTargetFor`, the inverse back to a document `scrollY`. `sceneMotion.ts` imports it and re-exports the public names by explicit named exports, so a duplicate definition fails typecheck rather than shadowing; `MAX_SEG` and `PLAYHEAD_SPAN` are read there and deliberately not re-exported. The split exists so that an eager module can take the axis without pulling in the whole motion module, which only ever arrives through the lazy `Projects.tsx`: when the nav's archive target resolver did that, it put 9 146 B of motion code into `index.js`. Nothing eager imports the leaf today, and the rule stands: nothing may be added to it for symmetry, and a lazy-only module must not become eager-reachable, which is what the chunk-byte ceiling in `perf/baseline.json` exists to catch.

The four featured projects (`highlightOrder ≤ 4`) stand along a corridor in depth, alternating side and yaw; scroll dollies the camera through it.

The playhead is `playheadFor(progress)`, **`[−1.5, 3]` in CARD units**, one unit per 100svh over the wrapper's 450svh of scrub, clamped at both ends because an overscrolled `progress > 1` (Lenis, an iOS rubber-band) is on the live path. The leading 150svh is the **approach**. `[−1.5, −0.5)` is the **overture**: one Jakarta line, `sections.projects.overture`, standing on the camera's eye line at `overtureZ`, the point the camera reaches at −0.5. It fills 0.7 of the width at the top, grows as the camera nears, fades over the last 0.35 units and is gone the moment the cards read. `[−0.5, 0)` is the surfacing, card 0 coming out of the fog and the title out of blur. Then one viewport per card, and card four settles as the wrapper ends, with no hold beat after it. A hold is one constant in `playhead.ts` if the release ever reads abrupt.

The camera is one continuous ease from −1.5 to 0 (`easedSeg`), starting `CORRIDOR_DEPTH` (about 3.86 spacings) back, derived so that at −0.5 it sits exactly one spacing behind card 0. Every integer playhead is a settled state and the whole thing is exactly reversible. Settled card k sits at scrub `(k + 1.5) · 100` svh, a fixed `(k + 1.5) / 4.5` of the scrub range.

**One numeric travel.** `travelTo(playhead)` in `Projects.tsx` resolves the wrapper's document top and height and hands `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight)` to Lenis over 1.2 s, or to an instant `window.scrollTo` when Lenis is null under reduced motion. A press on a distant card and a focused card link both call it, so they cannot land in different places. Lenis replaces a tween in flight rather than queueing, so a reader tabbing quickly re-aims one move instead of stacking four.

### Frame loop

**Zero React state per frame.** One `useFrame` in `SceneRig` reads Framer's `scrollYProgress` and `useVelocity` plus the clock, and writes every visual through the pure helpers in `src/utils/sceneMotion.ts`.

No React state is driven by scroll at all. The loop derives the settled index itself (`frontIndexFor`) and writes it to `data-slot`. A language switch is the only thing that re-renders the scene subtree; `cards` is memoised on `lang` in `Projects.tsx`.

`useFrame` reads `state.viewport.dpr` for every rasterised text, so text is measured in device pixels, once. It never reads `window.devicePixelRatio`.

### Title

Anton on a camera-relative plane, not parented to the camera, because R3F's default camera sits outside the scene graph. Two coverage-mask textures are combined by the **seam morph** (`seamFor` and `seamBlend` in `src/utils/sceneMotion.ts`, the shader in `src/components/canvas/scene/SceneTitle.tsx`): a front sweeps the plane in reading order, and each column blends the outgoing name into the incoming one by its distance to the front, blurring both toward the seam's centre with a 9-tap binomial over the mip whose texel is about σ, per-tap masked to the texture, then cutting the sum at 0.5.

Inside the 1.2 em seam (`SEAM_WIDTH_EM` 1.2, peak blur `SEAM_SIGMA_EM` 0.1 em, weights `(1−t)^0.5` and `t^0.5`) the outgoing strokes swell into blobs and the incoming ones grow out of them: the gooey bridge, one letter at a time.

**Two whole names are never summed.** That sum is a slab for any two 6 to 7 em Anton names, whatever the blur or the cut. Contract: `docs/superpowers/specs/2026-09-05-title-morph-artifacts-contract.md`. On the settle plateaus `uSeam` is 0 and the whole draw takes a one-tap path at the rest LOD. The approach writes card 0's name the same way, with slot A empty.

Every texture is registered on its **last baseline** in the plane (`TitleMetrics.baselinePx`), not centred, so a one-line name and a two-line one share the line the seam rewrites and the extra line unfolds above it. It is the one object the cream fog never touches, and the only Anton consumer on the site.

Each texture is rasterised at the em it is displayed at (`titleCapPx · viewport.dpr · fit`), so the rest mip LOD is exactly 0. The rig holds the fit the textures were drawn for (`TitleMetrics.drawnScale`) while the computed one stays within 1 %, and asks for one redraw through `sceneRefs.titleRedraw` when it moves.

The band (`titleBand`) starts 16 px under the measured nav (`navPx`, a `ResizeObserver` in `Projects.tsx`, fallback 66) and is **bottom-anchored**: its lowest ink sits just above the settled card's top edge and grows upward, because the card is nearer than the title and would otherwise clip a two-line title.

**The width cap and the wrap allowance are two separate thresholds, and both are load-bearing.** `g.titleWidthCap` (0.8 of the frame, 0.94 in portrait) governs the rendered size, enforced only by the rig's `fit`. `titleWrapAllowancePx` governs the wrap: the whole frame, deliberately not the width cap, and scaled by the drawn fit. Scaling it means the wrap allowance and the em the lines are measured at move together, so the line count is a pure function of the viewport. Without that, the fit decides the wrap and the wrap decides the fit, and one viewport gets two stable answers depending on how it was reached: a phone reached by resizing down from a desktop width rendered a two-word Portuguese title on one line at cap 33 px where a fresh load gave two lines at 56 px. Applying the width cap to the wrap as well closes the loop onto the wrong branch: every desktop title wraps and the shared band shrink drags all four down, cap and card from 0.167 to 0.131 at 1440.

The band shrink is clamped, so a viewport too short to hold the band at all cannot drive the fit to zero or below. Clearance above the card is `g.titleClearance`: 0.012 of the frame height, 0.045 in portrait, where the card is 0.88 of the width and the band has the headroom.

`titleCapPx` floors at 72 at or under the band start and 56 at or over the band end, blended across the crossover band by `smoothstep` like `camY`. Nine per cent of a phone's width is 35 px, so the floor is what actually decides the phone title; 56 read at 0.14 of the card against the desktop's 0.167, and 72 restores that ratio (measured cap 55.6 px on a 343 px card at 390x844).

**Layer 1.** The title and the overture live on `TITLE_LAYER` (`src/components/canvas/scene/sceneRefs.ts`), which the composer never renders. `TitlePass` in `src/components/canvas/scene/Environment.tsx` narrows the camera to layer 0 before the composer and, after it, rebuilds depth with a depth-only render and draws layer 1 depth-tested, so depth of field and grain never touch them. Without a composer the camera keeps layer 1 enabled and they render in the main pass.

### Card size

A fraction of the frame **width**: `min(0.88, 620/width, 0.5/(aspect · CARD_H))`, the same three terms on both sides of square. They are the phone's edge-to-edge card, the `CARD_MAX_PX` 620 px design cap (a flat portrait 0.88 made that cap false past about 705 px, so tablets drew 722 to 900 px cards), and the **frame-fit rule** · the card never exceeds half the frame height, so it cannot push into the title band. There is no portrait branch: the frame-fit term is what carries the card continuously through square, where a branch cliffed. Under all three sits the legibility floor `CARD_MIN_PX` 287 px, so the caption name never drops under 12 px; it binds on landscape phones and on 320 px portrait, and it is the only thing allowed to break frame-fit.

The camera height still differs between a phone and a desktop, but it blends rather than switches: `camY` rises from the desktop coefficient 0.61 to the phone coefficient 1.0 across the **crossover band**, `CROSSOVER_START` 0.85 to `CROSSOVER_END` 1.05 in aspect, by `smoothstep`. The band is tuned by eye, and every real phone and tablet sits outside it · iPad Pro portrait 0.75, the foldables 0.81 to 0.83 in portrait and 1.205 to 1.235 in landscape (the original 1.25 end wrongly swallowed that whole class), iPad landscape from 1.33 · so only a near-square desktop window being dragged is ever inside it. Two consequences: `titleCapPx` blends on the same `t`, so a window narrower than 800 px inside the band changes title size by up to 8.8 px (no real device does); and below the band start everything sits at `t = 0`, so an 820-wide window still puts the blob shadow out of frame from aspect 0.945 down to 0.70. Narrowing the band strictly shrinks that set but cannot empty it · issue #13 supersedes the knob by keying the blend on the card's height share. (`src/utils/sceneMotion.ts`, `docs/superpowers/specs/2026-09-07-aspect-crossover-design.md`)

### Environment

Cream floor, fog and clear colour, all `#F5F2EC`, so there is no horizon and the floor reads only through the per-card blurred blob shadows. Those are tinted by `accentDeepLargeFor`, the decorative channel, because the deep channel's yellow slot is an `rgba()` string that `THREE.Color` cannot take.

Nothing glows around a card. Rounded corners are cut by geometry, never by an alpha mask, so depth stays honest at the corners.

### Breath

Cards bob, yaw and pitch on unrelated periods with a per-card phase. Scroll velocity feeds an energy accumulator that scales those amplitudes and leans the corridor against the direction of travel. The settled card tilts up to 6° toward a fine pointer and the title parallaxes a quarter of the way against it. The overture line breathes on a fifth phase.

All of it is off under reduced motion, which keeps the pin, shows the overture as a still frame and swaps cards instantly.

### Caption

`src/components/canvas/scene/Caption.tsx`, rasteriser `src/components/canvas/scene/textTexture.ts`. On the left of the white body band: the name (`CAPTION_NAME_PX` 26 of the 620 px card, weight 600, ink `#0B0E14`) and `year · tech · tech` (14, `rgba(11,14,20,.62)`). On the right, the `↗` (22, `accentDeepLargeFor(i)`).

They are Jakarta textures on planes inside the card group at `renderOrder` 1, because three's distance sort would otherwise put the frame over them. They fog and fade with the card, and are drawn at the card's projected width in device px so the caption is 1:1 at rest. Names ellipsise on one line.

Legibility floor: `sceneGeometry` never lets the card go under `CARD_MIN_PX` 287 px, so the name is at least 12 px on every viewport from 320 px up. It binds on landscape phones and at 320 px portrait.

### Pointer

R3F pointer events on each card group in `src/components/canvas/scene/Corridor.tsx` are the only way the pointer reaches a card. Hover writes `sceneRefs.hover` and the cursor on the canvas element; the rig lerps a lift toward the camera (`HOVER_LIFT`, `HOVER_SCALE` 1.02, `HOVER_TAU` 0.2 s) for the settled card only, and slides its arrow 2 px up and right. A click with `event.delta > 6` px is a scroll, not a tap.

`onCardClick(i)` is decided in `Projects.tsx`, the Router root: the settled card navigates to its project, and any other card scrolls into the slot through Lenis (`scrollTargetFor`), instantly under reduced motion.

**No router, and no DOM beyond `gl.domElement`, inside `src/components/canvas/`.**

### Keyboard and screen-reader path

The canvas is nothing to a keyboard or a screen reader, so the four corridor cards are also four real links: `ul.scene-cardlinks`, one `a.scene-cardlink` per card in corridor order, each to its `/projects/<slug>` route, the link text being the project name. ADR 0011's original contract, restored by ADR 0014.

**The list is a SIBLING of `.scene-scroll`, never a child of `.scene-sticky`, and that is load-bearing rather than tidy:** `position: sticky` establishes a stacking context, so a `z-index` inside it is scoped to the sticky element and the focused pill would paint UNDER the nav at 100. The sticky box is also programmatically scrollable, so focusing a clipped child inside it would shift the stage.

**The container is `position: fixed` at the viewport's top centre, zero-size, `overflow: visible`, and it holds `z-index: 120`.** Every link's clipped 1 px box is then inside the viewport at every size, so the browser's focus-scroll · which runs BEFORE `:focus-visible` applies, and reads the clipped box · has nothing to do, and the Lenis travel is the only scroll. The `z-index` lives on the container because a fixed element always establishes a stacking context and a link's own `z-index` cannot leave it. The items are `display: contents`. Links clip with `clip-path: inset(50%)`, never `overflow: hidden`, which would make each one its own scroll container.

**On `:focus-visible` a link un-clips into a pill** at the viewport's top centre: `var(--text)` on `var(--bg)` with a `var(--hairline)` border and a 2 px `var(--text)` outline, 14 px, weight 500. The list sits inside `#chapter-light`, so the scope resolves that to ink on cream (`docs/contrast.md`, light chapter row 20). `pointer-events` stays `none` throughout, so the canvas keeps its hover and a mouse user never sees the pill.

**Focus travels the camera.** `onFocus` calls `travelTo(index)`, the travel a press on a distant card makes: card `i` settles at playhead `i`, Lenis eases it, and under reduced motion (no Lenis) it lands in one step. Focus is its own channel and never writes into hover. Tabbing past the fourth link goes straight into More work's rows.

Without WebGL the list does not render: the fallback cards carry the same four links in flow.

### Fallback and data attributes

`div.scene-fallback` replaces `.scene-scroll` entirely when WebGL2 is missing or the context is lost: four framed cards in normal flow, each with a `view ↗` link to its project, no pin, permanent for the session. `webglUnavailable` is seeded from `webglProbe()` (`src/components/canvas/webglProbe.ts`) rather than discovered a commit later. More work follows the fallback cards exactly as it follows the wrapper.

`.scene-scroll` carries `data-svh`, the wrapper's height in svh. The e2e helper (`tests/e2e/helpers/scene.ts`), the scroll-transition scenario and the title identity script derive one playhead unit from it as `offsetHeight / (svh / 100)` · 100svh, not one · so they scroll by playhead and never by a fraction of the wrapper.

The scene reports its state on the real canvas element as data attributes, written only when they change, and nothing in React reads them:

- `data-canvas="selected-work-scene"`
- `data-slot`, `"0"` to `"3"`, the settled card
- `data-overture`, `"true"` or `"false"`
- `data-warm="true"` once the idle warm-up has rendered its off-screen frame
- `data-registrations`, how many times the corridor registered its objects: `"1"` on a production build across a full scrub, `"2"` on the dev server under StrictMode
- `data-paused` and `data-static`, the shared canvas rules ([Canvases](#canvases))

## More work

`src/components/sections/MoreWork.tsx`, rendered by `Projects.tsx` inside `#projects` after the scroll wrapper or after the fallback cards, so it is the same with and without WebGL. ADR 0014.

**Rows.** The projects matching `p.highlight && (p.highlightOrder ?? 99) > 4`, sorted by `highlightOrder` (five today), each a shared `WorkRow` ([WorkRow](#workrow)) in an `ol.more-work-list`: numbered 01 to 05, the project name with its capitals, meta `year · tech · tech` from `captionMeta` (`src/utils/projectMeta.ts`, the same string the corridor captions draw), and an internal link to `/projects/<slug>`. Tints rotate through the palette helpers by index, as on every `WorkRow`. The list owner draws the top hairline. The markup mirrors the Stream's (an `ol` of rows), not Work Experience's stagger, so a screen reader hears a plain list of links.

**No heading, eyebrow or number** on the list itself: the Selected Work `h2` names the section.

**The volume sentence.** `p.more-work-volume` closes the list: `sections.projects.moreWork.claim` ("plus 250+ interactives for GZH since 2023", the CV's figure, written in rather than computed), an `aria-hidden` `·`, then a `Link` to `/all-work` reading `sections.projects.moreWork.link` and an `aria-hidden` `→`. The claim is muted, the link ink with a hairline underline that takes the text colour on hover, and a 2 px ink focus ring.

**Layout.** `.more-work` is ordinary flow content in a full-bleed section, so it carries its own gutter: `min(1280px, 100% − 160px)`, `calc(100% − 40px)` under 720 px, 96 px below the scene. It reads canonical tokens only, which the chapter's scope turns into the on-light steps.

## All work and the stream

**All work** is `src/pages/AllWork.tsx` at `/all-work`, a lazy route in `src/App.tsx` behind the same `Suspense` pattern as the project detail route, reached from the volume sentence and from no nav item. ADR 0014.

The page is `main.section.all-work`: the detail pages' back link (`.project-detail-back`, `← back to projects`), then the Stream at heading level 1, so the Stream's title is the page's one `h1` and its total the page's one count. It arrives at the top, as a detail page does, and Home keeps its own `scrollY` in `sessionStorage`, so the back link returns the reader where they left. Title and description come from `allWork.meta.*` through `setPageMeta` (`src/utils/pageMeta.ts`) in both languages; the route is in `public/sitemap.xml`.

**Ink, like the project detail pages.** The page sits outside the light chapter, so every canonical token resolves to the cream steps and the rows tint on `--row-tint`, the raw tricolor from `accentFor()`; neither on-light deep channel is read here. The pairs are the "All work, on ink" table in `docs/contrast.md`.

**The Stream** is `src/components/sections/Stream.tsx`: every piece, year by year, newest first, as real DOM in normal flow. No state, no Framer Motion, no canvas import, no router hook. `headingLevel` sets the title's level, years one below; All work passes 1.

**Semantics.** `section#archive.stream.stream--visible[aria-labelledby]` with a title, a total, a heading per year carrying that year's count, and an `ol` of `li.stream-item[data-item-id][data-serial][data-origin]`. A case study renders a `WorkRow` · a real `<a>` to its route · and everything else a dense `a.stream-row` out to GZH (`target="_blank"`) with serial, title, meta (`type · editorial · dd.mm`) and an `↗`. The serial is rendered once per row, `aria-hidden`, on the muted step; `WorkRow`'s own ordinal counts POSITION rather than serial, so it is hidden here. Tints come from the item's position in the whole stream, so the tricolor rotates down the list instead of restarting inside every year. The origin word is `t('sections.archive.origin.<origin>')`, never `item.origin` verbatim · PT `personal` is `pessoal` · and `professional` renders no meta at all. Editorial titles carry `lang="pt"` (ADR 0001).

**The count and the claim differ on purpose.** The Stream states its catalogued count, computed from the data (171 pieces today); the volume sentence states the CV's 250+. Both are true, and the gap is issue #34's to close.

## WorkRow

The section-list primitive, in `src/components/ui/WorkRow.tsx`. Three consumers: Work Experience, More work ([More work](#more-work)) and the Stream's case-study rows on All work ([All work and the stream](#all-work-and-the-stream)).

An open typographic row, no card. Anatomy: `.workrow-index` (zero-padded, faded, tabular-nums), `.workrow-title` (oversized, the name as authored with its capitals, `clamp(28px,4.6vw,64px)`, weight 550, cream, tinting to `--row-tint` on hover and focus), `.workrow-meta` (faded spans joined by `·`), `.workrow-arrow`, whose glyph says where the link goes · `+` opens in place, `→` stays on this site, `↗` leaves it. A bottom hairline per row; the list owner adds the top hairline.

The row carries no imagery. The expandable variant swaps the row for a real `<button aria-expanded>` with an `AnimatePresence` panel. Every variant carries a visible cream `:focus-visible` ring.

Work Experience reuses it verbatim, in the expandable variant, with no bespoke row markup; More work and the Stream use the link variant, internal (`→`) for a case study. The pointer-tracking preview float, the touch thumbnail and the trailing ornament went with the retired list, and no row shows a picture: the four featured projects' pictures are the corridor's cards.

**Inside the light chapter** (Work Experience, More work) WorkRow inverts through the token scope alone; its `.workrow-*` rules are never edited. The hover title tint reads `--row-tint-deep-large`, `.workrow-index` takes the faded on-light step, and the Work Experience panel's `.work-*` marks read the deep channels. On All work, on ink, the title lifts to the raw `--row-tint`. `.workrow-arrow` stays on the muted step: it is the expandable row's only open/closed cue, so WCAG 1.4.11 applies (`docs/contrast.md` row 3b).

## Contact and Footer stage

Contact and Footer share one `.contact-footer-stage`: the `FluidWaves` backdrop canvas at z-0, the content at z-1. `Contact` is dark-restyled and `Footer` is rewritten; the `footer.location` key belongs to it.

Ratios for every pair over the dimmed backdrop are in `docs/contrast.md`.

## Animation lanes

Never two libraries on one animation. Each has a lane:

- **Framer Motion** owns component enter and exit, hover states, shared layout transitions, and anything tied to React state, through `motion.*` and `AnimatePresence`. Framer scroll-scrub (`useScroll` and `useTransform` bound to scroll progress) is a sanctioned lane alongside state-driven motion.
- **GSAP with ScrollTrigger** is one-shot entrance orchestration only. Initialise it in `useEffect` with cleanup, scoped with `gsap.context()`.
- **React Three Fiber** renders the Selected Work scene only; the hero is raw WebGL. Three canvases on the page, at most two live at once. Lazy-load the R3F components and keep the scene atmospheric.

**Lenis owns page scrolling** (`src/components/layout/SmoothScroll.tsx`, read through `useLenis` and `useLenisContext`). It is null under reduced motion, so every programmatic scroll falls back to an instant `window.scrollTo`.

**The R3F lane's boundary:** the scene's frame loop reads Framer MotionValues and writes three objects itself. Framer never animates a three object, and GSAP never touches the scene.

Every animation honours `prefers-reduced-motion`: a static hero frame, no float, instant panels.

## Layout and section flow

**Routes** (`src/App.tsx`): `/` is Home; `/projects/:slug` (`src/pages/ProjectDetail.tsx`) and `/all-work` (`src/pages/AllWork.tsx`) are lazy routes, each behind `Suspense` with a `null` fallback. Both sit on ink, outside the light chapter.

Containers cap at 1440 with 80 px side padding on desktop. The hero is a full-bleed canvas stage. Selected Work is the pinned R3F scene stage, with More work in flow under it. Work Experience, More work and the Stream's case-study rows converge on the WorkRow row language, and Skills has its own `.skills-*` list.

Shapes are open typographic rows, no cards or containers. The one exception is the Selected Work scene's framed cards, the sanctioned centerpiece. Rounded-full pills, chips and buttons survive where already used, on filters and tags.

**Tonal sections.** On ink, `--bg-tonal` `#131722` marks alternate sections and base sections sit on `--bg` `#0B0E14`. Inside the light chapter the same rhythm runs on cream: `--color-surface-light-tonal` `#EDE9E0` for Skills, `--color-surface-light` `#F5F2EC` for Selected Work and Work Experience.

**Section flow:** Hero, Projects (the scene, then More work and the volume sentence), Work Experience (expandable), Skills, Contact, Footer. Work first. There is no Numbers section. `Home.tsx` lazy-loads every section below the hero and warms their chunks at idle.

## Content model

Two distinct work categories. The TypeScript shapes live in `src/types/content.ts`; this section covers how they are used on the page.

**Projects** are fully fledged work with dedicated routes at `/projects/:slug`. Title and description are `{ en, pt }` pairs; the title is the project's name, authored with its own capitals in both languages (Radar Legislativo, Enquetes GZH, Chat da Hora). `src/data/projects.ts` holds nine. `highlightOrder` is the one ranking, and it splits them in two:

- the scene's corridor takes the projects matching `p.highlight && (p.highlightOrder ?? 99) <= 4`, sorted by `highlightOrder` (`src/components/sections/Projects.tsx`);
- More work takes the ones matching `p.highlight && (p.highlightOrder ?? 99) > 4`, in the same order (`src/components/sections/MoreWork.tsx`), five today.

Both predicates count: a project with `highlight: false` leaves the homepage altogether and is reached only from All work. `captionMeta(project)` (`src/utils/projectMeta.ts`) is the one `year · tech · tech` string, the year and the first two technologies lowercased, shared by the corridor captions and More work's rows. The JSON-LD in `index.html` mirrors the project names, and `tests/unit/seo/jsonld-projects.test.ts` holds the two together.

**Work experience** (`src/data/workExperience.ts`) names its companies with their own capitals (Grupo RBS, Flow Autobody, HelloGym); places, roles, bullets and tech stay lowercase.

**Embeds** are day-to-day interactives published on GZH (`gauchazh.clicrbs.com.br`) with no dedicated page. The source of truth is `src/data/embeds.csv`, semicolon-delimited, with the columns `DATA PUBLICAÇÃO`, `EDITORIA/COLUNISTA`, `FORMATO`, `ATIVIDADE`, `LINK MATERIA`, `NOME`. `FORMATO` is always `PROGRAMAÇÃO` and is ignored.

An embed's `title` is Portuguese only, because it is editorial content.

UI strings live in `src/i18n/locales/en.json` and `src/i18n/locales/pt.json`, loaded by `src/i18n/index.ts`; every key exists in both (ADR 0001).

**Embeds have no surface of their own.** `src/data/embeds.ts` parses the CSV, and `src/data/archive.ts` flattens the embeds into archive items alongside the projects; there is no gallery component and no embed page. `deriveArchive(projects, embeds)` builds the union, and the module exports `archive`, the single derived list, plus `yearBlocks(items)` for the per-year groups and counts.

**Archive items** are that flattened union, newest first, each carrying a `serial`: 171 at the newest piece down to 1 at the oldest, contiguous. Two fields classify a piece · `origin`, one of `professional`, `freelance` or `personal`, which the Stream names as a word on a case-study row, and an optional `caseStudy: { slug }`, which is what makes a piece one of the nine with a route of its own. `href` and `internal` say where its row links. `resolveTitle(item, lang)` resolves a title that may be a plain string or a `{ en, pt }` pair, because an editorial title is Portuguese only.

**The Stream on All work is the archive's one surface** ([All work and the stream](#all-work-and-the-stream)). There is no toolbar, no filtering, no search, no sort and no pagination anywhere in the tree. A better treatment of the editorial pieces is issue #34; the data stays in the repo for it.

`Embed.imagePreview` has no consumer: it served the retired list's row previews. `Project.gradient` is a project field and was never carried onto an archive item.

## Performance harness

The harness measures this site's performance on **one machine** · Kevin's Mac, the rig · and nowhere else. It runs headed on purpose, because headless falls back to SwiftShader and would measure software rasterisation, which for a shader-heavy page is measuring the wrong thing. Numbers are meaningful only against the machine that produced them, so `perf/run.mjs` stamps rig state into every report and refuses to update a baseline when it disagrees; a busy rig is refused too, with `--force` as the deliberate escape hatch (`perf/lib/load.mjs`). ADR 0006 is the decision.

Measurement is tiered. **Layer 1** hard-asserts exact budgets inside the e2e suite · canvas backing stores against the capped-DPR contract, per-frame GL work, off-screen pausing, reduced motion, and per-chunk byte ceilings. **Layer 2** runs controlled in-page scenarios (`perf/scenarios/`), each a reproducible symptom reduced to a median plus a tolerance band. **Layer 3** scores the whole production build in Lighthouse (`perf/lighthouse.mjs`), against `npx vite preview`, never the dev server. Alongside them the **pixel gate** (`tests/e2e/pixel-gate.spec.ts`) is the sole visual arbiter: committed goldens across fixed seeds, viewports and moments, at antialiasing-level tolerance, with no per-batch human eyeball in the loop (ADR 0007).

Commands: `npm run perf` runs every **Layer 2** scenario and nothing else, `npm run perf:lh` is Layer 3, `npm run perf:selftest` proves the runner itself, and Layer 1 rides the ordinary e2e suite. The reference numbers live in `perf/baseline.json` under `rig`, `exact`, `scenarios` and `lighthouse`; kept wins ratchet it down so later batches cannot give them back. A batch is one hypothesis, kept or reverted on the measurement alone · no partial credit and no unmeasured "should help elsewhere" argument (ADR 0007).

**The chunk ceiling map**, `exact.chunkBytesCeiling`, holds one entry per chunk the production build emits, keyed `<name>.<ext>`, and none for a chunk that no longer exists. Bundle bytes are deterministic, so a ceiling is re-recorded in the commit that moves it; a chunk shipping with no entry fails the budget.

**Scripts that walk the scene read the wrapper, never assume it.** The `scroll-transition` scenario (`perf/scenarios/scroll-transition.mjs`) scrolls from the settled hero until card one settles, its distance derived by playhead from `data-svh`. `scripts/scene-title-identity.mjs` dumps the camera pose and the four title metrics at six playheads across six viewports through the DEV-only `window.__scene` handle, for a before/after diff around a scene change. The scenario's timing baseline is re-recorded only on a quiet, matching rig (ADR 0006).

The harness's own e2e specs **run by default**, with two exceptions. What runs is self-certifying: `tests/e2e/perf-hooks.spec.ts` asserts the instrumentation contract, Layer 1 in `tests/e2e/perf-budget.spec.ts` asserts the hero's exact per-frame GL work, off-screen pausing, reduced-motion behaviour, every canvas's capped-DPR backing store and the chunk byte ceilings, and 24 goldens in `tests/e2e/pixel-gate.spec.ts` still match this tree, so ADR 0007's "regenerate only on a commit that declares visual intent" is enforceable · an intentional hero edit carries `--update-snapshots` in that commit, and a red golden is a finding to read before it is a snapshot to re-record. Two tests skip unless `PERF_HARNESS=1`: the long-task budget during scroll (a throughput assertion that starves under a loaded suite) and `stage-arrival`, which needs a scene freeze hook before a golden can be baked. The liveness checks that used to starve now wait for frames instead of counting them over a wall-clock second (#11). Two notes the default suite now inherits: the goldens have only `-darwin` variants, so a bare `npx playwright test` is Mac-bound, and `playwright.config.ts` is `workers: 1`, so the suite is serial.

The deep record is `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md`.

