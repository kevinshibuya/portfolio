import type { ArchiveItem } from '../../../types/content'
import { resolveTitle } from '../../../types/content'
import en from '../../../i18n/locales/en.json'
import pt from '../../../i18n/locales/pt.json'

/**
 * What a frieze cell says, and how its lines are measured onto the wall.
 *
 * Presentation only: the strings a cell carries (title, one meta line, a
 * serial), the world-unit sizes they are set at, and the measured wrapping
 * rules (Q7). Nothing here touches a canvas; `friezeTexture.ts` draws what
 * these functions return, at whatever density the dolly needs.
 *
 * Bilingual from the first commit (ADR 0001): the origin words come from the
 * shared locale keys `sections.archive.origin.*`, the same pairs the DOM
 * stream reads, so the wall and the stream cannot drift apart.
 */

/** Title em, in world units: 17.28 CSS px at the 288 px/world reading floor. */
export const CELL_TITLE_WORLD = 0.06
/** Meta and serial em, in world units: 11.52 CSS px at the floor. */
export const CELL_META_WORLD = 0.04
/** Ink inset from every cell edge, in world units. */
export const CELL_INSET_WORLD = 0.03
export const CELL_LINE_HEIGHT = 1.2
export const CELL_TITLE_WEIGHT = 600
export const CELL_META_WEIGHT = 500
export const CELL_TITLE_MAX_LINES = 2
/**
 * The year count's line, one meta line tall. It sits in a block's first
 * column at the top inset (Q7); a 0.03 inset cannot hold a 0.04 em, so that
 * one cell's own text starts below the band instead. Pointer hits inside the
 * band are not a cell (Task 5).
 */
export const YEAR_COUNT_BAND_WORLD = CELL_META_WORLD * CELL_LINE_HEIGHT

const ELLIPSIS = '…'
const META_SEPARATOR = ' · '

export interface CellText {
  title: string
  /** One line: `type · editorial · dd.mm.yyyy`, an origin word, or empty. */
  meta: string
  /** Unpadded decimal digits. */
  serial: string
}

/** Text width in whatever px the caller measures in. */
export type Measure = (text: string) => number

type Lang = 'en' | 'pt'

const ORIGIN_LABELS: Record<Lang, { freelance: string; personal: string }> = {
  en: en.sections.archive.origin,
  pt: pt.sections.archive.origin,
}

/** `dd/mm/yyyy` becomes `dd.mm.yyyy`; anything else is shown as stored. */
function dottedDate(date: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
  return m ? `${m[1]}.${m[2]}.${m[3]}` : date
}

export function cellText(piece: ArchiveItem, lang: Lang): CellText {
  const title = resolveTitle(piece, lang)
  const serial = String(piece.serial)
  if (piece.caseStudy !== undefined) {
    const meta = piece.origin === 'professional' ? '' : ORIGIN_LABELS[lang][piece.origin]
    return { title, meta, serial }
  }
  const parts = [piece.type ?? '', piece.editorial ?? '']
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  parts.push(dottedDate(piece.date))
  return { title, meta: parts.join(META_SEPARATOR), serial }
}

/**
 * Trims whole trailing words from `words` until the line, with an ellipsis
 * hung on it, fits. A single word that does not fit even alone leaves the
 * ellipsis by itself: a cell never breaks a word.
 */
function ellipsiseWords(measure: Measure, words: readonly string[], maxPx: number): string {
  for (let keep = words.length; keep > 0; keep--) {
    // A separator left dangling before the ellipsis reads as a typo.
    if (words[keep - 1] === META_SEPARATOR.trim()) continue
    const candidate = words.slice(0, keep).join(' ') + ELLIPSIS
    if (measure(candidate) <= maxPx) return candidate
  }
  return ELLIPSIS
}

/**
 * Greedy wrap at word boundaries to at most two lines. Overflow past the last
 * line removes whole trailing words and hangs an ellipsis; a token wider than
 * the line is replaced by an ellipsis alone and nothing follows it.
 */
export function wrapTitle(measure: Measure, title: string, maxPx: number): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current: string[] = []
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const isLastLine = lines.length === CELL_TITLE_MAX_LINES - 1
    if (measure(word) > maxPx) {
      // Indivisible and too wide: the ellipsis stands alone and ends the title.
      if (current.length && !isLastLine) lines.push(current.join(' '))
      lines.push(ELLIPSIS)
      return lines
    }
    const candidate = [...current, word]
    if (current.length === 0 || measure(candidate.join(' ')) <= maxPx) {
      current = candidate
      continue
    }
    if (!isLastLine) {
      lines.push(current.join(' '))
      current = [word]
      continue
    }
    // The last line is full and words remain: keep whole words, hang an ellipsis.
    lines.push(ellipsiseWords(measure, current, maxPx))
    return lines
  }
  if (current.length) lines.push(current.join(' '))
  return lines
}

/** One line, whole-word ellipsis. */
export function fitMeta(measure: Measure, meta: string, maxPx: number): string {
  if (!meta) return meta
  if (measure(meta) <= maxPx) return meta
  const words = meta.split(' ')
  // Drop at least one word: the whole line is already known not to fit.
  return ellipsiseWords(measure, words.slice(0, -1), maxPx)
}

/**
 * The advance every serial digit is drawn at: the widest of the ten, so
 * serials line up without relying on Canvas2D honouring tabular figures.
 */
export function digitAdvance(measure: Measure): number {
  let widest = 0
  for (let d = 0; d < 10; d++) widest = Math.max(widest, measure(String(d)))
  return widest
}
