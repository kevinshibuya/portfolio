import type { ReactNode } from 'react'

// Single-pass tokenizer: walks the string and emits ReactNode tokens for
// **bold**, *italic*, [label](url), and plain text. No nested marks. Unmatched
// markers fall through as literal text.

const BOLD = /^\*\*([^*]+?)\*\*/
const ITALIC = /^\*([^*]+?)\*/
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/

export function parseInline(input: string): ReactNode[] {
  if (!input) return []

  const out: ReactNode[] = []
  let i = 0
  let buffer = ''
  let key = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      out.push(buffer)
      buffer = ''
    }
  }

  while (i < input.length) {
    const rest = input.slice(i)
    const ch = input[i]

    // Try BOLD before ITALIC because both start with `*`.
    if (ch === '*') {
      const mB = rest.match(BOLD)
      if (mB) {
        flushBuffer()
        out.push(<strong key={key++}>{mB[1]}</strong>)
        i += mB[0].length
        continue
      }
      const mI = rest.match(ITALIC)
      if (mI) {
        flushBuffer()
        out.push(<em key={key++}>{mI[1]}</em>)
        i += mI[0].length
        continue
      }
    }

    if (ch === '[') {
      const mL = rest.match(LINK)
      if (mL) {
        flushBuffer()
        out.push(
          <a
            key={key++}
            href={mL[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
          >
            {mL[1]}
          </a>
        )
        i += mL[0].length
        continue
      }
    }

    // Fall through — buffer this char as literal text.
    buffer += ch
    i++
  }

  flushBuffer()
  return out
}
