import { describe, it, expect } from 'vitest'
import {
  CARD_COUNT,
  CARD_H,
  CARD_W,
  CARD_Y,
  PASS_FADE_START,
  PASS_FADE_END,
  clamp,
  smoothstep,
  settleFrac,
  playheadFor,
  easedSeg,
  segmentFor,
  frontIndexFor,
  sceneGeometry,
  cameraPose,
  cardPose,
  projectPoint,
  frameRects,
  settledness,
  focusDistance,
  seamFor,
  seamBlend,
  SEAM_WIDTH_EM,
  SEAM_SIGMA_EM,
  SEAM_POWER,
  ambientOffset,
  velocityEnergy,
  velocityYaw,
  fogRange,
  APPROACH_DEPTH,
  APPROACH_START,
  OVERTURE_START,
  OVERTURE_FADE,
  CORRIDOR_DEPTH,
  FOV_DEG,
  overturePose,
  overtureZ,
  overtureWidth,
  CAPTION_NAME_PX,
  CAPTION_MIN_NAME_PX,
  CARD_MIN_PX,
  CARD_MAX_PX,
  CROSSOVER_START,
  CROSSOVER_END,
  titleBand,
  TITLE_WIDTH_CAP,
  titleWrapAllowancePx,
  TITLE_WIDTH_CAP_PORTRAIT,
  TITLE_CLEARANCE,
  TITLE_CLEARANCE_PORTRAIT,
  scrollTargetFor,
  ACT_TWO_RELEASE_SVH,
  ACT_TWO_APPROACH_SVH,
  ACT_TWO_SVH_PER_COLUMN,
  ACT_ONE_SVH,
  ACT_TWO_START,
  actTwoSvh,
  sceneWrapperSvh,
  actTwoBeats,
  actTwoProgress,
  actOneSeg,
  actTwoPlayhead,
  volumeShotPlayhead,
  VOLUME_FILL,
  DOLLY_HEIGHT_FILL,
  FRIEZE_CELL_MIN_PX,
  HOVER,
  friezeFrame,
  volumeDistance,
  dollyDistance,
  dollyY,
  dollyRange,
  dollyEase,
  actTwoCardFade,
  actTwoPose,
  sceneFar,
  fogRangeAt,
  actTwoFogRange,
  actTwoFocusDistance,
  actTwoTitleDistance,
  friezeHeightFill,
  actTwoTopClearFrac,
  maxRowsInFrame,
} from '../../src/utils/sceneMotion'
import { FRIEZE_CELL_W, FRIEZE_CELL_H } from '../../src/utils/friezeLayout'
import type { FriezeExtent } from '../../src/utils/friezeLayout'

/** tan(FOV/2), mirrored so the tests can project without importing internals. */
const HALF_FOV_TAN_T = Math.tan(((FOV_DEG * Math.PI) / 180) / 2)
import type { SceneGeometry } from '../../src/utils/sceneMotion'

/** The four viewports the geometry contract was worked against. */
const VIEWPORTS: ReadonlyArray<{ name: string; w: number; h: number }> = [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1920x1080', w: 1920, h: 1080 },
  { name: '1280x720', w: 1280, h: 720 },
  { name: '393x851 (phone)', w: 393, h: 851 },
]

describe('clamp', () => {
  it('bounds below / within / above', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
    expect(clamp(2, 0, 1)).toBe(1)
  })
})

describe('smoothstep', () => {
  it('pins endpoints and midpoint', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
  })
  it('has zero slope at both ends', () => {
    expect(smoothstep(0.001)).toBeLessThan(0.0001)
    expect(1 - smoothstep(0.999)).toBeLessThan(0.0001)
  })
})

describe('settleFrac', () => {
  it('holds settled across the first and last 15% of a segment', () => {
    expect(settleFrac(0)).toBe(0)
    expect(settleFrac(0.15)).toBe(0)
    expect(settleFrac(0.85)).toBe(1)
    expect(settleFrac(1)).toBe(1)
  })
  it('crosses the midpoint at the segment midpoint', () => {
    expect(settleFrac(0.5)).toBeCloseTo(0.5, 6)
  })
  it('is non-decreasing across the segment', () => {
    let prev = -Infinity
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const v = settleFrac(f)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = v
    }
  })
})

describe('playheadFor', () => {
  it('maps the scroll range onto the overture, the approach and one unit per card', () => {
    expect(playheadFor(0)).toBeCloseTo(OVERTURE_START, 10)
    expect(playheadFor(0)).toBeCloseTo(-1.5, 10)
    expect(playheadFor(1)).toBeCloseTo(3, 10)
  })
  it('reaches the approach after 100svh and card 0 after 150svh of the 550svh wrapper', () => {
    // 1 of 4.5 playhead units => p = 1/4.5 (0.2222); 1.5 of 4.5 => p = 0.3333
    expect(playheadFor(1 / 4.5)).toBeCloseTo(APPROACH_START, 10)
    expect(playheadFor(0.2222)).toBeCloseTo(-0.5, 3)
    expect(playheadFor(1.5 / 4.5)).toBeCloseTo(0, 10)
    expect(playheadFor(0.3333)).toBeCloseTo(0, 3)
  })
  it('clamps outside the scroll range', () => {
    expect(playheadFor(-1)).toBe(-1.5)
    expect(playheadFor(2)).toBe(3)
  })
})

describe('easedSeg', () => {
  it('is the identity at every settled integer playhead', () => {
    for (const seg of [0, 1, 2, 3]) expect(easedSeg(seg)).toBeCloseTo(seg, 10)
  })
  it('starts the corridor depth back at the overture and exactly one spacing back at the approach', () => {
    expect(easedSeg(OVERTURE_START)).toBeCloseTo(-CORRIDOR_DEPTH, 10)
    expect(easedSeg(APPROACH_START)).toBeCloseTo(-APPROACH_DEPTH, 9)
    expect(easedSeg(-0.5)).toBeCloseTo(-1, 9)
  })
  it('derives the corridor depth rather than tuning it', () => {
    expect(CORRIDOR_DEPTH).toBeCloseTo(APPROACH_DEPTH / (1 - smoothstep(2 / 3)), 12)
    expect(CORRIDOR_DEPTH).toBeCloseTo(3.857, 2)
  })
  it('is non-decreasing across the whole playhead range', () => {
    let prev = -Infinity
    for (let seg = -1.5; seg <= 3.0001; seg += 0.01) {
      const v = easedSeg(seg)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = v
    }
  })
  it('holds a settled plateau at least 0.3 wide around each interior card', () => {
    for (const k of [1, 2]) {
      expect(easedSeg(k - 0.15)).toBeCloseTo(k, 10)
      expect(easedSeg(k + 0.15)).toBeCloseTo(k, 10)
    }
  })
  it('is one continuous ease from the overture to card 0: still at both ends, moving at the approach', () => {
    const h = 0.001
    const slopeAtStart = (easedSeg(-1.5 + h) - easedSeg(-1.5)) / h
    const slopeAtSettle = (easedSeg(0) - easedSeg(-h)) / h
    const slopeAtApproach = (easedSeg(-0.5 + h) - easedSeg(-0.5 - h)) / (2 * h)
    expect(Math.abs(slopeAtStart)).toBeLessThan(0.02)
    expect(Math.abs(slopeAtSettle)).toBeLessThan(0.02)
    expect(slopeAtApproach).toBeGreaterThan(0.5)
  })
})

