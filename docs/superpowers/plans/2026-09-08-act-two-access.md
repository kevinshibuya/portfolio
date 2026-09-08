# Act two · Access implementation plan

**Goal:** Give the archive its accessible twin, the stream, inside the Selected Work scene's DOM; make it the visible archive without WebGL; retire the old Archive section, its toolbar, CSS, strings and tests; recompute the contrast table; measure act two on the rig; and rewrite the docs.
**Architecture:** One component, `Stream` (`src/components/sections/Stream.tsx`), renders every archive item year by year from pipeline 2's `archive` and `yearBlocks`. `Projects.tsx` mounts it in one of two states: hidden-but-focusable inside the pinned stage while the scene runs (the skip-link technique, generalised), or in normal flow under the four-article fallback when WebGL is missing or lost. Focus on a row drives the camera through pipeline 1's `scrollTargetFor(itemId)` over Lenis, exactly as a distant-card click does today. The nav link resolves `#archive` to the release beat through a pure helper both `Header.tsx` and `Home.tsx` call. Nothing in the frame loop changes; no React state is driven by scroll or focus.
**Spec:** `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` (sections "The stream", "Deletions", "Acceptance", "Records" are binding; settled decisions are not re-opened)
**Plan review:** pending · one wave (`reviewer` on opus, `reviewer` on fable, `codex-review` on sol), one fix pass, no second wave.
**Execution model:** opus. Every seam is named, every acceptance is a command, and the one derivation (the release-beat scroll target) is written out below.

## Global constraints

- `main` is FROZEN. This branch's PR targets `feat/act-two`, never `staging` or `main`. Merging into `feat/act-two` follows the spec's chain: only after PR 2 (`feat/act-two-wall`) is merged and closed, and after this branch rebases onto the new base.
- Branch `feat/act-two-access` forks from `feat/act-two-wall` at implementation time. Task 1 confirms the fork point and the seams before anything else.
- Typecheck is `npx tsc -b`. A bare `npx tsc --noEmit` is a no-op in this repo.
- Before any e2e run: `lsof -ti:4173 | xargs -r kill -9`.
- The verification set: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npx playwright test`. The rendered surface adds the headless smoke (Task 10 test 1 and `scene-scrub.spec.ts` test 1: it loads, the root renders, zero console errors).
- TypeScript strict, no `any`, explicit return types on hooks and utilities. Components functional, props interface above the component.
- Bilingual from the first commit: every new reader-facing string is a `{ en, pt }` pair or a pair of locale keys. `·` in reader-facing prose, never a spaced em-dash. Docs count as reader-facing.
- Every animation honours `prefers-reduced-motion`. The stream has no entrance animation; its only motion is the Lenis scroll on focus, which is instant when Lenis is null (reduced motion).
- No new dependency. No router and no DOM beyond the canvas element inside `src/components/canvas/`. No `overflow` or `position` on `#chapter-light`. No legacy alias read inside the chapter. No `--color-ink-on-light-faded` on always-visible text.
- The Anton fence holds: the stream is Plus Jakarta Sans throughout.
- Plan step boxes are ticked immediately after each step's command lands, never batched. No task in this plan ticks a spec TODO box; Task 15 says who does.
- Commit messages end with the session's `Co-Authored-By` and `Claude-Session` trailers.

## Seams expected from pipelines 1 and 2

Names exactly as the spec defines them. Task 1 verifies each one and records the actual name beside it in the table under "Seam reconciliation"; a rename is reconciled there, a missing seam is `blocked: <seam>` reported to the controller, never re-implemented here.

From pipeline 1 (`src/utils/sceneMotion.ts`, and the canvas element):

