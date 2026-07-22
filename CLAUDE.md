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
Dark ink + WebGL shader craft. Lowercase, monumental, confident — cream text on near-black ink, with a tricolor accent (pink-red, blue, yellow) carried entirely by two raw-shader canvases and rotated per-row tints. No light theme, no bento cards, no ink-draw entrance — every prior MVP-era visual system below was retired by the `webgl-pivot` plan (2026-07-19).

- **Colors** (canonical tokens in `src/index.css` `@theme`/`:root`; contrast-audited, do not change a hex without recomputing the AA table):
  - Base: `--color-bg` / `--bg` `#0B0E14` (page ink), `--color-bg-tonal` / `--bg-tonal` `#131722` (tonal section).
  - Text: `--color-text` / `--text` `#F5F2EC` (cream, body+display), `--color-text-muted` / `--text-muted` `#C9C4BA` (secondary), `--color-text-faded` / `--text-faded` `#A8A49C` (meta/faded). Hairline borders `rgba(245,242,236,0.13)`.
  - Tricolor accent (the ONLY color, shared by the shaders and `accentFor()` row tints): `--color-accent-pink` `#E64D66`, `--color-accent-blue` `#4D80E6`, `--color-accent-yellow` `#E6CC4D`. A lighter hover value `#7AA0ED` covers hover states, remapped onto the legacy `--blue-200`/`--blue-300`/`--blue-500` aliases below — no dedicated token of its own.
  - **Legacy CSS var aliases** (`--cream`, `--sand`, `--mist`, `--ink`, `--bark`, `--dust`, `--blue-*`, `--periwinkle-*`) remain in `:root`, remapped onto the dark system so the whole light-era stylesheet flips without a rewrite — role names kept their vars, so e.g. `--cream` is now dark (page bg) and `--ink` is now light (text). New work reads from the canonical `--color-*`/`--text`/`--bg` names above; the aliases are accepted debt (Plan risk 5), not a pattern to extend.
- **Typography**: Plus Jakarta Sans (variable 200–800, local TTF at `/public/fonts/`), unchanged — used for both display and body, lowercase throughout. `--font-mono` was dropped (dead token).
- **Shapes**: Open typographic rows, no cards/containers. Rounded-full pills/chips/buttons survive where used (filters, tags); no rounded card frames.
- **Accent usage**: Tricolor is applied via `accentFor(index)` (`src/utils/palette.ts`, `ACCENTS = ['#E64D66','#4D80E6','#E6CC4D']`, index-rotated) as a per-row `--row-tint` CSS var — never a static per-component color choice.
- **Canvases (max 2 on the page)**:
  - `FluidWaves` (`src/components/canvas/FluidWaves.tsx`) — ONE shared raw-WebGL component, `variant: 'hero' | 'backdrop'`. Hero = full-strength background (seeded scattered wave motion, tricolor paint, smooth — no pixel quantization). Backdrop = the SAME shader dimmed via CSS (`opacity: 0.22; filter: saturate(0.7)`) behind Contact/Footer, lazy-mounted as the stage nears viewport. Each instance seeds independently.
  - Both: `devicePixelRatio` capped at 1.5, `IntersectionObserver` sets `data-paused="true"` off-screen for every canvas (reduced motion included) and halts the rAF loop, `prefers-reduced-motion` also renders one static frame (`data-static="true"`) and never starts the loop, context-loss fallback (hero → gradient div `data-testid="fluid-waves-fallback"`; backdrop → stage ink stands). The rAF loop runs FROM MOUNT (no entrance gate) so paint animates during the loader exit. Hero canvas `data-canvas="fluid-waves"`; backdrop `data-canvas="fluid-waves-backdrop"`.
