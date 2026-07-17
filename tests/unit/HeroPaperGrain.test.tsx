import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { HeroPaperGrain } from '../../src/components/ui/HeroPaperGrain'

describe('HeroPaperGrain', () => {
  it('renders an aria-hidden, non-interactive grain layer', () => {
    const { container } = render(
      <MotionProvider><HeroPaperGrain /></MotionProvider>,
    )
    const layer = container.querySelector('.hero-paper-grain')
    expect(layer).not.toBeNull()
    expect(layer!.getAttribute('aria-hidden')).toBe('true')
  })

  it('does not throw on a window pointermove (MotionValue path, no setState)', () => {
    render(<MotionProvider><HeroPaperGrain /></MotionProvider>)
    expect(() =>
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 })),
    ).not.toThrow()
  })
})
