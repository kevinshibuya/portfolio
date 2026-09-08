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

Also exported from the stub, in world units: `FRIEZE_CELL_W = CARD_W / 2` (`0.5`, so a 2×2 case study is exactly one `CARD_W`), `FRIEZE_CELL_H = CARD_H / 2` (`448 / 620 / 2`, about 0.361290, so a 2×2 span is exactly one scene card with no inset) and `FRIEZE_ROWS = 8`, eight rows in **both** orientations (amended decision 15; there is no portrait blend and no `FRIEZE_ROWS_LANDSCAPE`). The constants are written as `CARD_W / 2` and `CARD_H / 2`, not as decimal literals, so the half-card relation is structural. Pipeline 2 completes the module but does **not** retune them and does **not** replace `FriezeExtent`: it may only extend the type (`count` on a block, `width` and `height` on the extent) so that its `friezeExtent(layout, rows)` result stays assignable to the base type above. `maxRowsInFrame(g)` (below) stays exported as the bound any future row count must respect.

**Unit-test fixture** (`FIXTURE_FRIEZE`, in `tests/unit/sceneMotion.test.ts`): **fictional**, 22 columns, 8 rows, blocks `2026 @0 ×1`, `2025 @1 ×6`, `2024 @7 ×13`, `2023 @20 ×2`. Twenty-two columns is not today's data and never will be: it exists only to make the spec's worked `sceneWrapperSvh(22) = 1250` line exact and to give the pose tests a second, differently shaped extent. **The shipped count is 26**: the provisional extent from today's data (3/42/118/8 pieces, 3/3/3/0 case studies at 4 cells each, 8 rows) gives blocks `2/7/16/1 = 26` columns and `sceneWrapperSvh(26) = 1350` svh. Every test that must be true of the running site asserts against 26; every test of the function's shape may use 22. Pipeline 2's first-fit layout decides the final number and the wrapper follows it.

## Geometry of act two, derived

Notation: `tan = HALF_FOV_TAN`, `g = sceneGeometry(w, h)`, `S = actTwoSvh(columns)`.

**Scroll.** `actTwoSvh(columns) = 100 + 50 + 25·columns` for `columns ≥ 1`, and `0` for `columns ≤ 0` (no frieze, no act two). `sceneWrapperSvh(columns) = 550 + actTwoSvh(columns)`. The act-one scrub is 450 svh (`550 − 100`), one playhead unit per 100 svh, unchanged. Beats in `u`: release ends at `uR = 100 / S`, approach at `uA = 150 / S`. At the fictional 22-column fixture `uR = 1/7` and `uA = 3/14`; **at the shipped 26 columns `uR = 0.125` and `uA = 0.1875`**, and it is those an e2e file must sample, derived from `data-svh` rather than written down.

**Playhead.** `playheadFor(progress, columns = 0)`: `scrub = progress · (450 + actTwoSvh(columns))` svh. **If `columns ≤ 0`, return `clamp(progress · 4.5 − 1.5, −1.5, 3)` and stop** · without that guard `progress > 1` falls into the act-two branch and divides by `actTwoSvh(0) = 0`, returning `Infinity` or `NaN` where today's clamp returns `3`. Lenis overscroll and a rubber-band on iOS both produce `progress > 1`, and `columns = 0` is the documented "no frieze" call, so the guard is on the live path, not a theoretical one. Otherwise: if `scrub ≤ 450`, `−1.5 + scrub / 100` floored at `−1.5`; else `3 + (scrub − 450) / actTwoSvh(columns)` capped at `4`. With `columns = 0` the result is exactly today's `clamp(progress · 4.5 − 1.5, −1.5, 3)`. `actTwoProgress(playhead) = clamp(playhead − 3, 0, 1)`; `actOneSeg(playhead) = min(playhead, 3)`; `actTwoPlayhead(u) = 3 + clamp(u, 0, 1)`. `ACT_TWO_START = CARD_COUNT − 1` is exported; the private `MAX_SEG` and `PLAYHEAD_SPAN` do not change.

**Frieze frame** (`friezeFrame(frieze, g)`): width `W = columns · FRIEZE_CELL_W`, height `H = rows · FRIEZE_CELL_H`, centred on the corridor axis (`centreX = 0`), bottom edge at `HOVER` like the cards (`centreY = HOVER + H/2`), standing at `z = −(ACT_TWO_START + 1) · g.spacing`, one spacing beyond card four, facing the camera. Returns `{ left, right, bottom, top, z, width, height, centreX, centreY }`.

**Volume shot distance** `dVol = max(W / (2·tan·g.aspect·0.9), H / (2·tan·0.9))` (`VOLUME_FILL = 0.9`): the whole frieze fits the frame with a 5 % margin on the binding axis.

**Dolly distance** `dDolly = min(dHeight, dLegible)` with `dHeight = H / (2·tan·DOLLY_HEIGHT_FILL)`, `DOLLY_HEIGHT_FILL = 0.82`, and `dLegible = FRIEZE_CELL_W · g.widthPx / (2·tan·g.aspect·FRIEZE_CELL_MIN_PX)`, `FRIEZE_CELL_MIN_PX = ceil(CARD_MIN_PX / 2) = 144`: a cell is never narrower than 144 CSS px, so an embedded 2×2 card is never narrower than `CARD_MIN_PX` and its caption never drops under 12 px, the scene's existing legibility law.

**`DOLLY_HEIGHT_FILL` is a FLOOR on the fill, not a ceiling.** `min()` picks the *nearer* distance, and a nearer camera means a *fuller* frame, so `friezeHeightFill = H / (2·tan·dDolly)` can only be `≥ 0.82`; the legibility term is what pushes it higher. The measured values are `0.925` at 1440×900 and `0.978` at 393×851, so the constant reads "the wall never shrinks below 82 % of the frame height", and nothing in `min()` caps it. Asserting `friezeHeightFill ≤ 1` is therefore vacuous · it is true of any distance at all · and is replaced by the two real invariants: `friezeHeightFill ≥ DOLLY_HEIGHT_FILL` and `actTwoTopClearFrac(frieze, g)` at its measured value per fixture.

**The dolly camera is bottom-anchored, not wall-centred**, and that is the whole cap available: `dollyY(frieze, g) = frame.bottom + dDolly·tan`, which lands the wall's bottom edge on the frame's bottom edge and puts every pixel of spare frame height above the wall. `actTwoTopClearFrac(frieze, g) = 1 − friezeHeightFill` is then the air over the top row, `0.0751` (68 px of 900) at 1440×900 and `0.0218` (19 px of 851) at 393×851, against `0.0375` and `0.0109` for a centred camera. The volume shot stays centred (`centreY`); the approach lerps the camera from one to the other.

**That clearance does not reach the title band, and cannot.** The band act one proved runs from `(navPx + 16) / heightPx` (about `0.089` at 900 px) down to the settled card's top edge less the clearance (`0.333 − 0.012 = 0.321`); the title itself spans `0.168` to `0.312`. Clearing `0.321` would need `friezeHeightFill ≤ 0.679`, so `dDolly ≥ 6.75` at 1440×900, which puts a cell at 106 CSS px and breaks the 144 px floor · and at eight rows `maxRowsInFrame` is exactly 8 at both fixtures, so there is no row to give either. Eight rows, the 144 px cell floor and a reserved title band are mutually infeasible; the spec's amended decision 15 fixes the first two, so the third is what yields. **Recorded as Spec conflict 7 and Assumption 23: in act two the title reads OVER the wall's top row, and `actTwoTopClearFrac` is exported so pipeline 2 can inset the top row's cell ink by it.** The camera work here buys the largest clearance the constraint set allows and stops there; no motion trick recovers the rest.

Worked values at 1440×900, fixture extent: `D 2.302`, `spacing 2.647`, wall `z −10.590`, `dVol 12.114`, `dDolly 4.956` (cell 144 px wide, 104 px tall, ten columns visible), fill `0.925`, camera rises from `camY 0.947` to `centreY 1.590` at the volume shot and settles at `dollyY 1.707`, pulling back 7.2 units from the card-four slot. At 393×851: `dVol 41.97`, `dDolly 4.687`, fill `0.978`, `dollyY 1.622`, 2.7 columns visible.

**Camera path** (`actTwoPose(u, frieze, g) → { x, y, z, yaw, pitch }`):
- `P_slot = cameraPose(ACT_TWO_START, g)` with pitch `CAM_PITCH_DEG` and yaw 0; `P_vol = (0, centreY, z + dVol)`, pitch 0, yaw 0; `P_dolly(x) = (x, dollyY, z + dDolly)`, pitch 0, yaw 0.
- `halfVisible = dDolly · tan · g.aspect`; `xStart = min(left + halfVisible, 0)`, `xEnd = max(right − halfVisible, 0)`. **The clamps are `min` and `max`, in that order, and the draft's `max`/`min` were inverted.** With the frieze centred on the axis, `left = −W/2` and `right = +W/2`, so on any frieze wider than the frame `left + halfVisible < 0 < right − halfVisible`: `max(left + halfVisible, 0)` and `min(right − halfVisible, 0)` both collapse to `0`, the dolly range is empty and the camera never moves for the whole beat · while every acceptance check in the draft (`x` non-decreasing, `x(1) === xEnd`, `x(approach) === xStart`) passes vacuously on `0 === 0`. With `min`/`max` the range is `[−3, 3]` at 22 columns and `[−4, 4]` at the shipped 26 on 1440×900, and `[−5.818, 5.818]` at 26 on 393×851. A frieze narrower than the frame gives `left + halfVisible > 0` and `right − halfVisible < 0`, both clamp to `0`, and the camera holds centre · which is the intended degenerate case, now reached by the same two lines. Task 4 asserts `xEnd − xStart > 0` on the desktop fixtures so an inversion can never pass again.
- Release `u ∈ [0, uR]`: `s = smoothstep(u / uR)`; position and pitch lerp `P_slot → P_vol`. Yaw is `0` throughout · see Assumption 21 · because the wall is centred on the corridor axis, so "yaws to face the corridor's end" is already satisfied by the act-one heading. At `u = 0` the pose equals `cameraPose(3, g)` exactly, with zero velocity at both ends, so the settle plateau of card four hands over without a lurch.
- **Card four dissolves across the release**: `actTwoCardFade(u, frieze) = 1 − smoothstep(clamp(u / uR, 0, 1))` with `uR = actTwoBeats(frieze.columns).release`, so it is `1` at `u = 0` and exactly `0` from `u = uR` on. The rig multiplies card 3's `cardPose` opacity by it and drops the mesh out of the render once it reaches `0`. Without it card four does not recede out of the way: at `u = uR` the act-one segment is clamped at `3`, so card four still sits at its settled slot, and the camera is now `dDolly` from the wall with the card between them · at 1440×900 it renders at its settled size directly in front of the wall, and on a 393×851 phone it fills the frame. The spec's amended acceptance ("card four is fully faded by the end of the release") is this function, and pipeline 2 depends on it: after the release the invisible corridor card must not intercept a pointer meant for a wall cell.
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

