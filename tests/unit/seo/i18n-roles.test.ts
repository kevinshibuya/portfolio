import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

// The hero's role line is the canonical title. The header's name line repeats
// it after the name, and the document title (which search engines and link
// previews read) is the English name line. Pinned here so an edit to one cannot
// drift the others or the two locales apart.

const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8')

describe('i18n hero role', () => {
  it('is the canonical title verbatim in each locale', () => {
    expect(en.hero.role).toBe('software engineer · full-stack')
    expect(pt.hero.role).toBe('engenheiro de software · full-stack')
  })

  it('is lowercase editorial copy in both locales', () => {
    for (const role of [en.hero.role, pt.hero.role]) expect(role).toBe(role.toLowerCase())
  })

  it('closes the header name line in both locales', () => {
    expect(en.nav.name).toBe(`kevin shibuya · ${en.hero.role}`)
    expect(pt.nav.name).toBe(`kevin shibuya · ${pt.hero.role}`)
  })

  it('is the document title, through the English name line', () => {
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe(en.nav.name)
  })
})
