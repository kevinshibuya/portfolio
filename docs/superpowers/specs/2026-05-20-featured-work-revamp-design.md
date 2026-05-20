# Featured Work — Good-Fella-Inspired Revamp (Design Spec)

Replace the current bento-grid `Projects` section with a two-column editorial layout: sticky-left column whose content swaps to reflect the project currently in viewport center, scrolling-right column of large square project cards. Each card image parallaxes within its frame as it crosses the viewport; hovering an image scales the inner `<img>` (frame size stays put) and a small "view project" pill follows the cursor, centered above it, rotating against the direction of mouse motion.

Design validated end-to-end in a working sandbox at `/sandbox/featured-work` on this branch. This spec ports the validated pattern into the real `Projects` section.

## TODO

- [x] `body { overflow-x: clip }` (not `hidden`) — change already landed on this branch; verify it survives any further index.css edits
- [x] `src/components/sections/Projects.tsx` rewritten: sticky aside (desktop) + scrolling list of square project rows; bento removed from this file
- [x] Project rows show the top 4 highlights (filter `p.highlight && (p.highlightOrder ?? 99) <= 4`) — same set as today's bento
- [x] Sticky aside (desktop) reflects the **active project**: counter (`NN / 04`), title, italic-blue tagline, description, up to 6 tech pills, year, `↗ case study` Link to `/projects/:slug`
- [x] Active project is detected via `IntersectionObserver` with `rootMargin: '-45% 0px -45% 0px'` (whichever card sits in the middle 10% of viewport)
- [x] Active-content transitions: each text block keys off `project.id` so framer-motion crossfades (≤500ms, `[0.22, 1, 0.36, 1]` ease, opacity + 8–10px y); no layout shift between projects (aside has reserved `min-height`)
- [ ] Mobile aside (`≤900px`): static block instead — eyebrow `// selected work`, `selected <em>work.</em>` heading, single intro paragraph (i18n), `04 · projects` count. Dynamic block is `display: none`
- [x] New i18n keys: `sections.projects.intro` (static mobile paragraph) added to `en.json` and `pt.json`. Existing `sections.projects.title` / `caseStudy` keys reused
- [x] Project row: square image frame (`aspect-ratio: 1/1`, fixed size, `overflow: hidden`); below-card meta row (uppercase title left, bracketed tech tags right) outside the frame, separated by a top `1px mist` border
- [x] Parallax on each row's image: `framer-motion useScroll` with `offset: ['start end', 'end start']`, image height `124%` + `top: -12%`, translates `y` from `-12%` to `+12%` across the row's scroll range (GPU `transform` only, no layout)
- [x] Image hover scale: `1.06` via framer-motion `animate.scale`, composed with the scroll-driven `y` motion value on the same `<motion.img>`. 0.7s `[0.22, 1, 0.36, 1]` ease. Frame box and `01` badge do not move. Meta-row title does not move
- [ ] Custom cursor follower (`<CursorFollower>` colocated in `Projects.tsx`): fixed outer at `(cursorX, cursorY)` via motion `x` / `y` smoothed through `useSpring`; zero-sized rotor child with `transform-origin: 0% 0%` and `style={{ rotate }}`; rotation is `useTransform(useVelocity(springX), [-2500, 2500], [18, -18], { clamp: true })` — leans back against horizontal mouse motion
- [x] Cursor pill: small monospace "view project", `bg: blue-400`, `color: cream`, `padding: 8px 14px`, `border-radius: 6px`, centered horizontally on the cursor and floating **14px above** it via `transform: translate(-50%, calc(-100% - 14px))`
- [ ] Pill visibility: `hovering` state on the outer `<main>`; toggled by `onPointerEnter` / `onPointerLeave` on each `.project-row__media`. Animates via `animate={{ opacity, scale }}` with 0.3s ease
- [ ] `aria-hidden="true"` on the cursor follower; system cursor stays visible (no `cursor: none`)
- [ ] Reduced motion: `@media (prefers-reduced-motion: reduce)` hides the cursor follower, disables parallax (`transform: none !important` on `.project-row__img`), and skips the hover image scale
- [ ] Touch (`@media (hover: none)`): cursor follower hidden; rows remain tap-to-navigate Links to `/projects/:slug`
- [ ] All sandbox files removed before merge: `src/pages/SandboxFeaturedWork.tsx`, `src/styles/sandbox-featured-work.css`, and the `/sandbox/featured-work` route + lazy import in `src/App.tsx`
- [ ] Bento CSS in `src/index.css` (`.bento`, `.bento-card*`, `.bento-mockup*`, `.bento-desc-top`, `.bento-bottom`, `.bento-title`, `.bento-cs`, `.bento-text-col`) stays in place for this PR — cleanup is a separate follow-up
- [ ] `useCursorTilt` import in `Projects.tsx` removed (no longer used by the new layout); the hook file itself stays in repo (other future callers may want it)
- [ ] `npm run build` passes — TypeScript strict, no new warnings
- [ ] `npm run test` passes — existing tests remain green
- [ ] Visual sweep at 1440px (desktop): active aside swaps as each of the 4 cards passes through viewport center; parallax visibly shifts during scroll; cursor pill rotates against horizontal mouse motion; image scales on hover, frame does not
- [ ] Visual sweep at 390px (mobile): static aside renders, dynamic block hidden, no cursor follower, parallax disabled or visually unobtrusive, rows tappable

