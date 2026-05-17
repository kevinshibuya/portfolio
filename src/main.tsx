import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.tsx'
import { MotionProvider, resolveCurtain } from './context/MotionContext'

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

// Curtain controller. The loader in index.html paints at first frame
// (LCP candidate locked there). We lift the curtain when BOTH:
//   (a) React has mounted and committed at least one paint (double rAF), AND
//   (b) a minimum dwell has elapsed (so even instant React mounts on cached
//       reloads still show the loader long enough to be perceived).
// A 3 s hard fallback always lifts the curtain even if React stalls.
//
// After lifting:
//   1. .loader--exit class triggers the CSS transitions (panels slide apart
//      over 600 ms, or 150 ms opacity fade under prefers-reduced-motion).
//   2. setTimeout removes the loader element from the DOM.
//   3. resolveCurtain() flips the MotionContext signal that HeroNameDrawing
//      awaits before starting its trace animation.
const reduceMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return false }
})()
const MIN_DWELL_MS = reduceMotion ? 200 : 600
const MAX_WAIT_MS = 3000
// MUST match .loader-half transition-duration in src/index.css (and the
// reduced-motion #loader opacity transition there). If the CSS changes,
// update this number too — otherwise the loader is removed mid-transition.
const TRANSITION_MS = reduceMotion ? 150 : 600

const loaderEl = document.getElementById('loader')
const startedAt = performance.now()
let lifted = false

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (loaderEl) {
    loaderEl.classList.add('loader--exit')
    window.setTimeout(() => {
      loaderEl.remove()
      document.documentElement.removeAttribute('data-loading')
      resolveCurtain()
    }, TRANSITION_MS + 50)
  } else {
    // No loader element (defensive): still resolve the curtain so the hero
    // entrance doesn't stall in a misconfigured deploy.
    resolveCurtain()
  }
}

// Hard fallback — always lift within MAX_WAIT, no matter what.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

// Schedule the normal lift: after React has painted at least once
// (double rAF) AND min-dwell has elapsed.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - startedAt
    const remaining = Math.max(0, MIN_DWELL_MS - elapsed)
    window.setTimeout(liftCurtain, remaining)
  })
})
