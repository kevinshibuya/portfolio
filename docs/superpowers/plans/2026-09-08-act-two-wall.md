# Act-two Wall implementation plan

**Goal:** Render every archive piece as an interactive frieze inside the Selected Work scene, backed by one tested content and layout contract.
**Architecture:** Pure archive derivation and packing feed both the scene and pipeline 3's stream. Four year-block coverage textures supply typography through one shader mesh per block; nine embedded Projects reuse the scene's card object. Pipeline 1 owns the camera and wall placement; Projects owns navigation.
**Spec:** `docs/superpowers/specs/2026-09-08-archive-act-two-design.md`
**Execution model:** opus

## Global constraints

- Follow `CLAUDE.md`, `CONTEXT.md`, ADRs 0001, 0002, 0009, 0010, 0011 and 0012; use the glossary's terms.
- React 19, TypeScript strict, explicit utility/hook return types, no `any`, no new libraries, no `@react-three/drei`.
- Three mounted canvases, at most two live; no additional WebGL surface. Scene components render no DOM beyond the host canvas; routing stays outside `src/components/canvas/`.
- One animation lane per animation; SceneRig reads MotionValues and writes three objects. No React state per frame or scroll tick.
- Plus Jakarta Sans for cells; Anton stays on the Selected Work title. Bilingual strings from the first implementation commit; Embed titles remain Portuguese-only.
- Cream `#F5F2EC`; professional ink `#0B0E14`; freelance pink `#B22B47`; personal blue `#2A54B5`; meta ink-muted `rgba(11,14,20,.62)`. Hover title uses `accentDeepLargeFor(index)`.
- `FRIEZE_ROWS_LANDSCAPE = 8`; coverage texture long side ≤4096 pixels; renderer DPR ≤1.5, applied once. `sceneMotion.ts` imports `friezeLayout.ts`, never the reverse.
- `TAP_MAX_DELTA_PX = 6`; reduced motion uses stills and demand rendering. Rasterisation waits for `entranceDone` and the existing scene warm-up window.
- Keep `src/data/embeds.ts` and `src/data/embeds.csv` unchanged. Preserve Project ranking and all nine routes.
- Implementers tick each existing step immediately after its command succeeds, before the next step. Each implementation commit includes this plan's corresponding ticks. A controller alone ticks a spec TODO after acceptance and review approval.
- This planning delivery is one commit containing this file only, on `feat/act-two-wall`; no implementation, push, merge or deployment. Implementation commits described below are future work.

## Assumptions

1. Preserve existing archive IDs; break date ties by Project-first order, then source order.
2. Use 12 portrait rows, quantising the crossover blend to even row counts.
3. Use cells 0.6 × 0.44 world units and a 270 CSS-pixels-per-world-unit reading target.
4. Pack spans by first-fit column-major occupancy, with Projects first within each year.
5. Use RGBA coverage canvases and a nearest-filtered per-slot colour DataTexture.
6. Hover changes title colour immediately through uniforms, including under reduced motion.
7. Draw Jakarta titles at 0.06 world units and meta/serial at 0.04, with fixed-width digit advances.
8. Keep current textures visible during cancellable, incremental language and resize redraws.
9. Reuse card geometry at width 1.08, with the frame 0.01 world units ahead of the frieze.
10. Use stackCover, then desktopBento, then desktop for Project covers.
11. Share cover textures by reference counting across corridor and frieze consumers.
12. Open external links synchronously in the trusted click callback with noopener.
13. Keep JSON-LD unchanged because origin changes neither routes, names, years nor positions.
14. Keep the frieze in the scene's fog and composer; reconcile their reading-distance settings with Motion.
15. Adapt the retiring Archive consumer to the new fields until Access removes it.
16. Treat 22 columns as an illustrative motion fixture; use actual packed columns for production.
17. Allow partial-height reading views; reserve complete-frieze framing for the volume shot.
18. Treat origin labels as bilingual pairs: freelance/freelance and personal/pessoal.

## Spec conflicts

1. **Illustrative column count:** 171 pieces with nine 2×2 spans occupy 198 unit slots, already more than 22×8. Year boundaries require 26 landscape columns: 2 + 7 + 16 + 1. Use the specified dynamic budget: 150 + 25×26 = 800svh for act two and 1350svh for the wrapper. Preserve `sceneWrapperSvh(22) = 1250` as a synthetic Motion acceptance test. Twelve rows produce 19 columns and 1175svh wrapper height.
2. **Continuous blend versus integer packing:** fractional rows cannot hold discrete 2×2 spans. Quantise the smoothstep blend to 12, 10, 8; transitions occur only inside the existing crossover band. Swap layout, extent and texture generation together after the 150ms resize debounce; camera geometry uses that same committed extent.
3. **Deletion ownership:** deleting archive fields/exports breaks `Archive.tsx` before Access deletes it. Wall makes the minimum consumer migration in Task 2; Access still owns deletion, replacement stream, toolbar strings/CSS and old-surface e2e rewrites. No compatibility exports or old fields survive in the shared archive model. The intermediate toolbar is temporary, not an accepted final surface.
4. **Card caption versus cell copy:** retain card anatomy and its caption technique, but use the frieze's origin-only subtitle and serial in act two. The corridor retains its existing year/technology subtitle. Two-line titles are an upper bound; a card's existing single-line ellipsis satisfies it.
5. **Framing:** at the adopted reading scale, twelve rows occupy 1425.6 CSS px before perspective, so a phone cannot show all rows while retaining the 12px card-caption floor. Use a complete volume shot followed by partial-height reading views. Motion/Access must make off-frame pieces reachable by their shared focus target; do not claim all rows are simultaneously legible. If review requires full-height legibility, revise this cross-pipeline contract before execution.
6. **Unspecified placement export:** the spec names pose/progress functions but no wall-transform export or pose return type. Task 1 reconciles the actual Motion plan; this plan does not invent a second wall placement or assert an export already exists.

