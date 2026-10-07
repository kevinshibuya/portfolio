# E2e two suites implementation plan

**Goal:** Split the Playwright suite into a quick suite and a full suite, scope mobile to viewport-dependent specs, and build once per run, per ADR 0013, without losing an assertion.
**Architecture:** `playwright.config.ts` selects the suite from `E2E_SUITE` (`quick` or unset = full) and scopes each project with `testMatch` lists. `scripts/e2e.sh` builds once, serves that build on 4173 for the whole run (Playwright reuses it, `reuseExistingServer` is already true off CI), and runs the full suite in chunks against it. A new `smoke.spec.ts` absorbs the duplicated console-clean mount checks.
**Spec:** `docs/adr/0013-e2e-runs-in-two-suites.md` (glossary: `CONTEXT.md` › Verification)
**Execution model:** opus

## Global constraints

- **No assertion is lost.** A test that moves keeps every `expect` it had, verbatim in intent; a moved test is deleted from its old file in the same commit.
- **Quick suite, exactly:** `scene-scrub`, `stream`, `scene-no-webgl`, `frieze-surface`, `pixel-gate`, `scene-reduced-motion`, `smoke`. Desktop (`desktop-chromium`) only.
- **Mobile (`mobile-chromium`) runs exactly:** `scene-scrub`, `stream`, `scene-no-webgl`, `frieze-surface`, `frieze-click`, `light-chapter`, `nav-on-light`, `hero-dissolve`, `pixel-gate`; plus `perf-budget` only when `PERF_HARNESS=1` (its dormant DPR test needs Pixel 5's capped path). `scene-no-webgl` is an amendment to the ADR's list, see Task 6.
- **`desktop-hidpi`** keeps `testMatch: /frieze-surface\.spec\.ts$/` and runs in the full suite only.
- **A bare `npx playwright test` is the full suite** and keeps building through `webServer` as today.
- **`workers: 1` stays.** Its comment stays; `pixel-gate` asserts it.
- **Kill 4173 before any direct Playwright run:** `lsof -ti:4173 | xargs -r kill -9`.
- TypeScript strict, no `any`. `npx tsc -b` is the typecheck (`npx tsc --noEmit` is a no-op here).
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

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/smoke.spec.ts tests/e2e/hero-shader.spec.ts tests/e2e/contact-waves.spec.ts --project=desktop-chromium` → all pass, and the count of `expect(` across the three new tests equals the count across the three originals (`git show HEAD:<file>` for the before side). Red state before the task: `smoke.spec.ts` does not exist.

**Boundaries:** Do not change an assertion's threshold, selector or timeout. Do not touch `loader.spec.ts`: its in-flight timing test stays in the full suite as it is.

- [ ] Create `smoke.spec.ts` with the three moved tests
- [ ] Remove them from `hero-shader.spec.ts` and `contact-waves.spec.ts`; delete `dark-tokens.spec.ts`
- [ ] Count `expect(` before and after; they match
- [ ] `npx tsc -b`, `npx eslint tests/e2e`
- [ ] Run the acceptance check; commit `test(e2e): one smoke spec for the console-clean mount checks`

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
const MOBILE_SPECS = ['scene-scrub', 'stream', 'scene-no-webgl', 'frieze-surface', 'frieze-click', 'light-chapter', 'nav-on-light', 'hero-dissolve', 'pixel-gate']
// + 'perf-budget' on mobile when process.env.PERF_HARNESS === '1'
const specs = (names: string[]): RegExp => new RegExp(`/(${names.join('|')})\\.spec\\.ts$`)
```

- Full suite: `desktop-chromium` matches every spec; `mobile-chromium` matches `MOBILE_SPECS` (plus `perf-budget` under the harness); `desktop-hidpi` unchanged.
- Quick suite: only `desktop-chromium`, matching `QUICK_SPECS`. The other two projects are absent from the array, not merely empty.
- A comment above the lists cites ADR 0013 and says a new viewport-dependent surface joins `MOBILE_SPECS` in the PR that adds it.
- The `workers: 1` comment is untouched. `webServer` is untouched.

**Acceptance check:** `--list` does not start the server.
- `npx playwright test --list | tail -1` → the full count, which is lower than before by the dropped mobile runs. Record before and after.
- `E2E_SUITE=quick npx playwright test --list` → only `[desktop-chromium]` lines, from exactly the seven quick files (`| grep -oE 'tests/e2e/[a-z-]+\.spec\.ts' | sort -u`).
- `E2E_SUITE=nope npx playwright test --list` → exits non-zero with the message.
- `PERF_HARNESS=1 npx playwright test --list --project=mobile-chromium | grep -c perf-budget` → non-zero; without the env → 0.

Red state: before the task, `E2E_SUITE=quick` lists every spec on all three projects.

**Boundaries:** No spec file changes. If a spec in either list does not exist on disk, stop: `blocked: <name> missing`.

- [ ] Record `npx playwright test --list | tail -1` before the change
- [ ] Add the lists, the `E2E_SUITE` switch and per-project `testMatch`
- [ ] `npx tsc -b`, `npm run lint`
- [ ] Run the four `--list` checks; record the counts in this plan's Record section
- [ ] Commit `test(e2e): quick and full suites; mobile only where the viewport matters`

---

### Task 3: Perf timing behind the harness

**Files:**
- `tests/e2e/perf-budget.spec.ts` — modify: gate `'no long task > 200ms during scroll'` behind `PERF_HARNESS`

nothing outside this list

**Work:** Add `test.skip(!HARNESS, STARVED)` as the first line of that test, matching the file's existing pattern for starved throughput assertions. `STARVED` and `HARNESS` already exist in the file. The CLS test and every other test stay as they are; they are deterministic.

**Acceptance check:** `lsof -ti:4173 | xargs -r kill -9; npx playwright test tests/e2e/perf-budget.spec.ts --project=desktop-chromium` → the long-task test reports skipped with the `STARVED` reason; nothing fails. Red state: before, it runs and asserts.

**Boundaries:** No threshold changes anywhere in the file.

- [ ] Gate the test
- [ ] Run the check; commit `test(perf): long-task timing runs under the harness only`

---

### Task 4: `scripts/e2e.sh`, one build per run

**Files:**
- `scripts/e2e.sh` — create, executable
- `package.json` — modify: `test:e2e` → `scripts/e2e.sh full`; add `test:e2e:quick` → `scripts/e2e.sh quick`

nothing outside this list

**Interfaces:**
- Consumes: `E2E_SUITE` (Task 2).
- Produces: `scripts/e2e.sh <quick|full> [extra playwright args…]`, exit 0 only if every chunk passed.

**Work:** Binding behaviour, in order:
1. Reject any first argument other than `quick` or `full`, with usage.
2. `lsof -ti:4173 | xargs -r kill -9`.
3. `npm run build`, once. Fail fast on error.
4. Start `npx wrangler dev --port 4173` in the background. A `trap` on `EXIT INT TERM` kills it and anything still on 4173, so a Ctrl-C leaves no server behind. Poll `http://localhost:4173` until it answers 200, for up to 120 s; on timeout print the server's log tail and exit non-zero.
5. `quick`: one run, `E2E_SUITE=quick npx playwright test "$@"`.
6. `full`: the spec files in `ls` order, in chunks of 4 files. This is the memory-safe chunking that today's protocol used, now against the one server. Run `npx playwright test <chunk files> "$@"` per chunk and keep going after a failed chunk.
7. Print one summary line per chunk, with its file list, exit code and Playwright's final counts. Exit non-zero if any chunk failed.

Playwright reuses the server because `reuseExistingServer` is true off CI; the script must not set `CI`. Script structure, logging format and the server log location are your choice; keep the log out of the repo tree (use `mktemp`).

**Acceptance check:** `scripts/e2e.sh quick`:
- exits 0;
- its output shows exactly one `vite build` and one server start;
- no process is left on 4173 afterwards (`lsof -ti:4173` prints nothing).

Then `scripts/e2e.sh bogus` exits non-zero with usage. Red state: the script does not exist.

**Boundaries:** Do not edit `playwright.config.ts`'s `webServer`; a bare `npx playwright test` must keep building as before. Do not add a dependency.

- [ ] Write the script; `chmod +x`
- [ ] Wire the two npm scripts
- [ ] Run `scripts/e2e.sh bogus`, then `scripts/e2e.sh quick`; record its wall time
- [ ] Confirm 4173 is free afterwards
- [ ] Commit `test(e2e): one build and one server per run`

---

### Task 5: Fixed waits become condition waits

**Files:**
- every `tests/e2e/*.spec.ts` that calls `page.waitForTimeout` — modify

nothing outside `tests/e2e/`

**Work:** For each `waitForTimeout`, decide what it was waiting for:
- **An observable condition exists** (an attribute, a class, a scroll position, an element count, a `data-*` state the app already writes): replace the wait with `expect.poll`, `locator.waitFor`, `expect(locator).toHaveAttribute`, or `page.waitForFunction` on that condition, with a timeout at least as long as the old wait.
- **The wait is a sampling window** (count frames or draws over N ms, let startup draws land before sampling, measure CLS across an interval): keep it, and make sure a one-line comment says it is a window, not a wait.
- **Unsure:** keep the wait and add `// TODO(e2e-waits): <what it might be waiting for>` rather than guess.

Do not add `data-*` attributes to app code to create a condition; app code is outside this task.

**Acceptance check:**
- Run `grep -c waitForTimeout tests/e2e/*.spec.ts | awk -F: '{s+=$2} END {print s}'` before and after, and record both in the Record section.
- `scripts/e2e.sh full` must exit 0.
- Red state: none. This is a refactor, so the suite is green before and must stay green.

**Boundaries:** No threshold, selector or assertion changes beyond the wait being replaced. If a replacement makes a test flaky across two runs, revert that one site and keep the wait with a comment saying why.

- [ ] Record the before count
- [ ] Replace waits spec by spec, running each touched spec on desktop as you go (`npx playwright test <file> --project=desktop-chromium`)
- [ ] Record the after count
- [ ] `npx tsc -b`, `npm run lint`
- [ ] `scripts/e2e.sh full` green; commit `test(e2e): condition waits where a condition exists`

---

### Task 6: Docs

**Files:**
- `CLAUDE.md` — modify: "Verification"
- `docs/adr/0013-e2e-runs-in-two-suites.md` — modify: the mobile list gains `scene-no-webgl`; `perf-budget` on mobile under the harness; the script runs the full suite in chunks of 4 against one server
- `README.md` — modify only if it documents how to run e2e; otherwise leave it

nothing outside this list

**Work:** Load the `writing-for-agents` skill before editing `CLAUDE.md`. In "Verification":
- "The set" becomes: `npx tsc -b`, `npm run lint`, `npx vitest run`, then `npm run test:e2e:quick` in a PR's fix loop and `npm run test:e2e` (the full suite) once on the final head before asking for the `staging` merge.
- The kill-4173 rule stays, scoped to direct `npx playwright test` runs; the script does it itself.
- Name ADR 0013.

In ADR 0013:
- add `scene-no-webgl` to the mobile list, with the reason: the no-WebGL archive is a normal-flow layout that changes at phone width, and nothing else renders it on a phone;
- add `perf-budget` on mobile under `PERF_HARNESS`;
- state the chunks-of-4 detail.

**Acceptance check:**
- `grep -n "test:e2e:quick\|0013" CLAUDE.md` shows the new lines.
- `grep -n "scene-no-webgl" docs/adr/0013-e2e-runs-in-two-suites.md` shows the amendment.
- The two spec lists in the ADR match `QUICK_SPECS` and `MOBILE_SPECS` in `playwright.config.ts` exactly. Compare by eye; record "match" here.

**Boundaries:** No other CLAUDE.md section changes.

- [ ] Edit CLAUDE.md "Verification"
- [ ] Amend ADR 0013
- [ ] Check README for an e2e how-to
- [ ] Run the greps; compare the lists
- [ ] Commit `docs: the quick and full suites in CLAUDE.md; ADR 0013 amendments`

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

- [ ] Quick suite: time and counts recorded
- [ ] Full suite: time and counts recorded
- [ ] Grep this file for remaining `- [ ]` outside Task 7; none
- [ ] Push and open the PR

---

## Record

_Filled in during execution._
