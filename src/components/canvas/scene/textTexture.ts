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
/**
 * How long a resize must be quiet before the scene's Jakarta textures redraw.
 * Shared by the card captions and the frieze masks so one window setting
 * settles every text rebuild together.
 */
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

  return canvasTexture(canvas, options.anisotropy)
}

/** The one set of sampling settings every scene text texture is built with. */
function canvasTexture(canvas: HTMLCanvasElement, anisotropy: number | undefined): TextTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.premultiplyAlpha = false
  if (anisotropy) texture.anisotropy = anisotropy
  texture.needsUpdate = true
  return { texture, widthPx: canvas.width, heightPx: canvas.height }
}

/** The ink width of one line at its own font, in the caller's px. */
export function measureLine(line: TextLine): number {
  const ctx = context2d()
  ctx.font = fontSpec(line)
  return ctx.measureText(line.text).width
}

/** One run of text anchored to a row of a fixed-size box. */
export interface BoxRun extends TextLine {
  /** Zero-based row, indexing `rowEmPx`. */
  row: number
  align: 'left' | 'right'
  /** Ellipsised to this width; defaults to the box's own. */
  maxWidthPx?: number
}

export interface DrawBoxOptions {
  runs: BoxRun[]
  /** Em of each row, top to bottom; a row box is em x lineHeight. */
  rowEmPx: number[]
  /** Ink width of the box, in the caller's px. */
  widthPx: number
  /** The renderer's ratio, applied once. */
  dpr: number
  lineHeight?: number
  /** Transparent margin so clamp-to-edge sampling never smears ink, default 2. */
  padPx?: number
  anisotropy?: number
}

export interface BoxLayout {
  /** Per run, in input order: the text as drawn, and where it is drawn. */
  runs: Array<{ text: string; x: number; y: number }>
  widthPx: number
  heightPx: number
}

/**
 * Where each run lands in a box whose size comes from its rows and width ALONE,
 * never from its runs.
 *
 * That is the point of it: the wall card's caption is two stacked planes — a
 * white title the material tints, and a muted plane that is never tinted — and
 * sized from their own ink they would come out different heights and the rows
 * would drift apart. Built from the same geometry they are the same plane twice.
 */
export function layoutTextBox(options: DrawBoxOptions): BoxLayout {
  const ctx = context2d()
  const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT
  const pad = options.padPx ?? DEFAULT_PAD_PX

  const tops: number[] = []
  let top = pad
  for (const em of options.rowEmPx) {
    tops.push(top)
    top += em * lineHeight
  }

  const runs = options.runs.map((run) => {
    if (!(run.row >= 0 && run.row < options.rowEmPx.length)) {
      throw new Error(`box run row ${run.row} outside its ${options.rowEmPx.length} rows`)
    }
    ctx.font = fontSpec(run)
    return {
      text: ellipsise(ctx, run.text, run.maxWidthPx ?? options.widthPx),
      x: run.align === 'left' ? pad : pad + options.widthPx,
      y: tops[run.row] + (options.rowEmPx[run.row] * lineHeight) / 2,
    }
  })

  return { runs, widthPx: options.widthPx + 2 * pad, heightPx: top + pad }
}

export function drawTextBox(options: DrawBoxOptions): TextTexture {
  const layout = layoutTextBox(options)
  const { dpr } = options

  const ctx = context2d()
  const canvas = ctx.canvas
  canvas.width = Math.ceil(layout.widthPx * dpr)
  canvas.height = Math.ceil(layout.heightPx * dpr)

  // Re-applied after the resize: it resets the whole 2D state.
  ctx.scale(dpr, dpr)
  ctx.textBaseline = 'middle'
  options.runs.forEach((run, i) => {
    ctx.font = fontSpec(run)
    ctx.fillStyle = run.color
    ctx.textAlign = run.align
    ctx.fillText(layout.runs[i].text, layout.runs[i].x, layout.runs[i].y)
  })

  return canvasTexture(canvas, options.anisotropy)
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
