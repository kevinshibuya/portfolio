# Portfolio polish pass — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 8 polish items from the 2026-05-03 spec — nav fixes, hero R3F breakpoint, square bento cells, project page scroll restoration with hero entrance bypass, EmbedsGallery → Archive redesign, animated work accordion, and progressive italic skew on Contact hover.

**Architecture:** Most tasks are localised to one or two files. The Archive redesign is split into four sub-tasks (types/data → dropdown → section → wire-up) so each fits comfortably in an isolated context. CSS-only fixes are bundled into one task to keep `index.css` edits sequential.

**Tech Stack:** React 19, TypeScript strict, Vite 6, TailwindCSS v4, Framer Motion v12, react-router-dom v7, react-i18next, Lenis, Vitest + Testing Library + Playwright.

**Spec:** `docs/superpowers/specs/2026-05-03-portfolio-polish-pass-design.md`

**After each step's command lands successfully, edit the corresponding `- [ ]` to `- [x]` in this file before proceeding to the next step.** Plan + spec checkbox discipline is mandatory (see `CLAUDE.md`).

---

## Task 1: Nav fixes bundle (CSS only)

**Spec sections:** §1, §2, §3
**Files:**
- Modify: `src/index.css` (sections: `.nav`, `.nav-avail`, `.hero-accent-mount`, media queries)
- Modify: `src/components/layout/Header.tsx` (remove the inline `transition: 'opacity 200ms ease-out'` on the header)

- [x] **Step 1: Move opacity transition off inline style in Header.tsx**

In `src/components/layout/Header.tsx`, replace the `<header>` element's inline style:

```tsx
<header
  className={`nav${scrolled ? ' is-scrolled' : ''}${visible ? ' is-visible' : ''}`}
>
```

Remove the `style={{ opacity, transition, pointerEvents }}` block entirely. The class `is-visible` will drive opacity / pointer-events from CSS.

- [x] **Step 2: Update `.nav` CSS to drive opacity + padding + nav padding-transition**

In `src/index.css`, replace the `.nav` rule (around line 121):

```css
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 18px 40px;
  opacity: 0;
  pointer-events: none;
  transition:
    padding 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease-out;
}
.nav.is-visible {
  opacity: 1;
  pointer-events: auto;
}
```

Leave `.nav.is-scrolled` rule unchanged at this step.

- [x] **Step 3: Add `.nav-avail` nowrap**

In `src/index.css`, find the `.nav-avail` rule (around line 177). Add `white-space: nowrap;` to the existing block:

```css
.nav-avail {
  /* …existing properties… */
  white-space: nowrap;
}
```

- [x] **Step 4: Override `.nav.is-scrolled` padding inside the small-screen media query**

In `src/index.css`, inside the existing `@media (max-width: 720px)` block (around line 983), add:

```css
@media (max-width: 720px) {
  .nav { padding: 12px 20px; }
  .nav.is-scrolled { padding: 12px 20px; }
  /* …existing rules… */
}
```

(Place the `.nav.is-scrolled` line right after the existing `.nav { padding: 12px 20px }` line.)

- [x] **Step 5: Move `.hero-accent-mount { display: none }` to the small-screen breakpoint**

In `src/index.css`, find the existing rule:

```css
@media (max-width: 1100px) {
  .hero-accent-mount { display: none; }
}
```

Delete that rule. Add inside the existing `@media (max-width: 720px)` block:

```css
.hero-accent-mount { display: none; }
```

- [x] **Step 6: Run typecheck + lint**

```bash
npm run build
npm run lint
```

Expected: both pass with no errors related to changed files.

- [x] **Step 7: Manual visual verification**

Run `npm run dev`. Open at desktop width and verify:
- Nav padding eases smoothly when scrolling past 40px (no snap).
- "available for projects" pill stays on one line at all viewport widths where it's visible (resize browser between 721px–1440px).
- Hero R3F accent stays mounted between 721px–1099px (currently disappears at 1100px).
- At ≤720px viewport, scrolling does NOT change horizontal padding (it stays 20px both before and after `.is-scrolled`).
- At ≤720px viewport, hero R3F accent is hidden.

- [x] **Step 8: Commit**

```bash
git add src/index.css src/components/layout/Header.tsx
git commit -m "fix(nav,hero): smooth nav padding, nowrap availability pill, hero R3F until 720px"
```

---

## Task 2: Square bento cells

**Spec section:** §4
**Files:**
- Modify: `src/index.css` (`.bento`, `.bento-card`, `.bento-card--lg`, `.bento-card--md`, related media queries)

- [x] **Step 1: Update `.bento` to drive square cells via grid-auto-rows + aspect-ratio**

In `src/index.css`, replace the `.bento` rule (around line 696):

```css
.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 1fr;
  aspect-ratio: 2 / 1;
  gap: 12px;
}
```

- [x] **Step 2: Remove `min-height` from card rules**

In `src/index.css`, in `.bento-card`, delete `min-height: 140px;`. In `.bento-card--lg`, delete `min-height: 300px;` (keep the `padding: 28px;` line).

- [x] **Step 3: Update 1100px and 720px responsive bento rules**

In `src/index.css`, in the existing `@media (max-width: 1100px)` block (around line 968), update the bento section:

```css
.bento {
  grid-template-columns: repeat(2, 1fr);
  aspect-ratio: 1 / 1;
}
.bento-card--lg, .bento-card--md { grid-column: span 2; }
.bento-card--lg { grid-row: auto; }
```

