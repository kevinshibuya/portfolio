import { describe, it, expect, beforeAll, vi } from 'vitest'
import * as THREE from 'three'
import {
  layoutText,
  measureText,
  measureLine,
  layoutTextBox,
  drawTextBox,
  drawTextTexture,
  captionScale,
  type DrawTextOptions,
  type DrawBoxOptions,
  type TextLine,
} from '../../src/components/canvas/scene/textTexture'
import {
  sceneGeometry,
  CAPTION_NAME_PX,
  CAPTION_MIN_NAME_PX,
  CARD_MAX_PX,
} from '../../src/utils/sceneMotion'
import { BAND_H } from '../../src/components/canvas/scene/cardAnatomy'
import {
  wallCaptionRuns,
  WALL_CAPTION_GAP_WORLD,
  WALL_CAPTION_H,
  WALL_CAPTION_LINE_HEIGHT,
  WALL_CAPTION_W,
  WALL_META_WORLD,
  WALL_MUTED_COLOR,
  WALL_TITLE_COVERAGE,
  WALL_TITLE_WORLD,
} from '../../src/components/canvas/scene/wallCaption'

/**
 * jsdom has no canvas text metrics. The stub reads the em size back out of
 * `ctx.font` and calls every glyph 0.55 em wide, which is enough to test the
 * sizing math without a rasteriser.
 */
function stubContext(): CanvasRenderingContext2D {
  const ctx = {
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '',
    measureText(text: string) {
      const em = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 0)
      return { width: text.length * em * 0.55 }
    },
    fillText: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
  }
  return ctx as unknown as CanvasRenderingContext2D
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    const ctx = stubContext()
    Object.defineProperty(ctx, 'canvas', { value: this })
    return ctx
  } as never
})

const line = (text: string, fontPx: number, weight = 600, color = '#0B0E14') => ({
  text,
  fontPx,
  weight,
  color,
})

describe('layoutText', () => {
  it('sizes a single line from its glyphs and the line height', () => {
    const l = layoutText({ lines: [line('hello', 26)], dpr: 1, maxWidthPx: 1000, align: 'left', padPx: 0, lineHeight: 1 })
    expect(l.lines).toEqual(['hello'])
    expect(l.widthPx).toBeCloseTo(5 * 26 * 0.55, 10)
    expect(l.heightPx).toBeCloseTo(26, 10)
  })

  it('stacks lines with their own sizes, a gap between them and padding around', () => {
    const l = layoutText({
      lines: [line('name', 26), line('2026 · react', 14, 500)],
      dpr: 1,
      maxWidthPx: 1000,
      align: 'left',
      padPx: 2,
      lineHeight: 1.2,
      gapPx: 4,
    })
    expect(l.widthPx).toBeCloseTo(Math.max(4 * 26, 12 * 14) * 0.55 + 4, 10)
    expect(l.heightPx).toBeCloseTo(26 * 1.2 + 4 + 14 * 1.2 + 4, 10)
  })

  it('ellipsises a long line to the width cap and never wraps', () => {
    const long = 'a very long project name that will not fit on the card band at all'
    const l = layoutText({ lines: [line(long, 26)], dpr: 1, maxWidthPx: 300, align: 'left', padPx: 0 })
    expect(l.lines).toHaveLength(1)
    expect(l.lines[0].endsWith('…')).toBe(true)
    expect(l.lines[0].length).toBeLessThan(long.length)
    expect(l.widthPx).toBeLessThanOrEqual(300)
    expect(l.widthPx).toBeGreaterThan(300 - 26)
  })
})

describe('measureText', () => {
  it('reports the texture size in device pixels, once', () => {
    const options: DrawTextOptions = {
      lines: [line('hello', 26)],
      dpr: 1.5,
      maxWidthPx: 1000,
      align: 'left',
      padPx: 0,
      lineHeight: 1,
    }
    expect(measureText(options)).toEqual({
      widthPx: Math.ceil(5 * 26 * 0.55 * 1.5),
      heightPx: Math.ceil(26 * 1.5),
    })
  })
})

