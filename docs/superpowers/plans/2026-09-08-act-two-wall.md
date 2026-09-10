# Act-two Wall implementation plan

**Goal:** Render every archive piece as an interactive frieze inside the Selected Work scene, backed by one tested content and layout contract.
**Architecture:** Pure archive derivation and packing feed both the scene and pipeline 3's stream. Four year-block coverage textures supply typography through one shader mesh per block; nine embedded Projects reuse the scene's card object. Pipeline 1 owns the camera and wall placement; Projects owns navigation.
**Spec:** `docs/superpowers/specs/2026-09-08-archive-act-two-design.md`
**Execution model:** opus. Kevin's call, 2026-09-09 ~02:00: the Fable session that ran Task 4 unattended consumed too much quota, so the remainder returns to the harness default — Opus executes, Fable keeps judgement (`reasoner`) and its review leg. The earlier header (`fable, because` reason b, for an unattended overnight run) is withdrawn; the run is attended again. It was `opus` while codex drove the implementation.

## Controller amendment · six rows, 2026-09-09 (READ FIRST)

Kevin changed `FRIEZE_ROWS` from 8 to 6 after PR #17's review, and pipeline 1
shipped it. This plan was written and reviewed against eight rows, so every
extent number below is stale. **This is a decision already made, not a mismatch
to report as `blocked:`** — but it is also the only part of this plan you may
treat as superseded. Everything else stands.

Why: the frieze is bottom-anchored and act two has no vertical camera travel, so
anything that does not fit the frame at the dolly is off the TOP of it forever.
Eight rows fill `832.4 / heightPx`, so every viewport shorter than ~833 CSS px
overflowed — 1280×720, Playwright's own desktop project, by 16 % — and
`actTwoTopClearFrac` went negative there, which is the number THIS pipeline
insets the top row's ink by. Seven rows still miss 720 px by 1.2 %.

What is now true on the merged base, verified in `feat/act-two`:

| Was (this plan) | Is (merged) |
| --- | --- |
| `FRIEZE_ROWS = 8` | `FRIEZE_ROWS = 6` |
| 26 columns | **35 columns** |
| block widths 2, 7, 16, 1 | **2, 9, 22, 2** |
| act two 150 + 25×26 = 800 svh | **150 + 25×35 = 1025 svh** |
| wrapper 1350 svh | **1575 svh** |
| lookup textures 26×8×4 = 832 B | **35×6×4 = 840 B** |

Unchanged: 171 pieces, nine 2×2 case-study spans, 198 unit slots, years
3/42/118/8, the half-card cell constants, the 144 px cell floor, the 288 CSS px
per world unit reading scale and the 4096 px texture long-side cap. The synthetic
22-column fixture stays, and `sceneWrapperSvh(22) = 1250` is still its expected
value.

**Re-derive, do not translate:** the mask memory accounting in "Shared interfaces
and texture arithmetic" (the ~26.76 MiB / 53.52 MiB / 86.45 MiB figures) was
derived from eight-row block dimensions at the legibility floor. Six rows change
both the per-block pixel height and the column count, so those numbers must be
recomputed from the new extent with the same method, not scaled by eye. Task 1
records the recomputation alongside the seam reconciliation; if the recomputed
peak breaks the plan's budget, THAT is a real `blocked:`.

Where this plan says "eight rows" or "26 columns" as an acceptance value, read
the table above. Where it says "respect Motion's `maxRowsInFrame(g)`", note that
`maxRowsInFrame` is viewport-dependent (10 at 1920×1080, 8 at 1440×900, 7 at
820×821, 6 at 1280×720) and must be asserted across the whole viewport matrix,
never at one or two fixtures — asserting it at a single size is what let the
eight-row overflow ship in the first place.

### Second amendment · the 4096 cap, 2026-09-08 (Kevin's call, after a `reasoner` ruling)

Six rows widened the 2024 block from 16 to 22 columns. At 11 world units and the
432 texels/world the floor asks for, its mask wants 4752 px against the 4096 cap,
so it is scaled to 0.862 — and because the cap FREEZES that mask while the wall's
projected size keeps growing with viewport height, the 2024 block upscales 1.16×
at 720 px tall, 1.37× at 900, 1.65× at 1080 and 2.19× at 1440, beside three
blocks drawn 1:1. That block holds 118 of the 171 pieces, and the step falls on
the 2025|2024 seam. It is a sharpness problem only — nothing renders smaller,
because the mesh is sized in world units from `friezeFrame`, not from the texture.

Kevin's ruling, now binding and reflected in the spec:

1. **Panels.** A block whose mask exceeds the cap is drawn as
   `ceil(neededWidth / 4096)` column-aligned panels, one texture and one mesh
   each, in near-equal whole-column runs, **never split through a 2×2 span**.
   Today only 2024 splits, into two 11-column panels: five meshes, not four.
   The lookup DataTexture and the slot-occupancy hit table stay per block; a
   panel is a column offset into them, and the year count sits in panel 0. The
   "no span straddle" rule gets its own unit test — today's data never exercises
   it, which is exactly why it needs one.
2. **A density ceiling of 612.8 texels/world**, applied in Task 4's sizing
   function BEFORE the cap. Without it nothing caps above 761 px tall and mask
   bytes grow with the square of the projected density. 612.8 is 1:1 at renderer
   DPR 1.5 up to a 1080 px viewport, so every laptop and every DPR-1 desktop is
   1:1 and a 27" 5K is 1.2×.
3. **`RGFormat`, two channels, superseding Assumption 19's RGBA8.** R is title
   coverage; G carries meta AND serial, because the shader draws both in the same
   fixed muted ink and hover changes only the title. Assert they never overlap
   within a cell. Two bytes per texel is what pays for the ceiling: **27.2 MiB
   steady, 71.4 MiB peak**, under the 86.45 MiB the plan review approved.

Recompute the memory table on this basis — `w * h * 2`, panels summed per block —
and if the recomputed peak breaks the budget, that is a real `blocked:`.

Task 4 gains `panelsFor(block, density, cap)` and the ceiling constant. Task 5's
"four meshes" becomes one per panel, five today. Task 9 adds an acceptance the CI
can actually see: the existing matrix is blind to all of this, because
`devices['Desktop Chrome']` is deviceScaleFactor 1 and at 1440×900 the 2024 block
needs 3745 px, under the cap. Add a screenshot fixture at deviceScaleFactor 1.5
and at least 900 px tall, on the 2025|2024 boundary at the dolly.

**Still open, NOT decided, do not resolve it yourself:** at the 1280×720 volume
shot the wall projects at 65.8 CSS px/world, so a 612.8 mask is minified ~9×
with linear filtering and no mipmaps — potential shimmer across 171 tiny text
cells during the act's signature pull-back. Mipmaps cost +33 % memory and are
legal on NPOT under WebGL2. Measure it in Task 9, report what you see with a
screenshot of the volume shot mid-release, and leave the decision to Kevin.

## Global constraints

- Follow `CLAUDE.md`, `CONTEXT.md`, ADRs 0001, 0002, 0009, 0010, 0011 and 0012; use the glossary's terms.
- React 19, TypeScript strict, explicit utility/hook return types, no `any`, no new libraries, no `@react-three/drei`.
- Three mounted canvases, at most two live; no additional WebGL surface. Scene components render no DOM beyond the host canvas; routing stays outside `src/components/canvas/`.
- One animation lane per animation; SceneRig reads MotionValues and writes three objects. No React state per frame or scroll tick.
- Plus Jakarta Sans for cells; Anton stays on the Selected Work title. Bilingual strings from the first implementation commit; Embed titles remain Portuguese-only.
- Cream `#F5F2EC`; professional ink `#0B0E14`; freelance pink `#B22B47`; personal blue `#2A54B5`; meta ink-muted `rgba(11,14,20,.62)`. Hover title uses `accentDeepLargeFor(index)`.
- `FRIEZE_ROWS = 8`; coverage texture long side ≤4096 pixels; renderer DPR ≤1.5, applied once. `sceneMotion.ts` imports `friezeLayout.ts`, never the reverse.
- `TAP_MAX_DELTA_PX = 6`; reduced motion uses stills and demand rendering. Rasterisation waits for `entranceDone` and the existing scene warm-up window.
- Keep `src/data/embeds.ts` and `src/data/embeds.csv` unchanged. Preserve Project ranking and all nine routes.
- Implementers tick each existing step immediately after its command succeeds, before the next step. Each implementation commit includes this plan's corresponding completed ticks. For every commit step below: commit with that step still unchecked, then tick it immediately, stage only this plan and run `git commit --amend --no-edit` before the next step. Do not recursively record the amend. Implementation commits carry the actual executor's `Co-Authored-By` and, for Claude sessions, actual `Claude-Session` trailers; never fabricate a session ID. A controller alone ticks a spec TODO after acceptance and review approval.
- This planning delivery is one commit containing this file only, on `feat/act-two-wall`; no implementation, push, merge or deployment. Implementation commits described below are future work.

## Assumptions

1. Preserve existing archive IDs; break date ties by Project-first order, then source order.
2. **Overturned:** `FRIEZE_ROWS = 8` in both orientations; respect Motion's `maxRowsInFrame(g)`.
3. **Overturned:** `FRIEZE_CELL_W = CARD_W / 2`, `FRIEZE_CELL_H = CARD_H / 2`; use Motion's 144 CSS px cell floor, not an independent reading target.
4. Pack spans by first-fit column-major occupancy, with Projects first within each year.
5. Use one RGBA8 role-coverage mask per block (R title, G meta, B serial) and a nearest-filtered per-slot colour DataTexture, both without mipmaps.
6. Hover changes title colour immediately through uniforms, including under reduced motion.
7. Draw Jakarta titles at 0.06 world units and meta/serial at 0.04, with fixed-width digit advances.
8. Keep current textures visible during cancellable, incremental language and resize redraws; failures settle to a blank cream wall.
9. **Overturned:** The embedded card exactly fills 2×2 cells, without a 1.08 inset or blob shadow. Keep its frame 0.01 world units ahead of the frieze; use explicit draw order and depth-write control for its layers.
10. Use stackCover, then desktopBento, then desktop for Project covers.
11. Share cover textures through one reference-counted cache that is their sole owner; consumers never dispose them.
12. Open external links synchronously in the trusted click callback with noopener.
13. Keep JSON-LD unchanged because origin changes neither routes, names, years nor positions.
14. Keep the frieze in the scene's fog and composer; reconcile their reading-distance settings with Motion.
15. **Overturned:** Wall deletes Archive, its dropdown/CSS/toolbar strings and rewrites the four old-surface e2e specs; Access adds stream assertions afterwards.
16. Treat 22 columns as an illustrative motion fixture; use actual packed columns for production.
17. **Overturned:** Use eight rows and Motion's framing bound; there is no vertical focus travel to rescue hidden rows.
18. Keep bilingual freelance/freelance and personal/pessoal pairs, sourced from shared locale keys `sections.archive.origin.freelance` and `.personal`.
19. Resolve the spec's contradictory “single-channel” wording as one RGBA8 texture with independent scalar coverage channels for title, meta and serial. This is required by fix 5; no per-line rectangle lookup.

