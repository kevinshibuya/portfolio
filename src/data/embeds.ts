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

export const typeGradients: Record<EmbedType, string> = {
  'SIMULADOR':       'linear-gradient(135deg, #A2D2FF, #3A96E8)',
  'MAPA INTERATIVO': 'linear-gradient(135deg, #C8D8F0, #8AAADA)',
  'QUIZ':            'linear-gradient(135deg, #DCF0FF, #6DB8FF)',
  'CALCULADORA':     'linear-gradient(135deg, #D4E5F2, #6A8CAA)',
  'INFOGRAFICO':     'linear-gradient(135deg, #111822, #2A4060)',
  'BUSCADOR':        'linear-gradient(135deg, #6DB8FF, #1C6EC4)',
  'GALERIA':         'linear-gradient(135deg, #8AAADA, #5078B8)',
}
