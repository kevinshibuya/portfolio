import * as THREE from 'three'
import { CARD_MAX_PX } from '../../../utils/sceneMotion'

/**
 * The scene's Jakarta rasteriser: the caption on each card and the overture
 * line are textures drawn on an offscreen 2D canvas, in the site voice.
 *
 * Device pixels, once (plan, Global constraints): the caller sizes the text in
 * the px it will be SHOWN at and hands over the renderer's ratio as `dpr`; the
 * canvas is scaled by that single factor and nothing here multiplies it in
 * again. Anton stays the title's face; this file never draws it.
 */

export interface TextLine {
  text: string
  /** Em size, in the px the caller shows the texture at (before `dpr`). */
  fontPx: number
  weight: number
  color: string
  /** Defaults to Jakarta; the arrow falls back to the system face if needed. */
  family?: string
}

export interface DrawTextOptions {
  lines: TextLine[]
  /** The renderer's ratio (`state.viewport.dpr`, ≤ 1.5), applied once. */
  dpr: number
  /** A line wider than this is ellipsised to fit; text never wraps. */
  maxWidthPx: number
  align: 'left' | 'center'
  /** Line box as a multiple of the em, default 1.2. */
  lineHeight?: number
  /** Extra space between consecutive lines, default 0. */
  gapPx?: number
  /** Transparent margin so clamp-to-edge sampling never smears ink, default 2. */
  padPx?: number
  anisotropy?: number
}

export interface TextLayout {
  /** The lines as they will be drawn, ellipsised where they had to be. */
  lines: string[]
  /** Layout size before `dpr`, in the caller's px. */
  widthPx: number
  heightPx: number
}

export interface TextTexture {
  texture: THREE.CanvasTexture
  /** Canvas dimensions, i.e. texture pixels. */
  widthPx: number
  heightPx: number
}

export const TEXT_FAMILY = '"Plus Jakarta Sans"'
export const RESIZE_DEBOUNCE_MS = 150
const ARROW_FALLBACK_FAMILY = 'system-ui, sans-serif'
const ELLIPSIS = '…'
const DEFAULT_LINE_HEIGHT = 1.2
const DEFAULT_PAD_PX = 2

const fontSpec = (line: TextLine): string =>
  `${line.weight} ${line.fontPx}px ${line.family ?? TEXT_FAMILY}`

function context2d(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for the scene text')
  return ctx
}

/** Trims a line from the end until it fits, then hangs an ellipsis on it. */
function ellipsise(ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number): string {
  if (ctx.measureText(text).width <= maxWidthPx) return text
  const chars = Array.from(text)
  let keep = chars.length
  while (keep > 0) {
    keep--
    const candidate = chars.slice(0, keep).join('').trimEnd() + ELLIPSIS
    if (ctx.measureText(candidate).width <= maxWidthPx) return candidate
  }
  return ELLIPSIS
}

/** Where every line lands, in the caller's px. Pure apart from text metrics. */
export function layoutText(options: DrawTextOptions): TextLayout {
  const ctx = context2d()
  const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT
  const gap = options.gapPx ?? 0
  const pad = options.padPx ?? DEFAULT_PAD_PX
  const lines: string[] = []
  let inkWidth = 0
  let blockHeight = 0
  options.lines.forEach((line, i) => {
    ctx.font = fontSpec(line)
    const text = ellipsise(ctx, line.text, options.maxWidthPx)
    lines.push(text)
    inkWidth = Math.max(inkWidth, ctx.measureText(text).width)
    blockHeight += line.fontPx * lineHeight + (i > 0 ? gap : 0)
  })
  return { lines, widthPx: inkWidth + 2 * pad, heightPx: blockHeight + 2 * pad }
}

/** The texture size `drawTextTexture` would produce, in device px. */
export function measureText(options: DrawTextOptions): { widthPx: number; heightPx: number } {
  const layout = layoutText(options)
  return {
    widthPx: Math.ceil(layout.widthPx * options.dpr),
    heightPx: Math.ceil(layout.heightPx * options.dpr),
  }
}

export function drawTextTexture(options: DrawTextOptions): TextTexture {
  const layout = layoutText(options)
  const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT
  const gap = options.gapPx ?? 0
  const pad = options.padPx ?? DEFAULT_PAD_PX
  const { dpr } = options

  const ctx = context2d()
  const canvas = ctx.canvas
  canvas.width = Math.ceil(layout.widthPx * dpr)
  canvas.height = Math.ceil(layout.heightPx * dpr)

  // Re-applied after the resize: it resets the whole 2D state.
  ctx.scale(dpr, dpr)
  ctx.textAlign = options.align
  ctx.textBaseline = 'middle'
  const x = options.align === 'left' ? pad : layout.widthPx / 2
  let top = pad
  options.lines.forEach((line, i) => {
    const box = line.fontPx * lineHeight
    ctx.font = fontSpec(line)
    ctx.fillStyle = line.color
    ctx.fillText(layout.lines[i], x, top + box / 2)
    top += box + gap
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.premultiplyAlpha = false
  if (options.anisotropy) texture.anisotropy = options.anisotropy
  texture.needsUpdate = true

  return { texture, widthPx: canvas.width, heightPx: canvas.height }
}

/**
 * Texture px per card unit (the 620-px design px), for a card shown at
 * `cardPx` DEVICE px wide: at the slot one texture px is one device px, so the
 * caption is neither minified nor magnified at rest.
 */
export function captionScale(cardPx: number): number {
  return cardPx / CARD_MAX_PX
}

let fontReady: Promise<void> | null = null

/**
 * Resolves once Jakarta is usable for the canvas (the page already loads the
 * face; this only waits for it). Without `document.fonts` it resolves at once.
 */
export function loadTextFont(): Promise<void> {
  if (!fontReady) {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts
    fontReady = fonts
      ? fonts.load(`600 26px ${TEXT_FAMILY}`).then(() => undefined, () => undefined)
      : Promise.resolve()
  }
  return fontReady
}

/**
 * The face to draw `↗` with: Jakarta if the loaded face carries the glyph,
 * otherwise the system fallback — the same dependency `.workrow-arrow` has.
 */
export function arrowFamily(): string {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts
  if (!fonts || typeof fonts.check !== 'function') return TEXT_FAMILY
  return fonts.check(`600 22px ${TEXT_FAMILY}`, '↗') ? TEXT_FAMILY : ARROW_FALLBACK_FAMILY
}
