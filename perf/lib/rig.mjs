// Rig stamping. Every number this harness produces is rig-relative by design
// (the spec: "no CI/cloud perf runs — the rig is local"). A number compared
// across rigs is not a comparison, so the rig block travels with every report
// and a mismatch refuses `--update-baseline` outright.

import { chromium } from '@playwright/test'
import { runSync, run } from './proc.mjs'

/** Keys that must match for a baseline comparison to mean anything. */
export const RIG_KEYS = ['chrome', 'macos', 'arch', 'cpu', 'displayScale', 'acPower']

export async function collectRig() {
  const acResult = await run('pmset', ['-g', 'ps'])
  const acPower = /AC Power/i.test(acResult.stdout)

  return {
    chrome: await chromeVersion(),
    macos: runSync('sw_vers', ['-productVersion']),
    arch: runSync('uname', ['-m']),
    cpu: runSync('sysctl', ['-n', 'machdep.cpu.brand_string']),
    displayScale: await displayScale(),
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

/** Field-by-field diff against a stored rig block. Empty array = match. */
export function rigMismatches(current, stored) {
  if (!stored) return []
  const out = []
  for (const key of RIG_KEYS) {
    if (stored[key] === undefined) continue
    if (String(stored[key]) !== String(current[key])) {
      out.push({ key, baseline: stored[key], current: current[key] })
    }
  }
  return out
}
