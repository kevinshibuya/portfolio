import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLoaderProgress } from '../../src/hooks/useLoaderProgress'

describe('useLoaderProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'loading',
    })
    ;(document as unknown as { fonts: { ready: Promise<void> } }).fonts = {
      ready: Promise.resolve(),
    }
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exposes progress, drawDone, handoffDone, resolveHandoff', () => {
    const { result } = renderHook(() => useLoaderProgress(false))
    expect(result.current.progress).toBe(0)
    expect(result.current.drawDone).toBeInstanceOf(Promise)
    expect(result.current.handoffDone).toBeInstanceOf(Promise)
    expect(typeof result.current.resolveHandoff).toBe('function')
  })

  it('synthetic ramp does not exceed 0.92 before assets ready', () => {
    const { result } = renderHook(() => useLoaderProgress(false))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.progress).toBeLessThanOrEqual(0.92)
    expect(result.current.progress).toBeGreaterThan(0.5)
  })

  it('snaps to 1 and resolves drawDone after window load + fonts.ready', async () => {
    const { result } = renderHook(() => useLoaderProgress(false))
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })
    await act(async () => {
      window.dispatchEvent(new Event('load'))
      await vi.runAllTimersAsync()
    })
    await result.current.drawDone
    expect(result.current.progress).toBe(1)
  })

  it('reduced motion: snaps to 1 after LOADER_REDUCED_MOTION_MAX_MS and resolves both promises', async () => {
    const { result } = renderHook(() => useLoaderProgress(true))
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    await result.current.drawDone
    await result.current.handoffDone
    expect(result.current.progress).toBe(1)
  })
})
