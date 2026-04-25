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
Soft blue pastel editorial. Lowercase, playful, and confident — sky blue on cool cream, with periwinkle accents for balance. Dark ink section (Contact + Footer) for contrast. Defined in `.claude/portfolio-handoff/` (page) and `.claude/design-system-handoff/` (variations).

- **Colors**:
  - Neutrals: cream `#F6F9FC` (bg), sand `#EAF2F8` (tonal section), mist `#D4E5F2` (borders/ghost).
  - Blue scale (soft sky): `#F4F8FE → #DCF0FF → #A2D2FF → #6DB8FF → #3A96E8 → #1C6EC4`. Accent = blue-400 `#3A96E8`.
  - Periwinkle accents: `#C8D8F0 → #8AAADA → #5078B8` (availability dot, ambient).
  - Text: ink `#111822` (text), bark `#2A4060` (text-muted), dust `#6A8CAA` (text-faded), cream `#F6F9FC` on dark.
  - Dark section bg = ink `#111822` (not pure black).
- **Typography**: Plus Jakarta Sans (variable 200–800, local TTF at `/public/fonts/`). Used for both display and body. Massive lowercase hero title `clamp(72px, 13vw, 220px)`. Italic `<em>` spans in titles render in blue-400 for in-line accent ("selected <em>work.</em>").
- **Shapes**: Rounded-[18px] cards and lists, rounded-[14px] inner preview blocks, rounded-full pills/chips/buttons, rounded-[24px] portrait frame. No sharp edges.
- **Gradients**: Reserved for imagery (project bento covers, embed type previews, about portrait). Never on primary backgrounds.
- **Animations**: Smooth cubic-bezier(0.22, 1, 0.36, 1) ease throughout. Character-split reveals on titles, fade-up on descriptions, cycling role text in hero, accordion expand on work rows, scale-on-hover previews and translate-on-hover titles on embed rows, parallax-reactive R3F hero canvas. Respect `prefers-reduced-motion`.
- **Layout**: Max-width 1440 containers, 80px side padding on desktop. Hero = 4-row grid (eyebrow/name/stats/scroll). Projects = 4-col bento. Embeds = numbered table rows. Work = accordion. Skills = 3-col numbered columns.
- **Section dividers**: MarqueeDivider components (kept from MVP) with ghost text, restyled to mist/dust/blue palette.
- **Tonal sections**: Skills + Embeds use `bg-bg-sand`. Contact + Footer use `bg-bg-dark` (ink) with `text-light`.
- **Featured work cards (bento v04)**: `Projects.tsx` — 4-col grid with sizes `lg` (2×2), `md` (2×1), `sm` (1×1). Gradient backgrounds per card, `dark: true` variant for ink/bark gradient. Top tagline + bottom title + "↗ case study" link.
- **Editorial embeds (numbered rows v02)**: `EmbedsGallery.tsx` — bordered rounded container, grid rows with num · 56×40 gradient preview · uppercase title · type · editorial · arrow. Hover = sand bg + preview scale 1.08 + title translate-x + arrow opacity 1.
- **Hero**: Ghost duo name (`kevin` ink + `shibuya.` with blue-300 stroke outline on mist fill), cycling role text, CTAs, stats row.
- **About**: 380px portrait (blue gradient + "ks" mark) + bio with blue-400 italic highlights + pills.
- **Nav (split variation)**: Logo mark + brand text left, links center with blue underline on hover, availability pill (periwinkle pulsing dot) + EN/PT toggle right.
- **Footer**: Viewport-wide outlined `kevin shibuya` text (transparent fill, 1px cream stroke) over ink bg + bottom meta row.
- **UI Components**: Tag (chip style), SectionHeading (em-accent), MarqueeDivider, StatCounter, SocialLinks, Cursor.
- **Section flow**: Hero → About → WorkExperience (accordion) → Skills → Projects (bento v04) → EmbedsGallery (numbered rows v02) → Contact → Footer.
- **NO**: Purple gradients, generic drop shadows, rainbow accents, amber `#D4A020` (retired), terracotta `#E07A56` / sage `#A8C899` (retired), Outfit/Inter (retired), spinning loaders.

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
