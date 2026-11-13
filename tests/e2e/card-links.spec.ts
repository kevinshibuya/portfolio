import { test, expect, type Page } from '@playwright/test'
import { projects } from '../../src/data/projects'
import { CANVAS } from './helpers/scene'
import { scrollTargetFor } from '../../src/utils/sceneMotion'

/**
 * The four card links: the Selected Work scene's keyboard and screen-reader
 * path (ADR 0011's original contract, restored by ADR 0014).
 *
 * The cards live on the canvas, which is nothing to a keyboard or a screen
 * reader. Inside the section, after the static heading and before the scroll
 * wrapper, four visually hidden links stand in for them, one per card in
 * corridor order. Focusing one surfaces it as a pill and travels the camera to
 * its card with the same travel a card click uses.
 *
 * `src/data/projects` imports only a type, so Playwright can read it. Same
 * filter and sort as Projects.tsx, so index `i` here is card `i` in the corridor.
 */
const FEATURED = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

const LINKS = '#projects .scene-cardlink'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function openHome(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()
}

/** Which card link holds focus: its index, or -1 when focus is elsewhere. */
const focusedLink = (page: Page): Promise<number> =>
  page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel)).indexOf(document.activeElement as Element),
    LINKS,
  )

/**
 * Tab onto the first card link with REAL key presses: `:focus-visible` is what
 * turns a link into the pill, and a scripted `.focus()` does not reliably
 * match it.
 *
 * Focus starts on the focusable just before the links in document order, found
 * rather than named. That is the hero's role line, which swaps itself every 5 s
 * through `AnimatePresence mode="wait"`; a swap landing between the focus and
 * the press removes the focused span and the Tab stops one short. So the press
 * repeats, at most three times, while focus is still outside the links.
 */
async function tabOntoFirstLink(page: Page): Promise<void> {
  const ok = await page.evaluate(
    ({ focusable, links }) => {
      const all = Array.from(document.querySelectorAll<HTMLElement>(focusable)).filter(
        (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed' || el.matches(links),
      )
      const first = all.findIndex((el) => el.matches(links))
      if (first <= 0) return false
      all[first - 1].focus()
      return document.activeElement === all[first - 1]
    },
    { focusable: FOCUSABLE, links: LINKS },
  )
  expect(ok, 'could not find the focusable just before the card links').toBe(true)
  for (let tries = 0; tries < 3; tries++) {
    await page.keyboard.press('Tab')
    if ((await focusedLink(page)) === 0) break
  }
  expect(await focusedLink(page), 'Tab from the edge did not land on the first card link').toBe(0)
}

/**
 * How far the page is from where card `i`'s travel must leave it, in px.
 *
 * `data-slot` cannot prove the travel to card 0: the canvas already reports
 * slot 0 at the hero, before anything moved. The scroll position can, since the
 * hero sits a whole overture above card 0's target. The target is recomputed
 * here from the laid-out wrapper, with the function the travel itself uses.
 */
async function distanceFromCard(page: Page, i: number): Promise<number> {
  const g = await page.evaluate(() => {
    const wrapper = document.querySelector<HTMLElement>('#projects .scene-scroll')!
    return {
      top: wrapper.getBoundingClientRect().top + window.scrollY,
      height: wrapper.offsetHeight,
      viewport: window.innerHeight,
      y: window.scrollY,
    }
  })
  return Math.abs(g.y - scrollTargetFor(i, g.top, g.height, g.viewport))
}

/** The browser rounds a scroll position to a device pixel; the target is not rounded. */
const SCROLL_TOLERANCE_PX = 2

/** The focused element's pill geometry. */
const pillBox = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      top: r.top,
      width: r.width,
      clipPath: cs.clipPath,
      focusVisible: el.matches(':focus-visible'),
      text: el.textContent,
    }
  })

