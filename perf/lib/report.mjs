// Report JSON + the comparison table.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { applyBandOverrides } from './stats.mjs'
import { RIG_KEYS } from './rig.mjs'

// 2: `perRunMeta[].consoleErrors` changed from `string[]` to `{kind, text}[]`
// (health-error taxonomy), and reports gained a top-level `machineLoad` block.
// A Task 5/6 consumer written against v1 would render `[object Object]`.
export const REPORT_VERSION = 2

export const VERDICT = {
  NO_BASELINE: 'no baseline',
  WITHIN: 'within-band',
  IMPROVEMENT: 'improvement',
  REGRESSION: 'REGRESSION',
  INFO: 'info',
  MISSING: 'MISSING',
}

/**
 * Compare this run's medians against the baseline's.
 *
 * Regression = the median moved outside the BASELINE's band in the worse
 * direction. The baseline's band is the authority, not the current run's:
 * a change that also widens the spread must not be able to widen its own
 * acceptance window.
 *
 * A metric the baseline has but this run did not produce is `MISSING` — loud,
 * listed in `warnings`, and never quietly dropped (spec: "the harness never
 * silently skips a metric"). It is not scored as a regression because the
 * cause is a measurement gap, not a code change; the warning is what a human
 * has to resolve.
 */
export function compare(aggregated, baselineScenario) {
  const rows = []
  const warnings = []

  for (const [name, current] of Object.entries(aggregated)) {
    const baseline = baselineScenario?.[name]
    if (current.informational) {
      rows.push({ metric: name, ...emptyDelta(current, baseline), verdict: VERDICT.INFO })
      continue
    }
    if (!baseline) {
      rows.push({ metric: name, ...emptyDelta(current, null), verdict: VERDICT.NO_BASELINE })
      continue
    }
    const delta = current.median - baseline.median
    // Hand-set overrides are applied on READ, not only when a later
    // --update-baseline happens to rewrite the stored band. Task 6's job is
    // exactly this: hand-add `"maxBand": 0.02` to a metric whose stored band is
    // 0.1236 and expect the very next `npm run perf` to hold it. Using the
    // stored band verbatim would let a 9% regression read within-band until
    // someone remembered to re-record.
    const band = applyBandOverrides(baseline.band ?? 0, baseline)
    const worse = current.lowerIsBetter ? delta > band : delta < -band
    const better = current.lowerIsBetter ? delta < -band : delta > band
    rows.push({
      metric: name,
      unit: current.unit,
      median: current.median,
      iqr: current.iqr,
      band: current.band,
      baselineMedian: baseline.median,
      baselineBand: band,
      delta: round(delta),
      deltaPct: baseline.median === 0 ? null : round((delta / Math.abs(baseline.median)) * 100),
      verdict: worse ? VERDICT.REGRESSION : better ? VERDICT.IMPROVEMENT : VERDICT.WITHIN,
    })
  }

  for (const name of Object.keys(baselineScenario ?? {})) {
    if (aggregated[name]) continue
    warnings.push(`metric "${name}" is in the baseline but was NOT produced by this run — a measurement source is missing`)
    rows.push({
      metric: name,
      median: null,
      baselineMedian: baselineScenario[name].median,
      baselineBand: baselineScenario[name].band,
      delta: null,
      verdict: VERDICT.MISSING,
    })
  }

  rows.sort((a, b) => a.metric.localeCompare(b.metric))
  return { rows, warnings, regressions: rows.filter((row) => row.verdict === VERDICT.REGRESSION).length }
}

function emptyDelta(current, baseline) {
  return {
    unit: current.unit,
    median: current.median,
    iqr: current.iqr,
    band: current.band,
    baselineMedian: baseline?.median ?? null,
    baselineBand: baseline?.band ?? null,
    delta: baseline ? round(current.median - baseline.median) : null,
    deltaPct: null,
  }
}

const round = (value) => (Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : value)

const fmt = (value, width) => (value === null || value === undefined ? '—' : String(value)).padStart(width)

