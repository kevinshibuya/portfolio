import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8')

describe('warm paper neutral tokens', () => {
  it('re-points cream/sand/mist to the warm paper family in both @theme and :root', () => {
    // two occurrences each: --color-<name> (@theme) and --<name> (:root)
    expect(css.match(/#F7F5F1/gi) ?? []).toHaveLength(2)
    expect(css.match(/#EFEAE1/gi) ?? []).toHaveLength(2)
    expect(css.match(/#E2DACB/gi) ?? []).toHaveLength(2)
  })

  it('drops the old cool cream/sand/mist neutral values', () => {
    expect(css).not.toMatch(/#F6F9FC/i) // old cream
    expect(css).not.toMatch(/#EAF2F8/i) // old sand
    expect(css).not.toMatch(/#D4E5F2/i) // old mist
  })

  it('keeps the blue scale and ink untouched', () => {
    expect(css).toMatch(/#3A96E8/i) // blue-400 accent
    expect(css).toMatch(/#111822/i) // ink
    expect(css).toMatch(/#1C6EC4/i) // blue-500
  })
})
