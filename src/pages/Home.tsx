import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { Hero } from '../components/sections/Hero'
import { useLenis } from '../hooks/useLenis'
import { useMotion } from '../context/MotionContext'

// Below-the-fold sections lazy-load so the main JS chunk only carries Hero
// (the LCP target). After Hero mounts, an idle callback warms the chunks so
// they're ready by the time the user scrolls. The Suspense fallback reserves
// 100vh so a hyper-fast scroll doesn't snap through to the footer.
const Projects = lazy(() =>
  import('../components/sections/Projects').then((m) => ({ default: m.Projects }))
)
const Archive = lazy(() =>
  import('../components/sections/Archive').then((m) => ({ default: m.Archive }))
)
const WorkExperience = lazy(() =>
  import('../components/sections/WorkExperience').then((m) => ({ default: m.WorkExperience }))
)
const Skills = lazy(() =>
  import('../components/sections/Skills').then((m) => ({ default: m.Skills }))
)
const Stats = lazy(() =>
  import('../components/sections/Stats').then((m) => ({ default: m.Stats }))
)
const Contact = lazy(() =>
  import('../components/sections/Contact').then((m) => ({ default: m.Contact }))
)
const Footer = lazy(() =>
  import('../components/layout/Footer').then((m) => ({ default: m.Footer }))
)

const STORAGE_KEY = 'portfolio:home:scrollY'

export function Home() {
  const { scrollTo } = useLenis()
  const { bypassEntrance } = useMotion()

  useLayoutEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const y = parseInt(raw, 10)
    if (!Number.isFinite(y) || y <= 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    // Bypass the hero entrance BEFORE scroll restoration so the lock
    // doesn't latch.
    bypassEntrance()
    // Synchronous scroll before paint — must happen in useLayoutEffect.
    window.scrollTo(0, y)
    // Numeric target so Lenis snaps to the absolute Y; no offset trickery.
    scrollTo(y, { duration: 0 })
    sessionStorage.removeItem(STORAGE_KEY)
  }, [bypassEntrance, scrollTo])

  // Save scroll on unmount (i.e., when navigating away from Home).
  useEffect(() => {
    return () => {
      const y = window.scrollY
      if (y > 0) sessionStorage.setItem(STORAGE_KEY, String(y))
    }
  }, [])

  // Warm the lazy chunks at idle so the first scroll doesn't show a placeholder.
  // requestIdleCallback isn't in Safari yet — fall back to a 0ms timer.
  useEffect(() => {
    const warm = () => {
      void import('../components/sections/Projects')
      void import('../components/sections/Archive')
      void import('../components/sections/WorkExperience')
      void import('../components/sections/Skills')
      void import('../components/sections/Stats')
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
        <Archive />
        <WorkExperience />
        <Stats />
        <Skills />
        <Contact />
        <Footer />
      </Suspense>
    </main>
  )
}
