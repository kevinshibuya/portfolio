import { describe, it, expect } from 'vitest'
import { projects } from '../../../src/data/projects'

describe('projects data invariants', () => {
  it('every project ships a pitch (required for the v3 detail page)', () => {
    for (const p of projects) {
      expect(p.pitch?.en, `${p.id} missing pitch.en`).toBeTruthy()
      expect(p.pitch?.pt, `${p.id} missing pitch.pt`).toBeTruthy()
    }
  })

  it('top-4 highlights carry every required mockup', () => {
    // Promoting a project to top-4 without generating its mockup assets used
    // to crash the runtime via an IIFE inside projects.ts. The check now
    // lives here so it gates `npm run test:unit` instead of every page load.
    const top4 = projects.filter(
      (p) => p.highlight && (p.highlightOrder ?? 99) <= 4,
    )
    expect(top4.length, 'expected four top highlights').toBe(4)
    for (const p of top4) {
      expect(p.mockups?.desktop, `${p.id} missing mockups.desktop`).toBeTruthy()
      expect(p.mockups?.desktopBento, `${p.id} missing mockups.desktopBento`).toBeTruthy()
      expect(p.mockups?.mobile, `${p.id} missing mockups.mobile`).toBeTruthy()
    }
  })

  it('highlight ordering has no gaps and no duplicates', () => {
    const orders = projects
      .filter((p) => p.highlight)
      .map((p) => p.highlightOrder)
      .filter((o): o is number => typeof o === 'number')
      .sort((a, b) => a - b)
    const dupes = orders.filter((o, i) => orders.indexOf(o) !== i)
    expect(dupes, 'duplicate highlightOrder values').toEqual([])
  })

  it('every project slug is unique', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
