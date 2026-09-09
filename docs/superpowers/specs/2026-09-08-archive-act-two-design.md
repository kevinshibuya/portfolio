# The archive as act two of the Selected Work scene

**Date:** 2026-09-08 · **Owner:** Kevin · **Status:** approved in chat (grilling, five rounds, forty-four questions; one design canvas)

The Archive section, its toolbar and its 167-row list are retired. Every piece of work Kevin has shipped (171 today: 9 projects with a case study and 162 GZH editorial interactives) is shown as a second act of the pinned Selected Work scene. After the fourth card settles, the camera pulls back to reveal a wall built from all of it, then travels along the wall year by year. A DOM stream of the same data is the accessible twin. This spec is the contract for three implementation pipelines that plan and build in parallel; the seams between them are fixed here so that no planner decides them alone.

## Direction and what it rules out

Kevin asked for a designer-grade archive with the cinematic feel of the Selected Work scene, and rejected a flat list (the first draft, kept as the accessible stream). Two standing rules shape the answer:

- **No fourth canvas** (ADR 0009, `CLAUDE.md`). The archive cannot open its own WebGL context. It lives inside the scene's canvas as a second act.
- **No cards outside the scene** (ADR 0002, `docs/architecture.md#workrow`). A wall of 171 tiles would be bento in three dimensions. Pieces are set typographically on the wall; only the nine case studies keep the scene's card object.

Considered and rejected: DOM CSS 3D (a perspective container scrubbed by Framer) reads as a trick next to a real scene; amending ADR 0009 for a fourth canvas costs a second GPU context and breaks the "two live, three mounted" invariant for nothing the shared canvas cannot give.

## Settled decisions

Numbers in brackets are the grilling questions.

1. **Purpose is proof of volume, read by skimming** (Q2). Every piece is present; the reader mode is skim, not search. No search field, no dropdowns, no pagination, no sort.
2. **The archive is act two of the Selected Work scene** (Q27). Same canvas, same fog, floor and camera language, one longer pin.
3. **The spatial figure is a frieze** (Q28, Q36). One wall, year blocks side by side, newest on the left, each block's width proportional to its count, pieces stacked a fixed number of rows high. The first beat frames the whole frieze in one shot; that shot is the volume claim.
4. **A piece is typography on the wall; a case study is a card** (Q29, Q37). Cells carry title, one meta line and a serial, ink on cream, no slab, border or bar. The nine case studies are embedded in the frieze at their year, each spanning 2×2 cells, using the scene's card object with mockup and caption but no blob shadow: on a vertical wall it reads as the banned halo.
5. **Origin is the only classification the reader sees** (Q11, Q20, Q31). Every piece has an origin: `professional`, `freelance` or `personal`. There is no toggle. Freelance and personal pieces set their title in a fixed deep accent (freelance pink, personal blue); professional pieces are ink. Counts live on the year blocks, never in a title (Q8, Q13).
6. **Content types stay separate; the archive unifies them** (Q20). `Project` and `Embed` remain distinct in the data (TypeScript versus CSV, inward versus outward links). The archive item drops `kind` and gains `origin` plus whether it has a case study. `oss` is deleted from the type.
7. **Serial numbers count down from the total** (Q22). The newest piece is 171. The first number a reader meets is the count.
8. **Projects sort at year end** (Q25). They carry a year only, so they lead their year block. This is the intended hierarchy, not a defect.
9. **Empty origin buckets are invisible** (Q24). Nothing renders for an origin with zero pieces; when the first personal piece lands it appears with its accent and nothing else changes.
10. **The title object carries act two** (Q30, Q43). The morphing title, which today shows the crossed project's name, morphs to "all work" at the release beat and then to each year string as the camera crosses that block. The `Anton` fence ("the Selected Work title") covers this object; ADR 0012 records the reading.
11. **Hover lifts, click opens** (Q15 revised, Q39). Pointer over a cell lifts its text to the row tint and shows a pointer cursor. Click opens the piece through the same callback path the settled card uses: case studies to `/projects/:slug`, editorial pieces to GZH in a new tab. No inversion on the wall. Taps on touch use the scene's existing delta threshold.
12. **Act two's scroll budget is 25 svh per frieze column plus 150 svh of release and approach** (Q40). The grilling estimated seven viewports at 22 columns; first-fit packing of today's data at 8 rows gives 26 columns, so act two is about eight viewports. The per-column rule is the contract, not the total. The wrapper height becomes a function of the data, replacing the `550svh` literal.
13. **Reduced motion is stills** (Q41). The volume shot as a still, then one still per year block, cut between them, title changes without the morph. Same contract as act one.
14. **The DOM stream is the accessible twin** (Q32, Q42). The flat, year-grouped stream drafted on the design canvas lives inside the scene section's DOM. It is visually hidden but focusable when the scene runs; focus on a stream item moves the camera to that piece. It is the visible archive when WebGL is unavailable. One data source feeds the wall and the stream.
15. **Phones run act two, with the same 8 rows** (Q33, revised in plan review). The row count is bounded by what fits in frame at the legibility floor (`maxRowsInFrame`, 8 on a 393×851 phone as on desktop), because the act-two camera has no vertical travel and a taller frieze would leave rows off frame forever. Portrait sees fewer columns at a time, not more rows. Postprocessing stays desktop-only as today.
16. **Section names lose the template** (Q21). Plain nouns, no italic word, no trailing period, no tagline, in both languages: `all work` / `todos os trabalhos`, `experience` / `experiência`, `stack` / `stack`, `numbers` / `números`, `contact` / `contato`. `selected work` stays. The overture line stays. Titles change in one commit on this branch; taglines die with each section's own pipeline.
17. **Light chapter boundary is unchanged** (Q7). Act two is inside the chapter; the exit veil and the ink Contact stage are untouched.

