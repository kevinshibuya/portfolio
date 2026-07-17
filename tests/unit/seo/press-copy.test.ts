import { describe, it, expect } from 'vitest'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

const readerFacing = (o: Record<string, unknown>): string[] => {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v as object).forEach(walk)
  }
  walk(o)
  return out
}

describe('press revamp copy', () => {
  it('adds a canonical hero title in both locales', () => {
    expect(en.hero.title).toBe('senior front-end engineer · react/typescript')
    expect(pt.hero.title).toBe('engenheiro front-end sênior · react/typescript')
  })

  it('retires the "a team of one" tagline', () => {
    expect(en.hero.description).not.toMatch(/team of one/i)
    expect(pt.hero.description).not.toMatch(/time de um/i)
    expect(en.hero.description).toMatch(/249 pieces/)
    expect(pt.hero.description).toMatch(/249 peças/)
  })

  it('authors the byline block in both locales', () => {
    for (const loc of [en, pt] as const) {
      expect(loc.byline.caption).toBe('kevin, porto alegre')
      expect(loc.byline.body.length).toBeGreaterThan(120)
      expect(loc.byline.marginNoteAlt.length).toBeGreaterThan(0)
      expect(loc.byline.portraitAlt.length).toBeGreaterThan(0)
    }
  })

  it('has zero spaced em-dashes anywhere in reader-facing prose', () => {
    for (const loc of [en, pt] as const) {
      for (const s of readerFacing(loc as unknown as Record<string, unknown>)) {
        expect(s.includes(' — '), `spaced em-dash in: "${s}"`).toBe(false)
      }
    }
  })
})
