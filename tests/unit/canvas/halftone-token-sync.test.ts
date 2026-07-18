import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The halftone layer hardcodes its duotone defaults (plan-locked interface),
// duplicating the --ink/--cream CSS tokens. This test pins the sync so a
// future token re-point cannot silently leave the shader on stale colors
// (branch review finding: tokens.test.ts only guards index.css).

const read = (p: string): string =>
  readFileSync(resolve(__dirname, '../../../', p), 'utf8')

const css = read('src/index.css')

const cssToken = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!m) throw new Error(`token --${name} not found in index.css`)
  return m[1].toUpperCase()
}

describe('halftone duotone defaults stay in sync with --ink/--cream tokens', () => {
  const ink = cssToken('ink')
  const cream = cssToken('cream')

  it('HalftoneMaterial defaults match the tokens', () => {
    const src = read('src/canvas/halftone/HalftoneMaterial.ts')
    expect(src.toUpperCase()).toContain(ink)
    expect(src.toUpperCase()).toContain(cream)
  })

  it('HalftonePortrait prop defaults match the tokens', () => {
    const src = read('src/canvas/halftone/HalftonePortrait.tsx')
    expect(src.toUpperCase()).toContain(ink)
    expect(src.toUpperCase()).toContain(cream)
  })
})
