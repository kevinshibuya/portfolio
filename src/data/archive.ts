import { projects } from './projects'
import { embeds, typeGradients } from './embeds'
import type { ArchiveItem, EmbedType } from '../types/content'

function parseEditorialDate(ddmmyyyy: string): number {
  // Expect 'dd/mm/yyyy'. Returns epoch ms; falls back to 0 on malformed input
  // (bad shape, or semantically invalid like month=13 / day=32 → NaN).
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  const [, dd, mm, yyyy] = m
  const t = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime()
  return Number.isFinite(t) ? t : 0
}

function fromProjects(): ArchiveItem[] {
  return projects.map((p) => ({
    id: `featured-${p.id}`,
    kind: 'featured' as const,
    title: p.title,
    date: String(p.year),
    sortDate: new Date(`${p.year}-12-31T00:00:00Z`).getTime(),
    href: `/projects/${p.slug}`,
    internal: true,
    gradient: p.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
  }))
}

function fromEmbeds(): ArchiveItem[] {
  return embeds.map((e, i) => ({
    id: `editorial-${i}`,
    kind: 'editorial' as const,
    title: e.title,
    type: e.type,
    editorial: e.editorial,
    date: e.publicationDate,
    sortDate: parseEditorialDate(e.publicationDate),
    href: e.link,
    internal: false,
    gradient: typeGradients[e.type],
  }))
}

export const archive: ArchiveItem[] = [...fromProjects(), ...fromEmbeds()].sort(
  (a, b) => b.sortDate - a.sortDate
)

export const archiveTypes: EmbedType[] = [
  ...new Set(
    archive
      .filter((i) => i.kind === 'editorial' && i.type)
      .map((i) => i.type as EmbedType)
  ),
].sort() as EmbedType[]

export const archiveEditorials: string[] = [
  ...new Set(
    archive
      .filter((i) => i.kind === 'editorial' && i.editorial)
      .map((i) => i.editorial as string)
  ),
].sort()

export const archiveYears: number[] = [
  ...new Set(
    archive
      .map((i) => new Date(i.sortDate).getUTCFullYear())
      // Skip the epoch-0 fallback (year 1970) and any NaN that slipped through.
      .filter((y) => Number.isFinite(y) && y > 1970)
  ),
].sort((a, b) => b - a)

export const archiveKinds: ArchiveItem['kind'][] = [
  ...new Set(archive.map((i) => i.kind)),
].sort()
