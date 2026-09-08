# Aspect crossover, harness merge, issue discoverability

**Date:** 2026-09-07 · **Owner:** Kevin · **Status:** approved in chat (grilling, five plus nine questions, plus one from plan review)

Three deferred items from the docs house-cleaning handoff, planned together because each is small. Item 1 is a scene-geometry change with a manual pass. Item 2 lands the `perf/hero-harness` branch in `staging`. Item 3 is one table row.

## Item 1 · the `aspect = 1` crossover in `sceneGeometry`

### Problem

`sceneGeometry()` in `src/utils/sceneMotion.ts` forks five quantities on `aspect < 1`: the card fraction cap, the `camY` coefficient, the `titleCapPx` floor, `titleWidthCap` and `titleClearance`. Nobody chose what happens at the crossing. Measured with the real function on 2026-09-07 (FOV 35):

| Viewport, either side of square | Portrait side | Landscape side |
| --- | --- | --- |
| 600 px wide | card 528 px | card 287 px |
| 820 px wide | card 620 px, camera D 2.10 | card 377 px, D 3.44 |
| 960 px wide | card 620 px | card 442 px |
| any width | `camY` 1.228 | `camY` 0.947 |

Real device rotations do **not** cross near square: a tablet goes from about 0.7 to about 1.4 and both sides sit well clear of the boundary, so rotation is the ordinary reflow. The crossing is reached by **near-square windows**: a snapped half of a 1920×1080 monitor is aspect 1.01, a half of 1920×1200 is 0.90, a half of 2560×1440 is 0.98. Dragging a split divider or opening devtools on those crosses live, mid-scroll, and every consumer snaps in one frame (the rig re-derives geometry keyed on the R3F size; nothing lerps).

One correctness break rides along: near-square portrait violates the landscape side's own frame-fit rule. At 640×641 the card is 0.63 of the frame height; landscape caps it at 0.50.

### Diagnosis

One switch carried two unrelated things. The card cap is a **width** story: both sides are bounded by `CARD_MAX_PX` and by the frame. Camera height and the title knobs are a **vertical-room** story, which is aspect. The portrait-cap fix (`a14042e`) named this and scoped it out on purpose: "re-keying the regime on width rather than aspect would remove that, and is deliberately not done here."

Provenance of the forked values, from git: the landscape `0.46` cap arrived in the original helpers commit with one comment, "the card never dominates", and no measurement. The `camY` fork `1.0 / 0.61` was born with the function; no comment or commit explains either coefficient. The three title knobs were measured against a title-to-card ratio of about 0.167 at 390 and 430 px wide (`096f05a`).

### Settled decisions

1. **The fork means two things on one switch** (Q1). The card fraction is width-bound; `camY`, `titleClearance` and `titleWidthCap` are vertical-room-bound. Each varies on its own axis.
2. **Remove the fork where it falls out, blend where it does not** (Q2). No hysteresis: it renders two identical viewports differently by arrival, the bug class the title-wrap fix removed. No animated transition: it hides a jump and puts a lane question on a value six components read as static.
3. **Card and camera get treatment; two title knobs stay stepped** (Q3). `titleWidthCap` and `titleClearance` keep their step. `titleCapPx`'s floor blends with the camera. Title continuity is not a goal of this change.
4. **The card formula is one expression on both sides** (Q6): `min(0.88, CARD_MAX_PX / widthPx, 0.5 / (aspect · CARD_H))`, then the existing `CARD_MIN_PX` floor and 0.92 ceiling. The `0.46` cap is deleted. The half-frame-height rule is the only meaning "never dominates" keeps, and it already governed every 16:9 desktop.
5. **`camY` smoothsteps on aspect between two anchors** (Q7): coefficient 1.0 at or below the band start, 0.61 at or above the band end, `smoothstep` between. Default band 0.85 to 1.25, exported as tuning constants. Keying it on the card's share of frame height was rejected: that share is flat at 0.5 across the whole band.
6. **`titleCapPx`'s floor blends on the same band** (Q8): 72 at the band start down to 56 at the band end.
7. **Acceptance is a sweep plus an invariant plus anchors** (Q4, Q9). A sweep over aspect asserting bounded per-step movement; the half-frame-height rule on every fixture in both orientations, exempting fixtures where the legibility floor binds; anchors locked so band tuning cannot drift the tuned viewports.
8. **`CARD_MAX_PX` 620 and `CARD_MIN_PX` 287 are untouched** (Q10).
9. **Record** (Q11): the architecture "Card size" section is rewritten; `CONTEXT.md` gains **Frame-fit rule** and **Crossover band**; no ADR, because the change is one constant pair and one function, reversible in an afternoon. The scene spec's Q14 wording "Phone: one layout" stays as history.
10. **Polish with a correctness core** (Q5). The frame-fit break in near-square portrait is fixed regardless; the smoothness comes with it.

