import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { LoadingCursor } from '../../src/components/ui/LoadingCursor'

// Mock framer-motion's useReducedMotion so each test can control it
// independently of fragile matchMedia mocking. animate stays real.
const reducedRef = { current: false }
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => reducedRef.current,
  }
})

describe('LoadingCursor', () => {
  beforeEach(() => {
    ;(document as unknown as { fonts: { ready: Promise<void> } }).fonts = {
      ready: Promise.resolve(),
    }
  })
  afterEach(() => {
    reducedRef.current = false
  })

  it('renders nothing under reduced motion', () => {
    reducedRef.current = true
    const { baseElement } = render(
      <MotionProvider>
        <LoadingCursor getAnchors={() => null} />
      </MotionProvider>
    )
    expect(baseElement.querySelector('.loading-cursor')).toBeNull()
  })

  it('renders a periwinkle dot when motion is allowed and anchors are ready', () => {
    reducedRef.current = false
    const { baseElement } = render(
      <MotionProvider>
        <LoadingCursor getAnchors={() => ({
          kevinStartX: 80, kevinEndX: 380, kevinBaselineY: 200,
          shibuyaStartX: 80, shibuyaEndX: 520, shibuyaBaselineY: 320,
          periodX: 510, periodY: 305,
        })} />
      </MotionProvider>
    )
    const dot = baseElement.querySelector('.loading-cursor')
    expect(dot).not.toBeNull()
  })
})