In the existing `@media (max-width: 720px)` block (around line 983), update the bento section:

```css
.bento {
  grid-template-columns: 1fr;
  aspect-ratio: auto;
}
.bento-card { aspect-ratio: 4 / 3; }
.bento-card--lg, .bento-card--md { grid-column: span 1; }
.bento-card--lg { aspect-ratio: 4 / 3; }
```

- [x] **Step 4: Run build**

```bash
npm run build
```

Expected: passes.

- [x] **Step 5: Manual visual verification**

Run `npm run dev`. At desktop ≥1101px, verify each bento cell visually reads as a square: small cards (poll system, embeds) are square, the lg card (reconstruction) is square at 2× scale, the md card (field notes) is a 2:1 banner. Then resize through 1100px and 720px and confirm proportions stay reasonable, no flat or stretched cards.

- [x] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "fix(bento): square cells via grid-auto-rows + aspect-ratio"
```

---

## Task 3: Project page scroll restoration + hero entrance bypass

**Spec section:** §5
**Files:**
- Modify: `src/context/MotionContext.tsx`
- Modify: `src/components/ui/HeroNameDrawing.tsx`
- Modify: `src/hooks/useScrollLockDuringEntrance.ts`
- Modify: `src/pages/ProjectDetail.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/layout/SmoothScroll.tsx` (only if Lenis ref isn't reachable for synchronous scroll — verify)

- [x] **Step 1: Add `entranceBypass` flag to MotionContext**

In `src/context/MotionContext.tsx`:

a) Add a module-scoped mutable flag:

```ts
let _entranceBypassed = false
```

b) Add a setter exposed on context:

```ts
const bypassEntrance: Resolver = () => {
  _entranceBypassed = true
  resolveEntrance()
}
```

c) Extend `MotionContextValue`:

```ts
interface MotionContextValue {
  entranceDone: Promise<void>
  resolveEntrance: Resolver
  bypassEntrance: Resolver        // new
  entranceBypassed: boolean       // new
  loaderDone: Promise<void>
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}
```

d) Include both in the `value` memo:

```ts
const value = useMemo<MotionContextValue>(
  () => ({
    entranceDone: _entranceDone,
    resolveEntrance,
    bypassEntrance,
    entranceBypassed: _entranceBypassed,
    loaderDone: _entranceDone,
    prefersReducedMotion: reduced,
    r3fAccentEnabled: r3fEnabled,
  }),
  [reduced, r3fEnabled]
)
```

Note: `entranceBypassed` is read at MotionProvider mount; since it's only ever set true (never reset), the memo doesn't need to track it as a dep.

- [x] **Step 2: Update `useScrollLockDuringEntrance` to skip lock if bypassed**

In `src/hooks/useScrollLockDuringEntrance.ts`, change the early-return logic to also check the bypass flag:

```ts
export function useScrollLockDuringEntrance(): void {
  const { entranceDone, resolveEntrance, entranceBypassed } = useMotion()
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname !== '/' || entranceBypassed) {
      resolveEntrance()
      document.body.dataset.loaderState = 'done'
      return
    }
    // …existing body unchanged…
  }, [entranceDone, resolveEntrance, pathname, entranceBypassed])
}
```

- [x] **Step 3: Update `HeroNameDrawing` to render in final state when bypassed**

In `src/components/ui/HeroNameDrawing.tsx`:

a) Read `entranceBypassed` from `useMotion()`:

```ts
const { prefersReducedMotion, entranceBypassed } = useMotion()
```

b) Initialize `inkFilled` true if either reduced motion OR bypassed:

```ts
const [inkFilled, setInkFilled] = useState(prefersReducedMotion || entranceBypassed)
```

c) Inside the `useEffect`, after the jsdom feature-detect early-return and before the `pathLength` block, add:

```ts
if (entranceBypassed) {
  allPaths.forEach((p) => {
    p.setAttribute('pathLength', '1')
    p.style.strokeDasharray = '1'
    p.style.strokeDashoffset = '0'
  })
  setInkFilled(true)
  onComplete?.()
  return
}
```

This skips the trace + ink-fill animation entirely and renders the SVG in its final filled state, while still resolving the entrance gate via `onComplete`.

- [x] **Step 4: Add scroll-to-top in ProjectDetail mount**

In `src/pages/ProjectDetail.tsx`, add at the top of the component body (after `useTranslation()` and before the `project` lookup):

```tsx
import { useEffect, useLayoutEffect } from 'react'
import { useLenis } from '../hooks/useLenis'

// inside ProjectDetail():
const { scrollTo } = useLenis()
useLayoutEffect(() => {
  // Scroll synchronously before first paint so the user never sees
  // the page mounted at the previous scroll position.
  window.scrollTo(0, 0)
}, [])
useEffect(() => {
  // Lenis catches up after mount once it's wired to the new route.
  scrollTo(document.body, { duration: 0 })
}, [scrollTo])
```

- [x] **Step 5: Add scroll save + restore + bypass in Home.tsx**

In `src/pages/Home.tsx`:

a) Add imports:

```tsx
import { useEffect, useLayoutEffect, lazy, Suspense } from 'react'
import { useLenis } from '../hooks/useLenis'
import { useMotion } from '../context/MotionContext'
```

b) Inside the `Home()` component, before the existing chunk-warming `useEffect`, add scroll restoration:

```tsx
const STORAGE_KEY = 'portfolio:home:scrollY'
const { scrollTo } = useLenis()
const { bypassEntrance } = useMotion()

