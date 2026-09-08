# Act two · Motion implementation plan

**Goal:** Extend the Selected Work scene's playhead past card four into act two · release, approach, dolly, exit · as pure pose functions, with the wrapper height computed from the frieze's column count, the title carrying `all work` and the year strings, `data-act` on the canvas, reduced-motion stills, and the scroll seams the wall and the stream will drive, while every act-one frame stays pixel-identical.
**Architecture:** `src/utils/sceneMotion.ts` gains an act-two section that never touches the act-one functions: the playhead becomes piecewise (act one in card units on `[−1.5, 3]`, act two normalised on `[3, 4]`), and `actTwoPose(u, frieze, g)` composes a frieze frame in world space from a typed extent. `SceneRig` reads the extended playhead, clamps the act-one segment at `3`, and writes the act-two camera, fog, focus and title indices through the same one frame loop. `Projects.tsx` sets the wrapper height inline from the data. A stub `src/utils/friezeLayout.ts` carries the constants and the extent type pipeline 2 completes, plus a provisional extent so the branch runs on its own.
**Spec:** `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` · "Act two choreography", the pipeline-1 row in "Pipelines and the merge chain", and the `sceneMotion` and e2e acceptance items.
**Execution model:** opus. Every formula below is derived with the numbers that justify it and every task is a contract with an acceptance command; the judgement is in this file, not in the executor.
**Plan review:** one wave (`reviewer` on Opus, `reviewer` on Fable, `codex-review` on sol), consolidated into one fix pass, before Task 1. No second wave.

## Global constraints

- `main` is FROZEN. This branch is `feat/act-two-motion`, forked from `feat/act-two`; its PR targets `feat/act-two`, never `staging` or `main`.
- Typecheck is `npx tsc -b`. A bare `npx tsc --noEmit` is a no-op in this repo.
- Before any e2e run: `lsof -ti:4173 | xargs -r kill -9`. `playwright.config.ts` reuses a stale preview server otherwise.
- The verification set: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npx playwright test`. This plan touches a rendered surface, so the headless smoke (loads, root renders, zero console errors) is required; `tests/e2e/scene-scrub.spec.ts` is that smoke for the scene and the only guard that catches a throw inside the frame loop.
- Act one is pixel-identical: every existing test in `tests/unit/sceneMotion.test.ts` passes without edits, the act-one pose snapshot from Task 1 matches byte for byte, and the title-identity dump from Task 1 matches after Task 7.
- Zero React state per frame (ADR 0010, ADR 0011). `data-*` attributes are written imperatively on `gl.domElement`, only when they change.
- One lane: the R3F frame loop reads Framer MotionValues and writes three objects itself. Framer never animates a three object; GSAP never touches the scene.
- No router and no DOM beyond `gl.domElement` inside `src/components/canvas/`.
- `sceneMotion.ts` imports from `friezeLayout.ts`, never the reverse.
- `CARD_COUNT` stays 4. `FOV_DEG` is 35; every number below was computed at 35.
- TypeScript strict, no `any`, explicit return types on every exported utility. Props interface above each component.
- Bilingual: `all work` is `t('sections.archive.title')`, already `all work` / `todos os trabalhos`. Year strings are digits. No new i18n keys, no new libraries.
- Every animation honours `prefers-reduced-motion`; act two renders stills there.
- `·` in reader-facing prose, never a spaced em-dash. Docs count as reader-facing.
- Plan step boxes tick immediately after the step's command lands, never batched. The spec's TODO box for plan 1 is ticked by the controller (Task 0), never by the executor. No other spec box is touched on this branch.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and the session's `Claude-Session:` trailer.

## Consumed frieze extent type

Defined by this plan in `src/utils/friezeLayout.ts` so pipeline 2's `friezeLayout(items, rows)` result is structurally assignable to it (extra fields such as `cells` are fine; these fields are required):

```ts
export interface FriezeBlockExtent {
  year: number
  /** First column of the block, 0 = the newest edge (the reader's left). */
  startCol: number
  /** Width in columns; the sum over blocks equals `FriezeExtent.columns`. */
  columns: number
}

