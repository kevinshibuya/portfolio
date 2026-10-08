import { test, expect } from '@playwright/test'

// Runs by DEFAULT. This file is the instrumentation contract behind every
// harness measurement · the ?perf-seed / ?perf-freeze / ?perf-counters hooks in
// FluidWaves · and it asserts behaviour, not a baselined number.
//
// The per-frame contract waits for LIVENESS_FRAMES frames to advance rather
// than counting frames over a wall-clock second. The count was a throughput
// assertion: it measured 8 frames twice in the full serial suite while passing
// alone, and loosening it is what ADR 0007 forbids. Waiting for N frames
// asserts the same liveness without depending on how fast the machine is, and
// the exact draw and uniform ratios hold over whatever window results (#11).
const LIVENESS_FRAMES = 10
const LIVENESS_TIMEOUT_MS = 15_000

// Acceptance for the determinism hooks (spec: "App instrumentation").
// Authored upstream — implementers make these pass, never edit them.

const settle = async (page: import('@playwright/test').Page, query: string): Promise<void> => {
  await page.goto(`/?${query}`)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-entrance="settled"]')
  await page.waitForSelector('[data-canvas="fluid-waves"]')
}

test('freeze + seed + role pin: frame is exactly reproducible across reloads', async ({ page }) => {
  await settle(page, 'perf-seed=0.5&perf-freeze=2&perf-role=0')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const canvas = page.locator('[data-canvas="fluid-waves"]')
  const a = await canvas.screenshot()
  await settle(page, 'perf-seed=0.5&perf-freeze=2&perf-role=0')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const b = await canvas.screenshot()
  // Same rig, same driver, same seed, same frozen time, pinned role, settled
  // entrance: the render is a pure function of its inputs — byte-identical is
  // the CONTRACT. If this fails while the frames look identical, that is a
  // determinism defect in the hooks (or driver nondeterminism worth knowing
  // about): return blocked, do not loosen this assertion.
  expect(a.equals(b)).toBe(true)
})

test('different perf-seed produces different paint', async ({ page }) => {
  await settle(page, 'perf-seed=0.1&perf-freeze=2&perf-role=0')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const a = await page.locator('[data-canvas="fluid-waves"]').screenshot()
  await settle(page, 'perf-seed=0.9&perf-freeze=2&perf-role=0')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const b = await page.locator('[data-canvas="fluid-waves"]').screenshot()
  expect(a.equals(b)).toBe(false)
})

test('perf-counters exposes exact per-frame GL work', async ({ page }) => {
  await settle(page, 'perf-seed=0.5&perf-counters&perf-role=0')
  // window: past mount-time setup before the first sample
  await page.waitForTimeout(1000)
  type C = Record<string, { drawCalls: number; uniformUploads: number; frames: number; resizes: number; rafLoopStarts: number }>
  const s1 = await page.evaluate(() => (window as unknown as { __PERF_GL__: C }).__PERF_GL__)
  const h1 = s1['fluid-waves']
  expect(h1).toBeDefined()
  // Liveness: the loop advances LIVENESS_FRAMES frames, however long that takes.
  await page.waitForFunction(
    (target) => (window as unknown as { __PERF_GL__: C }).__PERF_GL__['fluid-waves'].frames >= target,
    h1.frames + LIVENESS_FRAMES,
    { timeout: LIVENESS_TIMEOUT_MS },
  )
  const s2 = await page.evaluate(() => (window as unknown as { __PERF_GL__: C }).__PERF_GL__)
  const h2 = s2['fluid-waves']
  expect(h2.resizes - h1.resizes).toBe(0) // fixed viewport: window is resize-free
  expect(h2.rafLoopStarts).toBe(1) // exactly one loop ever started for this canvas
  const frames = h2.frames - h1.frames
  expect(frames).toBeGreaterThanOrEqual(LIVENESS_FRAMES) // loop is running
  // Exact per-frame contract in a resize-free window: 1 draw + 1 uniform per frame.
  expect(h2.drawCalls - h1.drawCalls).toBe(frames)
  expect(h2.uniformUploads - h1.uniformUploads).toBe(frames)
})

// Split from the counters test so it never waits on throughput: the 24 live
// pixel goldens rest on this precondition.
test('perf-freeze halts everything: one frame, no loop, no redraw', async ({ page }) => {
  type C = Record<string, { frames: number; rafLoopStarts: number }>
  await settle(page, 'perf-seed=0.5&perf-freeze=2&perf-counters&perf-role=0')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const f1 = await page.evaluate(() => (window as unknown as { __PERF_GL__: C }).__PERF_GL__)
  // window: absence check: a frozen canvas must not redraw
  await page.waitForTimeout(800)
  const f2 = await page.evaluate(() => (window as unknown as { __PERF_GL__: C }).__PERF_GL__)
  expect(f2['fluid-waves'].frames).toBe(f1['fluid-waves'].frames)
  expect(f2['fluid-waves'].frames).toBe(1)
  expect(f2['fluid-waves'].rafLoopStarts).toBe(0)
})

test('no params: hooks dormant, normal loop untouched', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-canvas="fluid-waves"]')
  const hasCounters = await page.evaluate(() => '__PERF_GL__' in window)
  expect(hasCounters).toBe(false)
  await expect(page.locator('[data-canvas="fluid-waves"]')).not.toHaveAttribute('data-perf-frozen', 'true')
})
