import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Force reduced motion so the entrance effect snaps to its final state and
// resolves the (module-scoped) entrance gate immediately, instead of leaving
// a pending GSAP timeline awaiting the curtain promise. We assert only on
// rendered content, never on un-resolved entrance state (promise pollution).
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

import '../../src/i18n'
import { MotionProvider } from '../../src/context/MotionContext'
import { Hero } from '../../src/components/sections/Hero'

describe('Hero', () => {
  it('renders the monumental name and leads the role cycle with the canonical title', () => {
    render(
      <MotionProvider>
        <Hero />
      </MotionProvider>,
    )

    const name = document.querySelector('h1.hero-name')
    expect(name).not.toBeNull()
    expect(name?.textContent).toContain('kevin')
    expect(name?.textContent).toContain('shibuya.')

    // roles[0] (canonical title) renders in the clickable role span.
    expect(
      screen.getByText('senior front-end engineer · react/typescript'),
    ).toBeTruthy()
  })
})