export interface FriezeExtent {
  columns: number
  rows: number
  /** Newest first, contiguous: `blocks[k+1].startCol === blocks[k].startCol + blocks[k].columns`. */
  blocks: readonly FriezeBlockExtent[]
}
```

Also exported from the stub, in world units: `FRIEZE_CELL_W = 0.5` (half a scene card, so a 2×2 case study is exactly one `CARD_W`), `FRIEZE_CELL_H = 448 / 620 / 2` (half a card's height, about 0.3613), `FRIEZE_ROWS_LANDSCAPE = 8`. Pipeline 2 may retune the cell constants; every motion formula is parametric in them.

**Unit-test fixture** (`FIXTURE_FRIEZE`, in `tests/unit/sceneMotion.test.ts`): 22 columns, 8 rows, blocks `2026 @0 ×1`, `2025 @1 ×6`, `2024 @7 ×13`, `2023 @20 ×2`. It is a fixture, chosen to make the spec's `sceneWrapperSvh(22) = 1250` line exact; it is not the data-derived value. The provisional runtime extent from today's data (3/42/118/8 pieces, 3/3/3/0 case studies at 4 cells each, 8 rows) gives `2/7/16/1 = 26` columns and a 1350 svh wrapper; pipeline 2's real layout decides the shipped number.

## Geometry of act two, derived

Notation: `tan = HALF_FOV_TAN`, `g = sceneGeometry(w, h)`, `S = actTwoSvh(columns)`.

**Scroll.** `actTwoSvh(columns) = 100 + 50 + 25·columns` for `columns ≥ 1`, and `0` for `columns ≤ 0` (no frieze, no act two). `sceneWrapperSvh(columns) = 550 + actTwoSvh(columns)`. The act-one scrub is 450 svh (`550 − 100`), one playhead unit per 100 svh, unchanged. Beats in `u`: release ends at `uR = 100 / S`, approach at `uA = 150 / S`; at 22 columns `uR = 1/7`, `uA = 3/14`.

**Playhead.** `playheadFor(progress, columns = 0)`: `scrub = progress · (450 + actTwoSvh(columns))` svh. If `scrub ≤ 450`: `−1.5 + scrub / 100`, floored at `−1.5`. Otherwise `3 + (scrub − 450) / actTwoSvh(columns)`, capped at `4`. With `columns = 0` this is exactly today's `clamp(progress · 4.5 − 1.5, −1.5, 3)`. `actTwoProgress(playhead) = clamp(playhead − 3, 0, 1)`; `actOneSeg(playhead) = min(playhead, 3)`; `actTwoPlayhead(u) = 3 + clamp(u, 0, 1)`. `ACT_TWO_START = CARD_COUNT − 1` is exported; the private `MAX_SEG` and `PLAYHEAD_SPAN` do not change.

**Frieze frame** (`friezeFrame(frieze, g)`): width `W = columns · FRIEZE_CELL_W`, height `H = rows · FRIEZE_CELL_H`, centred on the corridor axis (`centreX = 0`), bottom edge at `HOVER` like the cards (`centreY = HOVER + H/2`), standing at `z = −(ACT_TWO_START + 1) · g.spacing`, one spacing beyond card four, facing the camera. Returns `{ left, right, bottom, top, z, width, height, centreX, centreY }`.

**Volume shot distance** `dVol = max(W / (2·tan·g.aspect·0.9), H / (2·tan·0.9))` (`VOLUME_FILL = 0.9`): the whole frieze fits the frame with a 5 % margin on the binding axis. **Dolly distance** `dDolly = min(dHeight, dLegible)` with `dHeight = H / (2·tan·0.82)` (`DOLLY_HEIGHT_FILL = 0.82`, the wall fills the frame vertically) and `dLegible = FRIEZE_CELL_W · g.widthPx / (2·tan·g.aspect·FRIEZE_CELL_MIN_PX)`, `FRIEZE_CELL_MIN_PX = ceil(CARD_MIN_PX / 2) = 144`: a cell is never narrower than 144 CSS px, so an embedded 2×2 card is never narrower than `CARD_MIN_PX` and its caption never drops under 12 px, the scene's existing legibility law. The legibility term binds on every fixture; the height term is what keeps the wall from filling more than the frame. Worked values at 1440×900, fixture extent: `D 2.30`, `spacing 2.65`, wall `z −10.59`, `dVol 12.11`, `dDolly 4.95` (cell 144 px wide, 104 px tall, ten columns visible), camera rises from `camY 0.95` to `centreY 1.59` and pulls back 7.2 units from the card-four slot. At 393×851: `dVol 42.0`, `dDolly 4.69`, height fill `0.98`, 2.7 columns visible.

**Camera path** (`actTwoPose(u, frieze, g) → { x, y, z, yaw, pitch }`):
- `P_slot = cameraPose(ACT_TWO_START, g)` with pitch `CAM_PITCH_DEG` and yaw 0; `P_vol = (0, centreY, z + dVol)`, pitch 0, yaw 0; `P_dolly(x) = (x, centreY, z + dDolly)`, pitch 0, yaw 0.
- `xStart = max(left + halfVisible, 0)`, `xEnd = min(right − halfVisible, 0)`, `halfVisible = dDolly · tan · g.aspect`; when the frieze is narrower than the frame both are `0` and the camera holds centre.
- Release `u ∈ [0, uR]`: `s = smoothstep(u / uR)`; position and pitch lerp `P_slot → P_vol`. At `u = 0` the pose equals `cameraPose(3, g)` exactly, with zero velocity at both ends, so the settle plateau of card four hands over without a lurch.
- Approach `u ∈ [uR, uA]`: `s = smoothstep((u − uR) / (uA − uR))`; position lerps `P_vol → P_dolly(xStart)`. The eye leads the body: the look target's x runs `0 → xStart` on `sLead = smoothstep(clamp(1.5 · (u − uR) / (uA − uR), 0, 1))`, and yaw is `atan2(−(xTarget − x), dWall)` where `dWall = z_camera − z_wall`; positive yaw turns left (three's `rotation.y`). Yaw is 0 at both ends of the beat; pitch 0.
- Dolly `u ∈ [uA, 1]`: `p = (u − uA) / (1 − uA)`, `x = xStart + (xEnd − xStart) · dollyEase(p, 1 / columns)`, yaw 0, pitch 0. `dollyEase` is a trapezoid velocity profile, linear in the middle and ramping over one column's share `w` at each end, so the middle speed is constant and the exit slows to rest inside the last column with no scroll added:

```ts
/** Position under a trapezoid velocity profile: ramps over `w` at each end, flat between. C1 on [0, 1]. */
export function dollyEase(p: number, w: number): number {
  const t = clamp(p, 0, 1)
  const ramp = clamp(w, 1e-6, 0.5)
  const vmax = 1 / (1 - ramp)
  if (t < ramp) return (vmax * t * t) / (2 * ramp)
  if (t > 1 - ramp) return 1 - (vmax * (1 - t) * (1 - t)) / (2 * ramp)
  return vmax * (t - ramp / 2)
}
```

- `camera.rotation.order` is set to `'YXZ'` once, in the rig's geometry block. With yaw 0 a single-axis rotation is identical in any order, so act one's view matrix does not change.

**Reading cursor and title.** The cursor is the scroll's column budget, not the camera: `dollyCursor(u, frieze) = columns · p` on `[0, columns]` during the dolly. `blockAt(u, frieze)` returns `null` for `u < uA` and otherwise the block whose column range contains `min(floor(cursor), columns − 1)`; across the dolly it yields each year exactly once, newest first. Title morphs happen inside windows around each block boundary `b_k = blocks[k].startCol`: half-widths `hl_k = min(0.5, blocks[k−1].columns / 2)` (0 for `k = 0`) and `hr_k = min(0.5, blocks[k].columns / 2)`, in columns, so windows never overlap even around a one-column block and every boundary has one. `actTwoTitle(u, frieze) → { from, to, frac }` in act-two title space (`−1` = act one's last card, `0` = `all work`, `1 + k` = block `k`): release gives `{ −1, 0, u / uR }`; approach `{ 0, 0, 0 }`; dolly: the active window if the cursor is inside one (`frac = (cursor − (b_k − hl_k)) / (hl_k + hr_k)`), else `{ 1 + k, 1 + k, 0 }` for the current block. `seamFor` applies `settleFrac`, so every window rests at both ends; the release window's plateau is what holds card four's name for the first 15 % of the release.

**Stills** (`actTwoStillPose(u, frieze, g)`): `blockAt(u) === null` gives the volume shot (`actTwoPose(uR, …)`); a block gives `P_dolly(clamp(blockCentreX, xStart, xEnd))` with `blockCentreX = left + (startCol + columns / 2) · FRIEZE_CELL_W`. The reduced-motion title index is `blockAt`; no seam.

**Fog, far plane, focus, title distance.** `fogRangeAt(distance, g, t)` generalises `fogRange` (`near = (distance + 0.15·spacing)·drift`, `far = (distance + 2.2·spacing)·drift`, `fogRange(g, t) ≡ fogRangeAt(g.D, g, t)`, body unchanged). `actTwoFogRange(u, frieze, g, t)` lerps `fogRange(g, t) → fogRangeAt(dWall, g, t)` on `smoothstep(u / uR)` and holds the wall value from `uR` on: at `u = 0` the wall stands at `D + spacing`, about 40 % dissolved like the next card down the corridor, and clears as the camera pulls back. `sceneFar(frieze, g) = max(g.far, dVol + 2·spacing)` is applied with the frustum on the geometry/frieze key, not per frame; the image of act one does not depend on the far plane. `actTwoFocusDistance(u, frieze, g)` lerps `g.D → dWall` on the same release ease and holds `dWall` after; the rig writes it to `sceneRefs.focus.distance` every frame (act one writes `g.D`). `actTwoTitleDistance(dWall, g) = min(g.titleDistance, 0.8·dWall)` keeps the title plane in front of the wall (at 393×851 `titleDistance` is 5.0 and `dDolly` 4.69); the title's pixel size is distance-invariant by construction (`worldPerPx` scales with the distance), so the switch is invisible.

**Scroll seams.** `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns = 0)` is the exact inverse of `playheadFor` on both pieces; with `columns = 0` it is today's function. `playheadForColumn(col, frieze) = actTwoPlayhead(uA + (1 − uA) · clamp(col / columns, 0, 1))` for a continuous column coordinate (a cell gives `cell.col + span / 2`); `playheadForBlock(k, frieze)` is the block's centre column; `volumeShotPlayhead(columns) = actTwoPlayhead(uR)` is what the `#archive` nav link lands on. `actTwoBeats(columns) → { release: uR, approach: uA }`.

**Legibility bound for pipeline 2.** `friezeHeightFill(frieze, g) = H / (2·tan·dDolly)` and `maxRowsInFrame(g) = floor((FRIEZE_CELL_W / FRIEZE_CELL_H) · g.heightPx / FRIEZE_CELL_MIN_PX)`, 8 at both 1440×900 and 393×851. A row count above it clips rows at the dolly distance because the cell floor binds first.

---

### Task 0 (controller, not the executor): plan review wave and the spec box

**Files:**
- `docs/superpowers/plans/2026-09-08-act-two-motion.md` — modify: the consolidated fix pass
- `docs/superpowers/specs/2026-09-08-archive-act-two-design.md` — modify: tick `Plan 1 · Motion written, reviewed, assumptions listed`; nothing outside this list

**Work:** The controller dispatches the one review wave on this plan (`reviewer` on Opus, `reviewer` on Fable, `codex-review` on sol), consolidates the findings into one fix pass on this file, then ticks the spec's plan-1 box in the same commit on `feat/act-two-motion`. Kevin may veto any numbered Assumption in that pass. The executor never touches the spec file.

**Acceptance check:** `grep -n 'Plan 1 · Motion' docs/superpowers/specs/2026-09-08-archive-act-two-design.md` shows `- [x]`; `git log --oneline -1` is the fix-pass commit.

**Boundaries:** No other spec box. Nothing under `src/` or `tests/`.

- [ ] Review wave dispatched, findings consolidated, fix pass committed
- [ ] `sed -i '' 's/- \[ \] Plan 1 · Motion/- [x] Plan 1 · Motion/' docs/superpowers/specs/2026-09-08-archive-act-two-design.md && git commit -am "docs: plan 1 reviewed; tick the spec box"`

### Task 1: act-one baseline · pose snapshot and title-identity dump

**Files:**
- `tests/unit/sceneMotion.actOne.test.ts` — create: the act-one pose snapshot
- `tests/unit/__snapshots__/sceneMotion.actOne.test.ts.snap` — created by vitest on the first run; committed
- `scripts/scene-title-identity.mjs` — create: the dev-server dump script
- `docs/superpowers/plans/evidence/2026-09-08-title-identity.before.json` — create: the dump on the unchanged code
- `src/components/canvas/scene/SceneRig.tsx` — modify: the DEV-only `__scene` effect also exposes `__sceneCamera`; nothing outside this list

**Interfaces:**
- Consumes: `sceneGeometry`, `easedSeg`, `cameraPose`, `cardPose`, `frontIndexFor`, `settledness`, `overturePose`, `segmentFor`, `seamFor`, `fogRange`, `frameRects`, `scrollTargetFor`, `playheadFor` from `src/utils/sceneMotion.ts`, exactly as exported today.
- Produces: the snapshot file and the before-dump later tasks compare against.

**Work:** Both artefacts are produced on the base commit, before any source change, so they are the definition of "pixel-identical".

