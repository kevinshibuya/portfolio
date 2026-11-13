import { test, expect, type Page } from '@playwright/test'
import { projects } from '../../src/data/projects'

/**
 * More work and the volume sentence (spec #35, ADR 0014).
 *
 * Under the scene, inside the Selected Work section: the projects the corridor
 * does not carry, as an ordered list of WorkRows, closed by one line that
 * claims the editorial volume and links to All work.
 *
 * `src/data/projects` imports only a type, so Playwright can read it. The
 * expected rows are derived from the data with the same predicate the section
 * uses, never hardcoded: the highlight set past the corridor's four.
 */
const MORE = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) > 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

/** `year · tech · tech`, the string the corridor captions show. */
const metaOf = (p: (typeof MORE)[number]): string[] => [
  String(p.year),
  ...p.techStack.slice(0, 2).map((s) => s.toLowerCase()),
]

const VOLUME = {
  en: 'plus 250+ interactives for GZH since 2023 · see all work →',
  pt: 'e mais de 250 peças interativas para a GZH desde 2023 · ver todos os trabalhos →',
}

const ROOT = '#projects .more-work'
const ROWS = `${ROOT} li .workrow-link`
const VOLUME_LINK = `${ROOT} .more-work-volume a`

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

async function openHome(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator(ROOT).waitFor({ state: 'attached', timeout: 30_000 })
}

/** Refuse only webgl2, as scene-no-webgl does: the hero's WebGL1 shader keeps working. */
async function refuseWebgl2(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === 'webgl2') return null
      return (original as unknown as (id: string, ...rest: unknown[]) => unknown).call(this, contextId, ...args)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

/** The rows and the sentence, as a reader meets them. Shared by the WebGL and no-WebGL runs. */
async function expectRowsAndSentence(page: Page): Promise<void> {
  expect(MORE.length, 'the data must hold projects past the corridor').toBe(5)

  // A plain ordered list of five links, and nothing named a heading.
  const list = page.locator(ROOT).getByRole('list')
  await expect(list).toHaveCount(1)
  expect(await list.evaluate((el) => el.tagName)).toBe('OL')
  await expect(list.getByRole('listitem')).toHaveCount(5)
  await expect(page.locator(ROOT).getByRole('heading')).toHaveCount(0)
  await expect(page.locator('#projects').getByRole('heading')).toHaveCount(1)

  const rows = page.locator(ROWS)
  await expect(rows).toHaveCount(5)
  for (let i = 0; i < MORE.length; i++) {
    const p = MORE[i]
    const row = rows.nth(i)
    await expect(row).toHaveAttribute('href', `/projects/${p.slug}`)
    await expect(row).not.toHaveAttribute('target', /.+/)
    await expect(row.locator('.workrow-index')).toHaveText(String(i + 1).padStart(2, '0'))
    await expect(row.locator('.workrow-title')).toHaveText(p.title.en)
    await expect(row.locator('.workrow-meta-item')).toHaveText(metaOf(p))
    await expect(row.locator('.workrow-arrow')).toHaveText('→')
  }

  // The sentence closes the list: after the last row, its tail the link.
  const volume = page.locator(`${ROOT} .more-work-volume`)
  await expect(volume).toHaveCount(1)
  expect(await volume.evaluate((el) => el.textContent?.replace(/\s+/g, ' ').trim())).toBe(VOLUME.en)
  const follows = await page.evaluate(
    ({ list, volume }) => {
      const l = document.querySelector(list)!
      const v = document.querySelector(volume)!
      return !!(l.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING)
    },
    { list: `${ROOT} ol`, volume: `${ROOT} .more-work-volume` },
  )
  expect(follows).toBe(true)
  await expect(page.locator(VOLUME_LINK)).toHaveCount(1)
  await expect(page.locator(VOLUME_LINK)).toHaveAttribute('href', '/all-work')
}

