# Aspect crossover and harness merge implementation plan

**Goal:** Remove the `aspect = 1` cliff in `sceneGeometry` with one card formula and a smoothstepped camera, land `perf/hero-harness` in `staging` per issue #9, and give GitHub issues a row in `CLAUDE.md`.
**Architecture:** Two branches, two PRs into `staging`, from one plan. Branch A (`fix/aspect-crossover`, Tasks 1 to 6) edits one pure function, its unit tests, one e2e spec and two docs. Branch B (`merge/hero-harness`, Tasks 7 to 11) is a merge of `staging` into `perf/hero-harness` with three known conflicts, followed by a docs pass and one `CLAUDE.md` row. The branches share no files except `CONTEXT.md`, which each touches in a different section, and the harness branch touches neither `CONTEXT.md` nor `docs/architecture.md`, so Branch B does not wait for PR A: Task 7 cherry-picks the records commit, Task 11 merges `staging` again if PR A has landed by then.
**Plan review:** one wave done 2026-09-07 (reviewer on opus, reviewer on fable, codex-review on sol); 2 blockers and 9 smaller findings consolidated into this version. No second wave.
**Spec:** `docs/superpowers/specs/2026-09-07-aspect-crossover-design.md`
**Execution model:** opus. Every formula is derived in the spec with the numbers that justify it; the tasks are contracts with acceptance commands, so the judgement lives here, not in the executor.
## Global constraints