1. The snapshot test: for each of the four viewports in `tests/unit/sceneMotion.test.ts` plus `820×821` and `960×950`, for every playhead in `−1.5` to `3` step `0.05` (inclusive; use integer steps `i / 20` to avoid float drift), record a plain object with `easedSeg`, `cameraPose(eased, g)`, `cardPose(i, eased, g)` for `i` in `0..3`, `frontIndexFor(seg, 4, false)` and `(seg, 4, true)`, `settledness(seg, false)`, `overturePose(seg, false)` and `(seg, true)`, `segmentFor(seg, 4)`, `seamFor(segmentFor(seg, 4).frac, 0.4, 0.05)`, and `fogRange(g, 0)`; plus `frameRects(g)` and `scrollTargetFor(k, 1234, 5.5 · h, h)` for `k` in `0..3` and `playheadFor(k / 9)` for `k` in `0..9`, once per viewport. Round every number to 9 decimals and `expect(record).toMatchSnapshot()` once per viewport. Internal structure is yours; the set of sampled functions is not.
2. The dump script, run against the dev server, reads the DEV-only `window.__scene` handle (`SceneRig.tsx`, stripped from production) at settled playheads across the viewport matrix. This shape is load-bearing, because the after-run in Task 7 must sample identically:

```js
// scripts/scene-title-identity.mjs · node scripts/scene-title-identity.mjs <out.json> [devUrl]
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const [, , out, url = 'http://localhost:5173/'] = process.argv
const VIEWPORTS = [[1440, 900], [1920, 1080], [1280, 720], [393, 851], [820, 821], [960, 950]]
const PLAYHEADS = [-1.5, -0.5, 0, 1, 2, 3]
const browser = await chromium.launch()
const result = {}
for (const [width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(url)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]').waitFor({ timeout: 30000 })
  const samples = {}
  for (const playhead of PLAYHEADS) {
    await page.evaluate((p) => {
      const wrapper = document.querySelector('#projects .scene-scroll')
      const top = wrapper.getBoundingClientRect().top + window.scrollY
      // One playhead unit is 100 svh; svh equals innerHeight in headless Chromium.
      window.scrollTo({ top: top + (p + 1.5) * window.innerHeight, behavior: 'instant' })
    }, playhead)
    await page.waitForTimeout(500)
    samples[playhead] = await page.evaluate(() => {
      const s = window.__scene
      const camera = window.__sceneCamera?.current ?? null
      const r = (v) => Math.round(v * 1e6) / 1e6
      return {
        camera: camera ? [r(camera.position.x), r(camera.position.y), r(camera.position.z), r(camera.rotation.x), r(camera.rotation.y), r(camera.near), r(camera.far)] : null,
        titleScale: s.title ? [r(s.title.scale.x), r(s.title.scale.y)] : null,
        titleZ: s.title ? r(s.title.position.z) : null,
        metrics: s.titleMetrics.slice(0, 4).map((m) => [m.widthPx, m.heightPx, m.lineCount, r(m.drawnScale), m.baselinePx, m.inkTopPx, m.inkBottomPx]),
        slot: document.querySelector('#projects canvas').dataset.slot,
      }
    })
  }
  result[`${width}x${height}`] = samples
  await page.close()
}
await browser.close()
writeFileSync(out, JSON.stringify(result, null, 2))
```

   The camera reaches the page through the same DEV-only effect in `SceneRig.tsx` that sets `window.__scene`: it also sets `holder.__sceneCamera = cameraRef` (the ref object, so `.current` is the live camera) and deletes it in the cleanup; the holder type becomes `{ __scene?: SceneRefs; __sceneCamera?: RefObject<THREE.Camera | null> }`. The whole effect is stripped from production and changes no frame; it is the one source edit this task makes, before the before-dump is taken. The title's `position.y` carries the time-driven float and is deliberately not sampled; `titleZ` is deterministic.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.actOne.test.ts` passes and writes 6 snapshots (`Snapshots  6 written`). `npm run dev` in a second terminal, then `node scripts/scene-title-identity.mjs docs/superpowers/plans/evidence/2026-09-08-title-identity.before.json` writes a file with 6 viewport keys, each with 6 playhead samples, every `metrics` array of length 4 and `titleScale` non-null.

**Boundaries:** No change under `src/` except the DEV-only `__sceneCamera` line in the existing `__scene` effect; nothing inside `useFrame`. Do not edit `tests/unit/sceneMotion.test.ts`.

- [ ] `git switch feat/act-two-motion && git pull --ff-only` ; confirm `git log --oneline -1` is the Task 0 fix-pass commit
- [ ] Write `tests/unit/sceneMotion.actOne.test.ts`; `npx vitest run tests/unit/sceneMotion.actOne.test.ts` → 6 snapshots written
- [ ] Add `__sceneCamera` to the DEV effect in `SceneRig.tsx`; `npx tsc -b` clean
- [ ] Write `scripts/scene-title-identity.mjs`; start `npm run dev`; run the script to the `before.json` path; inspect the file has 6×6 samples with non-null `camera`
- [ ] `git add tests/unit/sceneMotion.actOne.test.ts tests/unit/__snapshots__ scripts/scene-title-identity.mjs docs/superpowers/plans/evidence src/components/canvas/scene/SceneRig.tsx && git commit -m "test(scene): act-one pose snapshot and title-identity baseline"`

### Task 2: the frieze stub · constants, extent type, provisional extent

**Files:**
- `src/utils/friezeLayout.ts` — create: constants, types, `provisionalFriezeExtent`
- `tests/unit/friezeLayout.provisional.test.ts` — create; nothing outside this list

**Interfaces:**
- Consumes: `archive` and `ArchiveItem` as they exist today (`src/data/archive.ts`, `kind: 'featured' | 'editorial' | …`, `sortDate`).
- Produces: `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FRIEZE_ROWS_LANDSCAPE`, `FriezeBlockExtent`, `FriezeExtent` (exactly as in "Consumed frieze extent type" above), and `provisionalFriezeExtent(items: readonly ArchiveItem[], rows: number): FriezeExtent`.

**Work:** A header comment states that pipeline 2 owns and completes this file (`friezeLayout(items, rows)`, `Cell`, block textures) and that `sceneMotion.ts` imports from here, never the reverse. `provisionalFriezeExtent` groups items by `new Date(item.sortDate).getUTCFullYear()`, newest year first, counts `4` cells for `kind === 'featured'` and `1` otherwise, gives each block `ceil(cells / rows)` columns (minimum 1), and assigns contiguous `startCol`. It must not import from `sceneMotion.ts`. Years with zero items do not appear. Mark the function `@deprecated pipeline 2 replaces this with friezeLayout()` so the replacement is one search away.

**Acceptance check:** `npx vitest run tests/unit/friezeLayout.provisional.test.ts` red before (module missing), green after, asserting: with a synthetic list of 3/42/118/8 items over 2026..2023 carrying 3/3/3/0 featured, `rows = 8` gives blocks `2/7/16/1`, `columns = 26`, `startCol` `0/2/9/25`, years newest first; and against the real `archive` the sum of block columns equals `columns` and every block has `columns ≥ 1`.