## Spec conflicts

1. **Illustrative column count:** 171 pieces with nine 2×2 spans occupy 198 unit slots, already more than 22×8. Year boundaries require 26 landscape columns: 2 + 7 + 16 + 1. Use the specified dynamic budget: 150 + 25×26 = 800svh for act two and 1350svh for the wrapper. Preserve `sceneWrapperSvh(22) = 1250` as a synthetic Motion acceptance test. Both orientations use these same 26 columns.
2. **Resolved by amended decision 15:** eight rows in both orientations. Delete the portrait-row constant, quantised blend and row helper; resize changes raster density and camera geometry, not packing rows.
3. **Resolved by amended Deletions/pipelines table:** Task 2 deletes the old Archive surface and its Home mount/import/preload; Task 9 rewrites its four e2e specs. The integration PR must be green before Access adds the stream.
4. **Card caption versus cell copy:** retain card anatomy and its caption technique, but use the frieze's origin-only subtitle and serial in act two. The corridor retains its existing year/technology subtitle. Two-line titles are an upper bound; a card's existing single-line ellipsis satisfies it.
5. **Resolved by amended decision 15:** the phone no longer receives twelve rows. Use eight and validate against `maxRowsInFrame(g)` at the specified phone and desktop reading poses; preserve short-height regression cases and report any viewport whose bound is below eight rather than inventing vertical camera travel.
6. **Placement dependency:** the spec names pose/progress functions but no wall-transform export or pose return type. Task 1 reconciles the actual Motion plan; this plan does not invent a second wall placement or assert an export already exists.

7. **Verified review-premise exceptions:** current `src/types/content.ts` exports `resolveTitle`, not `n`; retain it consistently, matching Access. Current `sceneMotion.ts` and the sibling Motion plan use `CARD_W = 1`, `CARD_H = 448 / 620`, hence half-card cells are 0.5 × 0.3612903. At the 144 px cell floor density is 288 CSS px/world, not the requested 240 (which would require CARD_W = 1.2). Do not change act-one geometry to force that number. Recompute from merged constants in Task 1.
8. **Role-mask wording:** the amended spec asks both separate role channels and “single-channel” masks. Assumption 19 follows the explicit role-channel fix with one RGBA8 mask per block and no mipmaps.

The user-specified plan location overrides writing-plans' generic `docs/plans/` location. Self-interview answers are adopted without Kevin present as explicitly requested; they are reviewable assumptions, not owner approval. Planning from the integration fork is authorised; implementation must incorporate reviewed Motion work before changing shared files.

## Self-interview

The design tree is data → packing → framing/rasterisation → resource lifetime → interaction → integration. The original questions are retained for traceability; the overturned answers below follow the reviewed spec.

### Round 1 · data and packing

❓ **Q1** - **Identity and ties**: Rename IDs, sort by highlight rank, or retain identity and source order?

➡️ Adopt assumption 1. Keep `featured-${p.id}` as an opaque existing ID, not reader-facing classification. Sort by descending year/date; Projects beat same-date Embeds; preserve original array order within ties. Assign serial only after sorting.

---

❓ **Q2** - **Portrait rows**: Ten, twelve or sixteen? Fractional packing or discrete layouts?

➡️ Assumption 2 is overturned: eight rows in both orientations, no quantisation or `friezeRows()`. Test Motion framing with `maxRowsInFrame(g)`; there is no vertical travel.

---

❓ **Q3** - **Cell dimensions and reading size**: Match a full card per cell, use compact typography, or shrink captions below their floor?

➡️ Assumption 3 is overturned: exact half-card cells and Motion’s 144 px cell floor. With the verified CARD_W=1, the dolly floor is 288 CSS px/world, giving title 17.28 px, meta/serial 11.52 px and card caption 288×26/620 = 12.08 px. These are floor calculations, not browser measurements; assert actual projection including the lowest caption.

---

❓ **Q4** - **Packing holes**: Reserve dedicated Project columns, backfill holes, or permit overlap?

➡️ Adopt assumption 4. For each year place sorted Projects into the earliest vacant 2×2 footprint, scanning col then row. Restart the scan at column zero for sorted Embeds, filling vacant 1×1 slots. Count allocated columns through the last occupied column; preserve empty cells as noninteractive space. Reject duplicate IDs and noninteger rows below two; an empty archive returns no blocks/cells and zero columns.

### Round 2 · drawing and lifetime

❓ **Q5** - **Colour lookup and memory**: Uniform arrays, per-piece materials, or a DataTexture?

➡️ Adopt assumptions 5 and 19. One RGBA8 DataTexture per block, block columns × rows, stores title RGB and occupied alpha; repeat Project entries across four slots. Store sRGB bytes with `THREE.SRGBColorSpace` and verified sRGB decoding to linear shader values; use nearest min/mag filtering, `generateMipmaps=false`, `unpackAlignment=1`. The separate mask stores title coverage in R, meta in G, serial in B, A=1 to avoid premultiplication loss; `NoColorSpace`, linear min/mag filtering, no mipmaps, unpack alignment 1. Build channels with reusable block-sized scratch storage, never per-cell canvases. Shader uses lookup RGB for title, fixed linear muted ink for meta/serial, and occupied alpha for valid cells; hover changes title only. No per-line rectangles are encoded in the lookup.

---

❓ **Q6** - **Hover and stills**: Redraw the canvas, interpolate in React, or update uniforms?

➡️ Adopt assumption 6. Store hovered cell identity in a MotionValue outside the scene plus a uniform per block. Tint title only; meta and serial retain contrast. Call `invalidate()` on pointer transitions in demand mode. No time uniform, displacement, inversion, easing loop or ambient card movement is needed for the frieze.

---

❓ **Q7** - **Text and serial**: DOM text, proportional digits, or measured canvas layout?

➡️ Adopt assumption 7. At the verified dolly floor titles are 17.28 CSS px/25.92 renderer-device px, meta and serial 11.52/17.28 at renderer DPR 1.5. Weight 600 title, 500 meta/serial, line-height 1.2; inset 0.03 world units. Wrap at word boundaries to at most two lines; remove whole trailing words for ellipsis, and use an ellipsis alone for an overlong indivisible token. Keep meta on one line with whole-word ellipsis. Draw serial digits separately at the maximum measured digit advance; do not assume Canvas2D supports font-feature settings. Display unpadded serials. Reserve the serial's own line below meta, or below title when meta is absent. Year count sits in the first column's top inset, without adding extent rows, and is excluded from pointer selection.

---

❓ **Q8** - **Redraw scheduling**: Four synchronous canvases on every switch, a new worker dependency, or bounded incremental jobs?

➡️ Adopt assumption 8. Await Jakarta, then draw at most four cells per idle slice with a timer fallback. Allocate/upload one replacement block at a time; cancel obsolete generations on language, debounced size, unmount or context loss. After all replacements are uploaded, atomically switch their uniforms/meshes and release old resources. Keep old text until the switch; no language-switch Suspense boundary. Catch failures, dispose partial generations, clear wall cards/text and settle to a blank cream wall with `data-frieze="failed"`; never call the permanent WebGL-unavailable callback or block `data-warm`. Record actual longest tasks; incremental drawing cannot promise a hitch-free GPU upload.

---

❓ **Q9** - **Embedded card placement**: Flatten covers, clone the corridor controller, or reuse its object anatomy?

➡️ Assumption 9 is overturned. Exact 2×2 CARD_W×CARD_H footprint, no inset and no blob shadow (amended decision 4). Preserve COVER_Z/CAPTION_Z relative to the frame at local z=0.01. Reserve serial space inside the existing caption band rather than outside the full card. For volume-shot depth precision choose ordered layers: wall, frame, cover, caption; wall-card cover and caption have `depthWrite=false`, `depthTest=false` and increasing `renderOrder` so quantised frame depth cannot reject them. Apply these overrides only to wall cards and verify the ordered overlap through the composer. Reuse anatomy, not the four-slot SceneRefs indexing.

---

❓ **Q10** - **Missing stack covers**: Generate assets, show empty frames, or use existing mockups?

➡️ Adopt assumption 10. Crop existing fallback images to COVER_W/COVER_H through texture UVs without changing their shared texture transform. No new assets. A truly missing cover leaves the existing cream/white framed object with its caption.

---

❓ **Q11** - **Shared resources**: Let each CardCover dispose its cache entry, duplicate GPU textures, or share ownership?

➡️ Adopt assumption 11. Extract a URL-keyed acquire/release cache from the current CardCover path, with a deferred final release cancelled by a new acquisition for StrictMode. The cache alone disposes textures and clears `useLoader` entries after final release; remove Corridor’s current consumer cleanup that calls `texture.dispose()` and `useLoader.clear`. Set `dispose={null}` on every shared-resource subtree to prevent R3F automatic disposal, and explicitly release private resources. Keep corridor blob ownership separate: wall cards have no blob. Test remount, overlapping consumers, and unmount one while the other still renders.

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

➡️ Assumption 15 is overturned: Task 2 deletes Archive and its dropdown, CSS and toolbar strings, including Home’s lazy import, preload and mount. Task 9 rewrites light-chapter, section-enters, reduced-motion and nav-on-light before review; no transitional failures are handed to Access.

---

❓ **Q16** - **Column budget**: Force 22 columns, shrink spans, or trust packing?

➡️ Adopt assumption 16 and Spec conflict 1. Widths reflect occupancy and year boundaries, not raw count divided by rows alone.

---

❓ **Q17** - **Phone reachability**: Violate caption size, remove phone act two, or use partial-height reading views?

➡️ Assumption 17 is overturned by amended decision 15 and resolved Spec conflict 5. Eight rows, validated framing bounds, horizontal item targets only.

---

❓ **Q18** - **Origin copy**: Show internal enum text in both languages or provide bilingual labels?

