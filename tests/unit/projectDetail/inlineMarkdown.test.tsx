import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseInline } from '../../../src/components/projectDetail/inlineMarkdown'

function html(text: string): string {
  return renderToStaticMarkup(<>{parseInline(text)}</>)
}

describe('parseInline', () => {
  it('renders plain text untouched', () => {
    expect(html('hello world')).toBe('hello world')
  })

  it('renders **bold** as <strong>', () => {
    expect(html('a **bold** b')).toBe('a <strong>bold</strong> b')
  })

  it('renders *italic* as <em>', () => {
    expect(html('a *italic* b')).toBe('a <em>italic</em> b')
  })

  it('renders [label](url) as anchor with target=_blank', () => {
    expect(html('go to [home](https://x.test)')).toBe(
      'go to <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">home</a>'
    )
  })

  it('handles multiple marks in one string', () => {
    expect(html('**bold** and *italic* and [link](https://x.test)')).toBe(
      '<strong>bold</strong> and <em>italic</em> and <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">link</a>'
    )
  })

  it('renders unmatched markers as literal text', () => {
    expect(html('a *missing close')).toBe('a *missing close')
    expect(html('[label](missing-paren')).toBe('[label](missing-paren')
  })

  it('returns empty array for empty string', () => {
    expect(parseInline('')).toEqual([])
  })

  it('does not treat ** as inline italic followed by another *', () => {
    expect(html('**a**')).toBe('<strong>a</strong>')
  })

  it('does not italicise space-padded asterisks (e.g. "10* e 5* vezes")', () => {
    expect(html('10* e 5* vezes')).toBe('10* e 5* vezes')
  })

  it('does not bold space-padded double-asterisks (e.g. "** lonely **")', () => {
    expect(html('a ** padded ** b')).toBe('a ** padded ** b')
  })

  it('renders `code` as <code>', () => {
    expect(html('use `?edit=1` flag')).toBe(
      'use <code>?edit=1</code> flag'
    )
  })

  it('handles backticks alongside bold, italic, and link', () => {
    expect(html('**A** `code` *italic* [link](https://x.test)')).toBe(
      '<strong>A</strong> <code>code</code> <em>italic</em> <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">link</a>'
    )
  })

  it('treats unmatched backtick as literal', () => {
    expect(html('a `missing close')).toBe('a `missing close')
  })

  it('does not parse code inside an already-matched bold span', () => {
    // Bold matches first; the backticks inside are literal.
    expect(html('**`literal`**')).toBe('<strong>`literal`</strong>')
  })
})
