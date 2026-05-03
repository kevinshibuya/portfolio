# Portfolio polish pass — design

**Date:** 2026-05-03
**Branch:** `feat/page-animations` (continues from prior page-animations work)
**Status:** spec, awaiting plan

A batch of polish fixes plus one larger redesign (the Embeds section becomes a unified "the archive" index of everything shipped). Items are independent and can ship sequentially or in any order, but they're bundled here because they're all surface-level user-facing fixes the user flagged in one review pass.

---

## 1. Nav padding transition + responsive padding

### Problem
- The padding change on scroll (`18px 40px` → `12px 40px`) snaps because the inline `style={{ transition: 'opacity 200ms ease-out' }}` on the `<header>` element overrides the `.nav` class's `transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1)` for padding. CSS specificity: inline always wins.
- On screens ≤720px, scrolling restores `padding: 12px 40px` (from `.nav.is-scrolled`) on top of the small-screen base `padding: 12px 20px` — the side padding visibly jumps from 20px to 40px when the user scrolls.

### Solution
- Move the opacity transition off the inline style. Either combine into the class (`.nav { transition: padding 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out }`) and drive opacity via a class toggle, or set both transitions inline as a multi-property string.
- Inside the existing `@media (max-width: 720px)` block, override `.nav.is-scrolled { padding: 12px 20px; }` so the horizontal padding doesn't change on scroll at small widths.

### Acceptance
- Scrolling past 40px causes vertical padding to ease from 18 → 12px over ~400ms with no perceptible jump.
- At ≤720px, scrolling does not change horizontal padding.
- Nav opacity entrance still fades in once `entranceDone` resolves.

---

## 2. "available for projects" pill no longer wraps

### Problem
On screens narrow enough that the nav-right area squeezes, the availability pill text breaks into two lines ("available for / projects").

### Solution
Add `white-space: nowrap` to `.nav-avail`. The pill is already hidden under `(max-width: 720px)`, so the wrap is happening in the 721–1100px range. `nowrap` will keep it as a single line; if it pushes the lang button off-screen at any width, hide the pill at that breakpoint instead.

### Acceptance
- The availability pill is always a single line at every viewport width where it's visible.
- The pill never overflows or pushes the EN/PT toggle out of the nav.

---

## 3. Hero R3F accent — keep visible until ≤720px

### Problem
`.hero-accent-mount { display: none }` fires at `(max-width: 1100px)`, making the 3D accent disappear far too early.

### Solution
Move the `display: none` rule into the existing `(max-width: 720px)` media query (or change the breakpoint of the existing rule from 1100px to 720px). Confirm the canvas still fits and looks right between 721–1099px (it might need a smaller min-size or different positioning at narrower widths — adjust if the canvas crowds the hero text).

### Acceptance
- HeroAccent3D is mounted and visible at all viewports >720px.
- At ≤720px, it remains hidden.
- Layout doesn't break in the 721–1099px range.

---

## 4. Bento — strict square cells

### Problem
Small and md cards in `Projects.tsx` are visibly stretched landscape rectangles because they only have `min-height: 140px` while spanning a 320-ish-px column. The lg card looks roughly square already (it has `min-height: 300px` and spans 2×2).

### Solution
Replace the `min-height` driven sizing with grid-row sizing that yields square cells:

- `.bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 1fr; aspect-ratio: 2 / 1; gap: 12px; }` — 4 cols × 2 rows of equal-fr cells, total bento aspect 4:2 = 2:1.
- Remove the `min-height: 140px` from `.bento-card` and `min-height: 300px` from `.bento-card--lg`.
- Each `sm` card becomes ~1:1; `md` (2-col span) becomes ~2:1; `lg` (2×2 span) becomes ~1:1 at 2× scale. Subtract gap effects: cells will be very-close-to-square but a few px off due to gap math — acceptable.
- Responsive: at the existing `(max-width: 1100px)` breakpoint where the bento collapses to 2 cols, set a different `aspect-ratio` for the bento (e.g., `1 / 1` if 2 cols × 2 rows) or drop `aspect-ratio` and rely on `grid-auto-rows: 1fr` plus a min-height to avoid truncation. Verify at the existing `(max-width: 720px)` breakpoint where the bento goes single-column.

