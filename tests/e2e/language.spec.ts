import { test, expect, type Page } from '@playwright/test'
import { collectErrors, open } from './helpers/site'

async function choose(page: Page, code: 'EN' | 'PT'): Promise<void> {
  const button = page.locator('.nav-lang-btn', { hasText: code })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
}

test('the EN/PT control switches the home page', async ({ page }) => {
  const errors = collectErrors(page)
  await open(page, '/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.hero-role')).toHaveText('software engineer · full-stack')
  await expect(page.locator('.nav-links')).toContainText('about')

  await choose(page, 'PT')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  await expect(page.locator('.hero-role')).toHaveText('engenheiro de software · full-stack')
  await expect(page.locator('.nav-links')).toContainText('sobre')

  await choose(page, 'EN')
  await expect(page.locator('.hero-role')).toHaveText('software engineer · full-stack')
  expect(errors).toEqual([])
})

test('the EN/PT control switches a project page', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, '/projects/radar-legislativo')
  await expect(page.locator('.p-kind')).toHaveText('legislative data platform')
  await expect(page.locator('.p-credits')).toContainText('credits')

  await choose(page, 'PT')
  await expect(page.locator('.p-kind')).toHaveText('plataforma de dados legislativos')
  await expect(page.locator('.p-credits')).toContainText('créditos')
  await expect(page.locator('.p-crumbs')).toContainText('todos os trabalhos')
  expect(errors).toEqual([])
})

test('?lang=pt opens in Portuguese', async ({ page }) => {
  await open(page, '/?lang=pt')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  await expect(page.locator('.hero-role')).toHaveText('engenheiro de software · full-stack')
})