The user-specified plan location overrides writing-plans' generic `docs/plans/` location. Self-interview answers are adopted without Kevin present as explicitly requested; they are reviewable assumptions, not owner approval. Planning from the integration fork is authorised; implementation must incorporate reviewed Motion work before changing shared files.

## Self-interview

The design tree is data → packing → framing/rasterisation → resource lifetime → interaction → integration. Each round adopts its recommendations before opening dependent questions.

### Round 1 · data and packing

❓ **Q1** - **Identity and ties**: Rename IDs, sort by highlight rank, or retain identity and source order?

➡️ Adopt assumption 1. Keep `featured-${p.id}` as an opaque existing ID, not reader-facing classification. Sort by descending year/date; Projects beat same-date Embeds; preserve original array order within ties. Assign serial only after sorting.

---

❓ **Q2** - **Portrait rows**: Ten, twelve or sixteen? Fractional packing or discrete layouts?

➡️ Adopt assumption 2. Twelve makes portrait taller and shorter without sixteen-row texture height. Motion computes `t = smoothstep(clamp((aspect - CROSSOVER_START)/(CROSSOVER_END - CROSSOVER_START), 0, 1))`; the pure layout helper accepts t and returns `2 * Math.round((12 - 4*t)/2)`. It imports no motion constants.

---

❓ **Q3** - **Cell dimensions and reading size**: Match a full card per cell, use compact typography, or shrink captions below their floor?

➡️ Adopt assumption 3. At 270 CSS px/world unit a cell is 162×118.8 CSS px; a 1.08-world-unit card is 291.6px wide and its 26/620 caption is 12.23px. Pass this target to Motion as a framing requirement; test actual perspective projection at the reading target, including the lowest visible caption.

---

❓ **Q4** - **Packing holes**: Reserve dedicated Project columns, backfill holes, or permit overlap?

➡️ Adopt assumption 4. For each year place sorted Projects into the earliest vacant 2×2 footprint, scanning col then row. Restart the scan at column zero for sorted Embeds, filling vacant 1×1 slots. Count allocated columns through the last occupied column; preserve empty cells as noninteractive space. Reject duplicate IDs and noninteger rows below two; an empty archive returns no blocks/cells and zero columns.

### Round 2 · drawing and lifetime

❓ **Q5** - **Colour lookup and memory**: Uniform arrays, per-piece materials, or a DataTexture?

➡️ Adopt assumption 5. One small RGBA8 DataTexture per block, sized block columns × rows, stores title RGB and an occupied flag; repeat the Project's data across all four slots. CPU occupancy stores the corresponding cell index. Coverage remains one white-on-transparent CanvasTexture per block; shader chooses the text role by the same cell-local line rectangles the rasteriser uses. Keep meta and serial muted. No per-piece material, text canvas or shader recompilation on hover.

---

❓ **Q6** - **Hover and stills**: Redraw the canvas, interpolate in React, or update uniforms?

➡️ Adopt assumption 6. Store hovered cell identity in a MotionValue outside the scene plus a uniform per block. Tint title only; meta and serial retain contrast. Call `invalidate()` on pointer transitions in demand mode. No time uniform, displacement, inversion, easing loop or ambient card movement is needed for the frieze.

---

❓ **Q7** - **Text and serial**: DOM text, proportional digits, or measured canvas layout?

➡️ Adopt assumption 7. At reading scale titles are 16.2 CSS px/24.3 renderer-device px, meta and serial 10.8/16.2. Weight 600 title, 500 meta/serial, line-height 1.2; inset 0.03 world units. Wrap at word boundaries to at most two lines; remove whole trailing words for ellipsis, and use an ellipsis alone for an overlong indivisible token. Keep meta on one line with whole-word ellipsis. Draw serial digits separately at the maximum measured digit advance; do not assume Canvas2D supports font-feature settings. Display unpadded serials. Reserve the serial's own line below meta, or below title when meta is absent. Year count sits in the first column's top inset, without adding extent rows, and is excluded from pointer selection.

---

❓ **Q8** - **Redraw scheduling**: Four synchronous canvases on every switch, a new worker dependency, or bounded incremental jobs?

➡️ Adopt assumption 8. Await Jakarta, then draw at most four cells per idle slice with a timer fallback. Allocate/upload one replacement block at a time; cancel obsolete generations on language, debounced size, unmount or context loss. After all replacements are uploaded, atomically switch their uniforms/meshes and release old resources. Keep old text until the switch; no language-switch Suspense boundary. Catch failures and route them through the existing unavailable callback, never an unhandled rejection. Record actual longest tasks; incremental drawing cannot promise a hitch-free GPU upload.

---

❓ **Q9** - **Embedded card placement**: Flatten covers, clone the corridor controller, or reuse its object anatomy?

➡️ Adopt assumption 9. Centre the card in its 1.2×0.88 footprint, preserving CARD_H/CARD_W; retain COVER_Z and CAPTION_Z relative to its frame. Reuse the blob mask behind/below the card inside the footprint, at local z=0.004 with depthWrite false; block plane is z=0, card frame z=0.01. Keep the frieze card still. Reserve a small strip below it for serial coverage in the block mask; its caption owns title/subtitle, avoiding duplicated text. Reuse anatomy, not the four-slot SceneRefs indexing.

---

❓ **Q10** - **Missing stack covers**: Generate assets, show empty frames, or use existing mockups?

➡️ Adopt assumption 10. Crop existing fallback images to COVER_W/COVER_H through texture UVs without changing their shared texture transform. No new assets. A truly missing cover leaves the existing cream/white framed object with its caption.

---

❓ **Q11** - **Shared resources**: Let each CardCover dispose its cache entry, duplicate GPU textures, or share ownership?