## Context

`src/components/sections/Projects.tsx` today is a 4-column bento grid with mixed-size cards (`lg`/`md`/`sm`), gradient backgrounds, and stacked desktop+mobile mockups inside each card. It works but feels generic — the design uses card surface area for mockups, leaving no room to actually *read* about the work, and the small-card titles get squeezed.

The new layout, inspired by [good-fella.com](https://good-fella.com)'s Featured Work section, gives each project a full-width square frame with the project information pinned editorially on the left. Walking through the page becomes a narrative pass through 4 projects rather than a glance at 4 thumbnails. The sticky-left + per-active sync lets the layout breathe while still showing rich metadata for whichever project the reader is looking at.

The good-fella site itself only does the layout (sticky + scroll-stack); the **per-active sticky content** is a deliberate addition on top of their pattern, validated by the user in the sandbox.

## Design

### Layout

- Grid: `1fr 1.25fr`, 80px gap, 80px side padding, `max-width: 1600px` centered.
- Left column (`.project-aside`): `position: sticky; top: 120px`. Contains the dynamic per-project block on desktop, the static intro block on mobile (one is `display: none` based on the breakpoint).
- Right column (`.project-list`): flex column, `gap: 120px` between rows.
- Each row (`.project-row`): a `<Link to="/projects/:slug">` wrapping a square media frame and a below-frame meta row.

### Sticky aside (desktop — dynamic)

Renders the **active** project's content with framer-motion crossfades on `project.id` key changes:

```
// selected work                    (.eyebrow — never changes)
NN / 04                             (.index — large mono numeral)
<project title>                     (.title — clamp(36px, 4.6vw, 60px))
<italic blue tagline>               (.tagline)
<description>                       (.copy)
[tech] [pills] …                    (.tech — up to 6, rounded pills)
─────────────────────────────────
year · NNNN          ↗ case study   (.bottom — border-top)
```

Reserved `min-height: 540px` so swapping between projects with different copy lengths doesn't shift the grid. The `↗ case study` link uses `Link to={`/projects/${current.slug}`}`.

### Sticky aside (mobile — static)

The aside isn't actually sticky at `≤900px` (it un-sticks and renders above the list), so per-active content would just be stranded above the fold. Replaced by:

```
// selected work
selected <em>work.</em>
<one paragraph intro>
04 · projects
```

The `selected <em>work.</em>` mirrors the existing site convention (em accent in blue). New i18n keys:

- `sections.projects.intro` — the static paragraph. EN: "a handful of recent projects i'm proudest of — newsroom tools, scroll-driven specials, and interactive embeds that reached millions of brazilian readers." PT: equivalent.

### Project row

```
┌──────────────────────────────┐
│                              │
│   square image frame         │
│   (aspect-ratio: 1/1)        │
│   inner <img> parallaxes Y   │
│   01 badge top-left          │
│                              │
└──────────────────────────────┘
─────────────────────────────── (1px mist top border)
PROJECT TITLE   [ TAG ] — [ TAG ] — [ TAG ]
```

- Frame: `border-radius: 18px`, `overflow: hidden`, `border: 1px solid mist`, gradient background from `project.gradient`.
- Inner `<motion.img>`: `position: absolute; inset: 0; width: 100%; height: 124%; top: -12%`. `style={{ y: imgY }}` where `imgY` is `useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])` with `useScroll({ target: mediaRef, offset: ['start end', 'end start'] })`.
- Image hover: `animate={{ scale: hover ? 1.06 : 1 }}` with 0.7s `[0.22, 1, 0.36, 1]` ease. Frame box and badge do NOT scale.
- `01` badge: monospace, blurred cream background, top-left of the frame.
- Meta row: `display: flex; justify-content: space-between; align-items: baseline; padding: 20px 4px 0; border-top: 1px solid mist; margin-top: 20px`. Title is uppercase, clamped, 600 weight. Tags are mono `[ TAG ] — [ TAG ] — [ TAG ]`, first 3 from `project.techStack`. Neither moves on hover.

### Cursor follower

Three-layer DOM:

```tsx
<motion.div className="cursor"        style={{ x, y }}>   {/* fixed anchor */}
  <motion.div className="cursor-rotor" style={{ rotate }} animate={{ opacity, scale }}>
    <span className="cursor-pill">view project</span>
  </motion.div>
</motion.div>
```

- Outer: `position: fixed; top: 0; left: 0; z-index: 60; pointer-events: none`. `style={{ x: springX, y: springY }}` where springs smooth the raw `useMotionValue` cursor coordinates (`damping: 28, stiffness: 380, mass: 0.4`).
- Rotor: `position: relative; width: 0; height: 0; transform-origin: 0% 0%`. The zero-size + origin-at-origin combo means rotation pivots **around the cursor anchor**, so the pill swings overhead instead of around its own center. `animate={{ opacity: hovering ? 1 : 0, scale: hovering ? 1 : 0 }}` with 0.3s `[0.22, 1, 0.36, 1]` ease.
- Pill: `position: absolute; left: 0; top: 0; transform: translate(-50%, calc(-100% - 14px))`. Centers the pill horizontally on cursor X, floats it 14px above cursor Y. Styling: `bg: blue-400`, `color: cream`, monospace 11px uppercase, `padding: 8px 14px`, `border-radius: 6px`, subtle blue-500 drop shadow.
- Rotation: `useTransform(useVelocity(springX), [-2500, 2500], [18, -18], { clamp: true })` — when you whip the mouse right (vx +2500), `rotate = -18°` (top of pill leans left, trailing the motion); whip left, `rotate = +18°`. Spring damping naturally returns to 0° when the mouse settles.

### Active-project detection

Per-row `IntersectionObserver` registered in a `useEffect` on the parent:

```ts
const obs = new IntersectionObserver(
  ([entry]) => { if (entry.isIntersecting) setActive(idx) },
  { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
)
```

`rootMargin: '-45% 0px -45% 0px'` shrinks the observer's "viewport" to the middle 10%, so only the card crossing the center triggers `setActive`. Initial `active = 0` covers the case before the first observation.

### Accessibility

- `aria-hidden="true"` on the cursor follower root — it's purely decorative.
- Each row is a `<Link>` so keyboard tab order, screen reader semantics, and right-click "open in new tab" all just work.
- Image `alt=""` (frame imagery is decorative — the meaningful label is the visible title below).
- `prefers-reduced-motion: reduce` disables parallax, cursor follower, and image hover scale.
- `(hover: none)` hides the cursor follower; rows are still tap-navigable.
- All copy localised through `useTranslation()` — no hardcoded `'en'`. The sandbox uses `lang = 'en'` for brevity; the real impl reads `i18n.language as 'en' | 'pt'`.

### Visual tokens used

| Token | Where |
|---|---|
| `--cream` `#F6F9FC` | page bg, pill text |
| `--mist` `#D4E5F2` | borders (frame, meta-top, aside-bottom) |
| `--ink` `#111822` | title text |
| `--bark` `#2A4060` | body text, tags |
| `--dust` `#4A6A88` | counter total, year |
| `--blue-400` `#3A96E8` | eyebrow, tagline, pill bg, italic emphasis |
| `--blue-500` `#1C6EC4` | cta hover border, pill shadow |
| project `gradient` | each frame's background |

## Files touched

- `src/components/sections/Projects.tsx` — rewritten
- `src/index.css` — append `.project-aside*`, `.project-row*`, `.project-cursor*` rules; **keep** existing `.bento*` rules
- `src/i18n/locales/en.json`, `src/i18n/locales/pt.json` — add `sections.projects.intro`
- `src/App.tsx` — remove `SandboxFeaturedWork` lazy import + sandbox route
- `src/pages/SandboxFeaturedWork.tsx` — **deleted**
- `src/styles/sandbox-featured-work.css` — **deleted** (and the `src/styles/` directory if it becomes empty)

## Risks / known edge cases

- **`body { overflow-x: clip }`** — required for sticky to engage. Already shipped on this branch (`src/index.css` line ~91). Implementer must preserve it.
- **`useScroll` + `animate.scale` on the same `<motion.img>`** — framer-motion composes `style.y` motion-value with `animate.scale` correctly (different transform components). Validated in sandbox; do not split them onto wrapper + child.
- **IntersectionObserver and Lenis smooth scroll** — IO fires on layout positions, not scroll velocity, so Lenis's interpolated scrolling does not break it. Verified in sandbox.
- **First-render flash** — `active` defaults to `0`. On mount, before IO fires, the aside already shows project 1 (which is also the topmost card). No flash.
- **Reduced-motion + scroll-driven parallax** — `useTransform` still runs but its output is overridden by CSS `transform: none !important`. Acceptable; alternative would be conditionally not subscribing, which is more complex for no observable user benefit.
- **i18n.language can be `'en-US'` etc.** — the cast `as 'en' | 'pt'` is loose. The codebase already does this in other components; keep the same pattern. (Real defensive coding is a follow-up across the whole app.)
- **Lazy `ProjectDetail` route still imports projects[]** — unchanged. The `caseStudy` Link still resolves.

## Out of scope

- Removing `Project.size`, `Project.dark` fields from `src/types/content.ts` (they go unused but ripping them out touches every project entry; cleanup PR)
- Deleting bento CSS from `src/index.css`
- Touching `ProjectDetail` page or any project's individual page
- Adding hover state to the meta row (title nudge, etc.) — explicitly *not* in the design per user feedback
- Refactoring `useCursorTilt` callers other than `Projects.tsx`
