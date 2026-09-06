# Architecture

How each surface of the site works today. One section per surface, present tense, current tree only.

Read the section for the surface you are about to touch. The rules you obey every turn are in `CLAUDE.md`; the reasoning behind a choice is in `docs/adr/`.

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

Plus Jakarta Sans, variable 200 to 800, local TTF under `/public/fonts/`. It is both the display and the body face, lowercase throughout. There is no `--font-mono`.

**The Anton fence.** Anton (self-hosted, weight 400, latin and latin-ext, `font-display: swap`, preloaded) is used by the Selected Work morphing title and by nothing else. Jakarta is the site voice.

## Canvases

Three canvases are mounted; at most two run at once.

- **`FluidWaves`** (`src/components/canvas/FluidWaves.tsx`) is one shared raw-WebGL component with `variant: 'hero' | 'backdrop'`. The hero variant is the full-strength background: seeded scattered wave motion, tricolor paint, smooth, with no pixel quantization. The backdrop variant is the same shader dimmed in CSS (`opacity: 0.22; filter: saturate(0.7)`) behind Contact/Footer, lazy-mounted as the stage nears the viewport, with `dissolveStrength` 0. Each instance seeds independently.
- **`SelectedWorkScene`** (`src/components/canvas/SelectedWorkScene.tsx` plus `src/components/canvas/scene/`) is the third canvas and the only one rendered by React Three Fiber. It lives in the Projects lazy chunk. Decision: ADR 0009.

**The hero dissolve.** The hero variant runs a shader-side organic cream dissolve at the bottom of its band: a 2D fBm field dragged by the flow coordinate, a narrow threshold window plus a low-frequency sweep, and a hard cream floor. The hero section is `130svh` and melts into the cream Selected Work chapter. Tuning knobs `DISSOLVE_NOISE_AMP`, threshold and sweep sit at the top of the file.

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

**Then the hero text rises.** Once `entranceDone` resolves at the 92 % handoff, `src/components/sections/Hero.tsx` flips `entered` and the role line plus the two name lines rise from `y:110%` out of their `.hero-line-mask` clips, staggered on the house ease in Framer. Reduced motion and SPA back-navigation (`entranceBypassed`) go straight to the settled state with no rise. `MotionContext` holds `entranceDone` and its resolver; `main.tsx` is the sole gate resolver on the normal path.

## Hero

`src/components/sections/Hero.tsx`. A `min-height:130svh` section, where the extra roughly 30svh is the shader's cream-dissolve band, holding an absolute `100svh` `.hero-zone` that re-anchors the text plane so the name and role never fall into the dissolve. The canvas sits absolute behind the text. There is no scrim layer.

Anatomy: a monumental bottom-left signature name `h1.hero-name` reading `kevin` / `shibuya.` at `clamp(64px,12vw,200px)`, weight 650 to 750, line-height about 0.92, letter-spacing −0.03em, cream. Each line is a `.hero-line` span inside its own `.hero-line-mask` clip row; overflow is released to visible once `.hero-bottom.is-entered`, so the role focus ring and glyph descenders are not clipped at rest. A cycling role line sits directly above the name (`.hero-role`, inside a `.hero-line-mask.hero-role-line`, cycled by click or keyboard), where `roles[0]` is the canonical title `senior front-end engineer · react/typescript`.

**Hero text contrast is a documented AA exemption, owner-ratified.** The hero text (name, role, dark-context nav) renders plain cream directly on raw shader paint: no scrim, no text-shadow halo, no shader-side darkening of any kind between the text and the paint. This deliberately fails AA over the brightest paint. Soft treatments proved unsatisfiable at roughly 1.8 to 2.3:1 over worst-case yellow, and a worst-pixel 4.5:1 needs a near-opaque halo, which was rejected aesthetically. Keep it as it is: the owner accepts the tradeoff.

The sole sanctioned exception is an opt-in `@media (prefers-contrast: more)` layer for users whose OS asks for more contrast: dense ink halos on the name and role, and the dark-context nav takes its scrolled-style ink bar full-time. The default presentation stays untouched. The canonical record is the `.hero-zone` comment block in `src/index.css`. Decision: ADR 0004.

## Nav