describe('overturePose', () => {
  it('holds the line solid until the fade window opens', () => {
    expect(overturePose(-1.5, false)).toEqual({ alpha: 1, visible: true })
    expect(overturePose(-0.85, false).alpha).toBeCloseTo(1, 10)
    expect(overturePose(-0.85, false).visible).toBe(true)
    expect(APPROACH_START - OVERTURE_FADE).toBeCloseTo(-0.85, 10)
  })
  it('is gone at the approach and stays gone', () => {
    expect(overturePose(-0.5, false)).toEqual({ alpha: 0, visible: false })
    expect(overturePose(0, false)).toEqual({ alpha: 0, visible: false })
    expect(overturePose(2.4, false)).toEqual({ alpha: 0, visible: false })
  })
  it('fades monotonically across the window', () => {
    let prev = Infinity
    for (let seg = -0.85; seg <= -0.5 + 1e-9; seg += 0.005) {
      const { alpha, visible } = overturePose(seg, false)
      expect(alpha).toBeLessThanOrEqual(prev + 1e-12)
      expect(alpha).toBeGreaterThanOrEqual(0)
      expect(visible).toBe(seg < -0.5)
      prev = alpha
    }
    expect(overturePose(-0.675, false).alpha).toBeCloseTo(0.5, 6)
  })
  it('is a step under reduced motion', () => {
    expect(overturePose(-1.5, true)).toEqual({ alpha: 1, visible: true })
    expect(overturePose(-0.6, true)).toEqual({ alpha: 1, visible: true })
    expect(overturePose(-0.5, true)).toEqual({ alpha: 0, visible: false })
    expect(overturePose(1, true)).toEqual({ alpha: 0, visible: false })
  })
})

describe('overture placement', () => {
  it('stands where the camera is at the start of the approach', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      expect(overtureZ(g), name).toBeCloseTo(g.D + g.spacing, 9)
      expect(overtureZ(g), name).toBeCloseTo(cameraPose(easedSeg(APPROACH_START), g).z, 9)
    }
  })
  it('fills 0.7 of the visible width at the top of the overture', () => {
    const g = sceneGeometry(1440, 900)
    const halfFovTan = Math.tan((FOV_DEG * Math.PI) / 360)
    const d = (easedSeg(APPROACH_START) - easedSeg(OVERTURE_START)) * g.spacing
    expect(d).toBeCloseTo((CORRIDOR_DEPTH - 1) * g.spacing, 9)
    const visibleWidth = 2 * d * halfFovTan * g.aspect
    expect(overtureWidth(g) / visibleWidth).toBeCloseTo(0.7, 9)
  })
})

describe('segmentFor', () => {
  it('parks on the first segment through the approach', () => {
    expect(segmentFor(-0.5, CARD_COUNT)).toEqual({ index: 0, frac: 0 })
    expect(segmentFor(0, CARD_COUNT)).toEqual({ index: 0, frac: 0 })
  })
  it('splits a playhead into the segment it is crossing', () => {
    expect(segmentFor(1.5, CARD_COUNT)).toEqual({ index: 1, frac: 0.5 })
  })
  it('holds the last segment fully crossed at the end of the playhead', () => {
    expect(segmentFor(3, CARD_COUNT)).toEqual({ index: 2, frac: 1 })
  })
  it('degenerates safely for a single card', () => {
    expect(segmentFor(0.7, 1)).toEqual({ index: 0, frac: 0 })
  })
})

describe('frontIndexFor', () => {
  it('flips exactly once per segment, at the settle midpoint', () => {
    expect(frontIndexFor(0.49, CARD_COUNT, false)).toBe(0)
    expect(frontIndexFor(0.5, CARD_COUNT, false)).toBe(1)
    expect(frontIndexFor(1.49, CARD_COUNT, false)).toBe(1)
    expect(frontIndexFor(1.5, CARD_COUNT, false)).toBe(2)
  })
  it('names card 0 through the approach and card 3 at the end', () => {
    expect(frontIndexFor(-0.5, CARD_COUNT, false)).toBe(0)
    expect(frontIndexFor(3, CARD_COUNT, false)).toBe(3)
  })
  it('changes at most once across a segment', () => {
    const seen: number[] = []
    for (let seg = 0; seg <= 1.0001; seg += 0.005) {
      const v = frontIndexFor(seg, CARD_COUNT, false)
      if (seen[seen.length - 1] !== v) seen.push(v)
    }
    expect(seen).toEqual([0, 1])
  })
  it('snaps to the nearest card under reduced motion', () => {
    expect(frontIndexFor(0.4, CARD_COUNT, true)).toBe(0)
    expect(frontIndexFor(0.6, CARD_COUNT, true)).toBe(1)
    expect(frontIndexFor(-0.5, CARD_COUNT, true)).toBe(0)
    expect(frontIndexFor(3, CARD_COUNT, true)).toBe(3)
  })
})

describe('card constants', () => {
  it('carries the Shadway card aspect', () => {
    expect(CARD_COUNT).toBe(4)
    expect(CARD_H).toBeCloseTo(448 / 620, 10)
  })
})

/** True when the caption legibility floor, not a cap, decided the card size. */
function floorBinds(g: SceneGeometry): boolean {
  return Math.abs(g.fraction - CARD_MIN_PX / g.widthPx) < 1e-9
}

/** Every geometry at one width, aspect 0.4 to 2.4 in 0.005 steps. */
function sweepAspect(widthPx: number): SceneGeometry[] {
  const from = 0.4
  const step = 0.005
  const steps = Math.round((2.4 - from) / step)
  const out: SceneGeometry[] = []
  for (let i = 0; i <= steps; i++) {
    const aspect = from + i * step
    out.push(sceneGeometry(widthPx, widthPx / aspect))
  }
  return out
}

/** The largest change in `read` between consecutive samples, and where. */
function widestStep(
  swept: readonly SceneGeometry[],
  read: (g: SceneGeometry) => number,
): { delta: number; at: number } {
  let worst = { delta: 0, at: swept[0].aspect }
  for (let i = 1; i < swept.length; i++) {
    const delta = Math.abs(read(swept[i]) - read(swept[i - 1]))
    if (delta > worst.delta) worst = { delta, at: swept[i].aspect }
  }
  return worst
}

