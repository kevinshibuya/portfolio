import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { FluidWaves } from '../../src/components/canvas/FluidWaves'

describe('FluidWaves', () => {
  it('hero variant falls back to the layered gradient when WebGL is unavailable (jsdom)', () => {
    render(
      <MotionProvider>
        <FluidWaves variant="hero" />
      </MotionProvider>,
    )
    // jsdom has no WebGL context — never a dead black canvas.
    expect(screen.getByTestId('fluid-waves-fallback')).toBeInTheDocument()
  })

  it('backdrop variant renders nothing on WebGL failure (stage ink stands)', () => {
    const { container } = render(
      <MotionProvider>
        <FluidWaves variant="backdrop" />
      </MotionProvider>,
    )
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByTestId('fluid-waves-fallback')).toBeNull()
  })
})
