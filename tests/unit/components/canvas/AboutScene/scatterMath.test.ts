import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { scatterOffset, spreadDirection } from '../../../../../src/components/canvas/AboutScene/scatterMath'

describe('scatterOffset', () => {
  it('is deterministic per index', () => {
    const a = scatterOffset(3)
    const b = scatterOffset(3)
    expect(a.x).toBe(b.x)
    expect(a.y).toBe(b.y)
    expect(a.z).toBe(b.z)
  })

  it('differs across indices', () => {
    const a = scatterOffset(0)
    const b = scatterOffset(1)
    expect(a.equals(b)).toBe(false)
  })

  it('stays within the documented scatter bounds (|x|,|y| <= 2, |z| <= 1.5)', () => {
    for (let i = 0; i < 20; i++) {
      const o = scatterOffset(i)
      expect(Math.abs(o.x)).toBeLessThanOrEqual(2)
      expect(Math.abs(o.y)).toBeLessThanOrEqual(2)
      expect(Math.abs(o.z)).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('spreadDirection', () => {
  it('returns a normalized outward direction from origin', () => {
    const pos = new Vector3(1, 0, 0)
    const dir = spreadDirection(pos)
    expect(dir.length()).toBeCloseTo(1, 5)
    expect(dir.x).toBeGreaterThan(0)
  })

  it('adds upward bias to the direction', () => {
    const pos = new Vector3(0, 0, 1)
    const dir = spreadDirection(pos)
    expect(dir.y).toBeGreaterThan(0)
  })

  it('handles parts at origin without NaN', () => {
    const pos = new Vector3(0, 0, 0)
    const dir = spreadDirection(pos)
    expect(Number.isFinite(dir.x)).toBe(true)
    expect(Number.isFinite(dir.y)).toBe(true)
    expect(Number.isFinite(dir.z)).toBe(true)
  })
})
