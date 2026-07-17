import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// Stub the grain leaf so we can assert mount timing by DOM presence.
vi.mock('../../src/components/ui/HeroPaperGrain', () => ({
  HeroPaperGrain: () => <div data-testid="hero-grain-stub" />,
}))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => false }
})

// HeroNameDrawing resolves entranceDone immediately in jsdom (missing getBBox);
// replace with an inert stub so the test owns the before-entrance timing.
vi.mock('../../src/components/ui/HeroNameDrawing', () => ({
  HeroNameDrawing: () => <div data-testid="hero-name-drawing-stub" />,
}))

import '../../src/i18n'
import { MotionProvider, resolveEntrance } from '../../src/context/MotionContext'
import { Hero } from '../../src/components/sections/Hero'

describe('Hero — grain layer deferral', () => {
  it('mounts HeroPaperGrain only after entranceDone resolves', async () => {
    render(<MotionProvider><Hero /></MotionProvider>)

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.queryByTestId('hero-grain-stub')).toBeNull()

    await act(async () => {
      resolveEntrance()
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.queryByTestId('hero-grain-stub')).not.toBeNull()
    })
  })

  it('renders the static canonical title', () => {
    render(<MotionProvider><Hero /></MotionProvider>)
    expect(screen.getByText('senior front-end engineer · react/typescript')).toBeInTheDocument()
  })
})
