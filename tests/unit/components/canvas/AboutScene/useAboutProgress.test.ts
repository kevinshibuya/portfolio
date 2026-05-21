import { describe, expect, it } from 'vitest'
import { beatOpacityRange } from '../../../../../src/components/canvas/AboutScene/useAboutProgress'

describe('beatOpacityRange', () => {
  it('beat 0: opacity fades in by 0.05, fully visible until 0.33, fades out by 0.44', () => {
    expect(beatOpacityRange(0)).toEqual([0, 0.05, 0.33, 0.44])
  })

  it('beat 1: opacity fades in by 0.39, fully visible until 0.66, fades out by 0.77', () => {
    expect(beatOpacityRange(1)).toEqual([0.22, 0.39, 0.66, 0.77])
  })

  it('beat 2: opacity fades in by 0.72, fully visible until end', () => {
    expect(beatOpacityRange(2)).toEqual([0.55, 0.72, 1, 1])
  })
})
