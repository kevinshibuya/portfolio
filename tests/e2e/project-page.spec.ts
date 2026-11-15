import { test, expect, type Page } from '@playwright/test'
import { architectures } from '../../src/data/architecture'
import { SLUGS, collectErrors, loadSrc, open } from './helpers/site'

type Media = typeof import('../../src/data/media')

// The project page has two forms, chosen by useWide at 861 px: wide is one
// numbered column with the credits beside it and the live line in the title
// row; narrow is the facts under the title, then labelled groups.

async function at(page: Page, width: number, slug: string): Promise<void> {
  await page.setViewportSize({ width, height: 900 })
  await open(page, `/projects/${slug}`)
  await expect(page.locator('h1.p-title')).toBeVisible()
}

test.describe('wide, at 1440', () => {
  for (const slug of SLUGS) {
    test(`${slug}: credits and live line, one frame per column item, diagram last`, async ({ page }) => {
      const errors = collectErrors(page)
      await at(page, 1440, slug)

      await expect(page.locator('.p-credits')).toBeVisible()
      await expect(page.locator('.p-live')).toBeVisible()
      await expect(page.locator('.p-facts')).toHaveCount(0)
      await expect(page.locator('.p-group')).toHaveCount(0)

      const { columnOf } = await loadSrc<Media>('data/media.ts')
      const column = columnOf(slug)
      expect(column.length).toBeGreaterThan(0)
      await expect(page.locator('.p-column > .shot')).toHaveCount(column.length)

      const diagram = page.locator('.p-media > figure.diagram')
      if (architectures[slug]) {
        await expect(diagram).toHaveCount(1)
        const after = await page.evaluate(() => {
          const column = document.querySelector('.p-column')
          const figure = document.querySelector('.p-media > figure.diagram')
          return Boolean(column && figure && column.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING)
        })
        expect(after, 'the diagram follows the column').toBe(true)
      } else {
        await expect(diagram).toHaveCount(0)
      }
      expect(errors).toEqual([])
    })
  }
})

test.describe('narrow, at 390', () => {
  for (const slug of ['radar-legislativo', 'fotos-do-ano-2025']) {
    test(`${slug}: facts and groups, no credits column`, async ({ page }) => {
      const errors = collectErrors(page)
      await at(page, 390, slug)

      await expect(page.locator('.p-facts')).toBeVisible()
      const { galleryOf } = await loadSrc<Media>('data/media.ts')
      await expect(page.locator('.p-group')).toHaveCount(galleryOf(slug).groups.length)
      await expect(page.locator('.p-credits')).toHaveCount(0)
      await expect(page.locator('.p-live')).toHaveCount(0)
      await expect(page.locator('.p-column')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
})

test('resizing across 861 px switches the form without an error', async ({ page }) => {
  const errors = collectErrors(page)
  await at(page, 1440, 'enquetes-gzh')
  await expect(page.locator('.p-credits')).toBeVisible()

  await page.setViewportSize({ width: 860, height: 900 })
  await expect(page.locator('.p-facts')).toBeVisible()
  await expect(page.locator('.p-credits')).toHaveCount(0)

  await page.setViewportSize({ width: 861, height: 900 })
  await expect(page.locator('.p-credits')).toBeVisible()
  await expect(page.locator('.p-facts')).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.p-facts')).toBeVisible()
  await expect(page.locator('.p-group').first()).toBeVisible()
  expect(errors).toEqual([])
})