➡️ Adopt assumption 11. Extract a URL-keyed acquire/release cache from the current CardCover path, with a deferred final release cancelled by a new acquisition for StrictMode. Clear `useLoader` cache only when its final consumer leaves. Share rounded geometry/blob resources with equally explicit lifetimes. Test remount and overlapping consumers.

### Round 3 · interaction and integration

❓ **Q12** - **Navigation**: Await camera travel, await analytics, or open inside the pointer event?

➡️ Adopt assumption 12. Resolve the archive ID and call `window.open(piece.href, '_blank', 'noopener')` synchronously from Projects. Do not interpret a null return as proof of blocking: noopener itself may prevent returning a handle. Case studies navigate immediately. The callback may request the shared camera target synchronously, but never waits for travel before opening. Tests capture a real popup and intercept its destination locally.

---

❓ **Q13** - **Structured data**: Add origin to schema.org, rewrite positions, or preserve current JSON-LD?

➡️ Adopt assumption 13. Run the existing JSON-LD test unchanged; it checks exactly the nine slugs, English titles, years and contiguous positions. Add origin assertions to archive tests, not unrelated schema fields.

---

❓ **Q14** - **Rendering layer**: Borrow the title's post-composer exemption or use the scene surface?

➡️ Adopt assumption 14. Borrow only the coverage-mask technique. Use correct linear colour uniforms and output conversion, transparent coverage, fog chunks and depth testing. The block shader writes cream for blank fragments so the surface is continuous; one mesh handles ground and text. Reconcile act-two fog near/far, far plane and DoF focus with the camera owner; test real composer operation through the existing hardware-spoof path.

---

❓ **Q15** - **Intermediate Archive consumer**: Keep obsolete shared fields, retire Access early, or migrate the current consumer minimally?

➡️ Adopt assumption 15. Locally derive filter options from origin/type/editorial/year; use caseStudy presence for inward links and Project lookup for legacy preview/rank presentation. Remove kind and byFeatured references, preserving toolbar behaviour where meaningful until Access deletes it. Legacy e2e expectations tied to removed classification belong to Access's rewrite; report those transitional failures explicitly, never skip or weaken tests.

---

❓ **Q16** - **Column budget**: Force 22 columns, shrink spans, or trust packing?

➡️ Adopt assumption 16 and Spec conflict 1. Widths reflect occupancy and year boundaries, not raw count divided by rows alone.

---

❓ **Q17** - **Phone reachability**: Violate caption size, remove phone act two, or use partial-height reading views?

➡️ Adopt assumption 17 and Spec conflict 5. Task 1 records how Motion's target lookup and Access focus expose each cell, including vertical reachability; Wall supplies row and span rather than discarding them.

---

❓ **Q18** - **Origin copy**: Show internal enum text in both languages or provide bilingual labels?

➡️ Adopt assumption 18. Keep the enum stable and define bilingual presentation pairs. Professional Project subtitle is empty; editorial meta remains lowercased `type · editorial · dd.mm.yyyy`. Date formatting does not mutate stored display dates or CSV.

## Shared interfaces and texture arithmetic

Export from `src/utils/friezeLayout.ts`:

```ts
export interface Cell {
  itemId: string
  block: number // zero-based block index; not a year
  col: number   // absolute column from the frieze's left edge
  row: number   // zero-based from the top
  span: 1 | 2
}
export interface FriezeBlock {
  year: number
  startCol: number
  columns: number
  count: number // pieces, not occupied slots
}
export interface FriezeLayout {
  columns: number
  blocks: FriezeBlock[]
  cells: Cell[]
}
export interface FriezeExtent {
  columns: number
  rows: number
  blocks: { year: number; startCol: number; columns: number; count: number }[]
  width: number
  height: number
}
```

Public utilities: `friezeLayout(items: readonly ArchiveItem[], rows: number): FriezeLayout`, `friezeExtent(layout: FriezeLayout, rows: number): FriezeExtent`, `friezeRows(crossoverBlend: number): number`. Constants: `FRIEZE_CELL_W = 0.6`, `FRIEZE_CELL_H = 0.44`, `FRIEZE_ROWS_LANDSCAPE = 8`, `FRIEZE_ROWS_PORTRAIT = 12`. Extent width is columns×W, height rows×H, including the empty layout's configured height. Data exports `yearBlocks(items: readonly ArchiveItem[]): { year: number; count: number; items: ArchiveItem[] }[]` from `src/data/archive.ts`.

Coordinates are local top-left (+x right, −y down, +z towards viewer); mesh centres convert from those coordinates. Motion alone supplies the group's world transform. Consumers import `actTwoProgress`, `actTwoPose`, `blockAt`, `scrollTargetFor`, `actTwoSvh`, `sceneWrapperSvh`, `ACT_TWO_RELEASE_SVH`, `ACT_TWO_APPROACH_SVH`, `ACT_TWO_SVH_PER_COLUMN`, `CROSSOVER_START`, `CROSSOVER_END`, `clamp`, `smoothstep`, and `sceneGeometry` from `src/utils/sceneMotion.ts` (using relative paths). Fixed signatures from the spec are `actTwoProgress(playhead)` and `actTwoPose(u, frieze, geometry)`, with a FriezeExtent argument and camera position/yaw/pitch result. The actual typed return and `scrollTargetFor` overload/placement accessor are reconciled in Task 1, not fabricated here.

