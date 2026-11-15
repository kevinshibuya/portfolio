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

/** Desk names the spreadsheet spells without their accent. */
const EDITORIAL_SPELLING: Readonly<Record<string, string>> = {
  Saude: 'Saúde',
}

/**
 * Splits one semicolon-delimited CSV line into fields. A field wrapped in
 * double quotes may contain semicolons, and `""` inside it is a literal quote.
 */
function splitLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"' && field === '') {
      quoted = true
    } else if (ch === ';') {
      fields.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

/**
 * A headline as it should read in a list: no quotes around the whole of it,
 * typographic quotes around a quoted name inside it, no trailing separator.
 */
function cleanTitle(raw: string): string {
  let title = raw.trim().replace(/[;\s]+$/, '')
  if (title.startsWith('"') && title.endsWith('"') && title.indexOf('"', 1) === title.length - 1) {
    title = title.slice(1, -1)
  }
  return title.replace(/"([^"]+)"/g, '“$1”')
}

function parseEmbeds(csv: string): Embed[] {
  const lines = csv.trim().split(/\r?\n/)
  // The first line is the header row.
  return lines.slice(1).reduce<Embed[]>((acc, line) => {
    const cols = splitLine(line)
    if (cols.length < 6) return acc

    const type = cols[3].trim()
    if (!isEmbedType(type)) return acc

    const title = cleanTitle(cols[5])
    if (!title) return acc

    const editorial = cols[1].trim()
    acc.push({
      publicationDate: cols[0].trim(),
      editorial: EDITORIAL_SPELLING[editorial] ?? editorial,
      type,
      link: cols[4].trim(),
      title,
    })
    return acc
  }, [])
}

export const embeds: Embed[] = parseEmbeds(rawCsv)
