// Report JSON + the comparison table.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const REPORT_VERSION = 1

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
    const band = baseline.band ?? 0
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