Raster density is the maximum projected pixels/world unit required by Motion's reading poses × `state.viewport.dpr`. Scale both dimensions together by `min(1, 4096/neededWidth, 4096/neededHeight)` before rounding; clamp rounded dimensions to 4096. Insets count inside the plane, not outside its extent. At the 270 CSS px/world target and renderer DPR 1.5, density is 405 texels/world. Landscape block dimensions are approximately 486×1426, 1701×1426, 3888×1426, 243×1426. The 118-piece 2024 block consumes 16 columns because three Projects add nine occupied slots; its long side reaches the cap above 426.67 texels/world (284.44 CSS px/world at DPR 1.5). The cap reduces raster detail, not world typography size; record actual scale and check readable glyphs in browser screenshots.

Four landscape RGBA8 masks total about 34.4MiB base, 45.8MiB GPU with mipmaps, plus 34.4MiB CPU canvases. Portrait blocks at 405 texels/world total about 37.7MiB base, 50.2MiB GPU plus 37.7MiB CPU. Physical DPR 2 and 3 both use renderer DPR 1.5, so both have those same costs at the same CSS viewport. Double-buffered redraw peaks are about 160.4MiB landscape / 175.8MiB portrait including CPU and GPU masks; these exclude covers, captions, render targets and driver overhead. The colour lookup is below 1KiB per layout. Release canvas backing stores and textures after replacement/unmount; measure whole-scene deltas on the rig in Access, never infer performance from these estimates.

## Implementation tasks

Each Files boundary also permits updating this plan's own step ticks. Commands run from repository root. Edit steps name `apply_patch` as their command; expected output is the described diff plus `Done!`. Internal structure is the implementer's choice within the stated interfaces. For any newly discovered ambiguity beyond the recorded resolutions, stop that task and report `blocked: <specific ambiguity>` to the controller; do not silently alter the contract.

### Task 1: Reconcile the reviewed Motion seam

**Files:**
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: record reconciled imports, placement and framing contracts.

**Interfaces:** Consumes Motion's plan at `docs/superpowers/plans/2026-09-08-act-two-motion.md`; produces a verified handoff for FriezeExtent and the imports listed above.

**Work:** Before code, read Motion's plan when present and compare its imports/signatures with actual merged source. Record the exact wall transform accessor, pose return type, row-selection owner, reading scale, focus-to-row strategy, fog/DoF ownership and warm-up hooks. Reconcile 26/19 columns, preserving the synthetic 22-column fixture. Incorporate Motion through the controller's local branch workflow; no network is needed. The planning fork itself is not proof of implementation dependency availability.

**Acceptance check:** `test -f docs/superpowers/plans/2026-09-08-act-two-motion.md` initially fails in this worktree; execution requires it and reviewed Motion source. `rg -n 'actTwoPose|actTwoProgress|scrollTargetFor|FriezeExtent' src/utils/sceneMotion.ts docs/superpowers/plans/2026-09-08-act-two-motion.md` must show compatible seams.

**Boundaries:** No independent camera, invented placement export, shared-source edit or spec tick. Missing dependency is an execution prerequisite, not an invitation to stub motion.

- [ ] Run the two acceptance commands; expected: Motion plan/source present and signatures located.
- [ ] Run `apply_patch` to record the resolved seam in this plan; expected: exact placement import and return shape, shared resize extent and row reachability documented.
- [ ] Run `git diff --check`; expected: no whitespace errors; review the recorded seam against both plans.
- [ ] Run `git add docs/superpowers/plans/2026-09-08-act-two-wall.md` and `git commit -m 'docs: reconcile wall and motion contracts'`; expected: only the reviewed plan update committed.

### Task 2: Migrate archive data and its current consumer

**Files:**
- `src/types/content.ts` — modify: exact spec Origin/ArchiveItem shape and optional Project.origin.
- `src/data/archive.ts` — modify: sorting, serial derivation and yearBlocks; remove retired exports.
- `src/data/projects.ts` — modify: hotmart-bunde origin only.
- `src/components/sections/Archive.tsx` — modify: minimum temporary field/export migration from Spec conflict 3.
- `tests/unit/data/archive.test.ts` — rewrite: new data acceptance.

**Interfaces:** Consumes Project and Embed; produces `archive: ArchiveItem[]`, `yearBlocks`, preserved `resolveTitle`. ArchiveItem includes origin, optional caseStudy, year and serial; retains id/title/type/editorial/date/sortDate/href/internal exactly as specified.

**Work:** Test total 171, nine caseStudy slugs, 162 external pieces, serials 171…1, default professional and freelance hotmart-bunde, years 3/42/118/8 and Project-first ties including a 31 December Embed. Preserve source order for ties, immutable input and duplicate href pieces. Remove ArchiveKind/oss/kind and archive-only highlight/highlightOrder/gradient, byFeatured, archiveTypes, archiveEditorials, archiveKinds, archiveYears. Keep ranking fields on Project. Migrate the current consumer without reintroducing shared compatibility fields.

**Acceptance check:** `npx vitest run tests/unit/data/archive.test.ts tests/unit/seo/jsonld-projects.test.ts`; new tests initially fail on missing origin/serial/yearBlocks. JSON-LD remains green without editing index.html.

**Boundaries:** No CSV/parser, route, Project content/rank, stylesheet, locale or Access deletion edits.

- [ ] Run `apply_patch` to replace archive assertions and tie fixtures; expected: exact counts and serial contract represented.
- [ ] Run the acceptance command; expected: new archive assertions fail, unchanged JSON-LD passes.
- [ ] Run `apply_patch` for types/data; expected: exact spec shape and hotmart-bunde origin, no obsolete archive exports.
- [ ] Run `apply_patch` for the retiring consumer; expected: no references to removed fields/exports and no extra shared compatibility model.
- [ ] Run the acceptance command and `npx tsc -b`; expected: data tests and typecheck pass.
- [ ] Run `git diff --check`, stage only this task's Files and plan ticks, then `git commit -m 'feat: derive archive origins serials and year blocks'`; expected: bounded data migration commit.

### Task 3: Implement pure packing and extent

