#!/usr/bin/env node
// Regression test for the RETRY PATH in `runScenario` — the riskiest logic in
// the harness, because it is the one place where a failed run can be made to
// disappear.
//
//   node perf/selftest-retry.mjs
//
// No browser, no build, no port 4173: it drives `runScenario` with fake
// scenario modules whose `run()` throws on demand. That is deliberate — the
// question here is not "does the page break" (proved separately against a real
// `WEBGL_lose_context`), it is "when a run fails, does the runner do the right
// thing with it".
//
// It also covers:
//   - the two GATES that decide what a failed run does to the exit code and to
//     `--update-baseline` (`healthBlocker`, `baselineRefusal`), exported from
//     run.mjs precisely so they can be asserted here rather than only existing
//     inline in main();
//   - the R10 load-guard wiring, including that a MISSING after-sample refuses
//     a baseline write — without that case, deleting `sampleMachineLoad('after')`
//     from run.mjs would leave every other assertion green while silently
//     restoring the t=0-only hole;
//   - the health CLASSIFICATION table, driven through a stubbed page object so
//     it needs no browser at all.
//
// The properties under test, and why each one matters:
//
//   1. A TRANSIENT context loss is discarded and rerun. Before this existed, a
//      single GPU hiccup in run 4 of `all --runs 5` threw away every remaining
//      scenario and ~20 minutes of wall clock.
//   2. A PERSISTENT context loss exhausts the budget and THROWS. This is the C2
//      guarantee: a number must never be produced from an unhealthy page, and
//      the bounded budget is what keeps "retry" from becoming "retry forever".
//   3. A `pageerror` is NOT retried at all. An uncaught JS exception is a
//      statement about the code, not the rig — retrying it is precisely how a
//      batch whose rAF callback throws on 1 frame in 5000 would be retried away
//      and kept.
//   4. A DETERMINISTIC scenario bug is not retried either, so a missing
//      selector fails on the first run instead of burning the budget on an
//      outcome that cannot change.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { baselineRefusal, healthBlocker, runScenario } from './run.mjs'
import { assertPageHealthy } from './lib/browser.mjs'
import { combineMachineLoad } from './lib/load.mjs'
import { MeasurementHealthError } from './lib/browser.mjs'

