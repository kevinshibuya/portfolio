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
