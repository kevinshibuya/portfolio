import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PALETTE, toVec3 } from '../../src/utils/palette'

// The shader reads its colours from palette.ts; the stylesheet repeats the same
// hexes as tokens. A change to one without the other would put the paint and
// the page out of step, so the two are pinned together here.
const css = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8')

function token(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase()
}

describe('PALETTE', () => {
  it('cream, black and orange match the stylesheet tokens', () => {
    expect(token('cream')).toBe(PALETTE.cream.toUpperCase())
    expect(token('black')).toBe(PALETTE.black.toUpperCase())
    expect(token('orange')).toBe(PALETTE.orange.toUpperCase())
    expect(token('color-cream')).toBe(PALETTE.cream.toUpperCase())
    expect(token('color-black')).toBe(PALETTE.black.toUpperCase())
    expect(token('color-orange')).toBe(PALETTE.orange.toUpperCase())
  })

  it('the paint stand-in uses the paint’s pink and orange', () => {
    const fallback = css.match(/\.paint-fallback \{\s*background:([^}]*)\}/)?.[1] ?? ''
    expect(fallback.toUpperCase()).toContain(PALETTE.pink.toUpperCase())
    expect(fallback).toContain('var(--orange)')
  })

  it('every colour is a six-digit hex', () => {
    for (const hex of Object.values(PALETTE)) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('toVec3', () => {
  it('maps #RRGGBB to 0..1 floats', () => {
    expect([...toVec3('#000000')]).toEqual([0, 0, 0])
    expect([...toVec3('#FFFFFF')]).toEqual([1, 1, 1])
    const [r, g, b] = toVec3(PALETTE.orange)
    expect(r).toBeCloseTo(0xd9 / 255, 6)
    expect(g).toBeCloseTo(0x43 / 255, 6)
    expect(b).toBeCloseTo(0, 6)
  })
})