**Files:**
- `src/utils/friezeLayout.ts` — create: constants, interfaces, packing, extent and blend-to-rows helper.
- `src/utils/sceneMotion.ts` — modify: consume layout constants/helper using its own crossover constants, replacing any provisional extent source from Motion.
- `tests/unit/friezeLayout.test.ts` — create: packing and extent acceptance.
- `tests/unit/sceneMotion.test.ts` — modify: crossover integration assertions only.

**Interfaces:** Produces all shared interfaces above. Consumes yearBlocks and ArchiveItem; Motion supplies the normalised crossover blend.

**Work:** Implement the first-fit algorithm described in Q4. Test exact coverage, unique IDs, no occupied-slot overlap, head-of-year spans, column-major Embed order, top/bottom bounds, no year crossing, block widths and prefix startCol, summed columns, correct physical width/height. Use full data and small hand-computed examples, odd row counts, all-Project, all-Embed, empty, duplicate-ID and invalid-row cases. Test deterministic reverse calls and frozen inputs. Sweep aspect across and outside 0.85–1.05 via Motion: only 12/10/8, monotonic row change, no change outside the band; packing accepts any integer rows ≥2.

**Acceptance check:** `npx vitest run tests/unit/friezeLayout.test.ts tests/unit/sceneMotion.test.ts`; new imports initially fail. Full data must produce landscape widths [2,7,16,1] and portrait [2,5,11,1].

**Boundaries:** Layout imports no sceneMotion, React, DOM or three. Keep existing act-one pose assertions intact.

- [ ] Run `apply_patch` to add hand-computed packing tests; expected: all acceptance properties represented.
- [ ] Run the acceptance command; expected: missing layout exports fail.
- [ ] Run `apply_patch` to implement layout/constants/extent; expected: pure explicit-return utilities.
- [ ] Run `apply_patch` to connect Motion's blend and add the aspect sweep; expected: dependency flows from motion to layout only.
- [ ] Run the acceptance command and `npx tsc -b`; expected: new cases and act-one fixtures pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: pack archive into year-block frieze'`; expected: pure layout commit.

### Task 4: Define cell text and bounded coverage rasterisation

**Files:**
- `src/components/canvas/scene/friezeText.ts` — create: bilingual presentation, text-role rectangles and measured wrapping.
- `src/components/canvas/scene/friezeTexture.ts` — create: sizing, incremental coverage jobs and disposal.
- `src/components/canvas/scene/textTexture.ts` — modify: export shared 150ms resize debounce alongside font loading.
- `src/components/canvas/scene/Caption.tsx` — modify: consume shared debounce constant.
- `tests/unit/friezeTexture.test.ts` — create: formatting, cap, scheduling and lifecycle tests.

**Interfaces:** Produces `cellText(piece: ArchiveItem, lang: 'en' | 'pt'): { title: string; meta: string; serial: string }`; `FriezeTexture` carries CanvasTexture, pixel dimensions and effective texels/world. Raster jobs consume layout, data, lang and measured density; return a cancellable Promise of block masks.

**Work:** Use Q7 text layout and white alpha coverage from titleTexture's technique. Keep role rectangles available to shader and hit testing. For Projects leave the card body blank in the block mask and draw only its serial strip. Test lowercase accented Portuguese, exact dotted dates, missing professional meta, two languages, long unbroken words, two-line limits and fixed serial advances. Test DPR once and the 4096 cap on each dimension, especially 2024 at above-target scale. Fake idle/timer/font readiness to assert cancellation, four-cell slices, no initial draw before warm-up permission, and release of abandoned canvases/textures.

**Acceptance check:** `npx vitest run tests/unit/friezeTexture.test.ts tests/unit/textTexture.test.ts`; new import/tests initially fail. Existing caption metrics must remain unchanged.

**Boundaries:** No browser-only font-quality claims from jsdom stubs, no per-cell canvas, no colour baked into coverage, no first-paint rasterisation.

- [ ] Run `apply_patch` to add formatting, sizing and cancellation tests; expected: required contracts covered.
- [ ] Run the acceptance command; expected: new tests fail on missing utilities.
- [ ] Run `apply_patch` for presentation/wrapping and tabular digit drawing; expected: deterministic measured layouts and bilingual origin labels.
- [ ] Run `apply_patch` for bounded canvases, incremental jobs and shared debounce; expected: cancellable block-mask generation and released resources.
- [ ] Run the acceptance command and `npx tsc -b`; expected: all text assertions pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: rasterise bounded frieze coverage masks'`; expected: bounded rasterisation commit.

### Task 5: Render block surfaces and UV interaction

**Files:**
- `src/components/canvas/scene/Frieze.tsx` — create: stable block meshes and callback props.
- `src/components/canvas/scene/friezeMaterial.ts` — create: colour lookup and coverage shader.
- `src/components/canvas/scene/friezeHit.ts` — create: UV occupancy lookup and shared tap threshold.
- `src/components/canvas/scene/Corridor.tsx` — modify: import shared TAP_MAX_DELTA_PX.
- `tests/unit/friezeHit.test.ts` — create: hit boundaries and holes.
- `tests/unit/friezeMaterial.test.ts` — create: colour/occupancy and uniform-update tests.

**Interfaces:** Frieze consumes data, layout, committed extent, world transform, active flag, lang and callbacks `onCellClick: (itemId: string) => void`, `onCellHover: (itemId: string | null) => void`. Utilities explicitly type UV-hit results as `Cell | null`.

**Work:** Four meshes for typography/ground, plus nine card objects in Task 6. Use a slot occupancy table for UV→cell, not 171 raycast meshes. Convert CanvasTexture's vertical orientation explicitly. Half-open UV bounds reject 1 and outside values; covered 2×2 slots resolve to one cell. Blank padding and year counts are noninteractive. Use the nearest DataTexture and per-block hovered-cell uniform; Q14 controls colour conversion/fog. Forward callbacks only on identity changes. Clear hover/cursor on pointerleave, act transition, rebuild, unmount or context loss. Re-evaluate intersection as the camera moves under a stationary pointer using the existing R3F event manager from SceneRig, without React state. Reject drags above six pixels and inactive/unready blocks.