### Acceptance
- Desktop ≥1101px: every bento cell visually reads as a square (sm = 1:1, md = 2:1 banner, lg = 1:1 at 2× scale). No card is more than ~5% off the target ratio.
- 721–1100px: 2-col grid; auto-places into 3 rows (lg / sm sm / md). Drive shapes per-card: `.bento-card { aspect-ratio: 1 / 1 }` for sm cells, `.bento-card--lg, .bento-card--md { aspect-ratio: 2 / 1 }` for the wide spans. Container drops the `aspect-ratio` constraint (`auto`) so rows size to their cards.
- ≤720px: single-column; `.bento-card { aspect-ratio: 4 / 3 }` so each stacked card is a consistent landscape rectangle (~280–320px tall on a typical phone width). `.bento-card--lg, .bento-card--md` inherit the same 4/3 ratio (no longer 2× anything since spans collapse).

---

## 5. Project page navigation — scroll restoration + entry scroll

### Problem
- Clicking a bento card opens `/projects/:slug` but the page starts already scrolled to wherever Home was — not at the top.
- Clicking "back to projects" returns to `/`, but scrolls to the top of Home and re-mounts everything, so all the entrance animations replay (Hero ink-trace included). The user has to wait through the entrance and re-scroll back to where they were.

### Solution

**Going to project (ProjectDetail mount):**
- In `ProjectDetail`, `useLayoutEffect` to call `lenis.scrollTo(0, { immediate: true })` and `window.scrollTo(0, 0)` as a fallback. Lenis should be reachable via the existing `useLenis` hook.

**Leaving Home (saving scroll):**
- In `Home.tsx`, on unmount (cleanup of a `useEffect`), read the current Lenis scroll position and write to `sessionStorage.setItem('portfolio:home:scrollY', String(y))`.

**Returning to Home (restoring scroll + skipping entrance):**
- In `Home.tsx`, `useLayoutEffect` to read `sessionStorage.getItem('portfolio:home:scrollY')`. If present and >0, call `lenis.scrollTo(savedY, { immediate: true })` synchronously before first paint.
- Pass a flag (or expose a method on `MotionContext`) so that on this mount the `entranceDone` promise is pre-resolved. `HeroNameDrawing` reads this flag and renders the SVG already in its filled-final state, skipping the trace + ink-fill. `useScrollLockDuringEntrance` reads it and skips the lock entirely.

**Storage lifecycle:**
- Use `sessionStorage` so a hard reload clears the saved position (full reload = fresh page = full hero entrance is correct).
- Clear the key once consumed (so a subsequent navigate-to-project-and-back saves a fresh value rather than reusing a stale one).

### Acceptance
- Click any bento card → `/projects/:slug` opens scrolled to top.
- From a project page, click "back to projects" → land on home at the same scroll-Y where the bento card was clicked from. Hero is already in its final ink-filled state. No scroll-lock. No replay of the trace. Sections above/below the restored Y stay in their respective animation states (those above already animated last visit; those below not yet).
- Hard reload at `/` → full hero entrance plays normally.
- Navigate `/` → `/projects/x` → `/projects/y` (link from one project to another, hypothetical) → back: still lands at the original home scroll-Y. Scroll save happens once when leaving home; subsequent project-to-project nav doesn't overwrite it.

---

## 6. The archive — replaces EmbedsGallery

### Problem
The current `EmbedsGallery` section is scoped to the 142 GZH editorial embeds, named "editorial embeds," uses a chip wall for filtering (which already takes 3+ rows on desktop and will balloon as more editorials/types appear), has no search, no sort, and no date column. The user also wants to bring the 4 featured projects (and future personal/OSS work) into this same archive.