test.describe('more work', () => {
  test.describe.configure({ timeout: 120_000 })

  test('1 · five rows after the scene, in rank order, then the volume sentence', async ({ page }) => {
    const errors = collectErrors(page)
    await openHome(page)
    await page.locator('#projects .scene-scroll').waitFor({ state: 'attached' })

    // After the scroll wrapper, inside the section, in normal flow.
    const place = await page.evaluate((root) => {
      const wrapper = document.querySelector('#projects .scene-scroll')!
      const more = document.querySelector(root) as HTMLElement
      return {
        afterWrapper: !!(wrapper.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING),
        inWrapper: wrapper.contains(more),
        position: getComputedStyle(more).position,
      }
    }, ROOT)
    expect(place.afterWrapper).toBe(true)
    expect(place.inWrapper).toBe(false)
    expect(place.position).toBe('static')

    await expectRowsAndSentence(page)
    expect(errors).toEqual([])
  })

  test('2 · the sentence reads in Portuguese, and its link reaches All work', async ({ page }) => {
    await openHome(page, '/?lang=pt')
    const volume = page.locator(`${ROOT} .more-work-volume`)
    expect(await volume.evaluate((el) => el.textContent?.replace(/\s+/g, ' ').trim())).toBe(VOLUME.pt)

    await page.locator('.nav-lang').click()
    await expect
      .poll(() => volume.evaluate((el) => el.textContent?.replace(/\s+/g, ' ').trim()))
      .toBe(VOLUME.en)

    await page.locator(VOLUME_LINK).scrollIntoViewIfNeeded()
    await page.locator(VOLUME_LINK).click()
    await expect(page).toHaveURL(/\/all-work$/)
    await expect(page.locator('.stream.stream--visible')).toBeVisible()
  })

  test('3 · without WebGL the same rows and sentence follow the four fallback cards', async ({ page }) => {
    const errors = collectErrors(page)
    await refuseWebgl2(page)
    await openHome(page)

    await expect(page.locator('#projects .scene-fallback-card')).toHaveCount(4)
    await expect(page.locator('#projects .scene-scroll')).toHaveCount(0)
    const afterFallback = await page.evaluate((root) => {
      const fallback = document.querySelector('#projects .scene-fallback')!
      return !!(fallback.compareDocumentPosition(document.querySelector(root)!) & Node.DOCUMENT_POSITION_FOLLOWING)
    }, ROOT)
    expect(afterFallback).toBe(true)

    await expectRowsAndSentence(page)
    expect(errors).toEqual([])
  })

  test('4 · on-light colours only, on the section cream', async ({ page }) => {
    await openHome(page)
    await page.locator(ROOT).scrollIntoViewIfNeeded()

    // Nothing between #projects and the rows paints a ground of its own, and
    // #projects is the chapter's cream.
    const grounds = await page.locator(ROOT).evaluate((el) => {
      const out: string[] = []
      for (let node = el as HTMLElement | null; node && node.id !== 'projects'; node = node.parentElement) {
        out.push(getComputedStyle(node).backgroundColor)
      }
      return { between: out, section: getComputedStyle(document.querySelector('#projects')!).backgroundColor }
    })
    expect(grounds.section).toBe('rgb(245, 242, 236)')
    for (const ground of grounds.between) expect(ground).toBe('rgba(0, 0, 0, 0)')

    // Every text colour is an existing on-light step: ink and muted for text a
    // reader must read, the faded step only on aria-hidden decoration.
    const ON_LIGHT = ['rgb(11, 14, 20)', 'rgba(11, 14, 20, 0.62)']
    const FADED = 'rgba(11, 14, 20, 0.4)'
    const colours = await page.locator(ROOT).evaluate((root) => {
      const out: { colour: string; hidden: boolean }[] = []
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        const hidden = !!el.closest('[aria-hidden="true"]')
        const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '')
        if (ownText) out.push({ colour: getComputedStyle(el).color, hidden })
        const before = getComputedStyle(el, '::before')
        if (before.content !== 'none' && before.content !== 'normal') out.push({ colour: before.color, hidden })
      }
      return out
    })
    expect(colours.length).toBeGreaterThan(0)
    for (const { colour, hidden } of colours) {
      expect(hidden ? [...ON_LIGHT, FADED] : ON_LIGHT).toContain(colour)
    }
  })

  test('5 · Tab runs from the four card links into the rows, then the sentence link', async ({ page }) => {
    await openHome(page)
    await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()

    const cardLinks = page.locator('#projects .scene-cardlink')
    await expect(cardLinks).toHaveCount(4)
    await cardLinks.nth(3).focus()

    const reached: (string | null)[] = []
    for (let i = 0; i < MORE.length + 1; i++) {
      await page.keyboard.press('Tab')
      reached.push(
        await page.evaluate((root) => {
          const el = document.activeElement as HTMLElement
          return el.closest(root) ? el.getAttribute('href') : `outside: ${el.outerHTML.slice(0, 80)}`
        }, ROOT),
      )
    }
    expect(reached).toEqual([...MORE.map((p) => `/projects/${p.slug}`), '/all-work'])
  })

  test('6 · fits the viewport width: no horizontal scroll', async ({ page }) => {
    await openHome(page)
    await page.locator(ROOT).scrollIntoViewIfNeeded()
    const geo = await page.locator(ROOT).evaluate((el) => {
      const r = el.getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        left: r.left,
        right: r.right,
        viewport: document.documentElement.clientWidth,
        rows: Array.from(el.querySelectorAll('.workrow')).map((row) => row.scrollWidth - row.clientWidth),
      }
    })
    expect(geo.overflow).toBeLessThanOrEqual(0)
    expect(geo.left).toBeGreaterThanOrEqual(0)
    expect(geo.right).toBeLessThanOrEqual(geo.viewport)
    for (const spill of geo.rows) expect(spill).toBeLessThanOrEqual(0)
  })
})