describe('sceneGeometry', () => {
  it('sizes the card against the frame at each worked viewport', () => {
    // 620px cap at 1440; the half-frame-height cap at 1920; the cap again at
    // 1280; a phone gets a fixed 88vw card.
    expect(sceneGeometry(1440, 900).fraction).toBeCloseTo(0.4306, 3)
    expect(sceneGeometry(1920, 1080).fraction).toBeCloseTo(0.3229, 3)
    expect(sceneGeometry(1280, 720).fraction).toBeCloseTo(0.3892, 3)
    expect(sceneGeometry(393, 851).fraction).toBeCloseTo(0.88, 10)
  })

  it('never lets the card exceed half the frame height', () => {
    // Both orientations of every worked viewport, plus the sizes that sit a
    // pixel either side of square and the tablets the 620 px cap governs.
    const pairs: ReadonlyArray<[number, number]> = [
      ...VIEWPORTS.map(({ w, h }) => [w, h] as [number, number]),
      [600, 601], [640, 641], [820, 821], [960, 961], [1023, 1024],
      [705, 1000], [768, 1024], [820, 1180],
    ]
    for (const [a, b] of pairs) {
      for (const [w, h] of [[a, b], [b, a]] as Array<[number, number]>) {
        const g = sceneGeometry(w, h)
        // The caption legibility floor is the only thing allowed to break it.
        if (floorBinds(g)) continue
        expect(g.fraction * g.aspect * CARD_H, `${w}x${h}`).toBeLessThanOrEqual(0.5 + 1e-9)
      }
    }
    // …and it does bind somewhere, so the exemption cannot silently swallow
    // the whole loop. Inside the loop it fires for 851x393 alone.
    expect(floorBinds(sceneGeometry(844, 390))).toBe(true)
    expect(floorBinds(sceneGeometry(320, 568))).toBe(true)
  })

  it('anchors both ends of the crossover band', () => {
    const phone = sceneGeometry(393, 852)
    expect(phone.fraction).toBeCloseTo(0.88, 10)
    expect(phone.camY).toBeCloseTo(CARD_Y + 1.0 * CARD_H, 6)
    const desktop = sceneGeometry(1440, 900)
    expect(desktop.fraction).toBeCloseTo(0.4306, 3)
    expect(desktop.camY).toBeCloseTo(CARD_Y + 0.61 * CARD_H, 6)
    // A retune of the band may not swallow either anchor: both must stay on
    // their own side of it, or the numbers above stop meaning what they say.
    expect(CROSSOVER_START).toBeLessThan(1)
    expect(CROSSOVER_END).toBeGreaterThan(1)
    expect(phone.aspect).toBeLessThanOrEqual(CROSSOVER_START)
    expect(desktop.aspect).toBeGreaterThanOrEqual(CROSSOVER_END)
  })

  // Nothing the frame shows may step as aspect crosses square. The bounds are
  // about double the smooth formula's steepest slope over one 0.005 step
  // (measured 2026-09-08 at band 0.85 to 1.05: card 3.4 px, D 0.10, camY
  // 0.0106, lateral 0.0033, titleCapPx 0.600 · so 1.9x and 1.67x of the
  // bounds, not the 2x the original 0.40-wide band had). `titleWidthCap` and `titleClearance` are deliberately
  // absent: they step by design (spec decision 3).
  describe.each([390, 600, 820, 960, 1280])('continuity at %i px wide', (w) => {
    const swept = sweepAspect(w)
    const metrics: ReadonlyArray<[string, (g: SceneGeometry) => number, number]> = [
      ['the card width in px', (g) => g.fraction * g.widthPx, 8],
      ['the camera distance D', (g) => g.D, 0.25],
      ['the camera height', (g) => g.camY, 0.02 * CARD_W],
      ['the lateral offset', (g) => g.lateral, 0.01 * CARD_W],
      ['the title cap height', (g) => g.titleCapPx, 1],
    ]
    it.each(metrics)('%s never steps through square', (label, read, bound) => {
      const worst = widestStep(swept, read)
      expect(
        worst.delta,
        `${label} jumps ${worst.delta.toFixed(4)} at aspect ${worst.at.toFixed(3)}, ${w} px wide`,
      ).toBeLessThanOrEqual(bound)
    })
  })

  it('spaces the corridor at 1.15 camera distances', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      expect(g.spacing, name).toBeCloseTo(1.15 * g.D, 10)
    }
  })

  it('bounds the phone lateral offset so an 88vw card stays in frame', () => {
    const g = sceneGeometry(393, 851)
    expect(g.lateral).toBeLessThanOrEqual(0.9 * (0.5 / 0.88 - 0.5) * CARD_W + 1e-12)
    expect(g.lateral).toBeGreaterThan(0)
  })

  it('lifts the camera above the card centre, higher on a phone', () => {
    const desktop = sceneGeometry(1440, 900)
    const phone = sceneGeometry(393, 851)
    expect(desktop.camY).toBeGreaterThan(CARD_Y)
    expect(phone.camY).toBeGreaterThan(desktop.camY)
  })

  it('puts the title a quarter spacing beyond the slot and clamps its cap height', () => {
    const g = sceneGeometry(1440, 900)
    expect(g.titleDistance).toBeCloseTo(g.D + 0.25 * g.spacing, 10)
    // Portrait floors much higher: 9% of a phone's width is 35px, so the
    // floor is what decides the title there, and 56 read too small
    // against the card (0.14 of it, against the desktop's 0.167).
    expect(sceneGeometry(393, 851).titleCapPx).toBe(72)
    expect(sceneGeometry(600, 400).titleCapPx).toBe(56)
    expect(sceneGeometry(1920, 1080).titleCapPx).toBe(150)
    expect(sceneGeometry(1440, 900).titleCapPx).toBeCloseTo(129.6, 6)
  })

  it('honours the 620 px design cap in PORTRAIT too, not just landscape', () => {
    // Regression: the portrait branch was a flat 0.88 of the width, so
    // CARD_MAX_PX's own contract ("never wider than this, whatever the
    // viewport") was false past ~705 px. An 820x1180 tablet drew a 722 px card
    // and 1023x1024 drew 900 px, and dragging a desktop window through square
    // nearly doubled the card.
    for (const [w, h] of [[705, 1000], [768, 1024], [820, 1180], [1023, 1024]]) {
      const g = sceneGeometry(w, h)
      expect(g.fraction * w, `${w}x${h}`).toBeLessThanOrEqual(CARD_MAX_PX + 1e-9)
    }
    // Phones are untouched: 620/390 is far above 0.88, so the cap never binds.
    expect(sceneGeometry(390, 844).fraction).toBeCloseTo(0.88, 10)
    expect(sceneGeometry(430, 932).fraction).toBeCloseTo(0.88, 10)
  })

  it('never lets the caption name fall under 12 px: the card is at least 287 px wide', () => {
    expect(CARD_MIN_PX).toBe(Math.ceil((620 * CAPTION_MIN_NAME_PX) / CAPTION_NAME_PX))
    expect(CARD_MIN_PX).toBe(287)
    const sizes: Array<[number, number]> = [
      [320, 568], [390, 844], [844, 390], [1024, 768], [1440, 900],
    ]
    for (const [a, b] of sizes) {
      for (const [w, h] of [[a, b], [b, a]] as Array<[number, number]>) {
        const g = sceneGeometry(w, h)
        const name = `${w}x${h}`
        expect(g.fraction * g.widthPx, name).toBeGreaterThanOrEqual(CARD_MIN_PX - 1e-9)
        expect(g.fraction, name).toBeLessThanOrEqual(0.92)
        // The offset card must stay inside the frame at the slot.
        expect(g.lateral + CARD_W / 2, name).toBeLessThanOrEqual(CARD_W / (2 * g.fraction) + 1e-9)
      }
    }
    // The rule binds on a landscape phone and on 320 px portrait, nowhere else here.
    expect(sceneGeometry(844, 390).fraction).toBeCloseTo(287 / 844, 10)
    expect(sceneGeometry(320, 568).fraction).toBeCloseTo(287 / 320, 10)
    expect(sceneGeometry(390, 844).fraction).toBeCloseTo(0.88, 10)
  })

  it('keeps the whole corridor inside the far plane', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      expect(g.far, name).toBeGreaterThan(g.D + (CARD_COUNT - 1) * g.spacing)
      expect(g.near, name).toBeGreaterThan(0)
    }
  })
})

describe('cameraPose', () => {
  it('travels one spacing per card, strictly forward', () => {
    const g = sceneGeometry(1440, 900)
    expect(cameraPose(0, g).z).toBeCloseTo(g.D, 10)
    expect(cameraPose(1, g).z).toBeCloseTo(g.D - g.spacing, 10)
    let prev = Infinity
    for (let e = -1; e <= 3.0001; e += 0.05) {
      const z = cameraPose(e, g).z
      expect(z).toBeLessThan(prev)
      prev = z
    }
  })
  it('stays on the corridor axis and pitches down', () => {
    const cam = cameraPose(0, sceneGeometry(1440, 900))
    expect(cam.x).toBe(0)
    expect(cam.y).toBeCloseTo(sceneGeometry(1440, 900).camY, 10)
    expect(cam.pitch).toBeLessThan(0)
    expect(cam.pitch).toBeCloseTo((-8 * Math.PI) / 180, 10)
  })
})