➡️ Adopt assumption 18. Keep the enum stable and read the bilingual presentation pairs from `sections.archive.origin.freelance` / `.personal` in both locales, shared with the stream (PT personal is `pessoal`). Professional Project subtitle is empty; editorial meta remains lowercased `type · editorial · dd.mm.yyyy`. Date formatting does not mutate stored display dates or CSV.

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
export interface FriezeBlockExtent {
  year: number
  startCol: number
  columns: number
}
export interface FriezeBlock extends FriezeBlockExtent {
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
  blocks: readonly FriezeBlockExtent[]
}
export interface PackedFriezeExtent extends FriezeExtent {
  blocks: readonly FriezeBlock[]
  width: number
  height: number
}
```

Public utilities: `friezeLayout(items: readonly ArchiveItem[], rows: number): FriezeLayout`, `friezeExtent(layout: FriezeLayout, rows: number): PackedFriezeExtent`. Preserve Motion's base `FriezeExtent` and `FriezeBlockExtent` exactly; the returned superset adds block counts and width/height. Constants: `FRIEZE_CELL_W = CARD_W / 2`, `FRIEZE_CELL_H = CARD_H / 2`, `FRIEZE_ROWS = 8`. Keep geometry constants dependency-free (Motion imports layout, never the reverse); the stub’s literal half-card expressions must be asserted equal to CARD_W/H halves in tests. Extent width is columns×W, height rows×H, including the empty layout's configured height. Data exports `yearBlocks(items: readonly ArchiveItem[]): { year: number; count: number; items: ArchiveItem[] }[]` from `src/data/archive.ts`.

New pure `src/utils/friezeTargets.ts` imports layout types and Motion’s `playheadForColumn`. Export `cellFor(itemId: string, layout: FriezeLayout): Cell | null` and `playheadForItem(itemId: string, layout: FriezeLayout, extent: FriezeExtent): number | null`; unknown IDs return null, otherwise use `playheadForColumn(cell.col + cell.span / 2, extent)`. Task 8 composes the result with numeric `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)`. Pipeline 3 consumes this item seam for focus and Motion’s `volumeShotPlayhead(columns)` for the nav link; neither invents an item overload or duplicates beat math.

Coordinates are local top-left (+x right, −y down, +z towards viewer); mesh centres convert from those coordinates. Motion alone supplies the group's world transform. Consumers import `actTwoProgress`, `actTwoPose`, `blockAt`, `scrollTargetFor`, `actTwoSvh`, `sceneWrapperSvh`, `ACT_TWO_RELEASE_SVH`, `ACT_TWO_APPROACH_SVH`, `ACT_TWO_SVH_PER_COLUMN`, `CROSSOVER_START`, `CROSSOVER_END`, `clamp`, `smoothstep`, and `sceneGeometry` from `src/utils/sceneMotion.ts` (using relative paths). Fixed signatures from the spec are `actTwoProgress(playhead)` and `actTwoPose(u, frieze, geometry)`, with a FriezeExtent argument and camera position/yaw/pitch result. Task 1 verifies the actual pose/placement exports. Targets use the fixed numeric seams above; no deferred item overload.

Raster density is the maximum projected pixels/world unit required by Motion’s reading poses × `state.viewport.dpr`, applied once. Scale both dimensions by `min(1, 4096/neededWidth, 4096/neededHeight)` and cap rounded dimensions at 4096. At the verified 288 CSS px/world floor and DPR 1.5, density is 432 texels/world; eight-row block masks are approximately 432×1249, 1512×1249, 3456×1249, 216×1249. The 16-column block reaches 4096 at 512 texels/world. The cap reduces raster detail, not world typography size; assert actual font quality in screenshots.

Four RGBA8 masks total about 26.76 MiB GPU with no mipmaps in either orientation at that floor. Release canvas backing stores immediately after upload (retain data/recipe for explicit context-loss regeneration); steady CPU canvas storage is zero. During redraw, old and new masks require at most 53.52 MiB GPU; conservatively budget two largest-block CPU stores for channel assembly/upload, about 32.93 MiB, giving an 86.45 MiB mask-only peak. The four RGBA8 lookup textures total 26×8×4 = 832 bytes per generation, no mipmaps. DPR 2/3 both cap at renderer DPR 1.5; larger projected densities require recalculation. Exclude covers, captions, render targets and driver overhead; measure whole-scene deltas in Access. Test upload-before-canvas-release and dispose obsolete textures on swap/unmount.

## Task 1 record · reconciled Motion seam

Both acceptance commands exited 0: `test -f docs/superpowers/plans/2026-09-08-act-two-motion.md` and `rg -n 'actTwoPose|actTwoProgress|scrollTargetFor|FriezeExtent' src/utils/sceneMotion.ts docs/superpowers/plans/2026-09-08-act-two-motion.md`. The dependency is merged; Task 1's “initially fails” describes the old fork. The contracts below were checked against the merged source, including the host, rig, Environment and viewport fixtures. Numbers are source-derived calculations, not browser measurements.

**Placement and camera.** These are the real exports from `src/utils/sceneMotion.ts`, with their return interfaces (field comments omitted):

```ts
export function friezeFrame(frieze: FriezeExtent, g: SceneGeometry): FriezeFrame
export interface FriezeFrame {
  left: number
  right: number
  bottom: number
  top: number
  z: number
  width: number
  height: number
  centreX: number
  centreY: number
}

