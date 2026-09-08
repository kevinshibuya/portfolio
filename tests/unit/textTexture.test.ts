import { describe, it, expect, beforeAll, vi } from 'vitest'
import * as THREE from 'three'
import {
  layoutText,
  measureText,
  drawTextTexture,
  captionScale,
  type DrawTextOptions,
} from '../../src/components/canvas/scene/textTexture'
import {
  sceneGeometry,
  CAPTION_NAME_PX,
  CAPTION_MIN_NAME_PX,
  CARD_MAX_PX,
} from '../../src/utils/sceneMotion'

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
