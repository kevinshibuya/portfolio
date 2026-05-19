# About section — design

A new bilingual "about" section that lands between Hero and Projects. Does double duty: introduces Kevin as a person AND surfaces his AI-engineering practice as four codified tactics. Load-bearing piece of the 2026 recruiter-readiness pass — its purpose is to position Kevin as an engineer with *opinions about* AI workflows, not just an engineer who uses AI.

## TODO

- [x] `src/components/sections/About.tsx` exists and renders the heading `how i *work.*`, a 3-sentence bio, and 4 numbered practice tactics
- [x] The section is rendered in `src/pages/Home.tsx` between `<Hero />` and the `<Suspense>` block — eagerly loaded, NOT inside the lazy suspense boundary
- [x] Section has no index number (unnumbered intro, like Hero); does not shift the existing 01–05 indices on other sections
- [x] `SectionHeading.index` is optional; the existing 4 callers (Projects, Archive, WorkExperience, Skills — Contact never used SectionHeading) continue to pass `index` and render unchanged
- [x] Bio + tactics copy lives in `src/i18n/locales/en.json` and `src/i18n/locales/pt.json` under `sections.about.*` — both languages render the locked copy verbatim including the inline `<em>` blue accents
- [x] PT heading is `como eu <em>trabalho.</em>` (matches the pt-translated heading convention of other sections)
- [x] Layout is two-column editorial: bio left (~40%), tactics right (~60%), inside the existing `.section` scaffold (`max-width: 1440px; padding: 140px 80px;`)
- [x] Bio column is sticky (`position: sticky; top: 96px`) on desktop while the tactics column scrolls past
- [x] Tactic rows are flat (no card borders), separated by 1px mist borders, with sand-bg-only hover (no arrow, no title nudge, no padding shift)
- [x] Mobile (<900px): single column, bio un-sticks, tactic rows collapse to tighter padding
- [x] Section reveals with the existing `Stagger` cascade — tactic rows fade up in sequence via `STAGGER_PRESETS.workRows`
- [x] `prefers-reduced-motion` shortcuts to opacity-only fade (handled by `Stagger` already; library handles via `REDUCED_MOTION_VARIANT`)
- [x] Heading `how i *work.*` uses the existing `SectionHeading` pattern; the `<em>work.</em>` renders blue-500 via existing `.section-title em` rule (no override)
- [x] Inline `<em>` accents inside bio and tactic body render blue-400 (the design-system accent) via new `.about-bio em, .about-tactic-title em, .about-tactic-body em` rule
- [x] `npm run build` passes (TypeScript strict + bundling, no warnings — only pre-existing HeroAccent3D chunk-size advisory remains)
- [x] Visual sweep confirms EN and PT both render correctly under the hero, with the sticky-bio behavior on desktop and the mobile single-column on a 375px viewport (user-confirmed on dev server)

## Context

The portfolio MVP has no About section — it goes Hero → Projects directly. CV and portfolio both currently frame Kevin as "frontend developer at GZH," but his CV tagline (`fullstack — system design — ai engineer`) and his recent work (GZH analytical chatbot with Plexus investment, `ia na redação` editorial hub, the snapshot/retro/feat skill library, retro-driven dev practice) point at a stronger 2026 identity: an AI-native fullstack engineer with a *codified practice* around context budgets, skill libraries, retros, and snapshot-based automation.