### Visible change, computed 2026-09-07

| Viewport | Today | After |
| --- | --- | --- |
| every phone, every portrait tablet, 1440×900, 1920×1080, 1280×720, 1280×800, 1536×864 | unchanged | unchanged |
| iPad 10 landscape 1180×820 | 543 px | 567 px |
| 1024×768 | 471 px | 531 px |
| Z Fold 6 inner landscape 1116×906 | 513 px | 620 px |
| 820 wide, aspect 0.999 / 1.001 | 620 / 377 px | 568 / 567 px |
| 600 wide, aspect 0.998 / 1.002 | 528 / 287 px | 416 / 414 px |

Nothing at 16:10 or wider moves, because 620 px or the height rule already bound there. Landscape 4:3 and near-square frames get a larger card, exactly half the frame height. Kevin judges that by eye on the iPad during the manual pass.

Vertical placement near square, computed in review with `frameRects` at 820×821: the settled card's top sits at about 0.47 and its bottom at about 0.94 of the frame height, with the blob shadow clipped by the bottom edge. The old portrait side put the bottom past the frame (1.05); the old landscape side sat at 0.31 to 0.64. So near-square is better than one old side and lower than the other. It is the picture Kevin's manual pass step 1 should expect, and the band constants are the knob if it reads too low.

## Item 2 · `perf/hero-harness` into `staging`

Everything measured is in issue #9 (https://github.com/kevinshibuya/portfolio/issues/9) and is not re-derived. Settled here, the three open points:

11. The Measurement glossary group (Rig, Layer 1 / Layer 2 / Layer 3, Scenario, Baseline, Pixel gate, Batch) and the rig-relative invariant, removed from `CONTEXT.md` by `110307f` because the harness was not in the tree, come back in the merge PR, in the current citation style (paths, no line numbers).
12. The harness gets a `docs/architecture.md` section and an index row. No new ADR: ADRs 0006 and 0007 already are its decisions.
13. ADRs 0006 and 0007 lose the "lives on `perf/hero-harness`" note, and their `perf/` and spec citations become ordinary backticked repo-relative paths.
14. **The harness lands partly dormant** (Q15, found in plan review; revised 2026-09-08 on measurement). Measured on the merged tree with `PERF_HARNESS=1`, 38 of 48 instances pass, so the original premise · that these specs "fail deterministically" · was false. What passes is self-certifying and runs by DEFAULT: the e2e specs read exactly two fields of `perf/baseline.json` (`exact.uniformUploadsPerFrame`, `exact.chunkBytesCeiling`), and everything else is an instrumentation contract, an exact counter equality or a pixel comparison · none of which has a "passing by luck" state. The 24 hero goldens pass at every seed because the hero paint was not redesigned, so they ARE a current baseline, and ADR 0007's "goldens regenerate only on a commit that declares visual intent" is only enforceable while they run. Three tests stay behind `PERF_HARNESS=1`, each for a structural reason, not a stale number: `pixel gate › stage-arrival-t2` (the golden is of the August DOM stack; `pixel-gate.spec.ts` counts `#projects .stack-card`, which does not exist · under ADR 0011 the card is a canvas object · and the scene has no `?perf-freeze` hook, so no deterministic stage golden can be baked at all until `SceneRig` honours one); `canvas backing stores match the capped-DPR contract exactly` (the scene is a third canvas, and whether R3F's `dpr={[1, 1.5]}` is the same contract as `Math.round(clientWidth · min(dpr, 1.5))` is undecided); `every emitted chunk is within its recorded byte ceiling` (a measured number, re-baselined on the rig). A fourth, `perf-counters exposes exact per-frame GL work`, is gated for a different reason: it counts frames over a 1 s wall-clock window and asserts `> 10` as a liveness check, which pixel-gate starves when it runs first (measured 8, twice, in the full serial suite). Loosening a threshold to get green is what ADR 0007 forbids, so it waits for a quiet rig. Issue #11 carries all four. Rejected: dormant as a unit, because "stale in part, untrustworthy in whole" describes a noise-banded rig median and not an exact counter or a byte-identical screenshot; and re-baselining inside PR B, unchanged from the original decision · goldens of a redesigned hero would be a snapshot, not a baseline, and ADR 0007 ratchets on measured wins only.

