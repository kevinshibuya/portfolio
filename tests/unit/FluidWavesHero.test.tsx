import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { FluidWavesHero } from '../../src/components/canvas/FluidWavesHero'

describe('FluidWavesHero', () => {
  it('renders the layered-gradient fallback when WebGL is unavailable (jsdom)', () => {
    render(
      <MotionProvider>
        <FluidWavesHero />
      </MotionProvider>,
    )
    // jsdom has no WebGL context — the component must fall back, never
    // render a dead black canvas.
    expect(screen.getByTestId('fluid-waves-fallback')).toBeInTheDocument()
  })
})
