# Designer-Grade WebGL Pivot — Design Spec

**Date:** 2026-07-19
**Status:** Design approved in brainstorm, spec pending user review
**Branch:** `design/webgl-pivot` (off `main` @ `62cd73c`)
**Decision trail:** `.superpowers/brainstorm/11049-1784437327/content/` (site-mood, hero-layout-v2, hero-entrance, section-language)
**Supersedes:** the editorial/press-revamp direction (`design/work-first-press-revamp`, parked unmerged; owner rated it 4/10)

## Why

The editorial/newsroom direction is abandoned. The new target is a modern, designer-grade
("awwwards-grade") portfolio built around advanced WebGL shader craft, sourced from the
component-vault pipeline (`~/keki/dev/personal_projects/component-vault`). The work leads;
biography follows. Done = Kevin rates the shipped page designer-grade.

## Decisions log (user-ratified, do not relitigate)

1. **Scope:** full section-system redesign, not hero-first iteration.
2. **Base mood:** dark ink sitewide. Page background `#0B0E14`, tonal alt `#131722`, text cream
   `#F5F2EC`. The only color comes from the shader tricolor: pink-red `#E64D66`, blue `#4D80E6`,
   yellow `#E6CC4D`.
3. **Hero shader:** derived from vault `fluid-swirl` — same fragment-shader paint effect and same
   tricolor, but the swirl/polar rotation is removed and replaced with random scattered wave-like
   natural fluid motion. No mouse/touch interaction (pointer handlers stripped).
4. **Hero composition:** monumental bottom-anchored. Full-viewport shader; lowercase name lands
   huge at bottom-left like a signature on the painting; role line above the name keeps the cycle
   leading with "senior front-end engineer · react/typescript"; meta (location, availability)
   top-right.
5. **Entrance (replaces the retired ink-draw):** paint blooms from black (fade + slight settle),
   then role line and name lines rise with a small stagger — each rise inside its own
   overflow-clipped mask so nothing visibly overflows. ~1.6s total. Reduced motion: static fade.
6. **Section flow (work-first):** Hero → Featured projects → Archive → Work experience → Stats →
   Skills → Contact/Footer. Baseline correction (verified in `src/pages/Home.tsx` on main): this
   order already exists — main includes press-revamp Plan 1 (Archive replaced EmbedsGallery, a
   Stats receipt section exists, there is NO About section, MarqueeDivider is already deleted).
   The reorder is therefore a no-op; the work is the dark restyle. No About section is added.
7. **Section language:** open typographic rows — no cards/containers. Numbered oversized title
   rows with hairline dividers (cream at ~12–14% alpha). Hover floats the preview image beside the
   pointer and tints the title with a shader color. Projects, embeds, and work experience all use
   this one row primitive.
8. **lining-waves placement:** the vault's three.js lining-waves shader runs subtle behind the
   Contact + Footer block — canvas #2 of the max-2 budget, lazy-loaded on scroll approach. WebGL
   bookends: the page ends the way it opens.
9. **Typography:** Plus Jakarta Sans solo (local variable 200–800), unchanged.
10. **Branch:** new branch `design/webgl-pivot` off main; press-revamp branch stays parked for
    cherry-picking (perf/a11y commits) if useful.
11. **Furniture:** MarqueeDivider already absent on baseline (verify only, no work). Nav survives
    restyled for dark (brand mark left, links center, EN/PT right — matching baseline Header.tsx).
12. **Still in force:** canonical title everywhere; CV repo (`~/keki/cv-rebuild`) is the source of
    truth for personal facts; no spaced em-dashes in reader-facing prose (use `·`); bilingual
    EN/PT authored, not word-for-word translated; embeds CSV pipeline unchanged.

## Components

### FluidWavesHero (canvas #1)
Adapted from `component-vault/src/registry/fluid-swirl/fluid-swirl-shader.tsx` (raw WebGL, no
deps). Modifications:
- Remove polar/spin path: drop `new_pixel_angle` rotation and `spin_*` uniforms; keep the
  5-iteration UV distortion loop (that loop IS the paint look).
- Drive motion with time-based pseudo-random offsets (hash/noise seeded per load) so waves
  scatter organically across the viewport instead of orbiting a center.
- Strip mouse/touch listeners and the `mouse` uniform entirely.
- Perf hardening: `devicePixelRatio` capped at 1.5; `IntersectionObserver` pauses the rAF loop
  off-screen; `prefers-reduced-motion` renders one static frame (time frozen) and stops the loop.
- No-WebGL fallback: static layered radial-gradient background (same tricolor) so the hero never
  renders black-on-black.

### WorkRow primitive
One component for all list sections. Anatomy: index number · oversized lowercase title ·
meta (tech/type/editorial) · arrow. Behaviors:
- Desktop hover: floating preview image tracks the pointer (Framer Motion), title tints with a
  shader color (rotating through the tricolor by index), arrow brightens.