- `main` is FROZEN. Nothing merges into `main`. Both PRs target `staging`.
- A merge into `staging` needs Kevin's per-action say-so, run as `ALLOW_MAIN_MERGE=1 gh pr merge …`. Feature-branch commits, pushes and PR creation need no permission.
- Typecheck is `npx tsc -b`. A bare `npx tsc --noEmit` is a no-op in this repo.
- Before any e2e run: `lsof -ti:4173 | xargs -r kill -9`.
- The verification set: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npx playwright test`. A rendered-surface change adds a headless smoke: loads, root renders, zero console errors.
- TypeScript strict, no `any`, explicit return types on utilities.
- `·` in reader-facing prose, never a spaced em-dash. Docs count as reader-facing here.
- Plan step boxes are ticked immediately after the step's command lands, never batched. Spec TODO boxes are ticked only when the acceptance test passes AND the PR review approves: no task in this plan ticks a spec box. After Kevin's three-leg review approves a PR, one commit on that PR's branch ticks its boxes, then the merge.
- Do NOT add `HANDOFF*.md` to `.git/info/exclude`; `.gitignore` already covers it.
- `FOV_DEG` is 35. Every number in the spec was computed at 35.
- Commit messages end with the session's `Co-Authored-By` and `Claude-Session` trailers.

---

## Branch A · `fix/aspect-crossover`

### Task 1: branch and records

**Files:**
- `docs/superpowers/specs/2026-09-07-aspect-crossover-design.md` — already written; commit as-is
- `docs/superpowers/plans/2026-09-07-aspect-crossover-and-harness-merge.md` — this file; commit as-is

**Work:** From `staging` at `b0d4afe` (or its current tip; `git fetch origin && git status` must show `staging` clean and in sync first), create `fix/aspect-crossover` and commit the two records. No other change in this commit.

**Acceptance check:** `git log --oneline -1` shows the records commit on `fix/aspect-crossover`; `git status` clean.

**Boundaries:** Nothing under `src/` or `tests/` in this task.

- [x] `git fetch origin && git switch staging && git status` clean and in sync; `git switch -c fix/aspect-crossover`
- [x] `git add docs/superpowers/specs/2026-09-07-aspect-crossover-design.md docs/superpowers/plans/2026-09-07-aspect-crossover-and-harness-merge.md && git commit -m "docs: aspect crossover spec and plan"`

### Task 2: the failing tests

**Files:**
- `tests/unit/sceneMotion.test.ts` — modify: add three tests inside `describe('sceneGeometry')`, widen one existing test; nothing outside this list

**Interfaces:**
- Consumes: `sceneGeometry`, `CARD_H`, `CARD_W`, `CARD_Y`, `CARD_MIN_PX` (check the import list; add what is missing), plus `CROSSOVER_START` and `CROSSOVER_END` from Task 3. Import them now. Vitest does not fail on a missing named export: until Task 3 lands they arrive as `undefined`, the rest of the file runs against the OLD function, and that is the point, the sweep is observed red on the old formula.
- Produces: nothing.

**Work:** Three new tests and one widened one. Internal structure, helper names and message strings are yours.

1. **The sweep.** For each width in `[390, 600, 820, 960, 1280]`, step `aspect` from 0.4 to 2.4 in increments of 0.005, with `h = w / aspect` (fractional heights are fine, the function takes numbers). Between consecutive steps assert:
   - `|Δ(fraction · w)| ≤ 8` px
   - `|ΔD| ≤ 0.25`
   - `|ΔcamY| ≤ 0.02 · CARD_W`
   - `|Δlateral| ≤ 0.01 · CARD_W`
   - `|ΔtitleCapPx| ≤ 1` px

   Bounds are about double the smooth formula's steepest slope (measured 2026-09-07: card 3.4 px, `D` 0.10, `camY` 0.0053, `lateral` 0.0033, `titleCapPx` 0.30 per step). Today's function fails every one at the crossing by two orders of magnitude. Do NOT assert on `titleWidthCap` or `titleClearance`: they step by design (spec decision 3). Optionally log their step size in the test name or a comment; do not fail on it.

2. **Frame-fit on both sides.** Widen the existing test `'never lets the card exceed half the frame height on desktop'`: delete the `if (g.aspect < 1) continue` line, rename to drop "on desktop", and sweep every fixture in `VIEWPORTS` plus `[600, 601], [640, 641], [820, 821], [960, 961], [1023, 1024], [705, 1000], [768, 1024], [820, 1180]` in both orientations. Exempt a fixture only when the legibility floor binds, i.e. when `Math.abs(g.fraction - CARD_MIN_PX / g.widthPx) < 1e-9`. Everything else asserts `g.fraction · g.aspect · CARD_H ≤ 0.5 + 1e-9`. Then two standalone assertions, outside the loop, that the exemption predicate is true for `sceneGeometry(844, 390)` and `sceneGeometry(320, 568)`, so the exemption is proven to fire and cannot silently swallow everything (inside the loop it fires for `851×393` only).

3. **Anchors.** Assert `sceneGeometry(393, 852).fraction` is 0.88 (to 10 places) and its `camY` is `CARD_Y + 1.0 · CARD_H` (to 6 places); assert `sceneGeometry(1440, 900).fraction` is 0.4306 (to 3 places) and its `camY` is `CARD_Y + 0.61 · CARD_H` (to 6 places). Also assert `CROSSOVER_START < 1 && 1 < CROSSOVER_END` and that `sceneGeometry(393, 852).aspect ≤ CROSSOVER_START` and `sceneGeometry(1440, 900).aspect ≥ CROSSOVER_END`, so a future band retune that swallows either anchor fails loudly.

Leave every other existing test untouched. In particular `'sizes the card against the frame at each worked viewport'`, `'honours the 620 px design cap in PORTRAIT too'`, `'never lets the caption name fall under 12 px'` and `'lifts the camera above the card centre, higher on a phone'` all stay green under the new formula (verified numerically 2026-09-07) and are the regression net.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` fails, and the failures are the evidence spec TODO box 2 asks for: the sweep fails at the crossing with card jumps of about 240 px at 600 wide and `camY` jumping 0.28 at every width; the frame-fit test fails at `640×641` with about 0.635; the band assertions fail on `undefined`. Keep the output for the PR description. If instead the run fails to load the module, that is a plan defect: report `blocked: <the error>`.

**Boundaries:** Do not touch `src/`. Do not edit or delete any existing assertion other than the one `continue` line and that test's name. On ambiguity, stop and report `blocked: <the specific ambiguity>`.

- [x] Add the imports and the three tests; widen the frame-fit test
- [x] `npx vitest run tests/unit/sceneMotion.test.ts` is red for the expected reason; commit `test(scene): the aspect crossover is continuous and frame-fit holds on both sides`

### Task 3: one card formula, a smoothstepped camera

**Files:**
- `src/utils/sceneMotion.ts` — modify: `sceneGeometry` body and doc comment, two new exported constants, one small helper; nothing outside this list

**Interfaces:**
- Consumes: existing `clamp`, `smoothstep`, `CARD_H`, `CARD_Y`, `CARD_MAX_PX`, `CARD_MIN_PX`, `HALF_FOV_TAN`.
- Produces: `export const CROSSOVER_START = 0.85`, `export const CROSSOVER_END = 1.25` (numbers, aspect units), and a `SceneGeometry` object whose shape is unchanged (no field added or removed).

