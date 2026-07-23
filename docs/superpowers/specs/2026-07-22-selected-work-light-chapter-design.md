# Selected work light chapter: cream mid-site + Anton title + Shadway cards — design spec

**Date:** 2026-07-22
**Branch:** work happens off `staging` (feature branches merge back into `staging`, never `main`).
**Replaces:** the dark-ink treatment of Projects→Skills, the SectionHeading block on Projects,
the MacBook-mockup card art, and the image-overlay `view project` bar.
**Keeps:** the entire scroll-scrub stack mechanic (single-channel `segCont`, pure helpers,
depth grammar, skip-links, RM behavior) — this is a re-skin + tonal-arc change, not a re-mechanic.

## Intent

The hero currently cuts from full-strength shader paint straight to dark ink, and "selected
work" opens with a body-font section header that no longer matches the stage's ambition.
Rebuild the page's tonal arc: the site becomes **a light sheet between two paint moments** —
the hero shader melts into a warm-cream mid-site chapter (Projects → Skills), which melts
back into the dark Contact/Footer shader stage. Inside the cream chapter, Selected Work loses
its section header entirely, sets its morphing title in a loud condensed display face
(Anton), and swaps the MacBook mockups for plain screenshots in white Shadway-style cards.

## Decisions (brainstorm, Kevin 2026-07-22)

- **Section background:** warm cream `#F5F2EC` (visual-companion pick A) — the palette
  inversion: ink text on cream.