Dark-restyled on the canonical tokens: brand mark left, links center, EN/PT toggle right. `.nav-link` rests at `rgba(245,242,236,.85)`, near-full cream, because the `--text-faded` gray read muddy on raw hero paint; hover lifts to full `--text`. There is no availability pill; that meta lives in the hero.

**`.nav--on-light`** is the cream-chapter variant: links at `--color-ink-on-light-muted` lifting to ink on hover, a deep-blue underline and brand dot, an ink brand tile with cream text, and a scrolled background of `rgba(245,242,236,.85)` over a light hairline.

It is toggled by an `IntersectionObserver` on `#chapter-light` with `rootMargin: -8% 0px -91% 0px`. The observed element is the whole chapter; the band is unchanged, because a `rootMargin` cannot express a chapter. A `MutationObserver` re-arms it for the lazy chunk. `theme-color` swaps with it: `#F5F2EC` on-light, `#0B0E14` otherwise.

## Light chapter

One wrapper element `#chapter-light` in `src/pages/Home.tsx` holds, in order, `#projects`, `#archive`, `#work`, `#stats` and `#skills`. It paints `--color-surface-light` and carries a scoped re-declaration of nine canonical tokens (`--bg`, `--bg-tonal`, `--text`, `--text-muted`, `--text-faded`, `--hairline`, `--accent-pink`, `--accent-blue`, `--accent-yellow`), so every descendant rule that already reads a canonical token inverts with zero per-rule edits.

**The wrapper is a plain block on purpose: it carries no `overflow` and no `position`.** The `position: sticky` stage inside `#projects` needs the viewport as its scroll container, and either property on an ancestor silently breaks the pin.

`--text-faded` is remapped to the muted value inside the chapter. No alpha between 0.62 and ink is both AA-passing and visually distinct from 0.62, so the faded step survives only on `aria-hidden` decoration (`.workrow-index`, `.workrow-arrow`), applied by hand.

**A rule inside the light chapter reads a canonical token, never a legacy alias.** The inversion works by re-declaring the canonical tokens, and an alias is invisible to that scope: it keeps resolving to cream and renders cream text on cream.

**The one thing the scope cannot reach is an inline custom property.** `--row-tint*` are set on the `.workrow` and `.stack-inner` style attribute, and an inline value beats any ancestor declaration. So every raw-tint consumer in the chapter is overridden explicitly: the `.work-*` panel marks (`.work-mode-dot`, `.work-bullets li::before`, the `.work-highlight` border), `.work-highlight-label`, and the WorkRow title hover tint. `.stack-card-arrow` deliberately keeps its raw `--row-tint`, because it sits on the card's ink pill where raw tricolor is correct.

**Tonal rhythm:** Selected Work cream, Archive tonal, Work Experience cream, Stats cream, Skills tonal. Each is inherited from that section's existing `.section--sand` assignment seen through the scope, not composed separately for cream.

**Exit veil** (`.chapter-exit-veil`): 30svh, `--color-surface-light` to `--bg`, `aria-hidden`, a pure gradient. It is a sibling placed after `#chapter-light`, never a child: its gradient ends in `var(--bg)`, which the scope resolves to cream, so nesting it would erase the fade. No text ever sits in a veil band.

**There is no CSS entry veil.** The hero's `100svh` `.hero-zone` is inviolable, and the entry ramp is the shader's cream dissolve across the hero's lower 30svh (grep `dissolve` in `src/components/canvas/FluidWaves.tsx`, `hero-zone` in `src/components/sections/Hero.tsx`).

`html` and `body` stay ink, so overscroll edges are dark.

## Selected Work scene

The page centerpiece: a real 3D environment in the third canvas. Code in `src/components/sections/Projects.tsx`, `src/components/canvas/SelectedWorkScene.tsx` and `src/components/canvas/scene/`, with the pure helpers in `src/utils/sceneMotion.ts`. Decisions: ADR 0009 (third canvas via R3F), ADR 0010 (scroll is the playhead, time is the breath), ADR 0011 (the card is the object). Specs and plans: `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md` and their plans.

### Anatomy

