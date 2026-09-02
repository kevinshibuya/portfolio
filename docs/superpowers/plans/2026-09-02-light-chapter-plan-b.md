# Plan B — the light chapter: Archive → Skills on cream, exit veil below Skills

**Goal:** extend the cream chapter that Plan A opened at Selected Work through Archive, WorkExperience, Stats and Skills, so the page reads as one light sheet between the hero paint and the Contact/Footer paint, with no hard cream/ink edge anywhere.
**Architecture:** one wrapper element `#chapter-light` in `Home.tsx` owns the chapter: it paints cream, carries a scoped re-declaration of the canonical color tokens (`--bg`, `--text`, `--hairline`, `--accent-*` …) so every descendant rule that already reads canonical tokens inverts with zero per-rule edits, and is the single node the nav's on-light observer watches. The exit veil sits OUTSIDE the wrapper as its next sibling (its gradient ends in `var(--bg)`, which the scope would turn cream; and the entry ramp lives on the dark side too, so the nav flips at Skills' bottom exactly as it flips at Projects' top). The chapter rules that still read legacy aliases are converted to their value-identical canonical names first, so the scope catches them. WorkRow, Stats and Skills CSS stay verbatim; the new rules are the scope block plus a short, enumerated list of overrides for the consumers the scope cannot reach (inline `--row-tint`, cream-alpha backgrounds, two legacy hover hues, two shadows).
**Spec:** `docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md` (Plan B section, "Light chapter (Plan B)" + the Plan B TODO block). READ-ONLY for the implementer; the controller ticks spec TODOs at acceptance.
**Execution model:** opus
**Author's session:** Fable 5.1, 2026-09-02, from `HANDOFF.md` (light-chapter Plan B section). The contrast numbers below were measured in that handoff session and are inherited, not re-derived. Reviewed once (reviewer opus, reviewer fable, codex-review sol) and fixed in one pass on 2026-09-02; no second wave.

## Assumptions stated to Kevin (2026-09-02), each changes a named line if answered differently

| # | assumption | where it lands |
|---|---|---|
| A1 | Branch `feat/light-chapter-b` off the `perf/hero-harness` tip (the commit that adds this plan); PR into `staging` (the spec says `staging`; global CLAUDE.md says `ai-staging`, which does not exist). This tip already contains both `main` and `staging`. | Global constraints, T1, T9 |
| A2 | The on-light **faded** step is forced to collapse into muted for always-visible text: no AA-passing alpha exists between muted (0.62, 5.23:1) and ink that is visually distinct from 0.62 (0.55 is ~4.15:1, fails; 0.58 passes but is indistinguishable). Consequence to accept: `.workrow-meta`, `.workrow-ornament`, `.stats-row-num`, `.skills-num`, `.archive-dropdown-label`, `.archive-count`, the search placeholder, `.work-meta-line`, `.work-location` all land on the same tone as `.section-desc`/`.workrow-panel`, a two-step hierarchy that exists on dark (`#A8A49C` vs `#C9C4BA`) and not on light. The faded step survives only on `aria-hidden` decoration (`.workrow-index`, `.workrow-arrow`). | T6 |
| A3 | Deep yellow `#7A6800` measures 4.94:1 on cream and PASSES small-text AA. The spec's "cannot" is wrong; the small-text substitution (yellow slot → ink-muted) stays as an **aesthetic** rule (it reads dark-olive) and is recorded as such in code and CLAUDE.md. The controller amends the spec sentence at acceptance (Controller steps). | T3, T8, Controller steps |
| A4 | `theme-color` swaps with the nav flip: `#F5F2EC` while on-light, `#0B0E14` otherwise. The spec allowed skipping it "unless trivial"; it is one line in the effect that already knows `onLight`, so it ships. | T5, T2 |
| A5 | Section index numerals in the chapter keep their dark-side hue (blue → deep blue). The Projects eyebrow's deep-pink numeral is a Plan A decision and is not touched. | T6 |
| A6 | The WorkRow title hover tint on light uses a LARGE-text deep triplet (`#B22B47` / `#2A54B5` / `#7A6800`, helper `accentDeepLargeFor`), so the tricolor rotation survives on hover: the yellow row tints olive-gold at 4.94:1 on a 28-64px title. Alternative (simpler, one helper fewer): hover reads `--row-tint-deep` (`accentDeepFor`) and the yellow row's hover reads as a soft ink dim instead of a tint. If Kevin picks the alternative: delete T3 and the T2 unit block, drop `--row-tint-deep-large` from T6 (WorkRow sets only `--row-tint-deep`), and point every `--row-tint-deep-large` consumer in T6 at `--row-tint-deep`. | T3, T6, T2 |

## Global constraints (violating any is a plan defect)