export function printComparison(scenarioName, runs, discarded, comparison, log) {
  log('')
  log(`  ${scenarioName} — ${runs} run(s) kept, ${discarded} discarded`)
  // Column widths are padStart-only, so an over-wide cell pushes into its
  // neighbour rather than truncating. The delta cell carries both an absolute
  // and a percentage ("+15.7 (+1570%)") and is the one that overflows, so it
  // gets the widest field plus a guaranteed separating space — a regression
  // row that reads as "1+15.7" is a table nobody can scan.
  log(`  ${'metric'.padEnd(30)}${fmt('median', 12)}${fmt('iqr', 10)}${fmt('band', 10)}${fmt('baseline', 12)} ${fmt('delta', 18)}  verdict`)
  log(`  ${'-'.repeat(30)}${'-'.repeat(12)}${'-'.repeat(10)}${'-'.repeat(10)}${'-'.repeat(12)} ${'-'.repeat(18)}  -------`)
  for (const row of comparison.rows) {
    const deltaText =
      row.delta === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta}${row.deltaPct === null ? '' : ` (${row.deltaPct > 0 ? '+' : ''}${row.deltaPct}%)`}`
    log(
      `  ${row.metric.padEnd(30)}${fmt(row.median, 12)}${fmt(row.iqr, 10)}${fmt(row.band, 10)}${fmt(row.baselineMedian, 12)} ${fmt(deltaText, 18)}  ${row.verdict}`,
    )
  }
  for (const warning of comparison.warnings) log(`  !! ${warning}`)
}

export async function writeReport(reportsDir, scenarioName, report) {
  await mkdir(reportsDir, { recursive: true })
  const stamp = report.startedAt.replace(/[:.]/g, '-')
  const file = path.join(reportsDir, `${stamp}-${scenarioName}.json`)
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return file
}

/**
 * The rig is not the only instrument that can change under a measurement.
 *
 * `RIG_KEYS` covers the MACHINE — Chrome build, macOS, display, power. A Layer 3
 * report is additionally produced by a specific Lighthouse version running a
 * specific settings block, and neither is part of the rig. Left uncompared, a
 * baseline recorded under 12.8.2 compares perfectly clean against a 13.x run
 * across a scoring-curve change, and `perf/lighthouse.mjs`'s own drift warning
 * only fires while its pinned constant is left alone — so the one case the
 * warning cannot catch (someone re-pins the constant alongside the upgrade) is
 * exactly the case that silently rewrites the campaign's reference.
 *
 * Settings are compared as a stable-key-order hash rather than field by field:
 * the block is nested and open-ended, the answer needed here is only
 * "same or not", and a hash cannot silently miss a key a field list forgot.
 *
 * Reports with no `lighthouse` block (every Layer 2 report) skip this entirely.
 */
function compareInstrument(a, b, log) {
  if (!a.lighthouse && !b.lighthouse) return 0

  let disagreements = 0
  if (Boolean(a.lighthouse) !== Boolean(b.lighthouse)) {
    log('  !! one report carries a lighthouse block and the other does not — different instruments')
    return 1
  }

  if (a.lighthouse.version !== b.lighthouse.version) {
    log(
      `  !! lighthouse version differs: "${a.lighthouse.version}" vs "${b.lighthouse.version}" — ` +
        'scoring curves and audit implementations are version-internal, so these scores are not comparable',
    )
    disagreements += 1
  }
  if (a.lighthouse.pinnedAgainst !== b.lighthouse.pinnedAgainst) {
    log(
      `  !! bench pin differs: settings were pinned against "${a.lighthouse.pinnedAgainst}" vs ` +
        `"${b.lighthouse.pinnedAgainst}" — the bench itself was re-pinned between these runs`,
    )
    disagreements += 1
  }

  const settingsA = stableHash(a.lighthouse.settings)
  const settingsB = stableHash(b.lighthouse.settings)
  if (settingsA !== settingsB) {
    log(`  !! lighthouse settings differ (${settingsA} vs ${settingsB}) — throttling/emulation changed between these runs`)
    disagreements += 1
  }

  const flagsA = stableHash(a.lighthouse.chromeFlags)
  const flagsB = stableHash(b.lighthouse.chromeFlags)
  if (flagsA !== flagsB) {
    log(`  !! chrome flag vector differs (${flagsA} vs ${flagsB}) — the browser was configured differently`)
    disagreements += 1
  }

  if (Boolean(a.lighthouse.headless) !== Boolean(b.lighthouse.headless)) {
    log(`  !! headless differs: ${a.lighthouse.headless} vs ${b.lighthouse.headless} — different rendering path`)
    disagreements += 1
  }

  return disagreements
}

/** Short content hash with key order normalised, so `{a,b}` and `{b,a}` match. */
function stableHash(value) {
  const canonical = (node) => {
    if (Array.isArray(node)) return node.map(canonical)
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.keys(node)
          .sort()
          .map((key) => [key, canonical(node[key])]),
      )
    }
    return node
  }
  return createHash('sha256').update(JSON.stringify(canonical(value) ?? null)).digest('hex').slice(0, 12)
}

/**
 * The per-metric band overrides a scenario's baseline entry declares, for the
 * `--compare` path.
 *
 * Returns `{}` and SAYS SO when there is nothing to read. Every branch here is
 * a way for a comparison to run without the ceiling it should have had, and the
 * bug this function exists to close was invisible precisely because no branch
 * announced itself.
 */
async function bandOverridesFor(baselinePath, scenario, log) {
  if (!baselinePath) {
    log('  !! no baseline supplied — per-metric band overrides (maxBand/bandAbsolute) are NOT applied')
    return {}
  }
  let baseline
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  } catch (error) {
    log(`  !! could not read ${path.basename(baselinePath)} (${error.message}) — band overrides are NOT applied`)
    return {}
  }
  const entry = baseline?.scenarios?.[scenario] ?? baseline?.lighthouse?.[scenario]
  if (!entry) {
    log(`  !! "${scenario}" has no baseline entry — band overrides are NOT applied`)
    return {}
  }
  return entry
}

/**
 * `--compare A B`: do two reports agree within their own declared bands?
 *
 * SHARED BY BOTH MEASURING LAYERS. This lives here rather than in run.mjs
 * because it is not the scenario runner's private helper — it is the literal
 * form of the acceptance check BOTH Layer 2 and Layer 3 are held to ("two
 * consecutive invocations agree within bands"). Forking a second copy into
 * perf/lighthouse.mjs would mean the two layers could drift into disagreeing
 * about what "agree" means, which is precisely the kind of quiet divergence
 * this harness exists to prevent.
 *
 * The METRIC rules are identical for both report kinds: `scenario`,
 * `build.distIndexHash`, `rig` and `metrics` are fields every report here
 * carries, and every median is judged by the same band arithmetic either way.
 *
 * THE INSTRUMENT RULES ARE NOT IDENTICAL, and must not be assumed to be. A
 * Layer 3 report additionally carries a `lighthouse` block (version, pinned
 * version, settings, Chrome flags, headless) and `compareInstrument` checks all
 * of it; a Layer 2 report has no such block and skips that check entirely. So
 * the two kinds are compared by the same rules PLUS, for Lighthouse reports, a
 * strictly additional set. Anyone extending this comparator should add
 * kind-specific checks the same way — inside a guarded helper that no-ops for
 * reports lacking the block — rather than assuming one uniform rule set.
 *
 * Returns a process exit code: 0 agree · 1 disagree · 2 not comparable.
 */
export async function compareReportFiles(pathA, pathB, log, baselinePath = null) {
  const a = JSON.parse(await readFile(pathA, 'utf8'))
  const b = JSON.parse(await readFile(pathB, 'utf8'))

  log(`compare: ${path.basename(pathA)} vs ${path.basename(pathB)}`)

  // PER-METRIC BAND OVERRIDES APPLY HERE TOO. They did not until 2026-09-01,
  // and the gap was silent: `compare()` (the baseline path) applies
  // `maxBand`/`bandAbsolute` on read, while this path used the reports' own
  // bands verbatim. For idle-hero `gpu.shaderMsPerFrame` that is the difference
  // between a 0.1 ms band and a 0.67 ms one — `--compare` handed back exactly
  // the tolerance Task 7b Step 5b had just removed, and did it while printing
  // "agree". Two comparison paths that disagree about how wide a band is are
  // two different instruments wearing one name.
  //
  // The overrides are read from the baseline rather than from the reports
  // because that is where they are authored (`stats.mjs:39`) and where
  // `compare()` reads them, so both paths resolve the same band from the same
  // source. A missing baseline is announced, never assumed benign: silence here
  // is what made the original gap invisible.
  const overrides = await bandOverridesFor(baselinePath, a.scenario, log)
  if (a.scenario !== b.scenario) {
    process.stderr.write(`error: different scenarios (${a.scenario} vs ${b.scenario})\n`)
    return 2
  }
  if (a.build.distIndexHash !== b.build.distIndexHash) {
    log(`  !! different builds — ${a.build.distIndexHash} vs ${b.build.distIndexHash}`)
  }

  let disagreements = 0
  const capped = []
  for (const key of RIG_KEYS) {
    if (String(a.rig?.[key]) !== String(b.rig?.[key])) {
      log(`  !! rig differs on ${key}: "${a.rig?.[key]}" vs "${b.rig?.[key]}" — these reports are not comparable`)
      disagreements += 1
    }
  }
  disagreements += compareInstrument(a, b, log)

  // Iterate the UNION. Walking only A's metrics would let B silently lose one
  // and still report "reports agree" — the same class of hole as blending
  // sources without saying so.
  const allMetrics = [...new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)])].sort()
  log(`  ${'metric'.padEnd(30)}${'A'.padStart(12)}${'B'.padStart(12)}${'|delta|'.padStart(12)}${'band'.padStart(12)}  verdict`)
  for (const metric of allMetrics) {
    const left = a.metrics[metric]
    const right = b.metrics[metric]
    if (!left) {
      log(`  ${metric.padEnd(30)}${'—'.padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  MISSING IN A`)
      disagreements += 1
      continue
    }
    if (!right) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  MISSING IN B`)
      disagreements += 1
      continue
    }
    if (left.sourceConflict || right.sourceConflict) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  BLENDED SOURCES`)
      disagreements += 1
      continue
    }
    if (left.sources?.length === 1 && right.sources?.length === 1 && left.sources[0] !== right.sources[0]) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  SOURCE A≠B`)
      disagreements += 1
      continue
    }
    // "Within their own declared bands": the wider of the two bands, because
    // each report's band is that report's own honest statement of how much the
    // metric may move. Requiring the narrower would make the stricter run the
    // arbiter of the looser one. THEN the baseline's hand-set override caps it,
    // exactly as `compare()` does — a ceiling authored in the baseline is a
    // statement about the metric, not about one comparison direction.
    const declared = Math.max(left.band, right.band)
    const band = applyBandOverrides(declared, overrides[metric] ?? {})
    if (band !== declared) capped.push(`${metric} ${declared.toFixed(4)} -> ${band.toFixed(4)}`)
    const delta = Math.abs(left.median - right.median)
    const agree = delta <= band || left.informational
    if (!agree) disagreements += 1
    log(
      `  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${String(Math.round(delta * 1e4) / 1e4).padStart(12)}${String(Math.round(band * 1e4) / 1e4).padStart(12)}  ${left.informational ? 'info' : agree ? 'agree' : 'DISAGREE'}`,
    )
  }
  log('')
  if (capped.length > 0) log(`  band capped by a baseline override: ${capped.join(' · ')}`)
  // "disagreement(s)", not "metric(s)": this counter now includes rig and
  // instrument differences, which are not metrics. A version-only drift used to
  // print "1 metric(s) disagree" above a table in which every metric said
  // `agree`, which reads as a bug in the table.
  log(disagreements === 0 ? '  ✓ reports agree within their declared bands' : `  ✗ ${disagreements} disagreement(s)`)
  return disagreements === 0 ? 0 : 1
}