export function actTwoProgress(playhead: number): number
export function actTwoPose(u: number, frieze: FriezeExtent, g: SceneGeometry): ActTwoPose
export interface ActTwoPose {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}
```

`friezeFrame` **is the wall placement accessor**; there is no separate wall-transform export. It derives `width = frieze.columns * FRIEZE_CELL_W`, `height = frieze.rows * FRIEZE_CELL_H`, `left = -width / 2`, `right = width / 2`, `bottom = HOVER`, `top = HOVER + height`, `centreX = 0`, `centreY = HOVER + height / 2` and `z = -(ACT_TWO_START + 1) * g.spacing`. For Wall's local top-left coordinates, place the group at `[frame.left, frame.top, frame.z]`, with unit scale and no rotation; cell positions remain local. Wall must consume this frame and never invent a second placement. `actTwoPose(actTwoProgress(playhead), frieze, g)` supplies the camera, not the wall. The existing SceneRig writes `camera.position.set(pose.x, pose.y, pose.z)` and `camera.rotation.set(pose.pitch, pose.yaw, 0)` with Euler order `'YXZ'`; yaw and pitch are radians. Reduced motion already uses one `actTwoStill` descriptor and `actTwoStillPose` through the same rig.

**Extent and resize.** `src/utils/friezeLayout.ts` owns the following base exports. Wall may extend them with block counts and world dimensions, but its packed extent must remain structurally assignable to this shape:

```ts
export interface FriezeBlockExtent {
  year: number
  startCol: number
  columns: number
}
export interface FriezeExtent {
  columns: number
  rows: number
  blocks: readonly FriezeBlockExtent[]
}
```

Blocks are newest first and contiguous: the next `startCol` equals this block's `startCol + columns`. The import direction is one-way: `sceneMotion.ts` imports `friezeLayout.ts`, never the reverse. Layout's private `CARD_W = 1` and `CARD_H = 448 / 620` mirror Motion's constants so the half-card exports need no reverse import.

Currently Projects memoises `provisionalFriezeExtent(archive, FRIEZE_ROWS)`, computes `sceneWrapperSvh(frieze.columns)`, and passes that same extent through SelectedWorkScene to SceneRig. The rig keys geometry, cached `friezeFrame` and `sceneFar` by viewport width/height plus extent columns/rows. Wall replaces the provisional derivation with its shared layout/extent; renderer, wrapper, camera and item targets must consume the same committed extent. Six rows do not change with orientation. A debounced resize redraw changes raster density; any generation commit must keep its layout/extent and wrapper/camera inputs together. A language redraw leaves extent unchanged. This atomic raster-generation wiring belongs to Wall Task 7; it is not already supplied by Motion.

**Row reachability.** The merged constant is `FRIEZE_ROWS = 6`. The actual bound is:

```ts
export function maxRowsInFrame(g: SceneGeometry): number {
  return Math.floor((FRIEZE_CELL_W / FRIEZE_CELL_H) * (g.heightPx / FRIEZE_CELL_MIN_PX))
}
```

Wall must assert `FRIEZE_ROWS <= maxRowsInFrame(g)` across the **whole e2e viewport matrix**, never one or two fixtures. `playwright.config.ts` names `desktop-chromium` (`Desktop Chrome`, installed viewport 1280×720) and `mobile-chromium` (`Pixel 5`, installed viewport 393×727). `tests/e2e/scene-scrub.spec.ts` additionally sweeps 1440×400, 1440×260, 1440×220 and 1440×180, then the near-square matrix 960×950, 960×970, 820×821 and 820×819, on both projects. The preset bounds are 6/6; the near-square bounds are 9/9/7/7. Reference sizes 1440×900, 393×851 and 1920×1080 give 8/8/10, but do not cover the short-height sweeps.

**Not blocked · verified.** The reachability requirement is already met, and pipeline 1 already guards it. `tests/unit/sceneMotion.test.ts` asserts `maxRowsInFrame(g) >= FRIEZE_ROWS` across its `VIEWPORTS` matrix and again at 1280×720, 1024×640, 1440×790 and 820×821; all 153 tests pass on this base. The 1440×400, 1440×260, 1440×220 and 1440×180 sweeps in `tests/e2e/scene-scrub.spec.ts` are a different guard: they assert `problems === []`, that nothing throws inside the frame loop when a window is dragged short, and they have never asserted row fit. Reading the amendment's “whole viewport matrix” onto those degenerate heights conflates the two. Wall asserts the bound over the row-fit matrix, preserves the short-height sweeps as throw guards, and adds neither a row reduction nor vertical travel.

**Reading scale and the binding distance.** Motion exports `CARD_MIN_PX = Math.ceil((CARD_MAX_PX * CAPTION_MIN_NAME_PX) / CAPTION_NAME_PX)`: `ceil(620 * 12 / 26) = 287`. Then `FRIEZE_CELL_MIN_PX = Math.ceil(CARD_MIN_PX / 2) = 144`, while layout exports `FRIEZE_CELL_W = CARD_W / 2 = 0.5` and `FRIEZE_CELL_H = CARD_H / 2 = 448 / 620 / 2`. Thus the cell floor gives `144 / 0.5 = 288` CSS px/world, not 240. At renderer DPR 1.5 it requests `288 * 1.5 = 432` texels/world, applied once.

The real `export function dollyDistance(frieze: FriezeExtent, g: SceneGeometry): number` returns `Math.min(dHeight, dLegible)`, with `dHeight = height / (2 * HALF_FOV_TAN * DOLLY_HEIGHT_FILL)` and `dLegible = (FRIEZE_CELL_W * g.widthPx) / (2 * HALF_FOV_TAN * g.aspect * FRIEZE_CELL_MIN_PX)`. `DOLLY_HEIGHT_FILL = 0.82` is the fill floor. Since `g.aspect = g.widthPx / g.heightPx`, equality occurs at `heightPx = rows * FRIEZE_CELL_H * 288 / 0.82`. This is **761.3533 CSS px at six rows**, against 1015.1377 at eight. Below that height `dLegible` binds; above it `dHeight` binds, with equality at the crossover. The two Playwright presets remain at the 288 floor, while 1440×900, 393×851, every near-square fixture above and 1920×1080 are height-bound at six rows. The source comment saying legibility binds on every fixture is stale; the function body establishes the contract.

**Fog, DoF and warm-up.** Motion owns these existing pure exports:

```ts
export function actTwoFogRange(
  u: number,
  frieze: FriezeExtent,
  g: SceneGeometry,
  t: number,
): { near: number; far: number }
export function actTwoFocusDistance(
  u: number,
  frieze: FriezeExtent,
  g: SceneGeometry,
): number
export function actTwoTitleDistance(dWall: number, g: SceneGeometry): number
```

SceneRig already applies the fog range, writes `sceneRefs.focus.distance`, extends the far plane with `sceneFar`, and uses `actTwoTitleDistance(pose.z - frame.z, g)`. Environment already consumes the focus through `effect.cocMaterial.worldFocusDistance` before the composer and adopts changed camera settings for its depth reconstruction. Reduced motion uses the descriptor's `u` for these channels and forces fog time to 0. Wall keeps its surface inside this fog/composer; it owns neither a replacement focus controller nor title-distance maths. Task 7 needs no transfer of the existing DoF wiring from Motion.

The concrete raster insertion point is the private `SceneWarmup` in `src/components/canvas/SelectedWorkScene.tsx`: `entranceDone` → `HERO_SETTLE_MS = 1500` → `onIdle(..., 2000)` → `warm()`. Today `warm()` awaits `gl.compileAsync(scene, camera)`, uploads material maps and `sceneRefs.titleTextures` via `gl.initTexture`, then calls the single offscreen `advance(performance.now())`; its `finally` sets `data-warm='true'`. SceneRefs has no frieze preparation callback or readiness promise yet. Wall Task 7 registers and awaits preparation inside this existing warm window, before compiling/uploading the frieze materials and every mask/lookup uniform texture, then uses the same single warm-up frame. Successful readiness follows upload; raster rejection settles to the planned cream wall with disabled hits and still permits warm-up to finish. It must not invoke the permanent WebGL-unavailable callback. These are Wall hooks to add, not invented Motion exports.

**Horizontal targets and column budget.** The real signatures are:

```ts
export function playheadForColumn(col: number, frieze: FriezeExtent): number
export function scrollTargetFor(
  playhead: number,
  wrapperTop: number,
  wrapperHeight: number,
  viewportHeight: number,
  columns = 0,
): number
```

Task 8's `friezeTargets.ts` resolves a cell, calls `playheadForColumn(cell.col + cell.span / 2, extent)`, and returns null for an unknown ID. Its caller feeds the resulting number and `extent.columns` to `scrollTargetFor`; Access consumes the same item seam. Motion already derives the approach beat and column fraction, including the empty-extent guard, so Wall must not duplicate beat maths or add a string overload.

Executing the merged provisional helper against the actual 171-piece archive returned six rows and blocks `2026 @0 ×2`, `2025 @2 ×9`, `2024 @11 ×22`, `2023 @33 ×2`: 35 columns. The real `actTwoSvh(columns: number): number` returns `100 + 50 + 25 * columns` for positive columns, and `sceneWrapperSvh(columns: number): number` returns `ACT_ONE_SVH + actTwoSvh(columns)`. Calls verified `actTwoSvh(35) = 1025`, `sceneWrapperSvh(35) = 1575` and `sceneWrapperSvh(22) = 550 + 100 + 50 + 25 * 22 = 1250`. The synthetic `FIXTURE_FRIEZE` in `tests/unit/sceneMotion.test.ts` remains 22 columns, eight rows and blocks 1/6/13/2; it is not the shipped extent and stays intact. Six-row lookup textures require `35 * 6 * 4 = 840 B` per generation.

**Mask arithmetic, recomputed.** For each block use `neededWidth = columns * FRIEZE_CELL_W * density`, `neededHeight = rows * FRIEZE_CELL_H * density`, then `s = min(1, 4096 / neededWidth, 4096 / neededHeight)` and `w = round(neededWidth * s)`, `h = round(neededHeight * s)`. RGBA8 without mipmaps costs `w * h * 4` bytes; `1 MiB = 1048576 B`. Sum the four blocks for steady GPU, double for redraw, add twice the **largest resulting block** for CPU channel assembly/upload to obtain peak. The arithmetic was sanity-checked first at eight rows, widths 2/7/16/1 and density 432: dimensions 432×1249, 1512×1249, 3456×1249 and 216×1249 reproduce steady **26.75775 MiB**, redraw **53.51550 MiB**, CPU allowance **32.93262 MiB** and peak **86.44812 MiB**, rounding to the plan's 26.76/53.52/86.45.

At six rows the floor's uncapped height is `6 * (448 / 620 / 2) * 432 = 936.4645` texels. At 1080 CSS px tall, the height-bound dolly instead projects `0.82 * 1080 / (6 * FRIEZE_CELL_H) = 408.535714` CSS px/world, requesting **612.803571 texels/world** at DPR 1.5. Applying the same sizing and rounding afresh gives:

| Block / allocation | Six-row floor · dimensions | MiB at 432 texels/world | 1080 px height · dimensions | MiB at 612.803571 texels/world |
| --- | --- | ---: | --- | ---: |
| 2026 · 2 columns | 432×936 | 1.54248 | 613×1328 | 3.10541 |
| 2025 · 9 columns | 1944×936 | 6.94116 | 2758×1328 | 13.97180 |
| 2024 · 22 columns | 4096×807 | 12.60938 | 4096×807 | 12.60938 |
| 2023 · 2 columns | 432×936 | 1.54248 | 613×1328 | 3.10541 |
| Steady GPU | Four masks | **22.63550** | Four masks | **32.79199** |
| Redraw GPU | 2× steady | **45.27100** | 2× steady | **65.58398** |
| CPU allowance | 2× 2024 | **25.21875** | 2× 2025 | **27.94360** |
| Mask-only peak | Redraw + CPU | **70.48975** | Redraw + CPU | **93.52759** |

The floor peak is 73913856 B, **70.49 MiB**, within the plan's 86.45 MiB budget. The 2024 block already hits the 4096 cap there: needed width `22 * 0.5 * 432 = 4752`, so `s = 4096 / 4752 = 0.861952862`. Its effective raster density is `432 * s = 372.363636` texels/world, equivalent to **248.242424 CSS px/world** at DPR 1.5, about 13.80% below the requested 288 floor. This reduces raster detail; the world typography still projects at Motion's reading scale. The plan already permits cap-driven detail loss, so font quality still needs the later browser evidence.

The capped 2024 dimensions are **density-invariant while the width cap binds**: with world width 11 and height `6 * FRIEZE_CELL_H`, `s = 4096 / (11 * density)` cancels density in both dimensions, leaving `4096 × round(4096 * 6 * FRIEZE_CELL_H / 11) = 4096×807`. Width begins to cap at 372.363636 texels/world, below the floor's 432, so this holds at every density from the floor upwards. Higher density cannot recover detail in that block under the present cap. At 1080 px tall the cap scale is 0.607639468 and the dimensions remain unchanged, but the uncapped 2025 block becomes the largest allocation. The CPU allowance must therefore follow 2025, not keep using 2024.

**Not blocked · verified, and six rows improves it.** The 86.45 MiB figure is the peak at the FLOOR density, and the plan's own accounting says larger projected densities require recalculation rather than forbidding them. Recomputed at 1080 CSS px of viewport height, eight rows would have needed **97.80 MiB** against six rows' **93.53 MiB**, so the overshoot is pre-existing and the six-row change reduces it; at the floor the peak falls from 86.45 to 70.49 MiB. The tall-viewport exposure is real and unbounded upward — 146.66 MiB at 1440 CSS px of height — but it is inherited, not introduced, and bounding it (a global density ceiling above the 4096 per-block cap) is Access's performance work, not a Wall contract change. Covers, captions, render targets, lookups and driver overhead remain outside this mask-only total. This documentation task changes no source, budget, fixture or placement contract.

## Implementation tasks

Each Files boundary also permits updating this plan's own step ticks. Commands run from repository root. Edit steps name `apply_patch` as their command; expected output is the described diff plus `Done!`. Internal structure is the implementer's choice within the stated interfaces. For any newly discovered ambiguity beyond the recorded resolutions, stop that task and report `blocked: <specific ambiguity>` to the controller; do not silently alter the contract.

### Task 1: Reconcile the reviewed Motion seam

**Files:**
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: record reconciled imports, placement and framing contracts.

**Interfaces:** Consumes Motion's plan at `docs/superpowers/plans/2026-09-08-act-two-motion.md`; produces a verified handoff for FriezeExtent and the imports listed above.

**Work:** Before code, read Motion's plan when present and compare its imports/signatures with actual merged source. Record the exact wall transform accessor, pose return type, fixed eight-row bound, derived reading scale, horizontal item-target strategy, fog/DoF ownership and warm-up hooks. Verify 26 columns in both orientations, preserving the synthetic 22-column fixture. Incorporate Motion through the controller's local branch workflow; no network is needed. The planning fork itself is not proof of implementation dependency availability.

**Acceptance check:** `test -f docs/superpowers/plans/2026-09-08-act-two-motion.md` initially fails in this worktree; execution requires it and reviewed Motion source. `rg -n 'actTwoPose|actTwoProgress|scrollTargetFor|FriezeExtent' src/utils/sceneMotion.ts docs/superpowers/plans/2026-09-08-act-two-motion.md` must show compatible seams.

**Boundaries:** No independent camera, invented placement export, shared-source edit or spec tick. Missing dependency is an execution prerequisite, not an invitation to stub motion.

- [x] Run the two acceptance commands; expected: Motion plan/source present and signatures located.
- [x] Run `apply_patch` to record the resolved seam in this plan; expected: exact placement import and return shape, shared resize extent and row reachability documented.
- [x] Run `git diff --check`; expected: no whitespace errors; review the recorded seam against both plans.
- [x] Run `git add docs/superpowers/plans/2026-09-08-act-two-wall.md` and `git commit -m 'docs: reconcile wall and motion contracts'`; expected: only the reviewed plan update committed.

### Task 2: Migrate archive data and delete the old Archive surface

**Files:**
- `src/types/content.ts` — modify: exact spec Origin/ArchiveItem shape and optional Project.origin.
- `src/data/archive.ts` — modify: sorting, serial derivation and yearBlocks; remove retired exports.
- `src/data/projects.ts` — modify: hotmart-bunde origin only.
- `src/components/sections/Archive.tsx` — delete.
- `src/components/ui/ArchiveDropdown.tsx` — delete.
- `src/pages/Home.tsx` — remove Archive lazy import, preload and mount.
- `src/index.css` — delete `.archive-*` rules.
- `src/i18n/locales/en.json`, `src/i18n/locales/pt.json` — delete archive toolbar/sort/obsolete description strings; add shared origin keys, preserving archive title for Access.
- `tests/unit/data/archive.test.ts` — rewrite: new data acceptance.

**Interfaces:** Consumes Project and Embed; produces `archive: ArchiveItem[]`, `yearBlocks`, preserved `resolveTitle`. ArchiveItem includes origin, optional caseStudy, year and serial; retains id/title/type/editorial/date/sortDate/href/internal exactly as specified.

**Work:** Test total 171, nine caseStudy slugs, 162 external pieces, serials 171…1, default professional and freelance hotmart-bunde, years 3/42/118/8 and Project-first ties including a 31 December Embed. Preserve source order for ties, immutable input and duplicate href pieces. Remove ArchiveKind/oss/kind and archive-only highlight/highlightOrder/gradient, byFeatured, archiveTypes, archiveEditorials, archiveKinds, archiveYears. Keep ranking fields on Project. Delete the retired surface and its Home references; keep WorkRow for Work Experience and Access. Verified current export is `resolveTitle`, so preserve it and tell Access its cited name is already correct (review fix 9’s `n` premise does not hold).

**Acceptance check:** `npx vitest run tests/unit/data/archive.test.ts tests/unit/seo/jsonld-projects.test.ts`; new tests initially fail on missing origin/serial/yearBlocks. JSON-LD remains green without editing index.html.

**Boundaries:** No CSV/parser, route or Project content/rank changes beyond origin. Access owns the future stream and WorkRow refactor.

- [x] Run `apply_patch` to replace archive assertions and tie fixtures; expected: exact counts and serial contract represented.
- [x] Run the acceptance command; expected: new archive assertions fail, unchanged JSON-LD passes.
- [x] Run `apply_patch` for types/data; expected: exact spec shape and hotmart-bunde origin, no obsolete archive exports.
- [x] Run `apply_patch` for Archive/dropdown deletion, Home cleanup, CSS and locales; expected: no dangling imports, retired toolbar or removed-field references.
- [x] Run the acceptance command and `npx tsc -b`; expected: data tests and typecheck pass.
- [x] Run `git diff --check`, stage only this task's Files and plan ticks, then `git commit -m 'feat: derive archive origins serials and year blocks'`; expected: bounded data migration commit.

### Task 3: Implement pure packing and extent

**Files:**
- `src/utils/friezeLayout.ts` — complete Motion’s stub: preserve base types, add packing and extent superset, remove provisional helper.
- `src/utils/sceneMotion.ts` — consume fixed FRIEZE_ROWS name without changing act-one geometry.
- `src/components/sections/Projects.tsx` — replace `provisionalFriezeExtent` with real layout/extent.
- `tests/unit/friezeLayout.provisional.test.ts` — replace provisional imports/assertions with the real packing contract.
- `tests/unit/friezeLayout.test.ts` — create: packing and extent acceptance.
- `tests/unit/friezeExtent.types.ts` — create: compile-only base/superset assignability fixtures.
- `tests/tsconfig.frieze-types.json` — create: extend `../tsconfig.app.json`, include `unit/friezeExtent.types.ts` so type assertions actually run (the app config includes only src).
- `tests/unit/sceneMotion.test.ts` — modify: crossover integration assertions only.

**Interfaces:** Produces all shared interfaces above. Consumes yearBlocks and ArchiveItem; Motion supplies maxRowsInFrame; rows stay eight.

**Work:** Implement the first-fit algorithm described in Q4. Test exact coverage, unique IDs, no occupied-slot overlap, head-of-year spans, column-major Embed order, top/bottom bounds, no year crossing, block widths and prefix startCol, summed columns, correct physical width/height. Use full data and small hand-computed examples, odd row counts, all-Project, all-Embed, empty, duplicate-ID and invalid-row cases. Test deterministic reverse calls and frozen inputs. Sweep aspect across and outside 0.85–1.05: production rows stay eight; assert maxRowsInFrame at specified desktop/phone poses and report short-height limits. Packing still accepts integer rows ≥2. Add compile-time assignments proving a base fixture needs no counts/dimensions and `const motionExtent: FriezeExtent = friezeExtent(layout, 8)` is valid; pass both to Motion consumers in `friezeExtent.types.ts` and run `npx tsc -p tests/tsconfig.frieze-types.json --noEmit` (plain Vitest does not check types). Assert cell constants equal CARD_W/H halves without a reverse import.

**Acceptance check:** `npx vitest run tests/unit/friezeLayout.test.ts tests/unit/sceneMotion.test.ts`; new imports initially fail. Full data must produce widths [2,7,16,1], four blocks and 26 columns in both orientations. Run `npx tsc -p tests/tsconfig.frieze-types.json --noEmit` and `npx vitest run tests/unit/friezeLayout.provisional.test.ts` too; `rg provisionalFriezeExtent src tests` must return no matches.

**Boundaries:** Layout imports no sceneMotion, React, DOM or three. Keep existing act-one pose assertions intact.

- [x] Run `apply_patch` to add hand-computed packing tests; expected: all acceptance properties represented.
- [x] Run the acceptance command; expected: missing layout exports fail.
- [x] Run `apply_patch` to implement layout/constants/extent; expected: pure explicit-return utilities.
- [x] Run `apply_patch` to replace the provisional caller/test and add the fixed-row aspect sweep; expected: dependency flows from motion to layout only.
- [x] Run the acceptance command and `npx tsc -b`; expected: new cases and act-one fixtures pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: pack archive into year-block frieze'`; expected: pure layout commit.