**Reading cursor and title.** The cursor is the scroll's column budget, not the camera: `dollyCursor(u, frieze) = columns · p` on `[0, columns]` during the dolly, linear in `p` while the camera's `x` follows `dollyEase(p)`. **The two therefore disagree near the ends of the dolly, and that is accepted behaviour** (Assumption 22): over the first and last column-share the camera ramps while the cursor runs at full speed, so a year can be named up to one column before the camera reaches its block · and around a one-column block the title's window and the camera's arrival differ by most. The alternative, driving the title from camera `x`, cannot name a block the camera's clamped range never reaches, which is exactly what the acceptance forbids ("`blockAt` returns each year exactly once"). The disagreement is bounded by one column's worth of scroll at each end and by nothing in the middle, where `dollyEase` is linear and the two coincide. `blockAt(u, frieze)` returns `null` for `u < uA` and otherwise the block whose column range contains `min(floor(cursor), columns − 1)`; across the dolly it yields each year exactly once, newest first. Title morphs happen inside windows around each block boundary `b_k = blocks[k].startCol`: half-widths `hl_k = min(0.5, blocks[k−1].columns / 2)` (0 for `k = 0`) and `hr_k = min(0.5, blocks[k].columns / 2)`, in columns, so windows never overlap even around a one-column block and every boundary has one. `actTwoTitle(u, frieze) → { from, to, frac }` in act-two title space (`−1` = act one's last card, `0` = `all work`, `1 + k` = block `k`): release gives `{ −1, 0, u / uR }`; approach `{ 0, 0, 0 }`; dolly: the active window if the cursor is inside one (`frac = (cursor − (b_k − hl_k)) / (hl_k + hr_k)`), else `{ 1 + k, 1 + k, 0 }` for the current block. `seamFor` applies `settleFrac`, so every window rests at both ends; the release window's plateau is what holds card four's name for the first 15 % of the release.

**Stills.** Reduced motion resolves the continuous `u` to **one discrete still descriptor**, and every channel · camera, fog, focus and title distance · is derived from that descriptor alone. Four channels each reading the live `u` is how a "still" acquires a slow drift that no test looks for: `actTwoFogRange` and `actTwoFocusDistance` are saturated past `uR` and so happen to be constant, but `actTwoTitleDistance` reads `pose.z − frame.z` and the pose is what the descriptor decides, so the coupling has to be explicit rather than incidental.

```ts
export interface ActTwoStill {
  /** −1 = the volume shot, else the block index. */
  index: number
  /** The single u every act-two function is evaluated at for this still. */
  u: number
  /** Camera x for this still. */
  x: number
}
export function actTwoStill(u: number, frieze: FriezeExtent, g: SceneGeometry): ActTwoStill
```

`index = blockIndexAt(u, frieze)`. For `index < 0` the still is the volume shot: `u = uR`, `x = 0`. For a block: `u = uA`, `x = clamp(blockCentreX, xStart, xEnd)` with `blockCentreX = left + (startCol + columns / 2) · FRIEZE_CELL_W`. `actTwoStillPose(still, frieze, g)` returns `actTwoPose(still.u, …)` with its `x` overwritten by `still.x`; the rig then calls `actTwoFogRange(still.u, frieze, g, 0)`, `actTwoFocusDistance(still.u, frieze, g)` and `actTwoTitleDistance(stillPose.z − frame.z, g)`. **The ambient time term is `0` under reduced motion in act two, unconditionally** · not "pass `t = 0` if a visible drift appears", which is a decision the executor cannot make from a plan. `u` is a plain number, so two calls inside one still interval return bit-identical values, and the test asserts that directly rather than trusting `data-static`. The reduced-motion title index is `still.index`; no seam.

**Fog, far plane, focus, title distance.** `fogRangeAt(distance, g, t)` generalises `fogRange` (`near = (distance + 0.15·spacing)·drift`, `far = (distance + 2.2·spacing)·drift`, `fogRange(g, t) ≡ fogRangeAt(g.D, g, t)`, body unchanged). `actTwoFogRange(u, frieze, g, t)` lerps `fogRange(g, t) → fogRangeAt(dWall, g, t)` on `smoothstep(u / uR)` and holds the wall value from `uR` on: at `u = 0` the wall stands at `D + spacing`, about 40 % dissolved like the next card down the corridor, and clears as the camera pulls back. `sceneFar(frieze, g) = max(g.far, dVol + 2·spacing)` is applied with the frustum on the geometry/frieze key, not per frame; the image of act one does not depend on the far plane. `actTwoFocusDistance(u, frieze, g)` lerps `g.D → dWall` on the same release ease and holds `dWall` after; the rig writes it to `sceneRefs.focus.distance` every frame (act one writes `g.D`). `actTwoTitleDistance(dWall, g) = min(g.titleDistance, 0.8·dWall)` keeps the title plane in front of the wall (at 393×851 `titleDistance` is 5.0 and `dDolly` 4.69); the title's pixel size is distance-invariant by construction (`worldPerPx` scales with the distance), so the switch is invisible.

**Scroll seams · and the boundary with the item contract.** Pipeline 1 exports **column** targets only, and they do not complete the item contract on their own; the amended spec splits it in two, and both halves are named here so plans 2 and 3 can cite this paragraph:

- **Pipeline 1 (this plan) exports:** `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns = 0)` · numeric first argument, never an item id · the exact inverse of `playheadFor` on both pieces, and today's function when `columns = 0`. `playheadForColumn(col, frieze) = actTwoPlayhead(uA + (1 − uA) · clamp(col / columns, 0, 1))` takes a continuous column coordinate (a cell gives `cell.col + cell.span / 2`). `playheadForBlock(k, frieze)` is the block's centre column through the same function. `volumeShotPlayhead(columns) = actTwoPlayhead(uR)` is what the `#archive` nav link lands on. `actTwoBeats(columns) → { release: uR, approach: uA }`. `data-svh` on `.scene-scroll` carries `sceneWrapperSvh(columns)`.
- **Pipeline 2 owns the item lookup:** `playheadForItem(itemId, layout, extent)` in a new pure `src/utils/friezeTargets.ts`, which imports both `friezeLayout.ts` and `sceneMotion.ts` and returns `playheadForColumn(cell.col + cell.span / 2, extent)`, or `null` for an unknown id.
- **Pipeline 3 composes the two:** stream focus and the wall click both call `playheadForItem`, then feed the number to `scrollTargetFor`; the nav link calls `volumeShotPlayhead`. Neither adds a string overload to `scrollTargetFor` and neither re-derives beat maths.

`sceneMotion.ts` stays pure and ignorant of the content model, which is why the split exists at all; it is not a deferral.

**Legibility bound for pipeline 2.** `friezeHeightFill(frieze, g) = H / (2·tan·dDolly)`, `actTwoTopClearFrac(frieze, g) = 1 − friezeHeightFill(frieze, g)`, and `maxRowsInFrame(g) = floor((FRIEZE_CELL_W / FRIEZE_CELL_H) · g.heightPx / FRIEZE_CELL_MIN_PX)`, which is 8 at 1440×900 (8.65 before the floor) and 8 at 393×851 (8.18). `FRIEZE_ROWS = 8` therefore sits exactly on the bound at both, with no slack: a ninth row clips at the dolly distance because the cell floor binds first, and there is no vertical camera travel in act two to recover it. `maxRowsInFrame` stays exported as the bound pipeline 2 validates against, and any viewport whose bound comes out below 8 is reported, not worked around.

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
- Produces: `FRIEZE_CELL_W`, `FRIEZE_CELL_H`, `FRIEZE_ROWS`, `FriezeBlockExtent`, `FriezeExtent` (exactly as in "Consumed frieze extent type" above), and `provisionalFriezeExtent(items: readonly ArchiveItem[], rows: number): FriezeExtent`.

**Work:** A header comment states that pipeline 2 owns and completes this file (`friezeLayout(items, rows)`, `friezeExtent(layout, rows)`, `Cell`, block textures), that it may **extend** `FriezeExtent` (a block's `count`, the extent's `width` and `height`) but never replace or re-shape it, that the cell constants are fixed by the spec and not pipeline 2's to retune, and that `sceneMotion.ts` imports from here, never the reverse. The constants are written as relations, not decimals: `export const FRIEZE_CELL_W = CARD_W / 2`, `export const FRIEZE_CELL_H = CARD_H / 2`, `export const FRIEZE_ROWS = 8` · eight rows in both orientations, amended decision 15, so there is no `FRIEZE_ROWS_LANDSCAPE` and no portrait constant to add later. `CARD_W` and `CARD_H` are re-declared here rather than imported, because the import direction forbids reading them from `sceneMotion.ts`; the test asserts the two pairs are equal so the duplication cannot drift. `provisionalFriezeExtent` groups items by `new Date(item.sortDate).getUTCFullYear()`, newest year first, counts `4` cells for `kind === 'featured'` and `1` otherwise, gives each block `ceil(cells / rows)` columns (minimum 1), and assigns contiguous `startCol`. It must not import from `sceneMotion.ts`. Years with zero items do not appear. Mark the function `@deprecated pipeline 2 replaces this with friezeLayout()` so the replacement is one search away.

**Acceptance check:** `npx vitest run tests/unit/friezeLayout.provisional.test.ts` red before (module missing), green after, asserting: `FRIEZE_CELL_W === CARD_W / 2` and `FRIEZE_CELL_H === CARD_H / 2` against the values imported from `sceneMotion.ts` in the test (the test may import both ways; the module may not), and `FRIEZE_ROWS === 8`; with a synthetic list of 3/42/118/8 items over 2026..2023 carrying 3/3/3/0 featured, `rows = 8` gives blocks `2/7/16/1`, `columns = 26`, `startCol` `0/2/9/25`, years newest first; and against the real `archive` the sum of block columns equals `columns` and every block has `columns ≥ 1`.

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

**Work:** Exactly the "Scroll" and "Playhead" derivations above, including the `columns ≤ 0` early return in `playheadFor` and `scrollTargetFor` that keeps `actTwoSvh(0) = 0` out of a divisor. `playheadFor` and `scrollTargetFor` keep their four-argument behaviour byte-identical when `columns` is omitted or `0`. Rename the existing `index` parameter of `scrollTargetFor` to `playhead` (the value was always a playhead; the JSDoc says so). Keep `MAX_SEG` and `PLAYHEAD_SPAN` private and unchanged; express `ACT_ONE_SVH` as `(PLAYHEAD_SPAN + 1) · 100` with a comment that it is the retired CSS literal.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` red on the new describe before, green after with every pre-existing test untouched. New assertions: `sceneWrapperSvh(26) === 1350` (the shipped count · this is the one the running site depends on), `sceneWrapperSvh(22) === 1250` (the fictional fixture), `actTwoSvh(0) === 0`, `sceneWrapperSvh(0) === 550`; the divide-by-zero guard, `playheadFor(1.4, 0) === 3` and `Number.isFinite(playheadFor(1.4, 0))`, and the same at `progress = 2`; `actTwoBeats(22)` equals `{ release: 1/7, approach: 3/14 }` to 12 places and `actTwoBeats(26)` equals `{ release: 0.125, approach: 0.1875 }`; `playheadFor(p, 22)` equals `playheadFor(p)` for every `p` in `[0, 0.36]` step `0.01` scaled so the act-one scrub is the same pixels (`p_22 = p · 450 / 1150`), i.e. `playheadFor(p · 450/1150, 22) ≈ playheadFor(p)`; `playheadFor(450/1150, 22) === 3`, `playheadFor(1, 22) === 4`, `playheadFor((450 + 350)/1150, 22) === 3.5`, and `playheadFor(p, 22)` is non-decreasing over `p ∈ [0, 1]` step `0.001`; `actTwoProgress(3) === 0`, `actTwoProgress(4) === 1`, `actTwoProgress(2) === 0`; `actOneSeg(3.7) === 3`; round trip `playheadFor((scrollTargetFor(P, top, H, vh, 22) − top) / (H − vh), 22) ≈ P` for `P` in `{−1.5, −0.5, 0, 1, 3, 3.1, 3.5, 4}` with `H = 12.5 · vh`; `volumeShotPlayhead(22) === 3 + 1/7`.

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
- Produces: `VOLUME_FILL = 0.9`, `DOLLY_HEIGHT_FILL = 0.82` (documented as the fill **floor**), `FRIEZE_CELL_MIN_PX`, `FriezeFrame`, `friezeFrame(frieze, g): FriezeFrame`, `volumeDistance(frieze, g): number`, `dollyDistance(frieze, g): number`, `dollyY(frieze, g): number`, `dollyRange(frieze, g): { xStart: number; xEnd: number }`, `dollyEase(p, w): number` (verbatim above), `actTwoCardFade(u: number, frieze: FriezeExtent): number`, `ActTwoPose { x; y; z; yaw; pitch }`, `actTwoPose(u, frieze, g): ActTwoPose`, `sceneFar(frieze, g): number`, `fogRangeAt(distance, g, t)`, `actTwoFogRange(u, frieze, g, t)`, `actTwoFocusDistance(u, frieze, g): number`, `actTwoTitleDistance(dWall, g): number`, `friezeHeightFill(frieze, g): number`, `actTwoTopClearFrac(frieze, g): number`, `maxRowsInFrame(g): number`. `actTwoCardFade` takes the extent because `uR` depends on `columns`.

**Work:** Exactly the "Frieze frame", "Camera path" (including the `min`/`max` clamp order in `dollyRange`, the bottom-anchored `dollyY` and `actTwoCardFade`), and "Fog, far plane, focus, title distance" derivations. `fogRange` keeps its body; it becomes a one-line call to `fogRangeAt(g.D, g, t)` only if the result is bit-identical (it is, same expression), otherwise leave `fogRange` alone and duplicate the two lines in `fogRangeAt`. `CameraPose` is not modified; `ActTwoPose` is its own interface. Internal helper names are yours; the exported names are not.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` green with, on every fixture viewport and `FIXTURE_FRIEZE`: `actTwoPose(0)` equals `cameraPose(3, g)` in `x, y, z, pitch` to 9 places and `yaw === 0`; camera `z` at `beats.release` equals `frame.z + volumeDistance` and `y` equals `frame.centreY`; the whole frieze projects inside the frame at the volume shot (`projectPoint` of the four corners against a pitch-0 camera lands `fx, fy ∈ [0.05, 0.95]`); **`xEnd − xStart > 0` on every desktop fixture and on the shipped 26-column extent** · this is the assertion the inverted clamp would have failed, and without it the three monotonicity checks below all pass on a camera that never moves; `x` is non-decreasing across `u ∈ [beats.approach, 1]` step `0.001`; `x` at `1` equals `xEnd` and at `beats.approach` equals `xStart`; `dollyRange` is `{ 0, 0 }` on a deliberately narrow fixture (2 columns at 1440×900) and `xStart < 0 < xEnd` on the wide ones; `dollyEase(0) === 0`, `dollyEase(1) === 1`, monotone, and the numeric slope at `0.0005` and `0.9995` is under `0.05` of the middle slope; yaw is `0` at `u = 0`, at `beats.release` and at `beats.approach`, and non-zero somewhere inside the approach on the desktop fixtures; `actTwoCardFade(0) === 1`, `actTwoCardFade(beats.release) === 0`, `actTwoCardFade(u) === 0` for every `u > beats.release`, and non-increasing across `[0, 1]` step `0.001`; cell width in CSS px at the dolly distance is `≥ 144` on every fixture; `friezeHeightFill ≥ DOLLY_HEIGHT_FILL` on every fixture (the real invariant · the draft's `≤ 1` is vacuous and goes), and `friezeHeightFill` and `actTwoTopClearFrac` match their derived values to 4 places at the two named fixtures (`0.9249 / 0.0751` at 1440×900, `0.9782 / 0.0218` at 393×851); the wall's bottom edge projects to `fy ≈ 1` at the dolly pose on every fixture (the bottom anchor); `maxRowsInFrame(g) === 8` at 1440×900 and at 393×851; `sceneFar ≥ volumeDistance + spacing`; `actTwoFogRange(0, …)` equals `fogRange(g, t)` to 9 places and `actTwoFogRange(beats.release, …).near > dWall`; `actTwoFocusDistance(0) === g.D`; `actTwoTitleDistance(dollyDistance, g) < dollyDistance` on every fixture. The act-one snapshot still matches.

**Boundaries:** No title-string or cursor code (Task 5). Do not edit `cameraPose`, `projectPoint`, `frameRects`.

- [ ] Add `FIXTURE_FRIEZE`, the shipped 26-column extent and the narrow 2-column extent, and the describe; `npx vitest run tests/unit/sceneMotion.test.ts` → red on the new block only
- [ ] Implement frame, distances, `dollyY`, `dollyRange`, `dollyEase`, `actTwoCardFade`, `actTwoPose`; the pose assertions → green, `xEnd − xStart > 0` included
- [ ] Implement `sceneFar`, `fogRangeAt`, `actTwoFogRange`, `actTwoFocusDistance`, `actTwoTitleDistance`, `friezeHeightFill`, `actTwoTopClearFrac`, `maxRowsInFrame`; all green; `npx vitest run` whole suite green
- [ ] `git add src/utils/sceneMotion.ts tests/unit/sceneMotion.test.ts && git commit -m "feat(scene): act-two frieze frame, camera beats, card-four fade, fog, far plane and focus"`

### Task 5: cursor, `blockAt`, title sequence, stills and column targets

**Files:**
- `src/utils/sceneMotion.ts` — modify: add the act-two title section
- `tests/unit/sceneMotion.test.ts` — modify: add `describe('act two · title and stills')`; nothing outside this list

**Interfaces:**
- Consumes: Tasks 3 and 4.
- Produces: `dollyCursor(u, frieze): number`, `blockAt(u, frieze): FriezeBlockExtent | null`, `blockIndexAt(u, frieze): number` (`−1` for none), `ActTwoTitle { from: number; to: number; frac: number }`, `actTwoTitle(u, frieze): ActTwoTitle`, `ActTwoStill { index: number; u: number; x: number }`, `actTwoStill(u, frieze, g): ActTwoStill`, `actTwoStillPose(still, frieze, g): ActTwoPose`, `playheadForColumn(col, frieze): number`, `playheadForBlock(k, frieze): number`, `volumeShotPlayhead` already from Task 3.

**Work:** Exactly the "Reading cursor and title" and "Stills" derivations, and the two column targets from "Scroll seams". `actTwoTitle` indices are in act-two title space; the rig maps them to texture indices (`−1 → CARD_COUNT − 1`, `k → CARD_COUNT + k`). Windows are computed from the block list each call; no caching (a handful of blocks). `actTwoStillPose` takes the **descriptor**, not a raw `u`, so a caller cannot accidentally sample a still off a live playhead. These are the **column** targets and they are the whole of pipeline 1's contribution to targeting: `playheadForItem(itemId, layout, extent)` belongs to pipeline 2's `src/utils/friezeTargets.ts` and is not written, stubbed or reserved here · see "Scroll seams" and Assumption 15.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` green with: `blockAt(u)` is `null` for `u < beats.approach` and, across `u ∈ [beats.approach, 1]` step `1e-4`, the sequence of distinct years is exactly `[2026, 2025, 2024, 2023]`; `actTwoTitle(0)` is `{ −1, 0, 0 }`, `actTwoTitle(beats.release)` is `{ −1, 0, 1 }` (frac 1 at the end of the release), `actTwoTitle(beats.approach)` is `{ 0, 0, 0 }` or `{ 0, 1, 0 }` (window start, frac 0); at every sampled `u` at most one window is active and `frac ∈ [0, 1]`; for each boundary there is a `u` where `frac ≈ 0.5`; around the one-column 2026 block the windows `[0, 0.5]` and `[0.5, 1.5]` touch and do not overlap; `actTwoStill` yields exactly 5 distinct descriptors across the sweep (volume shot plus four blocks), each block still's `x` equal to the block centre clamped to `dollyRange` and its `u` equal to `beats.approach`, the volume shot's `u` equal to `beats.release` and `x` equal to `0`; **within one still interval every derived output is bit-identical** · for each of the 5 intervals, sample 20 `u` values inside it and assert that `actTwoStillPose`, `actTwoFogRange(still.u, …, 0)`, `actTwoFocusDistance(still.u, …)` and `actTwoTitleDistance` are strictly equal (`===`, not `toBeCloseTo`) across all 20, and that varying the time argument `t` changes nothing because the rig passes `0`; `playheadForBlock(k)` lands `blockAt` on block `k` and `playheadForColumn(0)` equals `actTwoPlayhead(beats.approach)`.

**Boundaries:** No React. Nothing in `tests/e2e`. No `playheadForItem` and no item-shaped overload of anything (pipeline 2).

- [ ] Add the describe; run → red on the new block only
- [ ] Implement `dollyCursor`, `blockAt`, `blockIndexAt`, `actTwoTitle`; green
- [ ] Implement `ActTwoStill`, `actTwoStill`, `actTwoStillPose`, `playheadForColumn`, `playheadForBlock`; green, the per-interval identity assertions included; whole unit suite green; snapshot matches
- [ ] `git add src/utils/sceneMotion.ts tests/unit/sceneMotion.test.ts && git commit -m "feat(scene): act-two reading cursor, title sequence, still descriptors and column targets"`

### Task 6: wire the section · wrapper height from data, extent and strings into the scene

**Files:**
- `src/components/sections/Projects.tsx` — modify: extent, inline height, `data-svh`, `columns` in the click path, two new props down
- `src/components/canvas/SelectedWorkScene.tsx` — modify: `frieze` and `allWork` props, the extended `titles`, `frieze` to `SceneRig`
- `src/components/canvas/scene/SceneRig.tsx` — modify: **declare and consume** `frieze` on `SceneRigProps` (the playhead call only; the act-two frame loop is Task 7)
- `src/components/canvas/scene/sceneRefs.ts` — modify: add `focus: { distance: number }`
- `src/index.css` — modify: delete `height: 550svh` and its four-line comment from `.scene-scroll`; nothing outside this list

**Interfaces:**
- Consumes: `provisionalFriezeExtent`, `FRIEZE_ROWS`, `FriezeExtent` (Task 2); `sceneWrapperSvh`, `playheadFor`, `actOneSeg`, `scrollTargetFor` (Task 3); `archive` from `src/data/archive.ts`.
- Produces: `SelectedWorkSceneProps` gains `frieze: FriezeExtent` and `allWork: string`; `SceneRigProps` gains `frieze: FriezeExtent`; `.scene-scroll` carries `style={{ height: \`${svh}svh\` }}` and `data-svh={svh}`; `sceneRefs.focus`. `EnvironmentProps` is **not** touched here · see the compile boundary below.

**Compile boundary.** A prop cannot be passed one task and received the next: `<SceneRig frieze={frieze}>` against a `SceneRigProps` without `frieze` is a `tsc -b` error, and this task's acceptance demands a clean typecheck. So the receiving declaration lands here, together with the one use that makes it legal under `@typescript-eslint/no-unused-vars`: `SceneRig` destructures `frieze` and passes `frieze.columns` to `playheadFor`, which is act-one-identical below playhead 3 and is the call Task 7 extends anyway. `Environment` is the mirror case and is therefore left alone entirely: its `sceneRefs` prop has no legal use until Task 7 writes the focus, so **both** the declaration and the call site move to Task 7. `sceneRefs.focus` itself lands here because `createSceneRefs` initialising a field nothing reads yet compiles and lints clean.

**Work:**
- `Projects.tsx`: `const frieze = useMemo(() => provisionalFriezeExtent(archive, FRIEZE_ROWS), [])` (static: eight rows in both orientations, amended decision 15, so no aspect key here or in pipeline 2). `const svh = sceneWrapperSvh(frieze.columns)`. In `cardClick`: `const playhead = playheadFor(scrollYProgress.get(), frieze.columns)`, `frontIndexFor(actOneSeg(playhead), …)`, and `scrollTargetFor(index, wrapperTop, wrapper.offsetHeight, window.innerHeight, frieze.columns)`. Pass `frieze={frieze}` and `allWork={t('sections.archive.title')}`. The comment on `cards` memoisation gains one line: `frieze` and `allWork` are the two other identities the scene sees, and both change only with data or language.
- `SceneRig.tsx`: `SceneRigProps` gains `frieze: FriezeExtent`; the per-frame `playheadFor(progress.get())` becomes `actOneSeg(playheadFor(progress.get(), frieze.columns))`. The `actOneSeg` wrapper is not optional and not cosmetic: the wrapper is now 1350 svh, so without it the act-one code receives a segment up to `4` and the corridor scrubs a card past its slot the moment the reader enters act two. With it, every frame of this task is exactly today's frame · act one scrubs over the first 450 svh and holds card four settled for the rest, which is also what makes the Task 1 act-one check below meaningful. Task 7 splits the same expression into `seg` and `u`. Nothing else in this file changes in this task.
- `SelectedWorkScene.tsx`: `titles = useMemo(() => [...cards.map((c) => c.title), allWork, ...frieze.blocks.map((b) => String(b.year))], [cards, allWork, frieze])`. Corridor's `cards` identity is untouched, so `data-registrations` stays `1`.
- `sceneRefs.ts`: `focus: { distance: number }` initialised to `0` in `createSceneRefs`.
- `index.css`: the `.scene-scroll` rule keeps `position: relative` and `margin-top: 96px`; the height and its COUPLED comment go, replaced by one comment line: `height is inline, from sceneWrapperSvh(columns) in Projects.tsx`.

**Acceptance check:** `npx tsc -b` clean and `npm run lint` clean; `grep -n '550svh' src/index.css` prints nothing; in the running dev server `document.querySelector('#projects .scene-scroll').dataset.svh` reads `1350` (the shipped provisional value; `sceneWrapperSvh(26)`) and `getComputedStyle(...).height` equals `13.5 · innerHeight` px; act one still scrubs (card 0 at playhead 0 via the Task 1 script's scroll formula) and card four holds settled all the way to the wrapper's end. Existing scene e2e specs are expected RED at this point because their hardcoded fractions assume the 550 svh wrapper; Task 8 rewrites them.

**Boundaries:** `SceneTitle.tsx` and `Environment.tsx` are Task 7, and so is every act-two line of `SceneRig.tsx` beyond the props declaration and the one playhead call above. No `Archive.tsx` change (pipeline 2 deletes it). No content-model change.

- [ ] `sceneRefs.ts`, `SelectedWorkScene.tsx` props and `titles`, `SceneRigProps.frieze` and the `actOneSeg(playheadFor(…, frieze.columns))` call; `npx tsc -b` clean and `npm run lint` clean at the end of this step, not the next
- [ ] `Projects.tsx` extent, inline height, `data-svh`, click path, props; `npx tsc -b` clean; `npm run lint` clean
- [ ] `index.css` height and comment removed; `grep -n '550svh' src/index.css` empty; dev server shows `data-svh="1350"`
- [ ] `git add src/components/sections/Projects.tsx src/components/canvas/SelectedWorkScene.tsx src/components/canvas/scene/SceneRig.tsx src/components/canvas/scene/sceneRefs.ts src/index.css && git commit -m "feat(scene): wrapper height from the frieze extent; act-two strings into the scene"`

### Task 7: the frame loop, the title draw and the focus · act two on screen

**Files:**
- `src/components/canvas/scene/SceneRig.tsx` — modify: act-two camera, fog, focus, card-four fade, title indices, title-plane envelope, title distance, `data-act`, rotation order, far plane
- `src/components/canvas/scene/SceneTitle.tsx` — modify: two-phase draw so act-two strings never widen the plane
- `src/components/canvas/scene/titleTexture.ts` — modify: rename the module-private `PAD_RATIO` to an exported `TITLE_PAD_RATIO` (the two-phase draw needs it); no behaviour change
- `src/components/canvas/scene/Environment.tsx` — modify: `sceneRefs` prop, DoF effect ref, per-frame focus from `sceneRefs.focus`
- `src/components/canvas/SelectedWorkScene.tsx` — modify: one line, pass `sceneRefs` to `<Environment>`; nothing outside this list

**Interfaces:**
- Consumes: everything Tasks 3 to 6 produce; `DepthOfFieldEffect` from `postprocessing` 6.39.4 (`cocMaterial.worldFocusDistance` has a runtime setter; the R3F `DepthOfField` forwards `ref: Ref<DepthOfFieldEffect>`).
- Produces: `data-act="1" | "2"` on `gl.domElement`; `EnvironmentProps` gains `sceneRefs: SceneRefs` (deferred here from Task 6 so the declaration and its first use land together).

**Work, `SceneRig.tsx`:**
- Geometry block: after `updateProjectionMatrix` also `camera.rotation.order = 'YXZ'`, and set `perspective.far = sceneFar(frieze, next)` instead of `next.far`. Add `frieze` to the geometry key (`${w}x${h}:${frieze.columns}x${frieze.rows}`) so a new extent re-derives the far plane.
- Per frame: `const playhead = playheadFor(progress.get(), frieze.columns)`, `const seg = actOneSeg(playhead)`, `const u = actTwoProgress(playhead)`, `const inActTwo = playhead > ACT_TWO_START`. Every existing act-one call keeps receiving `seg`; `overturePose`, `frontIndexFor`, `settledness`, `easedSeg`, `cardPose` are not otherwise touched.
- **One descriptor under reduced motion.** In act two, resolve `const still = reducedMotion ? actTwoStill(u, frieze, g) : null` once, at the top, and let camera, fog, focus and title distance all read `still.u` (or `u` when `still` is `null`). No channel reads the live `u` while `still` is set; that is what makes a still still, and it is a single `const` rather than four independent decisions scattered down the function.
- Camera: act one unchanged (`cameraPose(eased, g)`, `rotation.set(pitch, 0, 0)`). Act two: `pose = still ? actTwoStillPose(still, frieze, g) : actTwoPose(u, frieze, g)`; `camera.position.set(pose.x, pose.y, pose.z)`; `camera.rotation.set(pose.pitch, pose.yaw, 0)`. `cam` (used for the hover lift's direction and the overture) stays the act-one `cameraPose(eased, g)` so those code paths are untouched.
- Fog: act one `fogRange(g, t)` as today; act two `actTwoFogRange(still ? still.u : u, frieze, g, reducedMotion ? 0 : t)`. **The ambient time term is `0` under reduced motion in act two unconditionally** · not conditionally, and not only if a drift is observed. Reduced motion renders on demand, so a drift between two demand frames is exactly the bug no one would see in a test run and every reader with the preference set would see on a resize.
- Card four: in act two, multiply card 3's `cardPose` opacity by `actTwoCardFade(still ? still.u : u, frieze)` · the still's `u` too, or a reduced-motion reader sits at the volume shot with a half-opaque card four floating in it · and set the mesh `visible = false` once the product reaches `0` so nothing raycasts against it. The volume-shot still is `u = uR`, where the fade is exactly `0`, so every reduced-motion still in act two has card four gone.
- Focus: every frame `sceneRefs.focus.distance = inActTwo ? actTwoFocusDistance(still ? still.u : u, frieze, g) : focusDistance(g)`.
- `data-act`: `const act = inActTwo ? 2 : 1`, written like `data-slot` through a `lastAct` ref, only on change.
- `updateTitle`: replace `segmentFor(seg, n)` with `segmentFor(seg, CARD_COUNT)` and the reduced-motion `clamp(Math.round(seg), 0, n − 1)` with `CARD_COUNT − 1`; for `seg ≤ 3` both are identical to today. Add the act-two branch before the act-one one: reduced motion in act two → `indexA = indexB = still.index < 0 ? CARD_COUNT : CARD_COUNT + 1 + still.index`, `blend 0`, `seamFrac 0`, `presentA 1`, `presentB 0` · read from the **descriptor**, not from a second `blockIndexAt(u)` call; otherwise `const tt = actTwoTitle(u, frieze)`, `indexA = map(tt.from)`, `indexB = map(tt.to)`, `seamFrac = tt.from === tt.to ? 0 : tt.frac`, `blend = settleFrac(seamFrac)`, `presentA 1`, `presentB = tt.from === tt.to ? 0 : 1`, with `map = (i) => i < 0 ? CARD_COUNT − 1 : CARD_COUNT + i`. Guard `indexB < n` (textures may still be drawing after a language switch: fall back to `indexB = indexA`, `presentB 0`). Title distance: `const titleDistance = inActTwo ? actTwoTitleDistance(pose.z − frame.z, g) : g.titleDistance` and use it wherever `g.titleDistance` is read in `updateTitle` (`worldPerPx`, `visibleH`, `visibleW`, the `addScaledVector`); `frame = friezeFrame(frieze, g)` may be cached with the geometry.
- **The title plane's envelope is act one's alone.** Today `planeW`, `maxAbove`, `maxBelow` and `tallest` are reduced over `i < n = textures.length`, and `titleTexture.ts` grows `canvas.height` with `lines.length` (`blockH = capPx + (lines.length − 1) · lineHeightPx`). So a single act-two string that wraps to one more line than the tallest act-one title raises `maxAbove`/`maxBelow`, moves `planeH` and `baseY`, and act one's title changes size and position · on data, not on code. Capping the act-two draw's `maxLinePx` (below) narrows that risk but cannot close it: it bounds width, and it is a data argument, not an invariant. **Bound the envelope structurally instead.** Build `naturalW[]` and `k[]` over all `n` as today, but reduce `planeW`, `maxAbove`, `maxBelow` and `tallest` over `i < CARD_COUNT` only, then fit each act-two texture *into* that envelope: for `i ≥ CARD_COUNT`, multiply `k[i]` by `min(1, planeW / naturalW[i], planeH / naturalH[i])` (with `naturalH[i] = m.heightPx · k[i]`) and recompute `naturalW[i]` from the scaled `k[i]`. Act one's plane is then arithmetically independent of every act-two string · the identity is a property of the loop bound, and the before/after dump in the acceptance confirms it rather than establishing it. An act-two string that would have overflowed renders a touch smaller; that is the whole cost, and the wrap allowance below keeps it from arising on today's copy.
- The DEV handle: if Task 1 added `camera` to `__scene`, keep it.

**Work, `SceneTitle.tsx` and `titleTexture.ts`:** in `draw()`, rasterise in two phases: first `latestTitles.current.slice(0, CARD_COUNT)` at `maxLinePx` as today; then, from those results, `const actOneInkPx = Math.max(...actOne.map((d) => d.widthPx)) − 2 · TITLE_PAD_RATIO · fontPx` and draw the rest at `maxLinePx: Math.min(maxLinePx, actOneInkPx)`. Export `PAD_RATIO` from `titleTexture.ts` as `TITLE_PAD_RATIO` · a rename in place, one file, listed in this task's Files block because it is a source edit and not a footnote. Concatenate in original order; the disposal, generation and metrics code is unchanged. This phase is the **optimisation**: it keeps act-two strings from needing the rig's fit-down on today's copy. The **guarantee** is the `i < CARD_COUNT` envelope in `SceneRig.updateTitle` above; a comment in each file points at the other so neither is later "simplified" away on the belief that the other one covers it.

**Work, `Environment.tsx` and `SelectedWorkScene.tsx`:** `EnvironmentProps` gains `sceneRefs: SceneRefs` and `SelectedWorkScene` passes it (both deferred from Task 6 so the prop is declared and used in one commit). `<DepthOfField ref={dofRef} …>` with `const dofRef = useRef<DepthOfFieldEffect | null>(null)`; a `useFrame` (priority before `COMPOSER_PRIORITY`) does `const e = dofRef.current; if (e && e.cocMaterial.worldFocusDistance !== sceneRefs.focus.distance) e.cocMaterial.worldFocusDistance = sceneRefs.focus.distance`. The `worldFocusDistance={focusDistance(g)}` prop stays as the mount value. If the installed typings do not expose `cocMaterial.worldFocusDistance`, stop and report `blocked: DoF focus setter not typed in postprocessing 6.39.4`; do not cast through `any`.

**Acceptance check:** `npx tsc -b` and `npm run lint` clean. On the dev server at 1440×900: scrolling to `top + 4.5·innerHeight + 0.5·(offsetHeight − 5.5·innerHeight)` (mid act two) gives `canvas.dataset.act === '2'` and `dataset.slot === '3'`, the camera sits in front of the wall (`__scene` camera `z` between `frame.z` and `frame.z + volumeDistance`), the console is clean; at playhead 0, `dataset.act === '1'`. Then `node scripts/scene-title-identity.mjs docs/superpowers/plans/evidence/2026-09-08-title-identity.after.json` and `diff docs/superpowers/plans/evidence/2026-09-08-title-identity.before.json docs/superpowers/plans/evidence/2026-09-08-title-identity.after.json` prints nothing except, if any, the `camera` array's 7th entry (`far`) and only that. Under `prefers-reduced-motion` (Chromium flag or DevTools emulation) act two shows the volume shot then per-block stills, card four is gone from the volume shot on, and `dataset.act` flips the same way. Card four's opacity reaches `0` by the end of the release on the live path (read `__scene`'s card 3 material opacity at `u = uR`). `npx vitest run` green, snapshot matches.

**Boundaries:** `Corridor.tsx`, `Overture.tsx`, `Caption.tsx`, `textTexture.ts` untouched. No wall rendering (pipeline 2). No new DOM.

- [ ] `SceneRig.tsx`: playhead split, the single `still` descriptor, camera, fog, focus, the card-four fade, `data-act`, rotation order, far plane; `npx tsc -b` clean; dev server scrub to mid act two shows `data-act="2"`, card four gone, console clean
- [ ] `SceneRig.tsx` `updateTitle`: `CARD_COUNT` in the act-one calls, the `i < CARD_COUNT` plane envelope and the act-two fit-down, the act-two branch, the title distance; dev server shows `all work` after the release and the years across the dolly
- [ ] `titleTexture.ts` `TITLE_PAD_RATIO` rename; `SceneTitle.tsx` two-phase draw; `npx tsc -b` clean
- [ ] `Environment.tsx` `sceneRefs` prop and focus ref, `SelectedWorkScene.tsx` passes it; `npx tsc -b` and `npm run lint` clean
- [ ] Run the identity script to `after.json`; `diff before.json after.json` → empty (or `far` only); paste the diff output into the commit body
- [ ] `git add -A src/components/canvas docs/superpowers/plans/evidence && git commit -m "feat(scene): act two in the frame loop; title carries all work and the years; data-act"`

### Task 8: e2e · a shared scene helper, the rewritten specs and the act-two scrub

**Files:**
- `tests/e2e/helpers/scene.ts` — create: `openScene`, `scrollToPlayhead`, `scrollToActTwo`, `readSvh`, `beats`
- `tests/e2e/scene-scrub.spec.ts` — modify: use the helper, extend through act two
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: use the helper, add the act-two stills assertions
- `tests/e2e/scene-effects.spec.ts` — modify: replace the `0.3333` scroll with `scrollToPlayhead(page, 0)`
- `tests/e2e/nav-on-light.spec.ts` — modify: replace `scrollToSceneFraction(page, 0.3333)` with `scrollToPlayhead(page, 0)` and fix the comment; nothing outside this list

**Interfaces:**
- Consumes: `data-svh` on `.scene-scroll` (Task 6), `data-act` (Task 7), `ACT_ONE_SVH`, `sceneWrapperSvh` only for comments (helpers read the DOM).
- Produces: `readSvh(page)` returns `Number(wrapper.dataset.svh)`; `unit`, **the pixels in one playhead unit, is `wrapper.offsetHeight / (svh / 100)`, not `offsetHeight / svh`**. One playhead unit is 100 svh, so `offsetHeight / svh` is one svh in pixels and every scroll built on it lands 100× short · at the shipped extent it is `13.5·h / 1350 = 0.01·h`, so `scrollToPlayhead(page, 0)` would scroll 1.5 % of a viewport instead of 1.5 viewports, park the scene at the overture, and let every "act one still scrubs" assertion pass against the wrong frame. Written the right way, `unit = offsetHeight / (svh / 100) = 13.5·h / 13.5 = h`. `scrollToPlayhead(page, playhead)` scrolls to `top + (playhead + 1.5) · unit`; `scrollToActTwo(page, u)` scrolls to `top + 4.5 · unit + u · (offsetHeight − unit − 4.5 · unit)`, where `unit` stands in for the viewport height because 100 svh is `innerHeight` in headless Chromium with no dynamic toolbar. `beats(page)` returns `{ release: 100 / (svh − 550), approach: 150 / (svh − 550) }`, derived from the shipped extent the page actually rendered. Both scrolls wait 160 ms (220 ms under reduced motion, pass a `settle` option).

**Work:** `testDir` is `tests/e2e` with the default `*.spec.ts` match, so `helpers/scene.ts` is not collected. Move the existing `openScene` and `CANVAS` into the helper and import them in `scene-scrub`. Rewrite every fraction-based scroll as a playhead: `0 → −1.5`, `0.2222 → −0.5`, `0.23 → −0.47`, `0.3333 → 0`, `0.4444 → 0.5`, `0.5556 → 1`, `0.6667 → 1.5`, `0.7778 → 2`, `0.8889 → 2.5`, `1 → 3`, `0.4/0.5/0.62/0.72/0.84 → 0.3/0.75/1.29/1.74/2.28`, `0.44 → 0.48`; `SWEEP` becomes playheads with the same meaning. The scene-scrub console test additionally sweeps act two at the **shipped** beat boundaries, read from the page: `const { release, approach } = await beats(page)`, then `u` in `[0, release / 2, release, (release + approach) / 2, approach, 0.3, 0.5, 0.75, 0.95, 1, 0.5]`, then back to playhead `0`, asserting zero problems after every stop. The draft's literal `1/7` and `3/14` are the **fictional** 22-column fixture's boundaries; at the shipped 26 columns they are `0.125` and `0.1875`, so those stops would sample the middle of the release and the middle of the approach and never test a boundary at all. Nothing in an e2e file hardcodes a column count or a beat fraction · `data-svh` is on the page precisely so the test reads what shipped, and repeats the act-two stops at the short and near-square viewports already in the test. New test in `scene-scrub`: `data-act` reads `1` at playheads `−1.5`, `0`, `3` and `2` at `u` `0.05`, `0.5`, `1`, and `data-slot` stays `3` throughout act two; `data-registrations` stays `1` after the full act-one plus act-two sweep (extend the existing registrations test). `scene-reduced-motion`: after the existing assertions, `scrollToActTwo(page, 0.5)` → `data-act="2"`, `data-static="true"`, `data-slot="3"`, console clean; `scrollToPlayhead(page, 0)` → `data-act="1"`. `data-static` alone does not prove a still is still · it is set once and never reads a pose · so the spec also samples `__scene`'s camera position and the title index at two `u` values inside the same still interval (`approach + 0.02` and `approach + 0.04`, both inside the newest block on the shipped extent) and asserts they are identical. The per-channel proof lives in Task 5's unit tests; this is the end-to-end confirmation that the rig wired the descriptor and not the live `u`. `scene-effects` keeps its spoofed-renderer scrub and adds one stop at `scrollToActTwo(page, 0.5)` with the console still clean (this is the only headless path that runs the composer and the focus write).

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/scene-effects.spec.ts tests/e2e/nav-on-light.spec.ts tests/e2e/scene-no-webgl.spec.ts` green on both projects (`desktop-chromium`, `mobile-chromium`). Before Task 6 the same command was red on the fraction assumptions; after Task 8 it is green.

**Boundaries:** `light-chapter.spec.ts`, `section-enters.spec.ts`, `reduced-motion.spec.ts`, `perf-budget.spec.ts`, `pixel-gate.spec.ts` are not touched (their `#archive` expectations are pipeline 3's). No source change; if a spec can only pass with a source change, stop and report `blocked: <what the scrub exposed>`.

- [ ] Create `tests/e2e/helpers/scene.ts`; rewrite `scene-scrub.spec.ts` on playheads; `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/scene-scrub.spec.ts` → green (act one)
- [ ] Extend `scene-scrub.spec.ts` with the act-two sweep, `data-act` and the registrations sweep; run → green
- [ ] `scene-reduced-motion.spec.ts`, `scene-effects.spec.ts`, `nav-on-light.spec.ts` on the helper plus the act-two stops; run the five-spec command → green on both projects
- [ ] `git add -A tests/e2e && git commit -m "test(e2e): scene specs scroll by playhead; act-two scrub, data-act and reduced-motion stills"`

### Task 9: architecture note for act two

> Numbering note: this was Task 10 in the pre-review draft and the PR task was Task 9. The docs note now runs **before** the PR, so `docs/architecture.md` is inside the diff Kevin reviews and the three-leg review reads the plan, the code and the architecture note as one change. Nothing outside this file cites these numbers.

**Files:**
- `docs/architecture.md` — modify: the Selected Work scene section and its index row; nothing outside this list

**Work:** Present tense, current truth, rewritten not appended. Index row for Selected Work adds `src/utils/friezeLayout.ts`. "Anatomy": `div.scene-scroll` height is inline from `sceneWrapperSvh(columns)` and carries `data-svh`; the 550 svh literal is gone. "Corridor and playhead": the playhead is piecewise, `[−1.5, 3]` in card units for act one and `[3, 4]` normalised for act two, `playheadFor(p, columns)`; settled card `k` sits at scrub `(k + 1.5) · 100` svh, which is no longer a fixed fraction of the wrapper. New subsection "Act two" under the scene: the frieze frame (centred on the axis, one spacing beyond card four, bottom at `HOVER`), the four beats with their svh and the distances (`volumeDistance`, `dollyDistance`, the 144 px cell floor and why it is half of `CARD_MIN_PX`), `dollyEase`, the bottom-anchored dolly camera and why `DOLLY_HEIGHT_FILL` is a fill floor, the reading cursor and the title windows and the accepted cursor-versus-camera lag at the dolly's ends, card four's dissolve across the release, stills as one discrete descriptor under reduced motion, fog and far plane and DoF focus in act two, the title distance rule, `data-act`, the scroll seams (`scrollTargetFor(playhead, …, columns)`, `playheadForColumn`, `volumeShotPlayhead`) with the note that `playheadForItem` lives in pipeline 2's `friezeTargets.ts` and which pipeline calls each, the `i < CARD_COUNT` title-plane envelope and the two-phase draw that complements it, and the `maxRowsInFrame` and `actTwoTopClearFrac` bounds pipeline 2 must respect. "Fallback and data attributes": add `data-act` and `data-svh`. Do not write the wall or the stream sections; those are pipelines 2 and 3.

**Acceptance check:** `grep -n '550svh' docs/architecture.md` prints nothing; `grep -n 'data-act\|sceneWrapperSvh\|dollyEase\|maxRowsInFrame' docs/architecture.md` each print at least one line; `npm run lint` unaffected.

**Boundaries:** `CONTEXT.md` already carries the act-two terms from the spec commit; do not edit it. No ADR.

- [ ] Edit the index row, Anatomy, Corridor and playhead, Fallback and data attributes
- [ ] Write the "Act two" subsection
- [ ] `git add docs/architecture.md && git commit -m "docs(architecture): act two of the Selected Work scene"`

### Task 10: the verification set and the PR

**Files:**
- none created; this task runs commands and opens the PR

**Work:** Task 9's architecture note is already committed, so this task opens a PR that is complete. The full set, in order, each pasted into the PR body: `npx tsc -b`, `npm run lint`, `npx vitest run` (the act-one snapshot and every pre-existing `sceneMotion` test included), `lsof -ti:4173 | xargs -r kill -9; npx playwright test` (whole suite, both projects; the `#archive` specs still pass because `Archive.tsx` is untouched on this branch), and the identity diff from Task 7. Then `git push -u origin feat/act-two-motion` and `gh pr create --base feat/act-two --title "feat(scene): act two motion · playhead, beats, wrapper height, title sequence" --body-file <body>`, the body listing: what changed by file, the numbered Assumptions of this plan, the manual pass for Kevin (below), which parts were verified by command, and the standard trailer. Stop after the PR; the three-leg review is Kevin's to trigger.

**Manual pass for Kevin (in the PR body, verbatim):**
1. Dev server, 1440×900. Scroll to card four settled. Keep scrolling: the camera pulls back and up over one viewport, card four recedes, the wall emerges from the cream one spacing behind it, and the title morphs from the project name to `all work` with the same gooey seam. It should not lurch at the start.
2. Half a viewport more: the camera moves in and left; the newest block reaches the left frame edge; `all work` holds.
3. Continue: the camera travels right at a steady pace; the title morphs to `2026`, `2025`, `2024`, `2023` at the block boundaries. The last quarter-viewport eases to a stop; the pin releases into Work Experience.
4. Scroll back up through all of it: every frame is the reverse of the way down.
5. Switch to PT; repeat 1 with `todos os trabalhos`. The act-one titles must not change size between EN and PT, nor before and after this branch.
6. 393×851 (device toolbar): the same four beats; the wall is tall in frame, about three columns visible; the title stays in front of the wall, never behind it. Expect the title to read **over** the wall's top row · that overlap is Assumption 23, not a bug, and the reserve that would avoid it is arithmetically unavailable at eight rows.
7. `prefers-reduced-motion: reduce`: card four, then the volume shot with card four gone, then one still per year; the title switches without a seam and nothing drifts while you sit still.
8. Card four during the release: it fades out as the camera pulls back and is fully gone by the time the whole frieze is in frame. It must not reappear anywhere in act two, and clicking where it used to be must do nothing on this branch.

**Acceptance check:** all five commands green in one session; `git status` clean and `grep -n '\- \[ \]' docs/superpowers/plans/2026-09-08-act-two-motion.md` shows no unticked box in Tasks 1 to 9; PR URL printed by `gh pr create`.

**Boundaries:** Nothing merges. No `ALLOW_MAIN_MERGE`. No spec box.

- [ ] `npx tsc -b && npm run lint` clean
- [ ] `npx vitest run` green; `npx vitest run tests/unit/sceneMotion.actOne.test.ts` reports snapshots matched, none written
- [ ] `lsof -ti:4173 | xargs -r kill -9; npx playwright test` green on both projects
- [ ] `git push -u origin feat/act-two-motion`; `gh pr create --base feat/act-two …`; stop

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

❓ **Q8 · Dolly distance.** (a) Height fit alone; (b) the legibility floor alone; (c) `min(height fit at 0.82, legibility)`. ➡️ (c): the legibility floor binds on every fixture today. **Corrected in the fix pass:** the height term is not a ceiling · `min()` picks the nearer distance and a nearer camera fills more frame, so `DOLLY_HEIGHT_FILL` is the floor on the fill and nothing in the expression caps it (Assumption 5). The bottom-anchored `dollyY` is what buys the top clearance instead.

❓ **Q9 · Volume shot framing.** (a) Width fit at 0.9; (b) both axes at 0.9, binding axis wins; (c) fit plus a fixed pull-back. ➡️ (b): "the whole frieze enters frame" on any aspect.

❓ **Q10 · Dolly speed and exit.** (a) Camera x linear in the cursor, hard-clamped at the frieze edges; (b) a trapezoid velocity profile over the reachable range, ramping one column at each end; (c) smoothstep over the whole dolly. ➡️ (b): constant speed in the middle, the exit slows to rest inside the last column with no scroll added, C1 everywhere.

❓ **Q11 · Which year the title names.** (a) The block at the frame's centre; (b) the block under a reading cursor that sweeps every column at 25 svh each; (c) the block the camera x is over. ➡️ (b): only the cursor visits every block, so `blockAt` yields each year once in order as the acceptance demands, including a one-column block.

❓ **Q12 · Morph windows.** (a) A fixed column on each side of a boundary; (b) half-widths clipped to half the neighbouring block; (c) morph across the whole block. ➡️ (b): windows never overlap around a narrow block, and every boundary has one.

❓ **Q13 · Feeding the title without touching `segmentFor`.** (a) Pass `CARD_COUNT` instead of `textures.length` to the act-one calls and add an act-two branch that maps `actTwoTitle` indices onto the extended texture list; (b) a second title object; (c) rewrite `segmentFor`. ➡️ (a): `segmentFor` is untouched and act one's arguments are what they were.

❓ **Q14 · Keeping act-one title size when the texture list grows.** (a) Draw all strings alike and hope; (b) two-phase draw: act-two strings wrapped to the widest act-one ink width; (c) per-act plane metrics with a redraw at the act boundary. ➡️ (b) **plus the envelope of (c), corrected in the fix pass.** Wrapping to the act-one ink width bounds an act-two texture's width, but `titleTexture.ts` grows `canvas.height` with the line count, so it does not bound its height and "never stand taller" was wrong. The guarantee is reducing `planeW`, `maxAbove`, `maxBelow` and `tallest` over `i < CARD_COUNT` and fitting act-two textures into that envelope · the answer to (c) without a redraw at the boundary. The identity dump then confirms on today's data what the loop bound already makes true of any data (Assumption 8).

❓ **Q15 · `data-act` without React state.** (a) Written by the rig on change, like `data-slot`; (b) a React attribute; (c) a CSS class. ➡️ (a).

❓ **Q16 · Reduced-motion stills.** (a) Volume shot for release and approach, then one still per block at the block's centre column; (b) one still per beat; (c) the same path sampled coarsely. ➡️ (a): it is the spec's list, and each still is a pose the live path also visits. **Extended in the fix pass:** the still is one discrete `ActTwoStill` descriptor and every channel · camera, fog, focus, title distance, title index, card fade · reads it, with the ambient time term forced to `0`; four channels each sampling the live `u` is how a still acquires a drift (Assumption 10).

❓ **Q17 · How the wrapper height reaches the DOM.** (a) Inline `style.height` in svh from `sceneWrapperSvh(columns)` plus `data-svh`; (b) a CSS custom property; (c) keep a literal and a test that it matches. ➡️ (a): the e2e derives the playhead unit from `offsetHeight / data-svh` and needs no `innerHeight` assumption.

❓ **Q18 · Aspect change mid-act.** (a) Recompute geometry and the far plane on the size key; the playhead is unchanged in this pipeline because rows are static; (b) freeze the extent per session; (c) animate the change. ➡️ (a): every pose is pure in `g`, so a resize is a re-layout like it is in act one; pipeline 2's aspect-keyed rows will change the wrapper height on orientation change, which is a jump it must own.

❓ **Q19 · Fog, far plane and DoF in act two.** (a) Leave them; (b) blend fog to the wall distance across the release, extend the far plane once per geometry, write the DoF focus per frame through `sceneRefs`; (c) disable fog in act two. ➡️ (b): with act-one values the wall is fully dissolved at 12 units and outside the frustum on a phone; the blend keeps `u = 0` identical to act one.

❓ **Q20 · Title occlusion by the wall.** (a) `min(titleDistance, 0.8 · wallDistance)`; (b) draw the title without depth test; (c) move the wall. ➡️ (a): pixel size is distance-invariant so the switch is invisible, and the title keeps its depth test against the cards.

❓ **Q21 · `scrollTargetFor(itemId)`.** (a) Column-based seams in motion (`playheadForColumn`), item lookup with the cells; (b) motion imports the cells; (c) a registry of item positions. ➡️ (a): `sceneMotion` stays pure and independent of the content model. The amended spec ratified this and named the halves · pipeline 2's `playheadForItem(itemId, layout, extent)` in `src/utils/friezeTargets.ts` over pipeline 1's numeric `scrollTargetFor` and `playheadForColumn` (Assumption 15).

❓ **Q22 · The frieze stub.** (a) Pipeline 1 creates `friezeLayout.ts` with constants, types and a provisional count-based extent; (b) hardcode the fixture in `Projects.tsx`; (c) wait for pipeline 2. ➡️ (a): the branch runs on its own, the wrapper height is already a function of the data, and pipeline 2 replaces one deprecated function.

❓ **Q23 · Proof that act one is pixel-identical.** (a) The existing tests; (b) a committed pose snapshot across six viewports plus a dev-server dump of camera, title scale and title metrics before and after; (c) a pixel-gate screenshot. ➡️ (b): poses and title size are what could move; the composer is headless-invisible so a screenshot proves less than the numbers.

## Assumptions

1. Act two is a second, normalised playhead unit: `playheadFor(progress, columns)` returns `[−1.5, 3]` in card units for act one and `[3, 4]` for act two; `PLAYHEAD_SPAN`, `MAX_SEG` and `CARD_COUNT` do not change, and `actTwoProgress(playhead) = clamp(playhead − 3, 0, 1)`.
2. `playheadFor` and `scrollTargetFor` gain a trailing `columns = 0` parameter; `0` means no act two and reproduces today's functions byte for byte; `actTwoSvh(0) = 0`, and both functions return early on `columns ≤ 0` so that zero is never a divisor when `progress` overshoots `1`.
3. The frieze stands at the corridor's end facing the camera, centred on the corridor axis (`centreX = 0`), one spacing beyond card four (`z = −4 · spacing`), bottom edge at `HOVER`.
4. Release: position and pitch `smoothstep` from `cameraPose(3, g)` to the volume shot, yaw 0; the pose at `u = 0` equals `cameraPose(3, g)` exactly, and card four dissolves over the same window through `actTwoCardFade`. Approach: `smoothstep` to the dolly start with a leading look target (`1.5×`) that produces the beat's yaw. Dolly: `dollyEase` trapezoid profile, one column ramp at each end, yaw and pitch 0. No plateaus inside act two.
5. Legibility is a cell floor of `FRIEZE_CELL_MIN_PX = ceil(CARD_MIN_PX / 2) = 144` CSS px; pipeline 2 sizes cell type so 12 px holds at 144 px. `dollyDistance = min(H / (2·tan·DOLLY_HEIGHT_FILL), legibility distance)` with `DOLLY_HEIGHT_FILL = 0.82` acting as the **floor** on the wall's vertical fill, not a ceiling: the measured fill is 0.925 at 1440×900 and 0.978 at 393×851, and the legibility term is what raises it. `volumeDistance` fits both axes at 0.9. The dolly camera is bottom-anchored (`dollyY`), which puts all the spare frame height above the wall; `actTwoTopClearFrac` is that air, 0.0751 and 0.0218 at the two fixtures, and is exported for pipeline 2.
6. The camera's dolly range is `[min(left + halfVisible, 0), max(right − halfVisible, 0)]` · `min` then `max`, so a frieze wider than the frame yields a real range and one narrower than the frame collapses both ends to the centre; the reading cursor sweeps all `columns` at 25 svh each regardless of the camera's clamp.
7. Title morph windows sit on block boundaries with half-widths `min(0.5, neighbour / 2)` columns, applied through `seamFor`'s `settleFrac`; the release morph runs over the whole release beat; `blockAt` is `null` before the dolly.
8. The title texture list is `[card 0..3, all work, year per block]`; the rig passes `CARD_COUNT` to the act-one `segmentFor` call. **Act-one plane identity is structural, not data-dependent:** `planeW`, `maxAbove`, `maxBelow` and `tallest` are reduced over `i < CARD_COUNT` only, and act-two textures are fitted into the envelope act one produced. The second draw phase (act-two strings wrapped to the widest act-one ink width) keeps them from needing that fit on today's copy, but it is an optimisation · on its own it bounds width and not the canvas height, which grows with line count in `titleTexture.ts`, so a wrapping act-two string would otherwise move `planeH` and `baseY` and resize act one.
9. `data-act` is written imperatively on the canvas element on change; `1` for `playhead ≤ 3`, `2` past it. `data-svh` on `.scene-scroll` carries `sceneWrapperSvh(columns)` for the e2e helper.
10. Reduced motion: the volume shot for `u < uA`, then one still per block at the block's centre column clamped to the dolly range. Each still is **one discrete `ActTwoStill` descriptor** (`index`, `u`, `x`) and camera, fog, focus, title distance, title index and card-four fade all derive from it; the ambient time term is `0` in act two under reduced motion unconditionally. The test asserts that outputs are bit-identical across a still's interval, rather than trusting `data-static`.
11. The wrapper height is an inline style in svh from `sceneWrapperSvh(columns)`; the CSS literal and its comment are deleted; the extent is static (`FRIEZE_ROWS = 8` in both orientations), so a resize never changes the wrapper height · here or in pipeline 2, since amended decision 15 removed the aspect-keyed row count that would have.
12. Act two owns fog (blend from `fogRange(g, t)` to the wall distance across the release), the far plane (`max(g.far, volumeDistance + 2·spacing)`, set once per geometry/frieze key) and the DoF focus (`sceneRefs.focus.distance`, written per frame, consumed by `Environment` through a `DepthOfFieldEffect` ref). The far plane change alters depth precision only; DoF circle-of-confusion on desktop may differ by less than a depth-buffer quantum.
13. The title plane sits at `min(g.titleDistance, 0.8 · wallDistance)` in act two, invisible because its pixel size is distance-invariant.
14. The camera's Euler order becomes `'YXZ'`, set once; identical to today for yaw 0.
15. **Targeting is split across two pipelines, and pipeline 1's half does not complete it.** Pipeline 1 exports the column seams only · `playheadForColumn`, `playheadForBlock`, `volumeShotPlayhead`, the numeric `scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewportHeight, columns)` and `data-svh`. Pipeline 2 owns `playheadForItem(itemId, layout, extent)` in the new pure `src/utils/friezeTargets.ts`, which imports `friezeLayout.ts` and `sceneMotion.ts` and composes `playheadForColumn(cell.col + cell.span / 2, extent)`. Pipeline 3 calls `playheadForItem` for stream focus and `volumeShotPlayhead` for the nav link. `scrollTargetFor` never takes a string, here or later; `sceneMotion.ts` never sees the content model.
16. Pipeline 1 creates `src/utils/friezeLayout.ts` with `FRIEZE_CELL_W = CARD_W / 2`, `FRIEZE_CELL_H = CARD_H / 2`, `FRIEZE_ROWS = 8`, the `FriezeExtent` type above and a deprecated `provisionalFriezeExtent` (`ceil((count + 3 · caseStudies) / rows)` per year). Pipeline 2 completes the file but does **not** retune the cell constants (the spec fixes them at half a card so a 2×2 span is exactly one scene card) and does **not** replace `FriezeExtent`: it may only extend it with a block `count` and the extent's `width` and `height`, so its result stays assignable to the base type.
17. `FIXTURE_FRIEZE` is fictional: 22 columns, 8 rows, blocks `1/6/13/2`, kept because the spec works `sceneWrapperSvh(22) = 1250` and because a second extent shape exercises the pose maths. **The shipped extent is 26 columns · blocks `2/7/16/1` at 8 rows, `sceneWrapperSvh(26) = 1350` svh** · and every assertion about the running site uses it, e2e included.
18. Card four dissolves across the release through `actTwoCardFade` and is fully faded by `uR` (the spec's amended acceptance). It is therefore **not** hoverable or pressable during act two, and the mesh leaves the render once its opacity hits `0` so it cannot intercept a pointer meant for a wall cell in pipeline 2. `data-slot` still reads `3` throughout act two · the act-one segment is clamped at `3`, so `frontIndexFor` keeps returning card four's index · but in act two it names the last act-one slot, not a card under the pointer; nothing on this branch or the next may read it as "a card is hittable". Cards 0 to 2 remain invisible for the same clamp.
19. Pixel identity is proven by a committed pose snapshot (six viewports, 91 playheads) and a before/after dev-server dump of camera, title scale, title z and the four act-one title metrics at six playheads; the only permitted difference is the camera's `far`. The dump confirms the `i < CARD_COUNT` envelope of Assumption 8; it does not establish it.
20. `maxRowsInFrame(g)` is exported as the bound any row count must respect (8 at 393×851 and at 1440×900, and `FRIEZE_ROWS = 8` sits exactly on it with no slack); a taller frieze clips rows at the dolly distance because the cell floor binds first, and act two has no vertical camera travel to recover them. Amended decision 15 removed the portrait row count, so this is a bound on future change rather than on pipeline 2's next move.
21. **The release beat's yaw is 0.** The spec says the camera "yaws to face the corridor's end", and the wall stands centred on the corridor axis (Assumption 3), so the act-one heading already faces it: a non-zero release yaw would turn the camera away from the wall it is pulling back to reveal. The yaw the spec names is real but belongs to the **approach**, where the look target leads the body toward the newest block and returns to 0 at the beat's end. Recorded so a reviewer does not read "yaw 0 during the release" as an omission.
22. **The reading cursor and the camera disagree by up to one column at each end of the dolly, and that is accepted.** The cursor is linear in `p` so `blockAt` can visit every year exactly once, including a one-column block outside the camera's clamped range; the camera follows `dollyEase`, which ramps over one column's share at each end. A title can therefore name a year a beat before the camera arrives at the dolly's start, and rest on the last year while the camera eases in. Driving the title from camera `x` instead would silently skip any block the clamped range never reaches, which is the failure the acceptance explicitly forbids.
23. **In act two the title reads over the wall's top row.** With `FRIEZE_ROWS = 8` and the 144 px cell floor, the wall fills 0.925 (desktop) to 0.978 (phone) of the frame height; clearing the act-one title band would need a fill of 0.679, i.e. a 106 px cell, and there is no ninth row to trade away because `maxRowsInFrame` is exactly 8. The bottom-anchored dolly camera buys the largest clearance available, `actTwoTopClearFrac`, and that number is exported so pipeline 2 can inset the top row's cell ink under the title band. Motion adds no scrim, no veil and no darkening to make the overlap read · that is the site's standing NO, and the fix belongs to the wall's own typography.

## Spec conflicts

1. **`sceneMotion.ts` must import `FRIEZE_CELL_W/H` from `friezeLayout.ts`, which pipeline 2 owns and which does not exist on the base, yet pipeline 1 merges first.** Resolution: pipeline 1 creates the file with constants, types and a provisional extent only (Assumption 16); pipeline 2 forks from this branch and completes it. The import direction rule holds.
2. **`scrollTargetFor(itemId)` cannot live in `sceneMotion.ts`**, which has no cells and must not import the content model. **Resolved by the amended spec**, which names the split explicitly: column seams here, `playheadForItem` in pipeline 2's `src/utils/friezeTargets.ts`, composition in pipeline 3 (Assumption 15). No string overload is added to `scrollTargetFor` at any point in the chain.
3. **"Portrait gets a taller, shorter frieze" versus the legibility floor. Resolved by the amended spec**, which sets `FRIEZE_ROWS = 8` in both orientations and states the reason: the act-two camera has no vertical travel, so a taller frieze would leave rows off frame forever. Portrait sees fewer columns at a time, not more rows. `maxRowsInFrame` stays exported as the bound on any future change, and it is exactly 8 at both fixtures. Recorded, not open.
4. **The acceptance line `sceneWrapperSvh(22) = 550 + 700` versus today's data.** Twenty-two columns is a fictional fixture; the count-based provisional extent gives 26 and `sceneWrapperSvh(26) = 1350`, and pipeline 2's first-fit layout will give its own. Both are asserted: 22 for the function's shape, 26 for what ships, and no e2e file hardcodes either.
5. **"`PLAYHEAD_SPAN` may change."** It does not need to; act two is a second unit (Assumption 1). Recorded so the review does not look for a change that is absent.
6. **"`data-act` reads 2 during act two and 1 before."** At exactly playhead 3 (card four settled, `u = 0`) it reads `1`; act two begins strictly after.
7. **"The title holds `all work` and the year strings" versus the eight-row wall.** The spec asks for both a full-height frieze at the legibility floor and a title in its usual band; at `FRIEZE_ROWS = 8` and a 144 px cell the two cannot both be had, because the wall fills 0.925 to 0.978 of the frame height and the band act one proved ends at 0.321. **Open, and resolved in favour of the wall:** the title reads over the top row (Assumption 23), motion buys the largest clearance the constraint set allows through the bottom-anchored dolly camera, and `actTwoTopClearFrac` is exported so pipeline 2 can inset the top row's ink. If Kevin wants more air over the top row, the lever is the spec's row count, not this plan: seven rows at 1440×900 give a 0.809 fill and 0.191 of clearance, two and a half times what eight rows leave, though still short of the 0.321 a fully clear band needs. That is a decision 15 change, not a motion change.