**Acceptance check:** `npx vitest run tests/unit/friezeHit.test.ts tests/unit/friezeMaterial.test.ts`; initially missing implementation. Test corner orientation, all four Project slots, holes, neighbouring blocks, all three origins and all three hover rotation values without redraw.

**Boundaries:** No router, per-frame material allocation, per-piece raycaster or change to corridor interaction semantics. Only canvas cursor is written here.

- [ ] Run `apply_patch` for UV/lookup/uniform tests; expected: boundaries and colour mappings asserted.
- [ ] Run the acceptance command; expected: missing hit/material helpers fail.
- [ ] Run `apply_patch` for occupancy lookup, DataTexture and shader; expected: four cream block surfaces with coverage-driven text.
- [ ] Run `apply_patch` for Frieze callbacks and shared threshold; expected: direct callbacks with drag rejection and hover cleanup.
- [ ] Run the acceptance command and `npx tsc -b`; expected: hit/material contracts pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: render frieze blocks with uv cell interaction'`; expected: block-renderer commit.

### Task 6: Embed the nine card objects without disturbing the corridor

**Files:**
- `src/components/canvas/scene/CardObject.tsx` — create: shared frame, cover and caption object.
- `src/components/canvas/scene/cardResources.ts` — create: shared cover/geometry/blob ownership.
- `src/components/canvas/scene/Corridor.tsx` — modify: use shared object while keeping registration contract.
- `src/components/canvas/scene/Caption.tsx` — modify: explicit handles and optional title-colour override for frieze use.
- `src/components/canvas/scene/Frieze.tsx` — modify: Project object placement and serial strips.
- `tests/unit/cardResources.test.ts` — create: concurrent lifetime tests.

**Interfaces:** CardObject consumes SceneCard, anatomy geometry, title colour and local material handles; optional caption presentation selects corridor or frieze copy. No hard-coded nine-slot additions to SceneRefs.cards.

**Work:** Preserve existing 620×448 proportions and all relative cover/caption depth offsets. Embed at Q9 placement, with a local blob shadow and no ambient motion. All nine covers use Q10 fallback. Disable raycast on embedded card children so the block occupancy remains the interaction source. For card title hover update material colour using a white coverage caption in frieze mode; corridor coloured captions keep their current path. Reference-count shared cover resources; mounting/unmounting a wall card cannot dispose a corridor cover. Validate proper two-line maximum via the card's one-line path and origin subtitle; serial stays on the block's reserved strip.

**Acceptance check:** `npx vitest run tests/unit/cardResources.test.ts tests/unit/textTexture.test.ts`; new shared ownership test initially fails. Browser registration preservation is tested in Task 9.

**Boundaries:** No duplicated corridor pose loop, enlarged CARD_COUNT, new mockup files, halo or act-one visual change.

- [ ] Run `apply_patch` for two-consumer, final-release and StrictMode reacquisition tests; expected: shared lifetime scenarios represented.
- [ ] Run the acceptance command; expected: missing shared cache fails.
- [ ] Run `apply_patch` for shared card object/resources and explicit caption handles; expected: corridor retains the same geometry and material registrations.
- [ ] Run `apply_patch` to place all nine frieze cards; expected: card bodies and serial strips stay within each 2×2 footprint.
- [ ] Run the acceptance command and `npx tsc -b`; expected: ownership and caption tests pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: embed shared project objects in the frieze'`; expected: card-reuse commit.

### Task 7: Integrate warm-up, extent and reduced-motion rendering

**Files:**
- `src/components/canvas/SelectedWorkScene.tsx` — modify: mount Frieze, pass extent/callbacks and coordinate warm-up.
- `src/components/canvas/scene/sceneRefs.ts` — modify: distinct frieze resource/hover handles and readiness promise.
- `src/components/canvas/scene/SceneRig.tsx` — modify: apply reconciled Motion placement/active state and refresh pointer intersections.
- `src/components/canvas/scene/Environment.tsx` — modify: consume Motion's act-two focus settings if Task 1 assigns this wiring to Wall.
- `src/components/canvas/scene/Frieze.tsx` — modify: generation swaps and disposal integration.
- `tests/unit/friezeTexture.test.ts` — extend: warm-up ordering and generation race tests.

**Interfaces:** Consumes the exact Motion signatures recorded in Task 1; produces a shared current layout/extent and frieze-ready signal. `data-warm='true'` means frieze masks and lookup textures are uploaded as well as existing scene resources.

**Work:** Register a frieze preparation function before SceneWarmup runs. After entranceDone → existing 1500ms hero settle → idle, await preparation, include every shader-uniform texture in initTexture, compile visible frieze materials even when act one is current, then run the existing single offscreen warm-up frame. Never mark warm on failed preparation. A reader arriving early may see the existing scene while the frieze finishes, but may not click undrawn cells. After a debounced resize commit matching layout, extent, wrapper height and camera inputs together. Language-only redraw keeps extent unchanged. Use Motion's reduced-motion stills; frieze hover and async uploads invalidate demand frames. Resource failures invoke the host fallback callback. Keep the lazy chunk/Suspense boundary stable.

**Acceptance check:** `npx vitest run tests/unit/friezeTexture.test.ts tests/unit/sceneMotion.test.ts`; extend with a delayed generation and ensure warm cannot precede upload. Runtime smoke in Task 9 supplies the GPU evidence.

**Boundaries:** No second camera controller, per-frame React setState, added canvas, extra offscreen loop or compile work during entrance.