### Task 4: Define cell text and bounded coverage rasterisation

**Files:**
- `src/components/canvas/scene/friezeText.ts` — create: locale-backed presentation, channel roles and measured wrapping.
- `src/components/canvas/scene/friezeTexture.ts` — create: sizing, incremental coverage jobs and disposal.
- `src/components/canvas/scene/textTexture.ts` — modify: export shared 150ms resize debounce alongside font loading.
- `src/components/canvas/scene/Caption.tsx` — modify: consume shared debounce constant.
- `tests/unit/friezeTexture.test.ts` — create: formatting, cap, scheduling and lifecycle tests.

**Interfaces:** Export `CELL_TITLE_WORLD = 0.06` from `friezeText.ts` for Access’s legibility test. Produces `cellText(piece: ArchiveItem, lang: 'en' | 'pt'): { title: string; meta: string; serial: string }`; `FriezeTexture` carries CanvasTexture, pixel dimensions and effective texels/world. Raster jobs consume layout, data, lang and measured density; return a cancellable Promise of block masks.

**Work:** Use Q7 text layout and Q5’s independent role-coverage channels. Rectangles may guide CPU layout, never shader role selection; the RGBA8 lookup has no room for per-line rectangles. For Projects leave the card body blank in the block mask and draw only its serial strip. Test lowercase accented Portuguese, exact dotted dates, missing professional meta, two languages, long unbroken words, two-line limits and fixed serial advances. Test DPR once and the 4096 cap on each dimension, especially 2024 at above-target scale. Fake idle/timer/font readiness to assert cancellation, four-cell slices, no initial draw before warm-up permission, and release of abandoned canvases/textures.

**Acceptance check:** `npx vitest run tests/unit/friezeTexture.test.ts tests/unit/textTexture.test.ts`; new import/tests initially fail. Existing caption metrics must remain unchanged.

**Boundaries:** No browser-only font-quality claims from jsdom stubs, no per-cell canvas, no presentation colour baked into coverage, no first-paint rasterisation.

- [x] Run `apply_patch` to add formatting, sizing and cancellation tests; expected: required contracts covered.
- [x] Run the acceptance command; expected: new tests fail on missing utilities.
- [x] Run `apply_patch` for presentation/wrapping and tabular digit drawing; expected: deterministic measured layouts and bilingual origin labels.
- [x] Run `apply_patch` for bounded canvases, incremental jobs and shared debounce; expected: cancellable block-mask generation and released resources.
- [x] Run the acceptance command and `npx tsc -b`; expected: all text assertions pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: rasterise bounded frieze coverage masks'`; expected: bounded rasterisation commit.

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

**Acceptance check:** `npx vitest run tests/unit/friezeHit.test.ts tests/unit/friezeMaterial.test.ts`; initially missing implementation. Test corner orientation, all four Project slots, holes, neighbouring blocks, all three origins and all three hover rotation values without redraw. Deterministically assert exactly four data blocks, four role masks and four ground/text meshes (embedded card meshes counted separately). Assert channel isolation and lookup colour-space/filter/mipmap/unpack settings.

**Boundaries:** No router, per-frame material allocation, per-piece raycaster or change to corridor interaction semantics. Only canvas cursor is written here.

- [x] Run `apply_patch` for UV/lookup/uniform tests; expected: boundaries and colour mappings asserted.
- [x] Run the acceptance command; expected: missing hit/material helpers fail.
- [x] Run `apply_patch` for occupancy lookup, DataTexture and shader; expected: four cream block surfaces with coverage-driven text.
- [x] Run `apply_patch` for Frieze callbacks and shared threshold; expected: direct callbacks with drag rejection and hover cleanup.
- [x] Run the acceptance command and `npx tsc -b`; expected: hit/material contracts pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: render frieze blocks with uv cell interaction'`; expected: block-renderer commit.

### Third amendment · the wall card's caption, serial and year count, 2026-09-09

Kevin's call, after one contract answered by `reasoner` (fable) and `codex-review` (astra) in
parallel. Both agreed on calls 1-3; call 4 is astra's, because fable's rule cannot cover 2026.
Every number below was re-derived here against the real archive, not taken on either model's word.

**Verified facts.** The card's body band is `BAND_H = 0.113105` world units. Three caption rows
(title `26/620 = 0.041935` + meta `0.04` + serial `0.04`, all at line-height 1.2) need `0.146323`
and DO NOT FIT. Two rows need `0.098323` and fit. Block top-left cells: 2026, 2025 and 2024 each
hold a 2x2 Project there. **2026 has zero 1x1 cells at all** — three 2x2 Projects exactly fill its
2-column x 6-row block (12 slots) — so any rule that moves the year count to a 1x1 cell must have a
fallback.

1. **The wall card's caption is two planes, not one.** A title plane drawn as WHITE coverage whose
   `material.color` carries the ink (origin ink at rest, the hover accent on hover), and a second
   plane for the origin word and serial that is never tinted (Q6: tint the title only). Act one's
   corridor keeps its existing single two-line coloured texture and its arrow, untouched.
   The muted plane is drawn as **opaque `#646566` at full glyph coverage**, transparency only for
   antialiasing — NOT as `rgba(11,14,20,.62)` composited at draw time. The card's frame is WHITE
   while the wall is cream, so that alpha would resolve to `#686A6D` on the card and `#646566` on
   the wall, and blending into the composer's linear target is neither. Keep `toneMapped: false`
   and `fog: true` on both planes.

2. **No arrow on wall cards.** The arrow is a hover affordance the rig slides, and act two forbids
   ambient card motion, so a static arrow would promise what the card cannot do. The wall's
   affordance is the title tint, shared with all 171 cells. The caption reclaims the arrow's
   reserved width in wall mode.

