import { describe, it, expect } from 'vitest'
import {
  SPRINGS,
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  REDUCED_MOTION_VARIANT,
  type RecipeName,
} from '../../src/utils/animations'

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
    expect(VARIANTS.stampIn.hidden).toMatchObject({ opacity: 0, scale: 1.15, filter: 'blur(2px)' })
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
    expect(STAGGER_PRESETS.skillsColumns).toBeCloseTo(0.12)
    expect(STAGGER_PRESETS.skillsItems).toBeCloseTo(0.06)
    expect(STAGGER_PRESETS.projectCards).toBeCloseTo(0.1)
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
