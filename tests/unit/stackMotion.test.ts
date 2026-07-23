import { describe, it, expect } from 'vitest'
import {
  clamp,
  smoothstep,
  segmentFor,
  settleFrac,
  depthTransform,
  cardStyleAt,
  morphValues,
} from '../../src/utils/stackMotion'

describe('clamp', () => {
  it('bounds below / within / above', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
    expect(clamp(2, 0, 1)).toBe(1)
  })
})

describe('smoothstep', () => {
  it('pins endpoints and midpoint', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
  })
  it('eases in-out (slower than linear near the ends)', () => {
    expect(smoothstep(0.25)).toBeLessThan(0.25)
    expect(smoothstep(0.75)).toBeGreaterThan(0.75)
  })
})

describe('segmentFor (n=4 → 3 equal segments)', () => {
  it('start of scroll → first segment, frac 0', () => {
    expect(segmentFor(0, 4)).toEqual({ index: 0, frac: 0 })
  })
  it('end of scroll → last segment (n-2), frac 1', () => {
    expect(segmentFor(1, 4)).toEqual({ index: 2, frac: 1 })
  })
  it('maps progress across (n-1) equal segments', () => {
    const s = segmentFor(0.5, 4) // raw = 1.5
    expect(s.index).toBe(1)
    expect(s.frac).toBeCloseTo(0.5, 6)
  })
  it('just past a boundary lands in the next segment near frac 0', () => {
    const s = segmentFor(0.34, 4) // raw = 1.02
    expect(s.index).toBe(1)
    expect(s.frac).toBeCloseTo(0.02, 6)
  })
  it('clamps out-of-range progress', () => {
    expect(segmentFor(-0.2, 4)).toEqual({ index: 0, frac: 0 })
    expect(segmentFor(1.5, 4)).toEqual({ index: 2, frac: 1 })
  })
  it('degenerate n<=1 never divides by zero', () => {
    expect(segmentFor(0.7, 1)).toEqual({ index: 0, frac: 0 })
  })
})

describe('settleFrac (plateau remap, window 0.15–0.85)', () => {
  it('clamps to a settled plateau before / after the window', () => {
    expect(settleFrac(0)).toBe(0)
    expect(settleFrac(0.15)).toBe(0)
    expect(settleFrac(0.1)).toBe(0)
    expect(settleFrac(0.85)).toBe(1)
    expect(settleFrac(0.9)).toBe(1)
    expect(settleFrac(1)).toBe(1)
  })
  it('window centre maps to 0.5', () => {
    expect(settleFrac(0.5)).toBeCloseTo(0.5, 6)
  })
  it('is monotonic across the transition window', () => {
    expect(settleFrac(0.3)).toBeLessThan(settleFrac(0.6))
  })
})

describe('depthTransform (slots 12/-16/-44, scales 1/.95/.9, exit y 520)', () => {
  it('front card (depth 0) sits at slot 0 when settled', () => {
    expect(depthTransform(0, 0)).toMatchObject({ y: 12, scale: 1, opacity: 1 })
  })
  it('front card exits to y 520 and fades to .85 across the window', () => {
    expect(depthTransform(0, 1)).toMatchObject({ y: 520, opacity: 0.85 })
  })
  it('front-card exit accelerates (ease-in lags the linear midpoint 266)', () => {
    expect(depthTransform(0, 0.5).y).toBeLessThan(266)
  })
  it('depth 1 promotes into the front slot', () => {
    expect(depthTransform(1, 0)).toMatchObject({ y: -16, scale: 0.95, opacity: 1 })
    expect(depthTransform(1, 1)).toMatchObject({ y: 12, scale: 1, opacity: 1 })
  })
  it('promotion decelerates (ease-out leads the linear midpoint -2)', () => {
    expect(depthTransform(1, 0.5).y).toBeGreaterThan(-2)
  })
  it('depth 2 promotes one slot forward', () => {
    expect(depthTransform(2, 0)).toMatchObject({ y: -44, scale: 0.9 })
    expect(depthTransform(2, 1)).toMatchObject({ y: -16, scale: 0.95 })
  })
  it('incoming depth-3 card fades in at the back slot without moving', () => {
    expect(depthTransform(3, 0)).toMatchObject({ y: -44, opacity: 0 })
    expect(depthTransform(3, 1)).toMatchObject({ y: -44, opacity: 1 })
  })
  it('shadow strength tracks slot linearly', () => {
    expect(depthTransform(0, 0).shadow).toBeCloseTo(1, 6)
    expect(depthTransform(2, 0).shadow).toBeCloseTo(0.3, 6)
  })
})

