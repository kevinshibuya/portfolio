import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMotionValue, motionValue, frameSteps } from 'framer-motion'
import { useAboutProgressDerived } from '../../../src/components/canvas/AboutScene/useAboutProgress'

/** Flush pending framer-motion preRender scheduled callbacks. */
function flushFrames() {
  frameSteps.preRender.process({ timestamp: 0, delta: 0, isProcessing: true })
}

describe('useAboutProgressDerived', () => {
  it('cameraZ holds at 5.0 at progress 0', () => {
    const { result } = renderHook(() => {
      const p = useMotionValue(0)
      return useAboutProgressDerived(p)
    })
    expect(result.current.cameraZ.get()).toBeCloseTo(5.0)
  })

  it('cameraZ reaches 2.5 at progress 0.25 and holds after', () => {
    const p = motionValue(0)
    const { result } = renderHook(() => useAboutProgressDerived(p))

    act(() => { p.set(0.25); flushFrames() })
    expect(result.current.cameraZ.get()).toBeCloseTo(2.5)

    act(() => { p.set(0.75); flushFrames() })
    expect(result.current.cameraZ.get()).toBeCloseTo(2.5)

    act(() => { p.set(1.0); flushFrames() })
    expect(result.current.cameraZ.get()).toBeCloseTo(2.5)
  })

  it('robotSpinY does one full revolution between 0 and 0.25, then holds', () => {
    const p = motionValue(0)
    const { result } = renderHook(() => useAboutProgressDerived(p))

    expect(result.current.robotSpinY.get()).toBeCloseTo(0)

    act(() => { p.set(0.125); flushFrames() })
    expect(result.current.robotSpinY.get()).toBeCloseTo(Math.PI)

    act(() => { p.set(0.25); flushFrames() })
    // Lands at 2π — visually identical to 0 (front-facing).
    expect(result.current.robotSpinY.get()).toBeCloseTo(2 * Math.PI)

    act(() => { p.set(0.5); flushFrames() })
    expect(result.current.robotSpinY.get()).toBeCloseTo(2 * Math.PI)
  })

  it('cylinderRotation tracks progress · 2π linearly', () => {
    const p = motionValue(0)
    const { result } = renderHook(() => useAboutProgressDerived(p))

    expect(result.current.cylinderRotation.get()).toBeCloseTo(0)

    act(() => { p.set(0.5); flushFrames() })
    expect(result.current.cylinderRotation.get()).toBeCloseTo(Math.PI)

    act(() => { p.set(1.0); flushFrames() })
    expect(result.current.cylinderRotation.get()).toBeCloseTo(2 * Math.PI)
  })

  it('exposes 6 fragment opacity MotionValues, only one active at a time', () => {
    const p = motionValue(0)
    const { result } = renderHook(() => useAboutProgressDerived(p))

    expect(result.current.fragmentOpacities).toHaveLength(6)

    // At progress 0, all fragments are at their starting angles (none at front).
    const initial = result.current.fragmentOpacities.map((m) => m.get())
    for (const v of initial) {
      expect(v).toBeLessThan(0.01)
    }

    // At progress (0+0.5)/6 ≈ 0.0833, fragment 0 should be fully opaque.
    act(() => { p.set(0.5 / 6); flushFrames() })
    const atFrag0Peak = result.current.fragmentOpacities.map((m) => m.get())
    expect(atFrag0Peak[0]).toBeCloseTo(1, 1)
    for (let i = 1; i < 6; i++) {
      expect(atFrag0Peak[i]).toBeLessThan(0.01)
    }

    // At progress (3+0.5)/6 ≈ 0.583, fragment 3 should be fully opaque.
    act(() => { p.set(3.5 / 6); flushFrames() })
    const atFrag3Peak = result.current.fragmentOpacities.map((m) => m.get())
    expect(atFrag3Peak[3]).toBeCloseTo(1, 1)
    for (let i = 0; i < 6; i++) {
      if (i === 3) continue
      expect(atFrag3Peak[i]).toBeLessThan(0.01)
    }
  })
})
