import * as THREE from 'three'

/**
 * The Selected Work title, drawn to an offscreen 2D canvas as a coverage mask.
 *
 * The scene's title is a textured plane, not DOM, so each project name becomes
 * a texture whose ALPHA is the glyph coverage — the morph shader then blurs,
 * mixes and thresholds two of these to get the gooey bridge. Nothing but the
 * alpha channel is ever read, so the glyphs are drawn plain white.
 *
 * Anton is the only face used here (the Anton fence, CLAUDE.md): Jakarta is the
 * site voice, Anton is the Selected Work title and nothing else.
 */

export interface TitleMetrics {
  /** Canvas dimensions, i.e. texture pixels. */
  widthPx: number
  heightPx: number
  lineCount: number
  /** True cap height in TEXTURE px (an 'H'), for verification. */
  capPx: number
  /**
   * The em size in TEXTURE px. This is what maps a texture to its rendered
   * size: SceneGeometry.titleCapPx carries the retired CSS rule's
   * `font-size: clamp(56px, 9vw, 150px)`, which is an em, not a cap height.
   */
  emPx: number
  /** First and last TEXTURE rows that actually carry glyph coverage. */
  inkTopPx: number
  inkBottomPx: number
}

export interface TitleTexture extends TitleMetrics {
  texture: THREE.CanvasTexture
}

export interface DrawTitleOptions {
  dpr: number
  maxLinePx: number
  fontPx: number
}

const MAX_CANVAS_PX = 2048
const MAX_LINES = 2
const LINE_HEIGHT = 0.95
/** Transparent margin so clamp-to-edge sampling never smears a glyph outward. */
const PAD_RATIO = 0.12

const fontSpec = (fontPx: number): string => `400 ${fontPx}px Anton`

function context2d(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for the scene title')
  return ctx
}

/**
 * Width of one "0" in Anton — the CSS `ch` unit, which the retired DOM title
 * used to wrap at 18ch. Awaits the font so the measurement is not taken
 * against the fallback face.
 */
export async function antonChWidth(fontPx: number): Promise<number> {
  await document.fonts.load(fontSpec(fontPx), '0')
  const ctx = context2d()
  ctx.font = fontSpec(fontPx)
  return ctx.measureText('0').width
}

/** Greedy word wrap; the last allowed line takes whatever is left. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxLinePx: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const overflows = current !== '' && ctx.measureText(candidate).width > maxLinePx
    if (overflows && lines.length < MAX_LINES - 1) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function drawTitleTexture(
  text: string,
  { dpr, maxLinePx, fontPx }: DrawTitleOptions,
): Promise<TitleTexture> {
  const lowercase = text.toLowerCase()
  await document.fonts.load(fontSpec(fontPx), lowercase)

  const ctx = context2d()
  ctx.font = fontSpec(fontPx)
  const lines = wrapLines(ctx, lowercase, maxLinePx)

  // Cap height from a reference glyph, so it is identical for every title and
  // the two languages cannot render at different sizes.
  const reference = ctx.measureText('H')
  const capPxUnscaled = reference.actualBoundingBoxAscent
  const ascent = reference.fontBoundingBoxAscent
  const descent = reference.fontBoundingBoxDescent
  const lineHeightPx = LINE_HEIGHT * fontPx

  // The block runs from the first line's cap top to the last line's baseline.
  // Padding has to clear whatever hangs outside it — accents above (í, ã) and
  // descenders below (p, ç) — or the canvas edge crops the glyphs and shifts
  // the title's optical centre.
  const blockH = capPxUnscaled + (lines.length - 1) * lineHeightPx
  const padY = Math.max(PAD_RATIO * fontPx, ascent - capPxUnscaled, descent) + 0.04 * fontPx
  const padX = PAD_RATIO * fontPx
  const inkWidth = Math.max(...lines.map((line) => ctx.measureText(line).width))
  const needW = inkWidth + 2 * padX
  const needH = blockH + 2 * padY

  const scale = Math.min(dpr, MAX_CANVAS_PX / needW, MAX_CANVAS_PX / needH)
  const canvas = ctx.canvas
  canvas.width = Math.ceil(needW * scale)
  canvas.height = Math.ceil(needH * scale)

  // Re-applied: resizing the canvas resets the whole 2D state.
  ctx.scale(scale, scale)
  ctx.font = fontSpec(fontPx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#FFFFFF'
  lines.forEach((line, i) => {
    ctx.fillText(line, needW / 2, padY + capPxUnscaled + i * lineHeightPx)
  })

  // Where the glyphs really landed. The canvas is padded generously to clear
  // accents and descenders, so the padded box is a poor stand-in for the title
  // band — the rig needs the ink itself to keep the title above the card.
  const { inkTopPx, inkBottomPx } = measureInkRows(ctx, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.premultiplyAlpha = false
  texture.needsUpdate = true

  return {
    texture,
    widthPx: canvas.width,
    heightPx: canvas.height,
    lineCount: lines.length,
    capPx: capPxUnscaled * scale,
    emPx: fontPx * scale,
    inkTopPx,
    inkBottomPx,
  }
}

/** Scans the drawn alpha for the first and last rows carrying coverage. */
function measureInkRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { inkTopPx: number; inkBottomPx: number } {
  const { data } = ctx.getImageData(0, 0, width, height)
  const hasInk = (y: number): boolean => {
    const row = y * width * 4
    for (let x = 0; x < width; x += 3) {
      if (data[row + x * 4 + 3] > 8) return true
    }
    return false
  }
  let top = 0
  while (top < height && !hasInk(top)) top++
  let bottom = height - 1
  while (bottom > top && !hasInk(bottom)) bottom--
  return { inkTopPx: top, inkBottomPx: bottom }
}
