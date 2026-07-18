import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Byline is statically imported by Home's lazy chunk and idle-warmed on every
// device, so its static module graph ships to fallback-only viewers (mobile /
// coarse / reduced-motion / no-WebGL) that render a plain <img>. This test
// pins the three.js split: the eager portrait chain must reach three / fiber /
// drei ONLY through the lazy() dynamic import of HalftoneCanvas (branch review
// finding: 241 KB gzip of three shipped for a static image).

const read = (p: string): string =>
  readFileSync(resolve(__dirname, '../../../', p), 'utf8')

/** Matches static ESM imports of a three-tainted specifier; ignores import(). */
const staticThreeImport =
  /import\s[^;]*?from\s+['"](three|@react-three\/(?:fiber|drei)|\.\/HalftoneMaterial|\.\/HalftoneCanvas)['"]/

describe('three.js stays out of the eager portrait chain', () => {
  it('HalftonePortrait.tsx has no static three-tainted import', () => {
    expect(read('src/canvas/halftone/HalftonePortrait.tsx')).not.toMatch(
      staticThreeImport,
    )
  })

  it('HalftonePortrait.tsx loads HalftoneCanvas via lazy dynamic import', () => {
    expect(read('src/canvas/halftone/HalftonePortrait.tsx')).toMatch(
      /lazy\(\(\)\s*=>\s*import\(['"]\.\/HalftoneCanvas['"]\)\)/,
    )
  })

  it('Byline.tsx has no static three-tainted import', () => {
    expect(read('src/components/sections/Byline.tsx')).not.toMatch(
      staticThreeImport,
    )
  })
})
