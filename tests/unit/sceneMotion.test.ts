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
  morphValues,
  ambientOffset,
  velocityEnergy,
  velocityYaw,
  fogRange,
  BLUR_CAP,
  APPROACH_DEPTH,
} from '../../src/utils/sceneMotion'

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
  it('maps the scroll range onto the approach plus one unit per card', () => {
    expect(playheadFor(0)).toBeCloseTo(-0.5, 10)
    expect(playheadFor(1)).toBeCloseTo(3, 10)
  })
  it('reaches card 0 once the 50svh approach is spent', () => {
    // the approach is 0.5 of 3.5 playhead units => p = 0.5/3.5
    expect(playheadFor(0.5 / 3.5)).toBeCloseTo(0, 10)
  })
  it('clamps outside the scroll range', () => {
    expect(playheadFor(-1)).toBe(-0.5)
    expect(playheadFor(2)).toBe(3)
  })
})

describe('easedSeg', () => {
  it('is the identity at every settled integer playhead', () => {
    for (const seg of [0, 1, 2, 3]) expect(easedSeg(seg)).toBeCloseTo(seg, 10)
  })
  it('starts one spacing behind card 0 at the top of the approach', () => {
    expect(easedSeg(-0.5)).toBeCloseTo(-1, 10)
  })
  it('is non-decreasing across the whole playhead range', () => {
    let prev = -Infinity
    for (let seg = -0.5; seg <= 3.0001; seg += 0.01) {
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
  it('enters and settles with near-zero slope at both ends of the approach', () => {
    const h = 0.001
    const slopeAtStart = (easedSeg(-0.5 + h) - easedSeg(-0.5)) / h
    const slopeAtSettle = (easedSeg(0) - easedSeg(-h)) / h
    expect(slopeAtStart).toBeLessThan(0.05)
    expect(slopeAtSettle).toBeLessThan(0.05)
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

describe('sceneGeometry', () => {
  it('sizes the card against the frame at each worked viewport', () => {
    // 620px cap at 1440; the half-frame-height cap at 1920; the cap again at
    // 1280; a phone gets a fixed 88vw card.
    expect(sceneGeometry(1440, 900).fraction).toBeCloseTo(0.4306, 3)
    expect(sceneGeometry(1920, 1080).fraction).toBeCloseTo(0.3229, 3)
    expect(sceneGeometry(1280, 720).fraction).toBeCloseTo(0.3892, 3)
    expect(sceneGeometry(393, 851).fraction).toBeCloseTo(0.88, 10)
  })

  it('never lets the card exceed half the frame height on desktop', () => {
    for (const { name, w, h } of VIEWPORTS) {
      const g = sceneGeometry(w, h)
      if (g.aspect < 1) continue
      expect(g.fraction * g.aspect * CARD_H, name).toBeLessThanOrEqual(0.5 + 1e-9)
    }
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
    expect(sceneGeometry(393, 851).titleCapPx).toBe(56)
    expect(sceneGeometry(1920, 1080).titleCapPx).toBe(150)
    expect(sceneGeometry(1440, 900).titleCapPx).toBeCloseTo(129.6, 6)
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
  })

  it('centres the title band on the upper-third mark', () => {
    const { title } = frameRects(sceneGeometry(1440, 900))
    expect((title.top + title.bottom) / 2).toBeCloseTo(0.24, 10)
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

describe('morphValues', () => {
  it('bridges the two titles evenly at the settle midpoint', () => {
    const m = morphValues(0.5)
    expect(m.incoming.blur).toBeCloseTo(8, 6)
    expect(m.outgoing.blur).toBeCloseTo(8, 6)
    expect(m.incoming.opacity).toBeCloseTo(m.outgoing.opacity, 6)
  })

  it('resolves the incoming title crisp and dissolves the outgoing one', () => {
    const settled = morphValues(1)
    expect(settled.incoming.blur).toBeCloseTo(0, 6)
    expect(settled.incoming.opacity).toBeCloseTo(1, 6)
    expect(settled.outgoing.blur).toBe(BLUR_CAP)
    expect(settled.outgoing.opacity).toBeCloseTo(0, 6)
  })

  it('holds the settle plateaus, so a title is crisp at every pin edge', () => {
    expect(morphValues(0.15).incoming.blur).toBe(BLUR_CAP)
    expect(morphValues(0.85).incoming.blur).toBeCloseTo(0, 6)
  })

  it('keeps blur inside the cap across the whole segment', () => {
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const m = morphValues(f)
      for (const blur of [m.incoming.blur, m.outgoing.blur]) {
        expect(blur).toBeGreaterThanOrEqual(0)
        expect(blur).toBeLessThanOrEqual(BLUR_CAP)
      }
    }
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

  it('pulses the halo around its resting alpha', () => {
    for (let i = 0; i < CARD_COUNT; i++) {
      const T = PERIOD(i)
      expect(meanOver(T, (t) => ambientOffset(i, t, 0).haloAlpha)).toBeCloseTo(0.35, 3)
      for (let t = 0; t < 20; t += 0.05) {
        const { haloAlpha } = ambientOffset(i, t, 0)
        expect(haloAlpha).toBeGreaterThanOrEqual(0.35 - 0.0525 - 1e-12)
        expect(haloAlpha).toBeLessThanOrEqual(0.35 + 0.0525 + 1e-12)
      }
    }
  })

  it('doubles the motion amplitudes at full energy, leaving the halo alone', () => {
    for (const t of [0.3, 1.1, 2.7]) {
      const calm = ambientOffset(1, t, 0)
      const lively = ambientOffset(1, t, 1)
      expect(lively.y).toBeCloseTo(calm.y * 2, 10)
      expect(lively.yaw).toBeCloseTo(calm.yaw * 2, 10)
      expect(lively.pitch).toBeCloseTo(calm.pitch * 2, 10)
      expect(lively.haloAlpha).toBeCloseTo(calm.haloAlpha, 10)
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
