import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Hero } from '../../src/components/sections/Hero'

// Reduced motion makes the rise instant, so the hero renders settled without
// waiting on the (module-scoped) entrance gate that only main.tsx resolves.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  })
})

describe('Hero', () => {
  it('renders the name as the one h1 and the role line above it', () => {
    render(
      <I18nProvider>
        <MotionProvider>
          <Hero />
        </MotionProvider>
      </I18nProvider>,
    )

    const name = screen.getByRole('heading', { level: 1 })
    expect(name).toHaveClass('hero-name')
    expect(name).toHaveAccessibleName('kevin shibuya.')
    expect(name.textContent).toContain('kevin')
    expect(name.textContent).toContain('shibuya.')

    expect(screen.getByText('software engineer · full-stack')).toHaveClass('hero-role')
  })

  it('marks the entrance settled at once under reduced motion', () => {
    const { container } = render(
      <I18nProvider>
        <MotionProvider>
          <Hero />
        </MotionProvider>
      </I18nProvider>,
    )
    expect(container.querySelector('section.hero')).toHaveAttribute('data-entrance', 'settled')
    expect(container.querySelector('.hero-bottom')).toHaveClass('is-entered', 'is-settled', 'is-instant')
  })
})
