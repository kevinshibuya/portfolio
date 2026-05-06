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
})
