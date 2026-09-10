# Act two · Access implementation plan

**Goal:** Give the archive its accessible twin, the stream, inside the Selected Work scene's DOM; make it the visible archive without WebGL; retire the old Archive section, its toolbar, CSS, strings and tests; recompute the contrast table; measure act two on the rig; and rewrite the docs.
**Architecture:** One component, `Stream` (`src/components/sections/Stream.tsx`), renders every archive item year by year from pipeline 2's `archive` and `yearBlocks`. `Projects.tsx` mounts it in one of two states: hidden-but-focusable as a sibling of `.scene-scroll`, exactly where `nav.scene-skiplinks` sits today and never inside the sticky pin, or in normal flow under the four-article fallback when WebGL is missing or lost. Focus on a row resolves the item through pipeline 2's `playheadForItem(itemId, layout, extent)` and composes it with pipeline 1's numeric `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)` over Lenis, the same two-step the wall's click path uses, and only when the focused row's year block is not the one already in frame. The nav link resolves `#archive` to the volume shot through a pure helper both `Header.tsx` and `Home.tsx` call, on pipeline 1's `volumeShotPlayhead(columns)` with `columns` read from the wrapper's `data-svh`. Nothing in the frame loop changes; no React state is driven by scroll or focus.
**Spec:** `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` (sections "The stream", "Deletions", "Acceptance", "Records" are binding; settled decisions are not re-opened)
**Plan review:** pending · one wave (`reviewer` on opus, `reviewer` on fable, `codex-review` on sol), one fix pass, no second wave.
**Execution model:** opus. Every seam is named against both sibling plans, every acceptance is a command, and the one derivation this plan owns (the column count read back from `data-svh`) is written out below. It derives no beat arithmetic of its own: pipeline 1 exports `volumeShotPlayhead` and `scrollTargetFor`, and this plan composes them.

## Amendment · after pipelines 1 and 2 shipped, 2026-09-10 (READ FIRST)

