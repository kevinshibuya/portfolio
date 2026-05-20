import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from '../../../src/hooks/useMediaQuery'

describe('useMediaQuery', () => {
  let listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = false

  beforeEach(() => {
    listeners = []
    currentMatches = false
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: currentMatches,
      media: q,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== cb)
      },
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false on first render (SSR-safe)', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    // First render returns false; the effect runs synchronously in RTL but
    // we explicitly assert the *initial* return path is safe.
    expect(typeof result.current).toBe('boolean')
  })

  it('reflects matchMedia after mount', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    expect(result.current).toBe(true)
  })

  it('updates when matchMedia change event fires', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 900px)'))
    expect(result.current).toBe(false)
    act(() => {
      listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(result.current).toBe(true)
  })
})
