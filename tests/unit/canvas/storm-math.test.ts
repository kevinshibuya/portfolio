import { describe, expect, it } from 'vitest'
import {
  wrapPi,
  smoothFalloff,
  fragmentAngle,
  fragmentOpacityAtAngle,
} from '../../../src/components/canvas/AboutScene/storm-math'

const TAU = Math.PI * 2

describe('wrapPi', () => {
  it('returns x unchanged inside [-π, π]', () => {
    expect(wrapPi(0)).toBeCloseTo(0)
    expect(wrapPi(Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(wrapPi(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
  })

  it('wraps multiples of 2π back to within [-π, π]', () => {
    expect(wrapPi(TAU)).toBeCloseTo(0)
    expect(wrapPi(3 * Math.PI)).toBeCloseTo(-Math.PI)
    expect(wrapPi(-3 * Math.PI)).toBeCloseTo(-Math.PI)
  })
})

describe('smoothFalloff', () => {
  it('returns 1 below edge0', () => {
    expect(smoothFalloff(0, 1, 2)).toBeCloseTo(1)
    expect(smoothFalloff(0.5, 1, 2)).toBeCloseTo(1)
  })

  it('returns 0 above edge1', () => {
    expect(smoothFalloff(2, 1, 2)).toBeCloseTo(0)
    expect(smoothFalloff(3, 1, 2)).toBeCloseTo(0)
  })

  it('interpolates smoothly between edges', () => {
    expect(smoothFalloff(1.5, 1, 2)).toBeCloseTo(0.5, 2)
  })
})

describe('fragmentAngle', () => {
  it('places fragments at (i+0.5) · 2π/N around the cylinder', () => {
    expect(fragmentAngle(0, 6)).toBeCloseTo(Math.PI / 6)
    expect(fragmentAngle(1, 6)).toBeCloseTo(Math.PI / 2)
    expect(fragmentAngle(5, 6)).toBeCloseTo(11 * Math.PI / 6)
  })
})

describe('fragmentOpacityAtAngle', () => {
  const FADE_START = Math.PI / 9   // 20°
  const FADE_END = Math.PI / 6     // 30°

  it('returns 1.0 at angle 0', () => {
    expect(fragmentOpacityAtAngle(0, FADE_START, FADE_END)).toBeCloseTo(1)
  })

  it('returns 1.0 at the inner edge', () => {
    expect(fragmentOpacityAtAngle(FADE_START, FADE_START, FADE_END)).toBeCloseTo(1)
  })

  it('returns 0.0 at the outer edge and beyond', () => {
    expect(fragmentOpacityAtAngle(FADE_END, FADE_START, FADE_END)).toBeCloseTo(0)
    expect(fragmentOpacityAtAngle(Math.PI / 2, FADE_START, FADE_END)).toBeCloseTo(0)
  })

  it('crossfades smoothly inside the window', () => {
    const mid = (FADE_START + FADE_END) / 2
    const v = fragmentOpacityAtAngle(mid, FADE_START, FADE_END)
    expect(v).toBeGreaterThan(0.3)
    expect(v).toBeLessThan(0.7)
  })

  it('is symmetric around zero (uses abs)', () => {
    const a = fragmentOpacityAtAngle(0.2, FADE_START, FADE_END)
    const b = fragmentOpacityAtAngle(-0.2, FADE_START, FADE_END)
    expect(a).toBeCloseTo(b)
  })
})