## Content model

`src/types/content.ts` and `src/data/archive.ts`.

```ts
export type Origin = 'professional' | 'freelance' | 'personal'

export interface ArchiveItem {
  id: string
  title: string | Bilingual   // embeds are Portuguese-only (ADR 0001)
  origin: Origin
  caseStudy?: { slug: string } // present for the nine; decides card versus cell and the arrow direction
  type?: EmbedType             // editorial pieces only
  editorial?: string           // editorial pieces only
  date: string                 // display form; dd/mm/yyyy for editorial, yyyy for projects
  sortDate: number
  year: number
  href: string
  internal: boolean
  serial: number               // 171 for the newest, 1 for the oldest
}
```

- `Project` gains `origin?: Origin` (default `professional`). `hotmart-bunde` (Política Essencial) is `freelance`. Nothing is `personal` yet.
- `ArchiveKind`, `kind`, `highlight`, `highlightOrder` and `gradient` leave the archive item. `byFeatured`, `archiveTypes`, `archiveEditorials` and `archiveKinds` are deleted with the toolbar. `archiveYears` becomes the year blocks below.
- Year blocks are derived, not authored: `yearBlocks(items): { year, count, items }[]`, newest first. Today: 2026 (3), 2025 (42), 2024 (118), 2023 (8), total 171.
- `src/data/embeds.csv` and `src/data/embeds.ts` are unchanged. All 162 rows parse today.

## Act two choreography

Owned by pipeline 1. Pure functions in `src/utils/sceneMotion.ts`, unit-tested, no React state per frame (ADR 0010).

Act one is untouched: overture, approach, four card slots, playhead clamped at `MAX_SEG` when card four settles. Act two begins where act one ends.

