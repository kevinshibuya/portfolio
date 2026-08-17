// `perf/baseline.json` — THREE WRITERS, ZERO CLOBBERING.
//
//   this runner        owns `scenarios`
//   perf/lighthouse.mjs (Task 4) owns `lighthouse`
//   Task 5, by hand    owns `exact`
//
// Every writer read-modify-writes the file and touches ONLY its own key. That
// contract is what lets Tasks 3/4/5 land baselines independently instead of
// each one silently reverting the last.
//
// `rig` is shared and therefore written under a stricter rule: bootstrapped
// when absent, left byte-for-byte alone when present and matching, and a
// mismatch refuses the whole update rather than rewriting someone else's rig
// block (see run.mjs). The alternative — nobody writes it — leaves Task 5 with
// a schema-incomplete baseline, which its own acceptance check forbids.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const KEY_ORDER = ['rig', 'scenarios', 'lighthouse', 'exact']

export async function readBaseline(baselinePath) {
  if (!existsSync(baselinePath)) return null
  const raw = await readFile(baselinePath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`perf/baseline.json is not valid JSON (${error.message}) — fix or delete it before updating`)
  }
}

/**
 * Merge scenario medians into the baseline, preserving every other key exactly
 * as found (including keys this runner has never heard of).
 *
 * Only `median`, `iqr` and `band` are stored. Per-run values stay in the report
 * JSONs: the baseline is a contract, not an archive, and a hand-edited band —
 * which the plan explicitly allows — must survive being read back next to
 * numbers this runner produced.
 */
export async function updateScenarios(baselinePath, scenarioAggregates, rig) {
  const existing = (await readBaseline(baselinePath)) ?? {}
  const next = { ...existing }

  if (!next.rig) next.rig = rig

  const scenarios = { ...(next.scenarios ?? {}) }
  for (const [name, metrics] of Object.entries(scenarioAggregates)) {
    const stored = {}
    for (const [metric, value] of Object.entries(metrics)) {
      stored[metric] = { median: value.median, iqr: value.iqr, band: value.band }
    }
    scenarios[name] = stored
  }
  next.scenarios = scenarios

  await mkdir(path.dirname(baselinePath), { recursive: true })
  await writeFile(baselinePath, `${JSON.stringify(orderKeys(next), null, 2)}\n`, 'utf8')
  return next
}

function orderKeys(object) {
  const out = {}
  for (const key of KEY_ORDER) if (key in object) out[key] = object[key]
  for (const key of Object.keys(object)) if (!(key in out)) out[key] = object[key]
  return out
}