**Work:** The formulas are load-bearing and derived in the spec; use them as written.

```ts
/** 0 in portrait, 1 in landscape, smoothstepped across the crossover band. */
function crossover(aspect: number): number {
  return smoothstep(clamp((aspect - CROSSOVER_START) / (CROSSOVER_END - CROSSOVER_START), 0, 1))
}
```

Inside `sceneGeometry`:

- `sized` becomes `Math.min(0.88, CARD_MAX_PX / widthPx, 0.5 / (aspect * CARD_H))` with no ternary. The `fraction` floor-and-ceiling line stays exactly as it is.
- `const t = crossover(aspect)`
- `camY = CARD_Y + (1.0 + (0.61 - 1.0) * t) * CARD_H`
- `titleCapPx: clamp(0.09 * widthPx, 72 + (56 - 72) * t, 150)`
- `titleWidthCap` and `titleClearance` keep their `aspect < 1` ternaries unchanged.
- `D`, `spacing`, `lateral`, `titleDistance`, `near`, `far` unchanged.

Document the two constants where they are declared: the band is where the camera height and the title floor blend between the phone values and the desktop values; it is a tuning knob Kevin adjusts by eye; every portrait phone and tablet sits at or under 0.85 (iPad Pro portrait is 0.75, the foldables 0.81 to 0.83) and every landscape tablet at or over 1.25 (iPad landscape starts at 1.33), so only near-square windows land inside it. Rewrite the `sceneGeometry` doc comment to describe the unified formula: the card is a fraction of the frame width bounded by 0.88, the 620 px design cap and half the frame height, on both sides; there is no portrait branch for the card any more; the legibility floor still sits underneath. Delete the long portrait-cap comment inside the old ternary (its history is in `a14042e` and the regression test). Keep the `·` rule in comments where prose reads to a person.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` green, including every pre-existing test. Then `npx tsc -b` and `npm run lint` clean.

**Boundaries:** No change to `CARD_MAX_PX`, `CARD_MIN_PX`, `TITLE_WIDTH_CAP*`, `TITLE_CLEARANCE*`, any seam constant, or any function other than `sceneGeometry` and the new helper. No new field on `SceneGeometry`. If a pre-existing test goes red, that is a plan defect: stop and report `blocked: <test name and numbers>`, do not edit the test.

- [x] Add the constants, the helper, the new `sized`, `camY` and `titleCapPx`; rewrite the two comments
- [x] `npx vitest run tests/unit/sceneMotion.test.ts` green; `npx tsc -b` and `npm run lint` clean
- [x] Commit `fix(scene): one card formula on both sides of square, camera height blends across a band`

### Task 4: the near-square smoke

**Files:**
- `tests/e2e/scene-scrub.spec.ts` — modify: extend the first test's viewport loop; nothing outside this list

**Interfaces:** Consumes the spec's existing `scrollToFraction`, `problems` collector and the short-viewport loop (`for (const height of [400, 260, 220, 180])` at about line 82). Produces nothing.

**Work:** The scene is a rendered surface and a canvas error is invisible to DOM assertions, so the crossover needs the console-error guard at a near-square size. After the short-viewport loop, add a second loop over `[[960, 950], [960, 970], [820, 821], [820, 819]]` that sets the viewport, waits about 400 ms, scrubs to 0.5, waits again, asserts `problems` is empty with a message naming the size, and pushes the size string onto a `visited` array. After the loop, `expect(visited).toEqual(['960x950', '960x970', '820x821', '820x819'])`, so a loop that iterates zero times or skips a size fails on its own. Structure is otherwise yours; match the existing loop's style.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/scene-scrub.spec.ts` passes. Then, once, comment out one of the four sizes and confirm the `visited` assertion goes red, and restore it: that is the proof the loop runs.

**Boundaries:** No other e2e spec. No new fixture file. Do not change the existing sizes.

- [x] Add the loop
- [x] Kill 4173, run the spec, green; commit `test(e2e): the scene scrub also crosses square`

### Task 5: the record

**Files:**
- `docs/architecture.md` — modify: the `### Card size` section and the `titleCapPx` sentence in `### Title`; nothing else in the file
- `CONTEXT.md` — modify: two entries under `### Surface` after **Corridor**, one bullet under `## Invariants`; nothing else in the file

**Work:**

