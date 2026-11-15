import { test, expect } from '@playwright/test'
import { RANKED, collectErrors, open } from './helpers/site'

test('a more-work row opens its project, and its all-work row opens the index', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, '/')

  // The home page's black section lists the case studies after the three selected ones.
  const target = RANKED[3]
  const row = page.locator(`.more a.wrow[href="/projects/${target.slug}"]`)
  await row.waitFor({ state: 'attached' })
  await row.scrollIntoViewIfNeeded()
  await row.click()

  await expect(page).toHaveURL(new RegExp(`/projects/${target.slug}$`))
  await expect(page.locator('h1.p-title')).toHaveText(target.title.en)

  const allWork = page.locator('.mw a.wrow[href="/all-work"]')
  await allWork.scrollIntoViewIfNeeded()
  await allWork.click()

  await expect(page).toHaveURL(/\/all-work$/)
  await expect(page.locator('main h1 .label')).toBeVisible()
  await expect(page.locator('.aw-list > li')).toHaveCount(RANKED.length)
  expect(errors).toEqual([])
})

// A nav link used from another page hands Home a section to open on. That
// target stays in the history entry's state, and Back used to replay it: the
// reader came back to "about", not to the project they had scrolled to.
test('Back lands where the page was left, not on the nav target that opened it', async ({ page }) => {
  const errors = collectErrors(page)
  const scrollY = (): Promise<number> => page.evaluate(() => Math.round(window.scrollY))
  await open(page, '/all-work')

  // A section link is on screen on every page, at every width.
  await page.locator('a.nav-link[href$="#about"]').click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('about')?.getBoundingClientRect().top ?? 9999))).toBe(0)
  const aboutY = await scrollY()

  // Read on, down to the second selected project, and open it.
  const item = page.locator('.stack-item').nth(1)
  await item.waitFor({ state: 'attached' })
  await item.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await expect.poll(scrollY).toBeGreaterThan(aboutY + 200)
  const leftAt = await scrollY()
  await item.click()
  await expect(page).toHaveURL(/\/projects\//)
  await expect.poll(scrollY).toBe(0)

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(scrollY, { timeout: 5000 }).toBeGreaterThan(leftAt - 4)
  expect(Math.abs((await scrollY()) - leftAt)).toBeLessThanOrEqual(3)

  // The same holds for every page: all work, scrolled, into a project and back.
  await page.goto('/all-work')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const row = page.locator('.aw-list > li').nth(3)
  await row.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await expect.poll(scrollY).toBeGreaterThan(200)
  const awLeftAt = await scrollY()
  await row.locator('a').first().click()
  await expect(page).toHaveURL(/\/projects\//)
  await expect.poll(scrollY).toBe(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/all-work$/)
  await expect.poll(scrollY, { timeout: 5000 }).toBeGreaterThan(awLeftAt - 4)
  expect(Math.abs((await scrollY()) - awLeftAt)).toBeLessThanOrEqual(3)
  expect(errors).toEqual([])
})
