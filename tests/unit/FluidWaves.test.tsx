import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { FluidWaves } from '../../src/components/canvas/FluidWaves'

// jsdom has no WebGL context, so every painter fails at once: the canvas gives
// way to the static stand-in in the paint's colours, never a dead black box.
describe('FluidWaves', () => {
  it('the hero paint falls back to the still stand-in when WebGL is unavailable', () => {
    const { container } = render(
      <MotionProvider>
        <FluidWaves kind="hero" />
      </MotionProvider>,
    )
    const fallback = screen.getByTestId('fluid-waves-fallback')
    expect(fallback).toHaveAttribute('data-kind', 'hero')
    expect(fallback).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('the closing paint falls back to its own stand-in, not to nothing', () => {
    const { container } = render(
      <MotionProvider>
        <FluidWaves kind="footer" sinkTop={0.3} />
      </MotionProvider>,
    )
    expect(screen.getByTestId('fluid-waves-fallback')).toHaveAttribute('data-kind', 'footer')
    expect(container.querySelector('canvas')).toBeNull()
  })
})
