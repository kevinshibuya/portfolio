# E2e two suites implementation plan

**Goal:** Split the Playwright suite into a quick suite and a full suite, scope mobile to viewport-dependent specs, and build once per run, per ADR 0013, without losing an assertion.
**Architecture:** `playwright.config.ts` selects the suite from `E2E_SUITE` (`quick` or unset = full) and scopes each project with `testMatch` lists. `scripts/e2e.sh` builds once, serves that build on 4173 for the whole run (Playwright reuses it, `reuseExistingServer` is already true off CI), and runs the full suite in chunks against it. A new `smoke.spec.ts` absorbs the duplicated console-clean mount checks.
**Spec:** `docs/adr/0013-e2e-runs-in-two-suites.md` (glossary: `CONTEXT.md` › Verification)
**Execution model:** opus

## Global constraints

- **No assertion is lost.** A test that moves keeps every `expect` it had, verbatim in intent; a moved test is deleted from its old file in the same commit.
- **Quick suite, exactly:** `scene-scrub`, `stream`, `scene-no-webgl`, `frieze-surface`, `pixel-gate`, `scene-reduced-motion`, `smoke`. Desktop (`desktop-chromium`) only.
- **Mobile (`mobile-chromium`) runs exactly:** `scene-scrub`, `stream`, `scene-no-webgl`, `frieze-surface`, `frieze-click`, `light-chapter`, `nav-on-light`, `hero-dissolve`, `pixel-gate`, `smoke`; plus `perf-budget` only when `PERF_HARNESS=1` (its dormant DPR test needs Pixel 5's capped path). `scene-no-webgl`, `smoke` and the harness rule amend the ADR's list; see Task 6.
- **Expected `--list` counts** (measured 2026-10-06, before: 185 = 90 desktop + 90 mobile + 5 hidpi): full **155** (90 + 60 + 5), full under `PERF_HARNESS=1` **162**, quick **48**.
- **`desktop-hidpi`** keeps `testMatch: /frieze-surface\.spec\.ts$/` and runs in the full suite only.
- **A bare `npx playwright test` is the full suite** and keeps building through `webServer` as today.
- **`workers: 1` stays.** Its comment stays; `pixel-gate` asserts it.
- **Kill 4173 before any direct Playwright run:** `lsof -ti:4173 | xargs -r kill -9`.
- TypeScript strict, no `any`. `npx tsc -b` checks `src` only: neither tsconfig includes `tests/` or `playwright.config.ts`. For the files this plan touches, the typecheck is
  `npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --types node playwright.config.ts tests/e2e/*.spec.ts`
  and the bar is **no errors beyond the 3 pre-existing ones** in `stream.spec.ts` (lines ~40/176/179, `count` on `FriezeBlockExtent`). Run `npx tsc -b` as well.
- Tick each `- [ ]` the moment its step lands, never in a batch (CLAUDE.md, "Spec and plan checkbox discipline").

## Baseline, for the record

Measured 2026-10-06 on the rig, five chunks, list reporter: full suite **22.2 min** of test time before builds (7.6 + 1.7 + 3.3 + 2.7 + 6.9 min, pre-`stream.spec`); with `stream.spec` (#21's head) **27.7 min** (7.6 + 1.9 + 3.5 + 6.6 + 8.1). Each chunk also ran its own `npm run build` and `wrangler dev` start.

---

### Task 1: The smoke spec

**Files:**
- `tests/e2e/smoke.spec.ts` — create: three tests moved in from the files below
- `tests/e2e/dark-tokens.spec.ts` — delete (its one test moves)
- `tests/e2e/hero-shader.spec.ts` — modify: remove `'hero shader canvas mounts with zero console errors'` (it moves); the off-screen pause and reduced-motion tests stay
- `tests/e2e/contact-waves.spec.ts` — modify: remove `'backdrop mounts lazily on approach; canvas budget is exactly 2'` (it moves); the reduced-motion describe stays

nothing outside this list

**Interfaces:**
- Produces: `tests/e2e/smoke.spec.ts`, the file name Task 2's quick list matches.

**Work:** Move the three tests into `smoke.spec.ts` as three separate tests, titles unchanged, bodies unchanged apart from shared helpers (a console-error collector may be factored into one local function; any `page.on` wiring must still attach before `page.goto`). Keep each original comment that explains an assertion. Internal ordering is your choice.

Copy `contact-waves.spec.ts`'s file-level comment about `scrollIntoViewIfNeeded` into `smoke.spec.ts` with the test that relies on it.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/smoke.spec.ts tests/e2e/hero-shader.spec.ts tests/e2e/contact-waves.spec.ts --project=desktop-chromium` → all pass. `expect(` counts:
- the three moved tests hold **11** (dark-tokens 3, hero-shader mount 2, contact-waves budget 6) and `smoke.spec.ts` holds 11;
- the before-total across `dark-tokens`, `hero-shader` and `contact-waves` (`git show HEAD:<file> | grep -c 'expect('`) equals `smoke` plus what remains in `hero-shader` and `contact-waves`.

Red state before the task: `smoke.spec.ts` does not exist.

**Boundaries:** Do not change an assertion's threshold, selector or timeout. Do not touch `loader.spec.ts`: its in-flight timing test stays in the full suite as it is.

- [x] Create `smoke.spec.ts` with the three moved tests
- [x] Remove them from `hero-shader.spec.ts` and `contact-waves.spec.ts`; delete `dark-tokens.spec.ts`
- [x] Count `expect(` before and after; they match
- [x] Typecheck (the Global constraints command, plus `npx tsc -b`), `npx eslint tests/e2e`
- [x] Run the acceptance check; commit `test(e2e): one smoke spec for the console-clean mount checks`

---

### Task 2: Suite selection and mobile scope in the config

**Files:**
- `playwright.config.ts` — modify: `E2E_SUITE`, the two spec lists, per-project `testMatch`

nothing outside this list

**Interfaces:**
- Consumes: `tests/e2e/smoke.spec.ts` (Task 1).
- Produces: env var `E2E_SUITE`. `quick` selects the quick suite; unset or `full` is the full suite; any other value throws at config load with a message naming the two valid values.

**Work:** Load-bearing shape (names binding, formatting yours):

```ts
const QUICK_SPECS = ['scene-scrub', 'stream', 'scene-no-webgl', 'frieze-surface', 'pixel-gate', 'scene-reduced-motion', 'smoke']
const MOBILE_SPECS = ['scene-scrub', 'stream', 'scene-no-webgl', 'frieze-surface', 'frieze-click', 'light-chapter', 'nav-on-light', 'hero-dissolve', 'pixel-gate', 'smoke']
// + 'perf-budget' on mobile when process.env.PERF_HARNESS === '1'
const specs = (names: string[]): RegExp => new RegExp(`/(${names.join('|')})\\.spec\\.ts$`)
```

- Full suite: `desktop-chromium` matches every spec; `mobile-chromium` matches `MOBILE_SPECS` (plus `perf-budget` under the harness); `desktop-hidpi` unchanged.
- Quick suite: only `desktop-chromium`, matching `QUICK_SPECS`. The other two projects are absent from the array, not merely empty.
- A comment above the lists cites ADR 0013 and says a new viewport-dependent surface joins `MOBILE_SPECS` in the PR that adds it.
- The `workers: 1` comment is untouched. `webServer` is untouched.

**Acceptance check:** `--list` does not start the server (it skips global setup and `webServer`).
- `npx playwright test --list | tail -1` → `Total: 155 tests`. Before the task it reads 185.
- `PERF_HARNESS=1 npx playwright test --list | tail -1` → `Total: 162 tests`.
- `E2E_SUITE=quick npx playwright test --list | tail -1` → `Total: 48 tests`, every line `[desktop-chromium]`, from exactly the seven quick files.
- `E2E_SUITE=nope npx playwright test --list` → exits non-zero with the message.
- `PERF_HARNESS=1 npx playwright test --list --project=mobile-chromium | grep -c perf-budget` → 7; without the env → 0.
- A count that differs is a finding: record why before going on.

Red state: before the task, `E2E_SUITE=quick` is ignored and lists all 185.

**Boundaries:** No spec file changes. If a spec in either list does not exist on disk, stop: `blocked: <name> missing`.

- [x] Record `npx playwright test --list | tail -1` before the change
- [x] Add the lists, the `E2E_SUITE` switch and per-project `testMatch`
- [x] Typecheck (the Global constraints command, plus `npx tsc -b`), `npm run lint`
- [x] Run the `--list` checks; record the counts in this plan's Record section
- [x] Commit `test(e2e): quick and full suites; mobile only where the viewport matters`

---

### Task 3: Perf timing behind the harness

**Files:**
- `tests/e2e/perf-budget.spec.ts` — modify: gate `'no long task > 200ms during scroll'` behind `PERF_HARNESS`

nothing outside this list

**Work:** Add `test.skip(!HARNESS, STARVED)` as the first line of that test, matching the file's existing pattern for starved throughput assertions. `STARVED` and `HARNESS` already exist in the file. The CLS test and every other test stay as they are; they are deterministic.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/perf-budget.spec.ts --project=desktop-chromium` → the long-task test reports skipped with the `STARVED` reason; nothing fails. Red state: before, it runs and asserts.

**Boundaries:** No threshold changes anywhere in the file.

- [x] Gate the test
- [x] Run the check; commit `test(perf): long-task timing runs under the harness only`

---

### Task 4: `scripts/e2e.sh`, one build per run

**Files:**
- `scripts/e2e.sh` — create, executable
- `package.json` — modify: `test:e2e` → `scripts/e2e.sh full`; add `test:e2e:quick` → `scripts/e2e.sh quick`

nothing outside this list

**Interfaces:**
- Consumes: `E2E_SUITE` (Task 2).
- Produces: `scripts/e2e.sh <quick|full> [extra playwright args…]`, exit 0 only if every chunk passed.

**Work:** One BUILD per run; one server per chunk, serving that build. The protocol that kept full runs alive restarted the server between chunks (`HANDOFF.md`: "`lsof -ti:4173 | xargs -r kill -9; pkill -f "workerd serve"` before every one"). A server held open for ~25 minutes is the untested case, so do not create it. Binding behaviour, in order:

1. `#!/bin/bash` with `set -euo pipefail`, written for macOS's bash 3.2:
   - no `mapfile`;
   - never expand a possibly empty array as `"${arr[@]}"` under `set -u` (use `${arr[@]+"${arr[@]}"}`).
2. Reject any first argument other than `quick` or `full`, with usage.
3. `lsof -ti:4173 | xargs -r kill -9`.
4. `npm run build`, once. Fail fast on error. Record `dist/index.html`'s mtime.
5. For each run unit (quick: one; full: each chunk):
   - start `npx wrangler dev --port 4173` in the background, in its own process group, logging to a `mktemp` file;
   - poll `http://localhost:4173` until it answers 200, for up to 120 s; on timeout, print the log tail and fail;
   - run Playwright with `DEBUG=pw:webserver`, and fail the unit unless its output contains `WebServer is already available` (`node_modules/playwright/lib/plugins/webServerPlugin.js:78`). This is the only proof Playwright did not start, and silently rebuild, a server of its own;
   - after the unit, assert `dist/index.html`'s mtime is unchanged;
   - kill the server's process group (by PID, never a blanket `pkill workerd`, which could take down the developer's running dev server), and wait until `lsof -ti:4173` is empty.
6. `quick`: `E2E_SUITE=quick npx playwright test "$@"`.
7. `full`: the spec files in `ls` order, in chunks of 4. Run `npx playwright test --pass-with-no-tests <chunk files> "$@"` per chunk; `--pass-with-no-tests` keeps a `--grep` or `--project` filter from failing chunks it does not match. Keep going after a failed chunk.
8. A `trap` on `EXIT` kills the current server group. Separate `INT` and `TERM` traps also `exit 130` / `exit 143`, so a Ctrl-C ends the run instead of starting the next chunk.
9. Print one summary line per unit: its files, exit code, and Playwright's final counts. Exit non-zero if any unit failed.

Playwright reuses the server because `reuseExistingServer` is true off CI. The script must not set `CI`. Structure and log format are your choice.

**Acceptance check:**
- `scripts/e2e.sh bogus` exits non-zero with usage.
- `scripts/e2e.sh quick` exits 0, its log shows the reuse line, and `lsof -ti:4173` prints nothing afterwards.
- `scripts/e2e.sh full` exits 0, with five summary lines and one build. This is the first run of the `full` path, so it is checked here and not left to Task 5.
- A negative check: run `scripts/e2e.sh quick --grep zzz-no-such-test`. Quick must exit 1 ("No tests found"); `full` with the same grep must exit 0 through `--pass-with-no-tests`. Record both.

Red state: the script does not exist.

**Boundaries:** Do not edit `playwright.config.ts`'s `webServer`; a bare `npx playwright test` must keep building as before. Do not add a dependency.

- [x] Write the script; `chmod +x`
- [x] Wire the two npm scripts
- [x] Run `scripts/e2e.sh bogus`, then `scripts/e2e.sh quick`; record its wall time
- [x] Confirm 4173 is free afterwards
- [x] Run the two `--grep zzz-no-such-test` checks
- [x] Run `scripts/e2e.sh full`; record wall time and the per-chunk lines
- [x] Commit `test(e2e): one build and one server per run`

---

### Task 5: Fixed waits become condition waits

**Files:**
- every `tests/e2e/*.spec.ts` that calls `page.waitForTimeout` — modify

nothing outside `tests/e2e/`

**Ruling:** Kevin approved "fixed waits become condition waits wherever a condition exists" with the design on 2026-10-06. ADR 0013 does not record it yet; Task 6 adds it.

**Excluded:** `scene-scrub.spec.ts` is not touched at all. It is the only guard for canvas runtime errors, and its waits are the windows in which those errors happen.

**Work:** For each `waitForTimeout`, decide what it was waiting for:
- **An observable condition exists** (an attribute, a class, a scroll position, an element count, a `data-*` state the app already writes): replace the wait with `expect.poll`, `locator.waitFor`, `expect(locator).toHaveAttribute`, or `page.waitForFunction` on that condition, with a timeout at least as long as the old wait.
- **The wait is a sampling window** (count frames or draws over N ms, let startup draws land before sampling, measure CLS across an interval): keep it, and make sure a one-line comment says it is a window, not a wait.
- **The wait precedes an assertion that something did NOT happen** (`expect(errors).toEqual([])`, a scroll that must not move, a before/after screenshot pair, "no pill left painted"): **keep it.** A condition that is already true would make the absence check run instantly and pass for nothing. Examples in `stream.spec.ts` near lines 160, 254, 340 and 351, and `frieze-surface.spec.ts` near 183/187. Mark each with a one-line `// window: absence check` comment.
- **Unsure:** keep the wait and add `// TODO(e2e-waits): <what it might be waiting for>` rather than guess.

Do not add `data-*` attributes to app code to create a condition; app code is outside this task.

**Acceptance check:**
- Run `grep -c waitForTimeout tests/e2e/*.spec.ts | awk -F: '{s+=$2} END {print s}'` before and after, and record both in the Record section.
- The Record section lists every replaced site as `file:line · old wait ms · the condition now awaited`. A replacement without a row is reverted.
- `scripts/e2e.sh full` must exit 0.
- Red state: none. This is a refactor, so the suite is green before and must stay green.

**Boundaries:** No threshold, selector or assertion changes beyond the wait being replaced. If a replacement makes a test flaky across two runs, revert that one site and keep the wait with a comment saying why.

- [x] Record the before count
- [x] Replace waits spec by spec, running each touched spec on desktop as you go (`npx playwright test <file> --project=desktop-chromium`)
- [x] Record the after count
- [x] Typecheck (the Global constraints command, plus `npx tsc -b`), `npm run lint`
- [x] `scripts/e2e.sh full` green; commit `test(e2e): condition waits where a condition exists`

---

### Task 6: Docs

**Files:**
- `CLAUDE.md` — modify: "Verification"
- `docs/adr/0013-e2e-runs-in-two-suites.md` — modify, with these amendments:
  - the mobile list gains `scene-no-webgl` and `smoke`;
  - `perf-budget` runs on mobile under the harness;
  - the script builds once and restarts the server per chunk of 4;
  - fixed waits become condition waits, with the keep rules from Task 5.
- `README.md` — modify only if it documents how to run e2e; otherwise leave it

nothing outside this list

**Work:** Load the `writing-for-agents` skill before editing `CLAUDE.md`. In "Verification":
- "The set" becomes: `npx tsc -b`, `npm run lint`, `npx vitest run`, then `npm run test:e2e:quick` in a PR's fix loop and `npm run test:e2e` (the full suite) once on the final head before asking for the `staging` merge.
- The kill-4173 rule stays, scoped to direct `npx playwright test` runs; the script does it itself.
- Name ADR 0013.

In ADR 0013, add a dated "Amended in planning" section:
- `scene-no-webgl` joins the mobile list: the no-WebGL archive is a normal-flow layout that changes at phone width, and nothing else renders it on a phone.
- `smoke` joins the mobile list: the canvas budget depends on IntersectionObserver against the viewport, and no other mobile spec checks it.
- `perf-budget` runs on mobile under `PERF_HARNESS`: its dormant DPR test needs Pixel 5's capped path.
- One build per run; the server restarts per chunk of 4, because a long-lived server is the untested memory case.
- Fixed waits become condition waits, except sampling windows, windows before an absence assertion, and all of `scene-scrub`.

The ADR's "one server" line is corrected to match.

**Acceptance check:**
- `grep -n "test:e2e:quick\|0013" CLAUDE.md` shows the new lines.
- `grep -n "scene-no-webgl" docs/adr/0013-e2e-runs-in-two-suites.md` shows the amendment.
- The two spec lists in the ADR match `QUICK_SPECS` and `MOBILE_SPECS` in `playwright.config.ts` exactly. Compare by eye; record "match" here.

**Boundaries:** No other CLAUDE.md section changes.

- [x] Edit CLAUDE.md "Verification"
- [x] Amend ADR 0013
- [x] Check README for an e2e how-to
- [x] Run the greps; compare the lists
- [x] Commit `docs: the quick and full suites in CLAUDE.md; ADR 0013 amendments`

---

### Task 7: Measure, push, PR

**Files:** none changed (this plan's Record section only)

**Work:**
1. Run `npm run test:e2e:quick` and `npm run test:e2e` on a quiet machine. Check the load average with `uptime` first, and note it.
2. Record wall time and counts for both runs against the baseline above.
3. Push `chore/e2e-two-suites` and open a PR into `staging`. The body states:
   - the before/after times;
   - the coverage that left the per-PR loop;
   - the mobile runs that were dropped;
   - the ADR.
4. Stop. The merge into `staging` needs Kevin's per-action say-so.

**Acceptance check:** both runs exit 0; the PR exists.

- [x] Quick suite: time and counts recorded
- [x] Full suite: time and counts recorded
- [x] Grep this file for remaining `- [ ]` outside Task 7; none
- [x] Push and open the PR

---

## Record

_Filled in during execution._

**Task 1 (2026-10-07).** `expect(` before: dark-tokens 3 + hero-shader 4 + contact-waves 7 = 14. After: smoke 11 + hero-shader 2 + contact-waves 1 = 14. Acceptance run: 6 passed.

**Task 2 (2026-10-07).** `--list` before: 185. After: full 155, `PERF_HARNESS=1` 162, quick 48 (7 files, every line `[desktop-chromium]`). `E2E_SUITE=nope` exits 1 with the message. `perf-budget` on mobile: 7 under the harness, 0 without. All as expected.

**Task 4 (2026-10-07).** `scripts/e2e.sh bogus` exits 2 with usage. `quick`: exit 0, wall **541 s** (44 passed, 4 skipped, 8.9 min of test time), load average 2.2, reuse line present, 4173 free afterwards. `quick --grep zzz-no-such-test` exits 1 (`No tests found`); `full` with the same grep exits 0 through `--pass-with-no-tests`, all six chunks reusing the server. `full`: exit 0, wall **1427 s** (23.8 min), one build, load average 6 to 7 throughout. Drift: 21 spec files in chunks of 4 make **six** chunks, not five; the chunk size is the ADR's, so six it is. Per chunk:
- contact-waves, frieze-click, frieze-surface, hero-dissolve · 26 passed, 2 skipped · 6.4 min
- hero-entrance, hero-shader, light-chapter, loader · 20 passed · 1.0 min
- nav-on-light, perf-budget, perf-hooks, pixel-gate · 34 passed, 11 skipped · 2.6 min
- reduced-motion, rows-hover, scene-effects, scene-no-webgl · 6 passed, 1 skipped · 0.8 min
- scene-reduced-motion, scene-scrub, section-enters, smoke · 31 passed · 5.5 min
- stream · 21 passed, 3 skipped · 7.0 min

155 tests, matching `--list`; 23.3 min of test time against 27.7 at baseline.

**Task 5 (2026-10-07).** `waitForTimeout` across `tests/e2e/*.spec.ts`: before **50**, after **41**. `scene-scrub` (6) untouched. Replaced sites, as `file:line · old wait · condition now awaited` (lines are the pre-task ones):
- `light-chapter.spec.ts:188` · 600 ms · `expect.poll` on the row title's computed colour reaching its hover tint (5 s)
- `section-enters.spec.ts:32` · 900 ms · `expect.poll` on the title's opacity passing 0.99 (5 s)
- `frieze-surface.spec.ts:239` · 600 ms · the `not.toHaveAttribute('data-frieze-gen', before)` that already followed (`rasterBudgetMs()`)
- `stream.spec.ts:202` · 600 ms · the stream region's PT accessible name, `todos os trabalhos` (`waitFor`)
- `stream.spec.ts:305` · 1200 ms · `location.hash === '#work'` (5 s), then `settledScrollY` (10 still frames, up to 4 s)
- `stream.spec.ts:414` · 1200 ms · the same pair
- `stream.spec.ts:421` · 400 ms · `expect.poll` on the focused row's id equalling the last row's (5 s)
- `stream.spec.ts:447` · 600 ms · the auto-retrying `toHaveCount` pair that already followed (region 1, rows `ROWS`)
- `stream.spec.ts:489` · 1600 ms · `settledScrollY` (up to 4 s)

Kept, each with a `// window:` comment: 32 sites, sampling windows and windows before an absence assertion. Two traps found while classifying: `nav-on-light`'s 200 ms scroll helper looks like a plain settle, but two of its callers assert the nav *stays* on-light, which is already true before the scroll lands. And `stream:588/611`'s 100 ms bounds the reduced-motion claim "at once", so a poll would weaken it. Kept with `// TODO(e2e-waits)`: `light-chapter.spec.ts:13` (its callers read colours and layout once, without retrying), `scene-effects.spec.ts:70` and `:113` (the composer and dolly settling in software; `data-slot` names the front card, not a settled pose).

Desktop runs of the four specs with replacements, `--repeat-each=2`: `stream` test 3 timed out twice on my first condition, `getByRole('region', …).waitFor()`, because the region is visually hidden outside act two. Fixed with `state: 'attached'`, then reran twice: it reaches its own runtime skip (no `personal` piece yet), as it did before the task. `stream` test 4 failed once in that run and once in a rerun, both times `Tab did not land on row 163` with load averages of 7 to 13. That test is untouched by this diff, so it is the dropped-Tab flake the handoff names, not a regression. Gate: `scripts/e2e.sh full` exit 0, wall 1502 s, 155 tests, load average 7.6 to 9.8, every chunk green.

**Task 6 (2026-10-07).** `CLAUDE.md` "Verification" names the two npm scripts and ADR 0013; the kill-4173 rule is scoped to direct Playwright runs. ADR 0013 carries the dated amendment and its "one build per run" line is corrected. README's command block gains `test:e2e:quick`. ADR lists against `QUICK_SPECS` and `MOBILE_SPECS`: **match**.

**Task 7 (2026-10-07), on the final tree.** The runs themselves drive the load average to about 9 (SwiftShader on every core), so "quiet" here means nothing else was running; `uptime` was taken before each run.
- `npm run test:e2e:quick`: load 2.2 at start. Exit 0, wall **536 s (8.9 min)**, 44 passed, 4 skipped, 8.8 min of test time, one build.
- `npm run test:e2e`: load 9.7 at start, carried over from the quick run. Exit 0, wall **1434 s (23.9 min)**, 155 tests, 23.4 min of test time, one build. Chunks: 6.6 / 1.0 / 2.6 / 0.8 / 5.5 / 7.0 min.
- Against the baseline, 27.7 min of test time plus five builds and five server starts: the full suite is about 16% shorter in test time and builds once. The fix loop drops from the full suite to 8.9 min wall, about 3x faster. Most of the quick suite's time goes to `stream`, `scene-scrub` and `frieze-surface`, the guards ADR 0013 chose to keep in it.
