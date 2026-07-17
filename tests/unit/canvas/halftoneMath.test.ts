import { describe, it, expect } from 'vitest'
import {
  ROSETTE_ANGLES_DEG,
  rosetteAnglesRad,
  frequencyForProgress,
  cappedDpr,
} from '../../../src/canvas/halftone/halftoneMath'

describe('halftoneMath', () => {
  it('exposes authentic rosette screen angles', () => {
    expect(ROSETTE_ANGLES_DEG).toEqual({ c: 15, m: 75, y: 0, k: 45 })
  })

  it('converts rosette angles to radians in C,M,Y,K order', () => {
    const [c, m, y, k] = rosetteAnglesRad()
    const d2r = (d: number) => (d * Math.PI) / 180
    expect(c).toBeCloseTo(d2r(15), 6)
    expect(m).toBeCloseTo(d2r(75), 6)
    expect(y).toBeCloseTo(d2r(0), 6)
    expect(k).toBeCloseTo(d2r(45), 6)
  })

  it('scrubs frequency coarse→fine, clamped to [0,1]', () => {
    expect(frequencyForProgress(0)).toBeCloseTo(8, 6)
    expect(frequencyForProgress(1)).toBeCloseTo(120, 6)
    expect(frequencyForProgress(0.5)).toBeCloseTo(64, 6)
    expect(frequencyForProgress(-3)).toBeCloseTo(8, 6)   // clamp low
    expect(frequencyForProgress(9)).toBeCloseTo(120, 6)  // clamp high
    expect(frequencyForProgress(0.5, 10, 20)).toBeCloseTo(15, 6) // custom range
  })

  it('caps DPR to [1, cap]', () => {
    expect(cappedDpr(3)).toBe(2)
    expect(cappedDpr(0.5)).toBe(1)
    expect(cappedDpr(1.5)).toBe(1.5)
    expect(cappedDpr(3, 3)).toBe(3)
  })
})