- Touch/small screens: no float — a static inline thumbnail slot instead.
- Expandable variant (work experience): row opens to role/dates/bullets (Framer Motion
  height/opacity, `AnimatePresence`).
- Keyboard: rows are links/buttons with a visible cream focus ring; expandable rows are
  `aria-expanded` buttons.

### LiningWavesBackdrop (canvas #2)
Vault `lining-waves` (three.js) behind Contact + Footer. `React.lazy` + dynamic import on scroll
approach; same reduced-motion + off-screen-pause rules as the hero. three.js is already a
dependency (R3F stack), so no new package.

### Entrance orchestration
GSAP timeline (one-shot orchestration is GSAP's lane; hover/expand states stay Framer Motion):
shader canvas opacity/scale bloom → role rise → name line rises (staggered ~120ms)
— every text rise inside an `overflow:hidden` clip wrapper. The monumental name is the LCP
element; it must paint < 2.5s on `vite preview` (canvas is not an LCP candidate, so the name
carries LCP — do not delay it past budget).

## Sections

- **Hero:** as decided above. Old ink-draw components (`HeroNameDrawing` et al.) are deleted along
  with their tests; entrance-related test mocks (`entranceDone` pollution guard) get retired or
  rewired to the new entrance.
- **Featured projects:** WorkRow list of featured projects (from `src/data`), hover preview =
  cover image; row links to `/projects/:slug` case study (routes unchanged).
- **Archive (the embeds gallery):** WorkRow list fed by the existing archive data pipeline
  (`src/data/archive` over the embeds CSV); kind/type/editorial/year/sort filters survive,
  restyled as text/pill row in the dark language; missing previews fall back to a typed
  placeholder block.
- **Work experience:** expandable WorkRow variant; content from CV canon (6 skill groups, exact
  role titles).
- **Stats:** the receipt rows (count-up values + annotations) restyled onto dark tokens; count-up
  behavior and reduced-motion gating unchanged.
- **Skills:** compact numbered typographic columns, dark restyle, content unchanged.
- **Contact/Footer:** LiningWavesBackdrop behind cream display type + mail CTA; footer meta row
  (© · location · EN/PT).

## Non-goals

- No new content authoring beyond restyling (copy changes only where the dark language demands).
- No new routes; `/projects/:slug` case studies keep their current structure this pass.
- No scroll-pinned sequences; native scroll throughout.
- No third shader/canvas anywhere.

## Verification requirements (bind the plan)

- Contrast audit at plan time: every text/background pair including all three accents as title
  tints on `#0B0E14` (large-text AA minimum, normal-text AA for meta/body) — WCAG AA verified,
  not hoped.
- Lighthouse against `npm run build` + `npx vite preview` (never dev), with the MEASURED baseline
  recorded at plan-authoring time; any numeric target must be achievable from that baseline.
- Real-browser mount smoke for the shader components (page loads, root renders, zero console
  errors) in addition to typecheck/lint — static checks are blind to runtime WebGL failures.
- Reduced-motion e2e: entrance falls back to fade, shaders render static frame, zero rAF loops.
- e2e baseline: run the full existing suite before Task 1; stale specs (they assert the old
  hero/sections) are fixed in one batch, not serially mid-execution.

## TODO

- [ ] Design tokens: dark ink system (`#0B0E14` base, `#131722` tonal, cream text, tricolor accents) replaces the light cream/sand theme; all components read from tokens
- [ ] FluidWavesHero shader: fluid-swirl adaptation (no swirl, random scattered waves, no mouse) with DPR cap, off-screen pause, reduced-motion static frame, no-WebGL gradient fallback
- [ ] Hero composition: monumental bottom-anchored name + leading canonical title in role cycle + meta top-right; ink-draw components deleted
- [ ] Entrance: paint bloom → clipped staggered rises; LCP < 2.5s on preview; reduced-motion fade
- [ ] WorkRow primitive built once (hover float + tint, touch thumbnail, expandable variant, focus states) and reused by projects, embeds, work experience
- [ ] Work-first section order verified intact (baseline already work-first; no reorder work) with all content surviving the restyle
- [ ] Archive: rows + restyled filters, data pipeline and placeholder fallback intact
- [ ] Stats + Skills restyled onto dark tokens
- [ ] Contact/Footer with lazy LiningWavesBackdrop (canvas #2), reduced-motion + pause rules applied
- [ ] Nav restyled dark (MarqueeDivider absence verified — no work expected)
- [ ] Bilingual EN/PT copy complete for every changed string
- [ ] Contrast audit passes AA across all pairs; Lighthouse run against preview with measured baseline recorded in the plan
- [ ] Full e2e suite green, including new mount smoke + reduced-motion specs; stale specs fixed as a pre-Task-1 batch
- [ ] CLAUDE.md Design Direction section rewritten to describe the shipped dark/WebGL system
