import { test, expect } from '@playwright/test'

// Absolute document-Y scroll to a fraction INTO a section (no offsetTop).
// Copied from nav-on-light.spec.ts on purpose: no shared helper module exists
// for the e2e suite, and Plan B is not the place to introduce one.
async function scrollIntoSection(page: import('@playwright/test').Page, id: string, frac: number): Promise<void> {
  await page.evaluate((args) => {
    const el = document.querySelector('#' + args.id) as HTMLElement | null
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + el.offsetHeight * args.frac, behavior: 'instant' as ScrollBehavior })
  }, { id, frac })
  await page.waitForTimeout(200)
}

// Home, loader finished, lazy chunks committed (#skills is the chapter's last
// section, so its presence means every section in the wrapper has mounted).
async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#skills').waitFor()
}

// Computed color of the first match, read in the page.
async function colorOf(page: import('@playwright/test').Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return 'MISSING: ' + sel
    return getComputedStyle(el).color
  }, selector)
}

// Computed background-color of the first match, read in the page.
async function bgOf(page: import('@playwright/test').Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return 'MISSING: ' + sel
    return getComputedStyle(el).backgroundColor
  }, selector)
}

test.describe('light chapter (Projects → Skills on cream)', () => {
  test('1 · wrapper paints cream while the page ink stands', async ({ page }) => {
    await settle(page)

    await expect(page.locator('#chapter-light')).toHaveCount(1)
    expect(await bgOf(page, '#chapter-light')).toBe('rgb(245, 242, 236)')
    // The document ground stays ink so overscroll edges never flash cream.
    expect(await bgOf(page, 'body')).toBe('rgb(11, 14, 20)')
  })

  test('2 · structure: five sections in the wrapper, veil as its sibling', async ({ page }) => {
    await settle(page)

    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#chapter-light > *')).map((el) => el.id),
    )
    expect(ids).toEqual(['projects', 'archive', 'work', 'stats', 'skills'])

    // The veil is the wrapper's NEXT SIBLING, never a child: its gradient ends
    // in var(--bg), which the wrapper's token scope would turn cream.
    await expect(page.locator('#chapter-light + .chapter-exit-veil')).toHaveCount(1)
    await expect(page.locator('#projects .chapter-exit-veil')).toHaveCount(0)
    await expect(page.locator('#chapter-light .chapter-exit-veil')).toHaveCount(0)
    await expect(page.locator('.chapter-exit-veil + .contact-footer-stage')).toHaveCount(1)

    // The wrapper must stay a plain block. Any of these would create a
    // containing block or a clip and silently break the position:sticky stage
    // inside #projects (and .stats-heading-col, and the fixed skip-link chip) —
    // a failure the scrub suite does NOT catch, because useScroll reads document
    // scroll whether or not the stage actually pins.
    const box = await page.evaluate(() => {
      const el = document.querySelector('#chapter-light') as HTMLElement
      const cs = getComputedStyle(el)
      return [cs.overflow, cs.position, cs.transform, cs.filter, cs.contain, cs.perspective].join(' | ')
    })
    expect(box, '#chapter-light must not create a containing block or clip').toBe(
      'visible | static | none | none | none | none',
    )
  })

  test('3 · section surfaces alternate cream and tonal cream', async ({ page }) => {
    await settle(page)
    await scrollIntoSection(page, 'work', 0.2)

    expect(await bgOf(page, '#archive')).toBe('rgb(237, 233, 224)')
    expect(await bgOf(page, '#skills')).toBe('rgb(237, 233, 224)')
    expect(await bgOf(page, '#stats')).toBe('rgb(245, 242, 236)')
    expect(await bgOf(page, '#projects')).toBe('rgb(245, 242, 236)')
    // The tech pill sits on the tonal step even on a cream section.
    expect(await bgOf(page, '#work .pill')).toBe('rgb(237, 233, 224)')
    expect(await bgOf(page, '#work .work-mode-pill')).toBe('rgba(11, 14, 20, 0.06)')
  })

  test('4 · text inverts to the on-light ink system', async ({ page }) => {
    await settle(page)
    await scrollIntoSection(page, 'archive', 0.2)

    expect(await colorOf(page, '#archive .workrow-title')).toBe('rgb(11, 14, 20)')
    expect(await colorOf(page, '#archive .workrow-meta')).toBe('rgba(11, 14, 20, 0.62)')
    // aria-hidden decoration keeps the faded step (exempt from 1.4.3).
    expect(await colorOf(page, '#archive .workrow-index')).toBe('rgba(11, 14, 20, 0.4)')
    expect(await colorOf(page, '#archive .section-index')).toBe('rgb(42, 84, 181)')
    // The expand glyph is a STATE indicator (WCAG 1.4.11, 3:1), not decoration,
    // so it takes muted (5.23:1) and never the 2.62:1 faded step.
    expect(await colorOf(page, '#archive .workrow-arrow')).toBe('rgba(11, 14, 20, 0.62)')

    await scrollIntoSection(page, 'stats', 0.2)
    expect(await colorOf(page, '#stats .stats-eyebrow')).toBe('rgb(42, 84, 181)')
    expect(await colorOf(page, '#stats .stats-row-value')).toBe('rgb(11, 14, 20)')

    await scrollIntoSection(page, 'skills', 0.2)
    expect(await colorOf(page, '#skills .skills-item')).toBe('rgba(11, 14, 20, 0.62)')

    await scrollIntoSection(page, 'work', 0.2)
    expect(await colorOf(page, '#work .pill')).toBe('rgba(11, 14, 20, 0.62)')
    // Row 0 is expanded by default → deep pink small-text channel.
    expect(await colorOf(page, '#work .work-highlight-label')).toBe('rgb(178, 43, 71)')

    const border = await page.evaluate(() => {
      const el = document.querySelector('#archive .workrow')
      if (!el) return 'MISSING'
      return getComputedStyle(el).borderBottomColor
    })
    expect(border).toBe('rgba(11, 14, 20, 0.12)')
  })

  test('5 · exit veil spans Skills bottom → Contact stage top', async ({ page }) => {
    await settle(page)
    await scrollIntoSection(page, 'skills', 0.5)

    const geo = await page.evaluate(() => {
      const docTop = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return NaN
        return el.getBoundingClientRect().top + window.scrollY
      }
      const docBottom = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return NaN
        return el.getBoundingClientRect().bottom + window.scrollY
      }
      const veil = document.querySelector('.chapter-exit-veil')
      return {
        veilTop: docTop('.chapter-exit-veil'),
        veilBottom: docBottom('.chapter-exit-veil'),
        skillsBottom: docBottom('#skills'),
        stageTop: docTop('.contact-footer-stage'),
        veilHeight: veil ? veil.getBoundingClientRect().height : NaN,
        viewport: window.innerHeight,
        gradient: veil ? getComputedStyle(veil).backgroundImage : 'MISSING',
        lastChildBg: (() => {
          const last = document.querySelector('#chapter-light')?.lastElementChild
          return last ? getComputedStyle(last).backgroundColor : 'MISSING'
        })(),
      }
    })

    expect(Math.abs(geo.veilTop - geo.skillsBottom)).toBeLessThanOrEqual(1)
    expect(Math.abs(geo.veilBottom - geo.stageTop)).toBeLessThanOrEqual(1)
    // Cream at the top stop, ink at the bottom stop — a continuous fade.
    // The fade must START on whatever the chapter's last section actually paints,
    // or the seam opens with a tonal step. Skills is .section--sand, so this is
    // the tonal cream; asserting the RELATIONSHIP means a reorder cannot re-break it.
    expect(geo.gradient).toContain(geo.lastChildBg)
    expect(geo.lastChildBg).toBe('rgb(237, 233, 224)')
    expect(geo.gradient).toContain('rgb(11, 14, 20)')
    expect(geo.veilHeight).toBeGreaterThanOrEqual(0.25 * geo.viewport)
  })

  test('6 · WorkRow hover tint rotates through the deep large triplet', async ({ page, isMobile }) => {
    await settle(page)
    await scrollIntoSection(page, 'archive', 0.2)

    const tints = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#archive .workrow'))
        .slice(0, 3)
        .map((el) => getComputedStyle(el).getPropertyValue('--row-tint-deep-large').trim()),
    )
    expect(tints).toEqual(['#B22B47', '#2A54B5', '#7A6800'])

    // Hover is a pointer affordance; the touch project still runs the assertions above.
    if (!isMobile) {
      const expected = ['rgb(178, 43, 71)', 'rgb(42, 84, 181)', 'rgb(122, 104, 0)']
      for (let i = 0; i < expected.length; i++) {
        const row = page.locator('#archive .workrow').nth(i)
        await row.locator('.workrow-link, .workrow-toggle').first().hover()
        await page.waitForTimeout(600)
        const color = await row.locator('.workrow-title').first().evaluate(
          (el) => getComputedStyle(el).color,
        )
        expect(color, 'row ' + i + ' hover tint').toBe(expected[i])
      }
    }
  })
})