useLayoutEffect(() => {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const y = parseInt(raw, 10)
  if (!Number.isFinite(y) || y <= 0) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  // Bypass the hero entrance BEFORE scroll restoration so the lock
  // doesn't latch.
  bypassEntrance()
  // Synchronous scroll before paint.
  window.scrollTo(0, y)
  // Tell Lenis to catch up.
  scrollTo(document.body, { duration: 0, offset: y })
  sessionStorage.removeItem(STORAGE_KEY)
}, [bypassEntrance, scrollTo])

// Save scroll on unmount (i.e., when navigating away from Home).
useEffect(() => {
  return () => {
    const y = window.scrollY
    if (y > 0) sessionStorage.setItem(STORAGE_KEY, String(y))
  }
}, [])
```

c) Leave the existing chunk-warming `useEffect` and the JSX unchanged.

- [x] **Step 6: Run build + lint**

```bash
npm run build
npm run lint
```

Expected: both pass.

- [ ] **Step 7: Manual verification — go-to-project**

Run `npm run dev`. Hard reload at `/`. Wait through hero entrance. Scroll to the work-experience section. Click any bento project card. Verify:
- Project page loads scrolled to the top (not at the previous scroll position).

- [ ] **Step 8: Manual verification — back-to-home**

From the project page, click "← back to projects". Verify:
- You land at the same scroll-Y where you clicked the bento card.
- No hero ink-trace replay.
- No scroll lock.
- The page is immediately interactive.

- [ ] **Step 9: Manual verification — fresh reload**

Hard-reload `/` (or open a new tab to `/`). Verify the full hero entrance animation plays as before (sessionStorage was cleared by the reload, so bypass doesn't kick in).

- [x] **Step 10: Commit**

```bash
git add src/context/MotionContext.tsx src/hooks/useScrollLockDuringEntrance.ts src/components/ui/HeroNameDrawing.tsx src/pages/ProjectDetail.tsx src/pages/Home.tsx
git commit -m "feat(routing): restore home scroll on back-nav, bypass hero entrance, scroll project pages to top"
```

---

## Task 4: Archive types + data normalization

**Spec section:** §6 (data model)
**Files:**
- Modify: `src/types/content.ts`
- Create: `src/data/archive.ts`
- Create: `tests/unit/data/archive.test.ts`

- [x] **Step 1: Write failing test for archive normalization**

Create `tests/unit/data/archive.test.ts` (the project's vitest config globs `tests/unit/**/*.test.{ts,tsx}` only):

```ts
import { describe, it, expect } from 'vitest'
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
} from '../../../src/data/archive'