- Branch per A1. Merge target `staging`, NEVER `main`/`master`; `bin/block-merge-to-main.sh` enforces it.
- **Never `git add -A` or `git add docs/`.** Untracked `CONTEXT.md` and `docs/adr/` belong to another session. Stage files by name.
- **Contact/Footer stage byte-untouched:** `src/components/sections/Contact.tsx`, `src/components/layout/Footer.tsx`, `src/components/canvas/FluidWaves.tsx` and the `.contact-*`/`.footer-*`/`.contact-footer-stage`/`.fluid-waves-*` CSS blocks show ZERO diff on this branch (`git diff --stat e1d237e...HEAD -- <those paths>` is empty).
- **WorkRow anatomy + motion verbatim.** `src/components/ui/WorkRow.tsx` changes exactly one thing (T6: two more CSS vars on the root style). `.workrow-*` CSS rules are not edited; new rules are added under `.chapter-light` only.
- **Canonical tokens only.** No new `var(--cream|--sand|--mist|--ink|--bark|--dust|--blue-*|--periwinkle-*)` references anywhere. T4 removes the ones in the chapter's path. `src/index.css:132-134` sanctions exactly this ("sections migrate to the canonical names as they're restyled").
- **`--row-tint*` are inline custom properties on `.workrow` / `.stack-inner`.** An inline value beats any ancestor scope, so the scope block cannot invert them; every consumer of a raw `--row-tint` inside the chapter is listed and overridden in T6. A raw `--row-tint` reaching any always-visible text on cream is a defect.
- **The exit veil never sits inside `#chapter-light`.** Its gradient ends in `var(--bg)`; inside the scope that resolves to cream and the fade disappears.
- **No text in the exit veil.** It stays `aria-hidden`, pure gradient, 30svh.
- **GSAP stays entrance-only.** Nothing in this plan animates.
- **Checkbox discipline:** the implementer edits each `- [ ]` step to `- [x]` immediately after the step lands, BEFORE the next step. Spec `## TODO` boxes are the controller's.
- **e2e rules (Plan A, unchanged):** scroll math uses `getBoundingClientRect().top + window.scrollY`, never `offsetTop`. No braces in `page.evaluate` bodies that touch Framer/GSAP objects. Explicit `timeout:` on every screenshot. `npx playwright test --workers=1` for the serial suite. One `test()` per numbered assertion group so partial RED/GREEN states are observable.
- **Port 4173 is shared.** `pgrep -fl "wrangler dev|vite preview"` before every suite; kill the parent first. Manual Lighthouse: `lsof -ti:4173 | xargs kill 2>/dev/null; npx vite preview --port 4173` (NEVER `npm run preview`, that is wrangler). Never overlap Playwright with `npm run perf`.
- Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` + `Claude-Session:` line per the session's attribution notice.

## Baselines (T1 measures and fills the blanks; a target the baseline already misses is a plan defect)

| check | command | handoff value (2026-09-01) | T1 measured | T9 final |
|---|---|---|---|---|
| typecheck | `npx tsc -b` | clean | exit 0, clean | |
| lint | `npm run lint` | 0 errors, 4 react-refresh warnings (`SmoothScroll.tsx`, `MotionContext.tsx`) | 0 errors, same 4 warnings | |
| unit | `npm run test:unit` | 99 / 99, 14 files | 99 / 99, 14 files | |
| serial e2e | `npx playwright test --workers=1` | not recorded since Plan A polish | 102 tests total (100 passed / 2 failed). Both failures were load-induced flakes on a rig running a game at 147% CPU (`loader.spec.ts:12`, `perf-budget.spec.ts:173`, both mobile-chromium, both GREEN on a targeted re-run). The TOTAL — 102 — is the number T9 compares against, and it is unaffected by the flakes. | 114 (= 102 + 12) |
| Lighthouse desktop perf | `npm run perf:lh` against `npx vite preview --port 4173`, idle machine, AC power | floor ≥ 89 (Plan A read 94) | **95** — measured late, on a quiet AC rig, against `src/` reverted to the branch point `06eb6de`, so it is a true before-number rather than a figure from another day. LCP 1036.8ms, CLS 0, TBT 0, `acPower: true`, zero warnings. | **94** (LCP 1058.6ms, CLS 0, TBT 0, `acPower: true`, zero warnings) |

## Task → model routing

| task | title | lane |
|---|---|---|
| T1 | Baseline snapshot | inline, opus |
| T2 | RED tests (unit + e2e) | inline, opus |
| T3 | `accentDeepLargeFor` (TDD) — deleted if A6 goes the other way | inline, opus |
| T4 | Legacy alias → canonical, value-identical | inline, opus (mechanical, ~20 lines; not worth a codex round-trip) |
| T5 | `#chapter-light` wrapper, veil relocation, observer retarget, theme-color | inline, opus |
| T6 | `.chapter-light` token scope + overrides, WorkRow tint channels | inline, opus (taste-bearing: shadows, the faded steps, the panel surfaces) |
| T7 | Real-site pass | `codex-computer-use` (gpt-5.6-sol), the only gpt lane |
| T8 | CLAUDE.md Design Direction rewrite | inline, opus |
| T9 | Final verification + PR | inline, opus |

Plans execute inline (`executing-plans`); a `worker` is dispatched only if Kevin says so.

## Ratified contrast table (the authority for the chapter; WCAG 2dp, inherited from the handoff audit)

Grounds: cream `#F5F2EC` (Work, Stats, and the wrapper), tonal cream `#EDE9E0` (Archive, Skills via `.section--sand`; also the `.pill` surface inside Work), white `#FFFFFF` (Plan A cards only).

| # | pair (element → color it resolves to) | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 1 | `.section-title`, `.workrow-title`, `.stats-row-value`, `.skills-title`, `.archive-count strong`, dropdown text, search text, `.work-highlight p`, `.pill:hover` text → ink `#0B0E14` | cream / tonal | 17.29 / 15.94 | 4.5 | ✅ |
| 2 | `.section-desc`, `.workrow-meta` (+ `·` separators), `.workrow-ornament`, `.workrow-panel`, `.stats-row-num`, `.stats-row-ann`, `.skills-num`, `.skills-item`, `.archive-chip`, dropdown label/caret/options, `.archive-count`, search placeholder, `.work-meta-line`, `.work-location`, `.work-mode-pill`, `.work-bullets li`, `.pill` (11px, on its tonal surface) → muted `rgba(11,14,20,.62)` | cream / tonal | 5.23 / 5.11 | 4.5 | ✅ |
| 3 | `.workrow-index`, `.workrow-arrow` (both `aria-hidden="true"`) → faded `rgba(11,14,20,.40)` | cream / tonal | 2.62 / 2.59 | exempt (WCAG 1.4.3 note 1, decorative; matches `.contact-num`) | ✅ exempt |
| 4 | `.section-index`, `.section-title em`, `.stats-eyebrow`, `.stats-row-link`, `.archive-star`, dropdown `.is-selected` → deep blue `#2A54B5` | cream / tonal | 6.20 / 5.71 | 4.5 | ✅ |
| 5 | `.work-highlight-label` (10px uppercase, always visible on the expanded row) → `--row-tint-deep`: `#B22B47` / `#2A54B5` / ink-muted | cream | 5.64 / 6.20 / 5.23 | 4.5 | ✅ |
| 6 | WorkRow title hover tint, pink slot → `#B22B47` | cream / tonal | 5.64 / 5.21 | 3.0 (large, ≥28px) | ✅ |
| 7 | WorkRow title hover tint, blue slot → `#2A54B5` | cream / tonal | 6.20 / 5.71 | 3.0 | ✅ |
| 8 | WorkRow title hover tint, yellow slot → `#7A6800` (A6) | cream / tonal | 4.94 / 4.55 | 3.0 | ✅ (also clears 4.5; the small-text exemption is aesthetic, A3) |
| 9 | `.btn--ghost` (Archive load-more) text + border → ink; hover → cream on ink | tonal; ink | 15.94; 17.29 | 4.5 | ✅ |
| 10 | focus rings: `.workrow-*:focus-visible` outline → ink; `.stats-row-link:focus-visible` → deep blue; `.archive-search:focus` border → deep blue | cream / tonal | 15.94+; 5.71+ | 3.0 (non-text) | ✅ |
| 11 | `::selection` inside the chapter → cream text on deep blue | deep blue | 6.20 | 4.5 | ✅ |
| 12 | decorative, no text: hairlines `rgba(11,14,20,.12)`; `.skills-dot` (deep triplet via `--accent-*`); `.skills-item:hover` dashed border; `.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border-left (all three → `--row-tint-deep-large`, so the yellow slot is olive `#7A6800`, visible, not raw `#E6CC4D` at 1.43); `.work-mode-pill` bg `rgba(11,14,20,.06)`; `.work-highlight` bg `rgba(11,14,20,.04)`; `.pill` bg tonal + hairline border; `.pill:hover` bg `rgba(11,14,20,.06)` + deep-blue border | any | decorative | — | ✅ |
| 13 | nav-on-light over tonal cream: link muted on `rgba(245,242,236,.85)`-over-`#EDE9E0` | ≈ cream | ≥ 5.1 | 4.5 | ✅ (Plan A row 10 within rounding) |
| 14 | tonal cream vs cream adjacency (Archive/Skills edges against Work/Stats/wrapper; `.pill` on Work) | — | 1.08 | — | ✅ (a tonal step, same role as `#131722` vs `#0B0E14` on dark) |

