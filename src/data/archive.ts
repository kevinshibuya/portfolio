import { projects } from './projects'
import { embeds } from './embeds'
import type { Embed, EmbedType, Project } from '../types/content'

/** Case studies in the site's own ranking, first to last. */
export const rankedProjects: Project[] = [...projects].sort((a, b) => a.order - b.order)

export interface ArchiveEntry extends Embed {
  /** Epoch ms of the publication date, 0 when the date is malformed. */
  sortDate: number
  year: number
  /** dd.mm */
  day: string
}

function parseDate(ddmmyyyy: string): number {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  const [, dd, mm, yyyy] = m
  const t = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime()
  return Number.isFinite(t) ? t : 0
}

/** Every newsroom interactive, newest first. */
export const interactives: ArchiveEntry[] = embeds
  .map((embed) => {
    const sortDate = parseDate(embed.publicationDate)
    const [dd, mm] = embed.publicationDate.split('/')
    return {
      ...embed,
      sortDate,
      year: new Date(sortDate).getUTCFullYear(),
      day: dd && mm ? `${dd}.${mm}` : embed.publicationDate,
    }
  })
  .sort((a, b) => b.sortDate - a.sortDate)

export interface YearBlock {
  year: number
  items: ArchiveEntry[]
}

export function yearBlocks(items: readonly ArchiveEntry[]): YearBlock[] {
  const byYear = new Map<number, ArchiveEntry[]>()
  for (const item of items) {
    const block = byYear.get(item.year)
    if (block) block.push(item)
    else byYear.set(item.year, [item])
  }
  return [...byYear.entries()].sort(([a], [b]) => b - a).map(([year, pieces]) => ({ year, items: pieces }))
}

/** Interactive types present in the archive, most frequent first, with their counts. */
export const typeCounts: { type: EmbedType; count: number }[] = (() => {
  const counts = new Map<EmbedType, number>()
  for (const item of interactives) counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }))
})()

/** The one count the whole site quotes. */
export const ARCHIVE_TOTALS = {
  caseStudies: projects.length,
  interactives: interactives.length,
  pieces: projects.length + interactives.length,
  firstYear: Math.min(...projects.map((p) => p.year), ...interactives.map((i) => i.year)),
  lastYear: Math.max(...projects.map((p) => p.year), ...interactives.map((i) => i.year)),
} as const