describe('archive', () => {
  it('contains all featured projects + all embeds', () => {
    const featuredCount = archive.filter((i) => i.kind === 'featured').length
    const editorialCount = archive.filter((i) => i.kind === 'editorial').length
    expect(featuredCount).toBe(4)
    expect(editorialCount).toBeGreaterThan(100) // 142 in current CSV
  })

  it('is sorted by sortDate descending', () => {
    for (let i = 1; i < archive.length; i++) {
      expect(archive[i - 1].sortDate).toBeGreaterThanOrEqual(archive[i].sortDate)
    }
  })

  it('flags featured projects as internal links', () => {
    const featured = archive.find((i) => i.kind === 'featured')
    expect(featured?.internal).toBe(true)
    expect(featured?.href.startsWith('/projects/')).toBe(true)
  })

  it('flags editorial entries as external links', () => {
    const editorial = archive.find((i) => i.kind === 'editorial')
    expect(editorial?.internal).toBe(false)
    expect(editorial?.href.startsWith('http')).toBe(true)
  })

  it('formats editorial dates as dd/mm/yyyy and project dates as yyyy', () => {
    const editorial = archive.find((i) => i.kind === 'editorial')
    expect(editorial?.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    const featured = archive.find((i) => i.kind === 'featured')
    expect(featured?.date).toMatch(/^\d{4}$/)
  })

  it('exposes sorted unique types from editorial entries', () => {
    expect(archiveTypes.length).toBeGreaterThan(0)
    expect([...archiveTypes].sort()).toEqual(archiveTypes)
  })

  it('exposes sorted unique editorials', () => {
    expect(archiveEditorials.length).toBeGreaterThan(0)
    expect([...archiveEditorials].sort()).toEqual(archiveEditorials)
  })

  it('exposes years descending', () => {
    expect(archiveYears.length).toBeGreaterThan(0)
    for (let i = 1; i < archiveYears.length; i++) {
      expect(archiveYears[i - 1]).toBeGreaterThanOrEqual(archiveYears[i])
    }
  })
})
```

- [x] **Step 2: Run the test — confirm it fails**

```bash
npm run test:unit -- tests/unit/data/archive.test.ts
```

Expected: fails with "Cannot find module '../../../src/data/archive'" or similar.

- [x] **Step 3: Add `ArchiveItem` types to `content.ts`**

Append to `src/types/content.ts`:

```ts
export type ArchiveKind = 'featured' | 'editorial' | 'personal' | 'oss' | 'freelance'

export type Bilingual = string | { en: string; pt: string }

export interface ArchiveItem {
  id: string
  kind: ArchiveKind
  title: Bilingual
  type?: EmbedType
  editorial?: string
  date: string
  sortDate: number
  href: string
  internal: boolean
  gradient: string
}

export function resolveTitle(item: ArchiveItem, lang: 'en' | 'pt'): string {
  if (typeof item.title === 'string') return item.title
  return item.title[lang]
}
```

- [x] **Step 4: Implement `src/data/archive.ts`**

Create `src/data/archive.ts`:

```ts
import { projects } from './projects'
import { embeds, typeGradients } from './embeds'
import type { ArchiveItem, EmbedType } from '../types/content'

function parseEditorialDate(ddmmyyyy: string): number {
  // Expect 'dd/mm/yyyy'. Returns epoch ms; falls back to 0 on malformed input.
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  const [, dd, mm, yyyy] = m
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime()
}

function fromProjects(): ArchiveItem[] {
  return projects.map((p) => ({
    id: `featured-${p.id}`,
    kind: 'featured' as const,
    title: p.title,
    date: String(p.year),
    sortDate: new Date(`${p.year}-12-31T00:00:00Z`).getTime(),
    href: `/projects/${p.slug}`,
    internal: true,
    gradient: p.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
  }))
}

function fromEmbeds(): ArchiveItem[] {
  return embeds.map((e, i) => ({
    id: `editorial-${i}`,
    kind: 'editorial' as const,
    title: e.title,
    type: e.type,
    editorial: e.editorial,
    date: e.publicationDate,
    sortDate: parseEditorialDate(e.publicationDate),
    href: e.link,
    internal: false,
    gradient: typeGradients[e.type],
  }))
}

export const archive: ArchiveItem[] = [...fromProjects(), ...fromEmbeds()].sort(
  (a, b) => b.sortDate - a.sortDate
)

export const archiveTypes: EmbedType[] = [
  ...new Set(
    archive
      .filter((i) => i.kind === 'editorial' && i.type)
      .map((i) => i.type as EmbedType)
  ),
].sort() as EmbedType[]

export const archiveEditorials: string[] = [
  ...new Set(
    archive
      .filter((i) => i.kind === 'editorial' && i.editorial)
      .map((i) => i.editorial as string)
  ),
].sort()

export const archiveYears: number[] = [
  ...new Set(
    archive.map((i) => new Date(i.sortDate).getUTCFullYear()).filter((y) => y > 1970)
  ),
].sort((a, b) => b - a)

export const archiveKinds: ArchiveItem['kind'][] = [
  ...new Set(archive.map((i) => i.kind)),
].sort()
```

- [x] **Step 5: Run the test — confirm it passes**

```bash
npm run test:unit -- tests/unit/data/archive.test.ts
```

Expected: 8 tests pass.

- [x] **Step 6: Run typecheck**

```bash
npm run build
```

Expected: passes.

- [x] **Step 7: Commit**

```bash
git add src/types/content.ts src/data/archive.ts src/data/__tests__/archive.test.ts
git commit -m "feat(archive): add ArchiveItem types + unified projects/embeds normalization"
```

---

## Task 5: ArchiveDropdown component

**Spec section:** §6 (UI — toolbar, dropdowns)
**Files:**
- Create: `src/components/ui/ArchiveDropdown.tsx`
- Modify: `src/index.css` (append `.archive-dropdown*` rules — see Step 4)

- [x] **Step 1: Create the component**

Create `src/components/ui/ArchiveDropdown.tsx`:

```tsx
import { useEffect, useRef, useState, useId, useCallback } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface ArchiveDropdownProps {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function ArchiveDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: ArchiveDropdownProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  useEffect(() => {
    if (open) setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open, options, value])

  const onTriggerKey = (e: React.KeyboardEvent): void => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onChange(options[activeIdx].value)
      close()
    }
  }

  return (
    <div className={`archive-dropdown${disabled ? ' is-disabled' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={`archive-dropdown-trigger${open ? ' is-open' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
      >
        <span className="archive-dropdown-label">{label}</span>
        <span className="archive-dropdown-value">
          {selected?.label ?? options[0]?.label ?? '—'}
        </span>
        <span className="archive-dropdown-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <ul
          id={listId}
          className="archive-dropdown-list"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`archive-dropdown-option${
                i === activeIdx ? ' is-active' : ''
              }${o.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                onChange(o.value)
                close()
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [x] **Step 2: Append dropdown styles to `src/index.css`**

Append to the end of `src/index.css`:

```css
/* =========================================================================
   ARCHIVE DROPDOWN
   ========================================================================= */
.archive-dropdown { position: relative; display: inline-block; }
.archive-dropdown.is-disabled { opacity: 0.4; pointer-events: none; }
.archive-dropdown-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.archive-dropdown-trigger:hover { border-color: var(--blue-300); }
.archive-dropdown-trigger.is-open { border-color: var(--blue-400); background: var(--sand); }
.archive-dropdown-label { color: var(--dust); }
.archive-dropdown-value { color: var(--ink); font-weight: 600; }
.archive-dropdown-caret { font-size: 10px; color: var(--bark); }
.archive-dropdown-list {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 20;
  min-width: 100%;
  max-height: 280px; overflow-y: auto;
  margin: 0; padding: 6px;
  list-style: none;
  background: var(--cream);
  border: 1px solid var(--mist);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(17, 24, 34, 0.08);
}
.archive-dropdown-option {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--bark);
  text-transform: lowercase;
  cursor: pointer;
  white-space: nowrap;
}
.archive-dropdown-option.is-active { background: var(--sand); color: var(--ink); }
.archive-dropdown-option.is-selected { color: var(--blue-400); font-weight: 600; }
```

- [x] **Step 3: Verify build + lint**

```bash
npm run build
npm run lint
```

Expected: both pass.

- [x] **Step 4: Commit**

```bash
git add src/components/ui/ArchiveDropdown.tsx src/index.css
git commit -m "feat(ui): ArchiveDropdown — accessible select with keyboard nav"
```

---

## Task 6: Archive section component

**Spec section:** §6 (UI — list, pagination, animations)
**Files:**
- Create: `src/components/sections/Archive.tsx`
- Modify: `src/index.css` (append `.archive*` row/toolbar/chip rules)

- [x] **Step 1: Create the Archive section**

Create `src/components/sections/Archive.tsx`:

```tsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { ArchiveDropdown } from '../ui/ArchiveDropdown'
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
  archiveKinds,
} from '../../data/archive'
import { resolveTitle } from '../../types/content'
import type { ArchiveItem, EmbedType } from '../../types/content'

const PAGE_SIZE = 12
const STAGGER_MS = 40

type SortKey = 'newest' | 'oldest' | 'az' | 'za'

function normalize(s: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) so 'saúde' matches 'saude'.
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function Archive() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language as 'en' | 'pt'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [kind, setKind] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [editorial, setEditorial] = useState<string>('all')
  const [year, setYear] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Debounce search by 150ms.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(id)
  }, [search])

  // Reset pagination whenever filter/sort/search changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [debouncedSearch, kind, type, editorial, year, sort])

  // Type and Editorial dropdowns disable when kind != 'all' && kind != 'editorial'.
  const filtersDisabledForNonEditorial = kind !== 'all' && kind !== 'editorial'

  const filtered = useMemo(() => {
    let result = archive
    if (kind !== 'all') result = result.filter((i) => i.kind === kind)
    if (type !== 'all') result = result.filter((i) => i.type === type)
    if (editorial !== 'all') result = result.filter((i) => i.editorial === editorial)
    if (year !== 'all') {
      const yNum = parseInt(year, 10)
      result = result.filter((i) => new Date(i.sortDate).getUTCFullYear() === yNum)
    }
    if (debouncedSearch) {
      const q = normalize(debouncedSearch)
      result = result.filter((i) => normalize(resolveTitle(i, lang)).includes(q))
    }
    if (sort === 'newest') result = [...result].sort((a, b) => b.sortDate - a.sortDate)
    else if (sort === 'oldest') result = [...result].sort((a, b) => a.sortDate - b.sortDate)
    else if (sort === 'az')
      result = [...result].sort((a, b) =>
        resolveTitle(a, lang).localeCompare(resolveTitle(b, lang))
      )
    else if (sort === 'za')
      result = [...result].sort((a, b) =>
        resolveTitle(b, lang).localeCompare(resolveTitle(a, lang))
      )
    return result
  }, [kind, type, editorial, year, debouncedSearch, sort, lang])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const allOpt = { value: 'all', label: t('sections.archive.toolbar.all') }
  const kindOptions = [allOpt, ...archiveKinds.map((k) => ({ value: k, label: k }))]
  const typeOptions = [allOpt, ...archiveTypes.map((tp) => ({ value: tp, label: tp.toLowerCase() }))]
  const editorialOptions = [allOpt, ...archiveEditorials.map((e) => ({ value: e, label: e }))]
  const yearOptions = [allOpt, ...archiveYears.map((y) => ({ value: String(y), label: String(y) }))]
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'newest', label: t('sections.archive.sort.newest') },
    { value: 'oldest', label: t('sections.archive.sort.oldest') },
    { value: 'az', label: t('sections.archive.sort.az') },
    { value: 'za', label: t('sections.archive.sort.za') },
  ]

  const activeChips: { label: string; clear: () => void }[] = []
  if (kind !== 'all') activeChips.push({ label: `kind: ${kind}`, clear: () => setKind('all') })
  if (type !== 'all') activeChips.push({ label: `type: ${type.toLowerCase()}`, clear: () => setType('all') })
  if (editorial !== 'all') activeChips.push({ label: `editorial: ${editorial}`, clear: () => setEditorial('all') })
  if (year !== 'all') activeChips.push({ label: `year: ${year}`, clear: () => setYear('all') })

  return (
    <section id="archive" className="section section--sand">
      <div className="section-inner">
        <SectionHeading
          index={t('sections.archive.index')}
          label={t('sections.archive.label')}
          title={t('sections.archive.title')}
          description={t('sections.archive.description')}
        />

        <div className="archive-toolbar">
          <input
            type="search"
            className="archive-search"
            placeholder={t('sections.archive.toolbar.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.kind')}
            value={kind}
            options={kindOptions}
            onChange={setKind}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.type')}
            value={type}
            options={typeOptions}
            onChange={setType}
            disabled={filtersDisabledForNonEditorial}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.editorial')}
            value={editorial}
            options={editorialOptions}
            onChange={setEditorial}
            disabled={filtersDisabledForNonEditorial}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.year')}
            value={year}
            options={yearOptions}
            onChange={setYear}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.sort')}
            value={sort}
            options={sortOptions}
            onChange={(v) => setSort(v as SortKey)}
          />
        </div>

        {activeChips.length > 0 && (
          <div className="archive-chips">
            {activeChips.map((c) => (
              <button key={c.label} className="archive-chip" onClick={c.clear} type="button">
                {c.label} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}

        <p className="archive-count">
          <strong>{filtered.length}</strong> {t('sections.archive.toolbar.countLabel')}
        </p>

        <div className="archive-list section-spacing-content">
          {visible.map((item, idx) => (
            <ArchiveRow
              key={item.id}
              idx={idx}
              item={item}
              lang={lang}
              reduced={prefersReducedMotion}
            />
          ))}
        </div>

        {hasMore && (
          <div className="archive-more">
            <button
              className="btn btn--ghost"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {t('sections.archive.toolbar.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

interface ArchiveRowProps {
  idx: number
  item: ArchiveItem
  lang: 'en' | 'pt'
  reduced: boolean
}

function ArchiveRow({ idx, item, lang, reduced }: ArchiveRowProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const num = String(idx + 1).padStart(2, '0')
  const title = resolveTitle(item, lang)
  const delay = reduced ? 0 : Math.min(idx * (STAGGER_MS / 1000), 0.4)

  const inner = (
    <>
      <span className="archive-num">{num}</span>
      <div className="archive-preview" style={{ background: item.gradient }} />
      <span className="archive-title">{title}</span>
      <span className="archive-kind">{item.kind}</span>
      <span className="archive-type">{item.type ? item.type.toLowerCase() : '—'}</span>
      <span className="archive-editorial">{item.editorial ?? '—'}</span>
      <span className="archive-date">{item.date}</span>
      <span className="archive-arrow">↗</span>
    </>
  )

  const motionProps = {
    initial: { opacity: 0, x: reduced ? 0 : -16 },
    animate: inView ? { opacity: 1, x: 0 } : { opacity: 0, x: reduced ? 0 : -16 },
    transition: { duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const, delay },
  }

  return (
    <motion.div ref={ref} className="archive-row-wrap" {...motionProps}>
      {item.internal ? (
        <Link to={item.href} className="archive-row">
          {inner}
        </Link>
      ) : (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="archive-row">
          {inner}
        </a>
      )}
    </motion.div>
  )
}
```

- [x] **Step 2: Append archive list / toolbar / chip styles to `src/index.css`**

Append to the end of `src/index.css`:

```css
/* =========================================================================
   ARCHIVE — toolbar, chips, list
   ========================================================================= */
.archive-toolbar {
  display: flex; flex-wrap: wrap; gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}
.archive-search {
  flex: 1 1 240px;
  min-width: 200px;
  padding: 9px 14px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  font: inherit;
  font-size: 12px;
  color: var(--ink);
  letter-spacing: 0.02em;
  transition: border-color 0.2s;
}
.archive-search:focus { outline: none; border-color: var(--blue-400); }
.archive-search::placeholder { color: var(--dust); text-transform: lowercase; }

.archive-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.archive-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: transparent;
  font: inherit; font-size: 11px;
  color: var(--bark);
  text-transform: lowercase;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.archive-chip:hover { background: var(--cream); border-color: var(--blue-300); }

.archive-count {
  font-size: 12px;
  color: var(--bark);
  text-transform: lowercase;
  letter-spacing: 0.04em;
  margin-bottom: 24px;
}
.archive-count strong { color: var(--ink); font-weight: 600; }

.archive-list {
  border: 1px solid var(--mist);
  border-radius: 18px;
  overflow: hidden;
  background: var(--cream);
}
.archive-row-wrap { display: block; }
.archive-row {
  display: grid;
  grid-template-columns: 36px 56px 1fr 90px 120px 140px 110px 24px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mist);
  text-decoration: none;
  color: inherit;
  transition: background 0.25s;
}
.archive-row-wrap:last-child .archive-row { border-bottom: none; }
.archive-row:hover { background: var(--sand); }
.archive-num {
  font-size: 11px; font-weight: 500;
  color: var(--dust); letter-spacing: 0.04em;
}
.archive-preview {
  width: 56px; height: 40px;
  border-radius: 8px;
  transition: transform 0.3s;
}
.archive-row:hover .archive-preview { transform: scale(1.08); }
.archive-title {
  font-size: 13px; font-weight: 600;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: -0.01em;
  transition: transform 0.3s;
}
.archive-row:hover .archive-title {
  transform: translateX(4px);
  color: var(--blue-400);
}
.archive-kind, .archive-type, .archive-editorial, .archive-date {
  font-size: 11px; color: var(--bark);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.archive-arrow {
  font-size: 14px; color: var(--bark);
  opacity: 0; transition: opacity 0.3s;
  text-align: right;
}
.archive-row:hover .archive-arrow { opacity: 1; }

.archive-more { display: flex; justify-content: center; margin-top: 32px; }

@media (max-width: 1100px) {
  .archive-row {
    grid-template-columns: 32px 56px 1fr 110px 24px;
  }
  .archive-kind, .archive-type, .archive-editorial { display: none; }
}
@media (max-width: 720px) {
  .archive-row {
    grid-template-columns: 32px 1fr 24px;
    gap: 12px;
    padding: 14px 16px;
  }
  .archive-preview, .archive-date { display: none; }
}
```

- [x] **Step 3: Build + lint check**

```bash
npm run build
npm run lint
```

Expected: build + lint pass. (Note: this task does NOT yet wire Archive into Home, so the section won't render in the dev server until Task 7. Build verifies the component compiles.)

- [x] **Step 4: Commit**

```bash
git add src/components/sections/Archive.tsx src/index.css
git commit -m "feat(archive): Archive section — toolbar, chips, animated list, per-row inView"
```

---

## Task 7: Wire Archive into the app + i18n migration + cleanup

**Spec section:** §6 (migration / removal)
**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`
- Delete: `src/components/sections/EmbedsGallery.tsx`
- Modify: `src/index.css` (delete dead `.embeds-*`, `.tbl-*` rules)

- [x] **Step 1: Replace `EmbedsGallery` lazy import with `Archive` in Home.tsx**

In `src/pages/Home.tsx`:

a) Replace:

```tsx
const EmbedsGallery = lazy(() =>
  import('../components/sections/EmbedsGallery').then((m) => ({ default: m.EmbedsGallery }))
)
```

with:

```tsx
const Archive = lazy(() =>
  import('../components/sections/Archive').then((m) => ({ default: m.Archive }))
)
```

b) Replace the `<EmbedsGallery />` render with `<Archive />` (in the JSX).

c) Replace the chunk-warming `void import('../components/sections/EmbedsGallery')` with `void import('../components/sections/Archive')`.

- [x] **Step 2: Update Header nav id `embeds` → `archive`**

In `src/components/layout/Header.tsx`:

a) Change the const:

```ts
const NAV_ITEMS = [
  'work',
  'archive',
  'experience',
  'skills',
  'contact',
] as const

const SECTION_ID: Record<NavItem, string> = {
  work: 'projects',
  archive: 'archive',
  experience: 'work',
  skills: 'skills',
  contact: 'contact',
}
```

b) The translation key already comes from `t('nav.${key}')` so the new key `nav.archive` will be required — handled in Step 3.

- [x] **Step 3: Migrate i18n keys in `en.json`**

In `src/i18n/locales/en.json`:

a) Under `nav`, rename `"embeds": "interactives"` to `"archive": "the archive"`.

b) Replace the entire `sections.embeds` block with:

```json
"archive": {
  "index": "02 · everything",
  "label": "",
  "title": "the <em>archive.</em>",
  "description": "everything I've shipped — interactives, projects, experiments.",
  "toolbar": {
    "search": "search…",
    "kind": "kind",
    "type": "type",
    "editorial": "editorial",
    "year": "year",
    "sort": "sort",
    "all": "all",
    "countLabel": "items",
    "showMore": "show more"
  },
  "sort": {
    "newest": "newest first",
    "oldest": "oldest first",
    "az": "a–z",
    "za": "z–a"
  }
}
```

(Place `archive` where `embeds` used to be, preserving the section ordering inside `sections`.)

- [x] **Step 4: Mirror i18n changes in `pt.json`**

In `src/i18n/locales/pt.json`:

a) Under `nav`, rename `"embeds"` (whatever the existing PT label is) to `"archive": "arquivo"`.

b) Replace the `sections.embeds` block with:

