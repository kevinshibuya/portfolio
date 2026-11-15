import { test, expect } from '@playwright/test'
import { collectErrors, open } from './helpers/site'

// With reduced motion every page is where it ends from its first frame: the
// hero renders settled and a page's opening parts are never hidden for an
// arrival, so nothing waits on the entrance.
test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('home shows the hero settled from its first render', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  const hero = page.locator('section.hero')
  await hero.waitFor({ state: 'attached' })
  // Read at once, before the loader is gone: no waiting on the entrance.
  expect(await hero.getAttribute('data-entrance')).toBe('settled')
  await expect(page.locator('.hero-bottom')).toHaveClass(/is-instant/)

  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('h1.hero-name')).toBeVisible()
  await expect(page.locator('.hero-role')).toBeVisible()
  expect(errors).toEqual([])
})

test('a project page never hides its opening parts', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/projects/radar-legislativo')
  await page.locator('h1.p-title').waitFor({ state: 'attached' })
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-enter]')].filter((el) => el.style.visibility === 'hidden').length,
  )
  expect(hidden).toBe(0)

  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('h1.p-title')).toBeVisible()
  // The credits column on a wide screen, the facts on a narrow one.
  await expect(page.locator('.p-credits, .p-facts').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the home sections still arrive', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, '/')
  await expect(page.locator('#about')).toBeAttached()
  await expect(page.locator('#work .stack-item')).toHaveCount(3)
  expect(errors).toEqual([])
})
