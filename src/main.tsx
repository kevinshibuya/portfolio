import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import './i18n'
import './index.css'
import App from './App.tsx'
import { MotionProvider, resolveCurtain, resolveEntrance } from './context/MotionContext'

// Take ownership of scroll restoration so the browser doesn't fight our
// per-route handling: full reload starts at top + plays the hero entrance
// fresh; in-tab back-navigation runs our useLayoutEffect-driven restore
// in Home.tsx. Without this, the browser's default 'auto' restoration
// races against our restore and against ProjectDetail's scroll-to-top.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

// sessionStorage persists across reloads in the same tab. On a hard reload
// we want a fresh hero entrance from the top, so wipe the saved Home
// scroll-Y. Only the back-forward and SPA-internal navs should preserve it.
try {
  const nav = performance.getEntriesByType?.('navigation')?.[0] as
    | PerformanceNavigationTiming
    | undefined
  if (nav?.type === 'reload' || nav?.type === 'navigate') {
    sessionStorage.removeItem('portfolio:home:scrollY')
  }
} catch {
  // performance.getEntriesByType isn't critical — fall through silently.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <App />
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Loader controller. The ink SVG loader in index.html paints at first byte;
// the ks. glyph windows show the stand-in gradient, then (post-mount) the live
// hero shader. We dissolve the ink with a GSAP stain bleed once React has
// painted + a min dwell has elapsed, then resolve the curtain + entrance gates.
gsap.registerPlugin(CustomEase)
CustomEase.create('house', '0.22,1,0.36,1') // idempotent; Hero also registers it

const reduceMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return false }
})()
const MIN_DWELL_MS = reduceMotion ? 200 : 600
const MAX_WAIT_MS = 3000

const loaderEl = document.getElementById('loader')
const startedAt = performance.now()
let lifted = false

// Stamp the loader gate for the scroll-lock CSS + e2e specs (Task 1). The
// hook useScrollLockDuringEntrance also drives this attribute; both writers
// converge on 'done' once resolveEntrance() fires.
document.body.dataset.loaderState = 'loading'

const finishLoader = (): void => {
  loaderEl?.remove()
  document.documentElement.removeAttribute('data-loading')
  document.body.dataset.loaderState = 'done'
  resolveCurtain()
  resolveEntrance()
}

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (!loaderEl) {
    // Defensive: no loader element (misconfigured deploy). Still release the
    // scroll lock so the page isn't frozen, and resolve both gates.
    document.documentElement.removeAttribute('data-loading')
    document.body.dataset.loaderState = 'done'
    resolveCurtain()
    resolveEntrance()
    return
  }
  if (reduceMotion) {
    // No bleed: fade the whole loader (CSS opacity 150ms), then remove.
    loaderEl.classList.add('loader--exit')
    window.setTimeout(finishLoader, 200)
    return
  }
  // Ink bleed: grow the stains in the SVG mask to fully dissolve the ink.
  const stains = loaderEl.querySelectorAll<SVGCircleElement>('.loader-stains circle')
  const ENDS = [55, 55, 55, 55, 50, 48]
  const DELAYS = [0, 0.08, 0.16, 0.1, 0.2, 0.26]
  if (stains.length === 0) {
    finishLoader()
    return
  }
  const tl = gsap.timeline({ onComplete: finishLoader })
  stains.forEach((c, i) => {
    tl.to(c, { attr: { r: ENDS[i] ?? 55 }, duration: 0.6, ease: 'house' }, DELAYS[i] ?? 0)
  })
}

// Hard fallback — always start the lift within MAX_WAIT.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

// After React has painted at least once (double rAF): reveal the live shader
// through the windows (fade the stand-in), then start the bleed after dwell.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    loaderEl?.classList.add('loader--mounted')
    const elapsed = performance.now() - startedAt
    window.setTimeout(liftCurtain, Math.max(0, MIN_DWELL_MS - elapsed))
  })
})