- [ ] Run `apply_patch` for delayed preparation, stale generation and failed preparation assertions; expected: readiness cannot race rasterisation.
- [ ] Run the acceptance command; expected: new readiness assertions fail before wiring.
- [ ] Run `apply_patch` for host/refs warm-up wiring; expected: all block and lookup textures explicitly uploaded before data-warm.
- [ ] Run `apply_patch` for Motion placement, active gate, composer focus and atomic resize wiring; expected: one committed extent drives renderer and camera.
- [ ] Run the acceptance command and `npx tsc -b`; expected: lifecycle and act-one checks pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: warm and integrate the act-two frieze'`; expected: scene integration commit.

### Task 8: Route cell actions through Projects

**Files:**
- `src/components/sections/Projects.tsx` — modify: memoised archive/card data, callback decisions and shared target wiring.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: forward final callback props only.
- `tests/unit/friezeActions.test.tsx` — create: component-level navigation and hover callback tests.

**Interfaces:** Canvas exports onCellClick/onCellHover; Projects resolves IDs against archive, passes hover through a MotionValue, and uses the reconciled `scrollTargetFor` overload shared with Access.

**Work:** Keep stable callback identities with refs to current handlers as onCardClick already does. Project caseStudy.slug navigates to `/projects/:slug`; an Embed uses synchronous window.open with noopener. Unknown IDs do nothing. Access will attach stream focus to the same target resolver; do not implement stream markup here. Test route choice, untouched href (including fragments), synchronous open before any pending Promise, one open per click, unknown ID and hover clearing. Do not add a two-click focus-then-open interaction.

**Acceptance check:** `npx vitest run tests/unit/friezeActions.test.tsx`; initially no cell callbacks. Mock the canvas boundary, not the Projects decision itself.

**Boundaries:** Existing corridor onCardClick behaviour survives. No router inside canvas, external prefetch, deferred popup or stream ownership change.

- [ ] Run `apply_patch` for Projects callback tests; expected: case-study/external/unknown paths represented.
- [ ] Run the acceptance command; expected: missing callbacks fail.
- [ ] Run `apply_patch` for stable handlers, MotionValue hover and final host props; expected: trusted click stack reaches routing/open directly.
- [ ] Run the acceptance command and `npx tsc -b`; expected: callback and type contracts pass.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: route frieze cell clicks through projects'`; expected: callback integration commit.

### Task 9: Verify the rendered surface and regressions

**Files:**
- `tests/e2e/frieze-click.spec.ts` — create: real editorial popup, Project navigation and drag rejection.
- `tests/e2e/frieze-surface.spec.ts` — create: headless root/console smoke, text presence, hover and redraw evidence.
- `tests/e2e/scene-scrub.spec.ts` — modify only as needed to retain Motion's extended sweep with actual packed extent.
- `tests/e2e/scene-effects.spec.ts` — extend: cream and readable ink through the composer in act two.
- `tests/e2e/helpers/frieze.ts` — create: data-derived layout/pose projection for canvas coordinates.

**Interfaces:** Tests consume real layout/extent and reconciled yaw-aware Motion poses, the actual canvas bounding box, data-act and data-registrations. Do not use the existing pitch-only projectPoint for a yawed wall.

**Work:** Arm popup/context page listeners before a real mouse click at a projected editorial cell centre, intercept that exact external URL locally with route.fulfill, assert URL/href and null opener; separately click a Project cover and assert route. Exercise 6px accepted and >6px rejected drags. Do not invoke handlers through page.evaluate. Readiness waits include data-warm. Verify root has rendered children, the surface loads, zero console errors/pageerrors/unhandled rejections, noncream glyph pixels, cream blank pixels and hover tint change. Test EN→PT→EN and resize generation stability, portrait twelve rows, crossover, DPR2/3 capped backing stores and reduced-motion demand updates. Retain every existing short-height and near-square scene-scrub viewport, forward/reverse act-two sweeps, data-act transitions and registrations='1'. Keep actual camera projection legibility evidence for Motion/Access; screenshots from real font rasterisation complement unit metrics.

**Acceptance check:** Before implementation the new popup and surface assertions fail because no frieze is drawn. Run `lsof -ti:4173 | xargs -r kill -9` before **every** Playwright invocation. Targeted command: `npx playwright test tests/e2e/frieze-click.spec.ts tests/e2e/frieze-surface.spec.ts tests/e2e/scene-scrub.spec.ts tests/e2e/scene-effects.spec.ts`. Use existing desktop/mobile projects and workers=1.

**Boundaries:** No fake click success, deleted regression assertions, relaxed console checks, changed snapshots to conceal unrelated regressions or claimed performance measurements from SwiftShader.

