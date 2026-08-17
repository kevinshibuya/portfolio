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
import { applyBandOverrides } from './stats.mjs'

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
 * Stored per metric: `median`, `iqr`, `band`, plus `n`/`source` as provenance.
 * Per-run values stay in the report JSONs — the baseline is a contract, not an
 * archive.
 *
 * MERGE, NEVER REPLACE, per scenario. A wholesale replace silently DELETES any
 * metric the current invocation happened not to produce: let the sudo grant
 * lapse for one afternoon and `power.*` vanishes from the baseline; let one
 * trace fail and `gpu.webglMsPerFrame` vanishes. The `MISSING` machinery only
 * fires on the READ side, so a deleted key stops being missing and simply stops
 * being checked — a budget that silently ceases to exist is worse than one that
 * fails. Dropped keys are therefore retained and reported to the caller.
 *
 * Hand-set band overrides (`bandAbsolute`, `maxBand`) survive the round trip and
 * are applied to the freshly computed band, which is what makes the plan's
 * "bands... overridable there" true in practice.
 */
export async function updateScenarios(baselinePath, scenarioAggregates, rig) {
  const existing = (await readBaseline(baselinePath)) ?? {}
  const next = { ...existing }
  const notes = { retained: [], rigKeysAdded: [] }

  // Per-KEY rig bootstrap. `!next.rig` was wrong because `{}` is truthy: a
  // hand-written empty rig block would never be filled in, and never checked.
  const rigBlock = { ...(next.rig ?? {}) }
  for (const [key, value] of Object.entries(rig)) {
    if (rigBlock[key] === undefined) {
      rigBlock[key] = value
      notes.rigKeysAdded.push(key)
    }
  }
  next.rig = rigBlock

  const scenarios = { ...(next.scenarios ?? {}) }
  for (const [name, metrics] of Object.entries(scenarioAggregates)) {
    const previous = scenarios[name] ?? {}
    const merged = { ...previous }
    for (const [metric, value] of Object.entries(metrics)) {
      const overrides = previous[metric] ?? {}
      const entry = {
        median: value.median,
        iqr: value.iqr,
        band: round(applyBandOverrides(value.band, overrides)),
        n: value.n,
      }
      if (value.sources.length === 1) entry.source = value.sources[0]
      if (Number.isFinite(overrides.bandAbsolute)) entry.bandAbsolute = overrides.bandAbsolute
      if (Number.isFinite(overrides.maxBand)) entry.maxBand = overrides.maxBand
      merged[metric] = entry
    }
    for (const metric of Object.keys(previous)) {
      if (!metrics[metric]) notes.retained.push(`${name}.${metric}`)
    }
    scenarios[name] = merged
  }
  next.scenarios = scenarios

  await mkdir(path.dirname(baselinePath), { recursive: true })
  await writeFile(baselinePath, `${JSON.stringify(orderKeys(next), null, 2)}\n`, 'utf8')
  return { baseline: next, notes }
}

const round = (value) => (Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : value)

function orderKeys(object) {
  const out = {}
  for (const key of KEY_ORDER) if (key in object) out[key] = object[key]
  for (const key of Object.keys(object)) if (!(key in out)) out[key] = object[key]
  return out
}
