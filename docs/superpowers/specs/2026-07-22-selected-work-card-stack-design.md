# Selected work: scroll-scrubbed card stack + gooey title — design spec

**Date:** 2026-07-22
**Branch:** `feat/selected-work-stack` (off `staging`; merges back into `staging`, never `main`)
**Replaces:** the WorkRow-based "selected work" list in `src/components/sections/Projects.tsx`
(Archive/WorkExperience keep WorkRow — this section is the sanctioned exception).

## Intent

"Selected work" is currently structurally identical to Archive. Rebuild it as the page's
flashy centerpiece: a **pinned, scroll-scrubbed stage** where the top-4 featured projects
cycle through an **animated card stack** while a **gooey-morphing title** above it names the
front project. Scroll position IS the playhead — fully reversible, holds mid-morph.

Primitives adapted from `../component-vault` (`animate-card`, `gooey-text-morphing`); the
vault stays untouched as reference. Both are rewritten progress-driven — the vault versions
are time-driven (AnimatePresence springs / rAF clock) and are NOT copied verbatim.

Emotional target: confident, controlled power — **Premium** personality (0% overshoot,
house easing families, spatial timing).

## Decisions (brainstorm, Kevin 2026-07-22)

- **Mechanic:** pinned scrub (A) — not in-flow threshold steps.
- **Count:** top 4 by `highlightOrder` (política essencial, radar legislativo, enquetes gzh,
  painel da reconstrução) — same curation as today.
- **Composition:** centered monument (A) — gooey title centered above, meta line under it,
  stack below. `SectionHeading` stays above the stage for cross-section consistency.
- **Mobile:** same scrub, scaled — no separate fallback layout.

## Stage anatomy

- Wrapper: `height: 400svh` (N=4 → 3 transitions; scrub distance 300svh, one viewport-height
  per transition). Inner stage: `position: sticky; top: 0; height: 100svh; overflow: hidden`.
- Stage content (top→bottom, centered column):
  - `GooeyTitle` — front project title, `clamp(30px, 5vw, 64px)`, weight 700,
    letter-spacing −0.03em, lowercase, cream.
  - Meta line — `01 / 04 · <year> · <top-2 tech, lowercased>`, `--text-faded`, 12–13px.
    The index numeral takes the per-project `--row-tint` via `accentFor(index)`.
  - `ProjectCardStack` — 3 visible depth slots; card width `min(46vw, 620px)` desktop /
    `88vw` mobile, aspect ≈ 16/9.5, radius 14px, hairline border, art from
    `project.mockups.desktopBento` (explicit width/height attrs; first card eager, rest lazy).
  - Front card bottom bar: `view project ↗` (localized EN/PT) on an ink gradient
    ≥ 0.88 alpha at text level — hero-scrim rule: no text on raw artwork.
- Front card links to `/projects/:slug`. Tricolor: `accentFor(index)` → `--row-tint` on the
  stage (index numeral, view-project hover state). Never a static per-component color.

## Scroll mapping (all pure functions, unit-tested)

- Framer Motion only (GSAP stays one-shot-entrance-only): `useScroll({ target: wrapper,
  offset: ['start start', 'end end'] })` → `scrollYProgress` → `seg = progress × 3`.
- **Settle plateaus:** within each segment, the transition occupies the middle 70%:
  `frac' = smoothstep(clamp((frac − 0.15) / 0.70, 0, 1))` — settled dwells at every project
  and at both pin edges, so entering/leaving the section never lands mid-morph.
- Every visual is a deterministic function of `seg` via `useTransform` MotionValues at leaf
  components — **zero React state per frame** (re-render-kills-entrance lesson). Entrance
  variants (whileInView, once) live on container elements; scrub transforms live on leaves —
  never both on one element.
- Helpers in `src/utils/stackMotion.ts`: `segmentFor(progress, n)`, `depthTransform(depth,
  frac)`, `morphValues(frac)` — explicit return types, TDD.

## Motion spec (scrub-land: timing is spatial, easing = curve remap of frac')

| Layer | What moves | Range | Curve |
|---|---|---|---|
| Primary | Front card exits downward | y 12 → 340px, opacity 1 → .85 | accelerate (ease-in family — commits and leaves) |
| Secondary | Cards behind promote one depth slot | y −44/−16 → −16/12, scale .9/.95 → .95/1; slot-3 card fades in | decelerate (ease-out — lands settled) |
| Secondary | Shadow/occlusion tracks depth | shadow strength per slot | linear with slot interpolation |
| Ambient | Gooey title morph + meta crossfade | blur `min(8/f − 8, 100)px`, opacity `f^0.4` (incoming; outgoing mirrored), threshold `feColorMatrix` alpha `255 −140` | peaks mid-window, synced to the same 0.15–0.85 window |