```json
"archive": {
  "index": "02 · arquivo",
  "label": "",
  "title": "o <em>arquivo.</em>",
  "description": "tudo que eu já publiquei — interativos, projetos, experimentos.",
  "toolbar": {
    "search": "buscar…",
    "kind": "tipo",
    "type": "formato",
    "editorial": "editoria",
    "year": "ano",
    "sort": "ordenar",
    "all": "todos",
    "countLabel": "itens",
    "showMore": "mostrar mais"
  },
  "sort": {
    "newest": "mais recentes",
    "oldest": "mais antigos",
    "az": "a–z",
    "za": "z–a"
  }
}
```

(Open the file first to confirm exact existing PT key naming and preserve any unrelated keys.)

- [x] **Step 5: Delete `EmbedsGallery.tsx`**

```bash
git rm src/components/sections/EmbedsGallery.tsx
```

- [x] **Step 6: Delete dead CSS in `src/index.css`**

Delete the following rule blocks (search for each prefix):
- `.embeds-filters`, `.embeds-filter-group`, `.embeds-filter-label`, `.embeds-chips`, `.embeds-count`, `.embeds-count strong`, `.embeds-more`
- `.tbl`, `.tbl-row`, `.tbl-row:last-child`, `.tbl-row:hover`, `.tbl-num`, `.tbl-preview`, `.tbl-row:hover .tbl-preview`, `.tbl-title`, `.tbl-row:hover .tbl-title`, `.tbl-role`, `.tbl-year`, `.tbl-arrow`, `.tbl-row:hover .tbl-arrow`
- The `.tbl-row` rules inside `@media (max-width: 1100px)` and any embed-specific media query overrides.

