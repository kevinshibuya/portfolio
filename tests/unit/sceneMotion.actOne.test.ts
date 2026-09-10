/**
 * Act one is pixel-identical, and this file is the definition of that.
 *
 * Every pure function the act-one frame reads is sampled across six viewports
 * and the whole act-one playhead range, rounded, and snapshotted. Act two adds
 * a second playhead unit past 3 and a second pose family; none of it may move a
 * single number below. If a snapshot changes, act one changed.
 *
 * The companion proof is the dev-server title-identity dump
 * (`scripts/scene-title-identity.mjs`), which covers what a pure test cannot:
 * the rasterised title's size and place on the real canvas.
 */
import { describe, it, expect } from 'vitest'
import {
  cameraPose,
  cardPose,
  easedSeg,
  fogRange,
  frameRects,
  frontIndexFor,
  overturePose,
  playheadFor,
  scrollTargetFor,
  seamFor,
  sceneGeometry,
  segmentFor,
  settledness,
  CARD_COUNT,
} from '../../src/utils/sceneMotion'

/** The four contract viewports plus two near-square ones inside the crossover. */
const VIEWPORTS: ReadonlyArray<{ name: string; w: number; h: number }> = [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1920x1080', w: 1920, h: 1080 },
  { name: '1280x720', w: 1280, h: 720 },
  { name: '393x851', w: 393, h: 851 },
  { name: '820x821', w: 820, h: 821 },
  { name: '960x950', w: 960, h: 950 },
]

/** Integer steps, so the sample points carry no float drift of their own. */
const STEP_LO = -30
const STEP_HI = 60
const STEP_DIV = 20

/** Nine decimals: far tighter than any visible difference, coarse enough to be stable. */
function r(value: number): number {
  return Number(value.toFixed(9))
}

function round<T>(value: T): T {
  if (typeof value === 'number') return r(value) as unknown as T
  if (Array.isArray(value)) return value.map(round) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) out[key] = round(v)
    return out as unknown as T
  }
  return value
}

describe('act one · pose snapshot', () => {
  for (const { name, w, h } of VIEWPORTS) {
    it(`is unchanged at ${name}`, () => {
      const g = sceneGeometry(w, h)
      const samples: unknown[] = []
      for (let i = STEP_LO; i <= STEP_HI; i++) {
        const seg = i / STEP_DIV
        const eased = easedSeg(seg)
        samples.push(
          round({
            seg,
            eased,
            camera: cameraPose(eased, g),
            cards: [0, 1, 2, 3].map((c) => cardPose(c, eased, g)),
            front: frontIndexFor(seg, CARD_COUNT, false),
            frontReduced: frontIndexFor(seg, CARD_COUNT, true),
            settled: settledness(seg, false),
            overture: overturePose(seg, false),
            overtureReduced: overturePose(seg, true),
            segment: segmentFor(seg, CARD_COUNT),
            seam: seamFor(segmentFor(seg, CARD_COUNT).frac, 0.4, 0.05),
            fog: fogRange(g, 0),
          }),
        )
      }
      const record = round({
        geometry: g,
        rects: frameRects(g),
        scrollTargets: [0, 1, 2, 3].map((k) => scrollTargetFor(k, 1234, 5.5 * h, h)),
        playheads: Array.from({ length: 10 }, (_, k) => playheadFor(k / 9)),
        samples,
      })
      expect(record).toMatchSnapshot()
    })
  }
})
