import { test, expect, type Page } from '@playwright/test'

/** Scrolls the page so #about's scroll-progress equals `progress` (0..1). */
async function setAboutProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const el = document.querySelector('#about') as HTMLElement | null
    if (!el) throw new Error('#about not found')
    const rect = el.getBoundingClientRect()
    const aboutTop = rect.top + window.scrollY
    const sectionHeight = rect.height
    const viewportHeight = window.innerHeight
    const y = aboutTop + p * (sectionHeight - viewportHeight)
    window.scrollTo(0, y)
  }, progress)
  // Give R3F two frames to settle.
  await page.waitForTimeout(200)
}

test.describe('about — desktop cinematic', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop-only suite')

  test('renders canvas at section entry', async ({ page }) => {
    await page.goto('/')
    await page.locator('#about').scrollIntoViewIfNeeded()
    const canvas = page.locator('#about canvas')
    await expect(canvas).toBeVisible()
  })

  test('canvas is aria-hidden and sr-only twin exists', async ({ page }) => {
    await page.goto('/')
    await page.locator('#about').scrollIntoViewIfNeeded()
    // The canvas is wrapped in a div[aria-hidden="true"] — R3F does not forward
    // aria-hidden to the inner <canvas> element itself.
    const hiddenWrapper = page.locator('#about [aria-hidden="true"]:has(canvas)')
    await expect(hiddenWrapper).toHaveCount(1)
    const srOnly = page.locator('#about .sr-only')
    await expect(srOnly).toHaveCount(1)
    const text = await srOnly.textContent()
    expect(text && text.length > 50).toBeTruthy()
  })

  test('robot canvas remains visible at scroll 0.25 (peak)', async ({ page }) => {
    await page.goto('/')
    await page.locator('#about').scrollIntoViewIfNeeded()
    await setAboutProgress(page, 0.25)
    const canvas = page.locator('#about canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    // Sticky canvas is full-bleed when in view — height should be near viewport.
    expect(box!.height).toBeGreaterThan(600)
  })

  test('section is reachable across all 6 fragment-peak progresses', async ({ page }) => {
    await page.goto('/')
    await page.locator('#about').scrollIntoViewIfNeeded()
    // Six peak progresses for the six fragments.
    const peaks = [0.5/6, 1.5/6, 2.5/6, 3.5/6, 4.5/6, 5.5/6]
    for (const p of peaks) {
      await setAboutProgress(page, p)
      const canvas = page.locator('#about canvas')
      await expect(canvas).toBeVisible()
    }
  })
})

test.describe('about — mobile fallback', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only suite')

  test('renders the DOM fallback, not the canvas', async ({ page }) => {
    await page.goto('/')
    const about = page.locator('#about')
    await expect(about).toBeVisible()
    const canvas = about.locator('canvas')
    await expect(canvas).toHaveCount(0)
    const paragraph = about.locator('.about-fallback__paragraph')
    await expect(paragraph).toBeVisible()
  })

  test('label and poster present on mobile fallback', async ({ page }) => {
    await page.goto('/')
    const about = page.locator('#about')
    const label = about.locator('.about-fallback__label')
    await expect(label).toBeVisible()
    const picture = about.locator('picture.about-fallback__picture')
    await expect(picture).toBeVisible()
  })
})

test.describe('about — reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('renders DOM fallback under prefers-reduced-motion', async ({ page }) => {
    await page.goto('/')
    const about = page.locator('#about')
    await expect(about).toBeVisible()
    const canvas = about.locator('canvas')
    await expect(canvas).toHaveCount(0)
    const paragraph = about.locator('.about-fallback__paragraph')
    await expect(paragraph).toBeVisible()
  })
})