describe('cardPose', () => {
  const g = sceneGeometry(1440, 900)

  it('alternates the lateral offset and yaws each card back toward the axis', () => {
    expect(cardPose(0, 0, g).x).toBeCloseTo(-g.lateral, 10)
    expect(cardPose(1, 0, g).x).toBeCloseTo(g.lateral, 10)
    expect(cardPose(2, 0, g).x).toBeCloseTo(-g.lateral, 10)
    expect(Math.sign(cardPose(0, 0, g).yaw)).toBe(-Math.sign(cardPose(1, 0, g).yaw))
  })

  it('places card i one spacing deeper, hovering above the floor', () => {
    for (let i = 0; i < CARD_COUNT; i++) {
      const pose = cardPose(i, 0, g)
      expect(pose.z).toBeCloseTo(-i * g.spacing, 10)
      expect(pose.y).toBeCloseTo(CARD_Y, 10)
      expect(pose.y - CARD_H / 2).toBeGreaterThan(0)
    }
  })

  it('holds full opacity until the pass-through fade, then clears the lens', () => {
    expect(cardPose(0, PASS_FADE_START, g).opacity).toBeCloseTo(1, 10)
    expect(cardPose(0, 0, g).opacity).toBeCloseTo(1, 10)
    expect(cardPose(0, PASS_FADE_END, g).opacity).toBeCloseTo(0, 10)
    expect(cardPose(0, 0.9, g).visible).toBe(false)
    expect(cardPose(0, PASS_FADE_START, g).visible).toBe(true)
  })

  it('fades continuously across the pass-through window', () => {
    const mid = (PASS_FADE_START + PASS_FADE_END) / 2
    expect(cardPose(0, mid, g).opacity).toBeCloseTo(0.5, 6)
    let prev = 1.0000001
    for (let rel = PASS_FADE_START; rel <= PASS_FADE_END + 1e-9; rel += 0.005) {
      const o = cardPose(0, rel, g).opacity
      expect(o).toBeLessThanOrEqual(prev)
      prev = o
    }
  })

  it('leaves cards still ahead of the camera fully opaque', () => {
    expect(cardPose(3, 0, g).opacity).toBeCloseTo(1, 10)
    expect(cardPose(3, 0, g).visible).toBe(true)
  })
})

describe('projectPoint', () => {
  const g = sceneGeometry(1440, 900)
  const cam = cameraPose(0, g)

  it('puts a point on the camera axis at camera height above centre (pitched down)', () => {
    const p = projectPoint(0, g.camY, -g.D, cam, g)
    expect(p.fx).toBeCloseTo(0.5, 10)
    expect(p.fy).toBeLessThan(0.5)
    expect(p.ahead).toBeGreaterThan(0)
  })

  it('maps a lower world point further down the frame', () => {
    const high = projectPoint(0, g.camY, -g.D, cam, g)
    const low = projectPoint(0, 0, -g.D, cam, g)
    expect(low.fy).toBeGreaterThan(high.fy)
  })

  it('mirrors x about the frame centre', () => {
    const left = projectPoint(-0.3, CARD_Y, 0, cam, g)
    const right = projectPoint(0.3, CARD_Y, 0, cam, g)
    expect(left.fx + right.fx).toBeCloseTo(1, 10)
  })

  it('reports points behind the camera as not ahead', () => {
    expect(projectPoint(0, g.camY, g.D + 1, cam, g).ahead).toBeLessThan(0)
  })
})

describe('frameRects (settled card 0 under the title)', () => {
  it('keeps the title band clear of the card at every worked viewport', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const { card, title } = frameRects(sceneGeometry(w, h))
      expect(title.bottom, `${name} title/card gap`).toBeLessThan(card.top - 0.01)
    }
  })

  it('keeps the card and its floor contact inside the frame', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const { card, floorContactY } = frameRects(sceneGeometry(w, h))
      expect(card.bottom, `${name} card bottom`).toBeLessThanOrEqual(0.95)
      expect(floorContactY, `${name} floor contact`).toBeLessThanOrEqual(1)
      expect(floorContactY, `${name} contact below card`).toBeGreaterThan(card.bottom)
      expect(card.left, `${name} card left`).toBeGreaterThanOrEqual(0.005)
      expect(card.right, `${name} card right`).toBeLessThanOrEqual(0.995)
      expect(card.right, `${name} card ordering`).toBeGreaterThan(card.left)
      expect(card.bottom, `${name} card ordering`).toBeGreaterThan(card.top)
    }
    // Near-square, both sides. The band decides how high the camera sits here,
    // and too high pushes the card's blob shadow out through the bottom edge.
    // A local list on purpose: VIEWPORTS feeds six other tests.
    for (const [w, h] of [[820, 821], [960, 950]] as Array<[number, number]>) {
      const { card, floorContactY } = frameRects(sceneGeometry(w, h))
      expect(card.bottom, `${w}x${h} card bottom`).toBeLessThanOrEqual(0.95)
      expect(floorContactY, `${w}x${h} floor contact`).toBeLessThanOrEqual(1)
    }
    // …and the picture the band was actually tuned to. Containment alone does
    // NOT lock it: at CROSSOVER_END 1.15 both fixtures above stay green while
    // 820x821 goes back to contact 0.998, the shadow on the bottom edge. The
    // ratified target is that near-square sits where a landscape tablet sits,
    // because the card is the same half-frame height in both.
    const nearSquareTop = frameRects(sceneGeometry(820, 821)).card.top
    const landscapeTop = frameRects(sceneGeometry(1180, 820)).card.top
    expect(
      Math.abs(nearSquareTop - landscapeTop),
      'near-square card sits where the landscape one does',
    ).toBeLessThanOrEqual(0.05)
  })

  it('centres the title band on the upper-third mark', () => {
    const { title } = frameRects(sceneGeometry(1440, 900))
    expect((title.top + title.bottom) / 2).toBeCloseTo(0.24, 10)
  })
})

describe('titleBand', () => {
  it('starts 16 px under the nav and stops a clearance above the card', () => {
    const band = titleBand(0.42, 66, 900, 0.03)
    expect(band.top).toBeCloseTo(82 / 900, 10)
    expect(band.top).toBeCloseTo(0.0911, 4)
    expect(band.bottom).toBeCloseTo(0.39, 10)
  })
  it('caps the title at 0.8 of the frame width, 0.94 in portrait', () => {
    expect(TITLE_WIDTH_CAP).toBe(0.8)
    expect(TITLE_WIDTH_CAP_PORTRAIT).toBe(0.94)
    expect(sceneGeometry(1440, 900).titleWidthCap).toBe(TITLE_WIDTH_CAP)
    expect(sceneGeometry(390, 844).titleWidthCap).toBe(TITLE_WIDTH_CAP_PORTRAIT)
  })
  it('gives the portrait title far more air above the card', () => {
    expect(sceneGeometry(1440, 900).titleClearance).toBe(TITLE_CLEARANCE)
    expect(sceneGeometry(390, 844).titleClearance).toBe(TITLE_CLEARANCE_PORTRAIT)
    expect(TITLE_CLEARANCE_PORTRAIT).toBeGreaterThan(TITLE_CLEARANCE)
  })
})

