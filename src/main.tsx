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
