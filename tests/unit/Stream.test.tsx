import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Stream, type StreamProps } from '../../src/components/sections/Stream'
import { archive, yearBlocks } from '../../src/data/archive'

// The archive holds no `personal` piece yet (spec decision 9), and PT
// `freelance` is also `freelance`, so the e2e test cannot tell a translated
// origin from the datum echoed back. One real item, re-labelled `personal`,
// is the only way to see the word that differs.
vi.mock('../../src/data/archive', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/data/archive')>()
  const archive = real.archive.map((item, i) =>
    i === 0 ? { ...item, origin: 'personal' as const } : item,
  )
  return { ...real, archive }
})

function renderStream(props: Partial<StreamProps> = {}): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <MotionProvider>
        <Stream {...props} />
      </MotionProvider>
    </MemoryRouter>,
  )
  return container
}

describe('Stream', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('the origin word comes from the locale, not from the datum', async () => {
    await i18n.changeLanguage('pt')
    const meta = renderStream().querySelector('li[data-origin="personal"] .workrow-meta')
    expect(meta).toHaveTextContent('pessoal')
    expect(meta).not.toHaveTextContent('personal')
  })

  it('reads the same word in English', async () => {
    await i18n.changeLanguage('en')
    const meta = renderStream().querySelector('li[data-origin="personal"] .workrow-meta')
    expect(meta).toHaveTextContent('personal')
  })

  it('states the count of the pieces it lists, and lists every piece in the data', () => {
    const stream = renderStream()
    expect(stream.querySelector('.stream-total')).toHaveTextContent(`${archive.length} pieces`)
    const rows = [...stream.querySelectorAll('li.stream-item')]
    expect(rows.map((li) => li.getAttribute('data-item-id'))).toEqual(archive.map((item) => item.id))
  })

  it('states each year with the count of its own rows, newest first', () => {
    const stream = renderStream()
    const years = [...stream.querySelectorAll<HTMLElement>('.stream-year')]
    expect(years.map((y) => Number(y.dataset.year))).toEqual(yearBlocks(archive).map((b) => b.year))
    for (const year of years) {
      const rows = year.querySelectorAll('li.stream-item').length
      expect(year.querySelector('.stream-year-count')).toHaveTextContent(
        `${rows} ${rows === 1 ? 'piece' : 'pieces'}`,
      )
    }
  })

  it('keeps its section-level headings by default', () => {
    const stream = renderStream()
    expect(stream.querySelectorAll('h3.stream-title')).toHaveLength(1)
    expect(stream.querySelectorAll('h4.stream-year-label')).toHaveLength(yearBlocks(archive).length)
  })

  it('takes the page level when its page asks for it, years one level below', () => {
    const stream = renderStream({ headingLevel: 1 })
    expect(stream.querySelectorAll('h1')).toHaveLength(1)
    expect(stream.querySelector('h1')).toHaveTextContent('all work')
    expect(stream.querySelectorAll('h2.stream-year-label')).toHaveLength(yearBlocks(archive).length)
    expect(stream.querySelectorAll('h3, h4')).toHaveLength(0)
  })
})
