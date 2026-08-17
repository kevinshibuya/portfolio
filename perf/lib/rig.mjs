// Rig stamping. Every number this harness produces is rig-relative by design
// (the spec: "no CI/cloud perf runs — the rig is local"). A number compared
// across rigs is not a comparison, so the rig block travels with every report
// and a mismatch refuses `--update-baseline` outright.

import { chromium } from '@playwright/test'
import { runSync, run } from './proc.mjs'
import { measureRefresh } from './browser.mjs'
import { quantile, snapNominal } from './stats.mjs'

/** Keys that must match for a baseline comparison to mean anything. */
export const RIG_KEYS = ['chrome', 'macos', 'arch', 'cpu', 'displayScale', 'refreshHz', 'acPower']

export async function collectRig() {
  const acResult = await run('pmset', ['-g', 'ps'])
  const acPower = /AC Power/i.test(acResult.stdout)

  // The display's real cadence, measured on a blank page. This PINS the
  // dropped-frame arithmetic for every scenario: inferring it from the window
  // being judged made a page running at half rate report zero dropped frames.
  const deltas = await measureRefresh()
  const nominalFrameMs = snapNominal(quantile(deltas, 0.1))

  return {
    chrome: await chromeVersion(),
    macos: runSync('sw_vers', ['-productVersion']),
    arch: runSync('uname', ['-m']),
    cpu: runSync('sysctl', ['-n', 'machdep.cpu.brand_string']),
    displayScale: await displayScale(),
    refreshHz: Math.round(1000 / nominalFrameMs),
    nominalFrameMs,
    acPower,
    recordedAt: new Date().toISOString(),
  }
}

async function chromeVersion() {
  const browser = await chromium.launch({ headless: true })
  try {
    return browser.version()
  } finally {
    await browser.close()
  }
}

/**
 * The PHYSICAL display's backing scale — read from a context with no
 * deviceScaleFactor override, so it reports the screen rather than the value
 * the scenarios then pin. Scenario pages run at a fixed deviceScaleFactor
 * (see browser.mjs); this exists to catch "Kevin plugged in a 1x monitor",
 * which changes what the whole campaign is optimizing.
 */
async function displayScale() {
  const browser = await chromium.launch({ headless: false })
  try {
    // `viewport: null` is load-bearing. Any other value makes Playwright
    // emulate device metrics, and the page then reports the EMULATED
    // deviceScaleFactor (1 by default) instead of the screen's — which is how
    // this probe first reported "1x" on a Built-In Retina LCD.
    const context = await browser.newContext({ viewport: null })
    const page = await context.newPage()
    const ratio = await page.evaluate(() => window.devicePixelRatio)
    return ratio
  } catch {
    return null
  } finally {
    await browser.close()
  }
}

/**
 * Field-by-field diff against a stored rig block. Empty array = match.
 *
 * A PRESENT-BUT-INCOMPLETE rig block counts as a mismatch, not as a pass. The
 * old rule skipped any key the baseline did not carry, which meant a
 * hand-written `"rig": {}` — entirely plausible, since Task 5 hand-fills this
 * file — disabled rig checking permanently and silently. Chrome would
 * auto-update, the machine would drop to battery, and every run would go on
 * claiming apples-to-apples. Absent keys are now named and reported.
 *
 * A wholly absent rig block still returns [] — that is the bootstrap case, and
 * `updateScenarios` fills it in.
 */
export function rigMismatches(current, stored) {
  if (!stored || Object.keys(stored).length === 0) return []
  const out = []
  for (const key of RIG_KEYS) {
    if (stored[key] === undefined) {
      out.push({ key, baseline: '(missing from baseline rig block)', current: current[key] })
      continue
    }
    if (String(stored[key]) !== String(current[key])) {
      out.push({ key, baseline: stored[key], current: current[key] })
    }
  }
  return out
}
