// Tiny helper for per-route <title> and <meta name="description"> management
// without pulling in react-helmet. The original (homepage) values are
// captured on first call so ProjectDetail can set per-project metadata and
// Home can restore the defaults when the user navigates back.

let originalTitle: string | null = null
let originalDescription: string | null = null

function snapshot(): void {
  if (originalTitle === null) {
    originalTitle = document.title
  }
  if (originalDescription === null) {
    const meta = document.querySelector('meta[name="description"]')
    originalDescription = meta?.getAttribute('content') ?? null
  }
}

function writeDescription(content: string): void {
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', content)
}

export function setPageMeta(title: string, description: string): void {
  snapshot()
  document.title = title
  writeDescription(description)
}

export function resetPageMeta(): void {
  snapshot()
  if (originalTitle !== null) document.title = originalTitle
  if (originalDescription !== null) writeDescription(originalDescription)
}
