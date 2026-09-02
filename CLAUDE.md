# Portfolio — Claude Instructions

## Project
A complete revamp of a developer portfolio. Built with React 19 + TypeScript + Vite.
The MVP exists in `src/App.tsx` — the revamp will decompose it into proper components.

## Tech Stack
- **Framework**: React 19 + TypeScript (strict)
- **Build**: Vite 6 + SWC
- **Styling**: TailwindCSS v4 (Vite plugin — no `tailwind.config.js`, configure via CSS `@theme`)
- **Animation layer 1 — React**: Framer Motion v12
- **Animation layer 2 — Scroll/Timeline**: GSAP + ScrollTrigger
- **Animation layer 3 — WebGL/3D**: React Three Fiber (@react-three/fiber + @react-three/drei)
- **i18n**: react-i18next (bilingual EN + PT — built in from day one, not retrofitted)
- **Package manager**: npm

## Design Direction
Dark ink + WebGL shader craft. Lowercase, monumental, confident — cream text on near-black ink, with a tricolor accent (pink-red, blue, yellow) carried entirely by two raw-shader canvases and rotated per-row tints. The page runs a deliberate tonal arc: dark ink at both ends, a cream **light chapter** through the middle (Selected Work → Skills), and dark again at the Contact/Footer stage. No bento cards, no ink-draw entrance — every prior MVP-era visual system below was retired by the `webgl-pivot` plan (2026-07-19).

