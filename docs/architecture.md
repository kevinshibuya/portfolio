# Architecture

How each surface of the site works today. One section per surface, present tense, current tree only.

Read the section for the surface you are about to touch. The rules you obey every turn are in `CLAUDE.md`; the reasoning behind a choice is in `docs/adr/`.

## Index

| Surface | Main files | Section |
| --- | --- | --- |
| Tokens and palette | `src/index.css`, `src/utils/palette.ts` | [Palette and tokens](#palette-and-tokens) |
| Type | `index.html`, `src/index.css` | [Typography](#typography) |
| Canvases | `src/components/canvas/FluidWaves.tsx`, `src/components/canvas/SelectedWorkScene.tsx` | [Canvases](#canvases) |
| Loader, entrance | `index.html`, `src/main.tsx`, `src/context/MotionContext.tsx` | [Loader and entrance](#loader-and-entrance) |
| Hero | `src/components/sections/Hero.tsx` | [Hero](#hero) |
| Nav | `src/components/layout/Header.tsx` | [Nav](#nav) |
| Light chapter | `src/pages/Home.tsx`, `src/index.css` | [Light chapter](#light-chapter) |
| Selected Work | `src/components/sections/Projects.tsx`, `src/components/canvas/scene/`, `src/utils/sceneMotion.ts`, `src/utils/friezeLayout.ts`, `src/utils/friezeTargets.ts` | [Selected Work scene](#selected-work-scene) |
| Work Experience rows | `src/components/ui/WorkRow.tsx` | [WorkRow](#workrow) |
| Contact, Footer | `src/components/sections/Contact.tsx`, `src/components/layout/Footer.tsx` | [Contact and Footer stage](#contact-and-footer-stage) |
| Animation | any | [Animation lanes](#animation-lanes) |
| Sections, tonal rhythm | `src/pages/Home.tsx`, `src/index.css` | [Layout and section flow](#layout-and-section-flow) |
| Content, data | `src/types/content.ts`, `src/data/` | [Content model](#content-model) |
| Performance harness | `perf/run.mjs`, `perf/lib/`, `perf/scenarios/`, `perf/baseline.json` | [Performance harness](#performance-harness) |

Direction: dark ink plus WebGL shader craft. Lowercase, monumental, confident. Cream text on near-black ink, with a tricolor accent carried entirely by two raw-shader canvases and rotated per-row tints. The page runs a tonal arc: dark ink at both ends, a cream light chapter through the middle (Selected Work to Skills), dark again at the Contact/Footer stage.

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

Plus Jakarta Sans, variable 200 to 800, self-hosted WOFF2 under `/public/fonts/` (WOFF2 replaced the TTF source; see the `@font-face` block in `index.html`). It is both the display and the body face, lowercase throughout. There is no `--font-mono`.

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

Dark-restyled on the canonical tokens: brand mark left, links center, EN/PT toggle right. `.nav-link` rests at `rgba(245,242,236,.85)`, near-full cream, because the `--text-faded` gray read muddy on raw hero paint; hover lifts to full `--text`. There is no availability pill, and no hero meta block either; `location` lives in the footer.

**`.nav--on-light`** is the cream-chapter variant: links at `--color-ink-on-light-muted` lifting to ink on hover, a deep-blue underline and brand dot, an ink brand tile with cream text, and a scrolled background of `rgba(245,242,236,.85)` over a light hairline.

It is toggled by an `IntersectionObserver` on `#chapter-light` with `rootMargin: -8% 0px -91% 0px`. The observed element is the whole chapter; the band is unchanged, because a `rootMargin` cannot express a chapter. A `MutationObserver` re-arms it for the lazy chunk. `theme-color` swaps with it: `#F5F2EC` on-light, `#0B0E14` otherwise.

## Light chapter

One wrapper element `#chapter-light` in `src/pages/Home.tsx` holds, in order, `#projects`, `#archive`, `#work`, `#stats` and `#skills`. It paints `--color-surface-light` and carries a scoped re-declaration of the canonical tokens: the nine shorthands (`--bg`, `--bg-tonal`, `--text`, `--text-muted`, `--text-faded`, `--hairline`, `--accent-pink`, `--accent-blue`, `--accent-yellow`) **and eight `--color-*` mirrors**, seventeen declarations in all. Add a token to the chapter and you set both halves, or the inversion is partial. So every descendant rule that already reads a canonical token inverts with zero per-rule edits.

**The wrapper is a plain block on purpose: it carries no `overflow` and no `position`.** The `position: sticky` stage inside `#projects` needs the viewport as its scroll container, and either property on an ancestor silently breaks the pin.

`--text-faded` is remapped to the muted value inside the chapter. No alpha between 0.62 and ink is both AA-passing and visually distinct from 0.62, so the faded step survives only on `.workrow-index`, applied by hand. **`.workrow-arrow` is deliberately excluded from that rule**: on the expandable row it is the only visible cue that the row opens, inside a `<button aria-expanded>`, which makes it a WCAG 1.4.11 state indicator that `aria-hidden` does not exempt. It falls through to `--text-faded`, which the scope remaps to muted (5.23:1). See `docs/contrast.md` row 3b.

**A rule inside the light chapter reads a canonical token, never a legacy alias.** The inversion works by re-declaring the canonical tokens, and an alias is invisible to that scope: it keeps resolving to cream and renders cream text on cream.

**The one thing the scope cannot reach is an inline custom property.** `--row-tint*` are set on the `.workrow` style attribute (`src/components/ui/WorkRow.tsx`), and an inline value beats any ancestor declaration. So every raw-tint consumer in the chapter is overridden explicitly: the `.work-*` panel marks (`.work-mode-dot`, `.work-bullets li::before`, the `.work-highlight` border), `.work-highlight-label`, and the WorkRow title hover tint.

**Tonal rhythm:** Selected Work cream, Archive tonal, Work Experience cream, Stats cream, Skills tonal. Archive and Skills carry `.section--sand` and inherit the tonal step through the scope. Stats is not a `.section` at all: it is `.stats`, painted `var(--bg)`, which the scope resolves to cream. Nothing here is composed separately for cream.

**Exit veil** (`.chapter-exit-veil`): 30svh, `--color-surface-light-tonal` to `--bg`, `aria-hidden`, a pure gradient. The first stop must equal the background of the chapter's LAST child, and Skills carries `.section--sand`; starting it on plain cream puts a 1.08:1 hard edge at the one seam whose purpose is not having one. `tests/e2e/light-chapter.spec.ts` asserts the two agree. It is a sibling placed after `#chapter-light`, never a child: its gradient ends in `var(--bg)`, which the scope resolves to cream, so nesting it would erase the fade. No text ever sits in a veil band.

**There is no CSS entry veil.** The hero's `100svh` `.hero-zone` is inviolable, and the entry ramp is the shader's cream dissolve across the hero's lower 30svh (grep `dissolve` in `src/components/canvas/FluidWaves.tsx`, `hero-zone` in `src/components/sections/Hero.tsx`).

`html` and `body` stay ink, so overscroll edges are dark.

## Selected Work scene

The page centerpiece: a real 3D environment in the third canvas. Code in `src/components/sections/Projects.tsx`, `src/components/canvas/SelectedWorkScene.tsx` and `src/components/canvas/scene/`, with the pure helpers in `src/utils/sceneMotion.ts`. Decisions: ADR 0009 (third canvas via R3F), ADR 0010 (scroll is the playhead, time is the breath), ADR 0011 (the card is the object). Specs and plans: `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md` and their plans.

### Anatomy

`section#projects.section.projects-scene-section` is **full-bleed**: it overrides `.section`'s 1440 cap and 80/20 px gutters to `max-width: none` with zero side padding (written as `padding-left`/`padding-right` longhands), because the corridor overflows the frame by design (a card mid-approach, the overture past 0.7 of the width) and that overflow has to clip at the viewport edge, not 80 px inside it. `.scene-fallback` carries its own gutter instead, `width: min(620px, 100% - 40px)`.

Inside: `nav.scene-skiplinks` (the keyboard and screen-reader path into a project), then `div.scene-scroll` (the `useScroll` target), then `div.scene-sticky` (100svh, pinned), then `div.scene-inner`, holding `div.scene-canvas-wrap[aria-hidden][data-ready]` and a static `h2.scene-title-sr.sr-only` naming the section.

`.scene-scroll`'s height is an **inline style**, `sceneWrapperSvh(columns)` computed in `Projects.tsx` from the frieze's own extent, and the same number is published as `data-svh` for the e2e helper. The CSS carries `position` and `margin-top` only. At today's 35 columns that is 1575svh.

No eyebrow, no overlay, and no DOM element tracks the settled card: the card carries its own caption and is pressable.

### Corridor and playhead

The four featured projects (`highlightOrder ≤ 4`) stand along a corridor in depth, alternating side and yaw; scroll dollies the camera through it. Past them the playhead runs on into act two, the archive frieze.

The playhead is **piecewise**, `playheadFor(progress, columns)`:

- **Act one, `[−1.5, 3]`, in CARD units**, one unit per 100svh over the first 450svh of scrub. The leading 150svh is the **approach**. `[−1.5, −0.5)` is the **overture**: one Jakarta line, `sections.projects.overture`, standing on the camera's eye line at `overtureZ`, the point the camera reaches at −0.5. It fills 0.7 of the width at the top, grows as the camera nears, fades over the last 0.35 units and is gone the moment the cards read. `[−0.5, 0)` is the surfacing, card 0 coming out of the fog and the title out of blur. Then one viewport per card.
- **Act two, `[3, 4]`, NORMALISED** over its own svh budget, so `actTwoProgress(playhead)` needs no extent and every act-one pose is literally the old function on `actOneSeg(playhead) = min(playhead, 3)`.

`columns = 0` means no frieze and reproduces the original single-piece function exactly. Both `playheadFor` and `scrollTargetFor` return early on `columns ≤ 0`, so an overscrolled `progress > 1` · Lenis, or an iOS rubber-band · can never divide by a zero act-two budget.

The camera is one continuous ease from −1.5 to 0 (`easedSeg`), starting `CORRIDOR_DEPTH` (about 3.86 spacings) back, derived so that at −0.5 it sits exactly one spacing behind card 0. Every integer playhead is a settled state and the whole thing is exactly reversible. Settled card k sits at scrub `(k + 1.5) · 100` svh · which is **no longer a fixed fraction of the wrapper**, because the wrapper's height now follows the frieze.

### Act two

Past card four the same playhead reads the archive as a wall. The geometry is derived in `src/utils/sceneMotion.ts`; the grid it is derived against comes from `src/utils/friezeLayout.ts`, which `sceneMotion` imports and never the reverse.

**The frieze frame.** `friezeFrame(frieze, g)` stands the wall centred on the corridor axis (`centreX = 0`), facing the camera, one spacing beyond card four · exactly where a fifth card would be · with its bottom edge at `HOVER`, so the embedded cards share the corridor cards' floor gap. A cell is half a scene card (`FRIEZE_CELL_W = CARD_W / 2`, `FRIEZE_CELL_H = CARD_H / 2`), so a 2×2 case study spans exactly one card with no inset, at `FRIEZE_ROWS = 6` rows in both orientations.

**The beats and their scroll.** `actTwoSvh(columns) = 100 + 50 + 25·columns`, and `sceneWrapperSvh(columns) = 550 + actTwoSvh(columns)`. `actTwoBeats(columns)` turns that into the two boundaries in `u`:

- **Release**, `u ∈ [0, uR]`: position and pitch smoothstep from card four's settled slot to the volume shot, with zero velocity at both ends, so the settle plateau hands over without a lurch. Yaw is 0 · the wall is centred on the corridor axis, so act one's heading already faces it. `volumeDistance` fits both axes at `VOLUME_FILL = 0.9`, so the whole frieze enters the frame on any aspect.
- **Approach**, `u ∈ [uR, uA]`: the camera moves in to the reading distance while the **eye leads the body** · the look target's x runs the same path at 1.5×, which is where the yaw lives; it is 0 at both ends of the beat.
- **Dolly**, `u ∈ [uA, 1]`: lateral travel across `dollyRange`, on `dollyEase`, a trapezoid velocity profile that ramps over one column's share at each end and runs at constant speed between. The exit slows to rest inside the last column with no extra scroll, and the curve is C1 throughout.

**The reading distance and its floor.** `dollyDistance = min(dHeight, dLegible)`, where `dLegible` keeps a cell at or above `FRIEZE_CELL_MIN_PX = ceil(CARD_MIN_PX / 2) = 144` CSS px · half of the card floor, because a cell is half a card, so an embedded 2×2 case study is never narrower than `CARD_MIN_PX` and its caption never drops under 12px. That legibility term binds on most viewports.

`DOLLY_HEIGHT_FILL = 0.82` is a **floor on the wall's vertical fill, not a ceiling**: `min()` picks the nearer distance and a nearer camera fills MORE frame, so nothing in the expression caps the fill. It measures 0.820 at 1440×900 and at 393×851, where the height term binds exactly, and 0.867 at 1280×720, where the 144 px cell floor pulls the camera nearer than the height fit would. Asserting `fill ≤ 1` would be vacuous; the real invariants are `friezeHeightFill ≥ DOLLY_HEIGHT_FILL` and `actTwoTopClearFrac` at its per-viewport value.

**The dolly camera is bottom-anchored.** `dollyY` lands the wall's bottom edge on the frame's bottom edge, so every spare pixel of frame height sits ABOVE the wall rather than being split between top and bottom. `actTwoTopClearFrac = 1 − friezeHeightFill` is that air · 0.180 at 1440×900 and at 393×851, 0.133 at 1280×720, roughly double what a wall-centred camera would leave · and it is exported so pipeline 2 can inset the top row's cell ink under the title band.

**The title reads over the wall's top row, and that is settled.** Clearing act one's title band would need a fill of 0.679, i.e. a 106px cell, which breaks the 144px floor. Six rows lift the clearance to 0.13–0.18 of the frame against a band reaching 0.32, so the overlap survives the row change: the cell floor and a reserved title band remain mutually infeasible. The camera work buys the largest clearance the constraint set allows and stops there. **No scrim, halo or darkening is added to make the overlap read** · that is the site's standing NO, and the fix belongs to the wall's own typography. ADR 0012.

**The reading cursor and the year titles.** The cursor is the SCROLL's column budget, not the camera's position: `dollyCursor(u, frieze) = columns · p`, linear in the dolly's progress. `blockAt` returns the block under it, so across the dolly every year is named exactly once, newest first · **including a one-column block that the camera's clamped range never reaches**, which is exactly what a camera-driven title would silently skip. The two therefore disagree by up to one column's share at each end of the dolly, where the camera ramps and the cursor does not, and coincide through the middle. That lag is accepted and bounded.

`actTwoTitle` morphs inside a window around each block boundary, with half-widths `min(0.5, neighbour / 2)` columns so the windows never overlap even around a one-column block and every boundary still has one. It runs through `seamFor`'s `settleFrac`, so every window rests at both ends, and the release window's plateau is what holds card four's name for the first 15% of the release.

**Card four dissolves across the release.** `actTwoCardFade` is 1 at `u = 0` and exactly 0 from `uR` on, and the mesh leaves the render once it reaches 0. Without it the card would still sit in its settled slot · the act-one segment is clamped at 3 · with the camera closing to the reading distance and the card between the lens and the wall. It is therefore not hoverable or pressable in act two, and cannot intercept a pointer meant for a wall cell.

**Stills.** Under reduced motion act two resolves to ONE discrete `ActTwoStill` descriptor · the volume shot before the dolly, then one still per block at the block's centre column clamped to the dolly range · and camera, fog, focus, title distance, title index and the card fade all derive from that single `u`. The ambient time term is 0 in act two under reduced motion, unconditionally. Four channels each reading the live `u` is how a still acquires a drift that renders on demand and so is never seen in a test run.

**Fog, far plane, focus and the title distance.** `fogRangeAt` generalises `fogRange` to any distance; `actTwoFogRange` walks the fog from act one's exact values at `u = 0` out to the wall across the release. `sceneFar(frieze, g) = max(g.far, volumeDistance + 2·spacing)` is applied with the frustum on the geometry/frieze key, never per frame · act one's image does not depend on the far plane. `actTwoFocusDistance` walks the DoF focus from the slot to the wall on the same ease, written every frame to `sceneRefs.focus.distance` and read by `Environment` through a `DepthOfFieldEffect` ref. `actTwoTitleDistance(dWall, g) = min(g.titleDistance, 0.8·dWall)` keeps the title plane in front of the wall; the switch is invisible because the title's pixel size is distance-invariant by construction.

**The title plane's envelope is act one's alone.** `planeW`, `maxAbove`, `maxBelow` and `tallest` reduce over `i < CARD_COUNT` only, and act-two textures are fitted INTO that envelope. This is structural, not a data argument: `titleTexture.ts` grows `canvas.height` with the line count, so a single act-two string wrapping to one more line than the tallest act-one title would otherwise move `planeH` and `baseY` and resize act one · on data, not on code. `SceneTitle`'s two-phase draw (act one at the frame-wide allowance, then act two wrapped to the widest act-one ink width) complements it by keeping act-two strings from needing that fit-down on today's copy, but it bounds width and not height, so neither mechanism covers the other.

**Scroll seams.** Pipeline 1 exports COLUMN targets only: `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)` · a number, never an item id · plus `playheadForColumn`, `playheadForBlock` and `volumeShotPlayhead` (what the `#archive` nav link lands on), and `data-svh` on the wrapper. The item lookup belongs to pipeline 2's `src/utils/friezeTargets.ts`, whose `playheadForItem(itemId, layout, extent)` imports both modules and composes `playheadForColumn(cell.col + cell.span / 2, extent)`. Pipeline 3 calls `playheadForItem` for stream focus and the wall click, and feeds the number to `scrollTargetFor`. `sceneMotion.ts` stays pure and ignorant of the content model, which is the whole reason the split exists.

**Bounds pipeline 2 must respect:** `maxRowsInFrame(g)` (the tallest frieze that still fits at the reading distance) and `actTwoTopClearFrac(frieze, g)` (the air over the top row, which the top row's ink must be inset by). Neither is a constant: `maxRowsInFrame` falls with viewport height · 10 at 1920×1080, 8 at 1440×900, 7 at 820×821, 6 at 1280×720 · which is why `FRIEZE_ROWS` is 6 and why both are asserted across the whole viewport matrix rather than at one or two fixtures. Eight rows overflowed the frame on every viewport shorter than ~833 CSS px, and because the wall is bottom-anchored with no vertical camera travel, the overflow was off the top permanently.

### The wall

Act two's surface: all 171 archive pieces as one frieze. Pipeline 1 decides where the wall stands and how the camera moves over it; this section is what the wall is made of. The grid comes from `src/utils/friezeLayout.ts`, everything drawn comes from `src/components/canvas/scene/frieze*.ts` with `Frieze.tsx` and `Wall.tsx`.

**Packing.** `friezeLayout(items, rows)` groups the archive by year, newest first, and packs each year independently into its own block: case studies first as 2×2 spans, then the editorial pieces as 1×1 cells, filling column-major · down a column before moving right. A block's width is `max(col + span)` over its own cells, and the frieze's `columns` is the sum of the block widths. `friezeExtent(layout, rows)` adds each block's `count` and the world `width` and `height`. At six rows today that packs to **35 columns**: `2026 @0 ×2` holding 3 pieces, `2025 @2 ×9` holding 42, `2024 @11 ×22` holding 118, `2023 @33 ×2` holding 8, over 17.5 × 2.168 world units. None of it is configured · the column count falls out of the data, and the wrapper's height follows it.

**What a cell says.** `friezeText.ts` turns a piece into three strings (`cellText`): a title of at most two lines (`wrapTitle`, whole words only, an ellipsis for the overflow · and an ellipsis alone when a single indivisible token cannot fit), a one-line meta (`fitMeta`, whole-word ellipsis) and the serial. The sizes are world units, not pixels · `CELL_TITLE_WORLD` 0.06, `CELL_META_WORLD` 0.04, `CELL_INSET_WORLD` 0.03, line-height 1.2, weights 600 and 500 · so the text scales with the wall and its drawn size is a fact about the camera rather than the texture. Serial digits are drawn one at a time at the widest measured digit advance (`digitAdvance`), because Canvas2D font-feature settings are not assumed to exist: that is what makes the figures tabular, and it is why a narrow `1` sits in a slot as wide as a `0`.

**One mask per panel, never one canvas per cell.** 171 cells cannot each own a canvas and a texture, so a whole year block rasterises into a single coverage mask · the technique `titleTexture.ts` already uses for the scene title. Three steps size it, in this order:

1. `friezeDensity(frieze, g, dpr)` asks for the density the dolly actually needs · the wall's CSS pixels per world unit at the reading distance, times the renderer's DPR · and ceilings it at `FRIEZE_DENSITY_CEILING = 612.8` texels per world unit. The ceiling is the only thing that reduces detail, and it does so uniformly, from roughly 1080 CSS px of canvas height upwards.
2. `panelsFor(block, cells, density, cap)` splits any block whose mask would exceed `FRIEZE_MASK_MAX_PX = 4096` into `ceil(needed / cap)` column-aligned panels of near-equal width, moving each boundary to the nearest column no 2×2 span bridges. It throws rather than cut a case study in half.
3. `maskSize(columns, rows, density, cap)` sizes each panel.

Because the split runs *before* the sizing, **the cap never binds and so never costs detail**: measured from 1269×720 to 1909×1080 and on the phone, every panel's `scale` is exactly 1. The 2024 block is two 11-column panels at any density above ~372 texels/world, which is every case except DPR 1 at 720 px tall · there its 22 columns still fit in 3168 px as one panel. So the wall is five meshes on a DPR-1.5 renderer and four at DPR 1.

**Two channels.** Each mask is an `RGFormat` `DataTexture`: two bytes per texel, no mipmaps, `LinearFilter`, `NoColorSpace`, and `flipY = false` so row 0 is the wall's top. **R is title coverage; G is meta and serial together**, because both are drawn in one muted ink and hover changes only the title. The two never overlap inside a cell · `packPanel` counts the texels where they would (`overlapTexels`) and the contract is zero.

**Colour lives in a lookup, not in the mask.** `createFriezeLookup` builds one `DataTexture` per *block* · slot to ink, a 2×2 writing its ink into all four of its slots · and the shader reads each cell's colour from it. The inks are the light chapter's own tokens: professional `#0B0E14`, freelance `#B22B47`, personal `#2A54B5`, on the cream `#F5F2EC` wall. Meta and serial take `#646566`, which is not a new colour but `rgba(11,14,20,.62)` · the muted step · already composited on cream, because a shader cannot alpha-blend against the wall the way CSS does. A panel is a column offset into its block's lookup (`uPanelOffset`, `uPanelColumns`). Hover writes three uniforms and nothing else (`setFriezeHover`), taking its tint from the same index rotation `WorkRow` uses inside the light chapter (`hoverColorFor`).

**Meshes and the swap.** `panelMeshes` is one plane per panel, and it computes the same plan with or without masks · so the cream wall before rasterisation and the lettered wall after it have identical geometry, and the arrival of the text is a uniform write rather than a remount. `panelKey` is the identity the materials are keyed on.

**Hit testing is arithmetic, not raycasting.** `blockOccupancy` flattens each block into an `Int32Array` of `columns × rows` slots holding an index into `layout.cells`, column-major, a 2×2 filling all four of its own. `cellAtUv` turns a UV hit on a panel into a cell by index, flipping `v`, half-open on both axes, and returning `null` inside the year-count band so the count itself is never clickable. One raycast against a handful of panel planes replaces a raycast over 171 meshes.

**Pointer and callbacks.** `Frieze.tsx` owns the pointer. Hover lives in a ref and in uniforms, never React state (ADR 0010), and its only observable sign in the shipped build is `gl.domElement.style.cursor` going to `pointer`. A pointer that travelled more than `TAP_MAX_DELTA_PX = 6` is a scroll gesture and is rejected, so dragging across the wall opens nothing. `onCellClick(itemId)` and `onCellHover(itemId | null)` leave the canvas as props and `Projects.tsx` decides: a case study navigates to `/projects/<slug>`, anything else opens its `href` in a new tab with `noopener`, **synchronously** · a popup opened after an `await` has lost the trusted click stack and the browser blocks it. An unknown id does nothing. The whole path stays inert until the wall is active and its masks exist.

**The nine cards are the corridor's cards.** Each case study's 2×2 span carries the same card object the corridor uses, through a shared resource cache, and the rasteriser skips span-2 cells because the card draws its own title and caption. The cards mount with the wall instead of waiting for the masks: gating them on the raster cost 855 ms against a 300 ms budget.

**Warm-up, redraw and failure.** `Wall.tsx` registers `sceneRefs.frieze.prepare`, so rasterisation happens inside the scene's existing warm-up window · behind the entrance, after the fonts are ready, sliced `FRIEZE_RASTER_SLICE = 4` draw units per idle callback with a 32 ms timeout so it never blocks a frame. `prepare` resolves whether the raster succeeds or fails: one that never resolved would leave the canvas permanently un-warm. A language switch and the resize debounce build a new generation, and the old one is disposed only once the new one has rendered, so the wall never blinks. `data-frieze` reads `pending`, then `ready` or `failed`; a failed raster is a blank cream wall with act one still working, never the permanent WebGL-unavailable path.

**What the masks cost.** Two bytes per texel, no mipmaps, measured from the shipped sizing against the canvas boxes the browser actually reports:

| Canvas | Density | Meshes | Largest panel | Steady | Peak |
| --- | ---: | ---: | --- | ---: | ---: |
| 1269×720, DPR 1 | 288.0 | 4 | 3168×624 | 6.00 MiB | 19.54 MiB |
| 393×727 phone, DPR 1.5 | 432.0 | 5 | 2376×936 | 13.50 MiB | 35.48 MiB |
| 1429×900, DPR 1.5 | 510.7 | 5 | 2809×1107 | 18.87 MiB | 49.61 MiB |
| 1909×1080 and taller, DPR 1.5 | 612.8 | 5 | 3370×1328 | 27.16 MiB | 71.40 MiB |

Steady is the resident panels; peak is a redraw holding both generations plus two CPU-side copies of the largest panel. The ceiling is what bounds the bottom row · without it the peak would keep climbing with canvas height. The four lookup textures come to 840 bytes per generation. Covers, captions, render targets and driver overhead sit outside these figures.

**Seams out.** `src/utils/friezeTargets.ts` is the only module that holds both a cell and a playhead: `playheadForItem(itemId, layout, extent)` finds the cell and composes pipeline 1's `playheadForColumn` at the cell's centre column. `friezeLayout.ts` imports nothing but the content types, and nothing in the frieze chain imports a canvas component.

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

### Fallback and data attributes

`div.scene-fallback` replaces `.scene-scroll` entirely when WebGL2 is missing or the context is lost: four framed cards in normal flow, no pin, permanent for the session.

`.scene-scroll` also carries `data-svh`, the wrapper's height in svh from `sceneWrapperSvh(columns)`. The e2e helper derives one playhead unit from it as `offsetHeight / (svh / 100)` · 100svh, not one · so the specs scroll by playhead and never by a fraction of a wrapper whose height depends on the data.

The scene reports its state on the real canvas element as data attributes, written only when they change, and nothing in React reads them:

- `data-canvas="selected-work-scene"`
- `data-slot`, `"0"` to `"3"`, the settled card. Through act two it holds `"3"`: the act-one segment is clamped at 3, so it names the last act-one slot and NOT a card under the pointer
- `data-act`, `"1"` or `"2"`. Act two begins STRICTLY after playhead 3, so at 3 exactly · card four settled, `u = 0` · it still reads `"1"`
- `data-overture`, `"true"` or `"false"`
- `data-registrations`, how many times the corridor registered its objects: `"1"` on a production build across a full scrub, `"2"` on the dev server under StrictMode
- `data-frieze`, the wall's rasterisation state: `"pending"`, then `"ready"` or `"failed"`. A `"failed"` wall is blank cream with act one intact, never the WebGL-unavailable path

## WorkRow

The section-list primitive, in `src/components/ui/WorkRow.tsx`. Work Experience is its only consumer: the Archive section is retired, and Selected Work does not use it either · that is the pinned R3F scene, which now carries the archive itself.

An open typographic row, no card. Anatomy: `.workrow-index` (zero-padded, faded, tabular-nums), `.workrow-title` (oversized lowercase, `clamp(28px,4.6vw,64px)`, weight 550, cream, tinting to `--row-tint` on hover and focus), `.workrow-meta` (faded spans joined by `·`), `.workrow-arrow` (`↗` on a link, `+` rotating 45° when expanded). A bottom hairline per row; the list owner adds the top hairline.

On desktop hover, a pointer-tracking `.workrow-float` preview runs on Framer's `useMotionValue` and `useSpring`, never `setState` above the list. On touch and no-hover pointers, an inline `.workrow-thumb` stands in instead. The expandable variant swaps the row for a real `<button aria-expanded>` with an `AnimatePresence` panel. Every variant carries a visible cream `:focus-visible` ring.

Work Experience reuses it verbatim, in the expandable variant, with no bespoke row markup. The `preview` float and the `ornament` slot lost their only consumer with the Archive list and are unreferenced in the current tree.

**Inside the light chapter** WorkRow inverts through the token scope alone; its `.workrow-*` rules are never edited. The hover title tint reads `--row-tint-deep-large`, `.workrow-index` takes the faded on-light step, and the Work Experience panel's `.work-*` marks read the deep channels. `.workrow-arrow` stays on the muted step: it is the expandable row's only open/closed cue, so WCAG 1.4.11 applies (`docs/contrast.md` row 3b).

## Contact and Footer stage

Contact and Footer share one `.contact-footer-stage`: the `FluidWaves` backdrop canvas at z-0, the content at z-1. `Contact` is dark-restyled and `Footer` is rewritten; the `footer.location` key belongs to it.

Ratios for every pair over the dimmed backdrop are in `docs/contrast.md`.

## Animation lanes

Never two libraries on one animation. Each has a lane:

- **Framer Motion** owns component enter and exit, hover states, shared layout transitions, and anything tied to React state, through `motion.*` and `AnimatePresence`. Framer scroll-scrub (`useScroll` and `useTransform` bound to scroll progress) is a sanctioned lane alongside state-driven motion.
- **GSAP with ScrollTrigger** is one-shot entrance orchestration only. Initialise it in `useEffect` with cleanup, scoped with `gsap.context()`.
- **React Three Fiber** renders the Selected Work scene only; the hero is raw WebGL. Three canvases on the page, at most two live at once. Lazy-load the R3F components and keep the scene atmospheric.

**The R3F lane's boundary:** the scene's frame loop reads Framer MotionValues and writes three objects itself. Framer never animates a three object, and GSAP never touches the scene.

Every animation honours `prefers-reduced-motion`: a static hero frame, no float, instant panels.

## Layout and section flow

Containers cap at 1440 with 80 px side padding on desktop. The hero is a full-bleed canvas stage. Selected Work is the pinned R3F scene stage. Archive and Work Experience converge on the WorkRow row language, and Skills has its own `.skills-*` list.

Shapes are open typographic rows, no cards or containers. The one exception is the Selected Work scene's framed cards, the sanctioned centerpiece. Rounded-full pills, chips and buttons survive where already used, on filters and tags.

**Tonal sections.** On ink, `--bg-tonal` `#131722` marks alternate sections and base sections sit on `--bg` `#0B0E14`. Inside the light chapter the same rhythm runs on cream: `--color-surface-light-tonal` `#EDE9E0` for Archive and Skills, `--color-surface-light` `#F5F2EC` for Selected Work, Work Experience and Stats.

**Section flow:** Hero, Projects, Archive, Work Experience (expandable), Stats, Skills, Contact, Footer. Work first.

## Content model

Two distinct work categories. The TypeScript shapes live in `src/types/content.ts`; this section covers how they are used on the page.

**Projects** are fully fledged work with dedicated routes at `/projects/:slug`. Title and description are `{ en, pt }` pairs. The scene's corridor takes the projects matching `p.highlight && (p.highlightOrder ?? 99) <= 4`, sorted by `highlightOrder` (`src/components/sections/Projects.tsx`). Both predicates count: a project with `highlight: false` and a low order silently leaves the corridor.

**Embeds** are day-to-day interactives published on GZH (`gauchazh.clicrbs.com.br`) with no dedicated page. The source of truth is `src/data/embeds.csv`, semicolon-delimited, with the columns `DATA PUBLICAÇÃO`, `EDITORIA/COLUNISTA`, `FORMATO`, `ATIVIDADE`, `LINK MATERIA`, `NOME`. `FORMATO` is always `PROGRAMAÇÃO` and is ignored.

An embed's `title` is Portuguese only, because it is editorial content.

**Embeds have no surface of their own.** `src/data/archive.ts` flattens them into archive items alongside the projects; there is no gallery component and no embed page. `deriveArchive(projects, embeds)` builds the union, and the module exports `archive`, the single derived list, plus `yearBlocks(items)` for the per-year counts.

**Archive items** are that flattened union, newest first, each carrying a `serial`: 171 at the newest piece down to 1 at the oldest, contiguous. There is no `kind` tag any more. Two fields replace it · `origin`, one of `professional`, `freelance` or `personal`, which the wall reads as the cell's title ink, and an optional `caseStudy: { slug }`, which is what makes a piece one of the nine with a route of its own. `resolveTitle(item, lang)` resolves a title that may be a plain string or a `{ en, pt }` pair, because an editorial title is Portuguese only.

**The archive has no list surface.** There is no toolbar, no filtering, no search, no sort and no pagination anywhere in the tree: the archive is rendered by the Selected Work scene's second act ([The wall](#the-wall)), and the retired list's components, styles and strings are gone with it.

A row with no preview image falls back to a type-keyed CSS gradient (`typeGradients` in `src/data/embeds.ts`, carried onto the item as `gradient`), not to a badge. The `imagePreview` field on `Embed` is declared but currently has no consumer.

## Performance harness

The harness measures this site's performance on **one machine** · Kevin's Mac, the rig · and nowhere else. It runs headed on purpose, because headless falls back to SwiftShader and would measure software rasterisation, which for a shader-heavy page is measuring the wrong thing. Numbers are meaningful only against the machine that produced them, so `perf/run.mjs` stamps rig state into every report and refuses to update a baseline when it disagrees; a busy rig is refused too, with `--force` as the deliberate escape hatch (`perf/lib/load.mjs`). ADR 0006 is the decision.

Measurement is tiered. **Layer 1** hard-asserts exact budgets inside the e2e suite · canvas backing stores against the capped-DPR contract, per-frame GL work, off-screen pausing, reduced motion, and per-chunk byte ceilings. **Layer 2** runs controlled in-page scenarios (`perf/scenarios/`), each a reproducible symptom reduced to a median plus a tolerance band. **Layer 3** scores the whole production build in Lighthouse (`perf/lighthouse.mjs`), against `npx vite preview`, never the dev server. Alongside them the **pixel gate** (`tests/e2e/pixel-gate.spec.ts`) is the sole visual arbiter: committed goldens across fixed seeds, viewports and moments, at antialiasing-level tolerance, with no per-batch human eyeball in the loop (ADR 0007).

Commands: `npm run perf` runs every **Layer 2** scenario and nothing else, `npm run perf:lh` is Layer 3, `npm run perf:selftest` proves the runner itself, and Layer 1 rides the ordinary e2e suite. The reference numbers live in `perf/baseline.json` under `rig`, `exact`, `scenarios` and `lighthouse`; kept wins ratchet it down so later batches cannot give them back. A batch is one hypothesis, kept or reverted on the measurement alone · no partial credit and no unmeasured "should help elsewhere" argument (ADR 0007).

The harness's own e2e specs **run by default**, with five exceptions. What runs is self-certifying: `tests/e2e/perf-hooks.spec.ts` asserts the instrumentation contract, two Layer 1 tests in `tests/e2e/perf-budget.spec.ts` assert off-screen pausing and reduced-motion behaviour, and 24 goldens in `tests/e2e/pixel-gate.spec.ts` still match this tree, so ADR 0007's "regenerate only on a commit that declares visual intent" is enforceable · an intentional hero edit carries `--update-snapshots` in that commit, and a red golden is a finding to read before it is a snapshot to re-record. Five tests skip unless `PERF_HARNESS=1`; issue #11 names each and why. Two notes the default suite now inherits: the goldens have only `-darwin` variants, so a bare `npx playwright test` is Mac-bound, and `playwright.config.ts` is `workers: 1`, so the suite is serial.

The deep record is `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md`.