- [ ] Run `apply_patch` for yaw-aware coordinate helpers and real click tests; expected: tests select archive IDs via layout and click canvas coordinates.
- [ ] Run `apply_patch` for root/console, glyph, hover, language and resize smokes; expected: browser assertions include rendered pixels, not only canvas existence.
- [ ] Run `apply_patch` for actual-extent scrub and composer coverage; expected: act-one assertions and Motion's act-two attributes retained.
- [ ] Run `npx tsc -b`, `npm run lint`, then `npx vitest run`; expected: all exit 0, including JSON-LD and bundle dependencies.
- [ ] Run the port-kill command, then the targeted Playwright command; expected: desktop/mobile wall click and all scene regressions pass, smoke reports zero errors.
- [ ] Run the port-kill command, then `npx playwright test`; expected: full-suite result recorded. Any remaining old-toolbar classification expectations are explicitly handed to Access under Spec conflict 3; all other failures must be fixed in the owning task before Wall review. Final integration requires the entire suite green after Access's rewrites.
- [ ] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'test: verify frieze clicks and rendered scene'`; expected: tests committed with truthful verification results in this plan.

### Task 10: Document the frieze and close the review handoff

**Files:**
- `docs/architecture.md` — modify: index, content model and Selected Work scene · act two/frieze descriptions.
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: verification evidence and Access/Motion handoff.

**Interfaces:** Produces current implementation documentation and measured-size/resource evidence for Access's contrast/performance audit.

**Work:** Document layout/extent, integer crossover, data serial/origin rules, one-mask-per-block shader, nine shared card objects, warm-up, memory accounting, callback ownership and lifecycle. Describe the temporary Archive migration honestly until Access replaces it. Record actual minimum projected title/meta/caption sizes, mask dimensions, cap scale and compositor screenshots. Access owns recomputing docs/contrast.md as a unit and recording rig performance; pass ink 17.29:1, pink 5.64:1, blue 6.20:1, yellow 4.94:1 and muted 5.23:1 on cream as existing reference values requiring audit confirmation. Flag the spec's explicit yellow hover use at small wall sizes as overriding the older aesthetic substitution; no token changes here. No manual Kevin pass or review approval is implied by automation.

**Acceptance check:** `git diff --check` and `rg -n 'Frieze|frieze|yearBlocks|origin|serial' docs/architecture.md`; before documentation, architecture still describes obsolete shared kind fields.

**Boundaries:** Access owns final stream/chapter documentation and contrast table. Do not claim those have landed or tick their spec TODOs.

- [ ] Run `apply_patch` for architecture index/content/frieze sections; expected: documentation matches code and names dependency ownership.
- [ ] Run `apply_patch` to record actual verification results, size/cap evidence and Access handoff in this plan; expected: no estimated value presented as measurement.
- [ ] Run the acceptance commands and inspect this task for remaining `- [ ]`; expected: only not-yet-run commit step remains unchecked.
- [ ] Stage this task's Files with completed ticks and run `git commit -m 'docs: describe act-two frieze architecture'`; expected: bounded architecture/handoff commit.

### Task 11: Controller records plan review approval

**Files:**
- `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` — modify: Plan 2 TODO box only, by the controller after plan review.
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: review record and these step ticks.

**Interfaces:** Consumes the spec's single plan review wave (Opus reviewer, Fable reviewer, codex-review), consolidated fixes and controller approval. Produces only the approved Plan 2 record.

**Work:** This is an administrative gate, listed last for ownership clarity but performed immediately after plan review, before implementation Task 1. The controller records review evidence and ticks `Plan 2 · Wall written, reviewed, assumptions listed.` only after every required review approves the fixed plan. The planner does not tick it in this delivery. Implementation completion, PR reviews, merges, contrast audit and Kevin's manual pass have separate boxes and remain untouched.

**Acceptance check:** `rg -n 'Plan [123] ·' docs/superpowers/specs/2026-09-08-archive-act-two-design.md` must show Plan 2 unchecked before approval; after controller action only that box changes.

**Boundaries:** No approval by elapsed time, no fabricated reviewer result, no push or merge. The controller may run this task independently of implementation completion.

- [ ] Run the acceptance command and inspect the consolidated review record; expected: all three review legs approved after the fix pass, or this task remains pending.
- [ ] Controller runs `apply_patch` for the Plan 2 box and review evidence; expected: only Plan 2's spec TODO changes.
- [ ] Run `git diff --check` and `git diff -- docs/superpowers/specs/2026-09-08-archive-act-two-design.md`; expected: one authorised checkbox change.
- [ ] Stage these two Files and run `git commit -m 'docs: record wall plan review approval'`; expected: controller-owned approval commit, separate from this planning delivery.

## Acceptance map

| Binding acceptance | Concrete check | Owner/task |
| --- | --- | --- |
| Each piece once; 2×2 spans; no overlaps | `tests/unit/friezeLayout.test.ts`: occupied-slot set and IDs | Wall 3 |
| Block width/column sum/world extent | Same suite: prefix columns, 26/19 data fixtures, width/height | Wall 3 |
| Rows change only through crossover | `tests/unit/sceneMotion.test.ts`: aspect sweep using imported layout helper | Wall 3 |
| 171…1 serial; default origin; freelance Project; year counts | `tests/unit/data/archive.test.ts`: exact data plus synthetic defaults/ties | Wall 2 |
| Nine routes/JSON-LD stay consistent | `tests/unit/seo/jsonld-projects.test.ts` unchanged | Wall 2/9 |
| Text/meta/serial, language, 4096 cap | `tests/unit/friezeTexture.test.ts` plus real-font `frieze-surface.spec.ts` | Wall 4/9 |
| One coverage mask/mesh per year; UV selection | Material/hit tests plus surface draw/resource inspection | Wall 5/9 |
| Editorial popup and Project route | `tests/e2e/frieze-click.spec.ts`, actual trusted canvas clicks | Wall 8/9 |
| Zero errors/rejections, registrations 1, data-act | `tests/e2e/scene-scrub.spec.ts` full viewport matrix | Motion + Wall 9 |
| Root renders, surface loads, zero console errors | `tests/e2e/frieze-surface.spec.ts` | Wall 9 |
| Cream/fog/composer integrity | `tests/e2e/scene-effects.spec.ts` act-two extension | Wall 7/9 |
| Reduced-motion stills and hover invalidate | Motion fixtures + `frieze-surface.spec.ts` | Motion + Wall 7/9 |
| Contrast at minimum drawn size; performance on rig | Size/memory handoff from Task 10; final audited table/report | Access |
| Stream/focus/no-WebGL/nav; legacy deletions | Access implementation and full integration suite | Access |

Plan self-review: every Wall acceptance has a named task and check; camera placement remains a named dependency, not a second implementation. All assumptions are adopted recommendations subject to the requested review wave. No implementation step or spec TODO has been completed by writing this plan.
