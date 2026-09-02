import { describe, it, expect } from 'vitest'
import {
  accentFor,
  accentDeepFor,
  accentDeepLargeFor,
  ACCENTS,
  ACCENTS_DEEP,
  ACCENTS_DEEP_LARGE,
} from '../../src/utils/palette'

describe('accentFor (raw tricolor, on-ink)', () => {
  it('rotates pink/blue/yellow and wraps', () => {
    expect(accentFor(0)).toBe('#E64D66')
    expect(accentFor(1)).toBe('#4D80E6')
    expect(accentFor(2)).toBe('#E6CC4D')
    expect(accentFor(3)).toBe('#E64D66')
  })
})

describe('accentDeepFor (on-light deep triplet)', () => {
  it('deep pink / deep blue / ink-muted (yellow small-text exemption), wraps', () => {
    expect(accentDeepFor(0)).toBe('#B22B47')
    expect(accentDeepFor(1)).toBe('#2A54B5')
    expect(accentDeepFor(2)).toBe('rgba(11,14,20,0.62)')
    expect(accentDeepFor(3)).toBe('#B22B47')
  })
  it('the yellow slot never emits a deep-yellow (fails small-text AA on cream)', () => {
    expect(ACCENTS_DEEP[2]).not.toMatch(/^#/)
  })
  it('is index-aligned in length with the raw triplet', () => {
    expect(ACCENTS_DEEP.length).toBe(ACCENTS.length)
  })
})

describe('accentDeepLargeFor (on-light large-text / decorative triplet)', () => {
  it('deep pink / deep blue / deep yellow, wraps', () => {
    expect(accentDeepLargeFor(0)).toBe('#B22B47')
    expect(accentDeepLargeFor(1)).toBe('#2A54B5')
    expect(accentDeepLargeFor(2)).toBe('#7A6800')
    expect(accentDeepLargeFor(3)).toBe('#B22B47')
  })
  it('carries a hex in the yellow slot, unlike the small-text triplet', () => {
    expect(ACCENTS_DEEP_LARGE[2]).toMatch(/^#/)
  })
  it('is index-aligned in length with the raw triplet', () => {
    expect(ACCENTS_DEEP_LARGE.length).toBe(ACCENTS.length)
  })
})