The locked copy + layout direction came out of a full brainstorming pass with the user that closed at: Variant A (calm editorial) base + Variant B's sticky-bio + Variant C's sand-bg hover (minus the arrow + title-nudge — those were dropped because the rows are purely informational and an arrow promises a click affordance they can't deliver). Final HTML preview: `/tmp/portfolio-about-preview.html`.

## Design

### Position in section order

Slotted between `<Hero />` and the `<Suspense>` lazy block in `src/pages/Home.tsx` (current line 203–212). Eagerly loaded (not lazy) because it's the next thing under the fold and the personality hook — recruiters should see it without waiting on the lazy chunk to resolve.

About is **unnumbered** — it inherits Hero's role as intro, not content. The numbered indices stay: `01 · featured` (Projects), `02 · everything` (Archive), `03 · experience` (Work), `04 · expertise` (Skills), `05` (Contact).

### `SectionHeading` refactor

`SectionHeading.index` is currently required (`src/components/ui/SectionHeading.tsx:2`). Make it optional. When absent, `.section-index` span is not rendered. All existing callers (Projects, Archive, WorkExperience, Skills, Contact) keep passing `index` and render unchanged.

### Section structure

```tsx
<section id="about" className="section">
  <SectionHeading title="how i <em>work.</em>" />   {/* no index, no description */}
  <div className="about-grid">
    <div className="about-bio-wrap">                 {/* sticky on desktop */}
      <p className="about-bio">
        <Trans i18nKey="sections.about.bio" components={{ em: <em /> }} />
      </p>
    </div>
    <Stagger recipe="fadeUp" stagger={STAGGER_PRESETS.workRows} className="about-tactics">
      {tactics.map((tactic, i) => (
        <div key={tactic.num} className="about-tactic">
          <span className="about-tactic-num">{tactic.num}</span>
          <div>
            <h3 className="about-tactic-title">
              <Trans i18nKey={`sections.about.tactics.${i}.title`} components={{ em: <em /> }} />
            </h3>
            <p className="about-tactic-body">
              <Trans i18nKey={`sections.about.tactics.${i}.body`} components={{ em: <em /> }} />
            </p>
          </div>
        </div>
      ))}
    </Stagger>
  </div>
</section>
```

### Two-column grid (desktop ≥ 900px)

- `display: grid; grid-template-columns: 1fr 1.55fr; gap: 80px; align-items: start;`
- `.about-bio-wrap` has `position: sticky; top: 96px;` — bio stays pinned while the taller tactics column scrolls past.
- Bio: 20px / 1.55 line-height, color `var(--bark)`, weight 400.
- Tactics: each row is `display: grid; grid-template-columns: 56px 1fr; gap: 24px; padding: 26px 16px;` with `border-top: 1px solid var(--mist)`. Last child gets `border-bottom`. Hover: `background: var(--sand)` only — no arrow, no title nudge, no padding shift.

### Single column (mobile <900px)

- `grid-template-columns: 1fr; gap: 40px;`
- `.about-bio-wrap` un-sticks: `position: static`.
- Tactic title sizes drop from 22px → 19px, bio drops from 20px → 18px.
- Tactic grid drops to `40px 1fr` with reduced padding.

### Inline italic blue accents

Existing `.section-title em` rule already renders blue-500 inside section headings (the heading `<em>work.</em>` therefore inherits the design's heading-em convention). For inline body em (bio + tactic body + tactic title), add:

```css
.about-bio em,
.about-tactic-title em,
.about-tactic-body em {
  font-style: italic;
  color: var(--blue-400);
  font-weight: inherit;
}
```

This matches CLAUDE.md's "Accent = blue-400 `#3A96E8`" rule and the inline `*…*` accents seen throughout `projects.ts` content.

### Reveal motion

- Bio renders without explicit stagger (small, fades up with section).
- Tactic rows wrapped in `Stagger` with `recipe="fadeUp"` and `stagger={STAGGER_PRESETS.workRows}` (0.1s) — same cadence as the Work accordion rows.
- No scroll-triggered per-tactic animation. Entrance-only, viewport-triggered once (`{ once: true, amount: 0.2 }` — `Stagger` default).
- `Stagger` already shortcuts to opacity-only via `REDUCED_MOTION_VARIANT` when `prefersReducedMotion` is true — no extra work needed.

### i18n shape

```jsonc
"sections": {
  "about": {
    "title": "how i <em>work.</em>",   // EN
    "bio": "<em>fullstack</em>, <em>system design</em>, <em>ai engineering</em> — three things i practice on every product i build. seven years end-to-end across data viz, real-time systems, ai tooling, and sales funnels — with a <em>method</em> that compounds. brazilian, based in porto alegre.",
    "tactics": [
      { "num": "01", "title": "context budgets.", "body": "i treat the model's context window as a <em>first-class cost</em>, not a free resource — every dispatch and plan is sized against it before the work starts." },
      { "num": "02", "title": "skills over prompts.", "body": "repeated decisions get codified into <em>reusable skills</em> with explicit guardrails — that's how i keep hallucinations out of shipped code." },
      { "num": "03", "title": "retros that compound.", "body": "every non-trivial task ends with a small <em>retrospective</em> — the lesson gets written back into the skill library, so the next attempt is sharper, not the same." },
      { "num": "04", "title": "automation by snapshot.", "body": "flows i run more than twice get <em>captured as skills</em> — for example, the portfolio snapshot skill walks a repo, boots the frontend, mocks dead backends inline, and emits a typed <em>bundle another ai can ingest</em>: metadata, a technical brief, and an asymmetric set of desktop/mobile screenshots sized for downstream mockup templates." }
    ]
  }
}
```

PT mirrors with: `"title": "como eu <em>trabalho.</em>"` + PT bio + PT tactics (full locked copy in plan task 2).

### Trans vs dangerouslySetInnerHTML

- **Heading:** `SectionHeading.title` already uses `dangerouslySetInnerHTML` — no change. The `<em>work.</em>` inside the heading renders blue-500 via the existing `.section-title em` rule.
- **Body (bio + tactic title/body):** Use `<Trans i18nKey="…" components={{ em: <em /> }} />`. This is the existing pattern in `Hero.tsx:137` (`<Trans i18nKey="hero.description" components={{ strong: <strong /> }} />`). Safer than `dangerouslySetInnerHTML`, type-friendly, and renders the `<em>` as a real React element so the body-em CSS rule above applies.

This deliberately produces two em styles: heading em = blue-500 (matches existing site convention), body em = blue-400 (design system accent). Both are intentional.

## Verification

1. `npm run build` — TS strict + bundling, no warnings.
2. `npm run dev` and load `http://localhost:5173`:
   - About appears under Hero, no scroll required to see the heading.
   - Layout is two-column on desktop, single column under 900px.
   - Bio sticks at `top: 96px` while scrolling past tactics on desktop.
   - Hover any tactic row: `var(--sand)` bg appears, no arrow, no nudge.
   - All inline `<em>` words render blue-400 in body (bio + tactic body + tactic title).
   - Heading "work." renders blue-500 (heading-em convention).
   - Toggle EN/PT: copy swaps cleanly, layout doesn't shift.
3. `npm run preview` (port 4173) for prod-mode visual sweep — same checks at the prod bundle.
4. `prefers-reduced-motion: reduce` test (DevTools → Rendering → Emulate CSS media): entrance animation collapses to opacity-only.
5. Lighthouse mobile spot-check on `npm run preview` — confirm LCP + Performance score didn't regress vs today's baseline. About is below-the-fold, so LCP shouldn't change; watch TBT for the eager-mount cost.

## Out of scope

- No portrait gradient block (CLAUDE.md design system mentions a 380px portrait — deferred; this section ships text-only).
- No clickable rows / no links / no accordion expansion (locked: rows are purely informational).
- No section index number, no description sub-line under the heading.
- No CV update (CV Profile blurb still says "Frontend Developer with 6 years" — separate task, not blocking).
- No GZH chatbot project highlight — separate pass after this section ships.
- No changes to other sections (Hero, Projects, Archive, Work, Stats, Skills, Contact, Footer).

## Risks

- **Sticky bio + short tactics column at large heights.** If a tall viewport (1440px+) makes the tactics column shorter than the sticky bio's natural height, the sticky won't engage. Mitigation: 4 tactic rows × ~140px ≈ 560–700px total, taller than bio at all standard viewports — visually verify during step 5 of Task 5.
- **Section padding stacking with Hero.** Hero is full-viewport-height; the About section's `.section` padding (140px top) could leave too much whitespace under hero. Mitigation: tune top padding during visual review; can drop to 96–120px via an `.about-section { padding-top: … }` override if it feels excessive. Don't change `.section` baseline.
- **`<Trans>` array indexing key path.** `sections.about.tactics.0.title` works in react-i18next, but the i18next-parser config might not auto-discover keys nested inside arrays. Mitigation: this codebase already uses `t('hero.roles', { returnObjects: true })` for an array, so the pattern is established — but verify keys resolve via a quick render check in dev.
- **PT heading style drift.** Existing PT titles are translated (`obras em foco`, `meu arsenal`); the PT About heading should translate too (`como eu trabalho.`). The bio body intentionally code-switches (English domain names + PT verbs) per the locked native-voice pass — this is *not* a drift, it's the established voice.
- **`SectionHeading` refactor regression.** Making `index` optional could let new sections forget to pass it. Mitigation: the existing 5 callers are explicit; the optional change is purely additive. A small unit test (Task 1) protects the contract.

## Rollback

- Revert the i18n JSON changes (data-only, no migration).
- Revert `src/index.css` About block (CSS-only, no global side effects).
- Revert `src/pages/Home.tsx` to remove the `<About />` render + import.
- Revert `src/components/sections/About.tsx` deletion + `src/components/ui/SectionHeading.tsx` optional-index change.
- All changes ship in one PR; `git revert` of the merge commit is clean.