| Beat | Scroll length | Camera | Title |
| --- | --- | --- | --- |
| Release | 100 svh | Pulls back and up from the card-four slot, yaws to face the corridor's end; the whole frieze enters frame and holds; card four dissolves across the beat so nothing stands between the camera and the wall afterwards | Card four's name morphs to `all work` |
| Approach | 50 svh | Moves in until the newest year block is legible (cell title at or above the legibility floor) | Holds `all work` |
| Dolly | 25 svh per column | Lateral travel along the frieze, newest to oldest, constant speed per column, an ambient breath on time only; the camera is bottom-anchored so the wall's bottom edge sits on the frame's bottom edge | Morphs to the year string at each block boundary; the title overprints the wall's top row (see below) |
| Exit | none added | Slows to rest at the last column; the pin releases into the next section | Holds the last year |

**Six rows, not eight** (implementation review, 2026-09-08; Kevin's call, decision 15 amended a second time). Eight did not fit. The frieze is bottom-anchored and act two has no vertical camera travel, so whatever does not fit the frame at the dolly is off the TOP of it permanently. At the 144 px cell floor eight rows fill `832.4 / heightPx` of the frame height, so every viewport shorter than about 833 CSS px overflowed — 1280×720, which is Playwright's own desktop project, by 16 % — and `actTwoTopClearFrac` returned a NEGATIVE clearance there, which is the number pipeline 2 insets the top row's ink by. Seven rows still miss 720 px by 1.2 %. Six clear every viewport in the matrix, at 35 columns and 1025 svh of act two.

The claim this replaces read "eight rows is exactly what fits". It was checked at 1440×900 and 393×851 only, the two viewports where it happens to hold; `maxRowsInFrame` is not a constant but falls with viewport height, to 7 at 820×821 and 6 at 1280×720. The unit suite now asserts `maxRowsInFrame(g) >= FRIEZE_ROWS`, `friezeHeightFill <= 1` and a non-negative `actTwoTopClearFrac` across the whole matrix plus the short viewports it does not name, and those assertions go red at eight rows.

**The title still overprints the top row during the dolly.** Six rows lift the clearance to 0.13–0.18 of the frame, and the title band reaches 0.32 from the top, so the year title still reads over the top row's ink, as type over type. That remains the ratified reading, not a defect; `actTwoTopClearFrac` is what pipeline 2 insets by.

Seams pipeline 1 exports and the others consume:

- `ACT_TWO_RELEASE_SVH = 100`, `ACT_TWO_APPROACH_SVH = 50`, `ACT_TWO_SVH_PER_COLUMN = 25`.
- `actTwoSvh(columns)` and `sceneWrapperSvh(columns)`; the wrapper's inline height is set from the data, and the `550svh` literal and its comment in `src/index.css` go.
- `actTwoProgress(playhead)` in `[0, 1]`, and `actTwoPose(u, frieze, geometry)` returning camera position, yaw and pitch. `frieze` is the extent object from pipeline 2.
- `blockAt(u, frieze)` for the title string and for reduced-motion stills; `actTwoCardFade(u, frieze)` for card four's dissolve; `data-svh` on `.scene-scroll` carrying `sceneWrapperSvh(columns)`.
- Column-based targets: `playheadForColumn(col, frieze)`, `volumeShotPlayhead(columns)` and the numeric `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)`. The item lookup is not pipeline 1's: pipeline 2 exports `playheadForItem(itemId, layout, extent)` from `src/utils/friezeTargets.ts` (a pure module that imports both `friezeLayout.ts` and `sceneMotion.ts`), and pipeline 3 builds stream focus and the nav link on those two.
- The playhead's unit and `PLAYHEAD_SPAN` may change; `CARD_COUNT` stays 4 and every act-one pose is asserted unchanged by the existing unit tests.

## The frieze

Owned by pipeline 2. Layout is a pure module, `src/utils/friezeLayout.ts`, unit-tested; rendering is in `src/components/canvas/scene/`.

Layout:

- `FRIEZE_ROWS = 6` in both orientations (decision 15, amended); `maxRowsInFrame(g)` from pipeline 1 is the bound any future change must respect — and it is viewport-dependent, so it is asserted across the matrix, never at a single size.
- `friezeLayout(items, rows) → { columns, blocks: YearBlock[], cells: Cell[] }`. A `Cell` is `{ itemId, block, col, row, span: 1 | 2 }`. Case studies span 2×2 and sit at the head of their year block; cells fill column-major, newest first, left to right. A block's width is its column count; the frieze's world width is `columns × FRIEZE_CELL_W`, its height `rows × FRIEZE_CELL_H`.
- `FRIEZE_CELL_W = CARD_W / 2` and `FRIEZE_CELL_H = CARD_H / 2`, in world units, so a 2×2 span is exactly one scene card with no inset and the cell's legibility floor is `ceil(CARD_MIN_PX / 2) = 144` CSS px. Pipeline 1 creates `friezeLayout.ts` with these constants and the base extent type `{ columns, rows, blocks: readonly { year, startCol, columns }[] }`; pipeline 2 completes the module and may only extend that type (`count`, `width`, `height`), never replace it. `sceneMotion.ts` imports from `friezeLayout.ts`, never the reverse.

Cell contract (what is drawn):

- Title, at most two lines, ellipsised, never wrapped mid-word. Meta line: `type · editorial · dd.mm.yyyy` for editorial pieces, lowercase; `freelance` or `personal` alone for a case study whose origin is not professional; nothing for a professional case study. Serial, tabular figures.
- Ink on the cream wall. Title colour by origin: professional ink, freelance `--color-accent-pink-deep`, personal `--color-accent-blue-deep`. These are fixed mappings, not the index rotation. The hover lift uses the index rotation (`accentDeepLargeFor`), as `WorkRow` does inside the light chapter.
- The wall surface is the scene's cream (`#F5F2EC`), the same hex as fog and floor, so the wall has no visible edge in the volume shot except its own text.

Text rendering:

- Not one canvas per cell. The existing caption path (one 2D canvas, one texture and two meshes per card, no instancing) does not scale to 171. Pipeline 2 rasterises **one alpha-coverage texture per year block** (the title's own technique, `titleTexture.ts`) at the resolution the approach beat needs, capped at 4096 px on the long side, and colours it in a shader from a per-cell colour lookup (origin tint, hover tint). One mesh per block; hover hit-testing is UV to cell, not a raycast over 171 meshes.
- The mask encodes text role in its channels (title, meta, serial) so the shader colours each role from the per-cell lookup; the lookup texture's colour space is stated and asserted; masks are single-channel with no mipmaps. A failed rasterisation degrades to a blank cream wall with `data-frieze="failed"` and never marks WebGL unavailable.
- Redraw on language switch (case-study titles are bilingual) and on the resize debounce the captions already use. Rasterisation runs in the scene warm-up window behind `entranceDone`, never on first paint.
- Plus Jakarta Sans throughout. Anton stays on the title object only.

Interaction:

- `onCellClick(itemId)` and `onCellHover(itemId | null)` are callback props out of the canvas tree, decided in `Projects.tsx` like `onCardClick`. Case studies navigate; editorial pieces open `href` in a new tab with `noopener`. Hover state is a MotionValue or uniform, never React state (ADR 0010).
- Focus from the stream (pipeline 3) calls the same camera target the click path uses, through `playheadForItem`.
- Origin words are locale strings (`freelance` / `freelance`, `personal` / `pessoal`), read by the wall and the stream from the same keys.

## The stream

Owned by pipeline 3. The accessible twin, inside the scene section's DOM.

- Structure: the design-canvas draft. Year groups with a year label and count; a big row (the `WorkRow` at the archive size) for case studies with an inward arrow; a dense two-line row for editorial pieces with type, editorial, date and an outward arrow; serial on every row. Origin word on a case-study row only when not professional.
- When the scene runs: visually hidden, focusable, mounted outside the sticky pin (a sibling of `.scene-scroll`, where the skip links live today), because a sticky element forms a stacking context and a fixed pill inside it can paint under the nav. Its first focusable is a bilingual skip-past link to the next section. Focusing a row moves the camera through `playheadForItem` only when the row's year block differs from the one in frame; the row stays the link. This extends ADR 0011's skip links, which the stream absorbs (the nine case studies are its first entries by year).
- When WebGL is unavailable or lost: the stream is the visible archive, below the existing four-article fallback, styled for the light chapter. No toolbar.
- `id="archive"` sits on the stream's container so the nav link keeps working; with the scene running, the nav link scrolls to the release beat.
- Reduced motion: the wall still renders as stills (decision 13); the stream is unchanged.

## Deletions

`src/components/sections/Archive.tsx`, `src/components/ui/ArchiveDropdown.tsx`, the `.archive-*` rules in `src/index.css`, the toolbar strings in both locales, `tests/unit/data/archive.test.ts` in its current form (rewritten for the new item shape), the `#archive` expectations in `tests/e2e/light-chapter.spec.ts`, `section-enters.spec.ts`, `reduced-motion.spec.ts` and `nav-on-light.spec.ts` (rewritten, not dropped: the section returns as the stream in pipeline 3). Pipeline 2 performs these deletions and rewrites so its PR is green on the integration branch; pipeline 3 adds the stream's own assertions afterwards. `WorkRow`'s preview float and `ornament` lose their only consumer and go.

## Acceptance

Unit (`tests/unit/`):

- `friezeLayout`: every item has exactly one cell; case-study cells span 2×2 and never overlap; a block's width equals its column count; `columns` equals the sum of block widths; row count changes with aspect only through the crossover band.
- `sceneMotion` act two: act-one poses unchanged at every existing fixture; camera x is monotonic across the dolly; beat boundaries land at the svh constants; `blockAt` returns each year exactly once in order; `sceneWrapperSvh(c) = 550 + 150 + 25·c` for the packed column count `c`, so `sceneWrapperSvh(26) = 1350` today; card four is fully faded by the end of the release.
- Archive data: `serial` is 171 at the newest, 1 at the oldest, contiguous; origin defaults to professional; `hotmart-bunde` is freelance; year block counts sum to the total.

E2E (`tests/e2e/`):

- `scene-scrub.spec.ts` extended: a full scrub through act two raises zero console errors and rejections at the existing viewport matrix; `data-registrations` stays `'1'`; a `data-act` attribute reads `2` during act two and `1` before.
- Wall click on an editorial cell opens a new tab with the piece's `href`; click on a case-study card navigates.
- Stream: 171 rows, year counts sum to 171, focusing a row changes the camera target attribute; the nav link to `#archive` lands on the release beat.
- Reduced motion: act two renders stills, the title string changes without the morph, the stream is present.
- No WebGL: the stream is visible with 171 rows and no toolbar.
- The headless smoke on the surface: it loads, the root renders, zero console errors.

Contrast (`docs/contrast.md`, light-chapter table): cell title ink on `#F5F2EC`; freelance pink-deep and personal blue-deep on `#F5F2EC` at the smallest device-pixel size the approach beat allows; meta at ink-muted; the stream's rows in the no-WebGL state. Recomputed as a unit, verified, before the final PR.

Performance (ADR 0006, ADR 0007): measured on the rig, kept only on evidence. Act two may not raise first-draw compile time beyond what the warm-up window absorbs; block textures rasterise off the first paint; the scene-scrub e2e stays green at every viewport. No number in this spec is a budget; pipeline 3 records the measured deltas in its plan and the final PR.

Manual (Kevin): one pass at desktop and phone widths, every beat, before the final PR closes.

## Pipelines and the merge chain

Three plans, three implementations, one integration branch, one landing.

| Pipeline | Owns | Branch | Forks from |
| --- | --- | --- | --- |
| 1 · Motion | Act-two playhead, camera poses, wrapper height from data, title strings, `data-act`, reduced-motion stills, unit tests | `feat/act-two-motion` | `feat/act-two` |
| 2 · Wall | Content model change, `friezeLayout` completion and `friezeTargets`, block textures and shader, cells and embedded cards, hover and click callbacks, `Projects.tsx` click decisions, e2e for click, deletion of the old Archive section and the rewrite of the e2e specs that pinned it | `feat/act-two-wall` | `feat/act-two-motion` |
| 3 · Access | The stream with its skip-past link, focus-to-camera, no-WebGL state, nav link, phones, contrast table, performance measurement, docs | `feat/act-two-access` | `feat/act-two-wall` |

- `feat/act-two` is created from `staging` and receives the three PRs in order. A PR merges only after the one before it is reviewed, merged and closed; the next branch rebases onto the new base before its review. The final PR is `feat/act-two` into `staging`, which needs Kevin's per-action say-so.
- Each plan gets one review wave before task 1 (`reviewer` on Opus, `reviewer` on Fable, `codex-review`), consolidated into one fix pass. Each PR gets the three-leg review when Kevin says go.
- Planners answer their own grilling with the recommended answers and list every such answer under an `## Assumptions` heading in the plan, so the review wave can veto any of them.
- Model routing: plans 1 and 3 are drafted on Fable 5.1; plan 2 on GPT-6 Astra through the codex CLI. Each side's plan is reviewed by the other side as its cross-model leg. Implementation runs on Opus workers by default; the assignment of Astra to an implementation leg is a separate decision recorded in the plan that makes it.

## Provenance

References Kevin supplied (Dribbble, 2026-09-08), transcribed before the pivot to 3D: the events list from the Oskar Kadera portfolio (year column, title, metas, arrow, hovered row inverted) is the spine of the DOM stream; the Romanelli works page gives the stream its header composition; the Brad Mead posters give the serial number. The wall itself traces to the Selected Work scene's own corridor and the brief's "cinematic, like the highlights section". The design canvas: `https://claude.ai/code/artifact/00620e96-06ed-464d-80a1-b698ecb097e2` (the desktop stream and phone artboards are the stream; the poster-ledger artboard was rejected).

Absent by decision: eyebrows, description lines, stat strips, search, dropdowns, pagination, badges, drop shadows, icons per row, gradient washes, a lone italic word, a rail or bar on a cell.

## Records

- ADR 0012: the archive is act two of the Selected Work scene.
- `CONTEXT.md`: **Piece**, **Origin**, **Act two**, **Frieze**, **Year block**, **Cell**, **Volume shot**, **Stream**; **Archive item** rewritten; **WorkRow** note that Archive no longer consumes it directly (the stream does).
- `docs/architecture.md`: the Archive section is replaced by "Selected Work scene · act two" and "The stream"; the index at the top follows.
- `docs/contrast.md`: light-chapter table gains the wall and stream rows.
- Issue to open, out of scope: `perf/scenarios/scroll-transition.mjs` queries the retired DOM card stack and measures nothing of the scene.

## TODO

- [ ] Section titles renamed in both locales, italic and periods removed (decision 16), on this branch.
- [x] Plan 1 · Motion written, reviewed, assumptions listed.
- [x] Plan 2 · Wall written, reviewed, assumptions listed.
- [x] Plan 3 · Access written, reviewed, assumptions listed.
- [x] `feat/act-two-motion` merged into `feat/act-two`.
- [ ] `feat/act-two-wall` merged into `feat/act-two`.
- [ ] `feat/act-two-access` merged into `feat/act-two`.
- [ ] Contrast table recomputed and verified.
- [ ] Kevin's manual pass at desktop and phone widths: GREEN.
- [ ] `feat/act-two` landed on `staging`.