- **Hero→cream transition:** static veil (pick B) — an always-there `transparent → cream`
  gradient band, with the hero section **stretched past 100svh** so the veil sits BELOW the
  name/role zone, never behind it (Kevin's explicit constraint).
- **Section title:** none (pick A) — a whisper eyebrow `01 · selected work` inside the
  pinned stage; the morphing project title IS the heading.
- **Display face:** Anton (pick A) — condensed poster sans, true lowercase, only weight 400.
- **Card anatomy:** Shadway-faithful (pick A) — white card, inset plain screenshot, body row
  = name + subtitle + ink `view ↗` pill; the stage meta line dissolves into the card body.
- **Cream scope:** through Skills (pick C + follow-up) — Projects, Archive, WorkExperience,
  Stats, Skills all flip light; dark returns exactly at the Contact/Footer shader stage.

## Page tonal arc

```
loader (ink) → hero 100svh (shader, unchanged) → veil band ~30svh (paint → cream)
→ Projects (cream, pinned stage) → Archive → WorkExperience → Stats → Skills (all cream)
→ exit veil (cream → ink) → Contact/Footer shader stage (dark, unchanged)
```

- **Entry veil:** the hero section grows to ~130svh — via an explicit DOM restructure, not a
  bare `min-height` change. `.hero-scrim` and `.hero-bottom` are both `absolute` anchored to
  the `.hero` box today, so naively growing the box would re-anchor the 0.88 scrim band and
  the name into the veil (breaking the MANDATORY AA rule and the "no text in veils" rule).
  Instead: a new **inner 100svh hero-zone element** owns the scrim + name/role (their CSS
  re-anchored to it, visually byte-identical; AA table re-verified against this inner box),
  while the canvas stays at the 130svh section level. Below the zone, a ~30svh band where the
  canvas keeps rendering under an always-there `linear-gradient(transparent → #F5F2EC)`
  overlay. The rAF/pause/RM machinery is untouched. No text ever sits inside either veil band
  (enforced rule).
- **Exit veil:** a `#F5F2EC → #0B0E14` gradient band between Skills and the Contact/Footer
  stage. Pure tone, no shader. The contact-stage contrast table assumes the dark base and
  stays valid untouched.
- **Plan-split safety:** Plan A (stage + entry veil) ships a **provisional exit veil
  directly below Projects** so the intermediate state never shows a hard cream/ink edge;
  Plan B (light chapter) relocates it below Skills. Every merge into `staging` is shippable.

## Selected Work stage (restyled, mechanics frozen)

- **Frozen invariants** (from the shipped stack — do not regress): single visual channel
  `segCont` via `segmentFor`/`settleFrac`; every per-frame visual a pure function of it;
  `frontIndex` state feeds ONLY non-visual attrs; all cards + title spans mounted, keyed by
  slug; skip-link index; buried cards `aria-hidden`/`tabIndex −1`/`pointer-events:none`;
  RM = pin + static slots + instant swaps + no SVG filter.
- **Eyebrow** (replaces SectionHeading): `01 · selected work`, small tracked-out label,
  faded-ink, index numeral in the on-light pink accent. i18n reuses the existing
  `sections.projects.index`/`.label` keys; the Projects `.title`/`.description` keys retire.
  The SectionHeading component itself stays — every other section keeps its header in both
  plans (Plan B recolors them, never removes them); only Projects drops the block.
- **Title:** GooeyTitle mechanics identical (blur crossfade + threshold filter, `spanMorph`,
  sr-only static title). New: Anton, ink `#0B0E14`, scale `clamp(56px, 9vw, 150px)`,
  line-height 0.95, centered; long titles ("painel da reconstrução") may wrap to 2 lines.
  Anton is used NOWHERE else; Jakarta stays the site voice.
  **Face/size re-tune required:** the threshold matrix (`255 −140`) and 100px blur cap were
  tuned for Jakarta 700 at ≤64px; Anton's denser condensed strokes at up to 150px merge more
  aggressively (blob risk), and titles wrap at different points, so a 1-line title morphing
  against a 2-line title is vertically offset within the shared grid cell. The plan must:
  (a) re-tune threshold/blur constants for Anton at the new scale, (b) define vertical
  alignment for mixed 1-/2-line morph pairs (e.g. center-align spans within the cell),
  (c) re-run the real-Safari visual check with the 2-line worst case (multi-line
  `filter:url()` on morphing text is the known WebKit risk).
- **Meta line:** deleted from the stage. The year + top-2 tech move into the card body
  subtitle; the per-project `01 / 04` index/total is **removed entirely** (the visible stack
  communicates position; the eyebrow's `01` is the section index, a different thing). The
  plateau-swap behavior (discrete change at settle-midpoint, driven by `frontIndex`) now
  applies to card-body aria/link only.
- **innerText-pollution guard (ratified lesson, do not regress):** the shipped design kept
  the meta a single node precisely because stacked hidden spans pollute `innerText`
  assertions. Every card stays mounted, so subtitle markup and the migrated plateau e2e
  assertion MUST be uniquely scopable to the front card — assert via
  `.stack-card-link .stack-card-subtitle` (the interactive card is the only `<Link>`),
  never via a bare class that matches all four mounted body rows.
- **Card (Shadway anatomy):** white `#FFFFFF` surface, radius ~16px, plain desktop
  screenshot inset with its own ~10px radius and ~10px frame gap (no laptop chrome), body
  row below: project name (Jakarta ~15-16px, weight 700, ink) + subtitle
  `<year> · <top-2 tech lowercased>` (faded ink) + ink pill `view ↗` (cream text, existing
  `sections.projects.stack.viewProject` key). The pill is part of the front card's `<Link>`
  face (one link per card, unchanged). Buried cards peek ABOVE the front card and are
  self-identifying (their body rows exist but sit hidden behind — the top image sliver is
  what peeks).
- **Geometry:** card is taller than the image-only 620×368; slot offsets (12/−16/−44),
  scale steps, and `EXIT_Y` are re-derived in the plan from the new measured card height
  using the same clearance rule that produced 440 (exiting card fully clears the promoted
  one; parked cards opacity 0). Shadows recalibrated for cream bg (softer, larger radius —
  dark shadows on light ground read heavier than on ink).
- **Tint:** the per-project accent rotation survives, but ONE `--row-tint` channel cannot
  serve both grounds — deep on-light values lose vibrancy on ink, raw values fail AA on
  cream. Two channels, both set from `accentFor(frontIndex)`: `--row-tint` (raw triplet,
  on-ink uses: pill internals/hover) and `--row-tint-deep` (deep triplet, on-light
  text-bearing uses: eyebrow numeral, subtitle accent). Exact element mapping fixed in
  the plan.

## Light chapter (Plan B): Archive, WorkExperience, Stats, Skills

- Same cream system: ink text on `#F5F2EC`; hairlines flip to `rgba(11,14,20,0.12)`; the
  tonal-alternation role (`--bg-tonal`) gets a light equivalent (deeper cream, target
  ≈ `#EDE9E0`, exact hex set by the contrast audit).
- WorkRow keeps anatomy + motion verbatim — colors invert only (title ink, meta faded-ink,
  hover tint from the on-light triplet, focus ring ink).
- Stats/Skills flip the same way; any accent-colored numeral/chip uses the on-light triplet.
- Nav: `.nav--on-light` variant (ink text/hairlines/brand, light `is-scrolled` background),
  toggled by IntersectionObserver watching the light sections. In Plan A the observer watches
  Projects only; Plan B extends the root margin to the whole chapter. EN/PT toggle and
  markup unchanged.
- Focus-visible rings and skip-link styles inside the light chapter invert to ink.
- **Global surfaces the flip touches** (owned by Plan A unless noted):
  - Scrollbar: the global thumb is cream-alpha (`rgba(245,242,236,0.18)`) — invisible over
    the cream chapter. Strategy: a neutral mid-gray thumb that reads on both grounds (one
    global value; per-section scrollbar styling isn't reliably possible).
  - `<meta name="theme-color">` is `#0B0E14` — mobile browser chrome stays dark over the
    cream chapter. Accepted for Plan A; Plan B may add a scroll-driven theme-color swap if
    it proves trivial, else the dark chrome is ratified as-is.
  - Background ownership: each cream section paints `--color-surface-light` itself (the
    `body`/html base stays ink so overscroll/rubber-band edges stay dark at both ends);
    no dark slivers may show between adjacent cream sections.

## Tokens & contrast (standing rule: audited, not hoped)

- **New canonical tokens** (do NOT extend the legacy-alias debt; `--text` is not reused as a
  background): `--color-surface-light` `#F5F2EC`, `--color-surface-light-tonal` (≈`#EDE9E0`,
  audit-final), `--color-ink-on-light` `#0B0E14`, muted/faded on-light steps (≈ 0.55 / 0.4
  ink alphas, audit-final), and an **on-light accent triplet** `--color-accent-pink-deep` /
  `-blue-deep` / `-yellow-deep`.
- The raw tricolor FAILS small-text AA on cream — pink `#E64D66` ≈ 3.3:1, blue `#4D80E6`
  ≈ 3.4:1, yellow `#E6CC4D` ≈ 1.4:1. Deep pink and deep blue darken to ≥ 4.5:1 while
  staying recognizably themselves. **Deep yellow cannot:** 4.5:1 against cream forces a
  luminance so low the hue reads dark-olive, not yellow — so yellow is EXEMPT from
  small-text use on light grounds (large-text ≥ 3.0:1 or decorative/`aria-hidden` uses
  only; where the rotation would put yellow on small text, the element uses the ink faded
  step instead). Exact hexes are computed in the plan's contrast table and ratified there.
- The muted/faded on-light steps must be computed against the **whitest surface they sit
  on** — the `#FFFFFF` card, not just cream: ink at 0.55 alpha on white is ≈ 4.3:1 (fails);
  the subtitle step lands around 0.62+ alpha. Audit sets finals.
- Audit deliverable: a full table covering ink-on-cream text steps, deep triplet on both
  creams AND on white-card internals (name, subtitle, pill cream-on-ink), nav-on-light, and
  focus rings — every always-visible pair ≥ 4.5:1 (≥ 3.0:1 large). Veil bands carry no text.

## Assets

- Per featured project, one plain desktop cover: cropped 16:9.5-ish webp generated from the
  existing `public/images/projects/<slug>/desktop/*.png` sources (top-of-page crop, the
  same shot the MacBook mockup showed). New data field `mockups.stackCover` (string path);
  `desktopBento` remains for anything else that uses it; detail pages keep MacBook mockups.
- Anton self-hosted like Jakarta: OFL, single 400 weight, subset to latin+latin-ext,
  served as woff2 at `/public/fonts/`, `@font-face` with `font-display: swap`, preloaded
  (it is the largest text on the first scroll destination). Lighthouse gate (≥ 89, floor
  from HANDOFF baselines at 94) must hold after adding it.

## Motion & accessibility

- Veils are static CSS gradients — nothing animates, nothing to reduce.
- Stack scrub/RM/keyboard behavior unchanged (frozen invariants above).
- GSAP stays entrance-only; no new scroll-scrub surfaces beyond the existing sanctioned one.
- The canvas grows ~30% in area (130svh coverage): DPR cap 1.5 and pause machinery stay.
  Headroom is thin (long-task measured 211–234ms under the 300ms ceiling; Lighthouse 94
  over the ≥ 89 floor) — per the standing budget rule, the plan records MEASURED baselines
  (Lighthouse + long-task, idle machine, vite preview) at plan-authoring time and re-measures
  after the veil + Anton land; a target the baseline already misses is a plan defect.

## Testing impact (sanctioned breakage)

- The load-bearing break: `tests/e2e/stack-scrub.spec.ts` asserts `.stack-meta` innerText
  plateau swaps — that element is deleted. The assertion migrates to
  `.stack-card-link .stack-card-subtitle` (front-card-scoped per the pollution guard above).
  This is a spec-level test update, not a patch-to-green.
- The `view project` bar → body-row markup change has **no test impact** (no spec references
  `.stack-card-bar`/CTA selectors); single `.stack-card-link`, `.gooey-title-sr`, and RM
  static-geometry assertions carry over as-is.
- New e2e coverage: veil presence (hero section height > 100svh, gradient band exists,
  name still inside the 100svh zone), nav flips to `--on-light` inside the chapter and back.
- Unit tests for `stackMotion` re-derived constants (EXIT_Y etc.) update alongside.

## Plan split (two plans, one spec)

- **Plan A — the core ask:** entry veil + hero stretch, Selected Work restyle (cream stage,
  eyebrow, Anton gooey title, Shadway cards, stackCover assets), nav-on-light (Projects
  scope), on-light tokens + audit for the pairs Plan A introduces, provisional exit veil
  below Projects, e2e/unit updates.
- **Plan B — the chapter:** Archive/WorkExperience/Stats/Skills cream restyle, exit-veil
  relocation below Skills, nav observer extension, full-chapter contrast audit, CLAUDE.md
  Design Direction rewrite finalization.
- Each plan: pre-execution review (fresh Opus + codex), per-task QA evidence, consolidated
  branch review + codex at the end, merge to `staging` only.

## CLAUDE.md amendment (ships with the work)

- The "no light theme" NO-list line is rewritten: the light system exists as the sanctioned
  mid-site chapter (Projects → Skills). Dark ink remains the identity at both ends.
- Design Direction gains: tonal arc, veil rules (no text in veils; hero 100svh zone
  inviolable), Anton usage fence (stack title only), Shadway card anatomy, on-light token
  set + audit table, nav-on-light behavior.

## Out of scope

- Hero content/scrim/loader internals (only the section grows; the 100svh zone is frozen).
- Contact/Footer stage and its contrast table.
- Stack mechanics (scrub math, plateaus, skip-links, RM behavior).
- Project detail pages (MacBook mockups stay there).
- Archive→Skills content or ordering changes (restyle only).

## TODO (acceptance criteria)

### Plan A
- [ ] Hero section stretches to ~130svh via the inner 100svh hero-zone element: scrim +
      name/role re-anchored to the zone and visually identical at rest (AA table re-verified
      against the zone box); canvas covers the full section; a transparent→cream veil band
      below the zone; no text in the band; hero e2e green.
- [ ] Selected Work stage renders on `--color-surface-light` cream with the whisper eyebrow
      (`01 · selected work`, deep-pink numeral) and NO SectionHeading block.
- [ ] Gooey title renders in self-hosted Anton at `clamp(56px, 9vw, 150px)` ink; threshold/
      blur constants re-tuned for Anton at scale; mixed 1-/2-line morph alignment defined;
      2-line wrap verified with "painel da reconstrução" at 1280px and 390px; real-Safari
      visual check re-run on the 2-line worst case (codex-computer-use lane).
- [ ] Cards are Shadway anatomy: white surface, inset plain `stackCover` screenshot (no
      laptop chrome), body row = name + `year · tech` subtitle + ink `view ↗` pill inside
      the single front-card `<Link>`; stage meta line gone; subtitle uniquely scopable via
      `.stack-card-link .stack-card-subtitle` (innerText-pollution guard).
- [ ] Stack geometry re-derived (slots/EXIT_Y/shadows) with the clearance rule holding:
      exiting card fully clears the promoted card; parked cards opacity 0.
- [ ] Single-channel invariant intact: every per-frame visual still derives from `segCont`
      alone (code inspection + existing tear-guard e2e green).
- [ ] Nav flips to `.nav--on-light` (ink text, readable `is-scrolled` bg) while over the
      cream zone and back to dark outside it.
- [ ] Provisional cream→ink exit veil below Projects — no hard cream/ink edge anywhere.
- [ ] On-light tokens defined (incl. the two tint channels `--row-tint`/`--row-tint-deep`);
      contrast table for every Plan-A pair recomputed against the whitest surface each pair
      sits on and ≥ 4.5:1 (≥ 3.0:1 large); deep pink/blue ratified; yellow small-text
      exemption applied; neutral scrollbar thumb lands.
- [ ] `stackCover` webp assets generated for the 4 featured projects; Lighthouse desktop
      perf ≥ 89 with Anton loaded.
- [ ] e2e updated: plateau assertion moved to card body/aria; veil + nav-flip specs added;
      full serial suite green; unit suite green; `tsc -b` clean.

### Plan B
- [ ] Archive, WorkExperience, Stats, Skills render on the cream system (ink text, light
      hairlines, light tonal alternation) with WorkRow anatomy/motion unchanged.
- [ ] Exit veil relocated below Skills; Contact/Footer stage byte-untouched; no hard
      cream/ink edge anywhere on the page.
- [ ] Nav-on-light observer covers the whole chapter (flips at chapter entry and exit only).
- [ ] Full-chapter contrast audit table complete; every always-visible pair passes.
- [ ] CLAUDE.md Design Direction rewritten (tonal arc, veil rules, Anton fence, card
      anatomy, on-light tokens, nav behavior); "no light theme" line replaced.
- [ ] Full verification suite green (unit, serial e2e, `tsc -b`, Lighthouse ≥ 89).