describe('titleWrapAllowancePx', () => {
  // Regression: a phone reached by resizing DOWN from a desktop width rendered
  // "painel da reconstrução" on ONE line at fit 0.531 (cap 33 px) where a fresh
  // load gave two lines at 0.899 (cap 56 px) — the same viewport with two
  // stable answers. The wrap is measured at an em that scales with the fit, so
  // the allowance has to scale with it too or the two disagree.
  it('scales linearly with the drawn fit, so the line count cannot depend on it', () => {
    const g = sceneGeometry(390, 844)
    const full = titleWrapAllowancePx(g, 1.5, 1)
    expect(titleWrapAllowancePx(g, 1.5, 0.5)).toBeCloseTo(full * 0.5, 10)
    expect(titleWrapAllowancePx(g, 1.5, 0.899)).toBeCloseTo(full * 0.899, 10)
    // The em the lines are measured at scales the same way, so the ratio the
    // wrap actually compares is invariant.
    const ratio = (scale: number) =>
      titleWrapAllowancePx(g, 1.5, scale) / (g.titleCapPx * 1.5 * scale)
    expect(ratio(1)).toBeCloseTo(ratio(0.531), 10)
    expect(ratio(1)).toBeCloseTo(ratio(0.899), 10)
  })

  it('is the whole frame, NOT the width cap', () => {
    // Capping here as well makes every desktop title wrap; the shared band
    // shrink then drags all four down (cap/card 0.167 → 0.131 at 1440). The
    // width cap governs the RENDERED size, through the rig's fit — not the wrap.
    const g = sceneGeometry(1440, 900)
    expect(titleWrapAllowancePx(g, 1.5, 1)).toBeCloseTo(1440 * 1.5, 10)
    expect(titleWrapAllowancePx(g, 1.5, 1)).toBeGreaterThan(
      g.titleWidthCap * g.widthPx * 1.5,
    )
  })

  it('tracks dpr, so the wrap is identical in CSS px at any device ratio', () => {
    const g = sceneGeometry(390, 844)
    expect(titleWrapAllowancePx(g, 2, 1)).toBeCloseTo(2 * titleWrapAllowancePx(g, 1, 1), 10)
  })
})

describe('scrollTargetFor', () => {
  it('round-trips through playheadFor to exactly the settled card', () => {
    const wrapperTop = 1234
    const wrapperHeight = 5.5 * 900
    const viewportHeight = 900
    for (let index = 0; index < CARD_COUNT; index++) {
      const target = scrollTargetFor(index, wrapperTop, wrapperHeight, viewportHeight)
      const progress = (target - wrapperTop) / (wrapperHeight - viewportHeight)
      expect(playheadFor(progress)).toBeCloseTo(index, 9)
    }
    expect(scrollTargetFor(0, wrapperTop, wrapperHeight, viewportHeight)).toBeCloseTo(
      wrapperTop + (1.5 / 4.5) * (wrapperHeight - viewportHeight),
      9,
    )
  })
})

describe('settledness', () => {
  it('is fully settled on the plateau and fully released mid-transition', () => {
    expect(settledness(1, false)).toBe(1)
    expect(settledness(1.15, false)).toBeCloseTo(1, 10)
    expect(settledness(1.25, false)).toBeCloseTo(0, 10)
    expect(settledness(1.5, false)).toBeCloseTo(0, 10)
    expect(settledness(0.85, false)).toBeCloseTo(1, 10)
  })
  it('falls off smoothly between the two', () => {
    expect(settledness(1.2, false)).toBeCloseTo(0.5, 6)
  })
  it('is always settled under reduced motion', () => {
    for (const seg of [-0.5, 0.5, 1.2, 2.7, 3]) expect(settledness(seg, true)).toBe(1)
  })
})

describe('focusDistance', () => {
  it('focuses on the slot', () => {
    const g = sceneGeometry(1440, 900)
    expect(focusDistance(g)).toBe(g.D)
  })
})

describe('seamFor / seamBlend', () => {
  // A pair of titles whose canvases span 70% of the plane, centred; a 1.2 em
  // seam on a ~7.4 em plane is about 0.16 of it.
  const half = 0.35
  const width = 0.16
  const xs = Array.from({ length: 29 }, (_, i) => 0.5 - half + (i / 28) * 2 * half)

  it('carries the approved knobs', () => {
    expect(SEAM_WIDTH_EM).toBe(1.2)
    expect(SEAM_SIGMA_EM).toBe(0.1)
    expect(SEAM_POWER).toBe(0.5)
  })

  it('stands entirely left of the ink at f 0 and entirely right of it at f 1', () => {
    const start = seamFor(0, half, width)
    const end = seamFor(1, half, width)
    expect(start.front + width / 2).toBeLessThanOrEqual(0.5 - half + 1e-12)
    expect(end.front - width / 2).toBeGreaterThanOrEqual(0.5 + half - 1e-12)
    expect(start.width).toBe(width)
  })

  it('is not travelling on the plateaus, where every column is 0 or 1', () => {
    for (const f of [0, 0.05, 0.15]) {
      const seam = seamFor(f, half, width)
      expect(seam.travelling).toBe(false)
      for (const x of xs) expect(seamBlend(x, seam)).toBe(0)
    }
    for (const f of [0.85, 0.95, 1]) {
      const seam = seamFor(f, half, width)
      expect(seam.travelling).toBe(false)
      for (const x of xs) expect(seamBlend(x, seam)).toBe(1)
    }
    expect(seamFor(0.5, half, width).travelling).toBe(true)
  })

  it('writes the incoming name in reading order: blend falls with x and rises with f', () => {
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const seam = seamFor(f, half, width)
      let prev = Infinity
      for (const x of xs) {
        const t = seamBlend(x, seam)
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThanOrEqual(1)
        expect(t).toBeLessThanOrEqual(prev + 1e-12)
        prev = t
      }
    }
    for (const x of xs) {
      let prev = -Infinity
      for (let f = 0; f <= 1.0001; f += 0.01) {
        const t = seamBlend(x, seamFor(f, half, width))
        expect(t).toBeGreaterThanOrEqual(prev - 1e-12)
        prev = t
      }
    }
  })

  it('crosses the centre column exactly at the segment midpoint', () => {
    expect(seamFor(0.5, half, width).front).toBeCloseTo(0.5, 10)
    expect(seamBlend(0.5, seamFor(0.5, half, width))).toBeCloseTo(0.5, 10)
  })

  it('reverses exactly: the mirrored scrub gives the mirrored frame, and no call depends on the last', () => {
    for (let f = 0; f <= 1.0001; f += 0.05) {
      for (const x of xs) {
        const forward = seamBlend(x, seamFor(f, half, width))
        const back = seamBlend(1 - x, seamFor(1 - f, half, width))
        expect(forward + back).toBeCloseTo(1, 10)
      }
    }
    const a = seamFor(0.37, half, width)
    seamFor(0.9, half, width)
    seamFor(0.1, half, width)
    expect(seamFor(0.37, half, width)).toEqual(a)
  })
})

describe('ambientOffset', () => {
  const PERIOD = (i: number) => 4 + 0.75 * i

  /** Mean of f over [0, period], trapezoid on a fine grid. */
  const meanOver = (period: number, f: (t: number) => number): number => {
    const steps = 4000
    let sum = 0
    for (let k = 0; k < steps; k++) sum += f((k + 0.5) * (period / steps))
    return sum / steps
  }

  it('drifts around the resting pose, never away from it', () => {
    for (let i = 0; i < CARD_COUNT; i++) {
      const T = PERIOD(i)
      expect(meanOver(T, (t) => ambientOffset(i, t, 0).y), `card ${i} y`).toBeCloseTo(0, 3)
      expect(
        meanOver(1.3 * T, (t) => ambientOffset(i, t, 0).yaw),
        `card ${i} yaw`,
      ).toBeCloseTo(0, 3)
      expect(
        meanOver(0.8 * T, (t) => ambientOffset(i, t, 0).pitch),
        `card ${i} pitch`,
      ).toBeCloseTo(0, 3)
    }
  })

  it('breathes within about 1% of the card height and 1.5 degrees', () => {
    const maxDeg = 1.5 * (Math.PI / 180)
    for (let i = 0; i < CARD_COUNT; i++) {
      for (let t = 0; t < 20; t += 0.05) {
        const a = ambientOffset(i, t, 0)
        expect(Math.abs(a.y)).toBeLessThanOrEqual(0.01 * CARD_H + 1e-12)
        expect(Math.abs(a.yaw)).toBeLessThanOrEqual(maxDeg + 1e-12)
        expect(Math.abs(a.pitch)).toBeLessThanOrEqual(maxDeg + 1e-12)
      }
    }
  })

  it('gives each card its own period and phase, so they never breathe in unison', () => {
    const t = 1.234
    const a0 = ambientOffset(0, t, 0)
    const a1 = ambientOffset(1, t, 0)
    expect(a0.y).not.toBeCloseTo(a1.y, 4)
  })

  it('doubles the motion amplitudes at full energy', () => {
    for (const t of [0.3, 1.1, 2.7]) {
      const calm = ambientOffset(1, t, 0)
      const lively = ambientOffset(1, t, 1)
      expect(lively.y).toBeCloseTo(calm.y * 2, 10)
      expect(lively.yaw).toBeCloseTo(calm.yaw * 2, 10)
      expect(lively.pitch).toBeCloseTo(calm.pitch * 2, 10)
    }
  })
})