`section#projects.section.projects-scene-section` is **full-bleed**: it overrides `.section`'s 1440 cap and 80/20 px gutters to `max-width: none; padding-inline: 0`, because the corridor overflows the frame by design (a card mid-approach, the overture past 0.7 of the width) and that overflow has to clip at the viewport edge, not 80 px inside it. `.scene-fallback` carries its own gutter instead, `width: min(620px, 100% - 40px)`.

Inside: `nav.scene-skiplinks` (the keyboard and screen-reader path into a project), then `div.scene-scroll` (550svh, the `useScroll` target), then `div.scene-sticky` (100svh, pinned), then `div.scene-inner`, holding `div.scene-canvas-wrap[aria-hidden][data-ready]` and a static `h2.scene-title-sr.sr-only` naming the section.

No eyebrow, no overlay, and no DOM element tracks the settled card: the card carries its own caption and is pressable.

### Corridor and playhead

The four featured projects (`highlightOrder ≤ 4`) stand along a corridor in depth, alternating side and yaw; scroll dollies the camera through it.

`playheadFor(p) = p·4.5 − 1.5`, ranging over `[−1.5, 3]`. The leading 150svh is the **approach**. `[−1.5, −0.5)` is the **overture**: one Jakarta line, `sections.projects.overture`, standing on the camera's eye line at `overtureZ`, the point the camera reaches at −0.5. It fills 0.7 of the width at the top, grows as the camera nears, fades over the last 0.35 units and is gone the moment the cards read. `[−0.5, 0)` is the surfacing, card 0 coming out of the fog and the title out of blur. Then one viewport per card.

The camera is one continuous ease from −1.5 to 0 (`easedSeg`), starting `CORRIDOR_DEPTH` (about 3.86 spacings) back, derived so that at −0.5 it sits exactly one spacing behind card 0. Every integer playhead is a settled state and the whole thing is exactly reversible. Settled card k sits at scroll fraction `(k + 1.5) / 4.5`.

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

`titleCapPx` floors at 56, and at 72 in portrait. Nine per cent of a phone's width is 35 px, so the floor is what actually decides the phone title; 56 read at 0.14 of the card against the desktop's 0.167, and 72 restores that ratio (measured cap 55.6 px on a 343 px card at 390x844).

**Layer 1.** The title and the overture live on `TITLE_LAYER` (`src/components/canvas/scene/sceneRefs.ts`), which the composer never renders. `TitlePass` in `src/components/canvas/scene/Environment.tsx` narrows the camera to layer 0 before the composer and, after it, rebuilds depth with a depth-only render and draws layer 1 depth-tested, so depth of field and grain never touch them. Without a composer the camera keeps layer 1 enabled and they render in the main pass.

### Card size

A fraction of the frame **width**, capped at `CARD_MAX_PX` 620 px in both orientations. Portrait is `min(0.88, 620/width)`: a flat 0.88 made the 620 cap false for every portrait viewport past about 705 px, so tablets drew 722 to 900 px cards. Floored at `CARD_MIN_PX` 287 px, so the caption name never drops under 12 px.

### Environment

Cream floor, fog and clear colour, all `#F5F2EC`, so there is no horizon and the floor reads only through the per-card blurred blob shadows. Those are tinted by `accentDeepLargeFor`, the decorative channel, because the deep channel's yellow slot is an `rgba()` string that `THREE.Color` cannot take.

Nothing glows around a card. Rounded corners are cut by geometry, never by an alpha mask, so depth stays honest at the corners.

### Breath

Cards bob, yaw and pitch on unrelated periods with a per-card phase. Scroll velocity feeds an energy accumulator that scales those amplitudes and leans the corridor against the direction of travel. The settled card tilts up to 6° toward a fine pointer and the title parallaxes a quarter of the way against it. The overture line breathes on a fifth phase.

All of it is off under reduced motion, which keeps the pin, shows the overture as a still frame and swaps cards instantly.

### Caption

`src/components/canvas/scene/Caption.tsx`, rasteriser `src/components/canvas/scene/textTexture.ts`. On the left of the white body band: the name (`CAPTION_NAME_PX` 26 of the 620 px card, weight 600, ink `#0B0E14`) and `year · tech · tech` (14, weight 500, `rgba(11,14,20,.62)`). On the right, the `↗` (22, `accentDeepLargeFor(i)`).