`docs/architecture.md`, `### Card size` (currently one paragraph at about line 175): replace with a paragraph, or two, stating: the card is a fraction of the frame width, `min(0.88, 620/width, 0.5/(aspect · CARD_H))` on both sides of square; the three terms are the phone's edge-to-edge card, the `CARD_MAX_PX` design cap and the frame-fit rule (the card never exceeds half the frame height); there is no portrait branch, the same three terms hold on both sides of square and the frame-fit term is what makes the card continuous through it; the legibility floor `CARD_MIN_PX` 287 px sits underneath and wins on landscape phones and 320 px portrait. Then the camera: `camY` rises from the desktop coefficient 0.61 to the phone coefficient 1.0 across the crossover band `CROSSOVER_START` 0.85 to `CROSSOVER_END` 1.25 by `smoothstep`, tuned by eye, with every real phone and tablet outside the band. Cite `src/utils/sceneMotion.ts` and the spec. Keep the existing sentence about the portrait-cap history if it fits in one clause; otherwise drop it, the regression test carries it.

`docs/architecture.md`, `### Title`, the sentence beginning "`titleCapPx` floors at 56, and at 72 in portrait": rewrite so the floor is 72 at or under the band start and 56 at or over the band end, blended across the crossover band like `camY`; keep the phone-ratio reasoning that follows it.

`CONTEXT.md`, two entries in the file's exact entry format (bold term, one-sentence definition, parenthesised citations, `_Avoid_` line):

- **Frame-fit rule**: The settled card never exceeds half the frame height, on either side of square; the only thing allowed to break it is the caption legibility floor. Cite `src/utils/sceneMotion.ts`, `docs/architecture.md#card-size`. Avoid: dominance cap, 0.46, desktop cap.
- **Crossover band**: The aspect range, 0.85 to 1.25 by default, across which camera height and the title floor blend from their phone values to their desktop values. Cite `src/utils/sceneMotion.ts`, `docs/architecture.md#card-size`. Avoid: regime, breakpoint, portrait mode.

`CONTEXT.md`, `## Invariants`, one bullet: the settled card never exceeds half the frame height except where the 287 px legibility floor binds; a unit test asserts it in both orientations. Cite `tests/unit/sceneMotion.test.ts`.

**Acceptance check:** `grep -n "Portrait is \`min(0.88" docs/architecture.md` returns nothing (the old sentence is gone); `grep -c "half the frame height" docs/architecture.md` is at least 1; `grep -c "CROSSOVER_START" docs/architecture.md` is at least 1; `grep -c "Frame-fit rule\|Crossover band" CONTEXT.md` is at least 2; `git diff -U0 -- docs/architecture.md CONTEXT.md | grep "^+" | grep -c " — "` prints 0.

**Boundaries:** No ADR. No edit to `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`. No other section of either file.

- [x] Rewrite `### Card size` and the `titleCapPx` sentence
- [x] Add the two glossary entries and the invariant
- [x] Run the three greps; commit `docs(scene): card size and the crossover band`

### Task 6: verification and PR A

**Files:** none new. No spec box is ticked in this task (global constraints).

**Work:** Run the full set. Then push and open the PR against `staging`. The PR description carries: the spec's "Visible change" table verbatim, including the vertical-placement row; the Task 2 red output and the Task 3 green output; the manual-pass steps below; which parts were verified by command. Then stop: the review and the merge are Kevin's to trigger.

Manual-pass steps for the description:

1. Desktop, `npm run dev` already running. Snap the browser to the left half of the screen. Scroll to Selected Work. Drag the window's right edge slowly through square (watch for the width to pass the height). Expect: the card resizes smoothly, the camera height drifts, no jump. Near square the card sits low in the frame, top at about 0.47 and bottom at about 0.94 of the frame height at 820×821, with the blob shadow clipped by the bottom edge. That is the spec's expected picture, better than the old portrait side (bottom past the frame) and lower than the old landscape side (bottom at 0.64). Judge whether the default band 0.85 to 1.25 is right or whether `CROSSOVER_START` and `CROSSOVER_END` want tuning; that tuning is yours and stays green under the tests.
2. Same window, open and close devtools docked to the side while settled on card 2. Expect: no jump.
3. iPad, landscape, Safari. Expect: the card reads a little larger than before (567 px on a 10th-gen iPad, was 543), exactly half the frame height. Judge whether it dominates.
4. iPhone portrait and landscape. Expect: unchanged.

