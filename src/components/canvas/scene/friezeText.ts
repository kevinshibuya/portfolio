import en from '../../../i18n/locales/en.json'
import pt from '../../../i18n/locales/pt.json'
import { resolveTitle, type ArchiveItem } from '../../../types/content'
import { FRIEZE_CELL_H, FRIEZE_CELL_W } from '../../../utils/friezeLayout'
import { TEXT_FAMILY } from './textTexture'

export const CELL_TITLE_WORLD = 0.06
export const CELL_MUTED_WORLD = 0.04
export const CELL_INSET_WORLD = 0.03
export const CELL_LINE_HEIGHT = 1.2
export const COVERAGE_CHANNEL = { title: 0, meta: 1, serial: 1 } as const

export interface CellText {
  title: string
  meta: string
  serial: string
}

/** Structural subset accepts a real canvas or an injected measuring context. */
export interface MeasuringContext {
  font: string
  measureText(text: string): { width: number }
}

export interface CellTextRun {
  text: string
  role: keyof typeof COVERAGE_CHANNEL
  x: number
  y: number
  fontPx: number
  weight: number
  /** Disjoint line boxes, also used to clip accent/descender overshoot. */
  clip: { x: number; y: number; width: number; height: number }
}

export function cellText(piece: ArchiveItem, lang: 'en' | 'pt'): CellText {
  const origin = { en, pt }[lang].sections.archive.origin
  const meta = piece.caseStudy
    ? piece.origin === 'professional' ? '' : origin[piece.origin]
    : `${piece.type ?? ''} · ${piece.editorial ?? ''} · ${piece.date.replace(/\//g, '.')}`.toLowerCase()
  return { title: resolveTitle(piece, lang), meta, serial: String(piece.serial) }
}

/** Whole words only; an indivisible overlong token becomes the ellipsis alone. */
export function wrapWords(
  ctx: MeasuringContext, text: string, maxWidthPx: number, maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  while (words.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      if (ctx.measureText(words.join(' ')).width <= maxWidthPx) {
        lines.push(words.join(' '))
      } else {
        while (words.length && ctx.measureText(words.join(' ') + '…').width > maxWidthPx) words.pop()
        lines.push(words.join(' ') + '…')
      }
      break
    }
    let take = 0
    while (take < words.length && ctx.measureText(words.slice(0, take + 1).join(' ')).width <= maxWidthPx) take++
    lines.push(take ? words.splice(0, take).join(' ') : '…')
    if (!take) words.shift()
  }
  return lines
}

/** Pure measured positions in texture pixels; restores the measuring context's font. */
export function layoutCellText(
  ctx: MeasuringContext,
  text: CellText,
  density: number,
  options: { caseStudy?: boolean; topOffsetWorld?: number } = {},
): CellTextRun[] {
  const previousFont = ctx.font
  const runs: CellTextRun[] = []
  const inset = CELL_INSET_WORLD * density
  const width = ((options.caseStudy ? 2 : 1) * FRIEZE_CELL_W - 2 * CELL_INSET_WORLD) * density
  let top = inset + (options.topOffsetWorld ?? 0) * density
  const add = (value: string, role: CellTextRun['role'], fontPx: number, weight: number, x = inset): void => {
    const height = fontPx * CELL_LINE_HEIGHT
    runs.push({ text: value, role, x, y: top + height / 2, fontPx, weight,
      clip: { x: inset, y: top, width, height } })
  }
  try {
    if (!options.caseStudy) {
      ctx.font = `600 ${CELL_TITLE_WORLD * density}px ${TEXT_FAMILY}`
      for (const line of wrapWords(ctx, text.title, width, 2)) {
        add(line, 'title', CELL_TITLE_WORLD * density, 600)
        top += CELL_TITLE_WORLD * density * CELL_LINE_HEIGHT
      }
      ctx.font = `500 ${CELL_MUTED_WORLD * density}px ${TEXT_FAMILY}`
      for (const line of wrapWords(ctx, text.meta, width, 1)) {
        add(line, 'meta', CELL_MUTED_WORLD * density, 500)
        top += CELL_MUTED_WORLD * density * CELL_LINE_HEIGHT
      }
    } else {
      // The card owns its title and meta. Only its bottom serial strip is masked.
      top = (2 * FRIEZE_CELL_H - CELL_INSET_WORLD - CELL_MUTED_WORLD * CELL_LINE_HEIGHT) * density
    }
    const fontPx = CELL_MUTED_WORLD * density
    ctx.font = `500 ${fontPx}px ${TEXT_FAMILY}`
    const advance = Math.max(...Array.from({ length: 10 }, (_, i) => ctx.measureText(String(i)).width))
    Array.from(text.serial).forEach((digit, i) => add(digit, 'serial', fontPx, 500, inset + i * advance))
    return runs
  } finally {
    ctx.font = previousFont
  }
}