Also search for any leftover references to the old `tbl-*` classes — if none remain in components, the CSS deletion is safe.

- [x] **Step 7: Confirm no stale references**

```bash
grep -r "EmbedsGallery\|sections.embeds\|nav.embeds\|tbl-row\|tbl-num\|embeds-chips" src/
```

Expected output: only matches in already-staged deleted files / nothing relevant. If anything appears in active components, fix it before continuing.

- [x] **Step 8: Build + lint + unit tests**

```bash
npm run build
npm run lint
npm run test:unit
```

Expected: all green.

- [ ] **Step 9: Manual visual verification**

Run `npm run dev`. Verify:
- Section reads "the archive." with `archive.` in italic blue.
- Toolbar shows search input + 5 dropdowns.
- Search filters live (try typing 3+ chars).
- Each dropdown opens, supports keyboard nav, click-outside-closes, selects.
- Clearing a chip in the active-filter strip resets that filter.
- Sort dropdown changes order.
- "Show more" reveals next 12 rows AND each new row animates in (opacity 0 → 1, slight slide-in).
- At 720px viewport, only `# title ↗` columns show in the row.
- Header nav link "the archive" / "arquivo" scrolls to the section.
- Toggling EN/PT updates the section title, dropdown labels, and chip labels.

- [x] **Step 10: Commit**

