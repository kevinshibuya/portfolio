import { test, expect } from '@playwright/test'
import { RANKED, collectErrors, open } from './helpers/site'

/**
 * Things a visible element can hide: a link under a picture, a title that is
 * not a heading, two lines of the header on top of each other, a cut-out that
 * never got its paint. Each test sets its own viewport, so the spec is
 * desktop-only.
 */

test('every section of home has a heading', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, '/')
  await expect(page.locator('h1')).toHaveCount(1)
  // The sections under the hero arrive in their own chunk: wait for the last of them.
  await expect(page.locator('h2 .label')).toHaveCount(4)
  const named = await page.locator('h2 .label').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
  expect(named).toEqual(['selected work', 'more work', 'experience', 'contact'])
})

// The longest title: it ran to two lines when the title was held to eight
// columns, which pushed the row with the live link under the recording.
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1280, 720],
  [1024, 768],
] as const) {
  test(`the live link is not under the recording at ${width} by ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await open(page, '/projects/painel-da-reconstrucao')
    const link = page.locator('.p-live a')
    await expect(link).toBeVisible()
    // Wait for the arrival to put the link where it stays.
    await expect
      .poll(() =>
        link.evaluate((el) => {
          const box = el.getBoundingClientRect()
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
          return hit !== null && el.contains(hit)
        }),
      )
      .toBe(true)
  })
}

for (const width of [900, 1280]) {
  test(`the header's name line stands clear of its links at ${width}, in Portuguese`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await open(page, '/projects/enquetes-gzh?lang=pt')
    const name = page.locator('.nav-name')
    await expect(name).toBeVisible()
    const gap = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.nav-link')]
      const last = links[links.length - 1].getBoundingClientRect()
      const line = document.querySelector('.nav-name')!.getBoundingClientRect()
      return line.left - last.right
    })
    expect(gap).toBeGreaterThanOrEqual(12)
  })
}

test('a project page reached from home paints its year', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, '/')
  const target = RANKED[3]
  const row = page.locator(`.more a.wrow[href="/projects/${target.slug}"]`)
  await row.scrollIntoViewIfNeeded()
  await row.click()
  await expect(page).toHaveURL(new RegExp(`/projects/${target.slug}$`))
  // The cut-out marks its canvas once it holds a frame of the paint (PaintWindow.tsx).
  await expect(page.locator('.p-yearmark canvas')).toHaveAttribute('data-painted', 'true')
  expect(errors).toEqual([])
})

test('each page names itself as its canonical address', async ({ page }) => {
  await open(page, '/projects/enquetes-gzh')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kevinshibuya.com/projects/enquetes-gzh')
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://kevinshibuya.com/projects/enquetes-gzh')
  await open(page, '/all-work')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kevinshibuya.com/all-work')
  await open(page, '/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kevinshibuya.com/')
})

test('on a phone with reduced motion the recording is shown once at the top of a project page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await open(page, '/projects/enquetes-gzh')
  await expect(page.locator('.p-slot')).toBeHidden()
  await expect(page.locator('.p-lead-media .shot')).toBeVisible()
  await context.close()
})
