import { test, expect } from '@playwright/test'

test('no webgl2 falls back to a plain project list with no pin', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))

  // Refuse only webgl2. WebGL1 is untouched, so the hero's shader keeps
  // working and this isolates the scene's own probe — launching Chromium with
  // WebGL disabled would kill the hero too.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === 'webgl2') return null
      return (original as unknown as (id: string, ...rest: unknown[]) => unknown).call(
        this,
        contextId,
        ...args,
      )
    } as typeof HTMLCanvasElement.prototype.getContext
  })

  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').waitFor()

  await expect(page.locator('#projects .scene-fallback .scene-fallback-link')).toHaveCount(4)
  await expect(page.locator('#projects .scene-scroll')).toHaveCount(0)
  await expect(page.locator('#projects canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})
