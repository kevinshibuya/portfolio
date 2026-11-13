import { test, expect, type Page } from '@playwright/test'

// All work, the page of its own (ADR 0014): the Stream in its visible mode,
// off the homepage. Every expected count is read from the page itself, never
// hardcoded: the stated total must equal the rendered rows, and the year counts
// must sum to it.

async function openAllWork(page: Page, path = '/all-work'): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('.stream.stream--visible')).toBeVisible()
}

/** The leading integer of a count line: "171 pieces", "171 peças". */
async function countOf(page: Page, selector: string): Promise<number[]> {
  const texts = await page.locator(selector).allTextContents()
  return texts.map((text) => {
    const match = /\d+/.exec(text)
    if (!match) throw new Error(`no count in "${text}"`)
    return Number(match[0])
  })
}

test('lists every piece: the stated count equals the rows, and the years sum to it', async ({ page }) => {
  await openAllWork(page)

  const [total] = await countOf(page, '.stream-total')
  const rows = await page.locator('li.stream-item').count()
  expect(total).toBeGreaterThan(0)
  expect(rows).toBe(total)

  const years = await countOf(page, '.stream-year-count')
  expect(years.reduce((sum, n) => sum + n, 0)).toBe(total)

  // Newest first, and each year's stated count is its own rows.
  const blocks = page.locator('.stream-year')
  const stated = await blocks.evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.year)))
  expect(stated).toEqual([...stated].sort((a, b) => b - a))
  for (let i = 0; i < years.length; i++) {
    await expect(blocks.nth(i).locator('li.stream-item')).toHaveCount(years[i])
  }
})

test('one page heading and one count; case studies link in, embeds link out to GZH', async ({ page }) => {
  await openAllWork(page)

  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText('all work')
  await expect(page.locator('.stream-total')).toHaveCount(1)

  const caseStudies = page.locator('li.stream-item a.workrow-link')
  expect(await caseStudies.count()).toBeGreaterThan(0)
  for (const href of await caseStudies.evaluateAll((els) => els.map((a) => a.getAttribute('href')))) {
    expect(href).toMatch(/^\/projects\/[a-z0-9-]+$/)
  }

  const embeds = page.locator('li.stream-item a.stream-row')
  expect(await embeds.count()).toBeGreaterThan(0)
  const outbound = await embeds.evaluateAll((els) =>
    els.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target') })),
  )
  for (const link of outbound) {
    expect(link.href).toMatch(/^https:\/\/gauchazh\.clicrbs\.com\.br\//)
    expect(link.target).toBe('_blank')
  }

  // Every row is one of the two kinds.
  expect((await caseStudies.count()) + (await embeds.count())).toBe(await page.locator('li.stream-item').count())
})

// The back link is the detail pages' own: the same string, and a client-side
// route home, so Home mounts in place (and restores its scroll when the reader
// came from it) instead of the document reloading. Asserted on both routes.
for (const route of ['/projects/radar-legislativo', '/all-work']) {
  test(`the back link returns home without a reload, from ${route}`, async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    const homeTitle = await page.title()

    await page.goto(route)
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.evaluate(() => { (window as Window & { __sameDocument?: boolean }).__sameDocument = true })

    const back = page.locator('main a.project-detail-back')
    await expect(back).toHaveText('← back to projects')
    await back.click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveCount(1)
    expect(await page.evaluate(() => (window as Window & { __sameDocument?: boolean }).__sameDocument)).toBe(true)
    await expect(page).toHaveTitle(homeTitle)
  })
}

test('the document title and description are the page’s own, in both languages', async ({ page }) => {
  const description = page.locator('meta[name="description"]')

  await openAllWork(page)
  await expect(page).toHaveTitle('all work · kevin shibuya')
  await expect(description).toHaveAttribute('content', /^every piece kevin shibuya has shipped/)

  await page.locator('.nav-lang').click()
  await expect(page).toHaveTitle('todos os trabalhos · kevin shibuya')
  await expect(description).toHaveAttribute('content', /^todas as peças que kevin shibuya publicou/)
  await expect(page.locator('h1')).toHaveText('todos os trabalhos')

  await openAllWork(page, '/all-work?lang=pt')
  await expect(page).toHaveTitle('todos os trabalhos · kevin shibuya')
})

// The page is ink, outside the light chapter: every Stream colour resolves to
// the cream text steps, and a row's lift to the raw tricolor (accentFor), never
// the on-light deep channel.
const CREAM_STEPS = ['rgb(245, 242, 236)', 'rgb(201, 196, 186)', 'rgb(168, 164, 156)']
const RAW_TRICOLOR = ['rgb(230, 77, 102)', 'rgb(77, 128, 230)', 'rgb(230, 204, 77)']

test('ink theme: every Stream text colour is a cream step, and rows lift to the raw tricolor', async ({ page }) => {
  await openAllWork(page)

  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(11, 14, 20)')
  await expect(page.locator('#chapter-light')).toHaveCount(0)
  // Nothing between the body and the Stream paints a ground of its own.
  const grounds = await page.locator('.stream').evaluate((el) => {
    const out: string[] = []
    for (let node = el as HTMLElement | null; node && node !== document.body; node = node.parentElement) {
      out.push(getComputedStyle(node).backgroundColor)
    }
    return out
  })
  for (const ground of grounds) expect(ground).toBe('rgba(0, 0, 0, 0)')

  const colours = await page.locator('.stream').evaluate((root) => {
    const seen = new Set<string>()
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '')
      if (ownText) seen.add(getComputedStyle(el).color)
      const before = getComputedStyle(el, '::before')
      if (before.content !== 'none' && before.content !== 'normal') seen.add(before.color)
    }
    return [...seen]
  })
  expect(colours.length).toBeGreaterThan(0)
  for (const colour of colours) expect(CREAM_STEPS).toContain(colour)

  // Both row kinds, the dense editorial row and the case study's WorkRow.
  // Polled, because the title eases into its tint.
  for (const [row, title] of [['a.stream-row', '.stream-row-title'], ['a.workrow-link', '.workrow-title']]) {
    const link = page.locator(row).first()
    await link.hover()
    await expect
      .poll(() => link.locator(title).evaluate((el) => getComputedStyle(el).color))
      .toBe(await link.evaluate((el) => {
        const hex = getComputedStyle(el.closest('[style*="--row-tint"]')!).getPropertyValue('--row-tint').trim()
        const n = parseInt(hex.slice(1), 16)
        return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
      }))
    expect(RAW_TRICOLOR).toContain(await link.locator(title).evaluate((el) => getComputedStyle(el).color))
  }
})

test('no nav item points at the page', async ({ page }) => {
  await openAllWork(page)
  await expect(page.locator('header a[href*="all-work"]')).toHaveCount(0)
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('header a[href*="all-work"]')).toHaveCount(0)
})

test('fits the viewport width: no horizontal scroll', async ({ page }) => {
  await openAllWork(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