3. **The Project serial is drawn by the card, and the mask stops drawing it.** The card fills its
   2x2 footprint exactly (Q9), so the masked bottom strip is invisible under it; shrinking the card
   to reveal the strip is refused. Layout, within the two-row limit: title on row one; the origin
   word left-aligned and the serial right-aligned on row two, both muted. If a long origin would
   collide with the serial, collapse the row to `origin · serial` (a guard, not the expected path).
   In `friezeTexture.ts`, **skip a Project cell's draw unit entirely** — do NOT set `serialOnly` to
   false, which would draw its title and meta onto the wall behind the card. Task 4's masked-serial
   assertion is updated to match.
   This contradicts the LITERAL wording of Task 4 and of Task 6's "serial stays on the block's
   reserved strip", and satisfies its spatial intent plus Q9's "reserve serial space inside the
   existing caption band". Recorded as an amendment, not claimed as compliance.

4. **The year count moves to the first 1x1 cell, and the card carries it when there is none.**
   Selection rule, in one place: scan the block's cells row-major (row 0 left to right, then row 1,
   and so on) and take the first cell whose span is 1. Today that is 2025 r0c4, 2024 r0c13, 2023
   r0c33 — and NONE for 2026, where the block's top-left Project carries the count instead, in a
   reserved slot at the right of its TITLE row, muted and never tinted by hover, shortening the
   title's available width. The count stays block-owned decoration, never Project metadata.
   The rule is ONE pure function over the layout, consumed by the rasteriser AND by `cellAtUv`'s
   noninteractive band. Two copies of this rule is exactly how the raster and the hit test drift.
   `friezeHit.ts`'s current `col === 0 && row === 0` condition is replaced by it, and Task 4's
   "panel 0 only" becomes "the panel containing the selected count column".

### Task 6: Embed the nine card objects without disturbing the corridor

**Files:**
- `src/components/canvas/scene/CardObject.tsx` — create: shared frame, cover and caption object.
- `src/components/canvas/scene/cardResources.ts` — create: sole shared cover/geometry ownership; corridor-only blob lifetime.
- `src/components/canvas/scene/Corridor.tsx` — modify: use shared object while keeping registration contract.
- `src/components/canvas/scene/Caption.tsx` — modify: explicit handles and optional title-colour override for frieze use.
- `src/components/canvas/scene/Frieze.tsx` — modify: Project object placement and serial strips.
- `tests/unit/cardResources.test.ts` — create: concurrent lifetime tests.

**Interfaces:** CardObject consumes SceneCard, anatomy geometry, title colour and local material handles; optional caption presentation selects corridor or frieze copy. No hard-coded nine-slot additions to SceneRefs.cards.

**Work:** Preserve existing 620×448 proportions and all relative cover/caption depth offsets. Embed at Q9’s exact 2×2 placement with no blob shadow or ambient motion; ordered cover/caption layers disable depth writes and depth testing only in wall mode. All nine covers use Q10 fallback. Disable raycast on embedded card children so the block occupancy remains the interaction source. For card title hover update material colour using a white coverage caption in frieze mode; corridor coloured captions keep their current path. One reference-counted cache solely owns shared covers/geometries; consumers never dispose them and shared subtrees set `dispose={null}`. Replace Corridor’s existing loader-texture disposal. Mount both consumers, unmount either, and assert the survivor still renders its cover before final release disposes exactly once. Validate proper two-line maximum via the card's one-line path and origin subtitle; serial stays on the block's reserved strip.

**Acceptance check:** `npx vitest run tests/unit/cardResources.test.ts tests/unit/textTexture.test.ts`; new shared ownership test initially fails. Browser registration preservation is tested in Task 9.

**Boundaries:** No duplicated corridor pose loop, enlarged CARD_COUNT, new mockup files, halo or act-one visual change.

- [x] Run `apply_patch` for two-consumer, final-release and StrictMode reacquisition tests; expected: shared lifetime scenarios represented.
- [x] Run the acceptance command; expected: missing shared cache fails.
- [x] Run `apply_patch` for shared card object/resources and explicit caption handles; expected: corridor retains the same geometry and material registrations.
- [x] Run `apply_patch` to place all nine frieze cards; expected: card bodies and serial strips stay within each 2×2 footprint.
- [x] Run the acceptance command and `npx tsc -b`; expected: ownership and caption tests pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: embed shared project objects in the frieze'`; expected: card-reuse commit.

### Task 7: Integrate warm-up, extent and reduced-motion rendering

**Files:**
- `src/components/canvas/SelectedWorkScene.tsx` — modify: mount Frieze, pass extent/callbacks and coordinate warm-up.
- `src/components/canvas/scene/sceneRefs.ts` — modify: distinct frieze resource/hover handles and readiness promise.
- `src/components/canvas/scene/SceneRig.tsx` — modify: apply reconciled Motion placement/active state and refresh pointer intersections.
- `src/components/canvas/scene/Environment.tsx` — modify: consume Motion's act-two focus settings if Task 1 assigns this wiring to Wall.
- `src/components/canvas/scene/Frieze.tsx` — modify: generation swaps and disposal integration.
- `tests/unit/friezeTexture.test.ts` — extend: warm-up ordering and generation race tests.

**Interfaces:** Consumes the exact Motion signatures recorded in Task 1; produces a shared current layout/extent and frieze-ready signal. `data-warm='true'` means existing resources plus either uploaded frieze textures or a settled cream-wall failure; `data-frieze` reports `pending`, `ready` or `failed` on the canvas.

**Work:** Register a frieze preparation function before SceneWarmup runs. After entranceDone → existing 1500ms hero settle → idle, await preparation, include every shader-uniform texture in initTexture, compile visible frieze materials even when act one is current, then run the existing single offscreen warm-up frame. Failed preparation must settle and allow warm-up to complete using the blank cream wall. A reader arriving early may see the existing scene while the frieze finishes, but may not click undrawn cells. After a debounced resize commit matching layout, extent, wrapper height and camera inputs together. Language-only redraw keeps extent unchanged. Use Motion's reduced-motion stills; frieze hover and async uploads invalidate demand frames. Raster failures never invoke the permanent WebGL-unavailable callback: it would kill act one for the session. Catch rejection, mark `data-frieze="failed"`, disable wall hits, clear partial resources and still reach `data-warm=true`. Genuine WebGL/context failure retains the existing fallback path. Keep the lazy chunk/Suspense boundary stable.

**Acceptance check:** `npx vitest run tests/unit/friezeTexture.test.ts tests/unit/sceneMotion.test.ts`; extend with a delayed generation and ensure successful warm cannot precede upload; injected raster failure reaches warm with failed status, cream pixels, no clickable cells, no unavailable callback and act one still rendering. Runtime smoke in Task 9 supplies the GPU evidence.

**Boundaries:** No second camera controller, per-frame React setState, added canvas, extra offscreen loop or compile work during entrance.

- [x] Run `apply_patch` for delayed preparation, stale generation and failed preparation assertions; expected: readiness cannot race rasterisation.
- [x] Run the acceptance command; expected: new readiness assertions fail before wiring.
- [x] Run `apply_patch` for host/refs warm-up wiring; expected: successful block/lookup textures uploaded before data-warm; failed preparation settles without blocking it.
- [x] Run `apply_patch` for Motion placement, active gate, composer focus and atomic resize wiring; expected: one committed extent drives renderer and camera.
- [x] Run the acceptance command and `npx tsc -b`; expected: lifecycle and act-one checks pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: warm and integrate the act-two frieze'`; expected: scene integration commit.

### Task 8: Route cell actions through Projects

**Files:**
- `src/components/sections/Projects.tsx` — modify: memoised archive/card data, callback decisions and shared target wiring.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: forward final callback props only.
- `src/utils/friezeTargets.ts` — create: pure cell and item-playhead seam.
- `tests/unit/friezeTargets.test.ts` — create: span-centre, unknown-ID and Motion-composition tests.
- `tests/unit/friezeActions.test.tsx` — create: component-level navigation and hover callback tests.

**Interfaces:** Canvas exports onCellClick/onCellHover; Projects resolves IDs against archive, passes hover through a MotionValue, and uses `cellFor`/`playheadForItem` from `friezeTargets.ts`, composing known playheads with Motion’s numeric `scrollTargetFor`. Access consumes these exports for focus and `volumeShotPlayhead` for nav.

**Work:** Pipeline 1 fades card four with `actTwoCardFade` across release; after release wall cells own the pointer and the invisible corridor card cannot intercept it. Assert a click through its former bounds reaches the wall. Keep stable callback identities with refs to current handlers as onCardClick already does. Project caseStudy.slug navigates to `/projects/:slug`; an Embed uses synchronous window.open with noopener. Unknown IDs do nothing. Access will attach stream focus to the same target resolver; do not implement stream markup here. Test route choice, untouched href (including fragments), synchronous open before any pending Promise, one open per click, unknown ID and hover clearing. Do not add a two-click focus-then-open interaction.

**Acceptance check:** `npx vitest run tests/unit/friezeActions.test.tsx tests/unit/friezeTargets.test.ts`; initially no cell callbacks. Mock the canvas boundary, not the Projects decision itself.

**Boundaries:** Existing corridor onCardClick behaviour survives. No router inside canvas, external prefetch, deferred popup or stream ownership change.