const quiet = () => {}
const metrics = { 'gpu.busyMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.05, sourceKey: 'gpu' } }

// Realistic machineLoad fixtures. A real one always carries BOTH samples, so
// the stubs below go through `combineMachineLoad` rather than hand-rolling
// `{ busy }` — a bare stub with no `after` key is now (correctly) refused, and
// testing against one would prove nothing about real inputs.
const QUIET_SAMPLE = { busy: false, reasons: [] }
const BUSY_SAMPLE = { busy: true, reasons: ['"legacyScreenSaver" is using 82.0% CPU (limit 50%)'] }
const QUIET_LOAD = combineMachineLoad(QUIET_SAMPLE, QUIET_SAMPLE)
const BUSY_LOAD = combineMachineLoad(BUSY_SAMPLE, BUSY_SAMPLE)

const results = []
const check = (name, passed, detail) => {
  results.push({ name, passed, detail })
  process.stdout.write(`${passed ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`)
}

/** A scenario that throws `error()` for its first `failures` runs, then succeeds. */
const scenarioThatFails = (failures, error) => {
  let calls = 0
  return {
    module: {
      name: 'selftest',
      description: 'retry-path fixture',
      metrics,
      run: async () => {
        calls += 1
        if (calls <= failures) throw error(calls)
        return { metrics: { 'gpu.busyMsPerFrame': 1.2 }, sources: { gpu: 'trace:gpu-process' }, meta: {} }
      },
    },
    calls: () => calls,
  }
}

const contextLoss = (n) => new MeasurementHealthError(`context lost (simulated ${n})`, 'context-loss')
const pageError = (n) => new MeasurementHealthError(`Uncaught TypeError in rAF callback (simulated ${n})`, 'page-error')
const plainBug = () => new Error('#projects .stack-scroll not found')

// 1 — transient context loss: discarded, rerun, invocation continues.
{
  const fixture = scenarioThatFails(2, contextLoss)
  const outcome = await runScenario(fixture.module, 3, { log: quiet }, { warmup: false })
  const healthDiscards = outcome.discarded.filter((entry) => entry.healthFailure)
  check(
    'transient context loss is discarded and rerun',
    outcome.kept.length === 3 && healthDiscards.length === 2 && outcome.aggregated['gpu.busyMsPerFrame'],
    `kept ${outcome.kept.length}, discarded ${healthDiscards.length}, median ${outcome.aggregated['gpu.busyMsPerFrame']?.median}`,
  )
  check(
    'discards are tagged so the runner can gate on them',
    healthDiscards.every((entry) => entry.kind === 'context-loss'),
    `kinds: ${healthDiscards.map((entry) => entry.kind).join(', ')}`,
  )
}

// 2 — persistent context loss: budget exhausted, throws, produces nothing.
{
  const fixture = scenarioThatFails(Infinity, contextLoss)
  let threw = null
  try {
    await runScenario(fixture.module, 3, { log: quiet }, { warmup: false })
  } catch (error) {
    threw = error
  }
  check(
    'persistent context loss exhausts the budget and throws (C2 guarantee)',
    threw !== null && /not transient/.test(threw?.message ?? ''),
    threw ? threw.message.split('\n')[0] : 'DID NOT THROW — a number could be produced from an unhealthy page',
  )
}

// 3 — pageerror: never retried.
{
  const fixture = scenarioThatFails(Infinity, pageError)
  let threw = null
  try {
    await runScenario(fixture.module, 3, { log: quiet }, { warmup: false })
  } catch (error) {
    threw = error
  }
  check(
    'an uncaught page error is NOT retried (fails on the first run)',
    threw !== null && fixture.calls() === 1,
    `run() called ${fixture.calls()} time(s); expected exactly 1`,
  )
}

// 4 — deterministic scenario bug: never retried.
{
  const fixture = scenarioThatFails(Infinity, plainBug)
  let threw = null
  try {
    await runScenario(fixture.module, 3, { log: quiet }, { warmup: false })
  } catch (error) {
    threw = error
  }
  check(
    'a deterministic scenario bug is NOT retried',
    threw !== null && fixture.calls() === 1,
    `run() called ${fixture.calls()} time(s); expected exactly 1`,
  )
}

// 5 — the gate: a health-discarded run set must reach BOTH the exit code and
// the baseline refusal. This is the hole the retry path opened — every kept run
// is clean, so `compare()` alone would print "no regressions" and baseline a
// build that was dropping the WebGL context a quarter of the time.
{
  const withHealthDiscard = { discarded: [{ healthFailure: true, kind: 'context-loss' }] }
  const clean = { discarded: [] }
  check(
    'a health-discarded run set produces a blocker',
    healthBlocker('idle-hero', withHealthDiscard) !== null,
    healthBlocker('idle-hero', withHealthDiscard)?.slice(0, 60),
  )
  check('a clean run set produces no blocker', healthBlocker('idle-hero', clean) === null)

  const blocker = healthBlocker('idle-hero', withHealthDiscard)
  check(
    'a health-discarded run refuses --update-baseline',
    baselineRefusal({ force: false, exitCode: 1, blockingWarnings: [blocker], machineLoad: QUIET_LOAD }).refuse,
  )
  check(
    '--force overrides the health refusal (deliberate escape hatch)',
    !baselineRefusal({ force: true, exitCode: 1, blockingWarnings: [blocker], machineLoad: QUIET_LOAD }).refuse,
  )
}

// 6 — ruling R10: a busy rig blocks a baseline update even when the run itself
// was clean, because the numbers describe the machine rather than the page.
{
  check(
    'a busy rig refuses --update-baseline on an otherwise-clean run',
    baselineRefusal({ force: false, exitCode: 0, blockingWarnings: [], machineLoad: BUSY_LOAD }).refuse,
  )
  check(
    'a quiet rig with a clean run allows --update-baseline',
    !baselineRefusal({ force: false, exitCode: 0, blockingWarnings: [], machineLoad: QUIET_LOAD }).refuse,
  )
  check(
    '--force overrides the busy-rig refusal',
    !baselineRefusal({ force: true, exitCode: 0, blockingWarnings: [], machineLoad: BUSY_LOAD }).refuse,
  )
}

// 7 — ruling R10's own hole: the guard samples at t=0, but an `all --runs 5`
// invocation runs ~20 minutes and the motivating incident was a screensaver
// starting MID-run. A load onset that begins after the first sample must still
// block the baseline write at the end.
{
  const quiet = QUIET_SAMPLE
  const loaded = BUSY_SAMPLE

  const onsetMidRun = combineMachineLoad(quiet, loaded)
  check(
    'a load onset DURING the run marks the invocation busy',
    onsetMidRun.busy && onsetMidRun.reasons.some((reason) => reason.startsWith('at end:')),
    onsetMidRun.reasons.join(' | '),
  )
  check(
    'a mid-run load onset refuses --update-baseline',
    baselineRefusal({ force: false, exitCode: 0, blockingWarnings: [], machineLoad: onsetMidRun }).refuse,
  )
  check(
    'load present at the START is still caught (and labelled)',
    combineMachineLoad(loaded, quiet).busy &&
      combineMachineLoad(loaded, quiet).reasons.some((reason) => reason.startsWith('at start:')),
  )
  check('quiet at both ends stays clean', !combineMachineLoad(quiet, quiet).busy)

  // 7b — guard R10's WIRING, not just its combiner. The four cases above pass
  // hand-built samples straight to combineMachineLoad, so deleting
  // `sampleMachineLoad('after')` from run.mjs would leave every one of them
  // green while silently restoring the t=0-only hole. The refusal below is what
  // makes that refactor fail loudly, so it is asserted explicitly.
  check(
    'a MISSING after-sample refuses --update-baseline (guards the R10 wiring)',
    baselineRefusal({
      force: false,
      exitCode: 0,
      blockingWarnings: [],
      machineLoad: combineMachineLoad(quiet, undefined),
    }).refuse,
  )
  check(
    'an ABSENT machineLoad block refuses --update-baseline',
    baselineRefusal({ force: false, exitCode: 0, blockingWarnings: [], machineLoad: undefined }).refuse,
    'a refactor dropping the load block wholesale must not be quieter than one dropping half of it',
  )
  check(
    'a present after-sample on a quiet rig still allows it',
    !baselineRefusal({
      force: false,
      exitCode: 0,
      blockingWarnings: [],
      machineLoad: combineMachineLoad(quiet, quiet),
    }).refuse,
  )
}

// 7c — the LAST link in R10's wiring, asserted the only way it can be from a
// browserless test: on the source text.
//
// Everything above proves the COMBINER and the GATE. Neither observes whether
// the after-sample is ever actually TAKEN, so deleting `sampleMachineLoad('after')`
// from run.mjs left the suite fully green — the tests proved the parts and not
// the assembly. `combineMachineLoad(before, undefined)` would then yield
// `after: null`, which 7b does refuse — but only once someone reaches
// `--update-baseline`, and the point of a selftest is to fail before that.
//
// A source-text assertion is a blunt instrument (a rename breaks it, and it
// cannot see whether the result is used), which is why it is scoped to the one
// call whose absence is otherwise undetectable. lighthouse.mjs carries the
// identical wiring for Layer 3 and so is covered identically.
{
  const sourceOf = async (file) => readFile(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
  const CALL = /sampleMachineLoad\(\s*['"]after['"]\s*\)/
  for (const file of ['./run.mjs', './lighthouse.mjs']) {
    // `.catch(() => '')`: a missing/renamed file must fail HERE, by name, as the
    // `check` below — not reject out of the whole suite and abort every later
    // block plus the `N/N passed` line. Same house rule the rest of this file
    // follows: a named assertion, never an uncaught throw.
    const source = await sourceOf(file).catch(() => '')
    check(
      `${file.replace('./', '')} still TAKES the post-run load sample`,
      CALL.test(source),
      "no sampleMachineLoad('after') call in the source — R10's after-sample would be absent and every gate above would still pass",
    )
  }
}

// 8 — the health CLASSIFICATION table, driven through a stubbed page so it
// needs no browser. The case that matters most is the fourth: an uncaught
// exception whose message merely CONTAINS "context lost" must not take the
// retryable branch, or any code fault can disguise itself as a rig fault and
// burn the replacement budget.
{
  const stubSession = (consoleErrors, fallbackCount) => ({
    consoleErrors,
    healthCheckpoint: 0,
    pageErrorCheckpoint: 0,
    page: {
      locator: () => ({ count: async () => fallbackCount }),
      evaluate: async () => [],
    },
  })

  const classify = async (consoleErrors, fallbackCount) => {
    try {
      await assertPageHealthy(stubSession(consoleErrors, fallbackCount), 'during a stubbed window')
      return 'healthy'
    } catch (error) {
      return error.kind ?? `unexpected:${error.message}`
    }
  }

  const gl = (text) => ({ kind: 'console', text })
  const threw = (text) => ({ kind: 'pageerror', text })

  check('healthy page throws nothing', (await classify([], 0)) === 'healthy')
  check('benign 404 is allowlisted', (await classify([gl('Failed to load resource: 404')], 0)) === 'healthy')
  check('fallback in the DOM is context-loss', (await classify([], 1)) === 'context-loss')
  check(
    'console-only "context lost" is context-loss (the 400ms race)',
    (await classify([gl('WebGL: CONTEXT_LOST_WEBGL: loseContext')], 0)) === 'context-loss',
  )
  check(
    'pageerror MENTIONING "context lost" is page-error, NOT retryable',
    (await classify([threw('TypeError: cannot read x of undefined (context lost handler)')], 0)) === 'page-error',
    'this is the branch Important 2 closed; a code fault must not disguise itself as a rig fault',
  )
  check('plain pageerror is page-error', (await classify([threw('TypeError: boom')], 0)) === 'page-error')
  check('non-GL fatal console error is console-error', (await classify([gl('Something went wrong')], 0)) === 'console-error')
  check(
    'fallback present WINS over a pageerror (DOM is authoritative)',
    (await classify([threw('TypeError: boom')], 1)) === 'context-loss',
  )
}

const failed = results.filter((result) => !result.passed)
process.stdout.write(`\n${results.length - failed.length}/${results.length} passed\n`)
process.exit(failed.length === 0 ? 0 : 1)