```bash
git add src/pages/Home.tsx src/components/layout/Header.tsx src/i18n/locales/en.json src/i18n/locales/pt.json src/index.css
git commit -m "feat(archive): wire into Home + Header, migrate i18n, delete EmbedsGallery"
```

---

## Task 8: Work accordion animation

**Spec section:** §7
**Files:**
- Modify: `src/components/sections/WorkExperience.tsx`
- Modify: `src/index.css` (the chevron rotation rule moves into Framer)

- [x] **Step 1: Refactor work-row body to AnimatePresence + height tween**

In `src/components/sections/WorkExperience.tsx`:

a) Add imports at the top:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
```

b) Inside the `WorkExperience` component, just after `const lang = ...`, read `prefersReducedMotion`:

```tsx
const { prefersReducedMotion } = useMotion()
```

c) Replace the chevron `<span>` with a `motion.span`:

```tsx
<motion.span
  className="work-toggle"
  animate={{ rotate: open ? 45 : 0 }}
  transition={{
    duration: prefersReducedMotion ? 0 : 0.32,
    ease: [0.22, 1, 0.36, 1],
  }}
>
  +
</motion.span>
```

(Drop the `${open ? ' is-open' : ''}` className suffix — Framer drives rotation now.)

d) Replace the `{open && <div className="work-body">…</div>}` block with:

```tsx
<AnimatePresence initial={false}>
  {open && (
    <motion.div
      key="body"
      className="work-body"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ overflow: 'hidden' }}
    >
      <div className="work-body-inner">
        {/* …existing inner contents unchanged… */}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [x] **Step 2: Remove the dead `.work-toggle.is-open` rule from CSS**

