import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page } from '@playwright/test'

const HARNESS = process.env.PERF_HARNESS === '1'
const STARVED =
  'throughput assertion, starved in the full suite; run with PERF_HARNESS=1 on a quiet rig'
// 11, so the wait keeps the old `> 10` liveness bar exactly (ADR 0007).
const LIVENESS_FRAMES = 11
const LIVENESS_TIMEOUT_MS = 15_000

// The long-task assertion measures wall-clock work, so it is sensitive to what
// else is on the CPU; it runs only under PERF_HARNESS=1. Retries let contention
// pass without moving the budget: a genuine regression blows it on every
// attempt, contention does not.

test('CLS is zero across loader handoff and section enters', async ({ page }) => {
  // exposeBinding MUST be registered before goto so the injected binding
  // is available when the PerformanceObserver fires inside evaluate.
  let cls = 0
  await page.exposeBinding('__report_cls', (_, value: number) => { cls += value })

  await page.goto('/')

  await page.evaluate(() => {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceEntry[]) {
        const layoutEntry = e as PerformanceEntry & { value: number; hadRecentInput: boolean }
        if (!layoutEntry.hadRecentInput) {
          // @ts-expect-error injected
          window.__report_cls(layoutEntry.value)
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })

  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
  // window: CLS is measured across this interval
  await page.waitForTimeout(500)

  expect(cls).toBeLessThan(0.001)
})

// Retries cover THIS test only, which is why it sits in a describe of its own:
// `test.describe.configure` at file scope applies to the whole FILE regardless
// of where it is written, and it was silently softening the CLS check too. The
// long-task test is the one that two concurrent SwiftShader projects can push
// past the budget through contention alone; CLS is not contention-sensitive and
// stays a hard, single-attempt gate.
test.describe('long tasks', () => {
  test.describe.configure({ retries: 2 })

  test('no long task > 300ms during scroll', async ({ page }) => {
    test.skip(!HARNESS, STARVED)
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.waitForSelector('[data-entrance="settled"]')

    const longTasks = await page.evaluate(async () => {
      const arr: number[] = []
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) arr.push(e.duration)
      })
      obs.observe({ type: 'longtask', buffered: false })

      // simulate scroll through page
      for (let y = 0; y < document.body.scrollHeight; y += 200) {
        window.scrollTo({ top: y })
        await new Promise((r) => requestAnimationFrame(r))
      }

      obs.disconnect()
      return arr
    })

    // Budget raised 200→300 ms (2026-07-22): the 200 ms budget sat inside the
    // task's own noise band under machine load.
    for (const d of longTasks) expect(d).toBeLessThan(300)
  })
})

// ---------------------------------------------------------------------------
// Layer 1 — EXACT budgets (harness spec "Layer 1")
//
// Everything below is a property of the code with zero variance: byte counts,
// call counts, behavioural invariants. No tolerance bands, no timing numbers —
// those live in Layer 2 (the CDP scenario runner) and Layer 3 (Lighthouse).
// An assertion here is either right or wrong, so it is hard-asserted and
// QA-gated forever. If one of these goes red, the app changed; it is never
// "the machine was busy".
// ---------------------------------------------------------------------------

interface PerfCounters {
  drawCalls: number
  uniformUploads: number
  frames: number
  resizes: number
  rafLoopStarts: number
}
type PerfStore = Record<string, PerfCounters>

// The paint caps devicePixelRatio at 1.5 (paint.ts DPR_CAP). Desktop Chrome
// runs at dpr 1 (uncapped path), Pixel 5 at 2.75 (capped path) — so both sides
// of the Math.min are exercised by the two Playwright projects.
const DPR_CAP = 1.5

const baselinePath = fileURLToPath(new URL('../../perf/baseline.json', import.meta.url))

const readCounters = (page: Page): Promise<PerfStore> =>
  page.evaluate(() => (window as unknown as { __PERF_GL__: PerfStore }).__PERF_GL__)

// Settle = loader gone, hero rise finished, hero canvas mounted. Same shape as
// perf-hooks.spec.ts so both specs observe the same well-defined moment.
const settle = async (page: Page, query = ''): Promise<void> => {
  await page.goto(query ? `/?${query}` : '/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-entrance="settled"]')
  await page.waitForSelector('[data-canvas="fluid-waves"]')
}

