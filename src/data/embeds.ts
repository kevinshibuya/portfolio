import type { Embed, EmbedType } from '../types/content'
import rawCsv from './embeds.csv?raw'

const VALID_TYPES: ReadonlySet<string> = new Set<EmbedType>([
  'SIMULADOR',
  'MAPA INTERATIVO',
  'QUIZ',
  'CALCULADORA',
  'INFOGRAFICO',
  'BUSCADOR',
  'GALERIA',
])

function isEmbedType(value: string): value is EmbedType {
  return VALID_TYPES.has(value)
}

function cleanTitle(raw: string): string {
  // Strip surrounding """ wrapping from CSV
  let title = raw.trim()
  if (title.startsWith('"""') && title.endsWith('"""')) {
    title = title.slice(3, -3)
  } else if (title.startsWith('"') && title.endsWith('"')) {
    title = title.slice(1, -1)
  }
  return title
}

function parseEmbeds(csv: string): Embed[] {
  const lines = csv.trim().split('\n')
  // Skip header row
  return lines.slice(1).reduce<Embed[]>((acc, line) => {
    const cols = line.split(';')
    if (cols.length < 6) return acc

    const type = cols[3].trim()
    if (!isEmbedType(type)) return acc

    const title = cleanTitle(cols[5])
    if (!title) return acc

    acc.push({
      publicationDate: cols[0].trim(),
      editorial: cols[1].trim(),
      type,
      link: cols[4].trim(),
      title,
    })
    return acc
  }, [])
}

export const embeds: Embed[] = parseEmbeds(rawCsv)

export const embedTypes: EmbedType[] = [
  ...new Set(embeds.map((e) => e.type)),
].sort() as EmbedType[]

export const editorialCategories: string[] = [
  ...new Set(embeds.map((e) => e.editorial)),
].sort()
