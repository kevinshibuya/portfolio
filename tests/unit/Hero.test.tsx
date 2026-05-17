import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// Mock the heavy R3F canvas so the dynamic import resolves synchronously
// to a sentinel stub. We can then assert by DOM presence whether Hero has
// (a) constructed the lazy() proxy, (b) let React render it, and (c) the
// import factory has been invoked.
vi.mock('../../src/components/canvas/HeroAccent3D', () => ({
  default: function HeroAccent3DStub() {
    return <div data-testid="hero-accent-3d-stub" />
  },
}))

// Stub framer-motion's whileInView observer so animate-on-mount paths fire
// without an IntersectionObserver in jsdom.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => false }
})

// In jsdom HeroNameDrawing detects the missing getBBox API and immediately
// calls onComplete (which is wired to resolveEntrance). That would resolve
// the entrance synchronously and rob this test of its observable
// "before-entrance" state. Replace with an inert stub so the test owns
// the timing.
vi.mock('../../src/components/ui/HeroNameDrawing', () => ({
  HeroNameDrawing: () => <div data-testid="hero-name-drawing-stub" />,
}))

import '../../src/i18n'
import { MotionProvider, resolveEntrance } from '../../src/context/MotionContext'
import { Hero } from '../../src/components/sections/Hero'

describe('Hero — HeroAccent3D import deferral', () => {
  it('keeps the HeroAccent3D chunk un-imported until entranceDone resolves', async () => {
    const { container } = render(
      <MotionProvider>
        <Hero />
      </MotionProvider>,
    )

    // Generously flush any pending microtasks / timers / suspense commits.
    // If the implementation imports HeroAccent3D on mount (the pre-fix
    // behavior), the stub would surface within this window.
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
      await new Promise((r) => setTimeout(r, 50))
    })

    // Before entranceDone resolves: stub must NOT be in DOM, silhouette
    // (the always-rendered fallback) MUST be.
    expect(screen.queryByTestId('hero-accent-3d-stub')).toBeNull()
    expect(container.querySelector('svg[aria-hidden] polygon')).not.toBeNull()

    // Now resolve the entrance. After this, the lazy import should fire and
    // the stub should mount.
    await act(async () => {
      resolveEntrance()
      // give the chained .then() + setState + suspense commit a microtask
      // each to settle
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('hero-accent-3d-stub')).not.toBeNull()
    })
  })
})
