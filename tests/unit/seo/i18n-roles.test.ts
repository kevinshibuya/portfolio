import { describe, it, expect } from 'vitest'
import en from '../../../src/i18n/locales/en.json'
import pt from '../../../src/i18n/locales/pt.json'

// The hero role cycle leads with the canonical title and every role is
// lowercase editorial copy. Pinned here so a future edit can't silently
// reorder the cycle or drift the locales out of sync.

const EN_CANONICAL = 'senior front-end engineer · react/typescript'
const PT_CANONICAL = 'engenheiro front-end sênior · react/typescript'

describe('i18n hero roles', () => {
  it('en/pt arrays have the same length', () => {
    expect(en.hero.roles.length).toBe(pt.hero.roles.length)
  })

  it('roles[0] is the canonical title verbatim in each locale', () => {
    expect(en.hero.roles[0]).toBe(EN_CANONICAL)
    expect(pt.hero.roles[0]).toBe(PT_CANONICAL)
  })

  it('all roles are lowercase', () => {
    for (const role of [...en.hero.roles, ...pt.hero.roles]) {
      expect(role, `"${role}" must be lowercase`).toBe(role.toLowerCase())
    }
  })
})