describe('velocityEnergy', () => {
  it('stays inside [0,1] whatever the velocity', () => {
    for (const v of [-50, -1.2, 0, 0.4, 1.2, 50]) {
      expect(velocityEnergy(0, v, 1 / 60)).toBeGreaterThanOrEqual(0)
      expect(velocityEnergy(1, v, 1 / 60)).toBeLessThanOrEqual(1)
    }
  })

  it('ignores the direction of travel', () => {
    expect(velocityEnergy(0, 0.8, 1 / 60)).toBeCloseTo(velocityEnergy(0, -0.8, 1 / 60), 12)
  })

  it('rises faster than it falls', () => {
    const dt = 1 / 60
    const rise = velocityEnergy(0, 2, dt) - 0
    const fall = 1 - velocityEnergy(1, 0, dt)
    expect(rise).toBeGreaterThan(fall)
  })

  it('settles back to still within two seconds of the flick', () => {
    let e = 1
    for (let k = 0; k < 120; k++) e = velocityEnergy(e, 0, 1 / 60)
    expect(e).toBeLessThan(0.05)
  })

  it('reaches full energy on a fast flick', () => {
    let e = 0
    for (let k = 0; k < 60; k++) e = velocityEnergy(e, 3, 1 / 60)
    expect(e).toBeGreaterThan(0.95)
  })
})

describe('velocityYaw', () => {
  it('leans the corridor against the direction of travel', () => {
    const e = 1
    expect(velocityYaw(e, 2)).toBeCloseTo(-velocityYaw(e, -2), 12)
    expect(velocityYaw(e, 2)).not.toBe(0)
  })
  it('reaches at most 4 degrees, and nothing at rest', () => {
    expect(Math.abs(velocityYaw(1, 5))).toBeCloseTo(4 * (Math.PI / 180), 12)
    expect(velocityYaw(0, 5)).toBe(0)
    expect(velocityYaw(1, 0)).toBe(0)
  })
})

describe('fogRange', () => {
  const g = sceneGeometry(1440, 900)

  it('always opens before it closes', () => {
    for (let t = 0; t < 18; t += 0.25) {
      const { near, far } = fogRange(g, t)
      expect(near).toBeLessThan(far)
      expect(near).toBeGreaterThan(0)
    }
  })

  it('leaves card 0 well into the fog at the top of the approach', () => {
    const { near, far } = fogRange(g, 0)
    const dist = g.D + APPROACH_DEPTH * g.spacing
    expect((dist - near) / (far - near)).toBeGreaterThanOrEqual(0.35)
  })

  it('holds the settled slot clear of the fog', () => {
    const { near } = fogRange(g, 0)
    expect(g.D).toBeLessThan(near)
  })

  it('drifts within a few percent on the ambient clock', () => {
    const base = fogRange(g, 0).near
    for (let t = 0; t < 18; t += 0.25) {
      const ratio = fogRange(g, t).near / base
      expect(ratio).toBeGreaterThan(0.97 - 1e-9)
      expect(ratio).toBeLessThan(1.03 + 1e-9)
    }
  })
})

describe('act two · scroll', () => {
  it('budgets 100 svh of release, 50 of approach and 25 per column', () => {
    expect(ACT_TWO_RELEASE_SVH).toBe(100)
    expect(ACT_TWO_APPROACH_SVH).toBe(50)
    expect(ACT_TWO_SVH_PER_COLUMN).toBe(25)
    expect(ACT_ONE_SVH).toBe(550)
    expect(ACT_TWO_START).toBe(CARD_COUNT - 1)
    expect(actTwoSvh(22)).toBe(700)
    expect(actTwoSvh(26)).toBe(800)
  })

  it('sizes the wrapper from the column count', () => {
    // The shipped extent: the one the running site depends on.
    expect(sceneWrapperSvh(26)).toBe(1350)
    // The fictional fixture the spec works through.
    expect(sceneWrapperSvh(22)).toBe(1250)
    // No frieze, no act two: today's wrapper exactly.
    expect(actTwoSvh(0)).toBe(0)
    expect(sceneWrapperSvh(0)).toBe(550)
    expect(actTwoSvh(-3)).toBe(0)
  })

  it('never divides by a zero act-two budget when scroll overshoots', () => {
    // Lenis overscroll and an iOS rubber-band both hand `progress > 1`.
    for (const p of [1.4, 2, 12]) {
      expect(playheadFor(p, 0)).toBe(3)
      expect(Number.isFinite(playheadFor(p, 0))).toBe(true)
      expect(playheadFor(p)).toBe(3)
    }
  })

  it('places the beats where the svh budget puts them', () => {
    const fixture = actTwoBeats(22)
    expect(fixture.release).toBeCloseTo(1 / 7, 12)
    expect(fixture.approach).toBeCloseTo(3 / 14, 12)
    const shipped = actTwoBeats(26)
    expect(shipped.release).toBeCloseTo(0.125, 12)
    expect(shipped.approach).toBeCloseTo(0.1875, 12)
  })

  it('reproduces act one exactly over the same scrub pixels', () => {
    // `p_22 = p · 450 / 1150` puts the same scroll distance under act one.
    for (let i = 0; i <= 100; i++) {
      const p = i / 100
      expect(playheadFor((p * 450) / 1150, 22)).toBeCloseTo(playheadFor(p), 12)
    }
    expect(playheadFor(450 / 1150, 22)).toBe(3)
    expect(playheadFor(1, 22)).toBe(4)
    expect(playheadFor((450 + 350) / 1150, 22)).toBe(3.5)
  })

  it('is non-decreasing across the whole wrapper', () => {
    let prev = -Infinity
    for (let i = 0; i <= 1000; i++) {
      const value = playheadFor(i / 1000, 22)
      expect(value).toBeGreaterThanOrEqual(prev)
      prev = value
    }
    expect(prev).toBe(4)
  })

  it('splits a playhead into its act-one segment and its act-two progress', () => {
    expect(actTwoProgress(3)).toBe(0)
    expect(actTwoProgress(4)).toBe(1)
    expect(actTwoProgress(2)).toBe(0)
    expect(actTwoProgress(3.25)).toBeCloseTo(0.25, 12)
    expect(actOneSeg(3.7)).toBe(3)
    expect(actOneSeg(1.2)).toBe(1.2)
    expect(actTwoPlayhead(0)).toBe(3)
    expect(actTwoPlayhead(1)).toBe(4)
    expect(actTwoPlayhead(0.5)).toBe(3.5)
  })

  it('round-trips every playhead through its scroll target', () => {
    const vh = 900
    const top = 1234
    const H = 12.5 * vh
    for (const P of [-1.5, -0.5, 0, 1, 3, 3.1, 3.5, 4]) {
      const target = scrollTargetFor(P, top, H, vh, 22)
      expect(playheadFor((target - top) / (H - vh), 22)).toBeCloseTo(P, 10)
    }
  })

  it('keeps the four-argument scroll target byte-identical', () => {
    const vh = 900
    const H = 5.5 * vh
    for (const P of [-1.5, 0, 1, 2, 3]) {
      expect(scrollTargetFor(P, 1234, H, vh, 0)).toBe(scrollTargetFor(P, 1234, H, vh))
    }
  })

  it('lands the nav link on the volume shot', () => {
    expect(volumeShotPlayhead(22)).toBeCloseTo(3 + 1 / 7, 12)
    expect(volumeShotPlayhead(26)).toBeCloseTo(3.125, 12)
  })
})