test.describe('the card links', () => {
  test.describe.configure({ timeout: 120_000 })

  test('1 · four links in corridor order, and no Stream on the home page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))

    await openHome(page)

    const links = page.locator(LINKS)
    await expect(links).toHaveCount(4)
    expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual(
      FEATURED.map((p) => `/projects/${p.slug}`),
    )

    // A screen reader meets the section heading, then the four links by name.
    await expect(page.getByRole('heading', { level: 2, name: /selected work/i })).toHaveCount(1)
    for (const p of FEATURED) {
      await expect(page.getByRole('link', { name: p.title.en, exact: true })).toHaveCount(1)
    }

    // They are the section's first focusables, ahead of everything the scroll
    // wrapper holds, and they sit outside the sticky stage.
    const order = await page.evaluate((focusable) => {
      const section = document.querySelector('#projects')!
      const heading = section.querySelector('.scene-title-sr')!
      const wrapper = section.querySelector('.scene-scroll')!
      const first = Array.from(section.querySelectorAll(focusable)).slice(0, 4)
      return {
        leading: first.map((el) => el.classList.contains('scene-cardlink')),
        afterHeading: first.every((el) => !!(heading.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
        beforeWrapper: first.every((el) => !!(wrapper.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)),
        inSticky: first.some((el) => !!el.closest('.scene-sticky')),
      }
    }, FOCUSABLE)
    expect(order.leading).toEqual([true, true, true, true])
    expect(order.afterHeading).toBe(true)
    expect(order.beforeWrapper).toBe(true)
    expect(order.inSticky).toBe(false)

    // The hidden list of every piece is gone from the home page.
    await expect(page.locator('#archive')).toHaveCount(0)
    await expect(page.locator('li.stream-item')).toHaveCount(0)

    expect(errors).toEqual([])
  })

  test('2 · each link surfaces on focus and travels the camera to its card', async ({ page }) => {
    await openHome(page)
    const canvas = page.locator(CANVAS)

    await tabOntoFirstLink(page)
    for (let i = 0; i < 4; i++) {
      if (i > 0) await page.keyboard.press('Tab')
      expect(await focusedLink(page), `Tab must land on card link ${i}`).toBe(i)

      const pill = await pillBox(page)
      expect(pill.focusVisible).toBe(true)
      expect(pill.clipPath).toBe('none')
      expect(pill.width).toBeGreaterThan(40)
      expect(pill.top).toBeCloseTo(16, 0)
      expect(pill.text).toBe(FEATURED[i].title.en)

      // Lenis carries the move (1.2 s); the canvas reports the card it settled.
      await expect(canvas, `focusing link ${i} must settle card ${i}`).toHaveAttribute('data-slot', String(i), {
        timeout: 5_000,
      })
      // And the page itself came to rest on that card, link 0 included.
      await expect
        .poll(() => distanceFromCard(page, i), {
          message: `focusing link ${i} must scroll the page to card ${i}`,
          timeout: 5_000,
        })
        .toBeLessThanOrEqual(SCROLL_TOLERANCE_PX)
      await expect(page).toHaveURL(/\/$/)
    }

    // Above the nav, or the pill hides behind it.
    const z = await page.evaluate(() => ({
      links: Number(getComputedStyle(document.querySelector('#projects .scene-cardlinks')!).zIndex),
      nav: Number(getComputedStyle(document.querySelector('header.nav')!).zIndex),
    }))
    expect(z.links).toBeGreaterThan(z.nav)

    // Past the fourth link, focus goes straight into More work: its first row,
    // with nothing hidden and nothing else in between.
    await page.keyboard.press('Tab')
    const next = await page.evaluate((links) => {
      const el = document.activeElement!
      const wrapper = document.querySelector('#projects .scene-scroll')!
      return {
        isLink: el.matches(links),
        afterWrapper: !!(wrapper.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
        inWrapper: wrapper.contains(el),
        isFirstMoreWorkRow: el === document.querySelector('#projects .more-work li .workrow-link'),
      }
    }, LINKS)
    expect(next.isLink).toBe(false)
    expect(next.inWrapper).toBe(false)
    expect(next.afterWrapper).toBe(true)
    expect(next.isFirstMoreWorkRow, 'the Tab after link 3 must land on More work row 01').toBe(true)

    // The link that just lost focus is clipped back to nothing, so no pill
    // stays painted. Read on that link: a count of focused links is 0 here
    // whatever is on screen.
    const left = page.locator(LINKS).nth(3)
    await expect(left).toHaveCSS('clip-path', 'inset(50%)')
    const leftBox = await left.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { width: r.width, height: r.height }
    })
    expect(leftBox.width).toBeLessThanOrEqual(1)
    expect(leftBox.height).toBeLessThanOrEqual(1)
  })

  test('3 · Enter on a focused link opens its project', async ({ page }) => {
    await openHome(page)
    await tabOntoFirstLink(page)
    await page.keyboard.press('Tab')
    expect(await focusedLink(page)).toBe(1)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/projects/${FEATURED[1].slug}$`))
  })
})

test.describe('the card links · reduced motion', () => {
  test.describe.configure({ timeout: 120_000 })
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('4 · focus moves the slot in one step, with no animated travel', async ({ page }) => {
    await openHome(page)
    const canvas = page.locator(CANVAS)

    await tabOntoFirstLink(page)
    await expect(canvas).toHaveAttribute('data-slot', '0', { timeout: 5_000 })
    // Slot 0 is also what the hero reads, so the scroll position is the proof
    // that link 0 moved the page.
    await expect
      .poll(() => distanceFromCard(page, 0), { message: 'focusing link 0 must scroll the page to card 0' })
      .toBeLessThanOrEqual(SCROLL_TOLERANCE_PX)

    for (const i of [1, 2]) {
      const before = await page.evaluate(() => window.scrollY)
      await page.keyboard.press('Tab')
      expect(await focusedLink(page)).toBe(i)

      // Every frame after the key press reads the same scrollY, and it is not
      // where the page was: the move applied at once, never as a tween.
      const ys = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const out: number[] = []
            const tick = (): void => {
              out.push(window.scrollY)
              if (out.length >= 20) resolve(out)
              else requestAnimationFrame(tick)
            }
            tick()
          }),
      )
      expect(ys[0], `focusing link ${i} must move the page`).not.toBe(before)
      expect(new Set(ys).size, `the move to card ${i} must be one step`).toBe(1)
      await expect(canvas).toHaveAttribute('data-slot', String(i))
      expect(await distanceFromCard(page, i), `the one step must land on card ${i}`).toBeLessThanOrEqual(
        SCROLL_TOLERANCE_PX,
      )
    }
  })
})