- [x] Run `apply_patch` for Projects callback tests; expected: case-study/external/unknown paths represented.
- [x] Run the acceptance command; expected: missing callbacks fail.
- [x] Run `apply_patch` for pure target utilities, stable handlers, MotionValue hover and final host props; expected: trusted click stack reaches routing/open directly.
- [x] Run the acceptance command and `npx tsc -b`; expected: callback and type contracts pass.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'feat: route frieze cell clicks through projects'`; expected: callback integration commit.

### Task 9: Verify the rendered surface and regressions

**Files:**
- `tests/e2e/light-chapter.spec.ts`, `tests/e2e/section-enters.spec.ts`, `tests/e2e/reduced-motion.spec.ts`, `tests/e2e/nav-on-light.spec.ts` — rewrite old Archive assertions against retained chapter/Work Experience surfaces.
- `tests/e2e/frieze-click.spec.ts` — create: real editorial popup, Project navigation and drag rejection.
- `tests/e2e/frieze-surface.spec.ts` — create: headless root/console smoke, text presence, hover and redraw evidence.
- `tests/e2e/scene-scrub.spec.ts` — modify only as needed to retain Motion's extended sweep with actual packed extent.
- `tests/e2e/scene-effects.spec.ts` — extend: cream and readable ink through the composer in act two.
- `tests/e2e/helpers/frieze.ts` — create: data-derived layout/pose projection for canvas coordinates.

**Interfaces:** Tests consume real layout/extent and reconciled yaw-aware Motion poses, the actual canvas bounding box, data-act and data-registrations. Do not use the existing pitch-only projectPoint for a yawed wall.

**Work:** Rewrite light-chapter’s children to projects/work/stats/skills and transfer WorkRow colour/hover checks to Work Experience; preserve veil/chapter assertions. Test entrances and reduced-motion headings on retained sections, and nav-on-light throughout Projects/Work/Skills and out into Contact. Do not leave tests waiting for the not-yet-added stream. Arm popup/context page listeners before a real mouse click at a projected editorial cell centre, intercept that exact external URL locally with route.fulfill, assert URL/href and null opener; separately click a Project cover and assert route. Exercise 6px accepted and >6px rejected drags. Do not invoke handlers through page.evaluate. Readiness waits include data-warm. Verify root has rendered children, the surface loads, zero console errors/pageerrors/unhandled rejections, noncream glyph pixels, cream blank pixels and hover tint change. Test EN→PT→EN and resize generation stability, eight rows in both orientations, crossover, DPR2/3 capped backing stores and reduced-motion demand updates. Retain every existing short-height and near-square scene-scrub viewport, forward/reverse act-two sweeps, data-act transitions and registrations='1'. Keep actual camera projection legibility evidence for Motion/Access; screenshots from real font rasterisation complement unit metrics. Assert rendered title origin/hover colours and unchanged muted meta/serial against expected output-space colours with documented antialias/composer tolerance; use interior coverage pixels. Test ordered cover/caption overlap at the farthest volume shot and both projection extremes, including composer, with no z-fighting or missing layers. Exercise shared-cover consumer unmount while the other remains visibly textured, and injected raster failure with a warm cream wall and functioning act one.

**Acceptance check:** Before implementation the new popup and surface assertions fail because no frieze is drawn. Run `lsof -ti:4173 | xargs -r kill -9` before **every** Playwright invocation. Targeted command: `npx playwright test --workers=1 tests/e2e/light-chapter.spec.ts tests/e2e/section-enters.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/nav-on-light.spec.ts tests/e2e/frieze-click.spec.ts tests/e2e/frieze-surface.spec.ts tests/e2e/scene-scrub.spec.ts tests/e2e/scene-effects.spec.ts`. Use existing desktop/mobile projects and `--workers=1`.

**Boundaries:** No fake click success, deleted regression assertions, relaxed console checks, changed snapshots to conceal unrelated regressions or claimed performance measurements from SwiftShader.

- [x] Run `apply_patch` for yaw-aware coordinate helpers and real click tests; expected: tests select archive IDs via layout and click canvas coordinates.
- [x] Run `apply_patch` for the four old-Archive rewrites plus root/console, glyph, hover, language and resize smokes; expected: browser assertions include rendered pixels, not only canvas existence.
- [x] Run `apply_patch` for actual-extent scrub and composer coverage; expected: act-one assertions and Motion's act-two attributes retained.
- [x] Run `npx tsc -b`, `npm run lint`, then `npx vitest run`; expected: all exit 0, including JSON-LD and bundle dependencies.
- [x] Run the port-kill command, then the targeted Playwright command; expected: desktop/mobile wall click and all scene regressions pass, smoke reports zero errors.
- [x] Run the port-kill command, then `npx playwright test --workers=1`; expected: full-suite result recorded. Rewrite all four old-Archive specs in this pipeline; the entire suite must be green on the integration branch before Wall review. Access adds stream-specific assertions later.
- [x] Run `git diff --check`, stage this task's Files and ticks, then `git commit -m 'test: verify frieze clicks and rendered scene'`; expected: tests committed with truthful verification results in this plan.

### Task 10: Document the frieze and close the review handoff

**Files:**
- `docs/architecture.md` — modify: index, content model and Selected Work scene · act two/frieze descriptions.
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: verification evidence and Access/Motion handoff.

**Interfaces:** Produces current implementation documentation and measured-size/resource evidence for Access's contrast/performance audit.

**Work:** Document layout/extent, fixed eight rows, data serial/origin rules, one-mask-per-block shader, nine shared card objects, warm-up, memory accounting, callback ownership and lifecycle. Document Archive deletion and the target/locales seam Access will consume; note that resolveTitle already exists. Record the sibling plans’ stale portrait/deletion/card-four assumptions as superseded by the amended spec, without editing those plans here. Record actual minimum projected title/meta/caption sizes, mask dimensions, cap scale and compositor screenshots. Access owns recomputing docs/contrast.md as a unit and recording rig performance; pass ink 17.29:1, pink 5.64:1, blue 6.20:1, yellow 4.94:1 and muted 5.23:1 on cream as existing reference values requiring audit confirmation. Flag the spec's explicit yellow hover use at small wall sizes as overriding the older aesthetic substitution; no token changes here. No manual Kevin pass or review approval is implied by automation.

**Acceptance check:** `git diff --check` and `rg -n 'Frieze|frieze|yearBlocks|origin|serial' docs/architecture.md`; before documentation, architecture still describes obsolete shared kind fields.

**Boundaries:** Access owns final stream/chapter documentation and contrast table. Do not claim those have landed or tick their spec TODOs.

- [x] Run `apply_patch` for architecture index/content/frieze sections; expected: documentation matches code and names dependency ownership.
- [x] Run `apply_patch` to record actual verification results, size/cap evidence and Access handoff in this plan; expected: no estimated value presented as measurement.
- [x] Run the acceptance commands and inspect this task for remaining `- [ ]`; expected: only not-yet-run commit step remains unchecked.
- [x] Stage this task's Files with completed ticks and run `git commit -m 'docs: describe act-two frieze architecture'`; expected: bounded architecture/handoff commit.

### Task 11: Controller records plan review approval

**Files:**
- `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` — modify: Plan 2 TODO box only, by the controller after plan review.
- `docs/superpowers/plans/2026-09-08-act-two-wall.md` — modify: review record and these step ticks.

**Interfaces:** Consumes the spec's single plan review wave (Opus reviewer, Fable reviewer, codex-review), consolidated fixes and controller approval. Produces only the approved Plan 2 record.

**Work:** This is an administrative gate, listed after implementation tasks for ownership clarity but performed immediately after plan review, before implementation Task 1. The controller records review evidence and ticks `Plan 2 · Wall written, reviewed, assumptions listed.` only after every required review approves the fixed plan. The planner does not tick it in this delivery. Implementation completion, PR reviews, merges, contrast audit and Kevin's manual pass have separate boxes and remain untouched.

**Acceptance check:** `rg -n 'Plan [123] ·' docs/superpowers/specs/2026-09-08-archive-act-two-design.md` must show Plan 2 unchecked before approval; after controller action only that box changes.

**Boundaries:** No approval by elapsed time, no fabricated reviewer result, no push or merge. The controller may run this task independently of implementation completion.

- [ ] Run the acceptance command and inspect the consolidated review record; expected: all three review legs approved after the fix pass, or this task remains pending.
- [ ] Controller runs `apply_patch` for the Plan 2 box and review evidence; expected: only Plan 2's spec TODO changes.
- [ ] Run `git diff --check` and `git diff -- docs/superpowers/specs/2026-09-08-archive-act-two-design.md`; expected: one authorised checkbox change.
- [ ] Stage these two Files and run `git commit -m 'docs: record wall plan review approval'`; expected: controller-owned approval commit, separate from this planning delivery.

### Task 12: Final verification and implementation PR

**Files:** This plan’s verification/handoff record only; fixes return to their owning tasks.

**Work:** This is future implementation work, not part of the plan-only fix delivery. Confirm Tasks 1–10 are complete and reviewed Motion is integrated. Run `npx tsc -b`, `npm run lint`, `npx vitest run`, kill port 4173, then `npx playwright test --workers=1`; retain exact results. Inspect commit trailers: actual executor coauthor and actual Claude session where applicable. Push `git push -u origin feat/act-two-wall`; write a concrete PR body to a temporary file and run `gh pr create --base feat/act-two --head feat/act-two-wall --title 'feat: render the act-two archive wall' --body-file <path>`. Include verification, size/memory evidence, remaining documented conflicts and the Motion/Access seam handoff. Request Kevin’s desktop/phone manual pass: four-card release/dissolve, wall pointer ownership, volume/approach/dolly, text colours, all nine card routes, editorial popup, language, reduced motion and raster-failure survival. Automation does not mark his pass complete. Stop for Kevin’s three-leg PR review; no merge or deployment.

**Acceptance check:** PR targets `feat/act-two`, tests are green, evidence and manual checklist are reviewable; report the PR URL without claiming Kevin’s approval.

- [ ] Run the full verification set and record results; expected: green integration branch.
- [ ] Check trailers and commit the final evidence with `git commit -m 'docs: record wall implementation verification'`; apply the global tick-and-amend protocol.
- [ ] Push and create the PR against `feat/act-two`; expected: PR URL and Kevin’s manual pass pending. Tick locally after success, amend the evidence commit and push the amend with `--force-with-lease` before handing off, checking that the remote has not advanced.

## Task 10 record · measured evidence and the Access handoff

**How these numbers were produced.** Every figure below comes from running the shipped
functions against the real 171-piece archive · `friezeLayout`, `friezeExtent`, `friezeDensity`,
`panelsFor`, `maskSize`, `friezeHeightFill`, `dollyDistance`, `volumeDistance` · and from
screenshots taken against a production preview build at `74dc58b`. Nothing here is scaled from an
earlier table by eye. Geometry is built from **the canvas box the browser reports**, not from
`window.innerWidth`: the canvas is 1269 px wide inside a 1280 px viewport because of the
scrollbar, and Playwright's Pixel 5 is a 393×727 viewport, not 393×851. Feeding `sceneGeometry`
the window instead skews every projected pixel while nothing looks broken.

### The shipped extent

35 columns at six rows: `2026 @0 ×2` (3 pieces), `2025 @2 ×9` (42), `2024 @11 ×22` (118),
`2023 @33 ×2` (8); 17.5 × 2.1677419 world units; `data-svh="1575"`, confirmed on the running page
at all four viewports below.

### Density, panels and mask cost

| Canvas box | DPR | Density | Meshes | Largest panel | Cap scale | Steady | Peak |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 1269×720 (Playwright desktop) | 1 | 288.0 | 4 | 3168×624 | 1.000000 | 5.9985 MiB | 19.5381 MiB |
| 393×727 (Playwright mobile) | 1.5 | 432.0 | 5 | 2376×936 | 1.000000 | 13.4967 MiB | 35.4771 MiB |
| 1429×900 | 1.5 | 510.6696 | 5 | 2809×1107 | 1.000000 | 18.8720 MiB | 49.6061 MiB |
| 1909×1080 and taller | 1.5 | 612.8 (ceiling) | 5 | 3370×1328 | 1.000000 | 27.1635 MiB | 71.3990 MiB |

**The 4096 cap never binds, at any viewport.** `scale` is exactly 1 in every row, because
`panelsFor` splits before `maskSize` measures. The spec's prediction · "the cap therefore never
reduces raster detail; the ceiling does, uniformly" · is confirmed, not assumed. 2024 splits into
two 11-column panels at every density above 4096 / (22 · `FRIEZE_CELL_W`) = 372.36 texels/world,
which is every case except DPR 1 at 720 px tall, where 22 columns still fit in 3168 px.

**The ceiling's peak is 71.3990 MiB**, against the 71.4 MiB the second amendment predicted at
`RGFormat` and the 86.45 MiB the plan review approved. Steady at the ceiling is 27.1635 MiB
against the amendment's 27.2. Both land where the amendment said they would. Lookups are 840 B per
generation. Covers, captions, render targets and driver overhead are outside these totals.

### Minimum drawn type · what Access audits against

The 144 px cell floor binds on both Playwright projects, so **the desktop and phone minima are the
same**, and they are the smallest sizes act two ever draws:

| | CSS px | Device px @ DPR 1 | Device px @ DPR 1.5 |
| --- | ---: | ---: | ---: |
| Cell title (`CELL_TITLE_WORLD`, weight 600) | 17.280 | 17.280 | 25.920 |
| Cell meta and serial (`CELL_META_WORLD`, weight 500) | 11.520 | 11.520 | 17.280 |
| Wall card caption name (`WALL_TITLE_WORLD`) | 12.077 | 12.077 | 18.116 |

Larger canvases only grow these: 20.427 / 13.618 CSS px at 1429×900, 24.512 / 16.341 at
1909×1080. The caption name stays above `CAPTION_MIN_NAME_PX` (12) at its minimum, by 0.077 px.

### Colours · no new pairs, only new sizes

The wall draws the light chapter's existing tokens and invents nothing: professional `#0B0E14`
(ink, 17.29:1 on cream), freelance `#B22B47` (pink-deep, 5.64:1), personal `#2A54B5` (blue-deep,
6.20:1), hover through `hoverColorFor`'s index rotation including `#7A6800` (yellow, 4.94:1).
Meta and serial use `#646566`, which is **not a new colour**: it is `rgba(11,14,20,.62)` · the
muted step, 5.23:1 · already composited on cream `#F5F2EC`, because a shader cannot alpha-blend
against the wall the way CSS does. Verified componentwise: `0.62·11 + 0.38·245 = 99.9 → 0x64`,
`0.62·14 + 0.38·242 = 100.6 → 0x65`, `0.62·20 + 0.38·236 = 102.1 → 0x66`.

