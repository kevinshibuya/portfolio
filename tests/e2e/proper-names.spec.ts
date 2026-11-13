import { test, expect, type Page } from '@playwright/test'
import { projects } from '../../src/data/projects'
import { workExperiences } from '../../src/data/workExperience'

/**
 * Project and company names keep their capitals (spec #35, ADR 0014).
 *
 * The site voice is lowercase; a project or company name is written as the
 * name it is wherever it appears as a name. Headings, nav, prose, tech tags,
 * places and roles stay lowercase.
 *
 * Every read here is `innerText`, never `textContent`: `innerText` is the
 * rendered text, so a `text-transform: lowercase` left on a name's element (or
 * an ancestor) fails the assertion, where `textContent` would read the source
 * string and pass.
 *
 * Both data modules import only a type, so Playwright can read them. Expected
 * names come from the data, never hardcoded, and each must carry a capital so
 * a lowercase render cannot pass by accident.
 */
const FEATURED = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
const MORE = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) > 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

const hasCapital = (s: string): boolean => s !== s.toLowerCase()

/** The rendered text of the first match, whitespace collapsed. */
const rendered = async (page: Page, selector: string): Promise<string> =>
  (await page.locator(selector).first().evaluate((el) => (el as HTMLElement).innerText)).replace(/\s+/g, ' ').trim()

/** The rendered text of every match. */
const renderedAll = async (page: Page, selector: string): Promise<string[]> =>
  (await page.locator(selector).evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText))).map((s) =>
    s.replace(/\s+/g, ' ').trim(),
  )

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

async function openHome(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .more-work').waitFor({ state: 'attached', timeout: 30_000 })
  await page.locator('#work .workrow-title').first().waitFor({ state: 'attached', timeout: 30_000 })
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

test('the expected names carry capitals in the data', () => {
  for (const p of projects) {
    expect(hasCapital(p.title.en), `${p.slug} en`).toBe(true)
    expect(hasCapital(p.title.pt), `${p.slug} pt`).toBe(true)
  }
  for (const w of workExperiences) expect(hasCapital(w.company), w.company).toBe(true)
})

test.describe('the home page', () => {
  test.describe.configure({ timeout: 90_000 })

  test('names keep their capitals: card links, More work rows, Work Experience rows', async ({ page }) => {
    const errors = collectErrors(page)
    await openHome(page)

    // The four card links, at rest (visually hidden) and surfaced as the pill.
    expect(await renderedAll(page, '#projects .scene-cardlink')).toEqual(FEATURED.map((p) => p.title.en))
    const first = page.locator('#projects .scene-cardlink').first()
    await first.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    expect(await first.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    expect(await first.evaluate((el) => (el as HTMLElement).innerText.trim())).toBe(FEATURED[0].title.en)

    expect(await renderedAll(page, '#projects .more-work li .workrow-title')).toEqual(MORE.map((p) => p.title.en))

    expect(await renderedAll(page, '#work .workrow-title')).toEqual(workExperiences.map((w) => w.company))

    expect(errors).toEqual([])
  })

  test('the voice stays lowercase: headings, nav, a tech tag, a location, a role', async ({ page }) => {
    await openHome(page)

    const headings = await renderedAll(page, 'main .section-title')
    expect(headings.length).toBeGreaterThan(0)
    for (const h of headings) expect(h, 'section heading').toBe(h.toLowerCase())

    const nav = await renderedAll(page, '.nav-link')
    expect(nav.length).toBe(4)
    for (const n of nav) expect(n, 'nav label').toBe(n.toLowerCase())

    // The first row starts expanded: its tags, location and bullets are rendered.
    const tag = await rendered(page, '#work .work-tags .pill')
    expect(tag).toBe(tag.toLowerCase())
    expect(hasCapital(workExperiences[0].technologies.join(' ')), 'the data carries capitals to lowercase').toBe(true)

    const location = await rendered(page, '#work .work-location')
    expect(location).toBe(workExperiences[0].location!.toLowerCase())

    const role = await rendered(page, '#work .workrow-meta')
    expect(role).toBe(role.toLowerCase())

    const bullet = await rendered(page, '#work .work-bullets li')
    expect(bullet, 'prose stays lowercase, project names inside it too').toBe(bullet.toLowerCase())
  })

  test('the Portuguese home page writes the names the same way', async ({ page }) => {
    await openHome(page, '/?lang=pt')
    expect(await renderedAll(page, '#projects .scene-cardlink')).toEqual(FEATURED.map((p) => p.title.pt))
    expect(await renderedAll(page, '#projects .more-work li .workrow-title')).toEqual(MORE.map((p) => p.title.pt))
    expect(await renderedAll(page, '#work .workrow-title')).toEqual(workExperiences.map((w) => w.company))
  })
})

test('without WebGL, the fallback cards keep the names', async ({ page }) => {
  await refuseWebgl2(page)
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-fallback-name').first().waitFor({ state: 'attached', timeout: 30_000 })

  expect(await renderedAll(page, '#projects .scene-fallback-name')).toEqual(FEATURED.map((p) => p.title.en))
  // The subtitle (year · tech · tech) stays lowercase.
  const subtitle = await rendered(page, '#projects .scene-fallback-subtitle')
  expect(subtitle).toBe(subtitle.toLowerCase())
})

test('All work: a case-study row keeps the name, the heading stays lowercase', async ({ page }) => {
  await page.goto('/all-work')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('.stream.stream--visible')).toBeVisible()

  const titles = await renderedAll(page, 'li.stream-item a.workrow-link .workrow-title')
  expect(titles.length).toBeGreaterThan(0)
  const names = new Set(projects.map((p) => p.title.en))
  for (const t of titles) expect(names.has(t), `"${t}" is a project name as authored`).toBe(true)

  const heading = await rendered(page, 'h1')
  expect(heading).toBe(heading.toLowerCase())
})

test.describe('the detail page', () => {
  for (const lang of ['en', 'pt'] as const) {
    test(`the hero and the document title keep the name (${lang})`, async ({ page }) => {
      const errors = collectErrors(page)
      const p = projects.find((x) => x.slug === 'chat-da-hora') ?? projects[0]
      await page.goto(`/projects/${p.slug}?lang=${lang}`)
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const title = page.locator('h1.project-detail-title')
      await title.waitFor()

      // Each character animates as its own inline-block span; wait for the
      // entrance so the rendered text is settled.
      await expect
        .poll(async () => (await title.evaluate((el) => (el as HTMLElement).innerText)).replace(/\s+/g, ' ').trim())
        .toBe(p.title[lang])
      await expect(page).toHaveTitle(new RegExp(`^${p.title[lang]} · `))

      expect(errors).toEqual([])
    })
  }
})
