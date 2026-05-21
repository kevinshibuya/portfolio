import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../src/i18n'
import { AboutFallback } from '../../../../src/components/ui/AboutFallback'

function renderWithI18n() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AboutFallback />
    </I18nextProvider>,
  )
}

describe('AboutFallback', () => {
  it('renders a region with id="about"', () => {
    const { container } = renderWithI18n()
    const section = container.querySelector('section#about')
    expect(section).not.toBeNull()
  })

  it('renders the about label', () => {
    const { getByText } = renderWithI18n()
    expect(getByText(/about kevin/i)).toBeInTheDocument()
  })

  it('renders a picture with webp source and png fallback img', () => {
    const { container } = renderWithI18n()
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    const source = picture?.querySelector('source[type="image/webp"]')
    expect(source).not.toBeNull()
    const img = picture?.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
  })

  it('renders the condensed paragraph', () => {
    const { container } = renderWithI18n()
    const para = container.querySelector('.about-fallback__paragraph')
    expect(para).not.toBeNull()
    expect(para?.textContent?.length ?? 0).toBeGreaterThan(50)
  })
})
