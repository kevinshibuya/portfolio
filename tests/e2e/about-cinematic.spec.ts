import { test, expect } from '@playwright/test'

test.describe('About cinematic — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  // These tests assert desktop-specific canvas behaviour (sticky pin, R3F
  // canvas). Under mobile device emulation WebGL runs on the software
  // renderer and takes 20-30 s, which blows the default test timeout.
  // Gate to desktop-chromium only.
  test.skip(({ isMobile }) => isMobile, 'desktop-only suite')

  test('about outer wrapper is ~300vh tall', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const heightInVh = await page.locator('#about').evaluate((el) => {
      const h = el.getBoundingClientRect().height
      return h / window.innerHeight
    })
    expect(heightInVh).toBeGreaterThan(2.8)
    expect(heightInVh).toBeLessThan(3.2)
  })

  test('inner container uses position: sticky', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const position = await page.locator('#about .about-sticky').evaluate(
      (el) => getComputedStyle(el as HTMLElement).position,
    )
    expect(position).toBe('sticky')
  })

  test('canvas renders inside the sticky', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('#about .about-sticky canvas')).toBeVisible()
  })

  test('accessibility twin contains all three beats', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const twin = page.locator('#about [role="region"]')
    await expect(twin).toBeAttached()
    const articles = twin.locator('article')
    await expect(articles).toHaveCount(3)
  })
})

test.describe('About cinematic — mobile fallback', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('no <canvas> rendered under #about', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const canvasCount = await page.locator('#about canvas').count()
    expect(canvasCount).toBe(0)
  })

  test('poster image present', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const img = page.locator('#about img').first()
    await expect(img).toBeVisible()
    const src = await img.getAttribute('src')
    expect(src || '').toContain('about-toy-poster')
  })

  test('three beat articles render', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const articles = page.locator('#about article')
    await expect(articles).toHaveCount(3)
  })
})

test.describe('About cinematic — reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } })
  // Same WebGL-on-software-renderer concern as the desktop suite.
  test.skip(({ isMobile }) => isMobile, 'desktop-only suite')

  test('falls back to DOM (no canvas)', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const canvasCount = await page.locator('#about canvas').count()
    expect(canvasCount).toBe(0)
    const articles = page.locator('#about article')
    await expect(articles).toHaveCount(3)
  })
})
