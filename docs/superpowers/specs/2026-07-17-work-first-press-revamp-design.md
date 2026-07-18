# Work-First Press Revamp — Design Spec

**Date:** 2026-07-17
**Status:** Approved storyboard (v3.1), spec pending user review
**Branch:** `design/work-first-press-revamp`
**Storyboard record:** `.superpowers/brainstorm/37825-1784301454/content/storyboard-v3.html` (plus `direction.html`, `ink-motif.html`, `voice.html`, `storyboard.html`, `storyboard-v2.html` for the decision trail)

## Why

The current site is polished but assembled entirely from the 2025 "tasteful dev portfolio" kit: uniform heading formula, wireframe icosahedron, no human presence, uniform fade-up motion. It reads AI-generated. Two rounds of adversarial review (2x2 fresh-context reviewers) converged on the fix: specificity beats styling. Show the work working; unify the craft into a few owned primitives; delete every library-demo trope.

## Decisions log (user-ratified, do not relitigate)

1. Scope: full art-direction overhaul.
2. Attitude: ink & draft, evolved through adversarial review into **work-first, press in exactly three moments**.
3. Motion: scroll narrative with the arc **rough ideas → shipped products**, but **zero pins site-wide** and native scroll everywhere (Lenis smoothing).
4. Voice: **lowercase everywhere** (locked user decision). Headings vary grammar; the `word + blue italic word + period` formula is retired. The name is set solid, stroke-free, period-free.
5. The broadsheet shell is dead: no masthead, datelines, colophon, folio furniture, edition-number gags, fake press credits.
6. Press metaphor survives ONLY as three moments (see Primitives).
7. Featured work is the centerpiece: playable artifacts, per-artifact art direction, no screenshot-scrubbing.
8. Hero ink-draw name entrance is inviolable and unchanged. Icosahedron (HeroAccent3D/Silhouette) is deleted.
9. Human layer: rosette-halftone portrait + first-person specifics + one scanned-handwriting margin note. Photo art direction (high contrast, strong key light) is a content deliverable.
10. Every metaphor label must read natively in BOTH en and pt-BR before shipping. No spaced em-dashes in reader-facing prose (separators use `·` or restructure).
11. "a team of one" tagline retired; copy states specifics ("249 pieces, read by millions in southern brazil"). Canonical title "senior front-end engineer · react/typescript" leads the hero, role cycle kept beneath via clean crossfade (no variable-weight morph).
12. Footer does a job only: copyright, location, language toggle. No colophon, no outlined-name marquee, no open-to-work status (dropped positioning).

## The three primitives (build once, reuse everywhere)

1. **Ink brush** — canvas-2D velocity-width stroke with dry/fade behavior. Uses: visual language of the hero entrance (existing SVG entrance untouched), scene-2 timeline draw, link hover underlines, scene-5 visitor galley.
2. **Halftone shader** — WebGL rosette duotone (per-ink screen angles, authentic rosette). Uses: scene-1 portrait develop (dot frequency coarse→fine scrubbed by scroll) and the SINGLE goes-to-press wipe (scene 2→3) with CMYK misregistration converging to lock at full ink. One GL context total, mounted only near its scroll ranges. Mobile fallback: pre-baked duotone image + rough-edged SVG mask wipe. Reduced-motion: crossfade.
3. **Scroll state** — one Lenis-driven progress/velocity MotionValue feeding all scrubbed effects. No per-component scroll listeners.

## Scenes (single home page, replaces current section flow)

### Scene 0 · hero
Warm paper stock (`#F7F5F1`-family neutrals replace cool cream; blue scale + ink kept) with subtle grain lit by pointer (normal-map light layer, mounts only after `entranceDone`, same deferral pattern as the old R3F accent). Ink-draw entrance unchanged. Surname solid blue. Canonical title static + legible; role cycle crossfades. CTAs: collaborate → / resume ↓. Idle: grain drift only, no pulses. Plain mono "scroll ↓".

### Scene 1 · the byline
Asymmetric composition: rosette-duotone portrait develops on scroll, real caption ("kevin, porto alegre"), first-person specifics paragraph, ONE scanned-handwriting margin note. Bilingual copy authored, not translated word-for-word.