- **Colors** (canonical tokens in `src/index.css` `@theme`/`:root`; contrast-audited, do not change a hex without recomputing the AA table):
  - Base: `--color-bg` / `--bg` `#0B0E14` (page ink), `--color-bg-tonal` / `--bg-tonal` `#131722` (tonal section).
  - Text: `--color-text` / `--text` `#F5F2EC` (cream, body+display), `--color-text-muted` / `--text-muted` `#C9C4BA` (secondary), `--color-text-faded` / `--text-faded` `#A8A49C` (meta/faded). Hairline borders `rgba(245,242,236,0.13)`.
  - Tricolor accent (the ONLY color, shared by the shaders and `accentFor()` row tints): `--color-accent-pink` `#E64D66`, `--color-accent-blue` `#4D80E6`, `--color-accent-yellow` `#E6CC4D`. A lighter hover value `#7AA0ED` covers hover states, remapped onto the legacy `--blue-200`/`--blue-300`/`--blue-500` aliases below — no dedicated token of its own.
  - **On-light set** (the light chapter's system): `--color-surface-light` `#F5F2EC` (cream ground), `--color-surface-light-tonal` `#EDE9E0` (deeper cream, the tonal step), `--color-ink-on-light` `#0B0E14` (primary text), `--color-ink-on-light-muted` `rgba(11,14,20,.62)` (always-visible small text, ≥5.1:1), `--color-ink-on-light-faded` `rgba(11,14,20,.40)` (2.62:1 — **aria-hidden decoration ONLY**, never always-visible text), `--color-hairline-on-light` `rgba(11,14,20,.12)`. Deep tricolor: `--color-accent-pink-deep` `#B22B47`, `--color-accent-blue-deep` `#2A54B5`, `--color-accent-yellow-deep` `#7A6800`.
  - **The yellow rule.** Deep yellow `#7A6800` measures 4.94:1 on cream and DOES pass small-text AA. It is nonetheless substituted for the ink-muted step in small text because at small sizes it reads dark-olive — an **aesthetic** rule, deliberately kept, not a contrast failure. Large text and decorative marks use the real hex.
  - **Three palette helpers, three row channels** (`src/utils/palette.ts`): `accentFor(i)` → raw tricolor, on-ink; `accentDeepFor(i)` → on-light small text, yellow slot emits ink-muted; `accentDeepLargeFor(i)` → on-light large text (WCAG large) and decoration, yellow slot emits `#7A6800`. `WorkRow.tsx` sets all three on every row as `--row-tint` / `--row-tint-deep` / `--row-tint-deep-large`.
  - **Legacy CSS var aliases** (`--cream`, `--sand`, `--mist`, `--ink`, `--bark`, `--dust`, `--blue-*`, `--periwinkle-*`) remain in `:root`, remapped onto the dark system so the whole light-era stylesheet flips without a rewrite — role names kept their vars, so e.g. `--cream` is now dark (page bg) and `--ink` is now light (text). New work reads from the canonical `--color-*`/`--text`/`--bg` names above; the aliases are accepted debt (Plan risk 5), not a pattern to extend. **A rule inside the light chapter must never read an alias**: the chapter's inversion works by re-declaring the canonical tokens, and an alias is invisible to that scope — it would keep resolving to cream and render cream text on cream.
- **Typography**: Plus Jakarta Sans (variable 200–800, local TTF at `/public/fonts/`), unchanged — used for both display and body, lowercase throughout. `--font-mono` was dropped (dead token). **Anton fence**: Anton (self-hosted, weight 400, latin + latin-ext, `font-display: swap`, preloaded) is used by the Selected Work morphing title and NOTHING else; Jakarta is the site voice.
- **Shapes**: Open typographic rows, no cards/containers (exception: the selected-work card-stack cards, which are deliberate framed cards — the sanctioned centerpiece). Rounded-full pills/chips/buttons survive where used (filters, tags); no rounded card frames.
- **Accent usage**: Tricolor is applied via `accentFor(index)` (`src/utils/palette.ts`, `ACCENTS = ['#E64D66','#4D80E6','#E6CC4D']`, index-rotated) as a per-row `--row-tint` CSS var — never a static per-component color choice.
- **Canvases (max 2 on the page)**:
  - `FluidWaves` (`src/components/canvas/FluidWaves.tsx`) — ONE shared raw-WebGL component, `variant: 'hero' | 'backdrop'`. Hero = full-strength background (seeded scattered wave motion, tricolor paint, smooth — no pixel quantization) with a shader-side organic cream dissolve at the bottom of its band (2D fBm field dragged by the flow coordinate, narrow threshold window + low-freq sweep, hard cream floor — the hero section is `130svh` and melts into the cream Selected Work chapter; tuning knobs `DISSOLVE_NOISE_AMP`/threshold/sweep live at the top of the file). Backdrop = the SAME shader dimmed via CSS (`opacity: 0.22; filter: saturate(0.7)`) behind Contact/Footer, lazy-mounted as the stage nears viewport, no dissolve (`dissolveStrength` 0). Each instance seeds independently. Both variants run a scroll-coupled sim clock: scroll velocity adds a small boost to the shader time rate (~1.5x steady scroll, capped 2x on a flick; 0.15s attack / 0.9s decay, velocity read per-frame in the rAF loop) so the paint stirs while the page moves and settles with follow-through.
  - Both: `devicePixelRatio` capped at 1.5, `IntersectionObserver` sets `data-paused="true"` off-screen for every canvas (reduced motion included) and halts the rAF loop, `prefers-reduced-motion` also renders one static frame (`data-static="true"`) and never starts the loop, context-loss fallback (hero → gradient div `data-testid="fluid-waves-fallback"`; backdrop → stage ink stands). The rAF loop runs FROM MOUNT (no entrance gate) so paint animates during the loader exit. Hero canvas `data-canvas="fluid-waves"`; backdrop `data-canvas="fluid-waves-backdrop"`.
- **Hero text contrast (DOCUMENTED AA EXEMPTION, owner-ratified 2026-07-23)**: the hero text (name, role, dark-context nav) renders plain cream DIRECTLY on raw shader paint — no scrim, no text-shadow halo, no shader-side darkening of any kind between the text and the paint (the old `.hero-scrim` and the interim "ink aurora" text-shadows are both retired). This deliberately fails AA over the brightest paint (soft treatments proved unsatisfiable: ~1.8–2.3:1 over worst-case yellow; a worst-pixel 4.5:1 needs a near-opaque halo, rejected aesthetically) — the owner explicitly accepts the tradeoff; do NOT reintroduce a contrast layer. Sole sanctioned exception: an opt-in `@media (prefers-contrast: more)` layer (dense ink halos on name/role + the dark-context nav gets its scrolled-style ink bar full-time) for users whose OS requests more contrast — the default presentation stays untouched. Canonical record: the `.hero-zone` comment block in `src/index.css`.
- **Hero anatomy**: `min-height:130svh` section (the extra ~30svh is the shader's cream-dissolve band); an absolute `100svh` `.hero-zone` re-anchors the text plane so name/role never fall into the dissolve. Canvas absolute behind → text (no scrim layer — see the AA exemption above). Monumental bottom-left signature name `h1.hero-name` (`kevin` / `shibuya.`, `clamp(64px,12vw,200px)`, weight 650–750, line-height ~0.92, letter-spacing −0.03em, cream), each line a `.hero-line` span inside its own `.hero-line-mask` clip row (overflow released to visible once `.hero-bottom.is-entered`, so the role focus ring and glyph descenders aren't clipped at rest). Cycling role line directly above the name (`.hero-role`, in a `.hero-line-mask.hero-role-line`, click/keyboard cycle, `roles[0]` = canonical title `senior front-end engineer · react/typescript`). No hero meta block (the top-right location/availability was removed).
- **Light chapter (Projects → Skills on cream)**: one wrapper element `#chapter-light` in `Home.tsx` holds, in order, `#projects`, `#archive`, `#work`, `#stats`, `#skills`. It paints `--color-surface-light` and carries a **scoped re-declaration of nine canonical tokens** (`--bg`, `--bg-tonal`, `--text`, `--text-muted`, `--text-faded`, `--hairline`, `--accent-pink`, `--accent-blue`, `--accent-yellow`), so every descendant rule that already reads a canonical token inverts with zero per-rule edits. The wrapper is a plain block on purpose: **no `overflow`, no `position`** — the `position: sticky` stage inside `#projects` needs the viewport as its scroll container, and any `overflow` on an ancestor silently breaks the pin.
  - `--text-faded` is remapped to the **muted** value inside the chapter: no alpha between 0.62 and ink is both AA-passing and visually distinct from 0.62, so the faded step survives only on `aria-hidden` decoration (`.workrow-index`, `.workrow-arrow`), applied by hand.
  - **The one thing the scope cannot reach** is an inline custom property: `--row-tint*` are set on the `.workrow` / `.stack-inner` style attribute, and an inline value beats any ancestor declaration. So every raw-tint consumer in the chapter is overridden explicitly — the `.work-*` panel marks (`.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border), `.work-highlight-label`, and the WorkRow title hover tint. `.stack-card-arrow` deliberately keeps its raw `--row-tint`: it sits on the card's ink pill, where raw tricolor is correct.
  - **Tonal rhythm**: Selected Work cream, Archive tonal, Work Experience cream, Stats cream, Skills tonal.
  - **Exit veil** (`.chapter-exit-veil`): 30svh, `--color-surface-light` → `--bg`, `aria-hidden`, pure gradient. It is a **SIBLING placed after `#chapter-light`, never a child** — its gradient ends in `var(--bg)`, which the scope resolves to cream, so nesting it would erase the fade. **No text ever sits in a veil band.**
  - There is **no CSS entry veil**: the hero's `100svh` `.hero-zone` is inviolable, and the entry ramp is the shader's cream dissolve across the hero's lower 30svh (`src/components/canvas/FluidWaves.tsx`, grep `dissolve`; `src/components/sections/Hero.tsx:217`).
  - `theme-color` follows the nav flip (`#F5F2EC` on-light, `#0B0E14` otherwise). `html`/`body` stay ink so overscroll edges are dark.
- **Selected Work stage (`src/components/sections/Projects.tsx` + `src/components/ui/{GooeyTitle,ProjectCardStack}.tsx`, helpers `src/utils/stackMotion.ts`)**: the page centerpiece — a `400svh` scroll wrapper drives a `position: sticky; height: 100svh` stage where the top-4 featured projects (`highlightOrder ≤ 4`) cycle through an animated card stack under a gooey-morphing title. Scroll IS the playhead (fully reversible, holds mid-morph) via Framer `useScroll` → `scrollYProgress` → pure helpers (`segmentFor`/`settleFrac`/`depthTransform`/`morphValues`). Zero React state per frame: EVERY per-frame visual (card y/scale/opacity/shadow/zIndex, title span blur/opacity) derives from ONE continuous scroll channel `segCont` (0..n-1) via pure functions (`cardStyleAt`/`spanMorph`), so the single `frontIndex` state flips only at midpoints and feeds ONLY non-visual attrs (interactive `<Link>`, aria, meta text, `--row-tint`, `staticTitle`).
  - **Heading**: no `SectionHeading` here — a whisper eyebrow `.stack-eyebrow` (`01 · selected work`, muted, uppercase, 0.18em tracking) whose numeral `.stack-eyebrow-num` is `--color-accent-pink-deep`.
  - **Title**: Anton 400, `clamp(56px, 9vw, 150px)`, line-height 0.95, ink; all spans stacked in one `inline-grid` cell with `place-self: center` (so mixed 1- and 2-line titles stay aligned); threshold matrix `255 −170`, `BLUR_CAP = 180`.
  - **Card** (Shadway anatomy): white `#FFFFFF`, radius 16px, 1px `--color-hairline-on-light` border, 12px padding; `.stack-card-frame` `16/9.5` inset, radius 10px, on `--color-surface-light-tonal`; body row = `.stack-card-name` (Jakarta 700, ink) + `.stack-card-subtitle` (`year · tech`, muted) + `.stack-card-pill` (ink pill, cream `view` text, arrow `.stack-card-arrow` in raw `--row-tint`).
  - **Geometry**: `SLOTS` y `12 / −16 / −44`, scale `1 / .95 / .9`, `EXIT_Y = 520`; `.stack-cards` is `min(46vw, 620px)` at aspect `620 / 448`; shadow `0 24·s px 64·s px rgba(11,14,20, .14·s)`.
  - Two tint channels set from `frontIndex`: `--row-tint` (raw) and `--row-tint-deep` (small-text-safe).
  - Reduced motion keeps the pin but removes ALL animation (static slots, instant swaps, no SVG filter — the threshold matrix can artifact static glyph edges). Keyboard/SR path: a visually-hidden-until-focused skip-link project index; buried cards are `aria-hidden` + `tabIndex={-1}` + `pointer-events:none`.
- **Loader + entrance (the ks. vignette explodes, then the text rises)**: the loader is an inline SVG in `index.html` (pre-bundle first paint) — an ink `#0B0E14` rect masked by static `ks.` glyph-outline windows (paths extracted from Plus Jakarta Sans 700; no font dependency) that reveal the shader; the windows sit in a `<g class="loader-ks">` wrapper that GSAP scales for the exit. Behind it, a dim tricolor CSS-gradient stand-in (subtly drifting) reads as paint pre-React; on mount the stand-in fades to reveal the live (already-looping) hero canvas through the windows. Two bottom-corner cream-on-ink HTML meta labels only — `portfolio · 2026` (BL), `react · typescript · webgl` (BR); the two top corners were removed (hardcoded EN). `main.tsx` orchestrates the exit: after React paints + a ~1.2 s savor dwell (reduced-motion 200 ms, 3 s hard fallback), it contracts the whole `ks.` cutout to 0.96× (0.18 s, house — anticipation) then explodes it to 45× (1.1 s, `power4.in` quintic — accelerating; an inOut's decel tail would play off-screen) about a near-center origin (viewBox 53.65, 50) inside the s glyph's upper-bowl spine — the mark itself is optically centered on "ks" (positioning `translate(34.52 …)`; the trailing dot hangs right and is excluded from centering), so the expansion reads centered and the viewport ends inside a letterform window — ink gone, hero revealed; corner labels drift 12 px outward+down while fading (0.22 s) at launch, and the handoff (`resolveEntrance()`) fires at ~92% of the explosion (wall-clock setTimeout), when the ink has cleared the name region; `finishLoader()` removes the loader at 100%. Reduced motion: 150 ms opacity fade, static shader frame, no explosion. **The hero text then rises in**: once `entranceDone` resolves (at the ~92% handoff), `Hero.tsx` flips `entered` and the role + two name lines rise from `y:110%` out of their `.hero-line-mask` clips (Framer, staggered, house ease); reduced-motion and SPA back-nav (`entranceBypassed`) skip straight to the settled state (no rise). `MotionContext` keeps `entranceDone`/its resolver (the unconsumed curtain gate was deleted in the PR #2 fix wave); `main.tsx` is the sole gate resolver on the normal path.
- **WorkRow (the section-list primitive for Archive + WorkExperience — `src/components/ui/WorkRow.tsx`)**: open typographic row, no card. (Selected Work no longer uses WorkRow — it is the pinned scroll-scrubbed `ProjectCardStack` + `GooeyTitle` stage; see the Selected Work bullet.) Anatomy: `.workrow-index` (zero-padded, faded, tabular-nums) · `.workrow-title` (oversized lowercase, `clamp(28px,4.6vw,64px)`, weight 550, cream, tints to `--row-tint` on hover/focus) · `.workrow-meta` (`·`-joined faded spans) · `.workrow-arrow` (`↗` link / `+` rotating 45° expanded). Bottom hairline per row; list owner adds the top hairline. Desktop hover: a pointer-tracking `.workrow-float` preview (Framer Motion `useMotionValue`/`useSpring`, never `setState` above the list). Touch/no-hover: inline `.workrow-thumb`. Expandable variant swaps the row for a real `<button aria-expanded>` with an `AnimatePresence` panel. Visible cream `:focus-visible` ring on every variant. Reused verbatim by Archive and WorkExperience (expandable) — no per-section bespoke row markup. **Inside the light chapter** WorkRow inverts through the token scope only (its `.workrow-*` rules are never edited): the hover title tint reads `--row-tint-deep-large`, `.workrow-index`/`.workrow-arrow` take the faded on-light step (both `aria-hidden`), and the WorkExperience panel's `.work-*` marks read the deep channels.
- **Animations**: GSAP = one-shot entrance orchestration ONLY (see above); Framer Motion = hover/expand/enter-view states (WorkRow float, expand panels, section stagger-in). Never both on the same animation. Respect `prefers-reduced-motion` everywhere (static hero frame, no float, instant panels). Framer scroll-scrub (`useScroll`/`useTransform` bound to scroll progress) is a sanctioned lane alongside Framer state-driven animation, used solely by the Selected Work stage; GSAP remains entrance-only.
- **Layout**: Max-width 1440 containers, 80px side padding on desktop. Hero = full-bleed canvas stage. Archive and WorkExperience converge on the WorkRow row language; Selected Work is the pinned card-stack stage and Skills is its own `.skills-*` list (no bento grid, no numbered table). Contact + Footer share one `.contact-footer-stage` (canvas z-0, content z-1).
- **Tonal sections**: on ink, `--bg-tonal` (`#131722`) marks alternate sections and base sections sit on `--bg` (`#0B0E14`). Inside the light chapter the same rhythm runs on cream: `--color-surface-light-tonal` (`#EDE9E0`) for Archive and Skills, `--color-surface-light` (`#F5F2EC`) for Selected Work, Work Experience and Stats.
- **Nav**: dark-restyled on canonical tokens — brand mark left, links center, EN/PT toggle right; unchanged markup/structure from the split variation, values now read from the dark system instead of the light palette (`.nav-link` rests at `rgba(245,242,236,.85)` near-full cream — `--text-faded` gray read muddy on raw hero paint; hover lifts to full `--text`). No availability pill (dropped pre-plan); meta lives in the hero instead. **`.nav--on-light`** is the cream-chapter variant: links `--color-ink-on-light-muted` lifting to ink on hover, deep-blue underline and brand dot, ink brand tile with cream text, and a scrolled background of `rgba(245,242,236,.85)` over a light hairline. It is toggled by an `IntersectionObserver` on **`#chapter-light`** with `rootMargin: -8% 0px -91% 0px` (the observed element widened to the whole chapter; the band is unchanged — a rootMargin cannot express a chapter), re-armed via a `MutationObserver` for the lazy chunk. `theme-color` swaps with it.
- **Contact/Footer stage**: `FluidWaves` (`variant="backdrop"`) canvas behind dark-restyled `Contact` + rewritten `Footer` (footer marquee/ink-draw name deleted — see NO list). `footer.location` key added.
- **Section flow**: Hero → Projects → Archive → WorkExperience (expandable) → Stats → Skills → Contact → Footer. Work-first order (baseline behavior; no reorder needed by this plan).
- **NO**: a light theme OUTSIDE the sanctioned chapter (the hero, Contact and Footer stay ink; no light variant of the nav beyond `.nav--on-light`), bento cards, numbered-table embed rows, MarqueeDivider ghost-text dividers, ink-draw hero entrance (`HeroNameDrawing`, `glyphPaths`, extracted glyph paths), scramble text (`ScrambleText`/`useScramble`, deleted as dead code), the R3F hero accent (`HeroAccent3D`/`HeroAccentSilhouette`, `@react-three/fiber`/`@react-three/drei` removed), a third canvas anywhere on the page, spinning loaders, spaced em-dashes (` — `) in reader-facing prose — use `·`, the horizontal curtain-split loader (two tear-half panels + LCP tear-halves), the old GSAP paint-bloom cascade (the entrance is now a Framer clipped rise gated on `entranceDone`, see above — that's current, not forbidden), a hero meta block, `LiningWavesBackdrop` (three.js — deleted; the three dependency removed), the shader pixel-quantization pass (`pixel_filter`/`PIXEL_FILTER`), the six-stain ink-bleed loader exit (stain circles + the feTurbulence roughen filter — replaced by the ks. vignette explosion), **Anton anywhere but the Selected Work title**, **a CSS entry veil on the hero** (the shader dissolve owns it), and **the exit veil inside `#chapter-light`**.
- **Standing rule**: any palette/token change ships with a recomputed AA contrast audit across every affected text/background pair (the plan's contrast table is the authority for the current hexes) — verified, not hoped. The Plan B table below and `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` are the authority for the on-light pairs.
- **Light-chapter contrast (Plan B, ratified 2026-09-02)**. Grounds: cream `#F5F2EC` (Selected Work, Work Experience, Stats, and the wrapper), tonal cream `#EDE9E0` (Archive, Skills; also the `.pill` surface), white `#FFFFFF` (card interiors only).

  | # | pair (element → color it resolves to) | ground | ratio | need | verdict |
  |---|---|---|---|---|---|
  | 1 | `.section-title`, `.workrow-title`, `.stats-row-value`, `.skills-title`, `.archive-count strong`, dropdown text, search text, `.work-highlight p`, `.pill:hover` text → ink `#0B0E14` | cream / tonal | 17.29 / 15.94 | 4.5 | ✅ |
  | 2 | `.section-desc`, `.workrow-meta` (+ `·` separators), `.workrow-ornament`, `.workrow-panel`, `.stats-row-num`, `.stats-row-ann`, `.skills-num`, `.skills-item`, `.archive-chip`, dropdown label/caret/options, `.archive-count`, search placeholder, `.work-meta-line`, `.work-location`, `.work-mode-pill`, `.work-bullets li`, `.pill` → muted `rgba(11,14,20,.62)` | cream / tonal | 5.23 / 5.11 | 4.5 | ✅ |
  | 3 | `.workrow-index`, `.workrow-arrow` (both `aria-hidden="true"`) → faded `rgba(11,14,20,.40)` | cream / tonal | 2.62 / 2.59 | exempt (WCAG 1.4.3 note 1, decorative; matches `.contact-num`) | ✅ exempt |
  | 4 | `.section-index`, `.section-title em`, `.stats-eyebrow`, `.stats-row-link`, `.archive-star`, dropdown `.is-selected` → deep blue `#2A54B5` | cream / tonal | 6.20 / 5.71 | 4.5 | ✅ |
  | 5 | `.work-highlight-label` (10px uppercase, always visible on the expanded row) → `--row-tint-deep`: `#B22B47` / `#2A54B5` / ink-muted | cream | 5.64 / 6.20 / 5.23 | 4.5 | ✅ |
  | 6 | WorkRow title hover tint, pink slot → `#B22B47` | cream / tonal | 5.64 / 5.21 | 3.0 (large, ≥28px) | ✅ |
  | 7 | WorkRow title hover tint, blue slot → `#2A54B5` | cream / tonal | 6.20 / 5.71 | 3.0 | ✅ |
  | 8 | WorkRow title hover tint, yellow slot → `#7A6800` | cream / tonal | 4.94 / 4.55 | 3.0 | ✅ (also clears 4.5; the small-text substitution is aesthetic) |
  | 9 | `.btn--ghost` (Archive load-more) text + border → ink; hover → cream on ink | tonal; ink | 15.94; 17.29 | 4.5 | ✅ |
  | 10 | focus rings: `.workrow-*:focus-visible` outline → ink; `.stats-row-link:focus-visible` → deep blue; `.archive-search:focus` border → deep blue | cream / tonal | 15.94+; 5.71+ | 3.0 (non-text) | ✅ |
  | 11 | `::selection` inside the chapter → cream text on deep blue | deep blue | 6.20 | 4.5 | ✅ |
  | 12 | decorative, no text: hairlines `rgba(11,14,20,.12)`; `.skills-dot`; `.skills-item:hover` dashed border; `.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border-left (all three → `--row-tint-deep-large`, so the yellow slot is olive `#7A6800`, visible, not raw `#E6CC4D` at 1.43); `.work-mode-pill` bg `rgba(11,14,20,.06)`; `.work-highlight` bg `rgba(11,14,20,.04)`; `.pill` bg tonal + hairline border; `.pill:hover` bg `rgba(11,14,20,.06)` + deep-blue border | any | decorative | — | ✅ |
  | 13 | nav-on-light over tonal cream: link muted on `rgba(245,242,236,.85)`-over-`#EDE9E0` | ≈ cream | ≥ 5.1 | 4.5 | ✅ |
  | 14 | tonal cream vs cream adjacency (Archive/Skills edges against the cream sections; `.pill` on cream) | — | 1.08 | — | ✅ (a tonal step, same role as `#131722` vs `#0B0E14` on dark) |
## Animation Library Usage Rules
**NEVER mix these libraries for the same animation. Each has a lane:**

- **Framer Motion**: Component enter/exit animations, hover states, shared layout transitions, any animation tied to React state. Use `motion.*` components and `AnimatePresence`.
- **GSAP + ScrollTrigger**: Scroll-pinned sequences, timeline orchestration, text character/word splitting reveals, scroll-progress parallax. Initialize in `useEffect` with proper cleanup. Use `gsap.context()` for scoping.
- **React Three Fiber**: Hero background (particle field or abstract geometry), maximum 2 canvas elements on the page. Lazy-load R3F components. Keep 3D scenes simple — they should feel atmospheric, not gimmicky.

## Skill Invocation Rules (MANDATORY)

### For ANY visual UI work — components, sections, layouts, styling:
ALWAYS invoke `frontend-design:frontend-design` before writing any JSX or CSS.
This is non-negotiable. If you are about to write a component without this skill, STOP and invoke it first.

### For ANY new feature, section, or significant change:
ALWAYS invoke `superpowers:brainstorming` to explore intent and requirements first.

### For multi-step work spanning multiple files:
ALWAYS invoke `superpowers:writing-plans` to create a plan before touching code.

### Before writing implementation code:
ALWAYS invoke `superpowers:test-driven-development` for logic/hooks. UI components may skip unit tests but must have clear acceptance criteria defined first.

### Before declaring anything complete:
ALWAYS invoke `superpowers:verification-before-completion`. Run `npm run build` and `npm run dev` and confirm visually. No success claims without evidence.

### After completing a major feature or section:
ALWAYS invoke `superpowers:requesting-code-review`.

### When working with any library (Framer Motion, GSAP, R3F, TailwindCSS v4):
Add "use context7" to the prompt to get current documentation. These libraries change frequently.

## Spec & Plan Checkbox Discipline (MANDATORY)

Specs (`docs/superpowers/specs/*.md`) and plans (`docs/superpowers/plans/*.md`) contain GFM checkboxes (`- [ ]`) that are the source of truth for progress. They MUST be kept in sync with reality. Stale boxes (work done but `- [ ]` still showing) silently break the `feat` skill, the retro, and any future session that resumes this work.

**Rules:**

- **Plan step boxes** (`- [ ] **Step N: ...**` inside a task): the implementer (subagent or controller) MUST edit the box from `- [ ]` to `- [x]` immediately after that step's command/action lands successfully — BEFORE moving to the next step. Do not batch ticks "at the end".
- **Spec TODO boxes** (`- [ ] <acceptance criterion>` under `## TODO`): the controller MUST edit the box from `- [ ]` to `- [x]` only when that TODO's acceptance test passes AND code review approves. Never tick a spec TODO based on "I think it's done".
- **Verification before claiming a task complete:** before announcing a plan task as done, grep the task's section for any remaining `- [ ]` and tick them or explain why they're not applicable. A "completed" task with un-ticked steps is a bug.
- **Subagent dispatches:** when dispatching an implementer subagent, the dispatch prompt MUST include the explicit instruction: "after each step's command lands successfully, Edit the corresponding `- [ ]` to `- [x]` in the plan file before proceeding to the next step." Do not assume the subagent will infer this from CLAUDE.md.
- **Never invent boxes.** Only edit checkboxes that already exist in the spec/plan. If the work doesn't fit any existing box, the plan or spec needs to be revised first — open an Edit on the doc, then proceed.

## Architecture

```
src/
  components/
    layout/        # Header, Footer, Navigation
    sections/      # Hero, About, Work, Skills, Contact (full-page sections)
    ui/            # Reusable atoms: Button, Tag, AnimatedText, Cursor, etc.
    canvas/        # R3F components (HeroBackground, ParticleField, etc.)
  hooks/           # useSmoothScroll, useScrollProgress, useReducedMotion, etc.
  utils/
    animations.ts  # Shared GSAP configs, Framer Motion variants
    constants.ts   # Design tokens not covered by Tailwind
  data/            # Portfolio content (projects, experience, etc.) — typed
    embeds.csv     # Source of truth for Embeds (already at public/data/embeds.csv)
  types/           # Shared TypeScript interfaces
    content.ts     # Project, Embed, WorkExperience types
```

## Content Types

Two distinct work categories:

**Projects** — fully fledged work with dedicated routes (`/projects/:slug`)
```typescript
interface Project {
  id: string
  slug: string
  title: { en: string; pt: string }
  description: { en: string; pt: string }
  techStack: string[]
  year: number
  liveUrl?: string
  githubUrl?: string
  coverImage: string
  images: string[]
  featured: boolean
}
```

**Embeds** — day-to-day interactives published on GZH (`gauchazh.clicrbs.com.br`), no dedicated page
Source: `public/data/embeds.csv` — semicolon-delimited, columns:
`DATA PUBLICAÇÃO` | `EDITORIA/COLUNISTA` | `FORMATO` (always "PROGRAMAÇÃO", ignore) | `ATIVIDADE` | `LINK MATERIA` | `NOME` | _(imagePreview — missing, to be added)_

```typescript
type EmbedType = 'SIMULADOR' | 'MAPA INTERATIVO' | 'QUIZ' | 'CALCULADORA' | 'INFOGRAFICO' | 'BUSCADOR' | 'GALERIA'

interface Embed {
  publicationDate: string       // "01/12/2023"
  editorial: string             // "Esporte", "Saúde", "Porto Alegre", etc.
  type: EmbedType
  link: string                  // GZH article URL
  title: string                 // Display title (Portuguese only — editorial content)
  imagePreview?: string         // Path to preview image (to be populated)
}
```

Embeds are displayed as a filterable/scrollable gallery, NOT individual pages. Filter by `type` and `editorial`. Image preview is optional — show a styled placeholder with type badge if missing.

## Code Standards
- **TypeScript**: Strict mode. No `any`. Explicit return types on hooks and utilities.
- **Components**: Functional only. Props interfaces defined above the component.
- **Tailwind**: Use semantic class groupings. Extract repeated patterns to components, not `@apply`.
- **GSAP**: Always use `gsap.context()` with a ref for scoping. Always return cleanup from `useEffect`.
- **R3F**: Wrap in `Suspense` with a fallback. Use `useFrame` sparingly — prefer declarative animations via `@react-spring/three` or Framer Motion 3D when possible.
- **Performance**: `will-change` only when animating. Lazy-load canvas sections. Measure with Lighthouse before calling anything "done".

## Context7 Trigger Libraries
Always add "use context7" when working with:
- TailwindCSS v4 (significantly different from v3 — always check docs)
- Framer Motion (API changes frequently between major versions)
- GSAP ScrollTrigger
- @react-three/fiber or @react-three/drei
- React 19 (new APIs like `use`, `useActionState`, etc.)
- react-i18next (translation setup, namespace configuration)

## Existing MVP Notes
- The custom `useSmoothScroll` hook in `App.tsx` (velocity-based translate3d + skew) is worth preserving — extract to `src/hooks/useSmoothScroll.ts`
- **Language: Bilingual EN + PT.** Implement an i18n system (recommend `react-i18next` or a simple context-based solution) from the start, not bolted on later. All content must be authored in both languages.
- `src/utils/animations.ts` contains vanilla JS scroll/fade utils that are superseded by GSAP — can be deleted
- Unused components in `src/components/` are from an older iteration — evaluate each before reusing