/**
 * FICTIONAL, on purpose: 22 columns is not today's data and never will be. It
 * exists to make the spec's worked `sceneWrapperSvh(22) = 1250` exact and to
 * give the pose maths a second, differently shaped extent — including a
 * one-column block at the newest edge, which is where the title windows are
 * tightest. What SHIPS is `SHIPPED_FRIEZE` below.
 */
const FIXTURE_FRIEZE: FriezeExtent = {
  columns: 22,
  rows: 8,
  blocks: [
    { year: 2026, startCol: 0, columns: 1 },
    { year: 2025, startCol: 1, columns: 6 },
    { year: 2024, startCol: 7, columns: 13 },
    { year: 2023, startCol: 20, columns: 2 },
  ],
}

/** Today's archive through `provisionalFriezeExtent`: what the running site has. */
const SHIPPED_FRIEZE: FriezeExtent = {
  columns: 26,
  rows: 8,
  blocks: [
    { year: 2026, startCol: 0, columns: 2 },
    { year: 2025, startCol: 2, columns: 7 },
    { year: 2024, startCol: 9, columns: 16 },
    { year: 2023, startCol: 25, columns: 1 },
  ],
}

/** Narrower than the frame at the dolly distance: the degenerate range. */
const NARROW_FRIEZE: FriezeExtent = {
  columns: 2,
  rows: 8,
  blocks: [{ year: 2026, startCol: 0, columns: 2 }],
}

const DESKTOP = VIEWPORTS.filter(({ w, h }) => w / h >= 1)

