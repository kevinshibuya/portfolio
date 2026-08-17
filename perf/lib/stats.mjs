// Statistics for the controlled-scenario metric class.
//
// The spec splits determinism in two: EXACT metrics (bytes, call counts) are
// hard-asserted in Playwright; the numbers this runner produces are the other
// class — noisy per-frame, stable as a MEDIAN over a fixed scenario on a fixed
// rig. Everything here exists to turn N noisy runs into one median plus an
// honest statement of how much it is allowed to move.

/** Linear-interpolated quantile over a sorted-ascending copy. */
export function quantile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export const median = (values) => quantile(values, 0.5)
export const iqr = (values) => quantile(values, 0.75) - quantile(values, 0.25)
export const mean = (values) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length)

/**
 * Tolerance band around a median: `max(10% of median, 1 x IQR, minBand)`.
 *
 * The plan specifies the first two terms. `minBand` is the third and it is not
 * optional in practice: COUNT metrics (dropped frames, long tasks) sit at 0 on
 * a healthy rig, where both relative and IQR terms collapse to zero and any
 * single stray frame reads as an infinite regression. Each metric declares its
 * own absolute floor instead, in the metric's own units. Bands are recorded
 * per metric in `baseline.json` and can be overridden there by hand.
 */
export function bandFor(medianValue, iqrValue, minBand = 0) {
  return Math.max(Math.abs(medianValue) * 0.1, iqrValue, minBand)
}

/**
 * Outlier gate for whole runs. The spec: "a run whose spread exceeds a sanity
 * threshold is discarded and rerun, never averaged in."
 *
 * THE RULE (documented in perf/decisions.md): with at least
 * `MIN_RUNS_FOR_OUTLIER` completed runs, a run is discarded if ANY gating
 * metric deviates from that metric's across-run median by more than
 *
 *     max(3 x IQR, 0.5 x |median|, 3 x minBand)
 *
 * 3 x IQR is double Tukey's 1.5 fence — deliberately conservative, because
 * discarding a run that merely sits at the edge of normal variance would bias
 * the median toward whatever the rig happened to be doing. The 0.5 x |median|
 * and 3 x minBand terms keep the rule from firing on metrics whose IQR is
 * near-zero by nature. Informational metrics never gate.
 *
 * Below MIN_RUNS_FOR_OUTLIER the rule is inert and says so: an IQR over two or
 * three samples is not a spread estimate, and a gate computed from one is
 * worse than no gate.
 */
export const MIN_RUNS_FOR_OUTLIER = 4

export function findOutlierRun(runs, metricDefs) {
  if (runs.length < MIN_RUNS_FOR_OUTLIER) return null

  for (const [name, def] of Object.entries(metricDefs)) {
    if (def.informational) continue
    const values = runs.map((run) => run.metrics[name]).filter((v) => typeof v === 'number' && Number.isFinite(v))
    if (values.length !== runs.length) continue
    const med = median(values)
    const spread = iqr(values)
    const threshold = Math.max(3 * spread, 0.5 * Math.abs(med), 3 * (def.minBand ?? 0))
    if (threshold === 0) continue
    let worstIndex = -1
    let worstDeviation = 0
    values.forEach((value, index) => {
      const deviation = Math.abs(value - med)
      if (deviation > threshold && deviation > worstDeviation) {
        worstDeviation = deviation
        worstIndex = index
      }
    })
    if (worstIndex !== -1) {
      return {
        index: worstIndex,
        metric: name,
        value: values[worstIndex],
        median: med,
        threshold,
        reason:
          `${name} = ${values[worstIndex].toFixed(3)} deviates ${worstDeviation.toFixed(3)} from the ` +
          `across-run median ${med.toFixed(3)} (sanity threshold ${threshold.toFixed(3)})`,
      }
    }
  }
  return null
}

/** Collapse N per-run metric maps into one median/IQR/band map. */
export function aggregate(runs, metricDefs) {
  const out = {}
  const names = new Set()
  for (const run of runs) for (const name of Object.keys(run.metrics)) names.add(name)

  for (const name of names) {
    const def = metricDefs[name] ?? {}
    const values = runs
      .map((run) => run.metrics[name])
      .filter((value) => typeof value === 'number' && Number.isFinite(value))
    if (values.length === 0) continue
    const med = median(values)
    const spread = iqr(values)
    out[name] = {
      median: round(med),
      iqr: round(spread),
      band: round(bandFor(med, spread, def.minBand ?? 0)),
      values: values.map(round),
      unit: def.unit ?? '',
      lowerIsBetter: def.lowerIsBetter !== false,
      informational: def.informational === true,
    }
  }
  return out
}

export function round(value) {
  if (!Number.isFinite(value)) return value
  return Math.round(value * 1e4) / 1e4
}

/** Frame-time distribution from a slice of rAF timestamps. */
export function frameStats(timestamps, nominalMs) {
  const deltas = []
  for (let i = 1; i < timestamps.length; i += 1) deltas.push(timestamps[i] - timestamps[i - 1])
  if (deltas.length === 0) {
    return { count: 0, p50: 0, p95: 0, max: 0, dropped: 0, nominalMs: nominalMs ?? 0 }
  }
  // Nominal frame interval, inferred from the fastest decile of this very
  // window and snapped to a real display cadence — never assumed to be 60Hz.
  // Reported as a metric so a display change is visible rather than silently
  // rescaling every dropped-frame count in the campaign.
  const nominal = nominalMs ?? snapNominal(quantile(deltas, 0.1))
  let dropped = 0
  for (const delta of deltas) dropped += Math.max(0, Math.round(delta / nominal) - 1)
  return {
    count: timestamps.length,
    p50: quantile(deltas, 0.5),
    p95: quantile(deltas, 0.95),
    max: Math.max(...deltas),
    dropped,
    nominalMs: nominal,
  }
}

const KNOWN_REFRESH_HZ = [30, 60, 90, 120, 144]

export function snapNominal(observedMs) {
  if (!Number.isFinite(observedMs) || observedMs <= 0) return 1000 / 60
  let best = 1000 / 60
  let bestDistance = Infinity
  for (const hz of KNOWN_REFRESH_HZ) {
    const interval = 1000 / hz
    const distance = Math.abs(interval - observedMs)
    if (distance < bestDistance) {
      bestDistance = distance
      best = interval
    }
  }
  return best
}