- `ACT_TWO_RELEASE_SVH = 100`, `ACT_TWO_APPROACH_SVH = 50`, `ACT_TWO_SVH_PER_COLUMN = 25`
- `actTwoSvh(columns: number): number`, `sceneWrapperSvh(columns: number): number` (`sceneWrapperSvh(22) === 1250`)
- `actTwoProgress(playhead: number): number`, `actTwoPose(u, frieze, geometry)`, `blockAt(u, frieze)`
- `scrollTargetFor(target: number | string, wrapperTop: number, wrapperHeight: number, viewportHeight: number): number`, where a string is an archive item id (the spec's "extended so a stream item's focus and a wall click can drive the camera")
- `data-act` on `canvas[data-canvas="selected-work-scene"]`: `"1"` before act two, `"2"` during it
- The act-one exports this plan already relies on, unchanged: `sceneGeometry`, `projectPoint`, `CAPTION_MIN_NAME_PX`

From pipeline 2 (`src/types/content.ts`, `src/data/archive.ts`, `src/utils/friezeLayout.ts`, `Projects.tsx`):

- `type Origin = 'professional' | 'freelance' | 'personal'`
- `ArchiveItem` with `id`, `title: string | Bilingual`, `origin`, `caseStudy?: { slug }`, `type?`, `editorial?`, `date`, `sortDate`, `year`, `href`, `internal`, `serial`; `resolveTitle(item, lang)` still exported
- `archive: ArchiveItem[]` (171 today) and `yearBlocks(items): { year: number; count: number; items: ArchiveItem[] }[]`, newest first
- `friezeLayout(items, rows)`, `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FRIEZE_ROWS_LANDSCAPE`, the portrait row constant pipeline 2 named, and the cell title's size constant in the `CAPTION_NAME_PX` convention (expected `CELL_TITLE_PX`)
- In `Projects.tsx`: the click decision for `onCellClick(itemId)`, which for a non-navigating click scrolls the item into the camera through `scrollTargetFor(itemId, …)` and Lenis. Task 6 reuses that exact scroll path for focus; if pipeline 2 inlined it, Task 6 extracts it into one local function called by both.

## Self-grilling

Kevin was not available; each open decision in this scope was grilled with its options and the recommended answer adopted. The adopted answers are the numbered Assumptions below, one line each, so the review wave can veto any of them. The reasoning per question:

1. **Hidden technique.** `.sr-only` clip on the container; the skip-link technique (rows at `left: -9999px`, the focused row becomes a fixed pill); `visibility: hidden` (not focusable); `inert` (not focusable). The skip-link technique is already proven on this page, escapes `.scene-sticky`'s `overflow: hidden` because a fixed element's containing block is the viewport, and shows a sighted keyboard user where they are.
2. **DOM placement.** Inside `.scene-inner` after the canvas wrap and the SR heading; a sibling after `.scene-scroll`; before the canvas. Inside the pinned stage: the browser's own focus scroll then targets the frame the camera moves in. A sibling after the wrapper would jump to the section's end on every Tab.
3. **Focus moves the page or only the camera.** There is no camera-only option: scroll is the playhead (ADR 0010) and a camera that left the playhead would break reversibility. Focus calls the same Lenis `scrollTo(target, { duration: 1.2 })` the distant-card click uses, instant when Lenis is null. This is not scroll-jacking: browsers already scroll to any focused element; the stream replaces that scroll with the equivalent for a canvas twin, once per focus, never on hover or blur.
4. **The browser's native focus scroll.** When focus enters from outside the pin, the browser first scrolls the stage into view, then Lenis moves to the item. Accepted: both moves go the same way, and the test asserts the final state.
5. **"The camera target attribute".** The spec names none. A new canvas attribute belongs to pipelines 1 and 2; `data-focus-target="<itemId>"` on `#archive`, written imperatively by `Projects.tsx`, plus `data-act="2"` on the canvas once the scroll settles, is testable and stays in this pipeline's files.
6. **Telling a screen reader the wall exists.** Only an `h2`; `h2` plus a total count plus year headings with counts; an SR-only paragraph about the wall. The canvas wrap is `aria-hidden`, so to a screen reader the stream IS the archive; the counts are the volume claim in words; no prose about the wall (description lines are absent by decision).
7. **Semantics.** `section#archive[aria-labelledby]`, `h2` "all work", a total line, one `h3` per year with its count, an `ol` of rows. On the visible state the year label is sticky at or above 900 px (the canvas), inline under it (the phone artboard).
8. **The serial.** The canvas draws it at the faded 0.40 step. `CLAUDE.md` forbids that step on always-visible text unless `aria-hidden`; the serial is the count claim, informational, so it is read and set at the muted step.
9. **Row hover on the visible state.** The canvas inverts the row and adds a tint bar; drafted before decision 11 and the "no rail or bar" line. The stream takes WorkRow's hover language instead: the title lifts to `--row-tint-deep-large`, no inversion, no bar. One hover vocabulary across the chapter.
10. **Arrow direction.** WorkRow renders `↗` for every link. It now derives `→` for an internal link and `↗` for an external one; no new prop. WorkExperience is the expandable variant (`+`) and is untouched.
11. **Dense-row date.** `dd.mm` (the year is the group heading), as the canvas draws it; the wall's cell keeps `dd.mm.yyyy`.
12. **Lowercasing editorial types.** CSS `text-transform: lowercase` on the meta, as `.workrow-meta` already does; the data stays as the CSV has it.
13. **Year count string.** i18next plural keys `sections.archive.pieces_one` / `pieces_other` (precedent: `routesCount_one`).
14. **No-WebGL composition.** The stream sits below the four-article fallback, inside `#projects`, on the section's own cream, with the 1440 px column and 80/20 px gutters `.scene-fallback` does not have. The four featured projects appear twice (a card with art, a row in the stream); the stream must count 171, so nothing is filtered.
15. **The nav link's target while the scene runs.** The END of the release beat (the volume shot), not its start (card four settled, which reads as Selected Work). Computed by a pure helper both `Header.tsx` and `Home.tsx` call; falls back to the `#archive` element when there is no `.scene-scroll` (no-WebGL). Under reduced motion the same target through the native instant path (Lenis is null).
16. **Deep-accent size for AA.** The smallest on-screen cell-title size at the approach end, derived in a unit test from pipeline 1 and 2 exports at 320×568, 390×844, 1440×900 and 1920×1080, asserted at or above `CAPTION_MIN_NAME_PX` (12 px), and the smallest value is written into the contrast row. Not guessed.
17. **Rig measurement.** Layer 2 scenarios that run today (`idle-hero`, `load-entrance`, `battery-proxy`; `scroll-transition` is issue #15), Layer 3 Lighthouse desktop and mobile, plus one headed act-two probe (`perf/act-two-probe.mjs`): `entranceDone` to `data-warm` in ms, the longest task across a full scrub, frame p50/p95 across the dolly. Base is the `staging` tip; after is this branch's head. Recorded in `perf/decisions.md` and this plan; no `--update-baseline` (a feature delta, not an optimisation batch, ADR 0007).
18. **Chunk byte ceilings.** The `Archive.js` key is removed, `Projects.js` and `WorkRow.js` re-measured, with the deltas in `perf/decisions.md`. The test is dormant behind `PERF_HARNESS=1` and still has to be true.
19. **First-paint cost.** The stream renders synchronously inside the Projects lazy chunk, which is idle-warmed after the hero; no extra deferral, because keyboard users Tab into it and the no-WebGL state needs it at mount. The embeds CSV moves from the Archive chunk into the Projects chunk, never into `index.js`; the chunk listing proves it.
20. **Phone verification.** Playwright's `mobile-chromium` (Pixel 5) runs every stream test; `stream.spec.ts` also checks the visible layout at 390×844, 360×800 and 320×568 (no horizontal overflow, two-line rows, inline year heading); then one `codex-computer-use` pass on the preview at 390×844 walks every beat and the focus path before the PR opens. The frieze row count blend is pipeline 2's; this pass verifies and never tunes.
21. **Old records.** The Archive section has no spec of its own; nothing moves to `docs/superpowers/archive/`. The architecture section is rewritten in place.
22. **Tonal rhythm.** With `#archive` inside `#projects` the chapter runs cream, cream, cream, tonal. Left as is, documented, flagged for Kevin (Spec conflicts, item 4).
23. **Skip links.** `nav.scene-skiplinks`, its CSS and `sections.projects.stack.indexLabel` go; the stream absorbs them.
24. **The focused pill.** Reuses the `.scene-skiplink:focus-visible` treatment: fixed, centred, 16 px under the top, `z-index: 120`, one line, `max-width: min(90vw, 720px)`, ellipsised; no transition.
25. **Tab order.** 171 rows precede Work Experience. Accepted by the spec's structure; no skip-past link added (flagged as a note, Spec conflicts item 5).
26. **Component home.** `src/components/sections/Stream.tsx`, rendered by `Projects.tsx`; the dense row is internal to that file; case-study rows are `WorkRow`.

## Assumptions

1. Hidden state uses the skip-link technique: rows offscreen at `left: -9999px`, the focused row becomes a fixed pill.
2. The stream mounts inside `.scene-inner`, after the canvas wrap and the SR heading.
3. Focus scrolls through Lenis (`duration: 1.2`), instant under reduced motion; there is no camera-only path.
4. The browser's own focus scroll is accepted before the Lenis move.
5. The proof of a camera move is `data-focus-target="<itemId>"` on `#archive` plus `data-act="2"` on the canvas.
6. A screen reader gets `h2` "all work", a total count line, and year headings with counts; no prose about the wall.
7. Markup: `section#archive[aria-labelledby]` > `h2` + total > per year `h3` + `ol`; sticky year label at or above 900 px on the visible state.
8. The serial is read (not `aria-hidden`) and set at the muted step, not the canvas's faded 0.40.
9. Visible-state hover is WorkRow's: title lifts to `--row-tint-deep-large`; no inversion, no bar.
10. WorkRow derives the arrow: `→` internal, `↗` external; no new prop.
11. Dense-row date is `dd.mm`.
12. Editorial type and editorial are lowercased by CSS.
13. Year counts use `sections.archive.pieces_one` / `pieces_other`.
14. Without WebGL the stream sits below the four-article fallback, all 171 rows, on cream, in the 1440 column.
15. The nav link lands at the END of the release beat via a pure helper shared by `Header.tsx` and `Home.tsx`; element fallback without WebGL; instant under reduced motion.
16. The deep-accent AA size is derived by a unit test from pipeline 1 and 2 exports and asserted at or above 12 px.
17. Rig measurement is the three running Layer 2 scenarios, Lighthouse, and one headed act-two probe; base `staging`, after this branch; no baseline update.
18. `chunkBytesCeiling` loses `Archive.js`, re-measures `Projects.js` and `WorkRow.js`, recorded as a feature delta.
19. The stream renders synchronously in the Projects chunk; no extra deferral.
20. Phone pass is Playwright `mobile-chromium` plus three explicit viewports plus one `codex-computer-use` walk at 390×844.
21. Nothing moves to `docs/superpowers/archive/`.
22. The tonal rhythm change (cream, cream, cream, tonal) is documented, not fixed.
23. Skip links, their CSS and `stack.indexLabel` are deleted.
24. The focused pill reuses the skip-link pill treatment, one line, ellipsised, no transition.
25. No skip-past link is added.
26. The component is `src/components/sections/Stream.tsx`; case-study rows are `WorkRow`.

## Spec conflicts

1. **"Focusing a row changes the camera target attribute"** names an attribute nothing defines. Resolution: assumption 5. If pipeline 1 shipped an attribute for the camera target, Task 1 records it and Task 10 asserts that one as well.
2. **The design canvas predates the spec** on three points: an origin toggle (decision 5 says no toggle), an inverted hovered row with a tint bar (decision 11 and the absent-by-decision list), and a faded serial (`CLAUDE.md` NO list). Resolution: the spec and `CLAUDE.md` win; assumptions 8 and 9; the toggle is not built.
3. **`light-chapter.spec.ts` test 2 asserts five chapter children** including `#archive`, and the architecture's light-chapter section says the same. The spec puts `id="archive"` on the stream, inside `#projects`. Resolution: four children, `#archive` asserted as a descendant of `#projects`; docs updated in Task 13.
4. **Tonal rhythm.** The retired Archive was the chapter's tonal step between two cream sections. Its removal leaves cream, cream, cream, tonal. Out of this pipeline's scope to re-tint Work Experience or Stats; documented as the current state in Task 13 and flagged here for Kevin's manual pass.
5. **Tab length.** Absorbing the skip links into 171 rows makes the keyboard path through the section 171 stops long. The spec settles the structure; a skip-past link is not in it and is not added. Flagged for Kevin.
6. **`section-enters.spec.ts` and `reduced-motion.spec.ts` assert `#archive .section-title`.** The stream's heading is not a `SectionHeading` (no `.section-title`, no `.section-desc`: decision 16 and the absent list). Resolution: those assertions move to `#work`, and the stream heading is asserted by text in Task 10.

## Seam reconciliation

Filled by Task 1. Expected name, actual name, file, note.

| Expected | Actual | File | Note |
| --- | --- | --- | --- |
| `scrollTargetFor(target: number \| string, …)` | | | |
| `sceneWrapperSvh`, `actTwoSvh`, `ACT_TWO_RELEASE_SVH` | | | |
| `data-act` on the canvas | | | |
| `archive`, `yearBlocks` | | | |
| `ArchiveItem.serial`, `.origin`, `.caseStudy`, `.year` | | | |
| `friezeLayout`, `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FRIEZE_ROWS_LANDSCAPE`, portrait rows | | | |
| cell title size constant | | | |
| `Projects.tsx` cell-click scroll path | | | |
| `actTwoPose`, `blockAt`, `actTwoProgress` | | | |

---

### Task 1: fork, seams, starting state

**Files:**
- `docs/superpowers/plans/2026-09-08-act-two-access.md` — modify: fill "Seam reconciliation"; nothing outside this list

**Interfaces:**
- Consumes: everything under "Seams expected from pipelines 1 and 2".
- Produces: the reconciliation table every later task reads before importing.

**Work:** Fork the branch from the merged base, then prove each seam exists by grep and by a one-line `tsc` probe, not by reading. Record the actual names. Run the full verification set once on the untouched base so a later red is attributable. If a seam is missing, write `blocked: <seam>` in the table's note column and stop the pipeline there.

**Acceptance check:** every row of the table has an actual name or a `blocked` note; the base verification set's summary lines are pasted under the table.

**Boundaries:** No source change. No renaming of anything pipeline 1 or 2 shipped.

- [ ] `git fetch origin && git switch feat/act-two-wall && git pull --ff-only && git switch -c feat/act-two-access` (if `feat/act-two-access` already exists with only this plan commit: `git rebase feat/act-two-wall` instead)
- [ ] `grep -n "export" src/utils/sceneMotion.ts | grep -i "act_two\|actTwo\|sceneWrapperSvh\|blockAt\|scrollTargetFor"` and `grep -rn "dataset.act\b\|data-act" src/components/canvas` → fill rows 1 to 3 and 9
- [ ] `grep -n "export" src/data/archive.ts src/types/content.ts src/utils/friezeLayout.ts` and `grep -n "scrollTargetFor\|onCellClick\|lenis.scrollTo" src/components/sections/Projects.tsx` → fill rows 4 to 8
- [ ] Probe the signature: `printf 'import { scrollTargetFor } from "./src/utils/sceneMotion"\nconst y: number = scrollTargetFor("editorial-0", 0, 1000, 800)\nvoid y\n' > /tmp/seam.ts && npx tsc --noEmit --strict --target es2022 --moduleResolution bundler /tmp/seam.ts` → exit 0, or record the real signature
- [ ] `npx tsc -b && npm run lint && npx vitest run` and `lsof -ti:4173 | xargs -r kill -9; npx playwright test` on the untouched base; paste the summary lines under the table
- [ ] Commit `docs(plan): act-two access seams reconciled`

### Task 2: archive data test for the new item shape

**Files:**
- `tests/unit/data/archive.test.ts` — modify or rewrite: the spec's four data assertions; nothing outside this list

**Interfaces:**
- Consumes: `archive`, `yearBlocks` from `src/data/archive.ts`; `projects` from `src/data/projects.ts`.
- Produces: nothing.

**Work:** Pipeline 2 changed the shape; whatever it left in this file, the file must end up asserting exactly: `serial` is `archive.length` at index 0 and 1 at the last index, contiguous and strictly descending; every item has an `origin` and the default is `professional`; the item whose `caseStudy.slug` is `hotmart-bunde` is `freelance`; `yearBlocks(archive)` counts sum to `archive.length`, years strictly descending, and each block's `items` all carry that year. Drop every assertion about `kind`, `archiveTypes`, `archiveEditorials`, `archiveYears`, `archiveKinds`, `byFeatured`, `gradient`. Keep the existing sort and link-direction assertions, rewritten on `caseStudy` and `internal`. Do not hardcode 171; assert relations.

**Acceptance check:** `npx vitest run tests/unit/data/archive.test.ts` → green, and a deliberate edit of one `serial` in a local copy of the array (not committed) turns the contiguity test red.

**Boundaries:** `src/data/archive.ts` and `src/types/content.ts` are pipeline 2's; no edit.

- [ ] Rewrite the file per Work
- [ ] `npx vitest run tests/unit/data/archive.test.ts` green; commit `test(data): archive items carry serial, origin, year blocks`

### Task 3: strings

**Files:**
- `src/i18n/locales/en.json` — modify: `sections.archive`, `sections.projects.stack`
- `src/i18n/locales/pt.json` — modify: the same keys; nothing outside this list

**Interfaces:**
- Produces: `sections.archive.title` (unchanged: `all work` / `todos os trabalhos`), `sections.archive.pieces_one` (`{{count}} piece` / `{{count}} peça`), `sections.archive.pieces_other` (`{{count}} pieces` / `{{count}} peças`). Nothing else: the stream has no lede and no label string (assumption 6).

**Work:** Delete `sections.archive.description`, `sections.archive.toolbar.*`, `sections.archive.sort.*` in both files. Delete `sections.projects.stack.indexLabel` in both (the skip links go in Task 6); keep `viewProject` (the fallback uses it). Add the plural pair. Both files change in the same commit.

**Acceptance check:** `node -e "const e=require('./src/i18n/locales/en.json'),p=require('./src/i18n/locales/pt.json');const k=o=>Object.keys(o).sort().join();console.log(k(e.sections.archive)===k(p.sections.archive), k(e.sections.projects.stack)===k(p.sections.projects.stack), e.sections.archive.pieces_other)"` → `true true {{count}} pieces`. `npx vitest run tests/unit/seo` green.

**Boundaries:** No other key. No `SectionHeading` string.

- [ ] Edit both locale files
- [ ] Run the check; commit `i18n(archive): toolbar and sort strings go, year counts arrive`

### Task 4: WorkRow loses the float and the ornament, learns the arrow direction

**Files:**
- `src/components/ui/WorkRow.tsx` — modify
- `tests/unit/WorkRow.test.tsx` — modify: one new case for the arrow
- `tests/unit/WorkRow.float.test.tsx` — delete
- `src/index.css` — modify: the WORKROW block only (`.workrow-ornament`, `.workrow-thumb`, `.workrow-thumb img`, `.workrow-float`, `.workrow-float-inner`, `.workrow-float-inner img`, the `@media (hover: none)` and `@media (prefers-reduced-motion: reduce)` blocks that exist only for them, and `.chapter-light .workrow-float-inner` in the LIGHT CHAPTER block); nothing outside this list

**Interfaces:**
- Produces: `WorkRowProps` without `preview` and `ornament`; `WorkRowPreview` no longer exported. Arrow glyph: `expandable ? '+' : isInternal ? '→' : '↗'`.

**Work:** Remove `WorkRowPreview`, `preview`, `ornament`, `canHoverFine`, the MotionValue and spring state, `WorkRowFloat`, `hoverHandlers`, the thumb span. The `framer-motion` import shrinks to what the expandable panel needs (`AnimatePresence`, `motion`); `useState` goes if nothing else uses it. Keep `--row-tint*` on the root, `internal`, the expandable variant and its focus ring untouched. Update the module comment: the row is used by Work Experience and by the stream's case-study rows.

**Acceptance check:** `npx vitest run tests/unit/WorkRow.test.tsx` green with the new case (`href="/projects/x"` renders `→`, `href="https://…"` renders `↗`); `grep -c "workrow-float\|workrow-thumb\|workrow-ornament" src/index.css src/components/ui/WorkRow.tsx` → `0` for both files; `npx tsc -b` clean (`Archive.tsx` still compiles until Task 8 because it passes `preview` and `ornament`: if `tsc` is red only on `Archive.tsx`, that is expected and Task 8 clears it; note it in the commit body).

**Boundaries:** No change to `.workrow-title`, `.workrow-meta`, `.workrow-index`, `.workrow-arrow` rules, or the light-chapter hover lift.

- [ ] Edit `WorkRow.tsx`; delete the float test; add the arrow case
- [ ] Remove the CSS rules; `grep` shows 0
- [ ] `npx vitest run tests/unit/WorkRow.test.tsx` green; commit `refactor(workrow): the float and the ornament go, the arrow points the way the link goes`

### Task 5: the Stream component and its CSS

**Files:**
- `src/components/sections/Stream.tsx` — create
- `src/index.css` — modify: add a `STREAM` block where the two ARCHIVE blocks were (the blocks themselves are deleted in Task 8; this task adds, Task 8 removes); keep the existing `#archive .workrow-title { font-size: clamp(20px, 2.6vw, 34px); }` rule by moving it into the new block; nothing outside this list

**Interfaces:**
- Consumes: `archive`, `yearBlocks` (`src/data/archive.ts`), `resolveTitle`, `ArchiveItem` (`src/types/content.ts`), `WorkRow`, `accentFor`/`accentDeepFor`/`accentDeepLargeFor` (`src/utils/palette.ts`) for dense rows, `useTranslation`.
- Produces:

```ts
export interface StreamProps {
  /** 'hidden' while the scene runs (focusable, offscreen); 'visible' without WebGL. */
  mode: 'hidden' | 'visible'
  /** Fires on focus of a row, with the archive item id. Undefined in 'visible' mode. */
  onRowFocus?: (itemId: string) => void
}
export function Stream(props: StreamProps): React.ReactElement
```

Markup contract (Task 10 selects on these):

```
section#archive.stream.stream--hidden|stream--visible[aria-labelledby="archive-title"]
  header.stream-header
    h2#archive-title.stream-title      → t('sections.archive.title')
    p.stream-total                     → t('sections.archive.pieces', { count: archive.length })
  div.stream-year[data-year="2026"]    (one per year block, newest first)
    h3.stream-year-label               → "2026" + span.stream-year-count → t('sections.archive.pieces', { count })
    ol.stream-list
      li.stream-item[data-item-id][data-serial][data-origin]
        (case study)  WorkRow index={serialIndex} title meta=[origin word only when not professional] href internal
        (editorial)   a.stream-row[href][target=_blank][rel=noreferrer]
                        span.stream-serial (tabular, muted)
                        span.stream-body
                          span.stream-row-title   (title, two lines max, ellipsis)
                          span.stream-row-meta    (type · editorial · dd.mm, lowercase by CSS, `·` spans like .workrow-meta-item)
                        span.stream-row-arrow[aria-hidden] ↗
```

**Work:** One data pass: `yearBlocks(archive)`. `WorkRow` takes `index = archive.length - item.serial` (the item's position in the whole stream, 0 for the newest) so its `--row-tint*` rotation runs down the list. Its own `.workrow-index` would show the position, not the serial, so the serial is rendered once per `li` as `span.stream-serial` before the row for BOTH row kinds, and WorkRow's index is hidden on stream rows with `.stream .workrow-index { display: none }`; WorkRow itself is not changed for this. Dense rows set `--row-tint`, `--row-tint-deep`, `--row-tint-deep-large` inline exactly as WorkRow does, from the same position index, so the hover lift reads `--row-tint-deep-large` in the chapter. The date `dd.mm` is derived from `item.date` (`dd/mm/yyyy` for editorial). Origin word: `item.origin` verbatim as the WorkRow `meta` (the words `freelance` and `personal` are the same in both languages; `professional` never shows). `onRowFocus` is wired with `onFocus` on the `WorkRow` wrapper `li` (focus bubbles) and on `a.stream-row`; it fires with `item.id`; no state.

CSS contract, all canonical tokens, every colour pair listed in Task 11:

- `.stream--hidden { position: absolute; left: -9999px; top: 0; width: 1px; height: 1px; overflow: visible; }` and `.stream--hidden .stream-row, .stream--hidden .workrow-link { position: absolute; left: -9999px; }`; `.stream--hidden :is(.stream-row, .workrow-link):focus-visible` takes the pill: `position: fixed; left: 50%; top: 16px; transform: translateX(-50%); z-index: 120; max-width: min(90vw, 720px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 8px 16px; border-radius: 999px; border: 1px solid var(--hairline); background: var(--bg); color: var(--text); outline: 2px solid var(--text); outline-offset: 2px; font-size: 14px;` with `.stream-row-meta` and the arrow hidden inside the pill, title shown. Reduced motion: nothing animates.
- `.stream--visible { width: min(1440px, 100% - 160px); margin: 96px auto 0; }` and under 720 px `width: calc(100% - 40px)`. Header: title `clamp(56px, 11.6vw, 168px)`, weight 550, `letter-spacing: -0.035em`, `line-height: 0.86`, lowercase; total at 13 px muted. Year block: grid `160px minmax(0, 1fr)` with `gap: 0 40px`, top hairline, `padding-top: 34px`, `margin-top: 56px`; the label column `position: sticky; top: 120px; align-self: start` at or above 900 px, and a single inline row (`h3` with the count beside it) below 900 px. Year label 34 px weight 300 (28 px on phones), count 13 px muted.
- Dense row: `display: flex; align-items: flex-start; gap: clamp(16px, 2.4vw, 34px); padding: 15px 0; border-bottom: 1px solid var(--hairline)`; serial `width: 48px` (32 px on phones), 13 px (11 px), tabular, `color: var(--text-muted)`; title 17 px (16 px) weight 500, `line-height: 1.25`, two-line clamp (`display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`); meta 13 px (12 px) muted, lowercase; arrow 18 px muted, `margin-left: auto`. Hover and `:focus-within` on the visible state: `.stream-row-title { color: var(--row-tint-deep-large) }` and the arrow to `var(--text)`, mirroring the chapter's WorkRow rule. Focus ring on the visible state: `outline: 2px solid var(--text); outline-offset: 4px; border-radius: 4px` (WorkRow's).
- `.stream .workrow-index { display: none }`, `.stream .workrow-link { padding: 22px 0 }` on phones (34 px desktop is WorkRow's default).

**Acceptance check:** `npx tsc -b` clean once Task 6 mounts it (this task alone: the file compiles in isolation with `npx tsc -b`, since an unimported module is still type-checked by the project reference). Rendering is asserted in Task 10.

**Boundaries:** No import from `src/components/canvas/`. No router hook (WorkRow's `Link` is fine). No React state. No Framer Motion in this file.

- [ ] Write `Stream.tsx` to the contract
- [ ] Add the STREAM CSS block with the moved `#archive .workrow-title` rule
- [ ] `npx tsc -b` and `npm run lint` clean; commit `feat(stream): the archive's accessible twin, year by year`

### Task 6: the stream inside the scene section; the skip links go

**Files:**
- `src/components/sections/Projects.tsx` — modify
- `src/pages/Home.tsx` — modify: remove the `Archive` lazy import, the idle warm line and the `<Archive />` element
- `src/index.css` — modify: delete `.scene-skiplinks`, `.scene-skiplink`, `.scene-skiplink:focus-visible`; nothing outside this list

**Interfaces:**
- Consumes: `Stream`, `scrollTargetFor(itemId, wrapperTop, wrapperHeight, viewportHeight)` (pipeline 1), the Lenis instance from `useLenisContext`, and pipeline 2's cell-click scroll path in this file.
- Produces: one local `scrollToItem(itemId: string): void` used by both the cell click that does not navigate and the stream focus; `data-focus-target` written on `#archive` imperatively; `Stream` mounted in both states.

**Work:** Delete the `nav.scene-skiplinks` block and its `t('sections.projects.stack.indexLabel')`. In the running-scene branch, render `<Stream mode="hidden" onRowFocus={handleRowFocus} />` inside `div.scene-inner`, after `h2.scene-title-sr`. In the fallback branch, render `<Stream mode="visible" />` after `div.scene-fallback`, still inside `section#projects`. `handleRowFocus` is a stable `useCallback` that calls a ref-held function (the `cardClick.current` pattern already in the file): it sets `document.getElementById('archive')?.setAttribute('data-focus-target', itemId)` via a ref to the section, then calls `scrollToItem(itemId)`. `scrollToItem` computes `wrapperTop`, `wrapper.offsetHeight`, `window.innerHeight`, calls `scrollTargetFor(itemId, …)`, then `lenis.scrollTo(target, { duration: 1.2 })` or `window.scrollTo({ top: target, behavior: 'instant' })`. If pipeline 2's cell click already has this body, extract it and call it from both places; the two paths must be one function.

**Acceptance check:** `npx tsc -b` and `npm run lint` clean; `grep -rn "scene-skiplink\|indexLabel\|sections/Archive" src` → no output; the dev server shows `#archive` inside `#projects .scene-inner` (`document.querySelector('#projects .scene-inner #archive')` non-null in the console), and `document.querySelectorAll('#archive li.stream-item').length === 171`.

**Boundaries:** No change to `SelectedWorkScene` props. No React state on focus. The `cards` memo and the scene subtree's identity are untouched (`data-registrations` stays `1`; Task 9 asserts it).

- [ ] Edit `Projects.tsx`, `Home.tsx`; delete the skip-link CSS
- [ ] Run the greps and the two console checks on the dev server
- [ ] Commit `feat(scene): the stream lives in the scene section; the skip links are absorbed`

### Task 7: the nav link lands on the release beat

**Files:**
- `src/utils/navTarget.ts` — create
- `tests/unit/navTarget.test.ts` — create
- `src/components/layout/Header.tsx` — modify: `go()` only
- `src/pages/Home.tsx` — modify: the off-route `apply()` only; nothing outside this list

**Interfaces:**
- Consumes: `sceneWrapperSvh`, `actTwoSvh`, `ACT_TWO_RELEASE_SVH` (pipeline 1); `friezeLayout`, `FRIEZE_ROWS_LANDSCAPE` (pipeline 2) or, if pipeline 1 exposes the column count some other way, that.
- Produces:

```ts
/** Scroll progress (0..1 of the wrapper's scrub range) at the END of the release beat. */
export function releaseBeatProgress(columns: number): number
/** The document scrollY for that progress, for a wrapper at wrapperTop with the given heights. */
export function releaseBeatScrollY(columns: number, wrapperTop: number, wrapperHeight: number, viewportHeight: number): number
/** What the nav's `#<id>` should scroll to on Home: a number for `archive` while `.scene-scroll` exists, else the selector. */
export function resolveNavTarget(id: string, doc: Document, viewportHeight: number, columns: number): number | string
```

Derivation, binding: the wrapper's scrub range is `sceneWrapperSvh(c) − 100` svh; act one's share of it is `sceneWrapperSvh(c) − actTwoSvh(c) − 100` (450 today); the release ends `ACT_TWO_RELEASE_SVH` past that; so `releaseBeatProgress(c) = (sceneWrapperSvh(c) − actTwoSvh(c) − 100 + ACT_TWO_RELEASE_SVH) / (sceneWrapperSvh(c) − 100)`, which at `c = 22` is `550 / 1150 ≈ 0.4783`. `releaseBeatScrollY = wrapperTop + progress × (wrapperHeight − viewportHeight)`, the same mapping `scrollTargetFor` uses. `resolveNavTarget('archive', …)` reads `#projects .scene-scroll`; when present it returns the number, otherwise `'#archive'`; any other id returns `'#' + id`. The column count comes from `friezeLayout(archive, FRIEZE_ROWS_LANDSCAPE).columns`, computed once at module load in the callers (portrait rows change the count by aspect; the release beat's scroll position is a share of the wrapper and the wrapper's inline height is what the scene set, so read `wrapper.offsetHeight`, never recompute it).

**Work:** `Header.go(id)` on Home calls `scrollTo(resolveNavTarget(id, document, window.innerHeight, columns), { duration: 1.2 })`; `useLenis().scrollTo` already accepts a number and already falls back to native instant scroll when Lenis is null (reduced motion). `Home.apply()` does the same with `duration: 0.8`; its existing ResizeObserver poll keeps trying until `.scene-scroll` exists, so the resolver sees the wrapper.

**Acceptance check:** `npx vitest run tests/unit/navTarget.test.ts` → green on: `releaseBeatProgress(22)` within `1e-9` of `550/1150`; `releaseBeatScrollY(22, 1000, 11500, 1000)` equals `1000 + (550/1150) × 10500`; `resolveNavTarget('archive', docWithoutWrapper, …)` is `'#archive'`; `resolveNavTarget('work', …)` is `'#work'`. The e2e is Task 10 test 5.

**Boundaries:** No change to `useLenis`. No new attribute on the nav.

- [ ] Write the util and its test; red first, then green
- [ ] Wire `Header.tsx` and `Home.tsx`
- [ ] `npx tsc -b && npm run lint` clean; commit `feat(nav): all work lands on the release beat`

### Task 8: deletions

**Files:**
- `src/components/sections/Archive.tsx` — delete
- `src/components/ui/ArchiveDropdown.tsx` — delete
- `src/index.css` — modify: delete the `ARCHIVE DROPDOWN` block and the `ARCHIVE — toolbar, chips, list` block entirely (the `#archive .workrow-title` rule already moved in Task 5), and `.chapter-light .archive-dropdown-list`; nothing outside this list

**Work:** Delete, then prove nothing references what was deleted.

**Acceptance check:** `grep -rn "archive-\|ArchiveDropdown\|sections/Archive\|archive-search\|archive-chip\|archive-count\|archive-star\|archive-more\|archive-list\|archive-toolbar" src tests --include='*.ts' --include='*.tsx' --include='*.css'` → no output (`data-*` attributes named `archive` in Task 5 are `stream-*`, so this grep is clean by construction); `npx tsc -b && npm run lint && npx vitest run` green.

**Boundaries:** `src/data/embeds.ts` (`typeGradients`) and the content types are pipeline 2's; if `typeGradients` is now unused, note it in the PR description, do not delete it here.

- [ ] Delete the two files and the CSS blocks
- [ ] Run the grep and the three commands; commit `chore(archive): the old section, its toolbar and its CSS go`

### Task 9: existing e2e specs rewritten for the stream

**Files:**
- `tests/e2e/light-chapter.spec.ts` — modify: tests 2, 3, 4, 6
- `tests/e2e/section-enters.spec.ts` — modify: the id list
- `tests/e2e/reduced-motion.spec.ts` — modify: the selector
- `tests/e2e/nav-on-light.spec.ts` — modify: the `archive` scroll and the skip-link path
- `tests/e2e/scene-no-webgl.spec.ts` — modify: add the stream assertions
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: add one assertion
- `tests/e2e/scene-scrub.spec.ts` — modify: the two skip-link usages; nothing outside this list

**Work, per file:**

- `light-chapter`: test 2 expects `['projects', 'work', 'stats', 'skills']` and adds `await expect(page.locator('#projects #archive')).toHaveCount(1)`. Test 3 drops the `#archive` tonal line (the stream sits on `#projects`' cream). Test 4 moves the WorkRow colour reads to `#work .workrow-*` (`#work` rows exist and invert the same way; the expandable arrow assertion becomes the one that matters there). Test 6 reads `--row-tint-deep-large` from `#work .workrow` (three rows exist) and hovers there.
- `section-enters`: the list becomes `['#work', '#skills', '#contact']`; add one test that `#archive .stream-title` has text matching `/all work|todos os trabalhos/` after `#projects` mounts (no opacity assertion: the heading is offscreen, not faded).
- `reduced-motion`: the selector becomes `#work .section-title`.
- `nav-on-light`: replace `scrollIntoSection(page, 'archive', 0.3)` with `scrollToSceneFraction(page, 0.5)` (inside act two, still the pinned cream stage) and keep the on-light expectations; the second test's skip-link path becomes the first stream case-study row: `page.locator('#archive .stream-item .workrow-link').first()`, `focus()`, `Enter`, same URL assertion.
- `scene-no-webgl`: after the existing four assertions add `await expect(page.locator('#projects #archive.stream--visible')).toHaveCount(1)`, `await expect(page.locator('#archive li.stream-item')).toHaveCount(171)`, `await expect(page.locator('#archive input, #archive select, #archive [role="listbox"], #archive button')).toHaveCount(0)` (no toolbar), and keep `expect(errors).toEqual([])`. Read 171 as `archive.length` imported from `src/data/archive` so the test follows the data.
- `scene-reduced-motion`: add `await expect(page.locator('#archive li.stream-item')).toHaveCount(archive.length)` before the pin assertion.
- `scene-scrub`: "clicking the settled card opens its project" reads `href` from `#archive .stream-item .workrow-link` whose `href` matches the settled card's slug (`cards[0]` is the first featured project; take `href` from the row with `[data-item-id]` matching pipeline 2's id for that project, or simply the first `.workrow-link` whose href ends with the featured slug read from `projects`); "the project index skip-link navigates" becomes "a stream row navigates to its project": focus the first `.workrow-link` in `#archive`, `Enter`, URL matches. The full-scrub SWEEP already covers the enlarged wrapper because it scrolls by fraction; add `1` is already in the list; also assert `data-act` is `'1'` at `0.3333` and `'2'` at `1` in the "swaps the settled slot" test.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/light-chapter.spec.ts tests/e2e/section-enters.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/nav-on-light.spec.ts tests/e2e/scene-no-webgl.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/scene-scrub.spec.ts` → all passed on both projects (the list reporter's final `N passed` line, zero `failed`).

**Boundaries:** No new spec file here (Task 10). No change to `pixel-gate.spec.ts` or its goldens.

- [ ] Rewrite the seven files
- [ ] Kill 4173, run the seven specs, green on both projects; commit `test(e2e): the archive is the stream`

### Task 10: `stream.spec.ts`, the acceptance for this pipeline

**Files:**
- `tests/e2e/stream.spec.ts` — create; nothing outside this list

**Interfaces:**
- Consumes: `archive`, `yearBlocks` from `src/data/archive.ts`; `releaseBeatProgress` from `src/utils/navTarget.ts`; `friezeLayout`, `FRIEZE_ROWS_LANDSCAPE` from `src/utils/friezeLayout.ts`.

**Work:** Seven tests. Use the `openScene` and `scrollToFraction` helpers copied from `scene-scrub.spec.ts` (no shared helper module exists; do not introduce one).

1. **Smoke.** Go to `/`, wait for the loader, wait for `#projects .scene-canvas-wrap[data-ready="true"]`; `#root` (or whatever `index.html` mounts on: read it) is non-empty; zero console errors and page errors across the load and one scroll to the bottom.
2. **171 rows, sums.** `#archive li.stream-item` count equals `archive.length`; for each `.stream-year`, the `data-year` and the count in `.stream-year-count` match `yearBlocks(archive)`; the counts sum to `archive.length`; the first row's `data-serial` is `archive.length` and the last's is `1`.
3. **Origin.** Every `li[data-origin="freelance"] .workrow-meta` contains `freelance`; no `li[data-origin="professional"] .workrow-meta` exists; `li[data-origin="freelance"]` count is at least 1.
4. **Focus moves the camera.** `openScene`, `scrollToFraction(0.3333)`, `data-act` is `'1'`; focus the LAST `a.stream-row` (oldest editorial piece) with `.focus()`; expect `#archive` to have `data-focus-target` equal to that row's `li[data-item-id]`; expect the canvas `data-act` to be `'2'` within 4000 ms; the focused row is visible as the pill: its bounding box has `y < 80` and `x > 0` (fixed pill at the top), `getComputedStyle(el).position === 'fixed'`.
5. **The nav link lands on the release beat.** `openScene`, click `header .nav-link[href="#archive"]`; within 4000 ms `window.scrollY` is within 2 px of `wrapperTop + releaseBeatProgress(columns) × (wrapper.offsetHeight − innerHeight)` where `columns = friezeLayout(archive, FRIEZE_ROWS_LANDSCAPE).columns` on the desktop project (on `mobile-chromium`, read the column count from the wrapper's height instead: `columns = (wrapper.offsetHeight / innerHeight × 100 − 550) / 25`, rounded, since portrait rows change it); `data-act` is `'2'`.
6. **Reduced motion.** `test.use({ contextOptions: { reducedMotion: 'reduce' } })` in a describe: the stream has `archive.length` rows; clicking the nav link puts `window.scrollY` at the same target immediately (no Lenis: `waitForTimeout(100)` then assert within 2 px).
7. **Phone layout without WebGL.** With the `webgl2` refusal init script from `scene-no-webgl.spec.ts`, for each of `[390, 844], [360, 800], [320, 568]`: `setViewportSize`, reload, `#archive.stream--visible` present, `document.documentElement.scrollWidth <= innerWidth + 1` (no horizontal overflow), the first `.stream-year-label`'s box is above the first `.stream-item`'s box and spans the column (inline heading, not sticky side column: `getComputedStyle(label).position !== 'sticky'`), and the first `a.stream-row .stream-row-meta` sits below `.stream-row-title` (two-line row: `meta.top >= title.bottom - 1`).

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/stream.spec.ts` → `14 passed` (7 × 2 projects).

**Boundaries:** No change to app code from this task; a red here that needs app code goes back to the task that owns the file.

- [ ] Write the seven tests; observe test 4 red against a build without Task 6 (or with `onRowFocus` stubbed) at least once, then green
- [ ] Kill 4173, run, `14 passed`; commit `test(e2e): the stream is the accessible twin`

### Task 11: contrast, recomputed as a unit

**Files:**
- `tests/unit/friezeLegibility.test.ts` — create
- `docs/contrast.md` — modify: the light-chapter table gains rows 16 to 20 and rows 1, 2, 9, 10, 14 lose their Archive references; nothing outside this list

**Interfaces:**
- Consumes: `actTwoPose`, `actTwoProgress`, `sceneGeometry`, `projectPoint`, `CAPTION_MIN_NAME_PX` (pipeline 1), `friezeLayout`, `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FRIEZE_ROWS_LANDSCAPE`, the portrait row constant, the cell title size constant (pipeline 2).

**Work, the size:** the test computes, at the END of the approach beat (`u` = the approach's end in `actTwoProgress` units; read pipeline 1's beat boundaries, do not hardcode), the projected width in CSS px of one cell (`projectPoint` of the cell's left and right edges through `actTwoPose`'s camera at that `u`) for viewports `320×568`, `390×844`, `1440×900`, `1920×1080`, then the title px as that width × (cell title px ÷ the cell's design width, the same convention `CAPTION_NAME_PX / CARD_MAX_PX` uses). It asserts each is at or above `CAPTION_MIN_NAME_PX` and prints the four values with `console.info` so the smallest goes into the table. If the approach-end frame has the camera off-axis so the newest block is not the smallest visible cell, take the smallest cell in frame; document the choice in the test's comment.

**Work, the table:** the formula is WCAG 2.x relative luminance, `L = 0.2126 R + 0.7152 G + 0.0722 B` with each channel linearised (`c/12.92` under 0.03928, else `((c + 0.055)/1.055)^2.4`), ratio `(L1 + 0.05)/(L2 + 0.05)`; alpha colours composited on the ground first. Verify every number with the one-liner below before writing it. Rows to add, ground cream `#F5F2EC` unless noted:

| # | pair | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 16 | wall cell title, professional → ink `#0B0E14` (rasterised) | cream | 17.29 | 4.5 | ✅ |
| 17 | wall cell title, freelance → `#B22B47`; personal → `#2A54B5`; at the smallest approach-end size `<N px>` from `friezeLegibility.test.ts` (both clear 4.5, so the size does not change the verdict; it is recorded because the spec asks for it) | cream | 5.64 / 6.20 | 4.5 | ✅ |
| 18 | wall cell meta and serial → muted `rgba(11,14,20,.62)` ≈ `#646566`; wall hover lift → `accentDeepLargeFor`: `#B22B47` / `#2A54B5` / `#7A6800` | cream | 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 19 | stream, visible state: `.stream-title`, `.stream-year-label`, `.workrow-title`, `.stream-row-title` → ink; `.stream-total`, `.stream-year-count`, `.stream-serial`, `.stream-row-meta`, `.workrow-meta` (origin word), `.stream-row-arrow`, `.workrow-arrow` → muted; hover lift → deep-large triplet (title 17 px, so the yellow slot is `#7A6800` at 4.94, which still clears 4.5) | cream | 17.29; 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 20 | stream, hidden state: the focused pill, `var(--text)` on `var(--bg)` inside the chapter → ink on cream, outline ink; focus rings on the visible state → ink | cream | 17.29 | 4.5 (text), 3.0 (ring) | ✅ |

Edit rows 1, 2, 9, 10 and 14 to drop `.archive-count strong`, dropdown text, search text, `.archive-chip`, `.archive-count`, search placeholder, `.archive-star`, `.btn--ghost (Archive load-more)`, `.archive-search:focus`, and the "Archive" ground mention in row 14 (Skills remains the tonal section). The header paragraph "Grounds:" loses Archive from the tonal list.

**Acceptance check:** `npx vitest run tests/unit/friezeLegibility.test.ts` → green and four printed sizes; the one-liner returns the five ratios in the rows: `node -e "const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);const R=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return((x+0.05)/(y+0.05)).toFixed(2)};const H=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const C=H('#F5F2EC'),I=H('#0B0E14');const M=I.map((c,i)=>Math.round(c*0.62+C[i]*0.38));console.log(R(I,C),R(M,C),R(H('#B22B47'),C),R(H('#2A54B5'),C),R(H('#7A6800'),C))"` → `17.29 5.23 5.64 6.20 4.94`. `grep -c "archive" docs/contrast.md` → `0`.

**Boundaries:** No hex changes anywhere. No token added.

- [ ] Write the legibility test; green; note the smallest size
- [ ] Edit `docs/contrast.md`; run the one-liner and the grep
- [ ] Commit `docs(contrast): the wall and the stream join the light-chapter table`

### Task 12: measured on the rig

**Files:**
- `perf/act-two-probe.mjs` — create
- `perf/decisions.md` — modify: append one entry
- `perf/baseline.json` — modify: `exact.chunkBytesCeiling` only (remove `Archive.js`, set `Projects.js` and `WorkRow.js` to the measured bytes)
- `docs/superpowers/plans/2026-09-08-act-two-access.md` — modify: fill "## Measured"; nothing outside this list

**Interfaces:**
- Consumes: `perf/lib/browser.mjs` (`launchRun`, `waitForSettledHero`, `assertPageHealthy`), `perf/lib/instrument.mjs` (`longTasksIn`, `framesIn`), `perf/lib/server.mjs`, `perf/lib/rig.mjs`. Read them first; the probe follows their conventions (headed, rig stamped, exit 1 on unhealthy page).

**Work, the probe:** `node perf/act-two-probe.mjs [--runs 5] [--no-build]` prints one JSON line with the median over runs of: `warmMs` (from `entranceDone`, observed as `body[data-loader-state="done"]` plus the `[data-entrance="settled"]` marker the harness already waits on, to `canvas[data-warm="true"]`), `maxLongTaskMs` across a wheel-gesture scrub from the wrapper's top to its bottom at 1200 px/s (the `scroll-transition` gesture, re-aimed at `#projects .scene-scroll`), `frameP50Ms` and `frameP95Ms` across the dolly range only (progress from `releaseBeatProgress + approach` to 1), and `domNodes` of `#archive` (`querySelectorAll('*').length`). Desktop viewport 1440×900 and one phone-shaped run at 390×844 with `deviceScaleFactor: 3`.

**Work, the measurement:** on the `staging` tip (checked out in a second worktree, `npm ci`), run `node perf/run.mjs idle-hero`, `load-entrance`, `battery-proxy` (`--runs 5`), `npm run perf:lh`, and the probe (`warmMs` and `maxLongTaskMs` are the only fields that exist on the base; the dolly and `domNodes` are `n/a`). Then the same on this branch's head. A busy or mismatched rig refuses, as the runner already enforces; do not `--force`. Record base, after and delta per metric in the entry and in "## Measured". Rebuild once, list `dist/assets` sizes, update the three chunk keys, and state in the entry that this is a feature delta recorded for truthfulness, not a kept batch, so the ratchet is not invoked.

**Acceptance check:** `node perf/act-two-probe.mjs --runs 3` exits 0 and prints the JSON line with every field numeric; "## Measured" has no empty cell; `PERF_HARNESS=1 npx playwright test tests/e2e/perf-budget.spec.ts -g "byte ceiling"` → passed (after `lsof -ti:4173 | xargs -r kill -9` so the build is fresh); `git diff perf/baseline.json` touches only the three keys.

**Boundaries:** No `--update-baseline`. No change to `scroll-transition.mjs` (issue #15). No numbers copied from memory; every cell comes from a report file named in the entry.

- [ ] Write the probe; `--runs 3` exits 0
- [ ] Measure base and after; fill the entry and "## Measured"
- [ ] Update the three chunk keys; run the dormant byte-ceiling test under `PERF_HARNESS=1`
- [ ] Commit `perf: act two measured on the rig, chunk ceilings follow the tree`

### Task 13: the records

**Files:**
- `docs/architecture.md` — modify: index; "Light chapter"; "Selected Work scene" gets `### Act two` and `### The stream` after `### Fallback and data attributes` (pipelines 1 and 2 may have added act-two prose already; this task writes the two subsections the spec names, "Selected Work scene · act two" as `### Act two` inside the scene section and "The stream" as `### The stream`, and merges rather than duplicates); the "Archive" heading in the index row and the "WorkRow" section; "Layout and section flow"; "Content model" (the Archive items paragraph and the "Embeds have no surface" paragraph); nothing outside this list
- `CONTEXT.md` — modify: the **Stream** entry's citation adds `src/components/sections/Stream.tsx`; **WorkRow** keeps its note; nothing else
- `README.md` — modify only if it lists `Archive.tsx` or `ArchiveDropdown.tsx` in a tree (Task 1's grep decides)

**Work:** Present tense, current tree only, rewritten rather than appended. `### The stream` states: what it is (the DOM twin), where it mounts (both states, with the CSS classes), the hidden technique and the pill, the focus path (`scrollToItem`, `data-focus-target`), the nav resolver and the release-beat derivation, the semantics (`h2`, total, `h3` per year, `ol`), row anatomy for both kinds, the arrow rule, why the serial is muted and read, and the reduced-motion behaviour. The Light chapter section: four children, `#archive` inside `#projects`, the tonal rhythm as it now is (cream, cream, cream, tonal), and the fact that the exit veil assertion is unchanged. "Layout and section flow": section flow `Hero, Projects (with the stream), Work Experience, Stats, Skills, Contact, Footer`. "Content model": archive items per the spec's shape, `yearBlocks`, no filters. WorkRow: used by Work Experience and the stream's case-study rows; the float and the ornament are gone; arrow direction rule. Index: the row "Archive, Work Experience rows" becomes "Work Experience rows, stream case-study rows"; the Selected Work row adds `src/components/sections/Stream.tsx`, `src/utils/navTarget.ts`.

**Acceptance check:** `grep -n "Archive.tsx\|ArchiveDropdown\|archive-toolbar\|debounced search\|kind: 'editorial'\|tagged by \`kind\`" docs/architecture.md CONTEXT.md README.md` → no output; `grep -c "### The stream" docs/architecture.md` → `1`; `grep -n " — " docs/architecture.md CONTEXT.md | grep -v "^.*: *-\|—.*—" | head` shows no new spaced em-dash in the lines this task wrote (date ranges and quoted wordmarks excepted).

**Boundaries:** No ADR edit (ADR 0012 already records the decision). No spec edit except by Task 15.

- [ ] Write the sections and the index rows; update CONTEXT
- [ ] Run the three greps; commit `docs: the archive is act two and the stream`

### Task 14: verification, phone pass, PR

**Files:** none (a fix found here goes back to its owning task and is committed there).

**Work:** the full set, then the phone pass, then the PR into `feat/act-two`.

**Acceptance check:**
- `npx tsc -b` → exit 0, no output.
- `npm run lint` → exit 0.
- `npx vitest run` → all files passed (no `WorkRow.float.test.tsx` in the list; `archive.test.ts`, `navTarget.test.ts`, `friezeLegibility.test.ts` present).
- `lsof -ti:4173 | xargs -r kill -9; npx playwright test` → the final line reports `N passed` and `0 failed`; the five `PERF_HARNESS` skips are visible and nothing else skips.
- `grep -rn "pieces\|streamLabel" src/i18n/locales/en.json` and `grep -rn "t('sections.archive" src` agree: every key added in Task 3 is read somewhere; delete the ones that are not (both locales, one commit).
- The `codex-computer-use` pass: invoke the skill against `npx vite preview --port 4173` (after `npm run build`), at 390×844 and 1440×900, with the brief: walk every beat (overture, four cards, release, approach, dolly to the last year, exit), Tab into the stream from the hero and confirm the pill appears and the camera moves, disable WebGL2 via the init script (`chrome://flags` is not needed: run with `--disable-webgl2` or the DevTools override) and confirm the visible stream with 171 rows and no horizontal overflow at 390 px. The run counts only with its registry line and a readable log. A finding goes back to its owning task.
- `git push -u origin feat/act-two-access`; `gh pr create --base feat/act-two` with: the measured table from "## Measured", the codex registry line, what was verified by command, the manual steps for Kevin (desktop and phone: the nav link lands on the volume shot; Tab from the hero shows the pill and moves the camera; no WebGL shows the stream; a freelance row shows the word; the count lines sum), and the flagged items from "Spec conflicts" 4 and 5. Then stop: the three-leg review is Kevin's to trigger.

**Boundaries:** No merge. No `ALLOW_MAIN_MERGE`.

- [ ] Verification set green, output kept for the PR description
- [ ] Codex phone pass done, registry line noted, findings routed
- [ ] Push, open the PR against `feat/act-two`, stop

### Task 15: spec boxes, after review

**Files:**
- `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` — modify: TODO boxes only

**Work:** Nobody in this pipeline ticks a spec box before review. After Kevin's three-leg review approves the PR and he says GREEN on the manual pass, the controller session (the one Kevin is typing into, not a worker) ticks, in one commit on this branch before the merge: `Plan 3 · Access written, reviewed, assumptions listed` (its review wave happened before Task 1), and `Contrast table recomputed and verified` (Task 11's acceptance passed and review approved). `feat/act-two-access merged into feat/act-two` is ticked by the controller after the merge lands, on `feat/act-two`. `Kevin's manual pass` and `feat/act-two landed on staging` are Kevin's, at the final PR.

**Acceptance check:** `grep -n "^- \[ \]" docs/superpowers/specs/2026-09-08-archive-act-two-design.md` after the merge lists only the boxes that belong to later steps of the chain.

- [ ] After approval and GREEN: tick the two boxes; commit `docs(spec): plan 3 and the contrast table are done`
- [ ] After the merge, on `feat/act-two`: tick the merge box

---

## Measured

Filled by Task 12. Every cell names its report file in `perf/decisions.md`.

| metric | base (`staging` @ sha) | after (`feat/act-two-access` @ sha) | delta | source |
| --- | --- | --- | --- | --- |
| idle-hero `frame.p50Ms` | | | | |
| load-entrance `lcp` / `tbt` | | | | |
| battery-proxy (its gating metric) | | | | |
| Lighthouse desktop performance / LCP | | | | |
| Lighthouse mobile performance / LCP | | | | |
| probe `warmMs` 1440×900 | | | | |
| probe `maxLongTaskMs` 1440×900 | | | | |
| probe `frameP50Ms` / `frameP95Ms` dolly 1440×900 | n/a | | | |
| probe `warmMs` / `maxLongTaskMs` 390×844 @3 | | | | |
| probe `domNodes` of `#archive` | n/a | | | |
| `Projects.js` bytes | | | | |
| `WorkRow.js` bytes | | | | |
| `Archive.js` bytes | | removed | | |

## Self-review

- Every spec line under "The stream" has a task: structure (5), hidden and focusable (5, 6), focus to camera (6), skip links absorbed (6), no-WebGL (6, 9), `id="archive"` and the nav link (7, 10), reduced motion (9, 10).
- Every "Deletions" item: `Archive.tsx`, `ArchiveDropdown.tsx`, `.archive-*` (8), toolbar strings (3), `archive.test.ts` (2), the five e2e files (9), WorkRow float and ornament (4). `perf-budget.spec.ts` has no `#archive` expectation today (Task 1's base grep confirms: the only match is the word "archive" in a comment), so it is not edited; the spec's mention is recorded here as already satisfied.
- Every "Acceptance" item for this pipeline: stream e2e (10), no-WebGL (9), reduced motion (9, 10), smoke (10), contrast (11), performance (12), archive data (2); `data-act` asserted in 9 and 10.
- "Records": architecture and index (13), contrast (11); CONTEXT already carries the glossary from the spec commit, citation updated (13).
- Names match across tasks: `Stream`, `StreamProps`, `mode`, `onRowFocus`, `scrollToItem`, `data-focus-target`, `releaseBeatProgress`, `releaseBeatScrollY`, `resolveNavTarget`, the class names in Task 5's markup contract and Task 10's selectors.
