import { lazy, Suspense } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { AboutFallback } from '../ui/AboutFallback'

// Lazy-load the canvas branch so mobile users never download the R3F bundle.
// The canvas module is implemented in a later task; until then this import
// resolves to a tiny stub that just renders the fallback.
const AboutScene = lazy(() =>
  import('../canvas/AboutScene').then((m) => ({ default: m.AboutScene })),
)

const ABOUT_BREAKPOINT = '(max-width: 900px)'

export function About() {
  const reduced = useReducedMotion() ?? false
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