Not in the chapter, unchanged: Plan A's card interior (rows 1-9 of the Plan A table), the hero AA exemption, the Contact/Footer table.

---

### Task 1: Baseline snapshot

**Files:**
- `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` — modify: fill the "T1 measured" column only; nothing outside this list

**Work:** create the branch per A1. Run every command in the Baselines table on a quiet machine on AC power (`pmset -g ps` shows AC). Record the numbers. If the serial e2e is not fully green BEFORE any change, stop and report `blocked: baseline red: <spec names>`; do not proceed on a red baseline. Lighthouse runs against `npx vite preview --port 4173` after `npm run build`; kill anything on 4173 first; restart preview after every build (a stale preview 404s hashed assets).

**Acceptance check:** the table has five measured values, the serial e2e line reads `N passed / 0 failed / 0 skipped`, Lighthouse desktop perf ≥ 89.

**Boundaries:** no source changes. If `pmset -g ps` shows battery, do not run Lighthouse; wait for AC.

- [x] `git checkout -b feat/light-chapter-b` from the `perf/hero-harness` tip; `pmset -g ps` shows AC
- [x] `npx tsc -b` and `npm run lint`; record
- [x] `npm run test:unit`; record
- [ ] `pgrep -fl "wrangler dev|vite preview"` clean, then `npx playwright test --workers=1`; record the totals
- [ ] `npm run build`, `npx vite preview --port 4173`, `npm run perf:lh`; record; kill preview
- [ ] fill the T1 column; commit `docs(plan-b): T1 baseline snapshot`

---

### Task 2: RED tests

**Files:**
- `tests/unit/palette.test.ts` — modify: add a `describe('accentDeepLargeFor …')` block (skip if A6 goes the other way)
- `tests/e2e/nav-on-light.spec.ts` — modify: the first test's assertions and comments
- `tests/e2e/light-chapter.spec.ts` — create
- nothing outside this list

**Interfaces:**
- Consumes (from T3): `export const ACCENTS_DEEP_LARGE: readonly ['#B22B47', '#2A54B5', '#7A6800']`, `export function accentDeepLargeFor(index: number): AccentDeepLarge` from `src/utils/palette.ts`.
- Consumes (from T5): a `div#chapter-light.chapter-light` in `Home.tsx` containing, in order, `#projects`, `#archive`, `#work`, `#stats`, `#skills`; `.chapter-exit-veil` is the wrapper's NEXT SIBLING; `.contact-footer-stage` follows the veil. `meta[name="theme-color"]` content follows the nav flip.
- Consumes (from T6): the computed colors in the contrast table; `--row-tint-deep` and `--row-tint-deep-large` on every `.workrow`.

**Work:**

Unit (`palette.test.ts`): assert `accentDeepLargeFor(0..3)` returns `#B22B47`, `#2A54B5`, `#7A6800`, `#B22B47`; assert `ACCENTS_DEEP_LARGE.length === ACCENTS.length`; assert `ACCENTS_DEEP_LARGE[2]` matches `/^#/` (this triplet DOES carry a hex in the yellow slot, the opposite of `ACCENTS_DEEP`). Leave every existing assertion untouched.

