// Tiny helper for per-route <title>, <meta name="description"> and the page's
// own address (canonical link, og:url) without pulling in react-helmet. The original (homepage) values are
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

/** The site's public origin: a page's canonical address never depends on the host that served it. */
const ORIGIN = 'https://kevinshibuya.com'

/** Each page names itself: without this every route would declare the home page as its canonical address. */
function writeAddress(): void {
  const path = window.location.pathname.replace(/\/+$/, '')
  const url = `${ORIGIN}${path || '/'}`
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', url)
}

export function setPageMeta(title: string, description: string): void {
  snapshot()
  document.title = title
  writeDescription(description)
  writeAddress()
}

export function resetPageMeta(): void {
  snapshot()
  if (originalTitle !== null) document.title = originalTitle
  if (originalDescription !== null) writeDescription(originalDescription)
  writeAddress()
}