describe('cardStyleAt (single-channel rel = cardIndex − segCont)', () => {
  it('parks any fully-exited card (rel ≤ −1) at EXIT_Y, opacity/shadow 0', () => {
    expect(cardStyleAt(-1)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
    expect(cardStyleAt(-1.5)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
    expect(cardStyleAt(-3)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
  })
  it('integer rest states equal depthTransform(depth, 0)', () => {
    expect(cardStyleAt(0)).toEqual(depthTransform(0, 0)) // front at rest
    expect(cardStyleAt(1)).toEqual(depthTransform(1, 0))
    expect(cardStyleAt(2)).toEqual(depthTransform(2, 0))
    expect(cardStyleAt(3)).toEqual(depthTransform(3, 0)) // incoming, opacity 0 at back slot
  })
  it('mid-exit (rel −0.5) decomposes to depthTransform(0, 0.5)', () => {
    expect(cardStyleAt(-0.5)).toEqual(depthTransform(0, 0.5))
  })
  it('mid-promotion (rel 0.5) decomposes to depthTransform(1, 0.5)', () => {
    expect(cardStyleAt(0.5)).toEqual(depthTransform(1, 0.5))
  })
  it('is continuous approaching the park boundary, then the park drops opacity', () => {
    // rel = −1 + ε → depthTransform(0, 1 − ε): y → 520, opacity → 0.85, shadow → 1.
    const nearY = cardStyleAt(-1 + 1e-4)
    expect(nearY.y).toBeGreaterThan(519.8)
    expect(nearY.y).toBeLessThanOrEqual(520)
    expect(nearY.opacity).toBeCloseTo(0.85, 3)
    // The only discontinuity at rel = −1 is the park branch: opacity 0.85 → 0.
    const parked = cardStyleAt(-1)
    expect(parked.y).toBe(520)
    expect(parked.opacity).toBe(0)
    expect(parked.shadow).toBe(0)
  })
})

describe('morphValues (gooey blur/opacity, cap in bounds, no Infinity)', () => {
  // The blur CAP is an Anton-tunable constant within [100, 240] (T8): bigger
  // glyphs need proportionally more blur to fully dissolve at the crossfade
  // extremes. These bound the cap instead of pinning it, so any value T8 picks
  // in-range stays green; the midpoint gooey blur (8px) stays exact.
  const BLUR_CAP_MIN = 100
  const BLUR_CAP_MAX = 240
  it('at frac 0 the outgoing title is crisp, incoming maxed-blur + transparent', () => {
    const m = morphValues(0)
    expect(m.outgoing).toEqual({ blur: 0, opacity: 1 })
    expect(m.incoming.opacity).toBe(0)
    expect(m.incoming.blur).toBeGreaterThanOrEqual(BLUR_CAP_MIN)
    expect(m.incoming.blur).toBeLessThanOrEqual(BLUR_CAP_MAX)
  })
  it('at frac 1 the incoming title is crisp, outgoing gone', () => {
    const m = morphValues(1)
    expect(m.incoming).toEqual({ blur: 0, opacity: 1 })
    expect(m.outgoing.opacity).toBe(0)
    expect(m.outgoing.blur).toBeGreaterThanOrEqual(BLUR_CAP_MIN)
    expect(m.outgoing.blur).toBeLessThanOrEqual(BLUR_CAP_MAX)
  })
  it('at the midpoint both blur to 8px and are symmetric', () => {
    const m = morphValues(0.5)
    expect(m.incoming.blur).toBeCloseTo(8, 6)
    expect(m.outgoing.blur).toBeCloseTo(8, 6)
    expect(m.incoming.opacity).toBeCloseTo(Math.pow(0.5, 0.4), 6)
  })
  it('blur is always within [0, cap]', () => {
    for (const f of [0, 0.01, 0.2, 0.5, 0.8, 0.99, 1]) {
      const m = morphValues(f)
      for (const b of [m.incoming.blur, m.outgoing.blur]) {
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(BLUR_CAP_MAX)
      }
    }
  })
})