They are Jakarta textures on planes inside the card group at `renderOrder` 1, because three's distance sort would otherwise put the frame over them. They fog and fade with the card, and are drawn at the card's projected width in device px so the caption is 1:1 at rest. Names ellipsise on one line.

Legibility floor: `sceneGeometry` never lets the card go under `CARD_MIN_PX` 287 px, so the name is at least 12 px on every viewport from 320 px up. It binds on landscape phones and at 320 px portrait.

### Pointer

R3F pointer events on each card group in `src/components/canvas/scene/Corridor.tsx` are the only way the pointer reaches a card. Hover writes `sceneRefs.hover` and the cursor on the canvas element; the rig lerps a lift toward the camera (`HOVER_LIFT`, `HOVER_SCALE` 1.02, `HOVER_TAU` 0.2 s) for the settled card only, and slides its arrow 2 px up and right. A click with `event.delta > 6` px is a scroll, not a tap.

`onCardClick(i)` is decided in `Projects.tsx`, the Router root: the settled card navigates to its project, and any other card scrolls into the slot through Lenis (`scrollTargetFor`), instantly under reduced motion.

**No router, and no DOM beyond `gl.domElement`, inside `src/components/canvas/`.**

### Fallback and data attributes

`div.scene-fallback` replaces `.scene-scroll` entirely when WebGL2 is missing or the context is lost: four framed cards in normal flow, no pin, permanent for the session.

The scene reports its state on the real canvas element as data attributes, written only when they change, and nothing in React reads them:

- `data-canvas="selected-work-scene"`
- `data-slot`, `"0"` to `"3"`, the settled card
- `data-overture`, `"true"` or `"false"`
- `data-registrations`, how many times the corridor registered its objects: `"1"` on a production build across a full scrub, `"2"` on the dev server under StrictMode

## WorkRow

The section-list primitive, in `src/components/ui/WorkRow.tsx`, used by Archive and Work Experience. Selected Work does not use it; that is the pinned R3F scene.

An open typographic row, no card. Anatomy: `.workrow-index` (zero-padded, faded, tabular-nums), `.workrow-title` (oversized lowercase, `clamp(28px,4.6vw,64px)`, weight 550, cream, tinting to `--row-tint` on hover and focus), `.workrow-meta` (faded spans joined by `·`), `.workrow-arrow` (`↗` on a link, `+` rotating 45° when expanded). A bottom hairline per row; the list owner adds the top hairline.

On desktop hover, a pointer-tracking `.workrow-float` preview runs on Framer's `useMotionValue` and `useSpring`, never `setState` above the list. On touch and no-hover pointers, an inline `.workrow-thumb` stands in instead. The expandable variant swaps the row for a real `<button aria-expanded>` with an `AnimatePresence` panel. Every variant carries a visible cream `:focus-visible` ring.

Archive and Work Experience reuse it verbatim, Work Experience in the expandable variant. Neither has bespoke row markup.

**Inside the light chapter** WorkRow inverts through the token scope alone; its `.workrow-*` rules are never edited. The hover title tint reads `--row-tint-deep-large`, `.workrow-index` and `.workrow-arrow` take the faded on-light step (both `aria-hidden`), and the Work Experience panel's `.work-*` marks read the deep channels.

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

**Projects** are fully fledged work with dedicated routes at `/projects/:slug`. Title and description are `{ en, pt }` pairs. `highlightOrder ≤ 4` selects the four projects the Selected Work scene stands in its corridor.

**Embeds** are day-to-day interactives published on GZH (`gauchazh.clicrbs.com.br`) with no dedicated page. The source of truth is `src/data/embeds.csv`, semicolon-delimited, with the columns `DATA PUBLICAÇÃO`, `EDITORIA/COLUNISTA`, `FORMATO`, `ATIVIDADE`, `LINK MATERIA`, `NOME`. `FORMATO` is always `PROGRAMAÇÃO` and is ignored.

An embed's `title` is Portuguese only, because it is editorial content. `imagePreview` is optional; where it is missing, a styled placeholder with a type badge stands in.

Embeds render as a filterable, scrollable gallery, never as individual pages. The filters are `type` and `editorial`.

**Archive items** are the rows Archive lists through `WorkRow`, from `src/data/archive.ts`.
