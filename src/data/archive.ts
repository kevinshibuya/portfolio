import { projects } from './projects'
import { embeds } from './embeds'
import type { ArchiveItem, Embed, Project } from '../types/content'

type UnsortedArchiveItem = Omit<ArchiveItem, 'year' | 'serial'>

function parseEditorialDate(ddmmyyyy: string): number {
  // Expect 'dd/mm/yyyy'. Returns epoch ms; falls back to 0 on malformed input
  // (bad shape, or semantically invalid like month=13 / day=32 → NaN).
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  const [, dd, mm, yyyy] = m
  const t = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime()
  return Number.isFinite(t) ? t : 0
}

function fromProjects(source: readonly Project[]): UnsortedArchiveItem[] {
  return source.map((p) => ({
    id: `featured-${p.id}`,
    title: p.title,
    origin: p.origin ?? 'professional',
    caseStudy: { slug: p.slug },
    date: String(p.year),
    sortDate: new Date(`${p.year}-12-31T00:00:00Z`).getTime(),
    href: `/projects/${p.slug}`,
    internal: true,
  }))
}

function fromEmbeds(source: readonly Embed[]): UnsortedArchiveItem[] {
  return source.map((e, i) => ({
    id: `editorial-${i}`,
    title: e.title,
    origin: 'professional',
    type: e.type,
    editorial: e.editorial,
    date: e.publicationDate,
    sortDate: parseEditorialDate(e.publicationDate),
    href: e.link,
    internal: false,
  }))
}

export function deriveArchive(
  sourceProjects: readonly Project[],
  sourceEmbeds: readonly Embed[],
): ArchiveItem[] {
  const items = [...fromProjects(sourceProjects), ...fromEmbeds(sourceEmbeds)]
  return items
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .sort((a, b) =>
      b.item.sortDate - a.item.sortDate ||
      Number(b.item.caseStudy !== undefined) - Number(a.item.caseStudy !== undefined) ||
      a.sourceIndex - b.sourceIndex
    )
    .map(({ item }, index) => ({
      ...item,
      year: new Date(item.sortDate).getUTCFullYear(),
      serial: items.length - index,
    }))
}

export const archive: ArchiveItem[] = deriveArchive(projects, embeds)

export function yearBlocks(
  items: readonly ArchiveItem[],
): { year: number; count: number; items: ArchiveItem[] }[] {
  const byYear = new Map<number, ArchiveItem[]>()
  for (const item of items) {
    const block = byYear.get(item.year)
    if (block) block.push(item)
    else byYear.set(item.year, [item])
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, pieces]) => ({ year, count: pieces.length, items: pieces }))
}