`nav-on-light.spec.ts`, first test: after the `projects` on-light assertion, replace the Archive block with: `archive` at 0.3 → count 1 and `meta[name="theme-color"]` content `#F5F2EC`; `skills` at 0.5 → count 1; `contact` at 0.3 → count 0 and theme-color `#0B0E14`. Retitle "over the cream chapter (Projects → Skills) and back to dark". The second test (SPA back-nav re-arm) stays byte-identical except comments (`#chapter-light` is what re-arms; the scroll target `projects` is still right, it is the wrapper's first child).

`light-chapter.spec.ts` (new): one `test.describe`, SIX `test()` blocks, one per group below, so partial states are observable. Shared setup per test: `goto('/')`, `waitForFunction(loaderState === 'done')`, `await page.locator('#skills').waitFor()` (lazy chunks mounted). All reads via `getComputedStyle` inside `page.evaluate`, NO braces touching Framer/GSAP objects. Copy the `scrollIntoSection` helper from `nav-on-light.spec.ts` (no shared helper module exists; do not create one).
1. **wrapper**: `#chapter-light` exists; its `background-color` is `rgb(245, 242, 236)`; `document.body` `background-color` is still `rgb(11, 14, 20)`.
2. **structure**: `#chapter-light > *` ids in order `projects, archive, work, stats, skills` (exactly five children); `#chapter-light + .chapter-exit-veil` count 1; `#projects .chapter-exit-veil` count 0; `.chapter-exit-veil + .contact-footer-stage` count 1.
3. **backgrounds**: `#archive`, `#skills` → `rgb(237, 233, 224)`; `#stats`, `#projects` → `rgb(245, 242, 236)`; `#work .pill` (first) → `rgb(237, 233, 224)`; `#work .work-mode-pill` (first) → `rgba(11, 14, 20, 0.06)`.
4. **text**: `#archive .workrow-title` → `rgb(11, 14, 20)`; `#archive .workrow-meta` → `rgba(11, 14, 20, 0.62)`; `#archive .workrow-index` → `rgba(11, 14, 20, 0.4)`; `#archive .section-index` → `rgb(42, 84, 181)`; `#stats .stats-eyebrow` → `rgb(42, 84, 181)`; `#stats .stats-row-value` → `rgb(11, 14, 20)`; `#skills .skills-item` → `rgba(11, 14, 20, 0.62)`; `#work .pill` → `rgba(11, 14, 20, 0.62)`; `#work .work-highlight-label` (first row is expanded by default, index 0 → pink) → `rgb(178, 43, 71)`; `#archive .workrow` `border-bottom-color` → `rgba(11, 14, 20, 0.12)`.
5. **veil geometry**: with rects in document space, `|veil.top − skills.bottom| ≤ 1` and `|veil.bottom − stage.top| ≤ 1` (`stage = .contact-footer-stage`); veil `background-image` contains both `rgb(245, 242, 236)` and `rgb(11, 14, 20)`; veil height ≥ 0.25 × `window.innerHeight`.
6. **hover tint rotation**: for the first three `#archive .workrow` (indexes 0, 1, 2), read the custom properties `--row-tint-deep-large` via `getPropertyValue` and assert `#B22B47`, `#2A54B5`, `#7A6800` in order (trim). Then, only when `!isMobile` (use the `isMobile` fixture, no `test.skip`), hover each row's `.workrow-link, .workrow-toggle` in turn, wait 600 ms (past the house hover transition), and assert its `.workrow-title` color is `rgb(178, 43, 71)`, `rgb(42, 84, 181)`, `rgb(122, 104, 0)` respectively. Both projects run all six tests; nothing is skipped.

**Acceptance check:** `npx playwright test tests/e2e/light-chapter.spec.ts tests/e2e/nav-on-light.spec.ts --workers=1` is RED with: light-chapter tests 1-6 ALL failing (1: no `#chapter-light`; the rest either on the missing wrapper or on dark values); nav-on-light test 1 failing at the `archive` step (count 0). `npx vitest run tests/unit/palette.test.ts` RED with a missing-export error. Every OTHER e2e spec still passes (`dark-tokens`, `section-enters`, `reduced-motion`, `rows-hover` are the adjacent ones).

**Boundaries:** no `src/` changes. Do not weaken or delete existing assertions. `blocked:` if `#contact` does not exist as an id (the section-enters spec says it does).

- [x] palette unit block added; `npx vitest run tests/unit/palette.test.ts` RED on import
- [x] `nav-on-light.spec.ts` test 1 updated; RED at the archive step
- [x] `light-chapter.spec.ts` written, six tests; all RED
- [x] the four adjacent specs still green; commit `test(plan-b): RED acceptance tests for the light chapter`

---

### Task 3: `accentDeepLargeFor` (TDD) — A6

**Files:**
- `src/utils/palette.ts` — modify: add the const, type and function; amend one comment; nothing outside this list

**Interfaces:**
- Produces: `export const ACCENTS_DEEP_LARGE = ['#B22B47', '#2A54B5', '#7A6800'] as const`, `export type AccentDeepLarge = (typeof ACCENTS_DEEP_LARGE)[number]`, `export function accentDeepLargeFor(index: number): AccentDeepLarge` (index-rotated like `accentFor`).

**Work:** three deep values, index-aligned with `ACCENTS`. Doc comment: for LARGE text (≥ 24px regular / ≥ 18.66px bold, WCAG large) and decorative marks on light grounds; measured 5.64 / 6.20 / 4.94 on cream; the yellow slot carries `#7A6800` here because large text is where the aesthetic exemption does not apply. In the existing `ACCENTS_DEEP` comment, replace the sentence `The yellow slot CANNOT meet small-text AA on cream (a 4.5:1 deep-yellow reads dark-olive), so it emits the ink-muted step instead — the spec's yellow small-text exemption.` with exactly: `The yellow slot emits the ink-muted step instead of #7A6800: the deep yellow DOES pass small-text AA on cream (4.94:1, measured 2026-09-02), but at small sizes it reads dark-olive, so the substitution is an aesthetic rule, kept deliberately. Large text and decoration use ACCENTS_DEEP_LARGE.` `ACCENTS_DEEP` values unchanged.

**Acceptance check:** `npx vitest run tests/unit/palette.test.ts` GREEN, all blocks (the Plan A assertion that `ACCENTS_DEEP[2]` is not a hex still holds). `npx tsc -b` clean.

**Boundaries:** do not change `ACCENTS_DEEP` values.

- [x] const + type + function + both comments; unit GREEN; `tsc -b` clean
- [x] commit `feat(palette): accentDeepLargeFor, the on-light large-text triplet`

---

### Task 4: Legacy aliases → canonical in the chapter's rules (value-identical)

**Files:**
- `src/index.css` — modify: ONLY the declarations listed below; nothing outside this list

**Work:** first DERIVE the block list, do not trust this one blindly: collect every className rendered under the wrapper (`Archive.tsx`, `WorkExperience.tsx`, `Stats.tsx`, `Skills.tsx`, `WorkRow.tsx`, `SectionHeading.tsx`, `Tag.tsx` pill variant; `Projects.tsx` + its `ui/` children already read `--color-*` names and are out of scope here), then `grep -n 'var(--\(cream\|sand\|mist\|ink\|bark\|dust\|blue-[0-9]*\|periwinkle-[0-9]*\))' src/index.css` and keep the hits whose selector is in that set. On 2026-09-02 that set is exactly the following; if you find more, add them and say so in the commit body; if one is missing, report `blocked:`.

Each replacement is value-identical on the dark ground (`--ink` ≡ `--text` `#F5F2EC`, `--bark` ≡ `--text-muted` `#C9C4BA`, `--sand` ≡ `--bg-tonal` `#131722`, `--cream` ≡ `--bg` `#0B0E14`; `--mist` `rgba(245,242,236,.14)` → `--hairline` `rgba(245,242,236,.13)` is a 0.01 alpha step, treated as identical). Replace:
- `.section--sand` (~690): `var(--sand)` → `var(--bg-tonal)`
- `.section-title` (~712): `var(--ink)` → `var(--text)`
- `.section-desc` (~726): `var(--bark)` → `var(--text-muted)`
- `.pill` (~742-751): `var(--bark)` → `var(--text-muted)`, `var(--sand)` → `var(--bg-tonal)`, `var(--mist)` → `var(--hairline)`
- `.pill:hover` (~753-757): `var(--ink)` → `var(--text)`; LEAVE `--blue-100` / `--blue-200` (no canonical equivalent; T6 overrides the hover in scope)
- `.stats` (~1159): `var(--cream)` → `var(--bg)`
- Archive block (~1283-1378): every `var(--ink)` → `var(--text)` (six sites: trigger, `.archive-dropdown-value`, `.is-active`, `.archive-search`, `.archive-chip:hover`, `.archive-count strong`)
- BUTTONS block (~647-679): `var(--ink)` → `var(--text)`, `var(--cream)` → `var(--bg)` in `.btn--primary`, `.btn--ghost`, `.btn--ghost:hover`; LEAVE `--blue-400` in `.btn--primary:hover` (`.btn--primary` is not rendered in the chapter)
Leave `.section-index` / `.section-title em` (`--blue-500`) for T6. `.chip` / `.chip.is-active` (~760-777) are the Tag chip variant, rendered nowhere in the chapter (`grep -rn 'variant="chip"' src` is empty); leave them.

**Acceptance check:** the derivation grep returns no hit whose selector is in the chapter set except `.section-index`, `.section-title em`, `.pill:hover` (`--blue-100`/`--blue-200`), `.btn--primary:hover`. `npm run build` clean. `npx playwright test tests/e2e/dark-tokens.spec.ts tests/e2e/section-enters.spec.ts tests/e2e/rows-hover.spec.ts --workers=1` green (nothing renders differently yet).

**Boundaries:** no other rule edits. If a listed line does not match the description (drift since 2026-09-02), report `blocked: <selector> reads <what you found>` rather than guessing.

- [x] block list derived and compared to the list above; deviations noted
- [x] replacements applied; derivation grep clean; build clean
- [x] the three e2e specs green; commit `refactor(css): chapter rules read canonical tokens (value-identical)`

---

### Task 5: `#chapter-light` wrapper, exit veil relocation, observer retarget, theme-color

**Files:**
- `src/pages/Home.tsx` — modify: wrap the five sections; place the veil after the wrapper
- `src/components/sections/Projects.tsx` — modify: delete the `.chapter-exit-veil` line (108) and nothing else
- `src/components/layout/Header.tsx` — modify: the observed id (two lookups), the comments, and the theme-color effect
- `src/index.css` — modify: the `.chapter-exit-veil` comment (~2119-2121) only; NO `.chapter-light` rule yet (its background lands with the token scope in T6, otherwise `#work` would render cream text on cream at this commit)
- nothing outside this list

**Interfaces:**
- Produces, inside the existing outer `<Suspense>` in `Home.tsx`, in order: `<div id="chapter-light" className="chapter-light">` with children `Projects, Archive, WorkExperience, Stats, Skills`; then `<div className="chapter-exit-veil" aria-hidden="true" />`; then the existing `.contact-footer-stage`. `Header.tsx` observes `document.getElementById("chapter-light")` with the SAME `rootMargin: "-8% 0px -91% 0px", threshold: 0`, and a `useEffect` on `onLight` sets `meta[name="theme-color"]` content to `#F5F2EC` when true, `#0B0E14` when false (guard a missing meta; do nothing else in that effect).

**Work:** the wrapper is a plain block: no `overflow`, no `position` (the `position: sticky` stage in `#projects` needs the viewport as its scroll container; any `overflow` on an ancestor breaks the pin). The veil moves as-is: same class, same `aria-hidden`, same CSS; it sits OUTSIDE the wrapper (Global constraints: its gradient ends in `var(--bg)`). Rewrite the CSS comment: this is THE exit veil (cream → ink) between Skills and the Contact/Footer stage, owned by `Home.tsx`, deliberately a sibling of `#chapter-light` and not a child; the hero side needs no CSS veil because the shader's cream dissolve does that job. Header: the spec says "extend the root margin to the whole chapter"; a rootMargin cannot express a chapter, so the observed ELEMENT changes instead, with the band unchanged. Say that in the code comment. The MutationObserver re-arm path is unchanged: `#chapter-light` commits in the same Suspense boundary that gates `#projects` today.

**Acceptance check:** `npx playwright test tests/e2e/nav-on-light.spec.ts tests/e2e/light-chapter.spec.ts --workers=1`: nav-on-light fully GREEN (both tests, incl. theme-color); light-chapter tests 2 (structure) and 5 (veil geometry) GREEN; 1, 3, 4, 6 still RED (colors land in T6). `npx playwright test tests/e2e/stack-scrub.spec.ts tests/e2e/stack-reduced-motion.spec.ts tests/e2e/pixel-gate.spec.ts --workers=1` GREEN with NO golden update (`useScroll` targets `.stack-scroll`, not `#projects`, and the veil sits 400svh below the stage top; a `stage-arrival` diff is a finding, report it).

**Boundaries:** do not touch the Suspense fallback, the `stageRef` callback, scroll restoration, or chunk warming in `Home.tsx`. Do not change rootMargin.

- [x] `Home.tsx` wrapper + veil placement; `Projects.tsx` veil line removed; `tsc -b` clean
- [x] `Header.tsx` observes `chapter-light`; theme-color effect; comments updated
- [x] veil comment in `index.css`
- [x] nav-on-light GREEN; light-chapter 2 and 5 GREEN; stack + pixel-gate GREEN, no golden change
- [x] commit `feat(chapter): #chapter-light wrapper; exit veil below Skills as its sibling; nav + theme-color follow the chapter`

---

### Task 6: `.chapter-light` token scope + overrides; WorkRow tint channels

**Files:**
- `src/index.css` — modify: add the `.chapter-light` block and the override rules directly below the veil rule; update the `--color-ink-on-light-faded` comment (~153-156)
- `src/components/ui/WorkRow.tsx` — modify: `rootStyle` (~71-72) gains `'--row-tint-deep': accentDeepFor(index)` and `'--row-tint-deep-large': accentDeepLargeFor(index)`; the type cast widens to `Record<'--row-tint' | '--row-tint-deep' | '--row-tint-deep-large', string>`; import both helpers
- nothing outside this list

**Interfaces:**
- Consumes: `accentDeepFor` (Plan A), `accentDeepLargeFor` (T3), `#chapter-light.chapter-light` (T5).
- Produces: `--row-tint-deep` (small-text-safe, same name and semantics as `Projects.tsx:70`) and `--row-tint-deep-large` on every `.workrow` root.

**Work:** the scope block is load-bearing; ship it as written:

```css
.chapter-light {
  background: var(--color-surface-light);
  /* Scoped token inversion: every descendant rule that reads a canonical token
     flips to the on-light system without being edited. Raw tricolor → deep triplet.
     Inline --row-tint* vars are NOT reachable from here; see the overrides below. */
  --bg:            var(--color-surface-light);
  --bg-tonal:      var(--color-surface-light-tonal);
  --text:          var(--color-ink-on-light);
  --text-muted:    var(--color-ink-on-light-muted);
  --text-faded:    var(--color-ink-on-light-muted); /* A2: forced; no distinct AA step exists below muted */
  --hairline:      var(--color-hairline-on-light);
  --accent-pink:   var(--color-accent-pink-deep);
  --accent-blue:   var(--color-accent-blue-deep);
  --accent-yellow: var(--color-accent-yellow-deep); /* decorative only inside the chapter (.skills-dot) */
}
```

Before writing overrides, run the consumer audit: `grep -n 'var(--\(bg\|bg-tonal\|text\|text-muted\|text-faded\|hairline\|accent-[a-z]*\|row-tint[a-z-]*\))' src/index.css` over the chapter's rule ranges (section scaffold, PILL, WORK, SKILLS, STATS, ARCHIVE, WORKROW, and the `.stack-*` block since `#projects` is inside the wrapper) and classify every hit as invert-intended (the scope handles it) or must-override (listed below). Paste the classified table in the commit body. A hit in neither list is a `blocked:`.

Overrides, one rule each, all prefixed `.chapter-light`:
1. `.section-index`, `.section-title em` → `color: var(--accent-blue)` (A5; these read `--blue-500` outside the scope).
2. `.workrow-index`, `.workrow-arrow` → `color: var(--color-ink-on-light-faded)` (A2; both `aria-hidden`). Specificity is determinate: the existing hover lifts (`.workrow-link:hover .workrow-index` and siblings) are (0,3,0) and beat this (0,2,0) rule, so hover still lifts them to ink. No conditional.
3. WorkRow hover/focus-within title tint → `color: var(--row-tint-deep-large)`; mirror the exact selector list of the existing rule (~2024-2028) with the scope prefix so it outranks it.
4. `.work-highlight-label` → `color: var(--row-tint-deep)` (small text; table row 5).
5. `.work-mode-dot` `background`, `.work-bullets li::before` `background`, `.work-highlight` `border-left-color` → `var(--row-tint-deep-large)` (decorative; keeps the yellow slot visible).
6. `.work-mode-pill` → `background: rgba(11, 14, 20, 0.06)`; `.work-highlight` → `background: rgba(11, 14, 20, 0.04)` (the cream-alpha originals vanish on cream).
7. `.pill:hover` → `background: rgba(11, 14, 20, 0.06); border-color: var(--accent-blue); color: var(--text)` (replaces the `--blue-100`/`--blue-200` dark hover).
8. `.workrow-float-inner` → `box-shadow: 0 24px 60px rgba(11, 14, 20, 0.22)`; `.archive-dropdown-list` → `box-shadow: 0 12px 32px rgba(11, 14, 20, 0.16)` (dark shadows read heavier on light).
Nothing for focus rings, Stats, Skills, Archive chips/search/dropdown text, `.btn--ghost`, `::selection`, `.pill` rest state: the scope block inverts them (table rows 9-12).

Named visual consequences, accepted: `.stats-row-num` and `.skills-num` (real ordinals, not `aria-hidden`) move from faded to muted; `.stack-skiplink:focus-visible` inside `#projects` renders as a cream chip with ink text and an ink ring instead of an ink chip (it reads `--bg`/`--text`; the spec asks for exactly this inversion). Update the comment above `--color-ink-on-light-faded` to name its consumers and rule (A2).

**Acceptance check:** `npx playwright test tests/e2e/light-chapter.spec.ts --workers=1` fully GREEN (all six). Then `rows-hover`, `section-enters`, `reduced-motion`, `dark-tokens`, `stack-scrub` GREEN. `npm run test:unit` GREEN (`WorkRow.test.tsx` asserts only `--row-tint`, so the extra vars do not break it; if a snapshot exists, update it and say so).

**Boundaries:** no `.workrow-*`, `.work-*`, `.pill`, `.stats-*`, `.skills-*` rule outside the scope is edited. No new tokens. If a computed color comes back transparent or as the raw tricolor, the token is not resolving: fix by referencing it via `var()` in plain CSS, never by hardcoding a hex.

- [x] consumer audit run; classified table saved for the commit body
- [x] scope block + eight override groups in `index.css`; faded-token comment updated
- [x] `WorkRow.tsx` root style + imports; `tsc -b` clean; unit GREEN
- [x] light-chapter e2e GREEN (6/6); five adjacent specs GREEN
- [x] Tab through Projects → Archive: skip-link chip and WorkRow focus rings read on cream (note in commit body)
- [x] commit `feat(chapter): scoped on-light token inversion for Archive → Skills`

---

### Task 7: Real-site pass (codex-computer-use)

**Files:** none (read-only verification). Evidence goes to the codex registry line + log.

**Work:** dispatch `codex-computer-use` against `npx vite preview --port 4173` of a fresh `npm run build`, at 1280×800 and 390×844, with this script: (1) scroll from the hero through Skills to Contact at a steady pace and screenshot every boundary: hero→Projects, Projects→Archive, Archive→Work, Work→Stats, Stats→Skills, Skills→veil→Contact; report any hard edge, any dark sliver between sections, and whether the cream→ink veil reads as a continuous fade. (2) Nav: report its variant at each boundary (ink-on-cream bar over the chapter, cream-on-ink bar over hero and Contact), and specifically what the bar looks like while the exit veil crosses the top of the viewport (expected: the dark bar over the cream top of the veil, mirroring the entry side). (3) Hover three consecutive Archive rows and report the title tint hue of each (expect pink, blue, olive-gold rotation) and that the float preview shadow reads soft. (4) Open the Archive dropdown, type in the search, toggle a chip, press load-more: report legibility. (5) In WorkExperience, with the first row expanded: report the mode pill, the award label color and legibility, the bullet dashes, the highlight box, and the tech pills (expect tonal-cream pills with muted text, hover to ink). (6) Tab from the Projects stage into Archive: report the focus ring visibility. Ask for a written verdict per item plus the screenshots' paths.

**Acceptance check:** the codex log exists and is readable; every item reports PASS or names a defect with a screenshot. A defect reopens T6 (colors/shadows/surfaces) or T5 (geometry); fix, re-run the e2e, re-dispatch only the failed items.

**Boundaries:** codex does not edit files. Findings are evidence, not orders: hand-verify each before acting.

- [x] build + preview up on 4173; `~/.claude/bin/codex-run.sh plan-b-realsite …` with an explicit Bash timeout
- [x] verdicts read; defects (if any) fixed under T5/T6 and re-verified
- [x] preview killed; registry line + log path recorded in the next commit body

---

### Task 8: CLAUDE.md Design Direction rewrite

**Files:**
- `CLAUDE.md` — modify: the `## Design Direction` section only; nothing outside this list

**Work:** rewrite from the AS-SHIPPED facts below (from the code on 2026-09-02, NOT from Plan A's plan file, which predates its own polish run). Keep every bullet that is still true (Hero anatomy incl. the 130svh + shader dissolve, hero AA exemption, loader, WorkRow anatomy, animations, layout, Contact/Footer table, standing rule). Change:

1. **Header paragraph (line 18):** replace "No light theme" with the tonal arc: dark ink at both ends, a cream light chapter (Projects → Skills) in the middle, dark returns at the Contact/Footer stage. Keep "no bento cards, no ink-draw entrance".
2. **Colors bullet:** add the on-light token set: `--color-surface-light #F5F2EC`, `--color-surface-light-tonal #EDE9E0`, `--color-ink-on-light #0B0E14`, `--color-ink-on-light-muted rgba(11,14,20,.62)` (always-visible small text), `--color-ink-on-light-faded rgba(11,14,20,.40)` (aria-hidden decorative only, fails AA at 2.62), `--color-hairline-on-light rgba(11,14,20,.12)`, deep triplet `#B22B47 / #2A54B5 / #7A6800`. State the yellow rule exactly as A3 (passes 4.94:1; the small-text substitution is aesthetic). Name the three palette helpers: `accentFor` (raw, on-ink), `accentDeepFor` (on-light small text, yellow → muted), `accentDeepLargeFor` (on-light large/decorative, yellow → `#7A6800`) and the three row channels `--row-tint` / `--row-tint-deep` / `--row-tint-deep-large`.
3. **New bullet "Light chapter"**: `#chapter-light` wrapper in `Home.tsx` (Projects → Skills), scoped canonical-token inversion in `.chapter-light` (list the nine vars), inline `--row-tint*` are the one thing the scope cannot reach (hence the `.work-*` overrides), tonal rhythm (Projects cream, Archive tonal, Work cream, Stats cream, Skills tonal), the exit veil (`.chapter-exit-veil`, 30svh, `--color-surface-light → --bg`, aria-hidden, no text, a SIBLING after the wrapper, never inside it because its end stop reads `--bg`), the veil rules as explicit sentences ("no text ever sits in a veil band"; "the hero's 100svh `.hero-zone` is inviolable: the entry ramp is the shader's cream dissolve in the hero's lower 30svh, there is no CSS entry veil", pointer: `src/components/canvas/FluidWaves.tsx`, grep `dissolve`; `src/components/sections/Hero.tsx:217`), `theme-color` follows the nav flip (A4), body/html stay ink so overscroll edges are dark, and the contrast table (copy rows 1-14 above into CLAUDE.md in the same table shape as the Contact/Footer table).
4. **Selected Work stage bullet (line 33):** replace the stale parts: SectionHeading is gone from Projects, replaced by the whisper eyebrow `.stack-eyebrow` (`01 · selected work`, muted uppercase 0.18em tracking, numeral `--color-accent-pink-deep`); the title is Anton 400 `clamp(56px, 9vw, 150px)` line-height 0.95 ink, all spans stacked in one `inline-grid` cell with `place-self: center` (mixed 1-/2-line alignment), threshold matrix `255 −170`, `BLUR_CAP = 180`; the card is Shadway anatomy: white `#FFFFFF`, radius 16px, 1px `--color-hairline-on-light` border, 12px padding, `.stack-card-frame` 16/9.5 inset radius 10px on `--color-surface-light-tonal`, body row = `.stack-card-name` (Jakarta 700, ink) + `.stack-card-subtitle` (`year · tech`, muted) + `.stack-card-pill` (ink pill, cream `view` text, arrow `.stack-card-arrow` in raw `--row-tint`); geometry `SLOTS` y `12 / −16 / −44`, scale `1 / .95 / .9`, `EXIT_Y = 520`, `.stack-cards` `min(46vw, 620px)` at 620/448; shadow `0 24·s px 64·s px rgba(11,14,20, .14·s)`; two tint channels `--row-tint` (raw) and `--row-tint-deep` (deep, small-text-safe) set from `frontIndex`; cover field `stackCover` (1024×608 top-crop webp). DELETE the "view project bar keeps its own ink gradient" sentence.
5. **Anton fence:** one sentence in Typography: Anton (self-hosted, 400, latin + latin-ext, `font-display: swap`, preloaded) is used by the Selected Work title ONLY; Jakarta is the site voice.
6. **Nav bullet:** add `.nav--on-light` (ink links muted → ink on hover, deep-blue underline/dot, ink brand tile with cream text, scrolled bg `rgba(245,242,236,.85)` + light hairline), toggled by an IntersectionObserver on `#chapter-light` with `rootMargin -8% 0px -91% 0px` (the element changed, the band did not), re-armed via MutationObserver for the lazy chunk; `theme-color` swaps with it.
7. **Tonal sections bullet:** add the light equivalents.
8. **NO list:** replace "Light cream/sand theme" with "a light theme OUTSIDE the sanctioned chapter (the hero, Contact and Footer stay ink; no light variant of the nav outside `.nav--on-light`)". Add "Anton anywhere but the Selected Work title", "a CSS entry veil on the hero (the shader dissolve owns it)", and "the exit veil inside `#chapter-light`".
9. **WorkRow bullet:** "Reused verbatim by Archive and WorkExperience (expandable)"; add: inside the chapter WorkRow inverts via the scope only; the hover tint reads `--row-tint-deep-large`; `.workrow-index`/`.workrow-arrow` use the faded step (aria-hidden); the WorkExperience panel's `.work-*` marks read the deep channels.
10. Standing rule: unchanged, plus one clause: "the Plan B table in this file and `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` are the authority for the on-light pairs".

Prose rules: keep the doc's existing register; `·` as separator in any site copy quoted; no spaced ` — ` in reader-facing prose (the doc may keep its own existing dashes).

**Acceptance check:** `grep -n 'No light theme\|Light cream/sand theme\|bar keeps its own ink gradient' CLAUDE.md` returns nothing. `grep -oE 'chapter-light|accentDeepLargeFor|#7A6800|stack-eyebrow|EXIT_Y = 520|BLUR_CAP' CLAUDE.md | sort -u | wc -l` prints `6`. A `reviewer` (opus, low effort, read-only) reads the section against `src/index.css`, `Projects.tsx`, `GooeyTitle.tsx`, `stackMotion.ts`, `Header.tsx`, `Home.tsx` and reports zero factual mismatches.

**Boundaries:** only `## Design Direction`. Do not touch Architecture, Content Types, Code Standards, the checkbox-discipline section, or the Contact/Footer table.

- [ ] section rewritten per items 1-10
- [ ] both greps pass
- [ ] reviewer fact-check: zero mismatches (fix any, re-check)
- [ ] commit `docs(claude-md): Design Direction reflects the light chapter (Plan A as shipped + Plan B)`

---

### Task 9: Final verification + PR

**Files:**
- `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` — modify: fill the "T9 final" column under Baselines
- nothing else (the controller ticks the spec's Plan B TODO boxes at acceptance, outside this task)

**Work:** on a quiet AC machine: `npx tsc -b`, `npm run lint` (0 errors; the 4 warnings are pre-existing), `npm run test:unit`, the full serial e2e, then `npm run build` + `npx vite preview --port 4173` + `npm run perf:lh`. Compare to T1: e2e total = T1 total + 12 (six new tests × two projects, zero skipped); Lighthouse ≥ 89 and within 3 points of T1 (a larger drop is a finding: the chapter adds no assets, so investigate before calling it done). `git diff --stat e1d237e...HEAD -- src/components/sections/Contact.tsx src/components/layout/Footer.tsx src/components/canvas/FluidWaves.tsx` is empty. Push the branch, open the PR into `staging` with: what changed, the assumptions table (A1-A6) and their status, the contrast table, T7's codex registry line + log path, the disclosure that commits `1fa96f1..2e7ec5c` on the underlying branch carry a wrong `Claude Fable 5` trailer, and a manual-test rundown (the T7 script, as steps against `npx vite preview`). Then STOP: the three-leg review is Kevin's to trigger.

**Acceptance check:** every command output pasted in the PR body or the final report; all green; e2e count = T1 + 12; Lighthouse ≥ 89; the Contact/Footer diff-stat empty.

**Boundaries:** no merging. No spec TODO ticks. No `git add -A`.

- [ ] tsc, lint, unit, serial e2e: outputs captured, all green, count = T1 + 12
- [ ] build + preview + Lighthouse on AC: ≥ 89, recorded under Baselines
- [ ] Contact/Footer/FluidWaves diff-stat empty
- [ ] branch pushed; PR into `staging` opened with the body above; report to Kevin and stop

---

## Controller steps (outside the tasks; Kevin's session, not the implementer's)

- At T3 acceptance, with A3 confirmed: amend the spec's Tokens & contrast paragraph (the "Deep yellow cannot" sentence, spec ~148-152) to "deep yellow `#7A6800` passes 4.94:1 on cream; it is exempt from small text by aesthetic rule (reads dark-olive), large text and decoration use it". Otherwise T8 writes a CLAUDE.md that contradicts the spec.
- At T9 acceptance: tick the six Plan B TODO boxes in the spec.

## Self-review against the spec's Plan B TODO

| spec TODO | tasks |
|---|---|
| Archive, WorkExperience, Stats, Skills on the cream system, WorkRow anatomy/motion unchanged | T4, T5, T6; proven by T2 tests 3, 4, 6 + T7 items 3-5 |
| Exit veil below Skills; Contact/Footer byte-untouched; no hard edge | T5 (veil), T9 (diff-stat), T2 test 5 + T7 item 1 |
| Nav-on-light observer covers the whole chapter (flips at entry and exit only) | T5 (element retarget; veil outside so the exit flip is at Skills' bottom), T2 nav spec |
| Full-chapter contrast audit, every always-visible pair passes | the table (rows 1-14), T6 consumer audit, T7 legibility items |
| CLAUDE.md Design Direction rewritten; "no light theme" line replaced | T8 |
| Full verification suite green (unit, serial e2e, `tsc -b`, Lighthouse ≥ 89) | T1 (baseline), T9 (final) |

Spec items reinterpreted, with the reason: "extend the root margin to the whole chapter" → the observed element changes, the band does not (a rootMargin cannot express a chapter). "Focus-visible rings and skip-link styles inside the light chapter invert to ink" → delivered by the scope block, no explicit rule (T6 eyeballs it). "Each cream section paints itself" → Archive/Skills/Stats do (T4 canonical names inside the scope); Work relies on the wrapper, which is stricter than the spec's sliver rule, not looser. The spec's "theme-color swap if trivial" → it is trivial, so it ships (A4).