This plan was written and reviewed BEFORE Motion and Wall landed. Both are now merged into
`feat/act-two` and promoted to `staging` (PR #18 `c5c551f`, PR #19 `dfa2f57`). Kevin's manual pass is
GREEN. **This branch is still forked from the old base and must be updated from `feat/act-two`
before task 1.**

Ruled by `reasoner` (fable) against the shipped reality, then hand-checked here. Where the ruling and
this repo disagree, the correction is marked. **The design of this plan is sound; its numbers, two
preconditions and one ownership claim are not.**

### Corrections · apply without re-deriving

- **35 columns, not 26. `data-svh` publishes 1575, not 1350.** `(1575 − 700) / 25 = 35`. The
  `columnsFromSvh(1350) === 26` assertion is arithmetically self-consistent and therefore passes as a
  pure-function test while being wrong against the live DOM — the trap is that it looks green. Every
  DOM-reading assertion needs 1575 and 35.
- **The stub's `offsetHeight` 12150 encoded `1350 × 9` at a 900 px viewport.** Write it as
  `svh × viewportHeight / 100`, never a literal: 14175 at 900 px, 17010 at 1080 px.
- **`FRIEZE_ROWS = 6`.** There is no `FRIEZE_ROWS_LANDSCAPE` and no rename to record; delete that
  instruction. Audit every figure derived from eight rows — cells are taller now.
- **Pipeline 2's deletions and the four e2e rewrites are DONE and green.** Keep the check as a
  pre-flight gate marked expected-pass, not as work.
- **`resolveTitle(item, lang)` already exists.** Do not write a second resolver. Editorial titles are
  Portuguese only (ADR 0001), so their stream rows want `lang="pt"`.
- **Contrast.** Rows 2 and 9 still name retired `.archive-*` selectors — rewrite or delete them.
  Strike "aesthetic" from row 8: yellow `#7A6800` is now a functional hover on a 17.28 px title,
  which is under the 18.67 px large-text line, so the 4.5:1 normal-text bar applies and 4.94 clears
  it. Add the wall's rows at the measured sizes: title **17.28 CSS px**, meta and serial **11.52**,
  embedded caption **12.08**, identical on desktop and phone because the 144 px cell floor binds on
  both. `#646566` is not a new colour: it is `rgba(11,14,20,.62)` composited on cream, recomputed
  independently twice as `(99.9, 100.6, 102.1)` → `#646566`, ratio **5.23:1**.
- **Drop the "deep-accent ≥ 12 px at the approach end" assertion**, because the constant it projects
  from moved with the row count and pipeline 2 has already measured the floor at the reading beat.
  **Correction to the ruling:** it justified this partly by reading commit `81622e3`'s "act-two title
  LOD" as type below a threshold not being drawn. That is wrong. The LOD in `SceneTitle.tsx` is a
  texture-LOD blur sampling level (`textureLod`, `max(baseLod, log2(sigma))`) for the title's own
  blur, not a culling threshold. Drop the assertion for the row-count reason alone.
- **Waits key on state, not time:** `data-frieze="ready"`, `data-act="2"`, and `data-frieze-gen`
  when a test crosses a language switch.
- **Verification is chunked.** This machine reaches ~80 % memory with a browser or a game open and
  killed two full-suite runs outright; single tests later took 15.5 minutes that had taken 25
  seconds. Run specs in groups, and read durations before believing a red. Do not add new specs to
  `desktop-hidpi` (120 s raster budget) unless they genuinely need 1.5× raster.

### Settled in pre-flight and by ruling, 2026-09-10 · nothing here is open

Pre-flight ran on the merged base (`16e8cec`, `origin/feat/act-two` merged in). Facts read off the
tree, not re-derived: `FRIEZE_ROWS = 6`; no `#archive` exists (one doc comment in `sceneMotion.ts`
names it); nothing imports `friezeTargets` but its own unit test, so `playheadForItem` has no live
consumer yet and the wall's click path does NOT travel the camera (it navigates or opens the href);
the frieze fixture has 35 columns, so `data-svh` is `1575`.

- **Where the stream lives, ruled by `reasoner` (fable) with the CSS inline, hand-checked here.**
  A sibling of `.scene-scroll`, in the skip links' DOM slot, as reviewed. But NOT the skip links'
  technique. Three shapes were weighed. (A) Container absolutely positioned at the section's top,
  rows off-screen, the focused row a fixed pill: the browser's focus-scroll runs BEFORE
  `:focus-visible` applies, and it uses the row's clipped box, which sits at playhead 0, so every
  Tab native-scrolls the window to the section's top and only then does the Lenis travel start. Four
  links tolerated it because they carried no travel; 171 rows with travel is a jerk per keystroke.
  This is what the first draft's assumption 4 got wrong. (B) Inside `.scene-sticky`: sticky forms a
  stacking context that traps the pill under the nav, and its `overflow: hidden` box is
  programmatically scrollable, so focusing a clipped child shifts the stage; a portal to `body` would
  drag a second DOM surface into the pinned tree. Dominated. (C) **Taken:** the container itself is
  `position: fixed; top: 16px; left: 50%; width: 0; height: 0; overflow: visible; z-index: 120;
  pointer-events: none`. Every row's clipped 1 px box is then inside the viewport at every size, so
  the native focus-scroll has nothing to do and the gated Lenis travel is the ONLY scroll. **The
  `z-index` lives on the container, not the row:** `position: fixed` always establishes a stacking
  context, so a row's own `z-index: 120` inside a fixed container with `z-index: auto` cannot reach
  the nav at 100; today's link works only because the link ITSELF is the fixed element. No
  `clip-path` and no `overflow` other than `visible` on the container, or the pill is re-clipped.
  Rows and year headings alike are `position: absolute; top: 0; left: 0; width: 1px; height: 1px;
  clip-path: inset(50%); white-space: nowrap`, never `overflow: hidden` (that would make each row a
  scroll container). On `:focus-visible` the row un-clips into the pill with no transition;
  `pointer-events` stays none (`:focus-visible` is keyboard-only, so mouse users never see it, and one
  rule keeps the canvas-hover invariant). The fixed rules are scoped to `.stream--hidden` only. The
  ruling rests on one premise: the ancestor chain from `section#projects` to the root carries no
  `transform`, `filter`, `perspective`, `backdrop-filter` or `contain: paint`. The shipped fixed
  skip-link pill is the evidence that it is clean today; Task 10 test 12 guards it. Consequences
  written into Task 5 (the CSS), Task 6 (the acceptance), Task 7 (the fallback selector) and Task 10
  (test 12) below; self-grilling items 1 and 4 and assumptions 1 and 4 are superseded and marked.
- **`layout` and `extent` at focus time.** Both already exist in `Projects.tsx`:
  `layout = useMemo(() => friezeLayout(archive, FRIEZE_ROWS), [])` and
  `frieze = useMemo(() => friezeExtent(layout, FRIEZE_ROWS), [layout])`, handed to the scene as
  `friezeLayout` and `frieze`. The stream is mounted by the same component and reads the same two
  objects; `columns` is `frieze.columns`. Nothing is recomputed, so nothing can drift from the wall.
- **The corridor cards.** Every featured project IS an archive item: `src/data/archive.ts`
  `fromProjects` maps each to `id: featured-<id>`, `caseStudy: { slug }`, `internal: true`, and the
  fixture carries 9 `caseStudy` cells. `playheadForItem` has an answer for every stream row. A
  case-study row stays a real `<a href>` to the project route (it is a `WorkRow`), and focus travels
  the camera like any other row.
- **What sets the no-WebGL mode.** `data-frieze="failed"` is the wall TEXTURE's status
  (`friezeTexture.ts`), written by `Wall.tsx` for a layout the rasteriser refused, never for a missing
  or lost context. Context creation failure and `webglcontextlost` both reach
  `onWebglUnavailable` → the existing `webglUnavailable` state in `Projects.tsx`, which already swaps
  the sticky wrapper for `.scene-fallback`. The visible stream keys on THAT branch, as Task 6 already
  says; `data-frieze` is not consulted.

### Ordering

Task 0 is a five-minute pre-flight, not work: confirm `FRIEZE_ROWS = 6`, `data-svh` reads 1575, no
`#archive` exists, nothing imports `friezeTargets`, and how `extent` is computed. Then **restore the
nav link first** — it is the smallest user-visible defect, the first real consumer of
`friezeTargets`, and it exercises the exact Lenis + `scrollTargetFor` mechanism the stream's
focus-to-camera depends on, with one target instead of 171. Then the stream DOM (order taken from
the layout so DOM order equals the dolly's reading order, `pointer-events: none` so it never steals
the canvas's hover), then focus-to-camera, then the no-WebGL mode, then contrast, then the rig.

**After the stream lands, re-run the four rewritten e2e specs and scope their locators.** They were
rewritten against a DOM with no stream; 171 rows plus year headings enter the accessibility tree
permanently, and a clipped-but-visible element still matches, so `getByRole`/`getByText` that match
one element today can throw a strict-mode violation tomorrow.

### Not this plan's work

- **The stale hover** (no `events.update()` anywhere; scrolling moves the wall under a stationary
  pointer and the tint goes stale). It is a scene-event-layer defect, and reviewing an accessibility
  PR should not also mean reviewing the R3F event path. File it as an issue and land it as its own
  small commit **before** the focus task, because focus-to-camera moves the wall on every focus and
  would trigger it constantly. **Design around it regardless: give the focused cell its own channel,
  never a write into hover, and do not consume `onCellHover` in the stream at all** — mouse hover is
  not an accessibility event and voicing a stale id through `aria-live` would be worse than silence.
- **`actTwoTopClearFrac`.** It is exported "for pipeline 2 to inset the top row's ink by" and nothing
  reads it; the code and `docs/architecture.md` agree the inset does not happen, and the title
  overprinting the top row is ratified (ADR 0012). The spec is the odd one out. Withdraw the promise
  in the spec explicitly rather than deleting it silently, and drop the dead export — one hygiene
  commit, outside this plan. A live export whose comment describes pending work is a trap.

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

Names as the amended spec fixes them, read off the two sibling plans, not guessed. Task 1 verifies each one against the merged base and records the actual name beside it in the table under "Seam reconciliation"; a rename is reconciled there, a missing seam is `blocked: <seam>` reported to the controller, never re-implemented here.

**The item seam is two calls, not one.** There is no `scrollTargetFor(itemId)` and there never was: pipeline 1's `scrollTargetFor` is numeric and takes a playhead, pipeline 2 owns the item lookup. Every camera move in this plan is `playheadForItem(itemId, layout, extent)` → `scrollTargetFor(playhead, …, columns)`. Nothing here invents an item overload.

From pipeline 1 (`src/utils/sceneMotion.ts`, `src/utils/friezeLayout.ts`, the canvas and the wrapper):

- `ACT_TWO_RELEASE_SVH = 100`, `ACT_TWO_APPROACH_SVH = 50`, `ACT_TWO_SVH_PER_COLUMN = 25`, `ACT_ONE_SVH = 550`, `ACT_TWO_START = 3`
- `actTwoSvh(columns: number): number` (`0` at `columns ≤ 0`, else `150 + 25·columns`), `sceneWrapperSvh(columns: number): number` (`550 + actTwoSvh(columns)`; `sceneWrapperSvh(0) === 550`, `sceneWrapperSvh(22) === 1250` is the unit fixture, `sceneWrapperSvh(26) === 1350` is today's packed data)
- `actTwoBeats(columns): { release: number; approach: number }` in `actTwoProgress` units, `actTwoProgress(playhead): number`, `actTwoPlayhead(u): number`, `playheadFor(progress: number, columns = 0): number`, `actOneSeg(playhead): number`
- `scrollTargetFor(playhead: number, wrapperTop: number, wrapperHeight: number, viewportHeight: number, columns = 0): number` — the exact inverse of `playheadFor(progress, columns)`. **`columns` defaults to `0`, which reproduces act one alone; a call that omits it lands on a card slot instead of the frieze, silently and without a type error. Every call in this plan passes `columns`.**
- `volumeShotPlayhead(columns): number` — the playhead at the END of the release beat, which is what `#archive` navigates to; `playheadForColumn(col, frieze): number`; `blockAt(u, frieze): FriezeBlockExtent | null`; `blockIndexAt(u, frieze): number` (`−1` for none); `actTwoPose(u, frieze, g): ActTwoPose`; `maxRowsInFrame(g): number`
- `data-svh` on `div.scene-scroll`: `String(sceneWrapperSvh(columns))`, a bare integer, alongside the inline `height: <svh>svh`. The `550svh` CSS literal is gone. **This is the only place the column count is legible from the DOM: `columns = (Number(wrapper.dataset.svh) − 700) / 25`, from `sceneWrapperSvh(c) = 550 + 150 + 25c`.**
- `data-act` on `canvas[data-canvas="selected-work-scene"]`: `"1"` at playhead `≤ 3`, `"2"` strictly past it
- `tests/e2e/helpers/scene.ts`: `openScene(page)`, `scrollToPlayhead(page, playhead)`, `scrollToActTwo(page, u)`, `readSvh(page)`, and the `CANVAS` selector constant, each with a `settle` option. This plan's e2e uses these and never re-derives a fraction scroll.
- The act-one exports this plan already relies on, unchanged: `sceneGeometry`, `projectPoint` (documented "for a camera that only ever pitches"), `CAPTION_NAME_PX`, `CAPTION_MIN_NAME_PX`
- `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FriezeBlockExtent`, `FriezeExtent` (created by pipeline 1, completed by pipeline 2)

From pipeline 2 (`src/types/content.ts`, `src/data/archive.ts`, `src/utils/friezeLayout.ts`, `src/utils/friezeTargets.ts`, `src/components/canvas/scene/friezeText.ts`, `Projects.tsx`, both locales):

- `type Origin = 'professional' | 'freelance' | 'personal'`
- `ArchiveItem` with `id`, `title: string | Bilingual`, `origin`, `caseStudy?: { slug }`, `type?`, `editorial?`, `date`, `sortDate`, `year`, `href`, `internal`, `serial`; `resolveTitle(item, lang)` still exported (pipeline 2 confirms it is preserved under that name)
- `archive: ArchiveItem[]` (171 today) and `yearBlocks(items): { year: number; count: number; items: ArchiveItem[] }[]`, newest first
- `friezeLayout(items, rows): FriezeLayout` and `friezeExtent(layout, rows): PackedFriezeExtent`; `FRIEZE_ROWS = 8` (pipeline 1 ships it as `FRIEZE_ROWS_LANDSCAPE`, pipeline 2 renames it and deletes the portrait constant — Task 1 records which name survived the merge); `Cell { itemId, block, col, row, span }`
- `playheadForItem(itemId: string, layout: FriezeLayout, extent: FriezeExtent): number | null` and `cellFor(itemId: string, layout: FriezeLayout): Cell | null`, from `src/utils/friezeTargets.ts`. `null` means an unknown id; this plan treats it as "do nothing", never as `0`.
- `CELL_TITLE_WORLD = 0.06` from `src/components/canvas/scene/friezeText.ts` — the cell title's height in **world units**, not CSS px. There is no `CELL_TITLE_PX`. The meta and serial are drawn at `0.04` world units.
- Locale keys `sections.archive.origin.freelance` and `sections.archive.origin.personal`, added by pipeline 2 in both files and read by the wall. EN `freelance` / `personal`; PT `freelance` / **`pessoal`**. The stream reads the same keys, so the word is identical on the wall and in the row. `sections.archive.title` is preserved for this pipeline.
- `data-frieze` on the canvas: `"pending" | "ready" | "failed"`. A failed rasterisation still reaches `data-warm="true"`.
- In `Projects.tsx`: the click decision for `onCellClick(itemId)`, which for a non-navigating case resolves `playheadForItem` and composes `scrollTargetFor(playhead, …, columns)` before handing the number to Lenis. Task 6 reuses that exact scroll path for focus; if pipeline 2 inlined it, Task 6 extracts it into one local `scrollToItem` called by both.
- Pipeline 2's own deletions and e2e rewrites: `Archive.tsx`, `ArchiveDropdown.tsx`, the `.archive-*` CSS, the toolbar and sort strings, Home's Archive lazy import and mount, and the first rewrite of `light-chapter.spec.ts`, `section-enters.spec.ts`, `reduced-motion.spec.ts` and `nav-on-light.spec.ts`. This plan does none of those; it extends the rewritten specs with the stream's assertions.

## Self-grilling

Kevin was not available; each open decision in this scope was grilled with its options and the recommended answer adopted. The adopted answers are the numbered Assumptions below, one line each, so the review wave can veto any of them. The reasoning per question:

1. **Hidden technique.** `.sr-only` clip on the container; the skip-link technique (rows at `left: -9999px`, the focused row becomes a fixed pill); `visibility: hidden` (not focusable); `inert` (not focusable). The skip-link technique is already proven on this page and shows a sighted keyboard user where they are. The offscreen offset lives on the CONTAINER only; repeating it per row buys nothing and hides a second place to get the pill's `position` wrong. **Superseded 2026-09-10:** there is no offscreen offset; the container is fixed in the viewport and the rows are clipped in place (see "Settled").
2. **DOM placement.** Inside `.scene-inner` after the canvas wrap and the SR heading; a sibling of `.scene-scroll` inside `section#projects`, where `nav.scene-skiplinks` sits today; before the canvas. **The sibling wins, and this overturns the first draft's reasoning.** `.scene-sticky` is `position: sticky`, and a sticky element always forms a stacking context, so a descendant's `z-index: 120` is trapped inside it and the focused pill paints UNDER the nav (`z-index: 100`) — the exact failure the skip-link CSS comment warns about, reintroduced by nesting. The sibling is `position: absolute` at the section's top with no offsets, as `.scene-skiplinks` is today, so its static position is never below the 1350 svh wrapper. **Superseded 2026-09-10:** the sibling placement stands; the container is `position: fixed`, not absolute (see "Settled").
3. **Focus moves the page or only the camera.** There is no camera-only option: scroll is the playhead (ADR 0010) and a camera that left the playhead would break reversibility. Focus composes `playheadForItem` with `scrollTargetFor(playhead, …, columns)` and hands the number to the same Lenis `scrollTo(target, { duration: 1.2 })` the distant-card click uses, instant when Lenis is null. This is not scroll-jacking: browsers already scroll to any focused element; the stream replaces that scroll with the equivalent for a canvas twin, once per focus, never on hover or blur.
4. **The browser's native focus scroll.** Accept it and let it run before Lenis; eliminate it. **Eliminate.** A row's focused state is `position: fixed`, whose containing block is the viewport, so there is nothing left for the browser to scroll into view; the unfocused rows sit at `left: -9999px` under an absolutely positioned container pinned to the section's top, never at the section's end. The only movement on focus is the gated Lenis move. Accepting a native scroll would have raced it. **Superseded 2026-09-10:** this reasoning was wrong. The focus-scroll runs before `:focus-visible` applies and uses the row's still-clipped box at the section's top, so it was never eliminated. It is eliminated now by the fixed container (see "Settled").
5. **"The camera target attribute".** The spec names none, and neither sibling plan adds one: no attribute exposes the block in frame. `data-focus-target="<itemId>"` on `#archive`, written imperatively by `Projects.tsx`, is kept as a debugging affordance and documented, but it is NOT the proof of a camera move — it is written by the same handler that would be under test. The proof is the applied scroll position: `window.scrollY` within tolerance of `scrollTargetFor(playheadForItem(id, layout, extent), wrapperTop, wrapper.offsetHeight, innerHeight, columns)`.
6. **Telling a screen reader the wall exists.** Only an `h2`; `h2` plus a total count plus year headings with counts; an SR-only paragraph about the wall. The canvas wrap is `aria-hidden`, so to a screen reader the stream IS the archive; the counts are the volume claim in words; no prose about the wall (description lines are absent by decision).
7. **Semantics.** `section#archive[aria-labelledby]`, `h2` "all work", a total line, one `h3` per year with its count, an `ol` of rows. On the visible state the year label is sticky at or above 900 px (the canvas), inline under it (the phone artboard).
8. **The serial.** The canvas draws it at the faded 0.40 step. `CLAUDE.md` forbids that step on always-visible text unless `aria-hidden`; the serial is the count claim, informational, so it is read and set at the muted step.
9. **Row hover on the visible state.** The canvas inverts the row and adds a tint bar; drafted before decision 11 and the "no rail or bar" line. The stream takes WorkRow's hover language instead: the title lifts to `--row-tint-deep-large`, no inversion, no bar. One hover vocabulary across the chapter.
10. **Arrow direction.** WorkRow renders `↗` for every link. It now derives `→` for an internal link and `↗` for an external one; no new prop. WorkExperience is the expandable variant (`+`) and is untouched.
11. **Dense-row date.** `dd.mm` (the year is the group heading), as the canvas draws it; the wall's cell keeps `dd.mm.yyyy`.
12. **Lowercasing editorial types.** CSS `text-transform: lowercase` on the meta, as `.workrow-meta` already does; the data stays as the CSV has it.
13. **Year count string.** i18next plural keys `sections.archive.pieces_one` / `pieces_other` (precedent: `routesCount_one`).
14. **No-WebGL composition.** The stream sits below the four-article fallback, inside `#projects`, on the section's own cream, with the 1440 px column and 80/20 px gutters `.scene-fallback` does not have. The four featured projects appear twice (a card with art, a row in the stream); the stream must count 171, so nothing is filtered.
15. **The nav link's target while the scene runs.** The END of the release beat (the volume shot), not its start (card four settled, which reads as Selected Work). Pipeline 1 already names that playhead: `volumeShotPlayhead(columns)`, described in its plan as "what the `#archive` nav link lands on". The helper composes it with `scrollTargetFor(…, columns)` rather than re-deriving beat arithmetic. The column count is read from the live wrapper's `data-svh`, never recomputed from `friezeLayout` at module load: `friezeLayout` is pipeline 2's packing, the wrapper's height is what the scene actually set, and a disagreement between the two would put the nav link on a different frame than the scene is on. Falls back to the `#archive` element when there is no `.scene-scroll` or no readable `data-svh` (no-WebGL, or the scene has not measured yet). Under reduced motion the same target through the native instant path (Lenis is null).
16. **Deep-accent size for AA.** The smallest on-screen cell-title size at the approach end, derived in a unit test from pipeline 1 and 2 exports at 320×568, 390×844, 1440×900 and 1920×1080, asserted at or above `CAPTION_MIN_NAME_PX` (12 px), and the smallest value is written into the contrast row. Not guessed.
17. **Rig measurement.** Layer 2 scenarios that run today (`idle-hero`, `load-entrance`, `battery-proxy`; `scroll-transition` is issue #15), Layer 3 Lighthouse desktop and mobile, plus one headed act-two probe (`perf/act-two-probe.mjs`): `entranceDone` to `data-warm` in ms, the longest task across a full scrub, frame p50/p95 across the dolly. Base is the `staging` tip; after is this branch's head. Recorded in `perf/decisions.md` and this plan; no `--update-baseline` (a feature delta, not an optimisation batch, ADR 0007).
18. **Chunk byte ceilings.** The `Archive.js` key is removed, `Projects.js` and `WorkRow.js` re-measured, with the deltas in `perf/decisions.md`. The test is dormant behind `PERF_HARNESS=1` and still has to be true.
19. **First-paint cost.** The stream renders synchronously inside the Projects lazy chunk, which is idle-warmed after the hero; no extra deferral, because keyboard users Tab into it and the no-WebGL state needs it at mount. The embeds CSV moves from the Archive chunk into the Projects chunk, never into `index.js`; the chunk listing proves it.
20. **Phone verification.** Playwright's `mobile-chromium` (Pixel 5) runs every stream test; `stream.spec.ts` also checks the visible layout at 390×844, 360×800 and 320×568 (no horizontal overflow, two-line rows, inline year heading); then one `codex-computer-use` pass on the preview at 390×844 walks every beat and the focus path before the PR opens. The frieze row count blend is pipeline 2's; this pass verifies and never tunes.
21. **Old records.** The Archive section has no spec of its own; nothing moves to `docs/superpowers/archive/`. The architecture section is rewritten in place.
22. **Tonal rhythm.** With `#archive` inside `#projects` the chapter runs cream, cream, cream, tonal. Left as is, documented, flagged for Kevin (Spec conflicts, item 4).
23. **Skip links.** `nav.scene-skiplinks`, its CSS and `sections.projects.stack.indexLabel` go; the stream absorbs them.
24. **The focused pill.** Reuses the `.scene-skiplink:focus-visible` treatment: fixed, centred, 16 px under the top, `z-index: 120`, one line, `max-width: min(90vw, 720px)`, ellipsised; no transition.
25. **Tab order.** 171 rows precede Work Experience. **Overturned in the plan review: a skip-past link is added.** The first draft read the spec's silence as a decision; the spec's own sentence is "Its first focusable is a bilingual skip-past link to the next section", so the link is in the contract, not an addition to it. Without it the keyboard path through the section is 171 stops with no exit, which is the accessibility defect the stream exists to remove. `a.stream-skip` to `#work`, bilingual, first in DOM order inside the stream, taking the same pill treatment as a row so a sighted keyboard user sees it.
26. **Component home.** `src/components/sections/Stream.tsx`, rendered by `Projects.tsx`; the dense row is internal to that file; case-study rows are `WorkRow`.
27. **How often focus moves the camera.** Every focus; only when the year block changes. 171 rows means Tab-holding traverses the whole stream, and a 1.2 s Lenis move per row would queue 171 moves and leave the camera crawling a minute behind the focus ring. **Only on a block change:** the camera moves when `cellFor(itemId, layout).block` differs from `blockIndexAt(u, frieze)` for the current playhead; tabbing within a year moves nothing, which is also what the wall shows (one block fills the frame). The spec's "focusing a row moves the camera to that piece" is satisfied, because the piece is on screen either way.
28. **A stale move in flight.** Let Lenis queue; cancel before starting. **Cancel:** `scrollToItem` stores the requested playhead in a ref and cancels any move in flight before issuing the next, so a fast Shift+Tab back out of a block does not land on the block the reader already left. Lenis's `scrollTo` replaces its running tween, so the cancel is the call itself; Task 1 confirms that against the installed version, and if it queues instead, `scrollToItem` calls `lenis.scrollTo(window.scrollY, { immediate: true })` first. The instant path has nothing to cancel.
29. **Where the origin word comes from.** Hardcoded `item.origin`; the shared locale keys. **The keys.** Pipeline 2 adds `sections.archive.origin.freelance` and `sections.archive.origin.personal` for the wall, and the spec says the wall and the stream read the same keys. The first draft's reasoning — that the words are identical in both languages — is wrong: PT `personal` is `pessoal`. Rendering `item.origin` verbatim would have shipped an English word in the Portuguese stream while the wall beside it read `pessoal`.

## Assumptions

1. Hidden state uses the skip-link technique: the CONTAINER is offscreen at `left: -9999px`, the focused row becomes a fixed pill. No per-row offset. **Superseded 2026-09-10:** the container is fixed at the viewport's top centre, rows are clipped in place, the focused row un-clips (see "Settled").
2. **Overturned in the plan review.** Was: the stream mounts inside `.scene-inner`. Now: the stream mounts as a sibling of `.scene-scroll` inside `section#projects`, where `nav.scene-skiplinks` sits today. `.scene-sticky` is `position: sticky`, which always forms a stacking context, so the pill's `z-index: 120` inside it paints under the nav.
3. Focus resolves `playheadForItem` → `scrollTargetFor(playhead, …, columns)` and scrolls through Lenis (`duration: 1.2`), instant under reduced motion; there is no camera-only path.
4. **Overturned in the plan review.** Was: the browser's own focus scroll is accepted before the Lenis move. Now: it is eliminated — the focused row is `position: fixed` (containing block the viewport, nothing to scroll into view) and the container is absolutely positioned at the section's top, so the gated Lenis move is the only movement. **Superseded 2026-09-10:** that mechanism did not eliminate it (the scroll decision precedes `:focus-visible`); the fixed container does (see "Settled").
5. `data-focus-target="<itemId>"` on `#archive` is a debugging affordance, not the proof of a camera move. The proof is `window.scrollY` at `scrollTargetFor(playheadForItem(id, …), …, columns)` within tolerance, plus `data-act="2"`.
6. A screen reader gets `h2` "all work", a total count line, and year headings with counts; no prose about the wall.
7. Markup: `section#archive[aria-labelledby]` > `h2` + total > per year `h3` + `ol`; sticky year label at or above 900 px on the visible state.
8. The serial is read (not `aria-hidden`) and set at the muted step, not the canvas's faded 0.40.
9. Visible-state hover is WorkRow's: title lifts to `--row-tint-deep-large`; no inversion, no bar.
10. WorkRow derives the arrow: `→` internal, `↗` external; no new prop.
11. Dense-row date is `dd.mm`.
12. Editorial type and editorial are lowercased by CSS.
13. Year counts use `sections.archive.pieces_one` / `pieces_other`.
14. Without WebGL the stream sits below the four-article fallback, all 171 rows, on cream, in the 1440 column.
15. The nav link lands on `volumeShotPlayhead(columns)` via a pure helper shared by `Header.tsx` and `Home.tsx`, with `columns` read from `.scene-scroll`'s `data-svh`; element fallback without WebGL or before the wrapper is measured; instant under reduced motion.
16. The deep-accent AA size is derived by a unit test from `CELL_TITLE_WORLD` projected at the approach end; asserted at or above 12 px **on the two desktop viewports**, recorded (not asserted) on the two phone viewports, because act two's approach frames the whole newest block and a 320 px-wide portrait frame legitimately lands under the desktop floor.
17. Rig measurement is the three running Layer 2 scenarios, Lighthouse, and one headed act-two probe; base `staging`, after this branch; no baseline update.
18. `chunkBytesCeiling` loses `Archive.js`, re-measures `Projects.js` and `WorkRow.js`, recorded as a feature delta.
19. The stream renders synchronously in the Projects chunk; no extra deferral.
20. Phone pass is Playwright `mobile-chromium` plus three explicit viewports plus one `codex-computer-use` walk at 390×844.
21. Nothing moves to `docs/superpowers/archive/`.
22. The tonal rhythm change (cream, cream, cream, tonal) is documented, not fixed.
23. Skip links, their CSS and `stack.indexLabel` are deleted.
24. The focused pill reuses the skip-link pill treatment, one line, ellipsised, no transition, with WorkRow's inherited width, padding, gap, title size and meta reset inside it.
25. **Overturned in the plan review.** Was: no skip-past link is added. Now: `a.stream-skip` to `#work`, bilingual, is the stream's first focusable in the hidden state, taking the same pill treatment — the spec's own "Its first focusable is a bilingual skip-past link to the next section".
26. The component is `src/components/sections/Stream.tsx`; case-study rows are `WorkRow`.
27. Focus moves the camera only when the focused row's year block differs from the block in frame; tabbing within a year moves nothing.
28. A move in flight is cancelled before the next one starts; the last focus wins.
29. Origin words are `t('sections.archive.origin.freelance' | '…personal')`, pipeline 2's shared keys (PT `pessoal`), never `item.origin` verbatim.

## Spec conflicts

1. **"Focusing a row changes the camera target attribute"** names an attribute nothing defines, and neither sibling plan adds one (both keep ADR 0011's rule that no DOM element tracks what the camera is on). Resolution: assumption 5 — the acceptance is the applied scroll position, computed from the same seams the app uses; `data-focus-target` survives only as a debugging affordance. If a later pipeline ships a real camera-state attribute, Task 1 records it and Task 10 adds it as a second assertion, never as the only one.
2. **The design canvas predates the spec** on three points: an origin toggle (decision 5 says no toggle), an inverted hovered row with a tint bar (decision 11 and the absent-by-decision list), and a faded serial (`CLAUDE.md` NO list). Resolution: the spec and `CLAUDE.md` win; assumptions 8 and 9; the toggle is not built.
3. **`light-chapter.spec.ts` test 2 asserts five chapter children** including `#archive`, and the architecture's light-chapter section says the same. The spec puts `id="archive"` on the stream, inside `#projects`. Resolution: pipeline 2 already cuts the list to four children when it deletes the Archive section; this pipeline only adds `#projects #archive` as a descendant assertion once the stream exists. Docs updated in Task 13.
4. **Tonal rhythm.** The retired Archive was the chapter's tonal step between two cream sections. Its removal leaves cream, cream, cream, tonal. Out of this pipeline's scope to re-tint Work Experience or Stats; documented as the current state in Task 13 and flagged here for Kevin's manual pass.
5. **Tab length.** ~~The spec settles the structure; a skip-past link is not in it and is not added.~~ **Resolved, not a conflict:** the spec's "The stream" section does name it — "Its first focusable is a bilingual skip-past link to the next section". Assumption 25 is overturned and Tasks 3, 5, 6 and 10 build and test it. Nothing is flagged for Kevin here any more.
6. **`section-enters.spec.ts` and `reduced-motion.spec.ts` assert `#archive .section-title`.** The stream's heading is not a `SectionHeading` (no `.section-title`, no `.section-desc`: decision 16 and the absent list). Resolution: pipeline 2 moves those assertions to retained sections when it deletes the Archive section; this pipeline adds the stream heading's own text assertion in Task 9.
7. **Two plans claim the same four e2e specs.** Pipeline 1's plan says the `#archive` expectations in `light-chapter`, `section-enters`, `reduced-motion` and `nav-on-light` are pipeline 3's; pipeline 2's plan rewrites all four itself and states that no transitional failures are handed here. The amended spec settles it for pipeline 2 ("Pipeline 2 performs these deletions and rewrites so its PR is green on the integration branch; pipeline 3 adds the stream's own assertions afterwards"). Resolution: this plan extends, never rewrites. Task 1 verifies the four specs are already green on the merged base; if pipeline 2 left one red, that is `blocked:` back to the controller, not repair work here.

## Seam reconciliation

Filled by Task 1. Expected name, actual name, file, note.

| Expected | Actual | File | Note |
| --- | --- | --- | --- |
| `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns = 0)` | as expected | `src/utils/sceneMotion.ts:634` | 5th parameter exists and defaults to `0`. Probe compiled both the 5-argument and the 4-argument call. |
| `playheadForItem(itemId, layout, extent)`, `cellFor(itemId, layout)` | as expected | `src/utils/friezeTargets.ts:31`, `:19` | Both return `null` for an id the packing does not hold. Still no live consumer but the unit test. |
| `volumeShotPlayhead(columns)`, `playheadForColumn(col, frieze)` | as expected | `src/utils/sceneMotion.ts:282`, `:1234` | `volumeShotPlayhead = actTwoPlayhead(actTwoBeats(columns).release)`. |
| `sceneWrapperSvh`, `actTwoSvh`, `actTwoBeats`, `ACT_TWO_RELEASE_SVH`, `ACT_TWO_APPROACH_SVH`, `ACT_TWO_SVH_PER_COLUMN` | all as expected | `src/utils/sceneMotion.ts:196, 190, 227, 176, 178, 180` | `100 / 50 / 25`. `ACT_ONE_SVH = 550` (`:185`), so `sceneWrapperSvh(35) = 550 + (100 + 50 + 25×35) = 1575`. |
| `data-svh` on `.scene-scroll` | as expected | `src/components/sections/Projects.tsx:194` | Value on today's data: **1575**. Written from `sceneWrapperSvh(frieze.columns)`, not a literal. |
| `data-act` on the canvas | `dataset.act` | `src/components/canvas/scene/SceneRig.tsx:288` | `state.gl.domElement.dataset.act = String(act)`. |
| `archive`, `yearBlocks`, `resolveTitle` | as expected | `src/data/archive.ts:63`, `:65`, `src/types/content.ts:108` | `resolveTitle(item, lang)` with `lang` narrowed to `'en'` or `'pt'`. Do not write a second resolver. |
| `ArchiveItem.serial`, `.origin`, `.caseStudy`, `.year`, `.internal` | all present | `src/types/content.ts:93` | Plus `type?`, `editorial?`, `date`, `sortDate`, `href`. `Origin` is `'professional'`, `'freelance'` or `'personal'` (`:91`). |
| `friezeLayout`, `friezeExtent`, `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, row constant | **`FRIEZE_ROWS = 6`** survived | `src/utils/friezeLayout.ts:113, 181, 38, 39, 54` | No `FRIEZE_ROWS_LANDSCAPE` anywhere. `friezeExtent` returns `PackedFriezeExtent` (`:89`), a `FriezeExtent` superset. |
| `CELL_TITLE_WORLD` | `= 0.06` | `src/components/canvas/scene/friezeText.ts:20` | World units, as expected; there is no `CELL_TITLE_PX`. Siblings: `CELL_META_WORLD 0.04`, `CELL_INSET_WORLD 0.03`. |
| origin locale keys `sections.archive.origin.freelance` / `.personal` | present in both | `src/i18n/locales/en.json`, `pt.json` | EN `{ freelance, personal }`, PT `{ freelance, pessoal }`. |
| `tests/e2e/helpers/scene.ts`: `openScene`, `scrollToPlayhead`, `scrollToActTwo`, `readSvh`, `CANVAS` | all present | `tests/e2e/helpers/scene.ts:46, 100, 120, 59, 18` | Also `beats(page)` (`:77`), `rasterBudgetMs()` (`:42`), and re-exported `SETTLE_REDUCED_MS`, `unitPx`. |
| `Projects.tsx` cell-click scroll path | **it does not exist** | `src/components/sections/Projects.tsx:122-134` (cell), `:95-116` (card) | Confirms the amendment. `cellClick.current` navigates or `window.open`s and never travels the camera. The only numeric travel is the CARD path, inlined in `cardClick.current`: `wrapperTop` from `getBoundingClientRect().top + scrollY`, then `scrollTargetFor(index, wrapperTop, wrapper.offsetHeight, window.innerHeight, frieze.columns)`, then `lenis.scrollTo(target, { duration: 1.2 })` with a `window.scrollTo({ behavior: 'instant' })` fallback when Lenis is null. **Task 6 extracts THAT, and the cell click becomes its second consumer.** |
| `actTwoPose`, `blockAt`, `blockIndexAt`, `actTwoProgress`, `playheadFor(progress, columns)` | all as expected | `src/utils/sceneMotion.ts:970, 1122, 1111, 263, 250` | `blockAt` returns a `FriezeBlockExtent` or `null`. |
| Lenis `scrollTo` cancels the tween in flight | confirmed | `node_modules/lenis/dist/lenis.mjs` | `scrollTo` ends in `this.animate.fromTo(this.animatedScroll, target, ...)`, and `Animate.fromTo` overwrites `from`, `to` and `currentTime` on the ONE `Animate` instance. A second call therefore restarts from the live position; nothing queues. **Gotcha for the stream:** `scrollTo` returns early when `target === this.targetScroll`, so re-focusing a row already targeted is a silent no-op (harmless, and the year-block gate makes it the common case). |

Read off the tree at the same time, for the tasks that need them: the frieze fixture carries **171 cells**
in **35 columns**, **9** of them `caseStudy` cells, and `extent.blocks` is four years · 2026×3, 2025×42,
2024×118, 2023×8.

### Base verification, on the untouched merged base (`a44844d`)

```
npx tsc -b                    exit 0
npm run lint                  ✖ 4 problems (0 errors, 4 warnings)   ← all pre-existing, react-refresh/only-export-components
npx vitest run                Test Files 26 passed (26) · Tests 430 passed (430) · 6.14s
```

E2e chunked, per the amendment. Every chunk preceded by
`lsof -ti:4173 | xargs -r kill -9; pkill -f "workerd serve"`.

```
A  contact-waves dark-tokens hero-dissolve hero-entrance hero-shader light-chapter loader
   40 passed (2.0m)
B  nav-on-light perf-budget perf-hooks pixel-gate reduced-motion rows-hover section-enters
   1 flaky · 14 skipped · 57 passed (6.4m)
   flaky: [desktop-chromium] perf-budget.spec.ts:54 "no long task > 200ms during scroll" — green on retry
C  frieze-click frieze-surface scene-effects scene-no-webgl scene-scrub
   1 failed · 3 skipped · 41 passed (23.8m)
   failed: [mobile-chromium] scene-scrub.spec.ts:110 "scrubbing the corridor swaps the settled
   slot, and reversing restores it" — "Test timeout of 30000ms exceeded", waiting on
   `#projects .scene-title-sr`, i.e. the lazy Projects chunk never mounted inside the budget.
   RERUN ALONE: 1 passed (31.7s). The red is the machine, not the tree — 45 tests took 23.8m in
   that chunk, and a test that needs 31.7s cannot pass a 30s budget under that starvation.
```

**Base is green.** Both non-passes are the documented memory behaviour, not defects: neither
survived a rerun, and neither touches a surface this pipeline changes.

---

### Task 1: fork, seams, starting state

**Files:**
- `docs/superpowers/plans/2026-09-08-act-two-access.md` — modify: fill "Seam reconciliation"; nothing outside this list

**Interfaces:**
- Consumes: everything under "Seams expected from pipelines 1 and 2".
- Produces: the reconciliation table every later task reads before importing.

**Work:** Fork the branch from the merged base, then prove each seam exists by grep and by a compiled probe, not by reading. Record the actual names, and record them against BOTH sibling plans: pipeline 1 and pipeline 2 disagree on the row constant's name (`FRIEZE_ROWS_LANDSCAPE` versus `FRIEZE_ROWS`) and on who rewrote the four old-Archive e2e specs, so the merged base is the only authority. Run the full verification set once on the untouched base so a later red is attributable, and confirm the four specs pipeline 2 rewrote are already green (Spec conflicts item 7). If a seam is missing, write `blocked: <seam>` in the table's note column and stop the pipeline there.

The probe lives in the repo, not `/tmp`: a file under `/tmp` resolves `./src` relative to `/tmp`, and `npx tsc` on a loose file outside the project uses none of its `paths`, `jsx` or `lib` settings. Write `src/__seam-probe.ts`, compile it with the project's own config, then delete it.

**Acceptance check:** every row of the table has an actual name or a `blocked` note; the base verification set's summary lines are pasted under the table; `git status --porcelain` shows no leftover probe file.

**Boundaries:** No source change that survives the task. No renaming of anything pipeline 1 or 2 shipped.

- [x] `git fetch origin && git switch feat/act-two-wall && git pull --ff-only && git switch -c feat/act-two-access` (if `feat/act-two-access` already exists with only this plan commit: `git rebase feat/act-two-wall` instead)
      **Stale, satisfied another way:** `feat/act-two-access` already exists on the merged base
      (`16e8cec`, `origin/feat/act-two` merged in), which is `feat/act-two-wall` plus PR #18 and #19.
      No fork and no rebase; the branch is where this box wanted it.
- [x] `grep -n "^export" src/utils/sceneMotion.ts | grep -iE "act_two|actTwo|actOne|sceneWrapperSvh|blockAt|blockIndexAt|playheadFor|scrollTargetFor|volumeShot|maxRowsInFrame"` and `grep -rn "dataset.act\b\|data-act\|dataset.svh\|data-svh" src/components` → fill the `scrollTargetFor`, `volumeShotPlayhead`, svh-constant, `data-svh`, `data-act` and pose rows
- [x] `grep -n "^export" src/data/archive.ts src/types/content.ts src/utils/friezeLayout.ts src/utils/friezeTargets.ts src/components/canvas/scene/friezeText.ts` and `grep -n "playheadForItem\|cellFor\|scrollTargetFor\|onCellClick\|lenis.scrollTo" src/components/sections/Projects.tsx` → fill the pipeline-2 rows
- [x] `node -e "const e=require('./src/i18n/locales/en.json'),p=require('./src/i18n/locales/pt.json');console.log(e.sections.archive.origin, p.sections.archive.origin)"` → the two keys in both files, PT `pessoal`; fill the locale row
- [x] `ls tests/e2e/helpers/scene.ts && grep -n "^export" tests/e2e/helpers/scene.ts` → fill the helper row
- [x] Probe the signature in-project: write `src/__seam-probe.ts` containing `import { scrollTargetFor, volumeShotPlayhead } from './utils/sceneMotion'` / `import { playheadForItem } from './utils/friezeTargets'` and one call of each with the expected arity (`scrollTargetFor(3.5, 0, 1000, 800, 26)` typed `number`; a four-argument call must still compile, since `columns` defaults to `0`); `npx tsc -b` → exit 0, or record the real signature; then `rm src/__seam-probe.ts`
- [x] `grep -rn "scrollTo\b" node_modules/lenis/dist/*.mjs | head` → confirm `scrollTo` replaces the tween in flight (assumption 28); record the mechanism or the fallback in the note column
- [x] `npx tsc -b && npm run lint && npx vitest run` and `lsof -ti:4173 | xargs -r kill -9; npx playwright test` on the untouched base; paste the summary lines under the table
- [x] Commit `docs(plan): act-two access seams reconciled`

### Task 2: archive data test for the new item shape

**Files:**
- `tests/unit/data/archive.test.ts` — modify or rewrite: the spec's four data assertions; nothing outside this list

**Interfaces:**
- Consumes: `archive`, `yearBlocks` from `src/data/archive.ts`; `projects` from `src/data/projects.ts`.
- Produces: nothing.

**Work:** Pipeline 2 changed the shape; whatever it left in this file, the file must end up asserting exactly: `serial` is `archive.length` at index 0 and 1 at the last index, contiguous and strictly descending; every item has an `origin` and the default is `professional`; the item whose `caseStudy.slug` is `hotmart-bunde` is `freelance`; `yearBlocks(archive)` counts sum to `archive.length`, years strictly descending, and each block's `items` all carry that year. Drop every assertion about `kind`, `archiveTypes`, `archiveEditorials`, `archiveYears`, `archiveKinds`, `byFeatured`, `gradient`. Keep the existing sort and link-direction assertions, rewritten on `caseStudy` and `internal`. Do not hardcode 171; assert relations.

**Acceptance check:** `npx vitest run tests/unit/data/archive.test.ts` → green, and a deliberate edit of one `serial` in a local copy of the array (not committed) turns the contiguity test red.

**Boundaries:** `src/data/archive.ts` and `src/types/content.ts` are pipeline 2's; no edit.

- [x] Rewrite the file per Work
- [x] `npx vitest run tests/unit/data/archive.test.ts` green; commit `test(data): archive items carry serial, origin, year blocks`

### Task 3: strings

**Files:**
- `src/i18n/locales/en.json` — modify: `sections.archive`, `sections.projects.stack`
- `src/i18n/locales/pt.json` — modify: the same keys; nothing outside this list

**Interfaces:**
- Consumes: `sections.archive.title` (unchanged: `all work` / `todos os trabalhos`) and `sections.archive.origin.freelance` / `.personal` (`freelance` / `freelance`, `personal` / `pessoal`), both already in place from pipeline 2. This task neither adds nor edits them.
- Produces: `sections.archive.pieces_one` (`{{count}} piece` / `{{count}} peça`), `sections.archive.pieces_other` (`{{count}} pieces` / `{{count}} peças`), and `sections.archive.skipPast` (`skip past all work` / `pular todos os trabalhos`) for the skip-past link (assumption 25). Nothing else: the stream has no lede (assumption 6).

**Work:** Pipeline 2 already deleted `sections.archive.description`, `sections.archive.toolbar.*` and `sections.archive.sort.*` in both files; Task 1 confirms that, and this task does not repeat it. Delete `sections.projects.stack.indexLabel` in both (the skip links go in Task 6); keep `viewProject` (the fallback uses it). Add the plural pair and the skip-past pair. Both files change in the same commit. If Task 1 found the origin keys missing, add them here with pipeline 2's exact values and say so in the commit body.

**Acceptance check:** `node -e "const e=require('./src/i18n/locales/en.json'),p=require('./src/i18n/locales/pt.json');const k=o=>Object.keys(o).sort().join();console.log(k(e.sections.archive)===k(p.sections.archive), k(e.sections.projects.stack)===k(p.sections.projects.stack), e.sections.archive.pieces_other, p.sections.archive.origin.personal, p.sections.archive.skipPast)"` → `true true {{count}} pieces pessoal pular todos os trabalhos`. `npx vitest run tests/unit/seo` green.

**Boundaries:** No other key. No `SectionHeading` string. No edit to the origin keys pipeline 2 owns.

- [ ] Edit both locale files
- [ ] Run the check; commit `i18n(archive): year counts and the skip-past link arrive`

### Task 4: WorkRow loses the float and the ornament, learns the arrow direction

**Files:**
- `src/components/ui/WorkRow.tsx` — modify
- `tests/unit/WorkRow.test.tsx` — modify: one new case for the arrow
- `tests/unit/WorkRow.float.test.tsx` — delete
- `src/index.css` — modify: the WORKROW block only (`.workrow-ornament`, `.workrow-thumb`, `.workrow-thumb img`, `.workrow-float`, `.workrow-float-inner`, `.workrow-float-inner img`, the `@media (hover: none)` and `@media (prefers-reduced-motion: reduce)` blocks that exist only for them, and `.chapter-light .workrow-float-inner` in the LIGHT CHAPTER block); nothing outside this list

**Interfaces:**
- Produces: `WorkRowProps` without `preview` and `ornament`; `WorkRowPreview` no longer exported. Arrow glyph: `expandable ? '+' : isInternal ? '→' : '↗'`.

**Work:** Remove `WorkRowPreview`, `preview`, `ornament`, `canHoverFine`, the MotionValue and spring state, `WorkRowFloat`, `hoverHandlers`, the thumb span. The `framer-motion` import shrinks to what the expandable panel needs (`AnimatePresence`, `motion`); `useState` goes if nothing else uses it. Keep `--row-tint*` on the root, `internal`, the expandable variant and its focus ring untouched. Update the module comment: the row is used by Work Experience and by the stream's case-study rows.

**Acceptance check:** `npx vitest run tests/unit/WorkRow.test.tsx` green with the new case (`href="/projects/x"` renders `→`, `href="https://…"` renders `↗`); `grep -c "workrow-float\|workrow-thumb\|workrow-ornament" src/index.css src/components/ui/WorkRow.tsx` → `0` for both files; `npx tsc -b` clean with no exceptions — `Archive.tsx` was the only consumer of `preview` and `ornament` and pipeline 2 already deleted it, so a red here is a real red, not an expected transitional one.

**Boundaries:** No change to `.workrow-title`, `.workrow-meta`, `.workrow-index`, `.workrow-arrow` rules, or the light-chapter hover lift.

- [ ] Edit `WorkRow.tsx`; delete the float test; add the arrow case
- [ ] Remove the CSS rules; `grep` shows 0
- [ ] `npx vitest run tests/unit/WorkRow.test.tsx` green; commit `refactor(workrow): the float and the ornament go, the arrow points the way the link goes`

### Task 5: the Stream component and its CSS

**Files:**
- `src/components/sections/Stream.tsx` — create
- `src/index.css` — modify: add a `STREAM` block where the two ARCHIVE blocks were (pipeline 2 already deleted them; this task only adds); re-declare the retired `#archive .workrow-title { font-size: clamp(20px, 2.6vw, 34px); }` rule inside the new block as `.stream .workrow-title`, scoped by class rather than by the `#archive` id so the selector no longer trips the `archive-` audit; nothing outside this list

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
section#archive.stream.stream--hidden|stream--visible[aria-labelledby="stream-title"]
  a.stream-skip[href="#work"]          → t('sections.archive.skipPast')   (hidden state only, FIRST in DOM order)
  header.stream-header
    h2#stream-title.stream-title       → t('sections.archive.title')
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

**Work:** One data pass: `yearBlocks(archive)`. `WorkRow` takes `index = archive.length - item.serial` (the item's position in the whole stream, 0 for the newest) so its `--row-tint*` rotation runs down the list. Its own `.workrow-index` would show the position, not the serial, so the serial is rendered once per `li` as `span.stream-serial` before the row for BOTH row kinds, and WorkRow's index is hidden on stream rows with `.stream .workrow-index { display: none }`; WorkRow itself is not changed for this. Dense rows set `--row-tint`, `--row-tint-deep`, `--row-tint-deep-large` inline exactly as WorkRow does, from the same position index, so the hover lift reads `--row-tint-deep-large` in the chapter. The date `dd.mm` is derived from `item.date` (`dd/mm/yyyy` for editorial). Origin word: `t('sections.archive.origin.' + item.origin)` as the WorkRow `meta`, the same key the wall reads, for `freelance` and `personal` only (`professional` renders no meta). It is NOT `item.origin` verbatim: PT `personal` is `pessoal`, so the raw value would put an English word in the Portuguese stream next to a wall reading `pessoal` (assumption 29). `onRowFocus` is wired with `onFocus` on the `WorkRow` wrapper `li` (focus bubbles) and on `a.stream-row`; it fires with `item.id`; no state. `a.stream-skip` renders in the hidden state only, first in DOM order, and is a plain in-page link to `#work`; it does not call `onRowFocus`.

CSS contract, all canonical tokens, every colour pair listed in Task 11:

- **Amended 2026-09-10 (ruled, see "Settled").** `.stream--hidden { position: fixed; top: 16px; left: 50%; width: 0; height: 0; overflow: visible; z-index: 120; pointer-events: none; }` — the container is fixed so every descendant's clipped box is inside the viewport and the browser's focus-scroll has nothing to do; the `z-index` is HERE because `position: fixed` establishes a stacking context and a row's own z-index cannot leave it. No `clip-path`, no `overflow` other than `visible` on the container. Every focusable and every heading inside it (`.stream-skip`, `.stream-row`, `.workrow-link`, `.stream-header`, `.stream-year-label`, and the `li`/`ol`/`div` wrappers may simply be `display: contents` or share the rule) is `position: absolute; top: 0; left: 0; width: 1px; height: 1px; clip-path: inset(50%); white-space: nowrap;` — `clip-path`, never `overflow: hidden`, which would turn each row into a scroll container. `.stream--hidden :is(.stream-skip, .stream-row, .workrow-link):focus-visible` un-clips into the pill: `width: auto; height: auto; clip-path: none; transform: translateX(-50%); max-width: min(90vw, 720px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 8px 16px; border-radius: 999px; border: 1px solid var(--hairline); background: var(--bg); color: var(--text); outline: 2px solid var(--text); outline-offset: 2px; font-size: 14px; text-transform: lowercase;` with no `position` change (it stays absolute inside the fixed container, which is what puts it at the viewport's top centre) and no transition. `pointer-events` is inherited as none, pill included.

  The pill must also RESET what a `WorkRow` brings into it, or a case-study row renders as a 100%-wide flex box with 34 px padding and a 64 px title inside a one-line pill: on `.stream--hidden .workrow-link:focus-visible`, `display: block; width: auto; padding: 0; gap: 0;` and inside it `.workrow-title { font-size: inherit; font-weight: 500; line-height: 1.2; letter-spacing: normal; }`, `.workrow-meta, .workrow-arrow, .stream-row-meta, .stream-row-arrow, .stream-serial { display: none; }`. Only the title shows. The same resets apply to `.stream-row:focus-visible` (it is already a flex row). Reduced motion: nothing animates, here or anywhere in this file.

  The pill is why the stream is a sibling of `.scene-scroll` and not a child of `.scene-sticky` (assumption 2): `position: sticky` always establishes a stacking context, so `z-index: 120` inside it is scoped to the sticky element and the pill paints under the nav at `z-index: 100`. The fixed container reaches the nav from the root stacking context, which is where `nav.scene-skiplinks` already sits, and it can do so only while no ancestor carries `transform`, `filter`, `perspective`, `backdrop-filter` or `contain: paint` (Task 10 test 12).
- `.stream--visible { width: min(1440px, 100% - 160px); margin: 96px auto 0; }` and under 720 px `width: calc(100% - 40px)`. Header: title `clamp(56px, 11.6vw, 168px)`, weight 550, `letter-spacing: -0.035em`, `line-height: 0.86`, lowercase; total at 13 px muted. Year block: grid `160px minmax(0, 1fr)` with `gap: 0 40px`, top hairline, `padding-top: 34px`, `margin-top: 56px`; the label column `position: sticky; top: 120px; align-self: start` at or above 900 px, and a single inline row (`h3` with the count beside it) below 900 px. Year label 34 px weight 300 (28 px on phones), count 13 px muted.
- Dense row: `display: flex; align-items: flex-start; gap: clamp(16px, 2.4vw, 34px); padding: 15px 0; border-bottom: 1px solid var(--hairline)`; serial `width: 48px` (32 px on phones), 13 px (11 px), tabular, `color: var(--text-muted)`; title 17 px (16 px) weight 500, `line-height: 1.25`, two-line clamp (`display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`); meta 13 px (12 px) muted, lowercase; arrow 18 px muted, `margin-left: auto`. Hover and `:focus-within` on the visible state: `.stream-row-title { color: var(--row-tint-deep-large) }` and the arrow to `var(--text)`, mirroring the chapter's WorkRow rule. Focus ring on the visible state: `outline: 2px solid var(--text); outline-offset: 4px; border-radius: 4px` (WorkRow's).
- `.stream .workrow-index { display: none }`, `.stream .workrow-link { padding: 22px 0 }` on phones (34 px desktop is WorkRow's default).

**Acceptance check:** `npx tsc -b` clean once Task 6 mounts it (this task alone: the file compiles in isolation with `npx tsc -b`, since an unimported module is still type-checked by the project reference). Rendering is asserted in Task 10.

**Boundaries:** No import from `src/components/canvas/`. No router hook (WorkRow's `Link` is fine). No React state. No Framer Motion in this file.

- [ ] Write `Stream.tsx` to the contract
- [ ] Add the STREAM CSS block with the re-declared `.stream .workrow-title` rule
- [ ] `npx tsc -b` and `npm run lint` clean; commit `feat(stream): the archive's accessible twin, year by year`

### Task 6: the stream inside the scene section; the skip links go

**Files:**
- `src/components/sections/Projects.tsx` — modify
- `src/index.css` — modify: delete `.scene-skiplinks`, `.scene-skiplink`, `.scene-skiplink:focus-visible`; nothing outside this list

`src/pages/Home.tsx` is NOT in this list: pipeline 2 already removed the `Archive` lazy import, its idle warm line and the `<Archive />` element. Task 1 confirms; if any of them survived the merge, that is `blocked:` to the controller, not repair work here.

**Interfaces:**
- Consumes: `Stream`; `playheadForItem`, `cellFor` (pipeline 2, `src/utils/friezeTargets.ts`); `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)`, `playheadFor(progress, columns)`, `actTwoProgress`, `blockIndexAt` (pipeline 1); the frieze layout and extent already computed in this file for the wall; the Lenis instance from `useLenisContext`; and pipeline 2's cell-click scroll path in this file.
- Produces: one local `scrollToItem(itemId: string): void` used by both the cell click that does not navigate and the stream focus; `data-focus-target` written on `#archive` imperatively; `Stream` mounted in both states.

**Work:** Delete the `nav.scene-skiplinks` block and its `t('sections.projects.stack.indexLabel')`. In the running-scene branch, render `<Stream mode="hidden" onRowFocus={handleRowFocus} />` as a SIBLING of `div.scene-scroll` inside `section#projects`, in the slot the skip-link `nav` occupies today — never inside `.scene-sticky` or `.scene-inner` (assumption 2: a sticky element forms a stacking context and the focused pill would paint under the nav). In the fallback branch, render `<Stream mode="visible" />` after `div.scene-fallback`, still inside `section#projects`.

`handleRowFocus` is a stable `useCallback` that calls a ref-held function (the `cardClick.current` pattern already in the file). Its body:

1. Write the debugging attribute: `sectionRef.current?.setAttribute('data-focus-target', itemId)`. This is not the acceptance (Spec conflicts item 1); Task 10 asserts the scroll position.
2. Resolve the cell: `const cell = cellFor(itemId, layout)`. `null` (unknown id) does nothing at all.
3. Gate on the block (assumption 27): read the current playhead as `playheadFor(scrollYProgress.get(), columns)`, its act-two progress as `actTwoProgress(playhead)`, and the block in frame as `blockIndexAt(u, extent)`. If `cell.block === blockIndexAt(...)` the camera is already on this year: return without scrolling. Only a different block moves the camera. This is what keeps Tab-holding through 171 rows from queueing 171 moves.
4. Otherwise `scrollToItem(itemId)`.

`scrollToItem(itemId)` is the one function both the wall click and the stream focus call: `playheadForItem(itemId, layout, extent)` (bail on `null`), then `wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY`, then `scrollTargetFor(playhead, wrapperTop, wrapper.offsetHeight, window.innerHeight, columns)` — **`columns` is always passed; its default of `0` maps the playhead through act one alone and would scroll the reader to a card slot, silently and without a type error.** `columns` comes from the same frieze extent the scene renders. Before issuing the move it cancels the one in flight (assumption 28, mechanism confirmed in Task 1), then `lenis.scrollTo(target, { duration: 1.2 })` or, with no Lenis, `window.scrollTo({ top: target, behavior: 'instant' })`. If pipeline 2's cell click already has this body, extract it and call it from both places; the two paths must be one function.

**Acceptance check:** `npx tsc -b` and `npm run lint` clean; `grep -rn "scene-skiplink\|indexLabel\|sections/Archive" src` → no output; `grep -n "scrollTargetFor(" src/components/sections/Projects.tsx` → every call site passes five arguments; on the dev server `document.querySelector('#projects > #archive')` is non-null and `document.querySelector('.scene-sticky #archive')` is `null`, and `document.querySelectorAll('#archive li.stream-item').length === 171`; `getComputedStyle(document.querySelector('#archive')).position === 'fixed'` and its `zIndex` is `'120'`; `document.querySelector('#archive').getBoundingClientRect()` reads `x === innerWidth / 2, y === 16` both at `scrollY 0` and mid-scene (no ancestor re-parents the fixed box).

**Boundaries:** No change to `SelectedWorkScene` props. No React state on focus. The `cards` memo and the scene subtree's identity are untouched (`data-registrations` stays `1`; Task 9 asserts it).

- [ ] Edit `Projects.tsx`, `Home.tsx`; delete the skip-link CSS
- [ ] Run the greps and the three console checks on the dev server
- [ ] Commit `feat(scene): the stream lives in the scene section; the skip links are absorbed`

### Task 7: the nav link lands on the volume shot

**Files:**
- `src/utils/navTarget.ts` — create
- `tests/unit/navTarget.test.ts` — create
- `src/components/layout/Header.tsx` — modify: `go()` only
- `src/pages/Home.tsx` — modify: the off-route `apply()` only; nothing outside this list

**Interfaces:**
- Consumes: `volumeShotPlayhead`, `scrollTargetFor`, `sceneWrapperSvh`, `ACT_TWO_SVH_PER_COLUMN`, `ACT_ONE_SVH`, `ACT_TWO_RELEASE_SVH`, `ACT_TWO_APPROACH_SVH` (pipeline 1). **No `friezeLayout` import and no `archive` import.** The column count is read from the DOM, not recomputed.
- Produces:

```ts
/** The frieze column count the scene actually laid out, from `.scene-scroll`'s `data-svh`. `null` when the wrapper is absent or its `data-svh` is not a finite number. */
export function columnsFromSvh(svh: number | null): number | null
/** What the nav's `#<id>` should scroll to on Home: a number for `archive` while a measured `.scene-scroll` exists, else the selector. */
export function resolveNavTarget(id: string, doc: Document, viewportHeight: number): number | string
```

Derivation, binding, and it is the sibling plans' arithmetic, not new arithmetic here:

- The volume shot is the END of the release beat and pipeline 1 already exports its playhead as `volumeShotPlayhead(columns)` — its own plan calls it "what the `#archive` nav link lands on". This module composes, it does not re-derive: `scrollTargetFor(volumeShotPlayhead(columns), wrapperTop, wrapper.offsetHeight, viewportHeight, columns)`. **`columns` is passed to `scrollTargetFor` as well as to `volumeShotPlayhead`;** with the default `0` the same playhead maps through act one alone and the nav link lands past the end of the wrapper.
- `columns` comes from the wrapper: `columnsFromSvh(Number(wrapper.dataset.svh))`, where `sceneWrapperSvh(c) = ACT_ONE_SVH + ACT_TWO_RELEASE_SVH + ACT_TWO_APPROACH_SVH + ACT_TWO_SVH_PER_COLUMN·c = 700 + 25c`, so `c = (svh − 700) / 25`. Written from those constants, never as the literals, and returning `null` for a non-finite or non-integral result. Today's data gives `data-svh="1575"` → 35 columns.
- **Not** `friezeLayout(archive, FRIEZE_ROWS).columns` at module load. The wrapper's height is what the scene actually set; a recomputed packing that disagreed by one column would aim the nav link at a frame the scene is not on, and it would pull the whole archive dataset and the layout packer into the header's chunk to do it.
- `resolveNavTarget('archive', doc, viewportHeight)` reads `#projects .scene-scroll`; with a wrapper whose `data-svh` resolves to a column count it returns the number. **Amended 2026-09-10:** with a wrapper present but no readable `data-svh` it returns `'#projects'`, because in that mode `#archive` is a fixed 0×0 box and a selector scroll to it is a no-op; with no wrapper at all (no WebGL, the stream is in flow) it returns `'#archive'`. Any other id returns `'#' + id`.

**Work:** `Header.go(id)` on Home calls `scrollTo(resolveNavTarget(id, document, window.innerHeight), { duration: 1.2 })`; `useLenis().scrollTo` already accepts a number and already falls back to native instant scroll when Lenis is null (reduced motion).

`Home.apply()` does the same with `duration: 0.8`, and its gate has to change. Today `apply()` returns `true` as soon as `document.getElementById(targetId)` exists — it waits for the TARGET ELEMENT, not for `.scene-scroll`. `#archive` is the stream, a sibling of the wrapper, so it can exist a frame before the wrapper carries a usable `data-svh`, and `apply()` would stop the ResizeObserver on the element-only fallback. New gate: for `archive`, `apply()` returns `true` only when `resolveNavTarget` returns a number; otherwise it returns `false` and lets the existing ResizeObserver poll retry until the 1500 ms timeout, whose expiry leaves the reader at the top of `#projects` — the same place the selector fallback would have put them. Every other id keeps today's element gate.

**Acceptance check:** `npx vitest run tests/unit/navTarget.test.ts` → green on: ~~`columnsFromSvh(1350) === 26`~~ **→ `columnsFromSvh(1575) === 35`, asserted against `sceneWrapperSvh(35)` rather than a literal** (the amendment's first correction: 1350/26 is self-consistent and therefore passes while being wrong against the live DOM), `columnsFromSvh(700) === 0`, `columnsFromSvh(NaN) === null`, `columnsFromSvh(1585) === null` (not a whole column); `resolveNavTarget('archive', doc, 900)` on a stub document whose `.scene-scroll` has `data-svh="1575"`, `offsetHeight` `1575 × 900 / 100 = 14175` and a known `getBoundingClientRect().top` equals `scrollTargetFor(volumeShotPlayhead(35), wrapperTop, 14175, 900, 35)` exactly; `resolveNavTarget('archive', docWithoutWrapper, 900)` is `'#archive'`; `resolveNavTarget('archive', docWithWrapperButNoSvh, 900)` is `'#projects'`; `resolveNavTarget('work', …)` is `'#work'`. The e2e is Task 10 test 5.

**Boundaries:** No change to `useLenis`. No new attribute on the nav.

- [x] Write the util and its test; red first, then green
- [x] Wire `Header.tsx` and `Home.tsx`
- [x] `npx tsc -b && npm run lint` clean; commit `feat(nav): all work lands on the volume shot`

### Task 8: the old Archive is gone — verified, not repeated

**Files:** none.

**Work:** The amended spec assigns the deletions to pipeline 2 ("Pipeline 2 performs these deletions and rewrites so its PR is green on the integration branch"), and pipeline 2's plan does them in its Task 2: `src/components/sections/Archive.tsx`, `src/components/ui/ArchiveDropdown.tsx`, the `.archive-*` CSS blocks, the toolbar and sort strings in both locales, and Home's Archive lazy import, preload and mount. **This pipeline deletes none of them.** The two things that ARE this pipeline's and are deleted elsewhere in this plan: `nav.scene-skiplinks` with its CSS and `stack.indexLabel` (Task 6), and `WorkRow`'s float and ornament (Task 4).

This task is the audit that nothing survived, run once after Task 7 so the whole surface is in place.

**Acceptance check:** `grep -rn "archive-\|ArchiveDropdown\|sections/Archive\|archive-search\|archive-chip\|archive-count\|archive-star\|archive-more\|archive-list\|archive-toolbar" src tests --include='*.ts' --include='*.tsx' --include='*.css'` → no output. This grep is only clean because every class and attribute added by Task 5 is `stream-*` and the stream's heading id is `stream-title`: an `archive-title` id, or any `archive-`-prefixed class on the new markup, would match it and turn a real audit into a false red. The one surviving `archive` token is the section id `id="archive"`, which the pattern does not match. Then `npx tsc -b && npm run lint && npx vitest run` green.

**Boundaries:** No deletion here. `src/data/embeds.ts` (`typeGradients`) and the content types are pipeline 2's; if `typeGradients` is now unused, note it in the PR description, do not delete it. If the grep finds a survivor, it is `blocked:` to the controller — pipeline 2's PR was supposed to be green on the integration branch.

- [ ] Run the grep and the three commands; record the output for the PR description (no commit if nothing changed)

### Task 9: existing e2e specs gain the stream's assertions

**Files:**
- `tests/e2e/light-chapter.spec.ts` — modify: one added assertion
- `tests/e2e/section-enters.spec.ts` — modify: one added test
- `tests/e2e/nav-on-light.spec.ts` — modify: the skip-link path becomes a stream row
- `tests/e2e/scene-no-webgl.spec.ts` — modify: add the stream assertions
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: add one assertion
- `tests/e2e/scene-scrub.spec.ts` — modify: the two skip-link usages; nothing outside this list

`reduced-motion.spec.ts` is NOT in this list. Pipeline 2 already moved its `#archive .section-title` selector to a retained section when it deleted the Archive; the stream's heading is not a `SectionHeading` and never gets one (decision 16), so nothing here is owed to that file.

**These are additions to specs pipeline 2 already rewrote and left green** (the amended spec's "Deletions": "pipeline 3 adds the stream's own assertions afterwards"). This task does not re-cut the chapter-children list, does not move the WorkRow colour reads to `#work`, and does not touch the tonal-line assertion — pipeline 2 did all of that. If Task 1 found any of those four specs red on the merged base, that is `blocked:`, not repair work here.

**Every scroll uses pipeline 1's `tests/e2e/helpers/scene.ts`** — `openScene`, `scrollToPlayhead(page, playhead)`, `scrollToActTwo(page, u)`, `readSvh(page)`, `CANVAS`. No fraction scroll survives in the files this task touches: the wrapper is now `sceneWrapperSvh(columns)` tall, so a fraction that used to mean "card two" now means "somewhere in the dolly", and a fraction-based assertion is silently testing a different beat than its name says. `scrollToPlayhead` derives its unit from `wrapper.offsetHeight / Number(wrapper.dataset.svh)`, which is exact at any column count.

**Work, per file:**

- `light-chapter`: add `await expect(page.locator('#projects #archive')).toHaveCount(1)` to the chapter-children test — the stream is a descendant of `#projects`, not a fifth chapter child.
- `section-enters`: add one test that `#archive .stream-title` has text matching `/all work|todos os trabalhos/` after `#projects` mounts. No opacity assertion: the heading is offscreen in the hidden state, not faded.
- `nav-on-light`: the skip-link path becomes the first stream case-study row: `page.locator('#archive .stream-item .workrow-link').first()`, `focus()`, `Enter`, same URL assertion. The on-light expectations pipeline 2 rewrote stay as they are.
- `scene-no-webgl`: after the existing assertions add `await expect(page.locator('#projects #archive.stream--visible')).toHaveCount(1)`, `await expect(page.locator('#archive li.stream-item')).toHaveCount(archive.length)`, `await expect(page.locator('#archive input, #archive select, #archive [role="listbox"], #archive button')).toHaveCount(0)` (no toolbar), `await expect(page.locator('#archive a.stream-skip')).toHaveCount(0)` (the skip-past link is a hidden-state affordance; in the visible state the rows are ordinary content), and keep `expect(errors).toEqual([])`. Read the count as `archive.length` imported from `src/data/archive` so the test follows the data.
- `scene-reduced-motion`: add `await expect(page.locator('#archive li.stream-item')).toHaveCount(archive.length)` before the pin assertion.
- `scene-scrub`: "clicking the settled card opens its project" reads `href` from the `#archive .stream-item .workrow-link` whose `href` ends with the featured slug read from `projects`; "the project index skip-link navigates" becomes "a stream row navigates to its project": focus the first `.workrow-link` in `#archive`, `Enter`, URL matches. Pipeline 1 already converted this file's fraction scrolls to `scrollToPlayhead` / `scrollToActTwo` and already asserts `data-act`, `data-slot` and `data-registrations` through act two; **do not add a second `data-act` assertion here.**

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/light-chapter.spec.ts tests/e2e/section-enters.spec.ts tests/e2e/nav-on-light.spec.ts tests/e2e/scene-no-webgl.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/scene-scrub.spec.ts` → all passed on both projects (the list reporter's final `N passed` line, zero `failed`). `grep -n "scrollToFraction\|scrollIntoSection\|scrollToSceneFraction" <the six files>` → no output.

**Boundaries:** No new spec file here (Task 10). No change to `pixel-gate.spec.ts` or its goldens. No new helper module: `tests/e2e/helpers/scene.ts` is pipeline 1's and is imported, not extended.

- [ ] Extend the six files
- [ ] Kill 4173, run the six specs, green on both projects; commit `test(e2e): the stream joins the chapter's assertions`

### Task 10: `stream.spec.ts`, the acceptance for this pipeline

**Files:**
- `tests/e2e/stream.spec.ts` — create; nothing outside this list

**Interfaces:**
- Consumes: `archive`, `yearBlocks` from `src/data/archive.ts`; `columnsFromSvh` from `src/utils/navTarget.ts`; `friezeLayout`, `friezeExtent` and the row constant from `src/utils/friezeLayout.ts`; `playheadForItem` from `src/utils/friezeTargets.ts`; `scrollTargetFor`, `volumeShotPlayhead` from `src/utils/sceneMotion.ts`; `openScene`, `scrollToPlayhead`, `scrollToActTwo`, `readSvh`, `CANVAS` from `tests/e2e/helpers/scene.ts`.

**Work:** Twelve tests. Every scroll goes through pipeline 1's `tests/e2e/helpers/scene.ts`; **no fraction scroll and no local copy of a helper.** The wrapper is `sceneWrapperSvh(columns)` tall, so a fraction means a different beat at every column count, and copying `scrollToFraction` out of `scene-scrub.spec.ts` would freeze act one's arithmetic into a spec about act two. The column count comes from the DOM: `columnsFromSvh(await readSvh(page))`, so the same test is correct on desktop and on `mobile-chromium` without a second formula.

1. **Smoke.** Go to `/`, wait for the loader, wait for `#projects .scene-canvas-wrap[data-ready="true"]`; `#root` (or whatever `index.html` mounts on: read it) is non-empty; zero console errors and page errors across the load and one scroll to the bottom.
2. **171 rows, sums.** `#archive li.stream-item` count equals `archive.length`; for each `.stream-year`, the `data-year` and the count in `.stream-year-count` match `yearBlocks(archive)`; the counts sum to `archive.length`; the first row's `data-serial` is `archive.length` and the last's is `1`.
3. **Origin, in both languages.** Every `li[data-origin="freelance"] .workrow-meta` contains `freelance`; no `li[data-origin="professional"] .workrow-meta` exists; `li[data-origin="freelance"]` count is at least 1. Then switch the language and assert the word came from the locale, not from the datum: with `personal` pieces present, `li[data-origin="personal"] .workrow-meta` reads `personal` in EN and `pessoal` in PT. Today no piece is `personal` (spec decision 9), so that half runs against a fixture row injected in the test's own page context, or is skipped with `test.skip(count === 0, 'no personal piece yet')` and re-armed by the first one that lands — the EN/PT assertion on `freelance` runs unconditionally either way.
4. **Focus moves the camera, and the assertion is the camera, not the attribute.** `data-focus-target` is written by the same handler under test, one line before the scroll, so asserting it proves only that the handler ran. This test asserts the APPLIED position. Setup once per case: `openScene`, `scrollToActTwo(page, 0)` (the volume shot), read `columns = columnsFromSvh(await readSvh(page))`, build `layout = friezeLayout(archive, rows)` and `extent = friezeExtent(layout, rows)` in Node, and read `wrapperTop` and `wrapper.offsetHeight` from the page.

   For each case, **reach the row with real `Tab` presses, not `.focus()`** — `:focus-visible` is what turns the row into the pill, and a scripted `.focus()` does not always match it, so a `.focus()`-driven test can pass on a pill nobody can see. Tab in from the section before the stream, then press `Tab` until `document.activeElement` carries the wanted `data-item-id` (bounded, so a miss fails instead of hanging).

   Assert: `window.scrollY` settles within 4 px of `scrollTargetFor(playheadForItem(id, layout, extent), wrapperTop, wrapperHeight, innerHeight, columns)` within 4000 ms; the canvas `data-act` is `'2'`; and the focused element is the pill — its box has `top === 16` and `clip-path` computes to `none` (the row is `absolute` inside the fixed `#archive` container; asserting `position === 'fixed'` on the row would fail by design), and **`document.elementFromPoint(cx, cy)` at the pill's centre is the pill itself (or a descendant of it)**, which is the assertion a bounding box cannot make: a pill trapped in `.scene-sticky`'s stacking context still reports the right box while painting under the nav.

   Cases, so the test covers more than one column and both row kinds: the first case-study row (a `WorkRow`, `span: 2`, near column 0), one editorial row in a middle year block, and the LAST editorial row (oldest, the far end of the dolly). Also assert the negative: focusing the row immediately after one already in frame, within the same `data-year` group, leaves `window.scrollY` unchanged (assumption 27).
5. **The nav link lands on the volume shot.** `openScene`, click `header .nav-link[href="#archive"]`; within 4000 ms `window.scrollY` is within 2 px of `scrollTargetFor(volumeShotPlayhead(columns), wrapperTop, wrapper.offsetHeight, innerHeight, columns)` with `columns = columnsFromSvh(await readSvh(page))` — one formula, both projects, no `(h/innerHeight × 100 − 550) / 25` variant. **The constant in the column formula is 700, not 550:** `sceneWrapperSvh(c) = 550 + 150 + 25c`, so act two's fixed 150 svh of release and approach belongs on the left of the subtraction; the 550 form reports 6 extra columns and aims the assertion 150 svh short. The test never spells the formula out anyway — it calls `columnsFromSvh`. Then `data-act` is `'2'`.
6. **Reduced motion.** `test.use({ contextOptions: { reducedMotion: 'reduce' } })` in a describe: the stream has `archive.length` rows; the skip-past link is present and first; clicking the nav link puts `window.scrollY` at the same target immediately (no Lenis: `waitForTimeout(100)` then assert within 2 px); tabbing to a row in another year block applies its target immediately, with no animation frame in between.
7. **Phone layout without WebGL.** With the `webgl2` refusal init script from `scene-no-webgl.spec.ts`, for each of `[390, 844], [360, 800], [320, 568]`: `setViewportSize`, reload, `#archive.stream--visible` present, `document.documentElement.scrollWidth <= innerWidth + 1` (no horizontal overflow), the first `.stream-year-label`'s box is above the first `.stream-item`'s box and spans the column (inline heading, not sticky side column: `getComputedStyle(label).position !== 'sticky'`), and the first `a.stream-row .stream-row-meta` sits below `.stream-row-title` (two-line row: `meta.top >= title.bottom - 1`).
8. **The skip-past link is the first focusable and it works.** `openScene`; Tab in from the element before the stream; the first stop inside `#archive` is `a.stream-skip`, it renders as a pill (box `top === 16`, `clip-path` none, `elementFromPoint` at its centre is it), its text matches `/skip past all work|pular todos os trabalhos/`, and `Enter` moves focus and the scroll to `#work` without passing through a single row.
9. **Traversal from both ends.** Tab forward from the skip link through the first five rows: each stop is a pill, and `data-item-id` advances in `serial`-descending order. Then Shift+Tab back out of the stream from the first row: focus lands on the element before `#archive`, no pill is left painted (`document.querySelectorAll('#archive :focus-visible')` is empty), and `window.scrollY` did not move on the way out. Repeat from the far end: focus the last row, `Tab` once, and focus leaves the stream forward into `#work`.
10. **Rapid traversal does not queue moves.** Press `Tab` 40 times with no wait between presses, crossing at least two year boundaries; then wait for the scroll to settle and assert `window.scrollY` is within 4 px of the target for the row that actually holds focus at the end — the last focus wins, not an earlier queued one (assumption 28). Assert too that fewer moves ran than boundaries crossed is not required; only that the final position matches the final focus.
11. **Keyboard exit from mid-stream.** With focus on a row deep in the stream, `Shift+Tab` back to the skip link and `Enter`: focus and scroll reach `#work`; then `Shift+Tab` from `#work`'s first control returns into the stream at its last row, not at its first, so the exit did not reorder the document.
12. **The fixed container is why nothing else scrolls (added 2026-09-10, guards the ruling).** `openScene`, `scrollToPlayhead(page, 1)`, settle. `Tab` to the LAST row of one year block deep in act two (bounded Tab loop as in test 4), settle. Read the NEXT row's `getBoundingClientRect()` before pressing anything: `x` within `[0, innerWidth]` and `y` within `[0, innerHeight]` (the clipped box is on-screen, so the browser has nothing to scroll). Press `Tab` once, then sample `window.scrollY` every animation frame until unchanged for 10 frames. Assert: the samples are monotonic and none equals `#projects`'s document top (shape A ruled out); `.scene-sticky.scrollTop === 0 && .scene-sticky.scrollLeft === 0` at every sample (shape B ruled out); the final `scrollY` is within 4 px of the row's `scrollTargetFor(playheadForItem(...), …, columns)`; the focused pill's `top === 16`; and `Number(getComputedStyle(document.querySelector('#archive')).zIndex) > Number(getComputedStyle(document.querySelector('header.nav')).zIndex)`. Two premise guards in the same test: `getByRole('region', { name: /all work|todos os trabalhos/ })` resolves and `#archive li.stream-item` still counts `archive.length` with the fixed styles applied (a 0×0 container did not prune the accessibility tree); and `#archive.getBoundingClientRect()` is `(innerWidth / 2, 16)` both at `scrollY 0` and at playhead 0.5 (no ancestor has re-parented the fixed box). Under reduced motion (a second describe, as test 6) the same run applies the target in one step, no intermediate sample.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/stream.spec.ts` → `24 passed` (12 × 2 projects).

**Boundaries:** No change to app code from this task; a red here that needs app code goes back to the task that owns the file. No local helper: import from `tests/e2e/helpers/scene.ts`.

- [ ] Write the twelve tests; observe test 4 red against a build without Task 6 (or with `onRowFocus` stubbed) at least once, then green
- [ ] Kill 4173, run, `24 passed`; commit `test(e2e): the stream is the accessible twin`

### Task 11: contrast, recomputed as a unit

**Files:**
- `tests/unit/friezeLegibility.test.ts` — create
- `docs/contrast.md` — modify: the light-chapter table gains rows 16 to 20; rows 1, 2, 4, 9, 10 and 14 lose the selectors that no longer exist; the "Grounds:" paragraph loses Archive; nothing outside this list

**Interfaces:**
- Consumes: `actTwoPose`, `actTwoProgress`, `actTwoBeats`, `sceneGeometry`, `projectPoint`, `CAPTION_MIN_NAME_PX` (pipeline 1); `friezeLayout`, `friezeExtent`, `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, the row constant, `CELL_TITLE_WORLD` (pipeline 2).

**Work, the size:** the cell title's size constant is **`CELL_TITLE_WORLD = 0.06`, in world units, exported from `src/components/canvas/scene/friezeText.ts`.** There is no `CELL_TITLE_PX` and no design-width ratio to divide by: the title is drawn at a world height and the projection is what turns it into pixels, so the derivation is one step, not the `CAPTION_NAME_PX / CARD_MAX_PX` two-step the first draft borrowed from the card caption.

The test computes, at the END of the approach beat (`u = actTwoBeats(columns).approach`; read it, do not hardcode), the camera pose `actTwoPose(u, extent, sceneGeometry(w, h))`, then projects a world segment of length `CELL_TITLE_WORLD` at the wall's depth through `projectPoint`, and multiplies the resulting frame fraction by the viewport height to get CSS px. Viewports `320×568`, `390×844`, `1440×900`, `1920×1080`; `console.info` prints all four so the smallest desktop value goes into row 17 and the phone values go into the row's note.

**`projectPoint` is valid here and only here.** It is documented "for a camera that only ever pitches", and the approach beat ends with the camera square to the wall (yaw 0) before the dolly starts yawing along it — so the pitch-only projection is exact at this `u` and would be wrong at any dolly `u`. The test asserts `Math.abs(pose.yaw) < 1e-6` at the sampled `u` first, so the day the choreography changes the test fails loudly instead of reporting a wrong number. Pipeline 2's `tests/e2e/helpers/frieze.ts` is the yaw-aware path for anything mid-dolly; this test does not need it.

The assertion is `>= CAPTION_MIN_NAME_PX` (12 px) **on the two desktop viewports only** (assumption 16). The two phone values are printed and recorded in the table, not asserted: act two's approach frames the whole newest block, a 320 px-wide portrait frame fits the same block into a third of the width, and a phone value under 12 px is a fact about the beat for Kevin's manual pass to judge, not a regression this test can fix. If the approach-end frame puts a cell other than the newest block's smallest in frame, take the smallest cell in frame and say so in the test's comment.

**Work, the table:** the formula is WCAG 2.x relative luminance, `L = 0.2126 R + 0.7152 G + 0.0722 B` with each channel linearised (`c/12.92` under 0.03928, else `((c + 0.055)/1.055)^2.4`), ratio `(L1 + 0.05)/(L2 + 0.05)`; alpha colours composited on the ground first. Verify every number with the one-liner below before writing it. Rows to add, ground cream `#F5F2EC` unless noted:

| # | pair | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 16 | wall cell title, professional → ink `#0B0E14` (rasterised) | cream | 17.29 | 4.5 | ✅ |
| 17 | wall cell title, freelance → `#B22B47`; personal → `#2A54B5`; recorded at the smallest approach-end size, desktop `<N px>` (1440×900 / 1920×1080) and phone `<N px>` (390×844 / 320×568), all from `friezeLegibility.test.ts`. Both hexes clear 4.5 at any size, so the size does not change the verdict; it is recorded because the spec asks for it, and the phone figures are recorded, not asserted (assumption 16) | cream | 5.64 / 6.20 | 4.5 | ✅ |
| 18 | wall cell meta and serial → muted `rgba(11,14,20,.62)` ≈ `#646566`, drawn at `0.04` world units, `<N px>` at the dolly's reading distance from `friezeLegibility.test.ts`; wall hover lift → `accentDeepLargeFor`: `#B22B47` / `#2A54B5` / `#7A6800` | cream | 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 19 | stream, visible state: `.stream-title`, `.stream-year-label`, `.workrow-title`, `.stream-row-title` → ink; `.stream-total`, `.stream-year-count`, `.stream-serial`, `.stream-row-meta`, `.workrow-meta` (origin word), `.stream-row-arrow`, `.workrow-arrow` → muted; hover AND `:focus-within` lift → deep-large triplet (title 17 px, so the yellow slot is `#7A6800` at 4.94, which still clears 4.5) | cream | 17.29; 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 20 | stream, hidden state: the focused pill, `var(--text)` on `var(--bg)` inside the chapter → ink on cream, border `var(--hairline)` and outline ink; the pill's own `:focus-within` accent, where `.stream-row-title` lifts to `--row-tint-deep-large` on the pill's `var(--bg)` cream → the same deep-large triplet, at the pill's 14 px; focus rings on the visible state → ink | cream | 17.29; 5.64 / 6.20 / 4.94 | 4.5 (text), 3.0 (ring) | ✅ |

Then audit the WHOLE table, not only the rows this pipeline adds: every existing row is read for selectors that no longer exist in the tree, and each one is dropped in the same commit, because a table that names dead selectors is not a recomputed audit. Known at planning time: row 1 loses `.archive-count strong`, dropdown text and search text; row 2 loses `.archive-chip`, `.archive-count`, search placeholder, the dropdown label/caret/options **and `.workrow-ornament`, which Task 4 deletes**; row 4 loses `.archive-star` and dropdown `.is-selected` (**row 4 was missing from the first draft's list**); row 9 loses `.btn--ghost (Archive load-more)`, which leaves the row empty and it goes; row 10 loses `.archive-search:focus`; row 14 loses the Archive ground mention (Skills remains the tonal section). The "Grounds:" paragraph loses Archive from the tonal list. Every row whose selector list changed has its ratio re-derived from the surviving selectors with the one-liner, not carried over.

**Acceptance check:** `npx vitest run tests/unit/friezeLegibility.test.ts` → green, with four printed title sizes and the meta/serial size; the one-liner returns the five ratios in the rows: `node -e "const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);const R=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return((x+0.05)/(y+0.05)).toFixed(2)};const H=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const C=H('#F5F2EC'),I=H('#0B0E14');const M=I.map((c,i)=>Math.round(c*0.62+C[i]*0.38));console.log(R(I,C),R(M,C),R(H('#B22B47'),C),R(H('#2A54B5'),C),R(H('#7A6800'),C))"` → `17.29 5.23 5.64 6.20 4.94`. `grep -in "archive-\|archivedropdown\|load-more\|workrow-ornament" docs/contrast.md` → no output, and `grep -c "Archive" docs/contrast.md` → `0` (case-sensitive `archive` alone would miss the capitalised ground mentions, which is how row 14 survived the first draft's check).

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

**Work, the probe:** `node perf/act-two-probe.mjs [--runs 5] [--no-build]` prints one JSON line with the median over runs of `warmMs`, `maxLongTaskMs`, `frameP50Ms`, `frameP95Ms` and `domNodes`.

`warmMs` measures **the scene's own warm-up window, not the loader's.** The window opens where `SelectedWorkScene.tsx` opens it: `entranceDone.then(...)`, then `HERO_SETTLE_MS` (1500 ms), then `onIdle(warm, 2000)` — lines 88–92 and 159–166. It closes where the scene closes it: `gl.domElement.dataset.warm = 'true'` in the same effect's `finally`. So the probe's two marks are the DOM proxy for `entranceDone` that the existing harness already waits on, `[data-entrance="settled"]` (`perf/lib/browser.mjs:198`, `perf/lib/instrument.mjs:176`), and `canvas[data-canvas="selected-work-scene"][data-warm="true"]`. It does **not** start from `body[data-loader-state="done"]`: that attribute has two converging writers (`perf/decisions.md:395`), fires before the hero rise, and the 1500 ms settle plus an idle callback sit between it and the scene, so a loader-anchored figure measures the entrance and reports it as the scene's cost. `data-frieze` is read alongside and recorded, so a run where the rasterisation failed (`"failed"`) is never averaged in with the ready ones.

`maxLongTaskMs` is the longest task across a wheel-gesture scrub from the wrapper's top to its bottom at 1200 px/s (the `scroll-transition` gesture, re-aimed at `#projects .scene-scroll` and its `data-svh`-derived height, since the wrapper is no longer 550 svh). `frameP50Ms` / `frameP95Ms` cover the dolly range only, `u` from `actTwoBeats(columns).approach` to `1` through `scrollToActTwo`'s arithmetic. `domNodes` is `#archive`'s `querySelectorAll('*').length`. Desktop viewport 1440×900 and one phone-shaped run at 390×844 with `deviceScaleFactor: 3`.

**Work, the measurement:** the base is the `staging` tip, and it is measured from a **production build of `staging`, in a second worktree, with its own `npm ci`** — `git worktree add ../portfolio-wt-perf-base origin/staging && npm ci && npm run build`, then the runner against that worktree's `dist` on the same rig, same viewport, same run count. Not this worktree's `dist`, not a dev server, and not a rebuild of `staging`'s source against this branch's `node_modules`: chunk bytes and compile time both move with the lockfile. On that build run `node perf/run.mjs idle-hero`, `load-entrance`, `battery-proxy` (`--runs 5`), `npm run perf:lh`, and the probe. On the base, `warmMs` and `maxLongTaskMs` are the only probe fields that exist; the dolly range and `domNodes` are `n/a`, because act two and the stream are not there. Then the same on this branch's head, built the same way. A busy or mismatched rig refuses, as the runner already enforces; do not `--force`. Record base, after and delta per metric in the entry and in "## Measured", each cell naming its report file.

The `perf/baseline.json` edit is a **hand edit, and it is a feature delta by design**: act two and the stream are new surface, so `Projects.js` and `WorkRow.js` legitimately grow and `Archive.js` legitimately disappears. The entry says so in those words. It is not an optimisation batch, so the ratchet is not invoked and `--update-baseline` is not run; the three keys are typed from the measured `dist/assets` listing, and the dormant byte-ceiling test is what proves the typed numbers are true.

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

**Work:** Present tense, current tree only, rewritten rather than appended. `### The stream` states: what it is (the DOM twin), where it mounts (both states, with the CSS classes) and **why the hidden state is a sibling of `.scene-scroll` rather than a child of the sticky pin** — the stacking-context rule is the kind of thing the next reader will otherwise "tidy up"; the hidden technique, the pill and its WorkRow resets; the skip-past link as the first focusable; the focus path (`playheadForItem` → `scrollTargetFor(…, columns)` through `scrollToItem`, gated on the year block, `data-focus-target` named as a debugging affordance and not a contract); the nav resolver reading `columns` from `data-svh` and composing `volumeShotPlayhead`; the semantics (`h2`, total, `h3` per year, `ol`), row anatomy for both kinds, the arrow rule, why the serial is muted and read, and the reduced-motion behaviour. The Light chapter section: four children, `#archive` inside `#projects`, the tonal rhythm as it now is (cream, cream, cream, tonal), and the fact that the exit veil assertion is unchanged. "Layout and section flow": section flow `Hero, Projects (with the stream), Work Experience, Stats, Skills, Contact, Footer`. "Content model": archive items per the spec's shape, `yearBlocks`, no filters. WorkRow: used by Work Experience and the stream's case-study rows; the float and the ornament are gone; arrow direction rule. Index: the row "Archive, Work Experience rows" becomes "Work Experience rows, stream case-study rows"; the Selected Work row adds `src/components/sections/Stream.tsx`, `src/utils/navTarget.ts`.

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
- `grep -rn "pieces_\|skipPast\|origin" src/i18n/locales/en.json` and `grep -rn "sections.archive" src --include='*.tsx'` agree: every key added in Task 3 is read somewhere, and the origin keys pipeline 2 added are read by both the wall and the stream; delete the ones that are read by neither (both locales, one commit).
- The `codex-computer-use` pass: invoke the skill against `npx vite preview --port 4173` (after `npm run build`), at 390×844 and 1440×900, with the brief: walk every beat (overture, four cards, release, approach, dolly to the last year, exit), Tab into the stream from the hero and confirm the skip-past link comes first, that each pill paints ABOVE the nav rather than behind it, that the camera moves on a year change and holds within a year, and that Shift+Tab leaves the stream cleanly from both ends; disable WebGL2 via the init script (`chrome://flags` is not needed: run with `--disable-webgl2` or the DevTools override) and confirm the visible stream with 171 rows and no horizontal overflow at 390 px. The run counts only with its registry line and a readable log. A finding goes back to its owning task.
- `git push -u origin feat/act-two-access`; `gh pr create --base feat/act-two` with: the measured table from "## Measured", the codex registry line, what was verified by command, the manual steps for Kevin (desktop and phone: the nav link lands on the volume shot; Tab from the hero reaches the skip-past link first, then rows, each as a pill ABOVE the nav; the camera moves on a year change and stays put within a year; Shift+Tab exits cleanly from both ends; no WebGL shows the stream; a freelance row shows the word in both languages; the count lines sum), and the one item still flagged from "Spec conflicts", item 4 (the tonal rhythm). Then stop: the three-leg review is Kevin's to trigger.

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

- Every spec line under "The stream" has a task: structure (5), hidden and focusable (5, 6), mounted outside the sticky pin (5, 6), the bilingual skip-past link (3, 5, 6, 10), focus to camera gated on the year block (6, 10), skip links absorbed (6), no-WebGL (6, 9), `id="archive"` and the nav link (7, 10), reduced motion (9, 10).
- **"Deletions" belongs to pipeline 2, not here.** `Archive.tsx`, `ArchiveDropdown.tsx`, the `.archive-*` CSS, the toolbar strings and the first rewrite of `light-chapter`, `section-enters`, `reduced-motion` and `nav-on-light` are all pipeline 2's, per the amended spec; Task 8 audits them and Task 9 only adds the stream's assertions on top. What this pipeline does delete: the skip links with their CSS and `stack.indexLabel` (6), and WorkRow's float and ornament (4). `archive.test.ts` is rewritten in Task 2 for the new item shape. `perf-budget.spec.ts` is not in this plan at all: it has no `#archive` expectation, only the word "archive" inside a comment about file mtimes, so there is nothing to drop or rewrite there.
- Every "Acceptance" item for this pipeline: stream e2e (10), no-WebGL (9), reduced motion (9, 10), smoke (10), contrast (11), performance (12), archive data (2). `data-act` is pipeline 1's assertion in `scene-scrub`; this plan reads it as a precondition in Task 10, never as its own coverage.
- "Records": architecture and index (13), contrast (11); CONTEXT already carries the glossary from the spec commit, citation updated (13).
- Names match across tasks and against both sibling plans: `Stream`, `StreamProps`, `mode`, `onRowFocus`, `scrollToItem`, `data-focus-target`, `columnsFromSvh`, `resolveNavTarget`, and the consumed seams `scrollTargetFor(playhead, …, columns)`, `volumeShotPlayhead`, `playheadForItem`, `cellFor`, `blockIndexAt`, `actTwoBeats`, `CELL_TITLE_WORLD`, `sections.archive.origin.*`, `tests/e2e/helpers/scene.ts`. `releaseBeatProgress` and `releaseBeatScrollY` are gone: they re-derived beat arithmetic pipeline 1 already exports.