**Boundaries:** Nothing under `src/components/`, nothing in `sceneMotion.ts`, no content-model change (`src/types/content.ts` is pipeline 2's).

- [ ] Write the test; `npx vitest run tests/unit/friezeLayout.provisional.test.ts` → red, module not found
- [ ] Write `src/utils/friezeLayout.ts`; the test → green; `npx tsc -b` clean
- [ ] `git add -A src/utils/friezeLayout.ts tests/unit/friezeLayout.provisional.test.ts && git commit -m "feat(frieze): extent type, cell constants and a provisional extent"`

### Task 3: playhead, scroll budget and scroll targets

**Files:**
- `src/utils/sceneMotion.ts` — modify: add the act-two scroll section; no existing function body changes
- `tests/unit/sceneMotion.test.ts` — modify: add `describe('act two · scroll')`; no existing test changes; nothing outside this list

**Interfaces:**
- Consumes: nothing new.
- Produces: `ACT_TWO_RELEASE_SVH = 100`, `ACT_TWO_APPROACH_SVH = 50`, `ACT_TWO_SVH_PER_COLUMN = 25`, `ACT_ONE_SVH = 550`, `ACT_TWO_START`, `actTwoSvh(columns: number): number`, `sceneWrapperSvh(columns: number): number`, `actTwoBeats(columns: number): { release: number; approach: number }`, `playheadFor(progress: number, columns = 0): number`, `actTwoProgress(playhead: number): number`, `actOneSeg(playhead: number): number`, `actTwoPlayhead(u: number): number`, `scrollTargetFor(playhead: number, wrapperTop: number, wrapperHeight: number, viewportHeight: number, columns = 0): number`, `volumeShotPlayhead(columns: number): number`.

**Work:** Exactly the "Scroll" and "Playhead" derivations above. `playheadFor` and `scrollTargetFor` keep their four-argument behaviour byte-identical when `columns` is omitted or `0`. Rename the existing `index` parameter of `scrollTargetFor` to `playhead` (the value was always a playhead; the JSDoc says so). Keep `MAX_SEG` and `PLAYHEAD_SPAN` private and unchanged; express `ACT_ONE_SVH` as `(PLAYHEAD_SPAN + 1) · 100` with a comment that it is the retired CSS literal.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` red on the new describe before, green after with every pre-existing test untouched. New assertions: `sceneWrapperSvh(22) === 1250`, `actTwoSvh(0) === 0`, `sceneWrapperSvh(0) === 550`; `actTwoBeats(22)` equals `{ release: 1/7, approach: 3/14 }` to 12 places; `playheadFor(p, 22)` equals `playheadFor(p)` for every `p` in `[0, 0.36]` step `0.01` scaled so the act-one scrub is the same pixels (`p_22 = p · 450 / 1150`), i.e. `playheadFor(p · 450/1150, 22) ≈ playheadFor(p)`; `playheadFor(450/1150, 22) === 3`, `playheadFor(1, 22) === 4`, `playheadFor((450 + 350)/1150, 22) === 3.5`, and `playheadFor(p, 22)` is non-decreasing over `p ∈ [0, 1]` step `0.001`; `actTwoProgress(3) === 0`, `actTwoProgress(4) === 1`, `actTwoProgress(2) === 0`; `actOneSeg(3.7) === 3`; round trip `playheadFor((scrollTargetFor(P, top, H, vh, 22) − top) / (H − vh), 22) ≈ P` for `P` in `{−1.5, −0.5, 0, 1, 3, 3.1, 3.5, 4}` with `H = 12.5 · vh`; `volumeShotPlayhead(22) === 3 + 1/7`.

**Boundaries:** No pose, camera or title code in this task. Do not touch `easedSeg`, `segmentFor`, `frontIndexFor`, `cameraPose`, `cardPose`.

- [ ] Add the describe with the assertions above; `npx vitest run tests/unit/sceneMotion.test.ts` → red on the new block only
- [ ] Implement the scroll section; `npx vitest run tests/unit/sceneMotion.test.ts` → green, `npx vitest run tests/unit/sceneMotion.actOne.test.ts` → 6 snapshots match
- [ ] `git commit -am "feat(scene): act-two playhead, scroll budget and scroll targets"`

### Task 4: the frieze frame and the four beats

**Files:**
- `src/utils/sceneMotion.ts` — modify: add the act-two pose section, importing `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FriezeExtent` from `./friezeLayout`
- `tests/unit/sceneMotion.test.ts` — modify: add `FIXTURE_FRIEZE` and `describe('act two · pose')`; nothing outside this list

**Interfaces:**
- Consumes: Task 2's constants and types; Task 3's `actTwoBeats`.
- Produces: `VOLUME_FILL = 0.9`, `DOLLY_HEIGHT_FILL = 0.82`, `FRIEZE_CELL_MIN_PX`, `FriezeFrame`, `friezeFrame(frieze, g): FriezeFrame`, `volumeDistance(frieze, g): number`, `dollyDistance(frieze, g): number`, `dollyRange(frieze, g): { xStart: number; xEnd: number }`, `dollyEase(p, w): number` (verbatim above), `ActTwoPose { x; y; z; yaw; pitch }`, `actTwoPose(u, frieze, g): ActTwoPose`, `sceneFar(frieze, g): number`, `fogRangeAt(distance, g, t)`, `actTwoFogRange(u, frieze, g, t)`, `actTwoFocusDistance(u, frieze, g): number`, `actTwoTitleDistance(dWall, g): number`, `friezeHeightFill(frieze, g): number`, `maxRowsInFrame(g): number`.

**Work:** Exactly the "Frieze frame", "Camera path", and "Fog, far plane, focus, title distance" derivations. `fogRange` keeps its body; it becomes a one-line call to `fogRangeAt(g.D, g, t)` only if the result is bit-identical (it is, same expression), otherwise leave `fogRange` alone and duplicate the two lines in `fogRangeAt`. `CameraPose` is not modified; `ActTwoPose` is its own interface. Internal helper names are yours; the exported names are not.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` green with, on every fixture viewport and `FIXTURE_FRIEZE`: `actTwoPose(0)` equals `cameraPose(3, g)` in `x, y, z, pitch` to 9 places and `yaw === 0`; camera `z` at `beats.release` equals `frame.z + volumeDistance` and `y` equals `frame.centreY`; the whole frieze projects inside the frame at the volume shot (`projectPoint` of the four corners against a pitch-0 camera lands `fx, fy ∈ [0.05, 0.95]`); `x` is non-decreasing across `u ∈ [beats.approach, 1]` step `0.001`; `x` at `1` equals `xEnd` and at `beats.approach` equals `xStart`; `dollyEase(0) === 0`, `dollyEase(1) === 1`, monotone, and the numeric slope at `0.0005` and `0.9995` is under `0.05` of the middle slope; yaw is `0` at `beats.release` and at `beats.approach` and non-zero somewhere between on the desktop fixtures; cell width in CSS px at the dolly distance is `≥ 144` on every fixture; `friezeHeightFill ≤ 1` on every fixture; `maxRowsInFrame(g) === 8` at 1440×900 and at 393×851; `sceneFar ≥ volumeDistance + spacing`; `actTwoFogRange(0, …)` equals `fogRange(g, t)` to 9 places and `actTwoFogRange(beats.release, …).near > dWall`; `actTwoFocusDistance(0) === g.D`; `actTwoTitleDistance(dollyDistance, g) < dollyDistance` on every fixture. The act-one snapshot still matches.

**Boundaries:** No title-string or cursor code (Task 5). Do not edit `cameraPose`, `projectPoint`, `frameRects`.

- [ ] Add `FIXTURE_FRIEZE` and the describe; `npx vitest run tests/unit/sceneMotion.test.ts` → red on the new block only
- [ ] Implement frame, distances, `dollyEase`, `actTwoPose`; the pose assertions → green
- [ ] Implement `sceneFar`, `fogRangeAt`, `actTwoFogRange`, `actTwoFocusDistance`, `actTwoTitleDistance`, `friezeHeightFill`, `maxRowsInFrame`; all green; `npx vitest run` whole suite green
- [ ] `git commit -am "feat(scene): act-two frieze frame, camera beats, fog, far plane and focus"`

### Task 5: cursor, `blockAt`, title sequence, stills and column targets

**Files:**
- `src/utils/sceneMotion.ts` — modify: add the act-two title section
- `tests/unit/sceneMotion.test.ts` — modify: add `describe('act two · title and stills')`; nothing outside this list

**Interfaces:**
- Consumes: Tasks 3 and 4.
- Produces: `dollyCursor(u, frieze): number`, `blockAt(u, frieze): FriezeBlockExtent | null`, `blockIndexAt(u, frieze): number` (`−1` for none), `ActTwoTitle { from: number; to: number; frac: number }`, `actTwoTitle(u, frieze): ActTwoTitle`, `actTwoStillPose(u, frieze, g): ActTwoPose`, `playheadForColumn(col, frieze): number`, `playheadForBlock(k, frieze): number`.

**Work:** Exactly the "Reading cursor and title" and "Stills" derivations, and the two column targets from "Scroll seams". `actTwoTitle` indices are in act-two title space; the rig maps them to texture indices (`−1 → CARD_COUNT − 1`, `k → CARD_COUNT + k`). Windows are computed from the block list each call; no caching (a handful of blocks).

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` green with: `blockAt(u)` is `null` for `u < beats.approach` and, across `u ∈ [beats.approach, 1]` step `1e-4`, the sequence of distinct years is exactly `[2026, 2025, 2024, 2023]`; `actTwoTitle(0)` is `{ −1, 0, 0 }`, `actTwoTitle(beats.release)` is `{ −1, 0, 1 }` (frac 1 at the end of the release), `actTwoTitle(beats.approach)` is `{ 0, 0, 0 }` or `{ 0, 1, 0 }` (window start, frac 0); at every sampled `u` at most one window is active and `frac ∈ [0, 1]`; for each boundary there is a `u` where `frac ≈ 0.5`; around the one-column 2026 block the windows `[0, 0.5]` and `[0.5, 1.5]` touch and do not overlap; `actTwoStillPose` returns exactly 5 distinct poses across the sweep (volume shot plus four blocks), each block still's `x` equal to the block centre clamped to `dollyRange`; `playheadForBlock(k)` lands `blockAt` on block `k` and `playheadForColumn(0)` equals `actTwoPlayhead(beats.approach)`.

**Boundaries:** No React. Nothing in `tests/e2e`.

- [ ] Add the describe; run → red on the new block only
- [ ] Implement `dollyCursor`, `blockAt`, `blockIndexAt`, `actTwoTitle`; green
- [ ] Implement `actTwoStillPose`, `playheadForColumn`, `playheadForBlock`; green; whole unit suite green; snapshot matches
- [ ] `git commit -am "feat(scene): act-two reading cursor, title sequence, stills and column targets"`

### Task 6: wire the section · wrapper height from data, extent and strings into the scene

**Files:**
- `src/components/sections/Projects.tsx` — modify: extent, inline height, `data-svh`, `columns` in the click path, two new props down
- `src/components/canvas/SelectedWorkScene.tsx` — modify: `frieze` and `allWork` props, the extended `titles`, `sceneRefs` to `Environment`, `frieze` to `SceneRig`
- `src/components/canvas/scene/sceneRefs.ts` — modify: add `focus: { distance: number }`
- `src/index.css` — modify: delete `height: 550svh` and its four-line comment from `.scene-scroll`; nothing outside this list

**Interfaces:**
- Consumes: `provisionalFriezeExtent`, `FRIEZE_ROWS_LANDSCAPE`, `FriezeExtent` (Task 2); `sceneWrapperSvh`, `playheadFor`, `actOneSeg`, `scrollTargetFor` (Task 3); `archive` from `src/data/archive.ts`.
- Produces: `SelectedWorkSceneProps` gains `frieze: FriezeExtent` and `allWork: string`; `SceneRigProps` gains `frieze: FriezeExtent`; `EnvironmentProps` gains `sceneRefs: SceneRefs`; `.scene-scroll` carries `style={{ height: \`${svh}svh\` }}` and `data-svh={svh}`; `sceneRefs.focus`.

**Work:**
- `Projects.tsx`: `const frieze = useMemo(() => provisionalFriezeExtent(archive, FRIEZE_ROWS_LANDSCAPE), [])` (static in this pipeline; pipeline 2 keys rows on aspect). `const svh = sceneWrapperSvh(frieze.columns)`. In `cardClick`: `const playhead = playheadFor(scrollYProgress.get(), frieze.columns)`, `frontIndexFor(actOneSeg(playhead), …)`, and `scrollTargetFor(index, wrapperTop, wrapper.offsetHeight, window.innerHeight, frieze.columns)`. Pass `frieze={frieze}` and `allWork={t('sections.archive.title')}`. The comment on `cards` memoisation gains one line: `frieze` and `allWork` are the two other identities the scene sees, and both change only with data or language.
- `SelectedWorkScene.tsx`: `titles = useMemo(() => [...cards.map((c) => c.title), allWork, ...frieze.blocks.map((b) => String(b.year))], [cards, allWork, frieze])`. Corridor's `cards` identity is untouched, so `data-registrations` stays `1`.
- `sceneRefs.ts`: `focus: { distance: number }` initialised to `0` in `createSceneRefs`.
- `index.css`: the `.scene-scroll` rule keeps `position: relative` and `margin-top: 96px`; the height and its COUPLED comment go, replaced by one comment line: `height is inline, from sceneWrapperSvh(columns) in Projects.tsx`.

**Acceptance check:** `npx tsc -b` clean and `npm run lint` clean; `grep -n '550svh' src/index.css` prints nothing; in the running dev server `document.querySelector('#projects .scene-scroll').dataset.svh` reads `1350` (provisional data value) and `getComputedStyle(...).height` equals `13.5 · innerHeight` px; act one still scrubs (card 0 at playhead 0 via the Task 1 script's scroll formula). Existing scene e2e specs are expected RED at this point because their hardcoded fractions assume the 550 svh wrapper; Task 8 rewrites them.

**Boundaries:** `SceneRig.tsx`, `SceneTitle.tsx`, `Environment.tsx` are Task 7. No `Archive.tsx` change (pipeline 3 deletes it). No content-model change.

- [ ] `sceneRefs.ts` and `SelectedWorkScene.tsx` props and `titles`; `npx tsc -b` reports the missing props at the call site (expected red)
- [ ] `Projects.tsx` extent, inline height, `data-svh`, click path, props; `npx tsc -b` clean; `npm run lint` clean
- [ ] `index.css` height and comment removed; `grep -n '550svh' src/index.css` empty; dev server shows `data-svh="1350"`
- [ ] `git commit -am "feat(scene): wrapper height from the frieze extent; act-two strings into the scene"`

### Task 7: the frame loop, the title draw and the focus · act two on screen

**Files:**
- `src/components/canvas/scene/SceneRig.tsx` — modify: act-two camera, fog, focus, title indices, title distance, `data-act`, rotation order, far plane
- `src/components/canvas/scene/SceneTitle.tsx` — modify: two-phase draw so act-two strings never widen the plane
- `src/components/canvas/scene/Environment.tsx` — modify: DoF effect ref, per-frame focus from `sceneRefs.focus`; nothing outside this list

**Interfaces:**
- Consumes: everything Tasks 3 to 6 produce; `DepthOfFieldEffect` from `postprocessing` 6.39.4 (`cocMaterial.worldFocusDistance` has a runtime setter; the R3F `DepthOfField` forwards `ref: Ref<DepthOfFieldEffect>`).
- Produces: `data-act="1" | "2"` on `gl.domElement`.

**Work, `SceneRig.tsx`:**
- Geometry block: after `updateProjectionMatrix` also `camera.rotation.order = 'YXZ'`, and set `perspective.far = sceneFar(frieze, next)` instead of `next.far`. Add `frieze` to the geometry key (`${w}x${h}:${frieze.columns}x${frieze.rows}`) so a new extent re-derives the far plane.
- Per frame: `const playhead = playheadFor(progress.get(), frieze.columns)`, `const seg = actOneSeg(playhead)`, `const u = actTwoProgress(playhead)`, `const inActTwo = playhead > ACT_TWO_START`. Every existing act-one call keeps receiving `seg`; `overturePose`, `frontIndexFor`, `settledness`, `easedSeg`, `cardPose` are not otherwise touched.
- Camera: act one unchanged (`cameraPose(eased, g)`, `rotation.set(pitch, 0, 0)`). Act two: `pose = reducedMotion ? actTwoStillPose(u, frieze, g) : actTwoPose(u, frieze, g)`; `camera.position.set(pose.x, pose.y, pose.z)`; `camera.rotation.set(pose.pitch, pose.yaw, 0)`. `cam` (used for the hover lift's direction and the overture) stays the act-one `cameraPose(eased, g)` so those code paths are untouched.
- Fog: act one `fogRange(g, t)` as today; act two `actTwoFogRange(u, frieze, g, t)`. Reduced motion in act two: `actTwoFogRange` at the still's `u` is fine (the drift term is zero-mean and reduced motion renders on demand; if a visible drift appears between two demand frames, pass `t = 0` under reduced motion in act two only).
- Focus: every frame `sceneRefs.focus.distance = inActTwo ? actTwoFocusDistance(u, frieze, g) : focusDistance(g)`.
- `data-act`: `const act = inActTwo ? 2 : 1`, written like `data-slot` through a `lastAct` ref, only on change.
- `updateTitle`: replace `segmentFor(seg, n)` with `segmentFor(seg, CARD_COUNT)` and the reduced-motion `clamp(Math.round(seg), 0, n − 1)` with `CARD_COUNT − 1`; for `seg ≤ 3` both are identical to today. Add the act-two branch before the act-one one: reduced motion in act two → `indexA = indexB = blockIndexAt(u) < 0 ? CARD_COUNT : CARD_COUNT + 1 + blockIndexAt(u)`, `blend 0`, `seamFrac 0`, `presentA 1`, `presentB 0`; otherwise `const tt = actTwoTitle(u, frieze)`, `indexA = map(tt.from)`, `indexB = map(tt.to)`, `seamFrac = tt.from === tt.to ? 0 : tt.frac`, `blend = settleFrac(seamFrac)`, `presentA 1`, `presentB = tt.from === tt.to ? 0 : 1`, with `map = (i) => i < 0 ? CARD_COUNT − 1 : CARD_COUNT + i`. Guard `indexB < n` (textures may still be drawing after a language switch: fall back to `indexB = indexA`, `presentB 0`). Title distance: `const titleDistance = inActTwo ? actTwoTitleDistance(pose.z − frame.z, g) : g.titleDistance` and use it wherever `g.titleDistance` is read in `updateTitle` (`worldPerPx`, `visibleH`, `visibleW`, the `addScaledVector`); `frame = friezeFrame(frieze, g)` may be cached with the geometry.
- The DEV handle: if Task 1 added `camera` to `__scene`, keep it.

**Work, `SceneTitle.tsx`:** in `draw()`, rasterise in two phases: first `latestTitles.current.slice(0, CARD_COUNT)` at `maxLinePx` as today; then, from those results, `const actOneInkPx = Math.max(...actOne.map((d) => d.widthPx)) − 2 · TITLE_PAD_RATIO · fontPx` and draw the rest at `maxLinePx: Math.min(maxLinePx, actOneInkPx)`. Export `PAD_RATIO` from `titleTexture.ts` as `TITLE_PAD_RATIO` (rename in place; one file). Concatenate in original order; the disposal, generation and metrics code is unchanged. A comment states the invariant: an act-two texture is never wider than the widest act-one texture and never taller than the tallest, so `planeW`, `planeH` and the band fit are exactly what act one computed alone.

**Work, `Environment.tsx`:** `EnvironmentProps` gains `sceneRefs: SceneRefs`. `<DepthOfField ref={dofRef} …>` with `const dofRef = useRef<DepthOfFieldEffect | null>(null)`; a `useFrame` (priority before `COMPOSER_PRIORITY`) does `const e = dofRef.current; if (e && e.cocMaterial.worldFocusDistance !== sceneRefs.focus.distance) e.cocMaterial.worldFocusDistance = sceneRefs.focus.distance`. The `worldFocusDistance={focusDistance(g)}` prop stays as the mount value. If the installed typings do not expose `cocMaterial.worldFocusDistance`, stop and report `blocked: DoF focus setter not typed in postprocessing 6.39.4`; do not cast through `any`.

**Acceptance check:** `npx tsc -b` and `npm run lint` clean. On the dev server at 1440×900: scrolling to `top + 4.5·innerHeight + 0.5·(offsetHeight − 5.5·innerHeight)` (mid act two) gives `canvas.dataset.act === '2'` and `dataset.slot === '3'`, the camera sits in front of the wall (`__scene` camera `z` between `frame.z` and `frame.z + volumeDistance`), the console is clean; at playhead 0, `dataset.act === '1'`. Then `node scripts/scene-title-identity.mjs docs/superpowers/plans/evidence/2026-09-08-title-identity.after.json` and `diff docs/superpowers/plans/evidence/2026-09-08-title-identity.before.json docs/superpowers/plans/evidence/2026-09-08-title-identity.after.json` prints nothing except, if any, the `camera` array's 7th entry (`far`) and only that. Under `prefers-reduced-motion` (Chromium flag or DevTools emulation) act two shows the volume shot then per-block stills and `dataset.act` flips the same way. `npx vitest run` green, snapshot matches.

**Boundaries:** `Corridor.tsx`, `Overture.tsx`, `Caption.tsx`, `textTexture.ts` untouched. No wall rendering (pipeline 2). No new DOM.

- [ ] `SceneRig.tsx`: playhead split, camera, fog, focus, `data-act`, rotation order, far plane; `npx tsc -b` clean; dev server scrub to mid act two shows `data-act="2"`, console clean
- [ ] `SceneRig.tsx` `updateTitle`: `CARD_COUNT` in the act-one calls, the act-two branch, the title distance; dev server shows `all work` after the release and the years across the dolly
- [ ] `SceneTitle.tsx` two-phase draw and `TITLE_PAD_RATIO`; `titleTexture.ts` export rename; `npx tsc -b` clean
- [ ] `Environment.tsx` focus ref; `npx tsc -b` and `npm run lint` clean
- [ ] Run the identity script to `after.json`; `diff before.json after.json` → empty (or `far` only); paste the diff output into the commit body
- [ ] `git add -A src/components/canvas docs/superpowers/plans/evidence && git commit -m "feat(scene): act two in the frame loop; title carries all work and the years; data-act"`

### Task 8: e2e · a shared scene helper, the rewritten specs and the act-two scrub

**Files:**
- `tests/e2e/helpers/scene.ts` — create: `openScene`, `scrollToPlayhead`, `scrollToActTwo`, `readSvh`
- `tests/e2e/scene-scrub.spec.ts` — modify: use the helper, extend through act two
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: use the helper, add the act-two stills assertions
- `tests/e2e/scene-effects.spec.ts` — modify: replace the `0.3333` scroll with `scrollToPlayhead(page, 0)`
- `tests/e2e/nav-on-light.spec.ts` — modify: replace `scrollToSceneFraction(page, 0.3333)` with `scrollToPlayhead(page, 0)` and fix the comment; nothing outside this list

**Interfaces:**
- Consumes: `data-svh` on `.scene-scroll` (Task 6), `data-act` (Task 7), `ACT_ONE_SVH`, `sceneWrapperSvh` only for comments (helpers read the DOM).
- Produces: `scrollToPlayhead(page, playhead)` scrolls to `top + (playhead + 1.5) · unit`, `unit = wrapper.offsetHeight / Number(wrapper.dataset.svh)` (exact, DOM-derived, no `innerHeight` assumption); `scrollToActTwo(page, u)` scrolls to `top + 4.5 · unit + u · (wrapper.offsetHeight − unit − 4.5 · unit)`. Both wait 160 ms (220 ms under reduced motion, pass a `settle` option).

**Work:** `testDir` is `tests/e2e` with the default `*.spec.ts` match, so `helpers/scene.ts` is not collected. Move the existing `openScene` and `CANVAS` into the helper and import them in `scene-scrub`. Rewrite every fraction-based scroll as a playhead: `0 → −1.5`, `0.2222 → −0.5`, `0.23 → −0.47`, `0.3333 → 0`, `0.4444 → 0.5`, `0.5556 → 1`, `0.6667 → 1.5`, `0.7778 → 2`, `0.8889 → 2.5`, `1 → 3`, `0.4/0.5/0.62/0.72/0.84 → 0.3/0.75/1.29/1.74/2.28`, `0.44 → 0.48`; `SWEEP` becomes playheads with the same meaning. The scene-scrub console test additionally sweeps act two: `u` in `[0, 0.05, 1/7, 0.18, 3/14, 0.3, 0.5, 0.75, 0.95, 1, 0.5]` (the beat boundaries at 22 columns are `1/7` and `3/14`; the shipped extent has more columns, so also include `0.1` and `0.25`), then back to playhead `0`, asserting zero problems after every stop, and repeats the act-two stops at the short and near-square viewports already in the test. New test in `scene-scrub`: `data-act` reads `1` at playheads `−1.5`, `0`, `3` and `2` at `u` `0.05`, `0.5`, `1`, and `data-slot` stays `3` throughout act two; `data-registrations` stays `1` after the full act-one plus act-two sweep (extend the existing registrations test). `scene-reduced-motion`: after the existing assertions, `scrollToActTwo(page, 0.5)` → `data-act="2"`, `data-static="true"`, `data-slot="3"`, console clean; `scrollToPlayhead(page, 0)` → `data-act="1"`. `scene-effects` keeps its spoofed-renderer scrub and adds one stop at `scrollToActTwo(page, 0.5)` with the console still clean (this is the only headless path that runs the composer and the focus write).

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/scene-effects.spec.ts tests/e2e/nav-on-light.spec.ts tests/e2e/scene-no-webgl.spec.ts` green on both projects (`desktop-chromium`, `mobile-chromium`). Before Task 6 the same command was red on the fraction assumptions; after Task 8 it is green.

**Boundaries:** `light-chapter.spec.ts`, `section-enters.spec.ts`, `reduced-motion.spec.ts`, `perf-budget.spec.ts`, `pixel-gate.spec.ts` are not touched (their `#archive` expectations are pipeline 3's). No source change; if a spec can only pass with a source change, stop and report `blocked: <what the scrub exposed>`.

- [ ] Create `tests/e2e/helpers/scene.ts`; rewrite `scene-scrub.spec.ts` on playheads; `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/scene-scrub.spec.ts` → green (act one)
- [ ] Extend `scene-scrub.spec.ts` with the act-two sweep, `data-act` and the registrations sweep; run → green
- [ ] `scene-reduced-motion.spec.ts`, `scene-effects.spec.ts`, `nav-on-light.spec.ts` on the helper plus the act-two stops; run the five-spec command → green on both projects
- [ ] `git add -A tests/e2e && git commit -m "test(e2e): scene specs scroll by playhead; act-two scrub, data-act and reduced-motion stills"`

### Task 9: the verification set and the PR

**Files:**
- none created; this task runs commands and opens the PR

**Work:** The full set, in order, each pasted into the PR body: `npx tsc -b`, `npm run lint`, `npx vitest run` (the act-one snapshot and every pre-existing `sceneMotion` test included), `lsof -ti:4173 | xargs -r kill -9; npx playwright test` (whole suite, both projects; the `#archive` specs still pass because `Archive.tsx` is untouched on this branch), and the identity diff from Task 7. Then `git push -u origin feat/act-two-motion` and `gh pr create --base feat/act-two --title "feat(scene): act two motion · playhead, beats, wrapper height, title sequence" --body-file <body>`, the body listing: what changed by file, the numbered Assumptions of this plan, the manual pass for Kevin (below), which parts were verified by command, and the standard trailer. Stop after the PR; the three-leg review is Kevin's to trigger.

**Manual pass for Kevin (in the PR body, verbatim):**
1. Dev server, 1440×900. Scroll to card four settled. Keep scrolling: the camera pulls back and up over one viewport, card four recedes, the wall emerges from the cream one spacing behind it, and the title morphs from the project name to `all work` with the same gooey seam. It should not lurch at the start.
2. Half a viewport more: the camera moves in and left; the newest block reaches the left frame edge; `all work` holds.
3. Continue: the camera travels right at a steady pace; the title morphs to `2026`, `2025`, `2024`, `2023` at the block boundaries. The last quarter-viewport eases to a stop; the pin releases into Work Experience.
4. Scroll back up through all of it: every frame is the reverse of the way down.
5. Switch to PT; repeat 1 with `todos os trabalhos`. The act-one titles must not change size between EN and PT, nor before and after this branch.
6. 393×851 (device toolbar): the same four beats; the wall is tall in frame, about three columns visible; the title stays above the wall, never behind it.
7. `prefers-reduced-motion: reduce`: card four, then the volume shot, then one still per year; the title switches without a seam.

**Acceptance check:** all five commands green in one session; PR URL printed by `gh pr create`.

**Boundaries:** Nothing merges. No `ALLOW_MAIN_MERGE`. No spec box.

- [ ] `npx tsc -b && npm run lint` clean
- [ ] `npx vitest run` green; `npx vitest run tests/unit/sceneMotion.actOne.test.ts` reports snapshots matched, none written
- [ ] `lsof -ti:4173 | xargs -r kill -9; npx playwright test` green on both projects
- [ ] `git push -u origin feat/act-two-motion`; `gh pr create --base feat/act-two …`; stop

### Task 10: architecture note for act two

**Files:**
- `docs/architecture.md` — modify: the Selected Work scene section and its index row; nothing outside this list

**Work:** Present tense, current truth, rewritten not appended. Index row for Selected Work adds `src/utils/friezeLayout.ts`. "Anatomy": `div.scene-scroll` height is inline from `sceneWrapperSvh(columns)` and carries `data-svh`; the 550 svh literal is gone. "Corridor and playhead": the playhead is piecewise, `[−1.5, 3]` in card units for act one and `[3, 4]` normalised for act two, `playheadFor(p, columns)`; settled card `k` sits at scrub `(k + 1.5) · 100` svh, which is no longer a fixed fraction of the wrapper. New subsection "Act two" under the scene: the frieze frame (centred on the axis, one spacing beyond card four, bottom at `HOVER`), the four beats with their svh and the distances (`volumeDistance`, `dollyDistance`, the 144 px cell floor and why it is half of `CARD_MIN_PX`), `dollyEase`, the reading cursor and the title windows, stills under reduced motion, fog and far plane and DoF focus in act two, the title distance rule, `data-act`, the scroll seams (`scrollTargetFor(playhead, …, columns)`, `playheadForColumn`, `volumeShotPlayhead`) and which pipeline calls each, the two-phase title draw and the invariant it protects, and the `maxRowsInFrame` bound pipeline 2 must respect. "Fallback and data attributes": add `data-act` and `data-svh`. Do not write the wall or the stream sections; those are pipelines 2 and 3.

**Acceptance check:** `grep -n '550svh' docs/architecture.md` prints nothing; `grep -n 'data-act\|sceneWrapperSvh\|dollyEase\|maxRowsInFrame' docs/architecture.md` each print at least one line; `npm run lint` unaffected.

**Boundaries:** `CONTEXT.md` already carries the act-two terms from the spec commit; do not edit it. No ADR.

- [ ] Edit the index row, Anatomy, Corridor and playhead, Fallback and data attributes
- [ ] Write the "Act two" subsection
- [ ] `git commit -am "docs(architecture): act two of the Selected Work scene" && git push`

---

## Self-grilling

Kevin was not available; the frontier was worked in one pass, each question with its options and the recommended answer, then adopted. The adopted answers are the numbered Assumptions below.

❓ **Q1 · Playhead unit past card four.** (a) Keep one unit per 100 svh and let the playhead run to `3 + actTwoSvh/100`, with `actTwoProgress(playhead, columns)`; (b) a second, normalised unit so act two is `[3, 4]` and `actTwoProgress(playhead)` needs no extent; (c) rescale the whole playhead to `[0, 1]`. ➡️ (b): it keeps the spec's one-argument `actTwoProgress`, leaves `PLAYHEAD_SPAN` alone, and act-one poses are literally the old functions on `min(playhead, 3)`.

❓ **Q2 · Signature of `playheadFor` and `scrollTargetFor`.** (a) New functions beside the old; (b) a trailing `columns = 0` parameter meaning "no act two"; (c) break the signature and edit the tests. ➡️ (b): existing tests stay byte-identical, `columns = 0` reads as "no frieze", and one function owns the mapping.

❓ **Q3 · Where the wall stands.** (a) At the corridor's end, facing the camera, centred on the axis; (b) alongside the corridor, requiring a 90° yaw; (c) centred on the newest block. ➡️ (a): the dolly is then lateral as the spec says, the release is a pure pull-back and rise, and "yaws to face the corridor's end" is satisfied with yaw 0 during the release; the yaw the spec names appears in the approach, where the eye leads the body toward the newest block.

❓ **Q4 · Wall depth and height.** (a) One spacing beyond card four, bottom at `HOVER`; (b) at card four's plane; (c) at a fixed world z. ➡️ (a): it is where a fifth card would stand, card four recedes in front of it during the release, and the embedded cards share the cards' floor gap.

❓ **Q5 · Camera pose model.** (a) Explicit position plus yaw and pitch per beat; (b) a look-at target the pose derives from; (c) spline through keyframes. ➡️ (a) for position and pitch, with a look-at only for the approach yaw, because the release must equal `cameraPose(3)` exactly at `u = 0` and a look-at cannot promise that.

❓ **Q6 · Easing at beat boundaries.** (a) `smoothstep` per beat, zero velocity at each boundary; (b) `settleFrac` plateaus like act one; (c) one global curve. ➡️ (a): plateaus would add dead scroll the spec did not budget; zero velocity at both ends already gives a rest without a hold.

❓ **Q7 · What "legible" means numerically.** (a) A cell floor of `ceil(CARD_MIN_PX / 2) = 144` px; (b) a title-em floor owned by pipeline 2; (c) no floor, height-fit only. ➡️ (a): an embedded 2×2 card is then never narrower than the caption law already allows, and pipeline 2 sizes cell type so 12 px holds at 144 px.

❓ **Q8 · Dolly distance.** (a) Height fit alone; (b) the legibility floor alone; (c) `min(height fit at 0.82, legibility)`. ➡️ (c): the floor binds on every fixture today and the height term is the ceiling that keeps the wall inside the frame.

❓ **Q9 · Volume shot framing.** (a) Width fit at 0.9; (b) both axes at 0.9, binding axis wins; (c) fit plus a fixed pull-back. ➡️ (b): "the whole frieze enters frame" on any aspect.

❓ **Q10 · Dolly speed and exit.** (a) Camera x linear in the cursor, hard-clamped at the frieze edges; (b) a trapezoid velocity profile over the reachable range, ramping one column at each end; (c) smoothstep over the whole dolly. ➡️ (b): constant speed in the middle, the exit slows to rest inside the last column with no scroll added, C1 everywhere.

❓ **Q11 · Which year the title names.** (a) The block at the frame's centre; (b) the block under a reading cursor that sweeps every column at 25 svh each; (c) the block the camera x is over. ➡️ (b): only the cursor visits every block, so `blockAt` yields each year once in order as the acceptance demands, including a one-column block.

❓ **Q12 · Morph windows.** (a) A fixed column on each side of a boundary; (b) half-widths clipped to half the neighbouring block; (c) morph across the whole block. ➡️ (b): windows never overlap around a narrow block, and every boundary has one.

❓ **Q13 · Feeding the title without touching `segmentFor`.** (a) Pass `CARD_COUNT` instead of `textures.length` to the act-one calls and add an act-two branch that maps `actTwoTitle` indices onto the extended texture list; (b) a second title object; (c) rewrite `segmentFor`. ➡️ (a): `segmentFor` is untouched and act one's arguments are what they were.

❓ **Q14 · Keeping act-one title size when the texture list grows.** (a) Draw all strings alike and hope; (b) two-phase draw: act-two strings wrapped to the widest act-one ink width; (c) per-act plane metrics with a redraw at the act boundary. ➡️ (b): the rasteriser's padding is fixed, so an act-two texture can never widen the plane nor stand taller, and there is no redraw thrash when scrubbing across the boundary; the identity dump proves it on today's data.

❓ **Q15 · `data-act` without React state.** (a) Written by the rig on change, like `data-slot`; (b) a React attribute; (c) a CSS class. ➡️ (a).

❓ **Q16 · Reduced-motion stills.** (a) Volume shot for release and approach, then one still per block at the block's centre column; (b) one still per beat; (c) the same path sampled coarsely. ➡️ (a): it is the spec's list, and each still is a pose the live path also visits.

❓ **Q17 · How the wrapper height reaches the DOM.** (a) Inline `style.height` in svh from `sceneWrapperSvh(columns)` plus `data-svh`; (b) a CSS custom property; (c) keep a literal and a test that it matches. ➡️ (a): the e2e derives the playhead unit from `offsetHeight / data-svh` and needs no `innerHeight` assumption.

❓ **Q18 · Aspect change mid-act.** (a) Recompute geometry and the far plane on the size key; the playhead is unchanged in this pipeline because rows are static; (b) freeze the extent per session; (c) animate the change. ➡️ (a): every pose is pure in `g`, so a resize is a re-layout like it is in act one; pipeline 2's aspect-keyed rows will change the wrapper height on orientation change, which is a jump it must own.

❓ **Q19 · Fog, far plane and DoF in act two.** (a) Leave them; (b) blend fog to the wall distance across the release, extend the far plane once per geometry, write the DoF focus per frame through `sceneRefs`; (c) disable fog in act two. ➡️ (b): with act-one values the wall is fully dissolved at 12 units and outside the frustum on a phone; the blend keeps `u = 0` identical to act one.

❓ **Q20 · Title occlusion by the wall.** (a) `min(titleDistance, 0.8 · wallDistance)`; (b) draw the title without depth test; (c) move the wall. ➡️ (a): pixel size is distance-invariant so the switch is invisible, and the title keeps its depth test against the cards.

❓ **Q21 · `scrollTargetFor(itemId)`.** (a) Column-based seams in motion (`playheadForColumn`), item lookup with the cells; (b) motion imports the cells; (c) a registry of item positions. ➡️ (a): `sceneMotion` stays pure and independent of the content model.

❓ **Q22 · The frieze stub.** (a) Pipeline 1 creates `friezeLayout.ts` with constants, types and a provisional count-based extent; (b) hardcode the fixture in `Projects.tsx`; (c) wait for pipeline 2. ➡️ (a): the branch runs on its own, the wrapper height is already a function of the data, and pipeline 2 replaces one deprecated function.

❓ **Q23 · Proof that act one is pixel-identical.** (a) The existing tests; (b) a committed pose snapshot across six viewports plus a dev-server dump of camera, title scale and title metrics before and after; (c) a pixel-gate screenshot. ➡️ (b): poses and title size are what could move; the composer is headless-invisible so a screenshot proves less than the numbers.

## Assumptions

1. Act two is a second, normalised playhead unit: `playheadFor(progress, columns)` returns `[−1.5, 3]` in card units for act one and `[3, 4]` for act two; `PLAYHEAD_SPAN`, `MAX_SEG` and `CARD_COUNT` do not change, and `actTwoProgress(playhead) = clamp(playhead − 3, 0, 1)`.
2. `playheadFor` and `scrollTargetFor` gain a trailing `columns = 0` parameter; `0` means no act two and reproduces today's functions byte for byte; `actTwoSvh(0) = 0`.
3. The frieze stands at the corridor's end facing the camera, centred on the corridor axis (`centreX = 0`), one spacing beyond card four (`z = −4 · spacing`), bottom edge at `HOVER`.
4. Release: position and pitch `smoothstep` from `cameraPose(3, g)` to the volume shot, yaw 0; the pose at `u = 0` equals `cameraPose(3, g)` exactly. Approach: `smoothstep` to the dolly start with a leading look target (`1.5×`) that produces the beat's yaw. Dolly: `dollyEase` trapezoid profile, one column ramp at each end, yaw and pitch 0. No plateaus inside act two.
5. Legibility is a cell floor of `FRIEZE_CELL_MIN_PX = ceil(CARD_MIN_PX / 2) = 144` CSS px; pipeline 2 sizes cell type so 12 px holds at 144 px. `dollyDistance = min(H / (2·tan·0.82), legibility distance)`; `volumeDistance` fits both axes at 0.9.
6. The camera's dolly range is `[left + halfVisible, right − halfVisible]` clamped to the centre when the frieze is narrower than the frame; the reading cursor sweeps all `columns` at 25 svh each regardless of the camera's clamp.
7. Title morph windows sit on block boundaries with half-widths `min(0.5, neighbour / 2)` columns, applied through `seamFor`'s `settleFrac`; the release morph runs over the whole release beat; `blockAt` is `null` before the dolly.
8. The title texture list is `[card 0..3, all work, year per block]`; the rig passes `CARD_COUNT` to the act-one `segmentFor` call; act-two strings are drawn in a second phase wrapped to the widest act-one ink width, so act-one plane size and band fit are unchanged.
9. `data-act` is written imperatively on the canvas element on change; `1` for `playhead ≤ 3`, `2` past it. `data-svh` on `.scene-scroll` carries `sceneWrapperSvh(columns)` for the e2e helper.
10. Reduced motion: the volume shot for `u < uA`, then one still per block at the block's centre column clamped to the dolly range; the title index switches on `blockAt` without a seam.
11. The wrapper height is an inline style in svh from `sceneWrapperSvh(columns)`; the CSS literal and its comment are deleted; the extent in this pipeline is static (`FRIEZE_ROWS_LANDSCAPE` everywhere), so a resize never changes the wrapper height here.
12. Act two owns fog (blend from `fogRange(g, t)` to the wall distance across the release), the far plane (`max(g.far, volumeDistance + 2·spacing)`, set once per geometry/frieze key) and the DoF focus (`sceneRefs.focus.distance`, written per frame, consumed by `Environment` through a `DepthOfFieldEffect` ref). The far plane change alters depth precision only; DoF circle-of-confusion on desktop may differ by less than a depth-buffer quantum.
13. The title plane sits at `min(g.titleDistance, 0.8 · wallDistance)` in act two, invisible because its pixel size is distance-invariant.
14. The camera's Euler order becomes `'YXZ'`, set once; identical to today for yaw 0.
15. Item-to-camera seams are column-based (`playheadForColumn`, `playheadForBlock`, `volumeShotPlayhead`, `scrollTargetFor(playhead, …, columns)`); the `itemId → column` lookup lives with the cells, in pipelines 2 and 3.
16. Pipeline 1 creates `src/utils/friezeLayout.ts` with `FRIEZE_CELL_W = 0.5`, `FRIEZE_CELL_H = 448/620/2`, `FRIEZE_ROWS_LANDSCAPE = 8`, the `FriezeExtent` type above and a deprecated `provisionalFriezeExtent` (`ceil((count + 3 · caseStudies) / rows)` per year); pipeline 2 completes the file and may retune the cell constants.
17. The unit fixture is 22 columns, 8 rows, blocks `1/6/13/2`; the provisional runtime extent is 26 columns (1350 svh) until pipeline 2 lands.
18. Card four stays hoverable and pressable during act two (it is the settled card, `data-slot` stays `3`); cards 0 to 2 remain invisible because the act-one segment is clamped at 3.
19. Pixel identity is proven by a committed pose snapshot (six viewports, 91 playheads) and a before/after dev-server dump of camera, title scale, title z and the four act-one title metrics at six playheads; the only permitted difference is the camera's `far`.
20. `maxRowsInFrame(g)` is exported as the bound pipeline 2's portrait row count must respect (8 at 393×851 and at 1440×900); a taller frieze clips rows at the dolly distance because the cell floor binds first.

## Spec conflicts

1. **`sceneMotion.ts` must import `FRIEZE_CELL_W/H` from `friezeLayout.ts`, which pipeline 2 owns and which does not exist on the base, yet pipeline 1 merges first.** Resolution: pipeline 1 creates the file with constants, types and a provisional extent only (Assumption 16); pipeline 2 forks from this branch and completes it. The import direction rule holds.
2. **`scrollTargetFor(itemId)` cannot live in `sceneMotion.ts`**, which has no cells and must not import the content model. Resolution: column-based seams here, item lookup with the cells (Assumption 15).
3. **"Portrait gets a taller, shorter frieze" versus the legibility floor.** At the 144 px cell floor a 393×851 phone fits 8 rows in frame; more rows either clip at the dolly distance or break the floor, which is the scene's one law that may break frame-fit. Resolution: the floor binds; `friezeHeightFill` and `maxRowsInFrame` are exported; pipeline 2 chooses portrait rows inside the bound or records the clipping as its own decision.
4. **The acceptance line `sceneWrapperSvh(22) = 550 + 700` versus today's data.** Twenty-two columns is the fixture; the count-based provisional extent gives 26 (1350 svh) and pipeline 2's layout will give its own. The unit test asserts the function at 22; nothing asserts the shipped column count here.
5. **"`PLAYHEAD_SPAN` may change."** It does not need to; act two is a second unit (Assumption 1). Recorded so the review does not look for a change that is absent.
6. **"`data-act` reads 2 during act two and 1 before."** At exactly playhead 3 (card four settled, `u = 0`) it reads `1`; act two begins strictly after.
