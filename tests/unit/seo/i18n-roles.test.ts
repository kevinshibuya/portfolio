import { describe, it, expect } from 'vitest'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

// Hero role copy is grammatically sensitive: the prefix ("i am" / "sou") plus
// the role must read naturally. Once burned by "i am an architect" pre-vowel
// shift; pinned here so the next change to roles doesn't regress.

describe('i18n hero roles', () => {
  it('en/pt arrays have the same length', () => {
    expect(en.hero.roles.length).toBe(pt.hero.roles.length)
  })

  it('en roles start with the correct indefinite article', () => {
    for (const role of en.hero.roles) {
      const startsWithVowelSound = /^[aeiou]/i.test(role.replace(/^a |^an /, ''))
      const expectedArticle = startsWithVowelSound ? 'an ' : 'a '
      expect(role.startsWith(expectedArticle), `"${role}" should start with "${expectedArticle}"`).toBe(true)
    }
  })

  it('pt roles start with um or uma', () => {
    for (const role of pt.hero.roles) {
      expect(role.startsWith('um ') || role.startsWith('uma '), `"${role}" should start with "um " or "uma "`).toBe(true)
    }
  })
})
