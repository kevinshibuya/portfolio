import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.tsx'
import { MotionProvider } from './context/MotionContext'

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

// Remove the static pre-paint LCP <h1> once React has mounted. Lighthouse's
// LCP is locked at the first paint of that h1 (per W3C LCP spec, removing
// the LCP element from the DOM doesn't change the metric), so it's safe to
// take it out as soon as the real hero is in the tree. Double rAF + a tiny
// timeout ensures the browser had at least one paint with the prepaint
// element rendered, so the LCP candidate is reliably recorded. The CSS
// `transition: opacity 220ms` on #lcp-prepaint smooths the disappearance
// into the SVG ink-draw entrance that's beginning at the same moment.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const prepaint = document.getElementById('lcp-prepaint')
    if (!prepaint) return
    prepaint.style.opacity = '0'
    setTimeout(() => prepaint.remove(), 260)
  })
})
