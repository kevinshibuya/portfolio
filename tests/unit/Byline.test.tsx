import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the R3F consumer so jsdom never touches WebGL and we assert wiring only.
vi.mock('../../src/canvas/halftone/HalftonePortrait', () => ({
  HalftonePortrait: (props: { alt: string }) => (
    <img data-testid="halftone-portrait" alt={props.alt} src="stub" />
  ),
}))

import '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Byline } from '../../src/components/sections/Byline'

describe('Byline', () => {
  it('renders caption, body, portrait, and one margin note', () => {
    const { container } = render(<MotionProvider><Byline /></MotionProvider>)
    expect(container.querySelector('section#byline')).not.toBeNull()
    expect(screen.getByText('kevin, porto alegre')).toBeInTheDocument()
    expect(screen.getByText(/front-end engineer in porto alegre/i)).toBeInTheDocument()
    expect(screen.getByTestId('halftone-portrait')).toBeInTheDocument()
    // exactly one handwriting margin note
    expect(container.querySelectorAll('.byline-margin-note')).toHaveLength(1)
    expect(container.querySelector('.byline-margin-note')!.getAttribute('alt'))
      .toMatch(/ship it/i)
  })
})
