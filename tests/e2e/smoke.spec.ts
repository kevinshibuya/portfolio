import { test, expect } from '@playwright/test'
import { SLUGS, collectErrors, open } from './helpers/site'

// Every route mounts, renders its one h1 and stays console-clean (ADR 0013).
// Runs on desktop and on the phone project (MOBILE_SPECS).
const ROUTES = ['/', '/all-work', ...SLUGS.map((slug) => `/projects/${slug}`), '/projects/not-a-project']

for (const route of ROUTES) {
  test(`${route} loads with an h1 and no errors`, async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, route)
    await expect(page.locator('#root h1').first()).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('an unknown project slug shows the not-found view', async ({ page }) => {
  await open(page, '/projects/not-a-project')
  await expect(page.locator('main.notfound h1')).toHaveText('project not found')
})
