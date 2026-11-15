import { describe, it, expect } from 'vitest'
import en from '../../src/i18n/locales/en.json'
import pt from '../../src/i18n/locales/pt.json'

type Tree = { readonly [key: string]: string | Tree }

/** Every leaf of a locale file as a dotted path. */
function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
  )
}

describe('locale files', () => {
  it('EN and PT have exactly the same keys', () => {
    expect(keys(pt).sort()).toEqual(keys(en).sort())
  })

  it('no string is empty in either language', () => {
    for (const [name, tree] of [['en', en], ['pt', pt]] as const) {
      const leaves = keys(tree)
      expect(leaves.length).toBeGreaterThan(0)
      for (const path of leaves) {
        const value = path.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part], tree)
        expect(String(value).trim(), `${name}: ${path}`).not.toBe('')
      }
    }
  })
})
