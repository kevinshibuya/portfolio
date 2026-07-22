import { test, expect } from '@playwright/test'

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
  await page.waitForTimeout(500)

  expect(cls).toBeLessThan(0.001)
})

test('no long task > 200ms during scroll', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

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

  for (const d of longTasks) expect(d).toBeLessThan(200)
})