- **Hero scrim (MANDATORY contrast rule)**: `.hero-scrim` sits between canvas and text — bottom band ≥ 0.88 alpha ink behind name+role, top band ≥ 0.75 alpha behind nav/meta. Text must never sit directly on raw shader paint (normal-weight cream on raw pink-red paint fails AA at 3.35:1); the scrim is what makes every hero text pairing pass AA even over the worst-case yellow paint region.
- **Hero anatomy**: Full-viewport (`min-height:100svh`), canvas absolute behind → scrim → text. Monumental bottom-left signature name `h1.hero-name` (`kevin` / `shibuya.`, `clamp(64px,12vw,200px)`, weight 650–750, line-height ~0.92, letter-spacing −0.03em, cream), each line a `.hero-line` span inside its own `.hero-line-mask` clip row (overflow released to visible once `.hero-bottom.is-entered`, so the role focus ring and glyph descenders aren't clipped at rest). Cycling role line directly above the name (`.hero-role`, in a `.hero-line-mask.hero-role-line`, click/keyboard cycle, `roles[0]` = canonical title `senior front-end engineer · react/typescript`). No hero meta block (the top-right location/availability was removed).
- **Loader + entrance (the ks. vignette explodes, then the text rises)**: the loader is an inline SVG in `index.html` (pre-bundle first paint) — an ink `#0B0E14` rect masked by static `ks.` glyph-outline windows (paths extracted from Plus Jakarta Sans 700; no font dependency) that reveal the shader; the windows sit in a `<g class="loader-ks">` wrapper that GSAP scales for the exit. Behind it, a dim tricolor CSS-gradient stand-in (subtly drifting) reads as paint pre-React; on mount the stand-in fades to reveal the live (already-looping) hero canvas through the windows. Two bottom-corner cream-on-ink HTML meta labels only — `portfolio · 2026` (BL), `react · typescript · webgl` (BR); the two top corners were removed (hardcoded EN). `main.tsx` orchestrates the exit: after React paints + a ~1.2 s savor dwell (reduced-motion 200 ms, 3 s hard fallback), it contracts the whole `ks.` cutout to 0.96× (0.18 s, house — anticipation) then explodes it to 45× (1.1 s, `power4.in` quintic — accelerating; an inOut's decel tail would play off-screen) about the exact viewBox center (50, 50) — inside the s glyph's upper-bowl stroke, so the expansion reads centered and the viewport ends inside a letterform window — ink gone, hero revealed; corner labels drift 12 px outward+down while fading (0.22 s) at launch, and the handoff (`resolveCurtain()` + `resolveEntrance()`) fires at ~89% of the explosion (wall-clock setTimeout), when the ink has cleared the name region; `finishLoader()` removes the loader at 100%. Reduced motion: 150 ms opacity fade, static shader frame, no explosion. **The hero text then rises in**: once `entranceDone` resolves (at the ~89% handoff), `Hero.tsx` flips `entered` and the role + two name lines rise from `y:110%` out of their `.hero-line-mask` clips (Framer, staggered, house ease); reduced-motion and SPA back-nav (`entranceBypassed`) skip straight to the settled state (no rise). `MotionContext` keeps `curtainGone`/`entranceDone`/resolvers; `main.tsx` is the sole gate resolver on the normal path.
- **WorkRow (the one section-list primitive — `src/components/ui/WorkRow.tsx`)**: open typographic row, no card. Anatomy: `.workrow-index` (zero-padded, faded, tabular-nums) · `.workrow-title` (oversized lowercase, `clamp(28px,4.6vw,64px)`, weight 550, cream, tints to `--row-tint` on hover/focus) · `.workrow-meta` (`·`-joined faded spans) · `.workrow-arrow` (`↗` link / `+` rotating 45° expanded). Bottom hairline per row; list owner adds the top hairline. Desktop hover: a pointer-tracking `.workrow-float` preview (Framer Motion `useMotionValue`/`useSpring`, never `setState` above the list). Touch/no-hover: inline `.workrow-thumb`. Expandable variant swaps the row for a real `<button aria-expanded>` with an `AnimatePresence` panel. Visible cream `:focus-visible` ring on every variant. Reused verbatim by Projects, Archive, WorkExperience (expandable) — no per-section bespoke row markup.
- **Animations**: GSAP = one-shot entrance orchestration ONLY (see above); Framer Motion = hover/expand/enter-view states (WorkRow float, expand panels, section stagger-in). Never both on the same animation. Respect `prefers-reduced-motion` everywhere (static hero frame, no float, instant panels).
- **Layout**: Max-width 1440 containers, 80px side padding on desktop. Hero = full-bleed canvas stage. Projects, Archive, WorkExperience, Skills all converge on the WorkRow row language (no bento grid, no numbered table). Contact + Footer share one `.contact-footer-stage` (canvas z-0, content z-1).
- **Tonal sections**: `--bg-tonal` (`#131722`) marks alternate sections; base sections sit on `--bg` (`#0B0E14`).
- **Nav**: dark-restyled on canonical tokens — brand mark left, links center, EN/PT toggle right; unchanged markup/structure from the split variation, values now read from `--text`/`--text-faded`/accent literals instead of the light palette. No availability pill (dropped pre-plan); meta lives in the hero instead.
- **Contact/Footer stage**: `FluidWaves` (`variant="backdrop"`) canvas behind dark-restyled `Contact` + rewritten `Footer` (footer marquee/ink-draw name deleted — see NO list). `footer.location` key added.
- **Section flow**: Hero → Projects → Archive → WorkExperience (expandable) → Stats → Skills → Contact → Footer. Work-first order (baseline behavior; no reorder needed by this plan).
- **NO**: Light cream/sand theme, bento cards, numbered-table embed rows, MarqueeDivider ghost-text dividers, ink-draw hero entrance (`HeroNameDrawing`, `glyphPaths`, extracted glyph paths), scramble text (`ScrambleText`/`useScramble`, deleted as dead code), the R3F hero accent (`HeroAccent3D`/`HeroAccentSilhouette`, `@react-three/fiber`/`@react-three/drei` removed), a third canvas anywhere on the page, spinning loaders, spaced em-dashes (` — `) in reader-facing prose — use `·`, the horizontal curtain-split loader (two tear-half panels + LCP tear-halves), the old GSAP paint-bloom cascade (the entrance is now a Framer clipped rise gated on `entranceDone`, see above — that's current, not forbidden), a hero meta block, `LiningWavesBackdrop` (three.js — deleted; the three dependency removed), the shader pixel-quantization pass (`pixel_filter`/`PIXEL_FILTER`), the six-stain ink-bleed loader exit (stain circles + the feTurbulence roughen filter — replaced by the ks. vignette explosion).
- **Standing rule**: any palette/token change ships with a recomputed AA contrast audit across every affected text/background pair (the plan's contrast table is the authority for the current hexes) — verified, not hoped.
- **Contact/Footer contrast over the dimmed `FluidWaves` backdrop stage** (webgl-pivot Task 7, ratified): the Contact/Footer stage's `FluidWaves` backdrop canvas composites at `.fluid-waves-canvas--backdrop { opacity: 0.22; filter: saturate(0.7); }` over `--bg` `#0B0E14` — note `0.22`, not the spec's ~0.32; this lower value is what makes the table below pass. Worst case = brightest tricolor `#E6CC4D` under `saturate(0.7)` composited at `0.22` over `#0B0E14` ≈ `rgb(57,56,41)`. Recomputed contrast (post-remedy):

  | Contact/Footer text | color | size | ratio | AA needed | verdict |
  |---|---|---|---|---|---|
  | `.contact-title` | `--text` cream | huge | 8.9:1 | 3.0 (large) | ✅ |
  | `.contact-title em` | `--blue-300` #7AA0ED | huge | 4.58:1 | 3.0 (large) | ✅ |
  | `.contact-lede` | rgba(246,249,252,.6) | 18px | 5.19:1 | 4.5 | ✅ |
  | `.section-index` (contact) | `--blue-200` #7AA0ED | small | 4.58:1 | 4.5 | ✅ |
  | `.contact-label` | `--text` cream | 20–32px | 8.9:1 | 4.5 | ✅ |
  | `.contact-icon` | `--blue-200` | 16px | 4.58:1 | 4.5 | ✅ |
  | `.footer-name` | `--text` cream | huge | 8.9:1 | 3.0 | ✅ |
  | `.footer-*` meta / `.footer-lang` | `--text-faded` #A8A49C | 11px | 4.79:1 | 4.5 | ✅ |
  | `.contact-num` | rgba(246,249,252,.4) | 10px | 3.19:1 | — | ✅ decorative exemption (`aria-hidden="true"`, WCAG 1.4.3 note 1 — matches `.workrow-index`, `WorkRow.tsx`) |
  | `.contact-meta` | rgba(245,242,236,.62) | 13px, hover-revealed | 5.17:1 | 4.5 | ✅ (remedy: alpha `.5`→`.62`) |

  All always-visible pairs are ≥4.5:1 (or ≥3.0:1 for large text). `.contact-num` is purely ordinal enumeration (`'01'..'04'`) with no semantic role — its accessible name comes from `.contact-label`/`href` — so it is marked `aria-hidden="true"` and exempt from 1.4.3, the same pattern already used by `.workrow-index`; no recolor needed. `.contact-meta` (the real hover-revealed email/@handle/cv-filename text) got its color alpha raised `0.5`→`0.62` (4.95:1→5.17:1) — its `opacity: 0→1` hover-reveal transition is a separate mechanism, untouched by this change.

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