Those five ratios are **existing reference values carried over, not an audit**. Access recomputes
`docs/contrast.md` as a unit and confirms them at the minimum drawn sizes above.

### What the screenshots show

Production preview build, four canvases, at mid-release, the volume shot, the 2025|2024 block
boundary and the 2024 panel seam. `data-frieze` read `ready` and `data-warm` read `true` at every
one · including at deviceScaleFactor 1.5 and at 1080 px, which no committed test exercises.

- **The panel seam is invisible.** At 1429×900 DPR 1.5, parked on column 22 where 2024's two
  panels meet, type is uniformly sharp across the seam with no step in weight or sharpness. This
  was the second amendment's central worry and it does not materialise · consistent with the
  measured cap scale of 1.
- **The reading beat is crisp** at DPR 1.5: titles, meta and tabular serials all resolve cleanly.
- **Two cosmetic artifacts, recorded and left alone** (Kevin's 2026-09-09 standing instruction:
  visual fixes come after the section revamp plans, not during them). A three-digit serial
  beginning with `1` reads with a visible gap · `135` renders as `1 35` · because `digitAdvance`
  places every digit on the widest digit's advance and the `1` sits left in its slot. And at least
  one 2024 cell ellipsises to `…` alone, the documented behaviour for a title whose first token
  cannot fit.

### Volume-shot minification · measured, and the earlier estimate corrected

The second amendment estimated "~9×" minification at the 1280×720 volume shot and left the
mipmap decision to Kevin. **That estimate does not reproduce.** It compared the 612.8 ceiling
against CSS pixels, but at 720 px tall the ceiling does not bind (density is 432 at DPR 1.5), and
the comparison must be against *device* pixels. Measured, as texels per rendered device pixel:

| Canvas | Density | CSS px/world at the volume shot | Minification |
| --- | ---: | ---: | ---: |
| 1269×720 DPR 1 | 288.0 | 65.26 | **4.41×** |
| 1429×900 DPR 1.5 | 510.7 | 73.49 | **4.63×** |
| 1909×1080 DPR 1.5 | 612.8 | 98.18 | **4.16×** |
| 393×727 DPR 1.5 | 432.0 | 20.21 | **14.25×** |

So the desktop case is roughly half as severe as estimated, and **the phone, not the desktop, is
the worst case by 3×**. A still frame cannot settle the question either way: shimmer is temporal,
and what a screenshot can show is whether minified text stays coherent, which on desktop it does
and on the phone it does not · at 1.213 CSS px per title em the wall reads as grey noise. The
decision stays Kevin's.

### The portrait volume shot · re-derived

At 393×727 the frieze fills **0.0603 of canvas height** (0.9 of width, which is what
`VOLUME_FILL` binds on for a wall of aspect 8.07). The prior handoff's "~0.092 of frame height"
does not reproduce from the shipped functions at any of the four canvases; 0.0603 is the measured
figure. Composition, not correctness: the wall is a thin band with a large empty cream field below
it. Flagged for Kevin's manual pass, deliberately not changed here.

### Records superseded by measurement

- **This plan's body says "fixed eight rows" and 26 columns.** Six rows and 35 columns is settled
  (controller amendment). Every extent number in the body below that amendment is stale; the
  amendment's table governs. Task 10 documents six.
- **Task 1's mask table (the 70.49 / 93.53 MiB figures) is superseded.** It was computed at RGBA8
  (`w · h · 4`) with 2024 capped to 4096×807 at scale 0.862. The second amendment replaced both
  halves of that basis · `RGFormat` at two bytes, and a column-aligned panel split instead of a
  cap · so those numbers describe a design that does not ship. The table above replaces them. The
  amendment's own prediction is what the code reproduces.
- **The Motion plan's worked values are eight-row values** (`dDolly 4.956`, fill `0.925` and ten
  columns visible at 1440×900; fill `0.978` and 2.7 columns at 393×851; wrapper 1350 svh,
  `sceneWrapperSvh(26)`). Measured on the merged base: fill is `0.820` at 1429×900 and `0.859` at
  393×727, `dDolly` is `4.1922` and `4.0030`, and the wrapper is 1575 svh. `docs/architecture.md`
  carried the same stale fill and clearance figures and is corrected in this task. The Motion plan
  is not edited here.
- **The Motion plan's `FRIEZE_ROWS = 8` and the Access plan's rename story are both moot.** The
  merged base ships `FRIEZE_ROWS = 6` under that name; there is no `FRIEZE_ROWS_LANDSCAPE` and no
  portrait constant, so Access Task 1 has no rename to record.
- **Pipeline 2's deletions are done** (Task 2): the Archive section, its dropdown, the `.archive-*`
  rules, the toolbar and sort strings, Home's lazy import and the first rewrite of the four
  old-Archive e2e specs. Access deletes none of them and inherits a green suite.

### Handoff to Access (pipeline 3)

- **Seam.** `friezeTargets.playheadForItem(itemId, layout, extent)` returns the playhead for a
  piece, composing `playheadForColumn` at the cell's centre column, and `null` for an unknown id.
  Feed it to `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)`.
  `volumeShotPlayhead(columns)` is what the `#archive` nav link lands on. Nothing in `src/`
  imports `friezeTargets` yet · Access is its first consumer.
- **Read the column count from the page, never recompute it.** `columnsFromSvh` on the live
  wrapper's `data-svh`. **The Access plan's acceptance values are stale**: it asserts
  `columnsFromSvh(1350) === 26` and stubs a wrapper at `data-svh="1350"` with `offsetHeight`
  12150. On the merged base those become **1575 and 35**. Written as `(svh − 700) / 25` the
  helper is correct; only the literals in its checks need updating.
- **Contrast.** `docs/contrast.md` rows 2 and 9 still list retired `.archive-*` selectors
  (`.archive-chip`, `.archive-count`, the dropdown, the Archive load-more `.btn--ghost`). Recompute
  the light-chapter table as a unit, drop the dead selectors, and add the wall's rows at the
  minimum drawn sizes above.
- **The yellow hover.** Row 8's note calls the yellow-slot substitution at small text "aesthetic".
  On the wall the spec puts yellow on a 17.28 px hovered title deliberately, so it is now a
  functional use at small size; at 4.94:1 it clears the 4.5:1 normal-text threshold, but the note
  should say so rather than describe the choice as taste. No token changes here.
- **`resolveTitle(item, lang)` already exists** in `src/types/content.ts`; the stream reads titles
  through it, and the origin words are locale strings shared with the wall.
- **Performance.** Act two's mask cost is the table above; the rig measurement and the recorded
  deltas are Access's, per the spec.

### Still open · not resolved by this task

1. **Mipmaps for the volume shot**, on the measured 4.16–4.63× desktop and 14.25× phone
   minification. Kevin's call.
2. **The portrait volume shot's composition** at 0.0603 of canvas height. Kevin's call.
3. **No committed test covers deviceScaleFactor 1.5.** The second amendment asked Task 9 for a
   screenshot fixture at DPR 1.5 and at least 900 px tall on the 2025|2024 boundary; Task 9's
   suite has none, and both Playwright projects miss it (`Desktop Chrome` is DPR 1, `Pixel 5` is
   DPR 2.75 capped to 1.5 but only 727 px tall). The panel split therefore renders in CI only on
   the mobile project, and the 612.8 ceiling never renders in CI at all. This task took that
   evidence by hand and it is clean; making it a standing guard is a Task 9 reopening and is
   Kevin's call, not this task's to take.
4. **No test measures volume-shot minification**, by the same amendment's request.
5. **The `data-act-two-u` diagnostic hook** remains unfiled as an issue (Fable's standing ruling:
   do not add it in this pipeline).

## Acceptance map

| Binding acceptance | Concrete check | Owner/task |
| --- | --- | --- |
| Each piece once; 2×2 spans; no overlaps | `tests/unit/friezeLayout.test.ts`: occupied-slot set and IDs | Wall 3 |
| Block width/column sum/world extent | Same suite: prefix columns, 26-column data fixture in both orientations, width/height | Wall 3 |
| Eight rows and framing bound | `tests/unit/sceneMotion.test.ts`: fixed-row aspect sweep and maxRowsInFrame | Wall 3 |
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
| Legacy deletions and four e2e rewrites | No dangling Archive imports; full integration suite green | Wall 2/9 |
| Stream/focus/no-WebGL/nav | Access consumes friezeTargets and volumeShotPlayhead | Access |

Plan self-review: every Wall acceptance has a named task and check; camera placement remains a named dependency, not a second implementation. Assumptions 2, 3, 9, 15 and 17 are overturned; the reviewed resolutions and code-backed exceptions above govern execution. No implementation step or spec TODO has been completed by writing this plan.