// Behavioural: exact per-frame GL contracts, no baselined number. Run by default.
test.describe('harness Layer 1', () => {

  test('hero GL work is exactly one draw + one uniform upload per frame, from one loop', async ({ page }) => {
    await settle(page, 'perf-seed=0.5&perf-counters')
    await page.waitForTimeout(400) // window: past mount-time setup draws

    const a = await readCounters(page)
    expect(a['fluid-waves']).toBeDefined()
    // Liveness by waiting for frames, not by counting them over a wall-clock
    // second: the count starved under a loaded suite (#11, same as perf-hooks).
    await page.waitForFunction(
      (target) =>
        (window as unknown as { __PERF_GL__: Record<string, { frames: number }> }).__PERF_GL__['fluid-waves']
          .frames >= target,
      a['fluid-waves'].frames + LIVENESS_FRAMES,
      { timeout: LIVENESS_TIMEOUT_MS },
    )
    const b = await readCounters(page)

    const h1 = a['fluid-waves']
    const h2 = b['fluid-waves']
    expect(h1).toBeDefined()
    expect(h2).toBeDefined()

    // Uploads/draws at setup and at resize are counted BY DESIGN, so the
    // per-frame exactness claim only holds over a resize-free window. Assert the
    // window was resize-free rather than assuming it. This is NOT a frozen load
    // (no ?perf-freeze), so the frozen-resize suppression never applies here and
    // every resize() call would increment — the precondition holds simply
    // because the viewport is fixed. Same wording as perf-hooks.spec.ts.
    expect(h2.resizes - h1.resizes, 'fixed viewport: window is resize-free').toBe(0)

    const frames = h2.frames - h1.frames
    expect(frames, 'rAF loop is running').toBeGreaterThanOrEqual(LIVENESS_FRAMES)

    const ceiling = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
      exact: { uniformUploadsPerFrame: number }
    }
    expect(h2.drawCalls - h1.drawCalls).toBe(frames)
    expect(h2.uniformUploads - h1.uniformUploads).toBe(frames * ceiling.exact.uniformUploadsPerFrame)

    // R2: rafLoopStarts counts REAL loop starts (rafId null -> id), not start()
    // calls — the IntersectionObserver calls start() on mount and on every
    // viewport re-entry. A resume after an off-screen pause legitimately starts a
    // new loop, so this only means "exactly one" on a load whose hero was never
    // scrolled out of view and back. This test never scrolls; the pause budget
    // below takes its own page load for exactly that reason.
    // The draw/uniform ratios above cannot detect a duplicate loop driving the
    // same drawFrame (both counts would scale together) — this is what does.
    expect(h2.rafLoopStarts, 'exactly one rAF loop ever started for the hero canvas').toBe(1)
  })

  test('hero canvas pauses off-screen: zero frames while paused', async ({ page }) => {
    await settle(page, 'perf-seed=0.5&perf-counters')
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))

    // Attribute wait with a generous timeout — deliberately NOT the timing-race
    // wait pattern of the known hero-shader.spec.ts flake. If data-paused never
    // appears, that is a genuine app/IO defect surfacing, not a budget miss.
    await page.waitForSelector('[data-canvas="fluid-waves"][data-paused="true"]', { timeout: 15_000 })

    const before = (await readCounters(page))['fluid-waves']
    // window: absence check: a paused canvas must draw nothing
    await page.waitForTimeout(500)
    const after = (await readCounters(page))['fluid-waves']
    expect(after.frames - before.frames, 'a paused canvas must draw nothing').toBe(0)
  })

  test('reduced motion: static frame, no loop, at most three startup draws', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await settle(page, 'perf-seed=0.5&perf-counters')
    await page.waitForSelector('[data-canvas="fluid-waves"][data-static="true"]')
    await page.waitForTimeout(500) // window: let the startup draws land before sampling

    const before = (await readCounters(page))['fluid-waves']
    // window: absence check: the frame count must stay frozen
    await page.waitForTimeout(1000)
    const after = (await readCounters(page))['fluid-waves']

    expect(after.frames - before.frames, 'no loop: frame count is frozen after settle').toBe(0)
    expect(after.rafLoopStarts, 'reduced motion never starts a loop').toBe(0)
    // The code may draw a few startup frames (a resize while it holds the
    // grant, the grant's own start(), a redraw for a window that appears), so
    // `frames === 1` is not an invariant. The budget is the ceiling plus the
    // stability window above.
    expect(after.frames, 'at most three startup draws under reduced motion').toBeLessThanOrEqual(3)
    expect(after.frames, 'at least one static frame is drawn').toBeGreaterThanOrEqual(1)
  })

})

// The capped-DPR rule, held for both paint canvases: each sizes its backing
// store as round(clientWidth · min(dpr, 1.5)).
test('paint canvas backing stores match the capped-DPR contract exactly', async ({ page }) => {
  await settle(page, 'perf-seed=0.5')
  // The closing's canvas mounts only once the block is near.
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.waitForSelector('[data-canvas="fluid-waves-closing"]')
  await page.waitForTimeout(300) // window: let any resize() settle before sampling

  const measured = await page.evaluate((cap: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, cap)
    return [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-canvas]')].map((c) => ({
      id: c.dataset.canvas ?? '(unnamed)',
      width: c.width,
      height: c.height,
      expectedWidth: Math.max(1, Math.round(c.clientWidth * dpr)),
      expectedHeight: Math.max(1, Math.round(c.clientHeight * dpr)),
    }))
  }, DPR_CAP)

  // Both canvases must exist: a shorter list would make every assertion below
  // vacuously true for the missing one.
  expect(measured.map((m) => m.id).sort()).toEqual(['fluid-waves', 'fluid-waves-closing'])
  for (const m of measured) {
    expect(m.width, `${m.id} backing store width`).toBe(m.expectedWidth)
    expect(m.height, `${m.id} backing store height`).toBe(m.expectedHeight)
  }
})