Depth grammar (from the vault, preserved): slot y-offsets `12 / −16 / −44`, scales
`1 / .95 / .9`, exit `y → 340`.

Hover (front card only, fine-pointer): scale ≤ 1.02 + arrow nudge, < 100ms response, via
MotionValues (no setState). Reduced motion: no hover motion.

## Accessibility & reduced motion

- Buried/exited cards: `aria-hidden="true"` + `tabIndex={-1}` + `pointer-events: none`;
  only the front card is interactive.
- **Keyboard/SR path:** skip-link-pattern project index — 4 visually-hidden-until-focused
  links (one per project) rendered before the stage; on `:focus-visible` they appear as a
  cream-on-ink pill with the standard focus ring. No scroll-jacking.
- `prefers-reduced-motion`: pin stays (scroll is user-driven) but ALL animation is removed —
  content swaps instantly at segment midpoints (house "instant panels" precedent), no card
  flight, no blur, and **no SVG filter at all** (plain text title — the threshold matrix can
  artifact static glyph edges).
- Gooey filter spans are `aria-hidden`; the accessible name lives on the front-card link.

## Contrast (no new tokens — no full re-audit needed)

- Title cream `#F5F2EC` on `--bg #0B0E14`, meta `--text-faded` on `--bg`: already-audited pairs.
- `view project` bar: cream on ≥ 0.88-alpha ink gradient over worst-case artwork — same
  contract as the hero scrim (audited pattern).
- Mid-morph the title blurs through intermediate states — transient, decorative-equivalent;
  settled states are the audited pairs.

## Risks

1. **WebKit + dynamic `filter: url(#…)`** on morphing text is historically glitchy.
   Degrade path (behind one flag in `GooeyTitle`): drop the threshold matrix, keep the
   blur/opacity crossfade. Safari visual check is an explicit acceptance criterion.
2. **Filter repaint cost during scrub** — scoped: filter only on the title container,
   `will-change: filter, opacity` on the two spans only. Lighthouse perf must not regress
   (baseline measured at plan time — never a target the baseline already misses).
3. **Sticky + svh on mobile URL-bar collapse** — `svh` units chosen deliberately; verify on
   a narrow viewport in e2e.
4. **e2e baseline shift** — serial baseline is 44 passed / 2 skipped, unit 66. The section
   rebuild will touch Projects specs; re-record the new baseline in one batch, not serially.

## CLAUDE.md amendment (ships in the same PR)

Design Direction updates: Projects/"selected work" = pinned scroll-scrubbed
`ProjectCardStack` + `GooeyTitle` (this spec); WorkRow stays the primitive for Archive/
WorkExperience; the no-card-frames rule gets "(exception: the selected-work stack cards)";
NO-list stays otherwise intact. Framer scroll-scrub is added as a sanctioned lane alongside
"Framer = state-driven" (GSAP remains entrance-only).

## Out of scope

- Archive, WorkExperience, Stats, Skills, Contact/Footer — untouched.
- Project detail routes — untouched (stack links into them).
- The component vault — reference only.
- Embeds gallery — separate backlog item.

## TODO (acceptance criteria)

- [ ] `src/utils/stackMotion.ts` pure helpers with explicit return types; unit tests cover
      segment boundaries, plateau clamps, morph formula caps (TDD — tests first).
- [ ] `GooeyTitle` (`src/components/ui/GooeyTitle.tsx`): progress-driven two-span morph,
      per-instance filter id, threshold-off degrade flag, RM = plain text no filter.
- [ ] `ProjectCardStack` (`src/components/ui/ProjectCardStack.tsx`): progress-driven depth
      grammar per the motion table; front-card link; buried cards inert; RM = instant swaps.
- [ ] `Projects.tsx` rebuilt: 400svh wrapper + sticky stage + SectionHeading + meta line +
      skip-link project index; WorkRow import gone from this section.
- [ ] Styles on canonical tokens; `--row-tint` via `accentFor(index)`; view-project bar
      meets the ≥ 0.88-alpha scrim rule.
- [ ] i18n: all new strings (meta labels, `view project`, skip-link labels) in EN + PT.
- [ ] Reduced-motion e2e: pin present, instant swaps, no filter, no card flight.
- [ ] Scrub e2e: scroll to segment midpoints ⇒ title/meta/front-card change; reversing
      scroll restores the previous project; front-card link navigates to the project page.
- [ ] Full verify: `tsc -b` clean, unit green (66 + new), serial Playwright green with
      re-recorded baseline, Lighthouse on `npx vite preview` ≥ measured pre-change baseline.
- [ ] Safari visual check of the gooey morph (degrade flag decision recorded).
- [ ] CLAUDE.md design-direction amendment committed with the feature.
