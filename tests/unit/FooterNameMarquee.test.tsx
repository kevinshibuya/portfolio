import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { FooterNameMarquee } from '../../src/components/ui/FooterNameMarquee'

function renderWithProviders() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MotionProvider>
        <FooterNameMarquee />
      </MotionProvider>
    </I18nextProvider>
  )
}

describe('FooterNameMarquee', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders 24 SVG paths total (12 per copy × 2 copies)', () => {
    const { container } = renderWithProviders()
    const paths = container.querySelectorAll('.footer-marquee-track svg path')
    expect(paths).toHaveLength(24)
  })

  it('renders two NameCopy SVGs as children of the marquee track', () => {
    const { container } = renderWithProviders()
    const svgs = container.querySelectorAll('.footer-marquee-track > svg')
    expect(svgs).toHaveLength(2)
    svgs.forEach((svg) => {
      expect(svg.querySelectorAll('path')).toHaveLength(12)
    })
  })

  it('translates the shibuya glyph group by (2900, 0) in each copy', () => {
    const { container } = renderWithProviders()
    const groups = container.querySelectorAll('[data-shibuya-group]')
    expect(groups).toHaveLength(2)
    groups.forEach((g) => {
      expect(g.getAttribute('transform')).toBe('translate(2900, 0)')
    })
  })

  it('renders an sr-only h2 with the bigText i18n value', () => {
    const { container } = renderWithProviders()
    const h2 = container.querySelector('h2.sr-only')
    expect(h2?.textContent).toBe('kevin shibuya')
  })

  it('uses an aria-hidden marquee container so SR users only hear the h2', () => {
    const { container } = renderWithProviders()
    const marquee = container.querySelector('.footer-marquee')
    expect(marquee?.getAttribute('aria-hidden')).toBe('true')
  })
})
