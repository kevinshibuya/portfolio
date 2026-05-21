import { describe, expect, it } from 'vitest'
import { ABOUT_FRAGMENTS } from '../../../src/data/aboutFragments'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

function resolve(path: string, root: unknown): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, root)
}

describe('ABOUT_FRAGMENTS', () => {
  it('exposes exactly 6 fragments', () => {
    expect(ABOUT_FRAGMENTS).toHaveLength(6)
  })

  it('has the documented ids in reveal order', () => {
    const ids = ABOUT_FRAGMENTS.map((f) => f.id)
    expect(ids).toEqual([
      'curiosity',
      'kid-toys',
      'how-it-worked',
      'present',
      'place',
      'future',
    ])
  })

  it('each fragment i18n key resolves to a non-empty string in EN and PT', () => {
    for (const fragment of ABOUT_FRAGMENTS) {
      const enValue = resolve(fragment.i18nKey, en)
      const ptValue = resolve(fragment.i18nKey, pt)
      expect(typeof enValue).toBe('string')
      expect(typeof ptValue).toBe('string')
      expect((enValue as string).length).toBeGreaterThan(0)
      expect((ptValue as string).length).toBeGreaterThan(0)
    }
  })

  it('label and fallbackParagraph keys resolve in both locales', () => {
    for (const root of [en, pt]) {
      const label = resolve('sections.about.label', root)
      const para = resolve('sections.about.fallbackParagraph', root)
      expect(typeof label).toBe('string')
      expect(typeof para).toBe('string')
      expect((label as string).length).toBeGreaterThan(0)
      expect((para as string).length).toBeGreaterThan(0)
    }
  })
})
