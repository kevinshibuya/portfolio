import { test, expect } from '@playwright/test'

test('all 6 hero fragments render at final positions after loader', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'fragments hidden on mobile')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  // Allow entry timeline to complete (~1.1s + buffer)
  await page.waitForTimeout(1400)

  for (const id of ['bars', 'line', 'annotation', 'lattice', 'numeric', 'accent']) {
    const el = page.locator(`[data-fragment="${id}"]`)
    await expect(el).toBeVisible()
    const op = await el.evaluate((n) => parseFloat(getComputedStyle(n as HTMLElement).opacity))
    expect(op).toBeGreaterThan(0.99)
  }
})

test('entry timeline does NOT start before loaderDone', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'fragments hidden on mobile')
  await page.goto('/')
  // Sample fragment opacity while loader still active
  const op = await page.locator('[data-fragment="bars"]').evaluate((n) =>
    parseFloat(getComputedStyle(n as HTMLElement).opacity)
  )
  expect(op).toBeLessThan(0.05)
})
