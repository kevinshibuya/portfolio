import type { ReactNode } from 'react'

// Single-pass tokenizer: walks the string and emits ReactNode tokens for
// **bold**, *italic*, [label](url), and plain text. No nested marks. Unmatched
// markers fall through as literal text.

// Bold/italic require a non-space, non-asterisk character at the inner edges.
// Without that guard, stray asterisks in editorial prose like "10* e 5* vezes"
// or "a ** padded ** b" would silently render as <em>/<strong>. The
// (?:[^*]*?[^\s*])? form keeps single-char marks like *x* working.
const BOLD = /^\*\*([^\s*](?:[^*]*?[^\s*])?)\*\*/
const ITALIC = /^\*([^\s*](?:[^*]*?[^\s*])?)\*/

// URLs with literal `)` aren't supported (e.g. Wikipedia titles like
// `https://en.wikipedia.org/wiki/Foo_(bar)`); they fall through as literal text.
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
