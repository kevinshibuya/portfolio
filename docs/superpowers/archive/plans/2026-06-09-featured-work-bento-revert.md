# Featured Work — Bento Revert (+ pill & parallax) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **After each step's command lands successfully, Edit that step's `- [ ]` to `- [x]` in THIS file before proceeding.**

**Goal:** Revert the featured-work section from the square-card layout back to the bento grid, then graft on two salvaged square-era interactions — the velocity "view project" cursor pill and subtle scroll parallax on the card mockups.

**Architecture:** Restore the bento `Projects.tsx` from git (`6ab9583^`) — data model + bento CSS are unchanged since then. Delete only the orphaned square-layout CSS (keep `.project-cursor*`). Then graft the pill (section-level overlay) and parallax (inner `.bento-mockup` span) directly into the restored component, both gated for reduced-motion / coarse pointer.

**Tech Stack:** React 19 + TS, Framer Motion v12 (`useScroll`/`useTransform`/`useVelocity`/`useSpring`/`useMotionValue`), TailwindCSS v4 (CSS in `src/index.css`), Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-06-09-featured-work-bento-revert-design.md`

**Commands (this project):** build `npm run build` · unit `npm run test:unit` · e2e `npm run test:e2e` · lint `npm run lint` · visual preview `npm run build && npx vite preview` (port 4173 — NOT `npm run preview`, which is `wrangler dev`).

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/components/sections/Projects.tsx` | Bento grid + grafted pill + grafted parallax | 1, 2, 3 |
| `src/index.css` | Delete square layout CSS; keep `.project-cursor*` | 1 |
| `src/i18n/locales/en.json`, `pt.json` | Remove dead `sections.projects.intro` | 1 |
| `tests/e2e/section-enters.spec.ts`, `reduced-motion.spec.ts` | `#projects` title → `.section-title` | 1 |

---

## Task 1: Restore the bento base (revert component + CSS + i18n + e2e)

**Outcome:** `#projects` renders the bento grid with cursor-tilt; square layout gone; tests green. No pill / parallax yet (added in Tasks 2–3). `.project-cursor*` CSS is intentionally retained (orphaned for one commit) for the Task 2 pill.

**Files:**
- Restore: `src/components/sections/Projects.tsx` (from `6ab9583^`)
- Modify: `src/index.css` (delete ~1030–1229; trim the responsive `@media` blocks)
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/pt.json`
- Modify: `tests/e2e/section-enters.spec.ts`, `tests/e2e/reduced-motion.spec.ts`

- [x] **Step 1: Restore the bento component from git**

```bash
git checkout 6ab9583^ -- src/components/sections/Projects.tsx
```
This brings back the 169-line bento version (`SectionHeading` + `BentoCard` + `MockupLayer`, `useCursorTilt`, dual tonal/color mockup, staggered `cardReveal`). Its deps (`useMotion`, `useCursorTilt`, `SectionHeading`, `VARIANTS.cardReveal`/`STAGGER_PRESETS.projectCards`/`staggerContainer`/`REDUCED_MOTION_VARIANT`) and all data fields already exist at HEAD — verified.

- [x] **Step 2: Delete the square-layout CSS block in `src/index.css`**

Delete the contiguous square-layout rules from `.project-section` through `.project-aside__cta:hover` (and the section-header comment immediately above `.project-section`, if present). Anchor on selectors, not line numbers (they shift). The block to remove starts at:
```css
.project-section { /* no-op — `.section` already sets max-width, padding, etc. */ }
.project-grid { ... }
.project-aside { ... }
/* ...all .project-aside*, .project-list, .project-row* rules... */
.project-aside__cta:hover { border-color: var(--blue-500); }
```
**KEEP** the three rules immediately after: `.project-cursor`, `.project-cursor__rotor`, `.project-cursor__pill` (the pill uses them in Task 2).

- [x] **Step 3: Trim the square rules out of the responsive `@media` blocks (keep the cursor guards)**

Below the `.project-cursor*` rules, replace the mixed media blocks. **Delete** the entire `@media (min-width: 901px)` block (it only holds `.project-aside__mobile`/`__desktop`). For the other two, keep only the `.project-cursor` guard. Final state of that region:

```css
/* Hide the cursor follower below the desktop breakpoint. */
@media (max-width: 900px) {
  .project-cursor { display: none; }
}

/* Touch: cursor follower can't be hovered usefully. */
@media (hover: none) {
  .project-cursor { display: none; }
}

