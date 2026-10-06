import { describe, it, expect } from 'vitest'
import { archive } from '../../src/data/archive'
import {
  actTwoBeats,
  actTwoPose,
  projectPoint,
  sceneGeometry,
  friezeFrame,
  CAPTION_MIN_NAME_PX,
} from '../../src/utils/sceneMotion'
import { friezeLayout, friezeExtent, FRIEZE_ROWS } from '../../src/utils/friezeLayout'
import { CELL_TITLE_WORLD, CELL_META_WORLD } from '../../src/components/canvas/scene/friezeText'

/**
 * How big the wall's type actually lands, in CSS pixels, at the beat where the
 * reader first has to read it.
 *
 * The size constant is a WORLD height (`CELL_TITLE_WORLD = 0.06`), not a pixel
 * size: the projection is what turns it into pixels, so the derivation is one
 * step. There is no `CELL_TITLE_PX` and no design-width ratio to divide by.
 *
 * The numbers feed rows 17 and 18 of `docs/contrast.md`, where a size decides
 * which WCAG bar a pair has to clear.
 */

const layout = friezeLayout(archive, FRIEZE_ROWS)
const extent = friezeExtent(layout, FRIEZE_ROWS)

const VIEWPORTS: ReadonlyArray<readonly [number, number, 'phone' | 'desktop']> = [
  [320, 568, 'phone'],
  [390, 844, 'phone'],
  [1440, 900, 'desktop'],
  [1920, 1080, 'desktop'],
]

/** A world height at the wall's depth, in CSS px, at the approach's end. */
function worldToPx(world: number, widthPx: number, heightPx: number): number {
  const g = sceneGeometry(widthPx, heightPx)
  const u = actTwoBeats(extent.columns).approach
  const pose = actTwoPose(u, extent, g)

  // `projectPoint` is documented for a camera that only ever pitches. The
  // approach ENDS square to the wall, before the dolly starts yawing along it,
  // so the pitch-only projection is exact here and would be wrong at any dolly
  // `u`. Assert it rather than trust it: if the choreography ever puts yaw at
  // this beat, this test must fail loudly instead of reporting a wrong number.
  expect(Math.abs(pose.yaw), 'the approach must end square to the wall').toBeLessThan(1e-6)

  const z = friezeFrame(extent, g).z
  const cam = { z: pose.z, y: pose.y, pitch: pose.pitch }
  const lower = projectPoint(pose.x, pose.y, z, cam, g)
  const upper = projectPoint(pose.x, pose.y + world, z, cam, g)
  return Math.abs(upper.fy - lower.fy) * heightPx
}

describe('the wall reads at the approach', () => {
  const sizes = VIEWPORTS.map(([w, h, kind]) => ({
    label: `${w}×${h}`,
    kind,
    title: worldToPx(CELL_TITLE_WORLD, w, h),
    meta: worldToPx(CELL_META_WORLD, w, h),
  }))

  it('reports the cell title and meta size at every viewport', () => {
    for (const s of sizes) {
      console.info(
        `[frieze legibility] ${s.label} (${s.kind}): title ${s.title.toFixed(2)} px · meta/serial ${s.meta.toFixed(2)} px`,
      )
    }
    expect(sizes).toHaveLength(4)
  })

  it('clears the 12 px caption floor on desktop', () => {
    // Desktop only (assumption 16). The approach frames the whole newest block,
    // and a 320 px portrait frame fits that same block into a third of the
    // width — a phone value under 12 px is a fact about the beat for Kevin's
    // manual pass to judge, not a regression this test can fix.
    for (const s of sizes.filter((v) => v.kind === 'desktop')) {
      expect(s.title, `${s.label} cell title`).toBeGreaterThanOrEqual(CAPTION_MIN_NAME_PX)
    }
  })

  it('keeps the meta a fixed fraction of the title, so one ratio covers both', () => {
    for (const s of sizes) {
      expect(s.meta / s.title).toBeCloseTo(CELL_META_WORLD / CELL_TITLE_WORLD, 6)
    }
  })
})