In `src/index.css`, search for the `.work-toggle.is-open` selector. Delete that rule (Framer drives the rotation now). Leave the base `.work-toggle` rule alone.

- [x] **Step 3: Build + lint**

```bash
npm run build
npm run lint
```

Expected: pass.

- [ ] **Step 4: Manual visual verification**

Run `npm run dev`. Scroll to the work section. Verify:
- Clicking a row's head opens the body over ~320ms (smooth height + fade).
- Clicking again closes smoothly.
- Chevron rotates 0° → 45° in sync.
- No flicker, no layout jump on open/close.
- With OS-level "reduce motion" enabled (System Settings → Accessibility), open/close is instant.

- [x] **Step 5: Commit**

```bash
git add src/components/sections/WorkExperience.tsx src/index.css
git commit -m "feat(work): animated accordion with height + chevron tween"
```

---

## Task 9: Contact italic skew

**Spec section:** §8
**Files:**
- Modify: `src/index.css` (`.contact-row:hover .contact-label` block)

- [x] **Step 1: Find the existing `.contact-row:hover .contact-label` rule**

Search `src/index.css` for `.contact-row:hover .contact-label`. The current rule sets `font-style: italic` (or similar instant property change). Note any other properties currently on it.

- [x] **Step 2: Replace italic swap with skew transform**

Replace the rule with:

```css
.contact-label {
  display: inline-block;
  transform: skewX(0);
  transform-origin: 0 50%;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), color 0.3s;
}
.contact-row:hover .contact-label {
  transform: skewX(-10deg);
  /* Remove `font-style: italic;` if present here. */
}
```

(`display: inline-block` is required for `transform` to apply to inline text. If `.contact-label` already has `display` set elsewhere, leave that alone.)

- [x] **Step 3: Build + lint**

```bash
npm run build
npm run lint
```

Expected: pass.

- [ ] **Step 4: Manual visual verification**

Run `npm run dev`. Scroll to Contact. Hover each contact row and verify:
- The label slants from upright to ~10° lean smoothly over the hover transition.
- No font pop or glyph swap at the end of the transition.
- On hover-out, the label returns smoothly to upright.
- The skewed label stays inside its grid column (doesn't clip into the meta column).

- [x] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "fix(contact): progressive skew replaces instant italic swap on hover"
```

---

## Final verification (after all tasks)

- [ ] **Run full test suite**

```bash
npm run test:unit
npm run build
```

Expected: all unit tests pass, build succeeds.

- [ ] **End-to-end smoke check**

Run `npm run dev`. Walk through:
1. Hard reload at `/` — verify hero ink-trace plays, section animations trigger as you scroll.
2. Scroll to bento, click a card — project page opens at top.
3. Click "back to projects" — land where you were, no entrance replay.
4. Resize through 1440 → 1100 → 720 → 480 — verify nav, hero accent, bento, archive list all collapse cleanly.
5. Open work accordion — smooth animation.
6. Hover contact rows — smooth italic skew.
7. Toggle EN/PT — archive section labels, dropdowns, chips all switch.
8. Test the archive: search, each dropdown, sort, show-more (verify new rows animate in).

- [ ] **Final commit if any small fixes surfaced**

```bash
git status
# If clean, no commit needed.
```

---

## Out of scope (intentional)

- Backfilling personal / OSS / freelance data into the archive (schema is in place; user populates later).
- Refactoring `useSmoothScroll` or Lenis setup beyond what scroll restoration requires.
- Any change to the hero entrance animation itself (only the bypass-on-return logic is added).
- Changes to non-listed sections (Hero copy, About, Skills, Stats, Contact form fields, Footer).