/* Reduced motion: no cursor follower. */
@media (prefers-reduced-motion: reduce) {
  .project-cursor { display: none; }
}
```
(Removed from those blocks: `.project-grid`, `.project-aside`, `.project-list`, `.project-row__img`.)

- [x] **Step 4: Remove the dead `intro` i18n key (EN + PT)**

In both `src/i18n/locales/en.json` and `src/i18n/locales/pt.json`, under `sections.projects`, delete the entire `"intro": "..."` line. Leave `viewProject` (the pill uses it in Task 2). Resulting key set: `index, label, title, description, caseStudy, viewProject`. Ensure JSON stays valid (the line before, `"caseStudy": ...,`, keeps its trailing comma; `viewProject` remains last with no trailing comma).

- [x] **Step 5: Point both e2e specs at the bento `.section-title`**

In `tests/e2e/section-enters.spec.ts`, replace the comment block (lines ~4–9) and the `titleSelectorFor` helper with:
```ts
  // Every section — including Projects, reverted to the bento grid — renders
  // its title via SectionHeading as `.section-title`.
  const titleSelectorFor = (id: string): string => `${id} .section-title`
```
In `tests/e2e/reduced-motion.spec.ts`, replace the comment + the `.project-aside__title*` locator with:
```ts
  // Projects (reverted to the bento grid) renders its title via
  // SectionHeading as `.section-title`, like every other section.
  const op = await page.locator('#projects .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
```

- [x] **Step 6: Validate JSON + typecheck + build**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json'));JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json'));console.log('json ok')"` then `npm run build`
Expected: `json ok`, then `tsc -b` + `vite build` succeed with no errors.

- [x] **Step 7: Run unit + e2e tests**

Run: `npm run test:unit && npm run test:e2e`
Expected: vitest green; Playwright green (the two updated specs now resolve `#projects .section-title`).

- [x] **Step 8: Confirm no orphan square CSS / no orphan i18n**

Run: `grep -nE '\.project-(section|grid|aside|list|row)' src/index.css || echo "CLEAN: no square layout CSS"` and `grep -n '"intro"' src/i18n/locales/*.json || echo "CLEAN: no intro key"`
Expected: both print `CLEAN: ...`.

- [x] **Step 9: Commit**

```bash
git add src/components/sections/Projects.tsx src/index.css src/i18n/locales/en.json src/i18n/locales/pt.json tests/e2e/section-enters.spec.ts tests/e2e/reduced-motion.spec.ts
git commit -m "revert(projects): restore bento grid, drop square layout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Graft the velocity "view project" pill

**Outcome:** A pill follows the cursor (spring-smoothed), rotates with horizontal velocity, and fades in only while a card is hovered. Not rendered under reduced motion; hidden under coarse pointer (CSS from Task 1). The `.project-cursor*` CSS is now wired to JS.

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [x] **Step 1: Update imports**

Change the top two import lines to:
```tsx
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import { useRef, useState } from 'react'
```

- [x] **Step 2: Add pill machinery + hover state in the `Projects` component**

Immediately after the `cardVariants` declaration (before `return`), add:
```tsx
  // Velocity "view project" cursor pill (desktop, motion-on only).
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { damping: 28, stiffness: 380, mass: 0.4 })
  const springY = useSpring(cursorY, { damping: 28, stiffness: 380, mass: 0.4 })
  const vx = useVelocity(springX)
  const rotate = useTransform(vx, [-2500, 2500], [18, -18], { clamp: true })
  const [hovering, setHovering] = useState(false)

  function handleMove(e: React.MouseEvent) {
    cursorX.set(e.clientX)
    cursorY.set(e.clientY)
  }
```

- [x] **Step 3: Wire `onMouseMove` on the section + render the pill**

Change the opening `<section>` tag to:
```tsx
    <section
      id="projects"
      className="section"
      onMouseMove={prefersReducedMotion ? undefined : handleMove}
    >