### Scene 2 · seven years of drafts (replaces WorkExperience accordion + Skills section)
Timeline drawn by the ink brush, width following scroll velocity; nodes ignite as the line reaches them; per-era tool marginalia accrete (content still derives from the CV's canonical skill groups); award in a plain hairline box with its actual name ("rbs journalism, sports & entertainment award"). No nib mascot, no baked wobble, no stars, no leader-line infographics. Job detail (bullets) available on tap/expand per node.

### Transition · goes to press (the ONE wipe)
Halftone dots grow from the last timeline node until the viewport is solid ink; CMYK channels visibly mis-registered, converging to lock exactly at full coverage; DOM swaps beneath at full ink (View Transitions where supported). No inverse wipe anywhere; the dark world ends at a hard edge before scene 4.

### Scene 3 · published & live (THE centerpiece, replaces Projects bento)
Light-on-ink world. Four art-directed, free-scrolling beats, each in its native shape, each with an explicit "this is real, touch it" affordance cue:
- **enquetes gzh** — tight playable demo ballot: own counter (isolated demo lane), seeded with the real historical totals (760,412 votes stated flat); the filling poll bar is the only number animation on the site.
- **painel da reconstrução** — full-bleed pannable slice of the real public dashboard (embed with pointer gating; static image fallback).
- **radar legislativo** — wide data-strip playing a recorded feed sample (product is pre-launch); upgrade to live feed post-launch.
- **política essencial** — type-specimen card treatment of the landing page.
Artifacts lazy-mount on approach. Annotations stay locked to their artifacts (no parallax decoupling). Numbers stated flat and full. Case-study links preserved to `/projects/:slug`.

### Scene 4 · the archive (fast, precise, massive)
Instant search, FLIP filter re-flow capped <250ms, virtualized rows + `content-visibility`, featured-row dash placeholders fixed. New: **histogram spine** — pieces-per-month sparkline in the margin doubling as a drag-scrubber across 2019→2026. At most container-level velocity drag, zero at rest. No stat band anywhere; stats live inside artifacts (scene 3) and the archive masthead line ("everything, searchable · 249 pieces").

### Scene 5 · contact
"let's build the next one". Send-mail visually dominant; links get ink-brush underline on hover (no magnetic hover). Visitor pen galley demoted to a side element that never competes with links; strokes dry and fade; rAF only while drawing. Footer: © · location · en/pt toggle.

## Scope

- Home page scenes, design tokens (warm paper neutrals), nav (anchors renamed to new scenes, EN/PT), i18n strings for all new copy, deletion of retired components (HeroAccent3D, HeroAccentSilhouette, Stats section, Skills section, FooterNameMarquee, bento Projects presentation).
- Project detail pages: light re-skin to the paper world (tokens + type only), no new choreography. Out of scope for heavy redesign.
- Content deliverables (owner): portrait photo (high contrast, strong key), one scanned handwriting note, PT+EN copy review.
- This spec is an umbrella for multiple implementation plans (expect: 1. tokens+hero+byline, 2. timeline+wipe, 3. scene-3 artifacts, 4. archive+contact). Each plan gets its own review cycle per workflow rules.

## Performance & accessibility guardrails (hard requirements)

- Zero pins site-wide; native scroll; exactly one shader wipe total.
- One WebGL context, scroll-range gated; shader octaves/DPR capped for low-end.
- Mobile and reduced-motion tell the same story statically (pre-baked duotone, instant timeline, stacked beats, no wipe → rough-edge mask or crossfade).
- Hero LCP unchanged (entrance already optimized; grain layer deferred behind `entranceDone`).
- Lighthouse audited against `npx vite preview` (port 4173), not dev server. Budget (recalibrated 2026-07-18 after Plan 1, owner decision): performance ≥ 85 (mobile preset) + LCP unchanged (≤ 2.6s) + accessibility 100. The original perf ≥ 90 was baseline-unachievable (pre-revamp baseline 87; Speed Index is bounded by the inviolable hero entrance). Plans 2-4 inherit this budget.
- Branch strategy (owner decision 2026-07-18): Plans 2-4 keep stacking on `design/work-first-press-revamp`; merge to `main` only when the below-hero sections are no longer transitional.
- Real-browser mount smoke (headless Playwright: page loads, root renders, zero console errors) for any plan task touching the app shell.
- Bilingual EN + PT for every string including annotations and affordance cues.

## TODO

- [x] Design tokens: warm paper neutral set replaces cool cream/sand/mist; blue scale + ink kept; all components read from tokens
- [x] Scene 0: entrance untouched, solid surname, static canonical title + crossfade role cycle, pointer-lit grain layer deferred behind entranceDone, R3F accent components deleted
- [ ] Ink brush primitive built once (velocity-width + dry/fade) and reused for timeline, hover underlines, visitor galley
- [ ] Halftone shader primitive built once (rosette duotone, screen angles) and reused for portrait develop + single goes-to-press wipe with CMYK register-lock; mobile + reduced-motion fallbacks in place
- [x] Scene 1 byline: portrait develop, real caption, one scanned-handwriting note, asymmetric layout, bilingual copy
- [ ] Scene 2 timeline replaces WorkExperience + Skills; nodes ignite on draw arrival; per-era tools from CV canon; award hairline box; job detail expandable
- [ ] Goes-to-press wipe fires once between scenes 2 and 3, origin-anchored to the last timeline node; dark world ends at a hard edge (no inverse wipe)
- [ ] Scene 3: four art-directed playable beats (demo ballot with seeded real totals, pannable painel embed with fallback, radar recorded strip, política specimen), lazy-mounted, affordance cues, case-study links intact
- [ ] Scene 4 archive: histogram spine drag-scrubber, FLIP filters <250ms, virtualized rows, dash placeholders fixed, no stat band
- [ ] Scene 5 contact: mail-dominant CTA, ink hover underlines, demoted pen galley, minimal footer (©/location/lang), marquee + colophon absent
- [ ] Retired elements verifiably absent: heading formula, icosahedron, magnetic hover, odometers, row skew, ghost numerals, stat band, "a team of one", broadsheet furniture
- [x] i18n: all new strings authored EN + PT-BR natively; zero spaced em-dashes in reader-facing prose
- [ ] Zero pins site-wide; reduced-motion + mobile stories verified per scene
- [ ] Lighthouse on `npx vite preview` within budget; LCP unchanged; Playwright mount smoke green