## Item 3 · issue discoverability

15. One new row in `CLAUDE.md`'s "Where things live": pending work with no spec yet lives in the repository's GitHub issues. The table only; `CLAUDE.md` stays at or under 120 lines.

## Shape of the work

One plan, two PRs into `staging`, Opus executes. PR A carries item 1 on its own branch. PR B carries the harness merge, its docs, and the `CLAUDE.md` row, because a branch merge drags its history into the PR and should not share a review with geometry. Each merge into `staging` waits for Kevin's per-action say-so.

## Out of scope

- The seam knobs (`SEAM_WIDTH_EM`, `SEAM_SIGMA_EM`, `SEAM_POWER`) and the seam f ≈ 0.70 artifact.
- `CARD_MAX_PX`, `CARD_MIN_PX`, the caption legibility floor.
- `titleWidthCap` and `titleClearance`. The sweep reports their step; nothing asserts on it.
- Any lerp, spring or debounce on geometry in the consumers.
- The stale boxes in the light-chapter spec and the feedback-wave plan (shipped, not pending).

## TODO

- [x] `sceneGeometry` has no `aspect < 1` fork on `fraction` or `camY`; the `0.46` cap is gone; `CROSSOVER_START` and `CROSSOVER_END` are exported.
- [x] The sweep, the two-sided frame-fit rule and the anchor locks pass in `tests/unit/sceneMotion.test.ts`, and the pre-change function was observed failing the sweep (Task 2's red output is in the PR description).
- [x] The scene e2e scrub also runs at a near-square viewport with zero console errors.
- [x] `docs/architecture.md#card-size` describes the unified formula and the crossover band; `CONTEXT.md` carries **Frame-fit rule** and **Crossover band**.
- [x] PR A open against `staging` with the manual-pass steps in its description.
- [ ] `perf/hero-harness` merged with `staging` per issue #9; `npx tsc -b`, `npm run lint`, `npx vitest run` green on the merged tree.
- [ ] The three named tests skip unless `PERF_HARNESS=1`; the rest of the harness runs in the default suite, which is green with the skips visible; a follow-up issue for the three exists and carries the measured failure set.
- [ ] `CONTEXT.md` carries the Measurement group and the rig-relative invariant again.
- [ ] `docs/architecture.md` has a harness section and index row; ADRs 0006 and 0007 carry no branch note and cite backticked paths.
- [ ] `CLAUDE.md` has the GitHub-issues row and is at most 120 lines.
- [ ] PR B open against `staging` with `Closes #9` in its description.
