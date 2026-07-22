import { describe, it, expect } from 'vitest'
import {
  SPRINGS,
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  REDUCED_MOTION_VARIANT,
  type RecipeName,
} from '../../src/utils/animations'
import { skillCategories } from '../../src/data/skills'

describe('SPRINGS', () => {
  it('exposes gentle, snappy, soft with type:spring', () => {
    for (const key of ['gentle', 'snappy', 'soft'] as const) {
      expect(SPRINGS[key].type).toBe('spring')
      expect(typeof SPRINGS[key].stiffness).toBe('number')
      expect(typeof SPRINGS[key].damping).toBe('number')
      expect(typeof SPRINGS[key].mass).toBe('number')
    }
  })
})

describe('VARIANTS', () => {
  const recipes: RecipeName[] = [
    'fadeUp', 'scaleIn', 'stampIn', 'cardReveal', 'slideInLeft', 'slideInRight',
  ]
  for (const r of recipes) {
    it(`${r} has hidden + visible states`, () => {
      const v = VARIANTS[r]
      expect(v.hidden).toBeDefined()
      expect(v.visible).toBeDefined()
    })
  }

  it('fadeUp goes from y +40 to y 0', () => {
    expect(VARIANTS.fadeUp.hidden).toMatchObject({ opacity: 0, y: 40 })
    expect(VARIANTS.fadeUp.visible).toMatchObject({ opacity: 1, y: 0 })
  })

  it('stampIn includes a blur filter on hidden', () => {
    expect(VARIANTS.stampIn.hidden).toMatchObject({ opacity: 0, scale: 1.06, filter: 'blur(2px)' })
    expect(VARIANTS.stampIn.visible).toMatchObject({ opacity: 1, scale: 1, filter: 'blur(0px)' })
  })

  it('slideInRight is a +32px x mirror of slideInLeft', () => {
    expect(VARIANTS.slideInLeft.hidden).toMatchObject({ x: -32 })
    expect(VARIANTS.slideInRight.hidden).toMatchObject({ x: 32 })
  })
})

describe('staggerContainer', () => {
  it('produces a parent variant whose visible.transition has the requested staggerChildren', () => {
    const v = staggerContainer(0.12, 0.08)
    expect(v.hidden).toEqual({})
    expect(v.visible).toMatchObject({
      transition: { staggerChildren: 0.12, delayChildren: 0.08 },
    })
  })

  it('defaults delayChildren to 0', () => {
    const v = staggerContainer(0.05)
    expect(v.visible).toMatchObject({
      transition: { staggerChildren: 0.05, delayChildren: 0 },
    })
  })
})

describe('STAGGER_PRESETS', () => {
  it('exposes named presets used by sections', () => {
    expect(STAGGER_PRESETS.workRows).toBeCloseTo(0.1)
    expect(STAGGER_PRESETS.skillsColumns).toBeCloseTo(0.05)
    expect(STAGGER_PRESETS.skillsItems).toBeCloseTo(0.03)
    expect(STAGGER_PRESETS.projectCards).toBeCloseTo(0.05)
    expect(STAGGER_PRESETS.embedRows).toBeCloseTo(0.05)
    expect(STAGGER_PRESETS.statValues).toBeCloseTo(0.12)
  })
})

describe('REDUCED_MOTION_VARIANT', () => {
  it('collapses to opacity-only with a 200ms easeOut tween', () => {
    expect(REDUCED_MOTION_VARIANT.hidden).toMatchObject({ opacity: 0 })
    expect(REDUCED_MOTION_VARIANT.visible).toMatchObject({
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    })
  })
})

// Guard: Framer nested-container stagger accumulates. The motion-design skill
// caps total stagger at 500ms. Item counts are fixed in src/data/*:
// Projects 9, Stats 5, WorkExperience 5. Skills counts are derived from the
// real data below (categories vary; DevOps has 8 skills), so the worst case is
// checked against actual content, not a hard-coded assumption.
describe('stagger budgets stay under the 500ms motion-design ceiling', () => {
  const CEIL = 0.5
  it('projects: 9 cards, last-card start < 0.5s', () => {
    expect((9 - 1) * STAGGER_PRESETS.projectCards).toBeLessThan(CEIL)
  })
  it('stats: 5 values, last start < 0.5s', () => {
    expect((5 - 1) * STAGGER_PRESETS.statValues).toBeLessThan(CEIL)
  })
  it('workExperience: 5 rows, last start < 0.5s', () => {
    expect((5 - 1) * STAGGER_PRESETS.workRows).toBeLessThan(CEIL)
  })
  it('skills: nested columns x items (real data), worst-case last-dot start < 0.5s', () => {
    const columnCount = skillCategories.length
    const maxItems = Math.max(...skillCategories.map((c) => c.skills.length))
    const lastColumnStart = (columnCount - 1) * STAGGER_PRESETS.skillsColumns
    const lastItemStart = (maxItems - 1) * STAGGER_PRESETS.skillsItems
    expect(lastColumnStart + lastItemStart).toBeLessThan(CEIL)
  })
})
