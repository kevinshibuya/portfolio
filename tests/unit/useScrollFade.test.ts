import { describe, it, expect } from 'vitest'
import { computeFadeOpacity } from '../../src/hooks/useScrollFade'

describe('computeFadeOpacity', () => {
  const cfg = { startOffset: 80, endOffset: -120 }
  it('opacity = 1 when above start', () => {
    expect(computeFadeOpacity(100, cfg)).toBeCloseTo(1)
  })
  it('opacity = 0 when below end', () => {
    expect(computeFadeOpacity(-200, cfg)).toBeCloseTo(0)
  })
  it('eased middle is between 0.4 and 0.7 at top=-50', () => {
    const op = computeFadeOpacity(-50, cfg)
    expect(op).toBeGreaterThan(0.4)
    expect(op).toBeLessThan(0.7)
  })
})
