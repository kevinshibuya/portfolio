/**
 * Splits an element's text into individually animatable character spans while
 * preserving its nested element structure (e.g. `<em>` tags for accents).
 *
 * The element's original child nodes are walked; each word in a text node is
 * wrapped in an overflow-hidden container, characters are wrapped in spans,
 * and non-text elements are cloned with their own contents recursively split.
 *
 * Returns the flat list of character <span> elements for GSAP targeting.
 */
export function splitTextIntoChars(element: HTMLElement): HTMLSpanElement[] {
  // Compute aria-label from the pre-split textContent for a11y before we mutate.
  const aria = element.textContent?.replace(/\s+/g, ' ').trim() || ''
  element.setAttribute('aria-label', aria)

  const chars: HTMLSpanElement[] = []
  const originalNodes = Array.from(element.childNodes)
  element.textContent = ''

  for (const node of originalNodes) {
    appendNode(element, node, chars)
  }

  return chars
}

function appendNode(
  target: HTMLElement,
  node: Node,
  chars: HTMLSpanElement[],
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    appendText(target, node.textContent ?? '', chars)
    return
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const original = node as HTMLElement
    const clone = document.createElement(original.tagName.toLowerCase())
    // Preserve element attrs (e.g. class, style) so accent styling carries over.
    for (const attr of Array.from(original.attributes)) {
      clone.setAttribute(attr.name, attr.value)
    }
    target.appendChild(clone)
    for (const child of Array.from(original.childNodes)) {
      appendNode(clone, child, chars)
    }
  }
}

function appendText(
  target: HTMLElement,
  text: string,
  chars: HTMLSpanElement[],
): void {
  const words = text.split(/(\s+)/)
  words.forEach((segment) => {
    if (segment === '') return

    if (/^\s+$/.test(segment)) {
      const space = document.createElement('span')
      space.textContent = segment.replace(/\s/g, ' ')
      space.style.display = 'inline-block'
      target.appendChild(space)
      return
    }

    const wrapper = document.createElement('span')
    wrapper.style.display = 'inline-block'
    wrapper.style.overflow = 'hidden'
    wrapper.style.verticalAlign = 'top'
    wrapper.setAttribute('aria-hidden', 'true')

    for (const char of segment) {
      const charSpan = document.createElement('span')
      charSpan.textContent = char
      charSpan.style.display = 'inline-block'
      charSpan.style.willChange = 'transform, opacity'
      wrapper.appendChild(charSpan)
      chars.push(charSpan)
    }

    target.appendChild(wrapper)
  })
}
