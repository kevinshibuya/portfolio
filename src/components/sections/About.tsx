import { lazy, Suspense } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { AboutFallback } from '../ui/AboutFallback'

// Lazy-load the canvas branch so mobile + reduced-motion users never execute
// the R3F bundle. They still see <AboutFallback /> via the Suspense fallback
// during any in-flight chunk request, but the canvas code never runs.
const AboutScene = lazy(() =>
  import('../canvas/AboutScene').then((m) => ({ default: m.AboutScene })),
)

const ABOUT_BREAKPOINT = '(max-width: 900px)'

export function About() {
  // Treat the unresolved (null) state of useReducedMotion as "prefer reduced".
  // On first render `useReducedMotion()` returns null; the next render returns
  // the user's actual preference. Coercing null -> true keeps the orchestrator
  // on the cheap fallback path during that one paint, so reduced-motion users
  // never trigger the R3F lazy chunk download for a canvas they will not see.
  const reduced = useReducedMotion() !== false
  const isMobile = useMediaQuery(ABOUT_BREAKPOINT)

  if (reduced || isMobile) {
    return <AboutFallback />
  }

  return (
    <Suspense fallback={<AboutFallback />}>
      <AboutScene />
    </Suspense>
  )
}