describe('drawTextTexture', () => {
  it('draws to a canvas of the measured size and returns a mip-mapped sRGB texture', () => {
    const options: DrawTextOptions = {
      lines: [line('política essencial', 26), line('2026 · react 18', 14, 500, 'rgba(11,14,20,0.62)')],
      dpr: 1.5,
      maxWidthPx: 600,
      align: 'left',
    }
    const expected = measureText(options)
    const drawn = drawTextTexture(options)
    expect(drawn.widthPx).toBe(expected.widthPx)
    expect(drawn.heightPx).toBe(expected.heightPx)
    expect(drawn.texture).toBeInstanceOf(THREE.CanvasTexture)
    const canvas = drawn.texture.image as HTMLCanvasElement
    expect(canvas.width).toBe(expected.widthPx)
    expect(canvas.height).toBe(expected.heightPx)
    expect(drawn.texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(drawn.texture.generateMipmaps).toBe(true)
    expect(drawn.texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(drawn.texture.magFilter).toBe(THREE.LinearFilter)
    expect(drawn.texture.premultiplyAlpha).toBe(false)
  })
})

describe('captionScale', () => {
  it('is texture px per card unit: a 620 device-px card draws 1:1', () => {
    expect(captionScale(CARD_MAX_PX)).toBe(1)
    expect(captionScale(310)).toBeCloseTo(0.5, 10)
  })

  it('keeps the caption name at or above 12 px on every viewport from 320 up', () => {
    const sizes: Array<[number, number]> = [
      [320, 568], [360, 780], [390, 844], [768, 1024], [844, 390], [1024, 768], [1280, 720], [1440, 900], [1920, 1080],
    ]
    for (const [a, b] of sizes) {
      for (const [w, h] of [[a, b], [b, a]] as Array<[number, number]>) {
        const g = sceneGeometry(w, h)
        const cardCssPx = g.fraction * g.widthPx
        // dpr cancels: the name is drawn at scale(cardPx·dpr) and shown at 1/dpr.
        const nameCssPx = CAPTION_NAME_PX * captionScale(cardCssPx)
        expect(nameCssPx, `${w}x${h}`).toBeGreaterThanOrEqual(CAPTION_MIN_NAME_PX - 1e-9)
      }
    }
  })
})

describe('measureLine', () => {
  it('measures one line at its own font, with no box or padding around it', () => {
    expect(measureLine({ text: 'abcd', fontPx: 20, weight: 500, color: '#000' })).toBeCloseTo(
      4 * 20 * 0.55,
      10,
    )
  })
})

const boxRun = (
  text: string,
  row: number,
  align: 'left' | 'right',
  fontPx: number,
  maxWidthPx?: number,
) => ({ text, row, align, fontPx, weight: 600, color: '#0B0E14', maxWidthPx })

/** Two rows 300 px wide: the wall caption's shape, in round numbers. */
const box = { rowEmPx: [26, 14], widthPx: 300, dpr: 1, lineHeight: 1.2, padPx: 2 }

describe('layoutTextBox', () => {
  it('sizes the box from its rows and width alone, never from its runs', () => {
    const one = layoutTextBox({ ...box, runs: [boxRun('a', 0, 'left', 26)] })
    const other = layoutTextBox({
      ...box,
      runs: [boxRun('x', 0, 'left', 26), boxRun('a much longer trailing line', 1, 'right', 14)],
    })
    // The tinted plane and the muted one are stacked: sized from their ink they
    // would come out different heights and the two rows would drift apart.
    expect(one.widthPx).toBe(other.widthPx)
    expect(one.heightPx).toBe(other.heightPx)
    expect(one.widthPx).toBeCloseTo(304, 10)
    expect(one.heightPx).toBeCloseTo(2 + 26 * 1.2 + 14 * 1.2 + 2, 10)
  })

  it('anchors a left run at the box left edge and a right run at its right', () => {
    const l = layoutTextBox({
      ...box,
      runs: [boxRun('origin', 1, 'left', 14), boxRun('12', 1, 'right', 14)],
    })
    expect(l.runs[0].x).toBeCloseTo(2, 10)
    expect(l.runs[1].x).toBeCloseTo(302, 10)
  })

  it('centres each run in its own row box', () => {
    const l = layoutTextBox({
      ...box,
      runs: [boxRun('title', 0, 'left', 26), boxRun('meta', 1, 'left', 14)],
    })
    expect(l.runs[0].y).toBeCloseTo(2 + (26 * 1.2) / 2, 10)
    expect(l.runs[1].y).toBeCloseTo(2 + 26 * 1.2 + (14 * 1.2) / 2, 10)
  })

  it('ellipsises a run to its own cap, not to the box width', () => {
    const long = 'a long project title that overflows'
    const capped = layoutTextBox({ ...box, runs: [boxRun(long, 0, 'left', 26, 100)] })
    const full = layoutTextBox({ ...box, runs: [boxRun(long, 0, 'left', 26)] })
    expect(capped.runs[0].text.endsWith('…')).toBe(true)
    expect(capped.runs[0].text.length).toBeLessThan(full.runs[0].text.length)
  })

  it('rejects a run outside the rows the box declares', () => {
    expect(() => layoutTextBox({ ...box, runs: [boxRun('x', 2, 'left', 14)] })).toThrow(/row 2/)
  })
})

describe('drawTextBox', () => {
  it('draws to a canvas of the box size and returns a mip-mapped sRGB texture', () => {
    const options: DrawBoxOptions = {
      ...box,
      dpr: 1.5,
      runs: [boxRun('beyond', 0, 'left', 26), boxRun('12', 1, 'right', 14)],
    }
    const layout = layoutTextBox(options)
    const drawn = drawTextBox(options)
    expect(drawn.widthPx).toBe(Math.ceil(layout.widthPx * 1.5))
    expect(drawn.heightPx).toBe(Math.ceil(layout.heightPx * 1.5))
    expect(drawn.texture).toBeInstanceOf(THREE.CanvasTexture)
    expect(drawn.texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(drawn.texture.minFilter).toBe(THREE.LinearMipmapLinearFilter)
    expect(drawn.texture.premultiplyAlpha).toBe(false)
  })
})

/** The stub's model, without the canvas: length × em × 0.55. */
const measure = (line: TextLine): number => line.text.length * line.fontPx * 0.55
/** Round numbers: at 1000 texels per world unit the box is 961.29 px wide. */
const SCALE = 1000

describe('wallCaptionRuns', () => {
  it('puts the title on row one and the origin and serial at the ends of row two', () => {
    const { title, muted } = wallCaptionRuns(
      { title: 'Beyond', origin: 'personal', serial: '12' },
      SCALE,
      measure,
    )
    expect(title).toHaveLength(1)
    expect(title[0].row).toBe(0)
    expect(title[0].align).toBe('left')
    // White coverage: the material's colour carries the ink, so hover can tint it.
    expect(title[0].color).toBe(WALL_TITLE_COVERAGE)
    expect(title[0].fontPx).toBeCloseTo(WALL_TITLE_WORLD * SCALE, 10)
    expect(muted.map((r) => [r.text, r.row, r.align])).toEqual([
      ['personal', 1, 'left'],
      ['12', 1, 'right'],
    ])
    // Never tinted, and drawn opaque: the frame is white and the wall is cream,
    // so a composited alpha would resolve differently on each.
    expect(muted.every((r) => r.color === WALL_MUTED_COLOR)).toBe(true)
    expect(muted.every((r) => r.fontPx === WALL_META_WORLD * SCALE)).toBe(true)
  })

  it('leaves row two to the serial alone when the piece is professional', () => {
    const { muted } = wallCaptionRuns({ title: 'T', origin: '', serial: '7' }, SCALE, measure)
    expect(muted.map((r) => [r.text, r.align])).toEqual([['7', 'right']])
  })

  it('collapses row two when a long origin would run into the serial', () => {
    const origin = 'x'.repeat(45)
    const { muted } = wallCaptionRuns({ title: 'T', origin, serial: '12' }, SCALE, measure)
    expect(muted).toHaveLength(1)
    expect(muted[0].align).toBe('left')
    expect(muted[0].text).toBe(`${origin} · 12`)
  })

  it('reserves the count slot at the right of the title row and shortens the title', () => {
    const text = { title: 'Beyond', origin: 'personal', serial: '12' }
    const plain = wallCaptionRuns(text, SCALE, measure)
    const counted = wallCaptionRuns({ ...text, count: '24' }, SCALE, measure)
    const count = counted.muted.find((r) => r.text === '24')
    expect(count).toBeDefined()
    expect(count!.row).toBe(0)
    expect(count!.align).toBe('right')
    expect(count!.color).toBe(WALL_MUTED_COLOR)
    expect(plain.title[0].maxWidthPx).toBeCloseTo(WALL_CAPTION_W * SCALE, 10)
    expect(counted.title[0].maxWidthPx).toBeCloseTo(
      WALL_CAPTION_W * SCALE - measure(count!) - WALL_CAPTION_GAP_WORLD * SCALE,
      10,
    )
  })

  it('fits two caption rows in the card body band, and not three', () => {
    expect(WALL_CAPTION_H).toBeCloseTo(
      (WALL_TITLE_WORLD + WALL_META_WORLD) * WALL_CAPTION_LINE_HEIGHT,
      12,
    )
    expect(WALL_CAPTION_H).toBeLessThan(BAND_H)
    // Why the wall caption shares one origin/serial row (third amendment): a
    // third row does not fit the band, so it can never grow one.
    expect((WALL_TITLE_WORLD + 2 * WALL_META_WORLD) * WALL_CAPTION_LINE_HEIGHT).toBeGreaterThan(
      BAND_H,
    )
  })
})