```
Then, just before the closing `</section>`, add the pill (only when motion is on):
```tsx
      {!prefersReducedMotion && (
        <motion.div
          className="project-cursor"
          style={{ x: springX, y: springY }}
          aria-hidden="true"
        >
          <motion.div
            className="project-cursor__rotor"
            style={{ rotate }}
            animate={hovering ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="project-cursor__pill">{t('sections.projects.viewProject')}</span>
          </motion.div>
        </motion.div>
      )}
```

- [x] **Step 4: Pass hover callbacks to `BentoCard` and wire them on the card link**

In the `featured.map(...)` render, add the two props:
```tsx
          <BentoCard
            key={project.id}
            project={project}
            lang={lang}
            caseStudy={t('sections.projects.caseStudy')}
            variants={cardVariants}
            onHoverEnter={() => setHovering(true)}
            onHoverLeave={() => setHovering(false)}
          />
```
Extend `BentoCardProps` and the destructure:
```tsx
interface BentoCardProps {
  project: Project
  lang: 'en' | 'pt'
  caseStudy: string
  variants: import('framer-motion').Variants
  onHoverEnter: () => void
  onHoverLeave: () => void
}

function BentoCard({ project, lang, caseStudy, variants, onHoverEnter, onHoverLeave }: BentoCardProps) {
```
On **both** `<MotionLink ...>` returns (the `isDual` branch and the default branch), add to the existing props:
```tsx
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
```
(These coexist with `useCursorTilt`, which binds its own `mousemove`/`mouseleave` listeners internally on `cardRef`.)

- [x] **Step 5: Typecheck + build**

Run: `npm run build`
Expected: clean (no unused-var or type errors).

- [x] **Step 6: Visual verify (motion on + reduced motion)**

Run: `npm run build && npx vite preview` (port 4173). With normal motion: move the cursor over the bento — the pill appears, follows the cursor, tilts with horizontal velocity, and fades out off-card. Emulate reduced motion (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, reload): no pill renders. Capture a desktop screenshot to `tmp/`.
Expected: pill behaves as described; absent under reduced motion.

- [x] **Step 7: Commit**

```bash
git add src/components/sections/Projects.tsx
git commit -m "feat(projects): graft velocity 'view project' pill onto bento

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Graft subtle scroll parallax on the mockups

**Outcome:** Each card's mockup drifts gently on the Y axis as the card scrolls through the viewport. The transform lives on the inner `.bento-mockup` span (a different node than the tilt-bearing `.bento-mockup-img`), so it composes with the cursor-tilt instead of fighting it. Disabled under reduced motion. Because the mockups are `object-fit: contain` floating in inset negative space, there is no clip-frame to reveal — the only visual guard is keeping the range small enough not to collide with the card's `.bento-bottom` title row.

> Note vs spec: the spec mentioned an over-scale "for headroom." On inspection the bento mockups are `contain`-fit (not a clipped `cover` frame), so no over-scale is needed — a small drift range is the correct mechanism.

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [x] **Step 1: Extend imports for scroll + the MotionValue type**

Update the framer-motion import to include `useScroll` and the `MotionValue` type:
```tsx
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
```

- [x] **Step 2: Compute a gated parallax MotionValue in `BentoCard`**

At the top of `BentoCard`, after `useCursorTilt(...)`, add (`useMotion` is already imported and used by `Projects`; import is module-level so it's available):
```tsx
  const { prefersReducedMotion } = useMotion()

  // Subtle scroll parallax on the (contain-fit) mockup. Targets the inner
  // `.bento-mockup` span — a different node than the tilt-driven imgs.
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  })
  const rawY = useTransform(scrollYProgress, [0, 1], ['-5%', '5%'])
  const mockupY = prefersReducedMotion ? undefined : rawY
```
(`useScroll`/`useTransform` are called unconditionally — only the *value* is gated, so rules-of-hooks hold.)

- [x] **Step 3: Pass `y` to every `MockupLayer`**

Add `y={mockupY}` to each `<MockupLayer .../>` usage — both in the `isDual` branch (two layers: desktop + mobile) and the default branch (one layer). Example (dual):
```tsx
              <MockupLayer src={project.mockups.desktopBento} alt={desktopAlt} y={mockupY} />
              <MockupLayer src={project.mockups.mobile} alt={mobileAlt} className="bento-mockup--mobile" y={mockupY} />
```

- [x] **Step 4: Make `MockupLayer` a `motion.span` that applies `y`**

Replace the `MockupLayerProps` interface and the `MockupLayer` function:
```tsx
interface MockupLayerProps {
  src: string
  alt: string
  className?: string
  y?: MotionValue<string>
}

function MockupLayer({ src, alt, className, y }: MockupLayerProps) {
  return (
    <motion.span className={`bento-mockup ${className ?? ''}`} style={{ y }}>
      <img
        className="bento-mockup-img bento-mockup-img--tonal"
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        width="1200"
        height="737"
      />
      <img
        className="bento-mockup-img bento-mockup-img--color"
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        width="1200"
        height="737"
      />
    </motion.span>
  )
}
```

- [x] **Step 5: Typecheck + build**

Run: `npm run build`
Expected: clean. (`y` is `MotionValue<string> | undefined`; `motion.span` `style.y` accepts it.)

- [x] **Step 6: Visual verify + tune the range**

Run: `npm run build && npx vite preview` (4173). Scroll the bento through the viewport: each mockup should drift gently — clearly present but not distracting, and it must **not** overlap the card's title/case-study row at the extremes. If it collides or feels too strong, reduce the range (`['-4%','4%']` / `['-3%','3%']`) and rebuild. Confirm cursor-tilt on hover still works simultaneously (parallax and tilt compose). Emulate reduced motion: mockup is static (no drift). Capture desktop + mobile screenshots to `tmp/`.
Expected: subtle drift, no title collision, tilt unaffected, static under reduced motion.

- [x] **Step 7: Commit**

```bash
git add src/components/sections/Projects.tsx
git commit -m "feat(projects): subtle scroll parallax on bento mockups

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Full verification + tick spec TODOs

**Outcome:** Every spec acceptance criterion is verified with evidence; spec TODO boxes ticked. No code changes unless a check fails (then fix → re-verify in the relevant task).

**Files:** none expected (verification only). Tick boxes in `docs/superpowers/specs/2026-06-09-featured-work-bento-revert-design.md`.

- [x] **Step 1: Static gates** — lint 0 errors (7 pre-existing warnings, none in `Projects.tsx`); build clean; vitest 73/73; e2e 20 pass / 14 pre-existing env failures (the changed `#projects` tests pass).

Run: `npm run lint && npm run build && npm run test:unit && npm run test:e2e`
Expected: lint clean, build clean, vitest green, Playwright green.

- [x] **Step 2: Orphan sweep** — `CLEAN_CSS`, `CLEAN_I18N`, `.project-cursor` count = 6.

Run: `grep -nE '\.project-(section|grid|aside|list|row)' src/index.css || echo CLEAN_CSS` and `grep -n '"intro"' src/i18n/locales/*.json || echo CLEAN_I18N`
Expected: `CLEAN_CSS`, `CLEAN_I18N`. Also confirm `.project-cursor` IS retained: `grep -c '\.project-cursor' src/index.css` ≥ 3.

- [x] **Step 3: Visual evidence — desktop + mobile** — `tmp/bento-desktop.png`, `tmp/bento-hover-pill.png`, `tmp/bento-parallax-top.png`, `tmp/bento-mobile.png`.

Run: `npm run build && npx vite preview` (4173). Capture desktop (1440w) and mobile (390w) screenshots of `#projects` to `tmp/`. Confirm: bento grid with the `lg`/`md`/`sm` cards; hover shows tilt + color mockup + pill; scroll shows parallax drift; mobile reflows and the pill is absent.

- [x] **Step 4: Reduced-motion evidence** — `tmp/bento-reduced.png` (static, color mockups, no pill/parallax/tilt).

Emulate `prefers-reduced-motion: reduce`; reload. Confirm: bento renders complete and static (color mockups visible), no pill, no parallax, no tilt. Screenshot to `tmp/`.

- [x] **Step 5: Tick spec TODOs**

Edit `docs/superpowers/specs/2026-06-09-featured-work-bento-revert-design.md` — change each `- [ ]` under `## TODO` to `- [x]` for every criterion now verified by Steps 1–4 (cross-reference each criterion to its evidence). Commit the spec update:
```bash
git add docs/superpowers/specs/2026-06-09-featured-work-bento-revert-design.md
git commit -m "docs(projects): tick bento-revert spec TODOs (verified)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** revert base → Task 1; pill → Task 2; parallax → Task 3; reduced-motion/coarse-pointer guards → Tasks 1–3 (CSS) + JS gates; i18n cleanup + e2e fix → Task 1; full verification + screenshots → Task 4. All spec TODOs map to a step.
- **Placeholder scan:** none — every code step shows complete code; the only deletion-by-description (the long `intro` string, the square CSS block) is a *removal* anchored on exact selectors/keys, not an unfilled blank.
- **Type/name consistency:** `mockupY: MotionValue<string> | undefined` flows `BentoCard` → `MockupLayer` prop `y?: MotionValue<string>` → `motion.span style={{ y }}`; `onHoverEnter`/`onHoverLeave` named identically in props, destructure, and call sites; `setHovering` ↔ `hovering` consistent; imports accumulate correctly across Tasks 2→3.
- **Reconciliation note:** Task 3 documents why it diverges from the spec's "over-scale headroom" phrasing (contain-fit → small range instead) — intentional, not a contradiction.