### Caption
- New section caption: `the <em>archive.</em>` (matches the bento's `selected <em>work.</em>` lockup; "selected work" is highlights, "the archive" is the comprehensive index).
- Section description: short editorial line e.g. "everything I've shipped — interactives, projects, experiments." (final copy can be polished during implementation; spec just establishes the slot.)
- Section id: rename `#embeds` → `#archive`. Update `Header.tsx` `NAV_ITEMS` and `SECTION_ID` accordingly. Translation keys: rename `sections.embeds.*` → `sections.archive.*` in both EN and PT.

### Data model

Introduce a unified `ArchiveItem` type that subsumes both projects and embeds:

```ts
type ArchiveKind = 'featured' | 'editorial' | 'personal' | 'oss' | 'freelance'

type Bilingual = string | { en: string; pt: string }

interface ArchiveItem {
  id: string
  kind: ArchiveKind
  title: Bilingual                       // string for embeds (PT-only editorial), {en, pt} for projects
  type?: EmbedType                       // editorial only
  editorial?: string                     // editorial only
  date: string                           // 'dd/mm/yyyy' for editorial, 'yyyy' for projects
  sortDate: number                       // unix epoch ms — derived; drives sort
  href: string                           // external URL or internal route
  internal: boolean                      // true = react-router Link, false = <a target="_blank">
  gradient: string                       // for the preview thumb (reuse typeGradients / project gradients)
}
```

Source: a `data/archive.ts` module that imports `projects` and `embeds`, normalises each into `ArchiveItem`, and exports the unified array. For featured projects the gradient comes from `project.gradient`; for embeds it comes from `typeGradients[type]`. For personal/OSS/freelance: schema is in place but data is empty until the user backfills.

Bilingual title resolution: a small helper `resolveTitle(item, lang)` returns the right string at render time. Editorial titles are PT-only (the source CSV is editorial Portuguese content) so they're stored as plain strings; projects keep the `{en, pt}` shape. The helper handles both.

### UI — toolbar

A single horizontal toolbar above the list:

```
[ search ___________ ]   [ kind ▾ ]   [ type ▾ ]   [ editorial ▾ ]   [ year ▾ ]   [ sort ▾ ]
```

- **Search:** free text. Substring match (case-insensitive, accent-insensitive) on `title`. Updates the visible list as the user types (debounced 150ms).
- **Kind:** single-select dropdown. Options: `all`, `featured`, `editorial`, (later `personal`, `oss`, `freelance`).
- **Type:** single-select dropdown. Options: `all` + `embedTypes`. Disabled (greyed) when kind is set to anything other than `editorial` or `all` (since type only applies to editorial entries).
- **Editorial:** single-select dropdown. Options: `all` + `editorialCategories`. Same disabled-when-non-editorial behaviour as Type.
- **Year:** single-select dropdown. Options: `all` + descending list of unique years derived from the data.
- **Sort:** single-select dropdown. Options: `newest first` (default), `oldest first`, `a–z`, `z–a`. Sort is applied after filtering.

Active filters render as a row of removable chips below the toolbar (e.g., `kind: editorial ×  type: simulador ×`). Clicking a chip clears that filter. Chip strip is hidden when no filters are active.

Dropdown component: a small custom component (`ArchiveDropdown`) with click-outside-to-close, keyboard navigation (Arrow keys + Enter, Esc to close), and a controlled `value` prop. No external library — keeps bundle lean. ARIA: `role="listbox"`, `aria-expanded`, `aria-activedescendant`.

### UI — list

Columns (desktop, ≥1101px):

```
# | preview | title | kind | type | editorial | date | ↗
```

- **#** — 2-digit row index (resets to 01 when filters/sort change).
- **preview** — 56×40 gradient thumb (existing styling, reused).
- **title** — uppercase, primary text.
- **kind** — small uppercase label in muted text (`bark` / `dust`).
- **type** — uppercase, muted; renders `—` for non-editorial.
- **editorial** — uppercase, muted; renders `—` for non-editorial.
- **date** — uppercase, muted. Format: `dd/mm/yyyy` for editorial, `yyyy` for non-editorial.
- **↗** — arrow icon, opacity 0 → 1 on row hover (existing behavior).

Responsive:
- 721–1100px: hide `kind`, `type`, `editorial` columns. Keep `# | preview | title | date | ↗`.
- ≤720px: also hide `preview` and `date`. Keep `# | title | ↗`. (Matches existing `tbl-row` mobile collapse.)

Row click: same as today. If `internal: true`, `<Link to={href}>`. Otherwise `<a href={href} target="_blank" rel="noopener noreferrer">`.

### Pagination — show more

Same `PAGE_SIZE = 12` as today, but the broken animation must be fixed.

**Bug:** with the current `staggerContainer` + `whileInView once: true` setup, when the user clicks "show more" the parent has already animated to its `visible` state, so newly-added children don't get fresh stagger orchestration and they render at their initial `opacity: 0` state.

**Fix:** drop the parent stagger wrapper and let each row drive its own `initial → animate` transition with an index-based delay. On first mount of a row, `initial="hidden"` `animate="visible"`, transition delay computed from `(idx % PAGE_SIZE) * stagger`. Newly-added rows from "show more" each animate in correctly because they're independently controlled. The existing `viewport once: true` behavior is preserved by only animating to visible on intersection (use `useInView` from framer-motion per-row, or a shared `useMotionValue` pattern).

Alternative: keep the `motion.div` parent for the initial reveal but render newly-added rows in a separate `AnimatePresence` with their own variants. More moving parts; prefer the per-row approach.

### Migration / removal

- Delete `EmbedsGallery.tsx` and replace with `Archive.tsx` in `src/components/sections/`.
- Update `Home.tsx` to lazy-load `Archive` instead of `EmbedsGallery`.
- Update CSS: existing `.embeds-*` and `.tbl-*` classes get renamed/folded into `.archive-*` (or kept and reused if names still make sense). Don't leave dead CSS.
- i18n: rename keys in both `en.json` and `pt.json`. Existing chip labels (`filterByType`, `filterByEditorial`, `all`, `showMore`, `countLabel`) get reorganized under `sections.archive.toolbar.*` and `sections.archive.sort.*`.
- The bento `Projects.tsx` is unchanged. Featured projects appear in BOTH the bento (as highlights) AND the archive (as `kind: featured`). That's intentional — the bento is the curated shelf, the archive is the comprehensive index.

### Acceptance
- Section caption renders as `the archive.` with the `archive.` portion in blue-400 italic.
- Section id is `#archive`. Header nav links scroll to it.
- The list contains all 142 embeds + the 4 featured projects = 146 rows initially. Backfilling personal/OSS items into `data/archive.ts` increases the count without code changes elsewhere.
- All four dropdowns + search work independently and can be combined. Active filters show as chips below the toolbar; clicking a chip clears that filter.
- Sort dropdown changes order without reloading.
- "Show more" reveals the next 12 rows, and each new row animates in via fade-up / slide-in (no rows stuck at opacity 0).
- Date column shows `dd/mm/yyyy` for editorial entries and `yyyy` for project entries.
- Responsive collapses match the spec (kind/type/editorial gone at 721–1100px; preview/date also gone at ≤720px).
- All existing translation strings are migrated; no `embeds.*` keys remain referenced.

---

## 7. Work accordion — animated open/close

### Problem
`WorkExperience.tsx` uses `{open && <div className="work-body">...}` which mounts/unmounts instantly. No transition, jarring snap.

### Solution
- Wrap the body in `motion.div` inside `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` `animate={{ height: 'auto', opacity: 1 }}` `exit={{ height: 0, opacity: 0 }}`. Transition: `{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }`. Set `overflow: hidden` on the motion wrapper so the height clip works.
- Animate the chevron rotation (`+ → ×` rotated 45°) via the same duration in a `motion.span` driven by the `open` state. Currently the CSS class swap `.work-toggle.is-open` is what drives rotation — replace with `animate={{ rotate: open ? 45 : 0 }}`.
- Keep the existing `Stagger` row-reveal behavior unchanged.
- Layout: the open accordion grows downward, pushing siblings. That's fine — it's the natural read. No `layout` prop on siblings is needed because they don't need to coordinate.
- Reduced motion: respect `prefersReducedMotion` from `MotionContext`. When true, skip the height tween and snap open/closed (set `transition: { duration: 0 }`).

### Acceptance
- Clicking a work-row's head expands the body over ~320ms with a smooth height + opacity tween.
- Clicking the same head (or another row) collapses smoothly.
- Chevron rotates in sync with the open/close.
- Sibling rows shift smoothly as the accordion grows; no flicker, no overlap.
- With `prefers-reduced-motion: reduce` set, the open/close is instant.

---

## 8. Contact italic hover — progressive skew

### Problem
The Contact rows' label transitions from upright to italic on hover, and the swap is instant because Plus Jakarta italic is a separate font file (no slant axis on the variable font). The eye reads it as a font-pop at the end of the hover transition.

### Solution
- Keep `font-style: normal` on `.contact-label`.
- On `.contact-row:hover .contact-label`, apply `transform: skewX(-10deg)` with `transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)` matched to the rest of the hover transition.
- `transform-origin: 0 50%` so the text skews from its left edge (no horizontal drift).
- Do NOT toggle `font-style: italic` — the skew is the entire effect.
- The transform won't break layout because the row is grid-laid; the skewed label stays within its column. Confirm visually that the skewed glyphs don't clip into the next column at the widest hover offset.

### Acceptance
- Hovering a contact row eases the label's slant from 0° to -10° over the hover transition. No glyph pop, no font swap.
- Hover-out eases the slant back to 0° smoothly.
- The label text stays within its column at all hover states.

---

## TODO

- [x] **(1.1)** Move opacity transition out of inline style; class drives both opacity and padding transitions; verify nav padding eases smoothly on scroll.
- [x] **(1.2)** Add `.nav.is-scrolled { padding: 12px 20px }` inside `@media (max-width: 720px)`; verify horizontal padding doesn't change on scroll at small widths.
- [x] **(2)** Add `white-space: nowrap` to `.nav-avail`; verify pill never wraps and never overflows the nav area.
- [x] **(3)** Move the `.hero-accent-mount { display: none }` rule to fire at `(max-width: 720px)` only; verify R3F accent visible and well-positioned at 721–1099px.
- [x] **(4.1)** Replace bento `min-height` driven sizing with grid-auto-rows + aspect-ratio strategy; verify cells are square at desktop.
- [x] **(4.2)** Adjust 2-col and 1-col responsive behavior so collapsed bentos don't go flat or absurdly tall; verify at 720px and 480px.
- [x] **(5.1)** Add scroll-to-top in `ProjectDetail` mount via `useLayoutEffect` + Lenis + window fallback.
- [x] **(5.2)** Save Lenis scroll-Y to `sessionStorage` on Home unmount; restore on Home mount via `useLayoutEffect` before first paint.
- [x] **(5.3)** Add a `wasRestored` flag to `MotionContext` (or equivalent); when true, pre-resolve `entranceDone`, skip scroll-lock, and render `HeroNameDrawing` in its final ink-filled state.
- [ ] **(5.4)** Verify navigate-to-project-and-back lands at the original scroll-Y with no hero replay; verify hard reload still plays full hero entrance.
- [x] **(6.1)** Create `src/types/archive.ts` (or extend `content.ts`) with `ArchiveItem` + `ArchiveKind` types.
- [x] **(6.2)** Create `src/data/archive.ts` that normalises `projects` + `embeds` into `ArchiveItem[]`; export sorted by `sortDate` desc.
- [x] **(6.3)** Build `src/components/ui/ArchiveDropdown.tsx` — controlled select with click-outside-close, keyboard nav, ARIA listbox.
- [x] **(6.4)** Build `src/components/sections/Archive.tsx` with toolbar (search + 4 dropdowns + sort dropdown), active-filter chip strip, and per-row animated list.
- [x] **(6.5)** Replace `EmbedsGallery` import in `Home.tsx` with `Archive`; delete `EmbedsGallery.tsx` and dead `.embeds-*` / `.tbl-*` CSS.
- [x] **(6.6)** Update `Header.tsx` nav id `embeds` → `archive`; update i18n keys in `en.json` + `pt.json` from `sections.embeds.*` → `sections.archive.*` with new toolbar/sort sub-keys.
- [x] **(6.7)** Per-row `useInView` (or equivalent) animation so newly-added "show more" rows animate in correctly — no rows stuck at opacity 0.
- [x] **(6.8)** Responsive column collapse (kind/type/editorial gone at 1100px; preview/date gone at 720px); verify at all three breakpoints.
- [ ] **(7.1)** Wrap work-row body in `motion.div` inside `AnimatePresence` with height + opacity tween (~320ms).
- [ ] **(7.2)** Replace CSS chevron rotation with `motion.span animate={{ rotate }}` synced to body tween.
- [ ] **(7.3)** Respect `prefersReducedMotion` (snap open/close, no tween).
- [ ] **(7.4)** Verify smooth open/close, no layout flicker, no overlap with sibling rows.
- [ ] **(8.1)** Replace `font-style: italic` swap on `.contact-label` hover with `transform: skewX(-10deg)` + matching transition.
- [ ] **(8.2)** Set `transform-origin: 0 50%`; verify no horizontal drift and no clipping into adjacent column.

---

## Out of scope

- Backfilling actual personal / OSS / freelance data into the archive. Schema is in place; user populates later.
- Refactoring `useSmoothScroll` or Lenis setup beyond what scroll restoration requires.
- Any change to the hero entrance animation itself (only the bypass-on-return logic is added).
- Changes to non-listed sections (Hero copy, About, Skills, Stats, Contact form fields, Footer).
