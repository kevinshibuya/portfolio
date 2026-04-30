import { Suspense, lazy, useEffect } from 'react'
import { Hero } from '../components/sections/Hero'

// Below-the-fold sections lazy-load so the main JS chunk only carries Hero
// (the LCP target). After Hero mounts, an idle callback warms the chunks so
// they're ready by the time the user scrolls. The Suspense fallback reserves
// 100vh so a hyper-fast scroll doesn't snap through to the footer.
const Projects = lazy(() =>
  import('../components/sections/Projects').then((m) => ({ default: m.Projects }))
)
const EmbedsGallery = lazy(() =>
  import('../components/sections/EmbedsGallery').then((m) => ({ default: m.EmbedsGallery }))
)
const WorkExperience = lazy(() =>
  import('../components/sections/WorkExperience').then((m) => ({ default: m.WorkExperience }))
)
const Skills = lazy(() =>
  import('../components/sections/Skills').then((m) => ({ default: m.Skills }))
)
const Contact = lazy(() =>
  import('../components/sections/Contact').then((m) => ({ default: m.Contact }))
)
const Footer = lazy(() =>
  import('../components/layout/Footer').then((m) => ({ default: m.Footer }))
)

export function Home() {
  // Warm the lazy chunks at idle so the first scroll doesn't show a placeholder.
  // requestIdleCallback isn't in Safari yet — fall back to a 0ms timer.
  useEffect(() => {
    const warm = () => {
      void import('../components/sections/Projects')
      void import('../components/sections/EmbedsGallery')
      void import('../components/sections/WorkExperience')
      void import('../components/sections/Skills')
      void import('../components/sections/Contact')
      void import('../components/layout/Footer')
    }
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (typeof ric === 'function') {
      ric(warm, { timeout: 2000 })
    } else {
      setTimeout(warm, 0)
    }
  }, [])

  return (
    <main>
      <Hero />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-hidden />}>
        <Projects />
        <EmbedsGallery />
        <WorkExperience />
        <Skills />
        <Contact />
        <Footer />
      </Suspense>
    </main>
  )
}
