import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Stream } from '../../src/components/sections/Stream'

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

function renderStream(): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <MotionProvider>
        <Stream mode="visible" />
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
})