describe('act two · pose', () => {
  it('stands the frieze at the corridor’s end, one spacing past card four', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const frame = friezeFrame(FIXTURE_FRIEZE, g)
      expect(frame.width, name).toBeCloseTo(22 * FRIEZE_CELL_W, 12)
      expect(frame.height, name).toBeCloseTo(8 * FRIEZE_CELL_H, 12)
      expect(frame.centreX, name).toBe(0)
      expect(frame.left, name).toBeCloseTo(-frame.width / 2, 12)
      expect(frame.right, name).toBeCloseTo(frame.width / 2, 12)
      // Bottom edge on the cards' floor gap, like every card in the corridor.
      expect(frame.bottom, name).toBeCloseTo(HOVER, 12)
      expect(frame.top, name).toBeCloseTo(HOVER + frame.height, 12)
      expect(frame.centreY, name).toBeCloseTo(HOVER + frame.height / 2, 12)
      expect(frame.z, name).toBeCloseTo(-(ACT_TWO_START + 1) * g.spacing, 12)
    }
  })

  it('hands over from card four’s settled slot with no lurch', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const slot = cameraPose(ACT_TWO_START, g)
      const pose = actTwoPose(0, FIXTURE_FRIEZE, g)
      expect(pose.x, name).toBeCloseTo(slot.x, 9)
      expect(pose.y, name).toBeCloseTo(slot.y, 9)
      expect(pose.z, name).toBeCloseTo(slot.z, 9)
      expect(pose.pitch, name).toBeCloseTo(slot.pitch, 9)
      expect(pose.yaw, name).toBe(0)
    }
  })

  it('parks the volume shot at the fitting distance, centred on the wall', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const frame = friezeFrame(FIXTURE_FRIEZE, g)
      const { release } = actTwoBeats(FIXTURE_FRIEZE.columns)
      const pose = actTwoPose(release, FIXTURE_FRIEZE, g)
      expect(pose.z, name).toBeCloseTo(frame.z + volumeDistance(FIXTURE_FRIEZE, g), 9)
      expect(pose.y, name).toBeCloseTo(frame.centreY, 9)
      expect(pose.x, name).toBeCloseTo(0, 12)
      expect(pose.pitch, name).toBeCloseTo(0, 9)
      expect(pose.yaw, name).toBe(0)
    }
  })

  it('brings the whole frieze inside the frame at the volume shot', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const frame = friezeFrame(FIXTURE_FRIEZE, g)
      const { release } = actTwoBeats(FIXTURE_FRIEZE.columns)
      const cam = actTwoPose(release, FIXTURE_FRIEZE, g)
      for (const x of [frame.left, frame.right]) {
        for (const y of [frame.bottom, frame.top]) {
          const { fx, fy, ahead } = projectPoint(x, y, frame.z, cam, g)
          expect(ahead, name).toBeGreaterThan(0)
          expect(fx, `${name} fx`).toBeGreaterThanOrEqual(0.05 - 1e-9)
          expect(fx, `${name} fx`).toBeLessThanOrEqual(0.95 + 1e-9)
          expect(fy, `${name} fy`).toBeGreaterThanOrEqual(0.05 - 1e-9)
          expect(fy, `${name} fy`).toBeLessThanOrEqual(0.95 + 1e-9)
        }
      }
    }
  })

  it('gives the dolly a REAL range on a frieze wider than the frame', () => {
    // The assertion an inverted min/max would fail. Without it the three
    // monotonicity checks below all pass on a camera that never moves.
    for (const { name, w, h } of DESKTOP) {
      const g = sceneGeometry(w, h)
      for (const frieze of [FIXTURE_FRIEZE, SHIPPED_FRIEZE]) {
        const { xStart, xEnd } = dollyRange(frieze, g)
        expect(xEnd - xStart, `${name} ${frieze.columns}`).toBeGreaterThan(0)
        expect(xStart, `${name} ${frieze.columns}`).toBeLessThan(0)
        expect(xEnd, `${name} ${frieze.columns}`).toBeGreaterThan(0)
      }
    }
    // …and the intended degenerate case, reached by the same two lines.
    const g = sceneGeometry(1440, 900)
    expect(dollyRange(NARROW_FRIEZE, g)).toEqual({ xStart: 0, xEnd: 0 })
  })

  it('matches the derived dolly range at the named fixtures', () => {
    const desk = sceneGeometry(1440, 900)
    expect(dollyRange(FIXTURE_FRIEZE, desk).xStart).toBeCloseTo(-3, 6)
    expect(dollyRange(FIXTURE_FRIEZE, desk).xEnd).toBeCloseTo(3, 6)
    expect(dollyRange(SHIPPED_FRIEZE, desk).xStart).toBeCloseTo(-4, 6)
    expect(dollyRange(SHIPPED_FRIEZE, desk).xEnd).toBeCloseTo(4, 6)
    const phone = sceneGeometry(393, 851)
    expect(dollyRange(SHIPPED_FRIEZE, phone).xStart).toBeCloseTo(-5.8177, 4)
    expect(dollyRange(SHIPPED_FRIEZE, phone).xEnd).toBeCloseTo(5.8177, 4)
  })

  it('travels left to right across the dolly and rests at both ends', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const { approach } = actTwoBeats(FIXTURE_FRIEZE.columns)
      const { xStart, xEnd } = dollyRange(FIXTURE_FRIEZE, g)
      expect(actTwoPose(approach, FIXTURE_FRIEZE, g).x, name).toBeCloseTo(xStart, 9)
      expect(actTwoPose(1, FIXTURE_FRIEZE, g).x, name).toBeCloseTo(xEnd, 9)
      let prev = -Infinity
      for (let u = approach; u <= 1 + 1e-12; u += 0.001) {
        const x = actTwoPose(u, FIXTURE_FRIEZE, g).x
        expect(x, name).toBeGreaterThanOrEqual(prev - 1e-12)
        prev = x
      }
    }
  })

  it('eases the dolly on a trapezoid velocity profile', () => {
    const w = 1 / 22
    expect(dollyEase(0, w)).toBe(0)
    expect(dollyEase(1, w)).toBe(1)
    let prev = -Infinity
    for (let p = 0; p <= 1 + 1e-12; p += 0.001) {
      const value = dollyEase(p, w)
      expect(value).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = value
    }
    const d = 1e-6
    const middle = (dollyEase(0.5 + d, w) - dollyEase(0.5 - d, w)) / (2 * d)
    for (const p of [0.0005, 0.9995]) {
      const slope = (dollyEase(p + d, w) - dollyEase(p - d, w)) / (2 * d)
      expect(slope / middle).toBeLessThan(0.05)
    }
  })

  it('lets the eye lead the body through the approach, and only there', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const { release, approach } = actTwoBeats(FIXTURE_FRIEZE.columns)
      for (const u of [0, release, approach, 0.5, 1]) {
        expect(actTwoPose(u, FIXTURE_FRIEZE, g).yaw, `${name} @${u}`).toBeCloseTo(0, 12)
      }
    }
    for (const { name, w, h } of DESKTOP) {
      const g = sceneGeometry(w, h)
      const { release, approach } = actTwoBeats(FIXTURE_FRIEZE.columns)
      const mid = (release + approach) / 2
      expect(Math.abs(actTwoPose(mid, FIXTURE_FRIEZE, g).yaw), name).toBeGreaterThan(1e-3)
    }
  })

  it('dissolves card four across the release, once and for good', () => {
    const { release } = actTwoBeats(FIXTURE_FRIEZE.columns)
    expect(actTwoCardFade(0, FIXTURE_FRIEZE)).toBe(1)
    expect(actTwoCardFade(release, FIXTURE_FRIEZE)).toBe(0)
    for (const u of [release + 1e-9, 0.3, 0.5, 1]) {
      expect(actTwoCardFade(u, FIXTURE_FRIEZE)).toBe(0)
    }
    let prev = Infinity
    for (let u = 0; u <= 1 + 1e-12; u += 0.001) {
      const value = actTwoCardFade(u, FIXTURE_FRIEZE)
      expect(value).toBeLessThanOrEqual(prev + 1e-12)
      prev = value
    }
  })

  it('never lets a cell fall under the 144 px legibility floor', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const d = dollyDistance(FIXTURE_FRIEZE, g)
      const cellPx = (FRIEZE_CELL_W * g.widthPx) / (2 * HALF_FOV_TAN_T * g.aspect * d)
      expect(cellPx, name).toBeGreaterThanOrEqual(FRIEZE_CELL_MIN_PX - 1e-9)
    }
    expect(FRIEZE_CELL_MIN_PX).toBe(Math.ceil(CARD_MIN_PX / 2))
    expect(FRIEZE_CELL_MIN_PX).toBe(144)
  })

  it('treats DOLLY_HEIGHT_FILL as a FLOOR on the fill, never a ceiling', () => {
    // `min()` picks the nearer distance and a nearer camera fills MORE frame,
    // so nothing in the expression caps the fill. Asserting `fill <= 1` would
    // be vacuous — true of any distance at all.
    // At 1920x1080 the HEIGHT term binds, not the legibility one, so the fill
    // sits exactly ON the floor — and lands 2e-16 under it in binary. The
    // invariant is `>=`; the epsilon is what any `>=` on a computed float needs.
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      expect(friezeHeightFill(FIXTURE_FRIEZE, g), name).toBeGreaterThanOrEqual(
        DOLLY_HEIGHT_FILL - 1e-12,
      )
    }
    const desk = sceneGeometry(1440, 900)
    expect(friezeHeightFill(FIXTURE_FRIEZE, desk)).toBeCloseTo(0.9249, 4)
    expect(actTwoTopClearFrac(FIXTURE_FRIEZE, desk)).toBeCloseTo(0.0751, 4)
    const phone = sceneGeometry(393, 851)
    expect(friezeHeightFill(FIXTURE_FRIEZE, phone)).toBeCloseTo(0.9782, 4)
    expect(actTwoTopClearFrac(FIXTURE_FRIEZE, phone)).toBeCloseTo(0.0218, 4)
    expect(VOLUME_FILL).toBe(0.9)
    expect(DOLLY_HEIGHT_FILL).toBe(0.82)
  })

  it('anchors the dolly camera on the wall’s bottom edge', () => {
    // All the spare frame height goes ABOVE the wall; that air is the whole
    // clearance act two has to give the title (Assumption 23).
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const frame = friezeFrame(FIXTURE_FRIEZE, g)
      const cam = actTwoPose(1, FIXTURE_FRIEZE, g)
      expect(cam.y, name).toBeCloseTo(dollyY(FIXTURE_FRIEZE, g), 12)
      const { fy } = projectPoint(0, frame.bottom, frame.z, cam, g)
      expect(fy, name).toBeCloseTo(1, 9)
      const top = projectPoint(0, frame.top, frame.z, cam, g)
      expect(top.fy, name).toBeCloseTo(actTwoTopClearFrac(FIXTURE_FRIEZE, g), 9)
    }
  })

  it('sits eight rows exactly on the in-frame bound', () => {
    expect(maxRowsInFrame(sceneGeometry(1440, 900))).toBe(8)
    expect(maxRowsInFrame(sceneGeometry(393, 851))).toBe(8)
  })

  it('extends the far plane to hold the volume shot', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      expect(sceneFar(FIXTURE_FRIEZE, g), name).toBeGreaterThanOrEqual(
        volumeDistance(FIXTURE_FRIEZE, g) + g.spacing,
      )
      expect(sceneFar(FIXTURE_FRIEZE, g), name).toBeGreaterThanOrEqual(g.far)
    }
  })

  it('blends the fog and the focus off act one’s values, not onto them', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const { release } = actTwoBeats(FIXTURE_FRIEZE.columns)
      const act1 = fogRange(g, 0)
      const at0 = actTwoFogRange(0, FIXTURE_FRIEZE, g, 0)
      expect(at0.near, name).toBeCloseTo(act1.near, 9)
      expect(at0.far, name).toBeCloseTo(act1.far, 9)
      // `fogRangeAt` generalises `fogRange`, bit for bit at the slot distance.
      expect(fogRangeAt(g.D, g, 0)).toEqual(act1)
      const frame = friezeFrame(FIXTURE_FRIEZE, g)
      const dWall = actTwoPose(release, FIXTURE_FRIEZE, g).z - frame.z
      expect(actTwoFogRange(release, FIXTURE_FRIEZE, g, 0).near, name).toBeGreaterThan(dWall)
      expect(actTwoFocusDistance(0, FIXTURE_FRIEZE, g), name).toBe(g.D)
      expect(actTwoFocusDistance(release, FIXTURE_FRIEZE, g), name).toBeCloseTo(dWall, 9)
    }
  })

  it('keeps the title plane in front of the wall', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      const d = dollyDistance(FIXTURE_FRIEZE, g)
      expect(actTwoTitleDistance(d, g), name).toBeLessThan(d)
      expect(actTwoTitleDistance(d, g), name).toBeLessThanOrEqual(g.titleDistance)
    }
  })
})
