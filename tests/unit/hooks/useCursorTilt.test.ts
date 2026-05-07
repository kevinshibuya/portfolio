import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCursorTilt } from '../../../src/hooks/useCursorTilt'

// MotionContext lookup is mocked so the hook can be exercised in isolation.
let mockReducedMotion = false
vi.mock('../../../src/context/MotionContext', () => ({
  useMotion: () => ({ prefersReducedMotion: mockReducedMotion }),
}))

function makeRefs() {
  const card = document.createElement('div')
  Object.defineProperty(card, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100, x: 0, y: 0, toJSON: () => ({}) }),
  })
  document.body.appendChild(card)
  const wrap = document.createElement('div')
  card.appendChild(wrap)
  return {
    cardRef: { current: card } as React.RefObject<HTMLDivElement>,
    wrapRef: { current: wrap } as React.RefObject<HTMLDivElement>,
  }
}

beforeEach(() => {
  mockReducedMotion = false
  // Default: not a touch device.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  })
  // Run RAF immediately for tests.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(performance.now())
    return 0
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('useCursorTilt', () => {
  it('writes a transform to --cursor-tilt on the wrapper at the card center → identity-ish', () => {
    const { cardRef, wrapRef } = makeRefs()
    renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50, bubbles: true }))
    const tilt = wrapRef.current!.style.getPropertyValue('--cursor-tilt')
    expect(tilt).toContain('scale(1.08)')
    expect(tilt).toContain('rotateX(0')
    expect(tilt).toContain('rotateY(0')
  })

  it('writes nonzero rotateX/rotateY when cursor is offset from center', () => {
    const { cardRef, wrapRef } = makeRefs()
    renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    // Top-right corner.
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 0, bubbles: true }))
    const tilt = wrapRef.current!.style.getPropertyValue('--cursor-tilt')
    expect(tilt).toMatch(/rotateX\(10/)
    expect(tilt).toMatch(/rotateY\(10/)
  })

  it('clears --cursor-tilt on mouseleave', () => {
    const { cardRef, wrapRef } = makeRefs()
    renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 0, bubbles: true }))
    expect(wrapRef.current!.style.getPropertyValue('--cursor-tilt')).not.toBe('')
    cardRef.current!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(wrapRef.current!.style.getPropertyValue('--cursor-tilt')).toBe('none')
  })

  it('no-ops when prefersReducedMotion is true', () => {
    mockReducedMotion = true
    const { cardRef, wrapRef } = makeRefs()
    renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 0, bubbles: true }))
    expect(wrapRef.current!.style.getPropertyValue('--cursor-tilt')).toBe('')
  })

  it('no-ops on coarse pointer (touch)', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('coarse'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    const { cardRef, wrapRef } = makeRefs()
    renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 0, bubbles: true }))
    expect(wrapRef.current!.style.getPropertyValue('--cursor-tilt')).toBe('')
  })

  it('removes the mousemove listener on unmount', () => {
    const { cardRef, wrapRef } = makeRefs()
    const { unmount } = renderHook(() => useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 }))
    unmount()
    cardRef.current!.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 0, bubbles: true }))
    expect(wrapRef.current!.style.getPropertyValue('--cursor-tilt')).toBe('')
  })
})