**Acceptance check:**

```
npx tsc -b && npm run lint && npx vitest run
lsof -ti:4173 | xargs -r kill -9; npx playwright test
```

All green. `gh pr create --base staging` succeeds and prints the URL.

**Boundaries:** Do not merge. Do not touch `staging`.

- [x] Verification set green, output kept for the PR description
- [x] `git push -u origin fix/aspect-crossover`; `gh pr create --base staging` with the description above; stop

---

## Branch B · `merge/hero-harness`

Branch B does not wait for PR A. The harness branch touches neither `CONTEXT.md` nor `docs/architecture.md` (verified against the merge base 2026-09-07), so the two PRs only meet in `CONTEXT.md`, in different sections, and `staging` resolves that when the second one lands. Task 7 brings the spec and plan onto this branch by cherry-pick so they have a home here too.

### Task 7: the merge

**Files:**
- `CLAUDE.md` — conflict: take `staging`'s version wholesale
- `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` — conflict: take `staging`'s copy
- `package-lock.json` — conflict: take `staging`'s copy, then `npm install`, commit the result
- Everything else merges clean and is not edited in this task

**Work:** `git fetch origin && git switch -c merge/hero-harness origin/perf/hero-harness && git merge staging`. Exactly three files conflict (verified in issue #9, 2026-09-06). Resolve as listed; do not hand-merge the lockfile. If a fourth file conflicts, stop and report `blocked: unexpected conflict in <path>`. Issue #9 says the branch is local-only; that is stale, `origin/perf/hero-harness` exists and is the base here.

`CLAUDE.md` after resolution is byte-identical to `staging`'s: the perf facts belong in `docs/architecture.md` (Task 9), not in the every-turn file.

Note for the verification: `eslint.config.js` scopes every rule block to `**/*.{ts,tsx}`, so `perf/*.mjs` is not linted and cannot fail lint. The merge also changes `playwright.config.ts` (workers 2 to 1, a new `webServer` command), so the e2e suite runs slower from here on. The harness spec and plan (`docs/superpowers/{specs,plans}/2026-08-16-hero-perf-harness*.md`) arrive with the merge and are live records from this point, not archive material.

**Acceptance check:** `git diff --name-only --diff-filter=U` empty; `git diff staging -- CLAUDE.md docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` empty; then `npx tsc -b && npm run lint && npx vitest run` green on the merged tree. e2e is NOT run in this task: the merge brings harness specs that fail on today's build by design, and Task 7a gates them before the suite runs.

**Boundaries:** No edits beyond conflict resolution and the lockfile regeneration in this task. Do not run `npm run perf` or any harness script; the harness measures on Kevin's rig only (ADR 0006).

- [x] Branch from `origin/perf/hero-harness`, `git merge staging`, confirm exactly three conflicts
- [x] Resolve the three as listed; `npm install`; `git add -A && git commit` (merge commit, message `Merge staging into perf/hero-harness per issue #9`)
- [x] `git cherry-pick <records commit from Task 1>` so the spec and plan exist on this branch; if PR A has already landed in `staging` the cherry-pick is empty, skip it · skipped: PR A landed, both files arrived with the merge
- [x] `npx tsc -b && npm run lint && npx vitest run` green

### Task 7a: the harness lands dormant

**Files:**
- `tests/e2e/perf-budget.spec.ts` — modify: gate the five harness-added tests; the two pre-existing tests stay ungated
- `tests/e2e/pixel-gate.spec.ts` — modify: gate the whole file
- `tests/e2e/perf-hooks.spec.ts` — modify: gate the whole file
- Nothing outside this list. `perf/baseline.json` and the goldens under `tests/e2e/` are not edited.

**Interfaces:** Produces the convention `PERF_HARNESS=1` enables the harness's e2e specs; unset, they skip. Task 9's architecture section states it.

**Work:** Spec decision 15. The harness's Layer 1 assertions and pixel goldens were recorded against the August site (base `e66becd`): `perf/baseline.json` lists byte ceilings for 20 chunks and none for three, R3F or postprocessing; the goldens show the pre-redesign hero; the exact draw-count tests assume the harness's own FluidWaves draw path. On the merged tree they fail deterministically, and re-baselining is a campaign decision (ADR 0007) for a perf session on the rig, not for this merge. So they land dormant.

First create the follow-up issue: `gh issue create --title "perf harness: re-baseline against the current site" --body "<one paragraph: what is dormant, why (ceilings for 20 chunks, goldens of the August hero, exact draw counts), how to run (PERF_HARNESS=1 npx playwright test), and that re-baselining follows ADR 0006 and 0007: on the rig, on measured evidence>"`. Note its number, N.

Then the gate. In each of the three files, `const HARNESS = process.env.PERF_HARNESS === '1'` and a skip with the reason string `dormant until re-baselined against the current site, issue #N; run with PERF_HARNESS=1`:

- `pixel-gate.spec.ts`: `test.skip(!HARNESS, reason)` at the top of the `test.describe('pixel gate')` block, or file-level `test.skip(({}, testInfo) => …)` if that reads cleaner; the `beforeAll` must not run when skipped, so place the skip so it precedes the hooks (a `test.describe` wrapper with the skip as its first statement is the simple form).
- `perf-hooks.spec.ts`: the same, wrapping all four tests.
- `perf-budget.spec.ts`: wrap exactly these five tests in a `test.describe('harness Layer 1', () => { test.skip(!HARNESS, reason); … })`: `canvas backing stores match the capped-DPR contract exactly`, `hero GL work is exactly one draw + one uniform upload per frame, from one loop`, `hero canvas pauses off-screen: zero frames while paused`, `reduced motion: static frame, no loop, at most three startup draws`, `every emitted chunk is within its recorded byte ceiling`. The tests `CLS is zero across loader handoff and section enters` and `no long task > 200ms during scroll` are `staging`'s, ran before the merge, and stay ungated. If the merged file's structure makes the wrap ambiguous (a shared `beforeEach` the two groups both need, say), report `blocked: <what>` rather than guessing.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test --reporter=list 2>&1 | tail -40` shows the whole suite green with the gated tests listed as skipped and the two ungated perf-budget tests passed. Then `PERF_HARNESS=1 npx playwright test tests/e2e/pixel-gate.spec.ts --reporter=list 2>&1 | tail -20` shows them RUN (red is expected today, and the failures are the evidence for issue #N; paste the first failure line into the issue as a comment).

**Boundaries:** No change to what any harness test asserts. No edit to `perf/`, `playwright.config.ts`, or any golden. Do not delete or `test.fixme` a test; the gate is the env var and nothing else.

- [ ] `gh issue create` as above; note N
- [ ] Gate the three files
- [ ] Default suite green with the skips visible; `PERF_HARNESS=1` run observed running; comment the first failure line on issue #N
- [ ] Commit `test(e2e): the perf harness lands dormant behind PERF_HARNESS=1`

### Task 8: the Measurement glossary returns

**Files:**
- `CONTEXT.md` — modify: a `### Measurement` group under `## Language`, after `### Records`; one bullet under `## Invariants`; nothing else in the file

**Work:** Restore the six terms `110307f` removed, with their definitions verbatim from that commit (`git show 110307f -- CONTEXT.md`, the `-` lines): **Rig**, **Layer 1 / Layer 2 / Layer 3**, **Scenario**, **Baseline**, **Pixel gate**, **Batch**. Adjust only the citations, to the current style: paths without line numbers, and drop the `HANDOFF.md:32-34` citation on **Baseline** (the file is untracked). Keep each `_Avoid_` line that existed. Restore the invariant bullet: performance numbers are rig-relative; a run on a mismatched or busy rig never updates a baseline. Cite the harness spec path and `perf/lib/load.mjs`.

**Acceptance check:** `grep -c "^\*\*\(Rig\|Layer 1 / Layer 2 / Layer 3\|Scenario\|Baseline\|Pixel gate\|Batch\)\*\*" CONTEXT.md` prints 6; `grep -n "rig-relative" CONTEXT.md` hits once; every path cited in the new lines exists (`for p in $(grep -o 'perf/[A-Za-z0-9_./-]*' CONTEXT.md | sort -u); do test -e "$p" || echo MISSING $p; done` prints nothing).

**Boundaries:** Do not add the `Ledger` or `HANDOFF.md` terms or the "Where the records live" table that the same commit removed; PR #8 dissolved those on purpose. Do not touch the **Frame-fit rule** and **Crossover band** entries from PR A.

- [ ] Add the group and the invariant
- [ ] Run the three checks; commit `docs: the Measurement glossary is true again`

### Task 9: the harness has a home in the docs

**Files:**
- `docs/architecture.md` — modify: one new `## Performance harness` section after `## Content model`, one new index row; nothing else in the file
- `docs/adr/0006-performance-is-measured-on-one-local-rig.md` — modify: lines 3, 5, 9, 13, 19
- `docs/adr/0007-optimizations-kept-only-on-measured-evidence.md` — modify: lines 3, 5, 23

**Work:**

Architecture section, about twelve lines, every sentence traceable to `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md` or a comment in `perf/run.mjs`, `perf/lib/load.mjs`, `perf/lighthouse.mjs`; invent nothing. Cover: what the harness measures and on what (one rig, ADR 0006); the three layers (Layer 1 exact budgets in e2e, Layer 2 scenarios, Layer 3 Lighthouse) and the pixel gate; the commands `npm run perf`, `npm run perf:lh`, `npm run perf:selftest`; where the baseline lives (`perf/baseline.json`) and that kept wins ratchet it; that a batch is kept or reverted on the measurement alone (ADR 0007); and that the harness's e2e specs (`pixel-gate`, `perf-hooks`, the Layer 1 half of `perf-budget`) are dormant, skipping unless `PERF_HARNESS=1`, until re-baselined against the current site (the issue Task 7a created). Point at the spec as the deep record. Index row: `| Performance harness | \`perf/run.mjs\`, \`perf/lib/\`, \`perf/scenarios/\`, \`perf/baseline.json\` | [Performance harness](#performance-harness) |`, placed last.

ADRs: delete the `**Note:** the harness this ADR describes lives on the …` line in each (line 3, plus its following blank line if that leaves two). Backtick the spec path cited unbackticked in parentheses on line 5 of each ADR. Backtick `perf/run.mjs` on 0006 line 9 and `perf/lib/load.mjs` on line 13. Rewrite 0006 line 19 and 0007 line 23 from "On the `perf/hero-harness` branch: …" to a plain citation line in the style the other ADRs use, with each path backticked: the spec path, `perf/run.mjs`, `perf/lib/load.mjs` for 0006; the spec path for 0007.

**Acceptance check:** `grep -rn "perf/hero-harness" docs/adr/` returns nothing (the branch reference is gone; the spec filename `hero-perf-harness-design` legitimately remains); `grep -n "perf/\|hero-perf-harness-design" docs/adr/0006*.md docs/adr/0007*.md | grep -v '\`[^\`]*\(perf/\|hero-perf-harness-design\)[^\`]*\`'` prints nothing (every path is inside backticks); `grep -c "Performance harness" docs/architecture.md` prints 2 (index row, heading); every path in the new section exists (same loop as Task 8 against `docs/architecture.md`).

**Boundaries:** No new ADR. No other section of `docs/architecture.md`. No edit to the harness spec or plan.

- [ ] Write the section and the index row
- [ ] Edit the two ADRs
- [ ] Run the checks; commit `docs: the performance harness has a home`

### Task 10: issues are discoverable

**Files:**
- `CLAUDE.md` — modify: one row in the `## Where things live` table; nothing else in the file

**Work:** After the row `| Records of retired systems | \`docs/superpowers/archive/\` |`, add `| Pending work that has no spec yet | GitHub issues on the repository |`. Nothing else changes.

**Acceptance check:** `wc -l CLAUDE.md` prints at most 120 (it is 97 on `staging` today, so 98 after); `git diff staging -- CLAUDE.md` is exactly one added line.

**Boundaries:** No other row, no rewording of any other line.

- [ ] Add the row; run the two checks; commit `docs: pending work has a home in the table`

### Task 11: verification and PR B

**Files:** none new. No spec box is ticked in this task (global constraints).

**Work:** `git merge staging` again if PR A landed since Task 7 (a clean merge; both branches add to `CONTEXT.md` in different sections). Run the set. Push and open the PR against `staging` with `Closes #9` in the description, the three-file resolution as applied, the list of docs restored or added, a note that the branch note came off ADRs 0006 and 0007, and the Task 7a decision as applied. Then stop: the review and the merge are Kevin's.

**Acceptance check:**

```
npx tsc -b && npm run lint && npx vitest run
lsof -ti:4173 | xargs -r kill -9; npx playwright test
```

All green. `gh pr create --base staging` prints the URL.

**Boundaries:** Do not merge. Do not touch `staging` or `main`.

- [ ] Verification set green
- [ ] `git push -u origin merge/hero-harness`; `gh pr create --base staging`; stop
