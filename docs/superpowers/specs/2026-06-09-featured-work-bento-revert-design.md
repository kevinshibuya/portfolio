# Featured Work — revert to bento cards (+ 2 salvaged interactions)

- **Date:** 2026-06-09
- **Branch:** `feat/projects-bento-revert`
- **Supersedes the live layout from:** `2026-05-20-featured-work-revamp-design.md` (square-card layout)

## Context

`Projects.tsx` was changed from a bento grid to a square-card + dynamic-aside layout in
`6ab9583` ("square card layout + parallax — replaces bento") and iterated across `bc2cbc1`,
`db2a530`, `0bd1653`. We are reverting to the bento grid — still the design documented in
`CLAUDE.md` ("Featured work cards (bento v04)") — while salvaging two interactions the user
liked from the square era: the velocity "view project" cursor pill and scroll parallax on the
card mockups.

Verified facts that shape the approach (checked at HEAD vs `6ab9583^`):

- **Data model is byte-identical** since the bento era (`src/data/projects.ts`,
  `src/types/content.ts` diff is empty) → the bento `Projects.tsx` runs as-is against current
  data (`size`, `dark`, `gradient`, `tagline`, `mockups.desktopBento`, `mockups.mobile`,
  `highlight`, `highlightOrder` all present).
- **Bento CSS is still present** in `index.css`, content-identical to the bento era (40
  `.bento` rules both sides) → only the square `.project-*` CSS needs removing, no bento CSS
  to restore.
- **All i18n keys the bento needs already exist** (`index/label/title/description/caseStudy`);
  `viewProject` is also present (the pill uses it). `intro` is square-only dead weight.
- **`useCursorTilt` applies its tilt via the CSS variable `--cursor-tilt`** on
  `.bento-mockup-wrap` (not a direct `transform`) and binds its `mousemove`/`mouseleave`
  listeners **internally** in `useEffect` → both grafts compose cleanly: parallax lives on a
  different node, and React hover handlers can be added to the card without disturbing the
  tilt.
- **The bento component's deps all exist at HEAD**: `MotionContext`, `useCursorTilt`,
  `SectionHeading`, and `VARIANTS.cardReveal` / `STAGGER_PRESETS.projectCards` /
  `staggerContainer` / `REDUCED_MOTION_VARIANT`.

## Goal

Restore the bento featured-work grid and graft on (a) the velocity "view project" cursor pill
and (b) scroll parallax on card mockups — both reduced-motion- and coarse-pointer-safe.

## Approach

1. **Revert base.** Restore `src/components/sections/Projects.tsx` from `6ab9583^`
   (bento grid: `SectionHeading` + 4 cards `lg`/`md`/`sm`, `useCursorTilt`, dual `MockupLayer`,
   staggered `cardReveal`). Delete the square layout CSS; keep the already-present bento CSS.
2. **Graft pill.** Add section-level `onMouseMove`, a `hovering` state, the `project-cursor`
   motion.div (its CSS is self-contained — `position: fixed`, `z-index: 60`,
   `pointer-events: none` — already in `index.css`; keep it), and per-card
   `onMouseEnter`/`onMouseLeave` to toggle `hovering`. Pill rotation is velocity-driven
   (`useVelocity` → `useTransform`). Disabled under `prefersReducedMotion`; hidden under coarse
   pointer (existing media queries).
3. **Graft parallax.** Per-card `useScroll({ target, offset: ['start end','end start'] })` →
   `useTransform(scrollYProgress, [0,1], [...])` y, applied to the **inner `.bento-mockup`
   span** (promoted to `motion.span`), never the tilt-driven `.bento-mockup-wrap`. Give the
   mockup a small baseline over-scale for headroom so the Y-drift never reveals the card
   background; keep the range modest (~±6–8%), tuned visually. Disabled under
   `prefersReducedMotion`.
4. **Cleanup.** Remove dead `sections.projects.intro` (EN + PT). Update the two e2e specs so
   `#projects` uses the bento `.section-title` selector (same as the other sections), dropping
   the `.project-aside__title*` special case.

## File change set

| File | Change |
|---|---|
| `src/components/sections/Projects.tsx` | Restore bento; graft pill + parallax; reduced-motion / coarse-pointer guards |
| `src/index.css` | Delete square layout CSS (`.project-section`/`.project-grid`/`.project-aside*`/`.project-list`/`.project-row*`); **keep** `.project-cursor*`; add parallax headroom to `.bento-mockup` |
| `src/i18n/locales/en.json` + `pt.json` | Remove dead `sections.projects.intro`; keep `viewProject` |
| `tests/e2e/section-enters.spec.ts` + `reduced-motion.spec.ts` | Drop the `#projects` special case; bento title is `.section-title` |

## TODO (acceptance criteria — source of truth)

- [ ] `#projects` renders the bento grid (4 cards incl. one `lg` 2×2 and the `md`/`sm` mix) — not the aside + rows layout
- [ ] Cards show the 3D cursor-tilt + dual tonal/color mockup on hover (desktop, motion on)
- [ ] Velocity "view project" pill follows the cursor, rotates with velocity, and fades in only while hovering a card
- [ ] Each card's mockup parallax-drifts on scroll with no card-background reveal at the edges
- [ ] Reduced-motion: no tilt, no pill, no parallax; bento renders static and complete
- [ ] Coarse-pointer (mobile): pill hidden; grid reflows responsively
- [ ] Square layout CSS removed (`.project-section`/`.project-grid`/`.project-aside*`/`.project-list`/`.project-row*`); `.project-cursor*` retained; `grep` finds no orphan square rules
- [ ] `sections.projects.intro` removed from en.json + pt.json; `viewProject` retained; both JSON files still valid
- [ ] `tests/e2e/section-enters.spec.ts` + `reduced-motion.spec.ts` pass using `.section-title` for `#projects`
- [ ] `npm run build` + `tsc -b` clean; `vitest run` green; Playwright e2e green
- [ ] Desktop + mobile preview screenshots (`npx vite preview` :4173) confirm the above

## Decisions made (do not re-litigate)

- Pure revert + salvage exactly two interactions (pill + parallax). The dynamic aside is
  **excluded** — it requires the 2-column square structure, the opposite of a bento grid.
- Keep `.project-cursor*` class names (no rename to `.bento-cursor`) to minimize churn.
- Remove the dead `intro` i18n key.

## Out of scope

- The 3D About work (`feat/about-cinematic-rework`) — untouched.
- Any project content / data-model changes.
- A Lighthouse perf pass — the revert is net-neutral-or-positive; run only if a regression
  appears.
