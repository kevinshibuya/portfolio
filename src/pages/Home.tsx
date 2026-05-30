import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/sections/Hero'
import { useLenis } from '../hooks/useLenis'
import { useMotion } from '../context/MotionContext'
import { resetPageMeta } from '../utils/pageMeta'

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
  const location = useLocation()
  // Capture location.state once at mount via a ref so it doesn't appear in the
  // effect's dep array. Calling navigate(replace) to clear the state instead
  // would mutate location.state, re-fire the effect, and cancel the in-flight
  // ResizeObserver before the target section mounts.
  const navTargetRef = useRef<string | undefined>(
    (location.state as { scrollToId?: string } | null)?.scrollToId,
  )

  useLayoutEffect(() => {
    // Header off-route nav hands us a target section via location.state.
    // Section is lazy-loaded, so poll the document for the element to mount
    // (ResizeObserver as document height grows) before scrolling. Clear the
    // saved scrollY so it doesn't fight us.
    const targetId = navTargetRef.current
    if (targetId) {
      navTargetRef.current = undefined
      sessionStorage.removeItem(STORAGE_KEY)
      bypassEntrance()

      let cancelled = false
      let observer: ResizeObserver | null = null
      let timeoutId: number | null = null

      const cleanup = (): void => {
        cancelled = true
        observer?.disconnect()
        if (timeoutId !== null) window.clearTimeout(timeoutId)
      }

      const apply = (): boolean => {
        if (cancelled) return false
        const el = document.getElementById(targetId)
        if (!el) return false
        scrollTo(`#${targetId}`, { duration: 0.8 })
        return true
      }

      if (apply()) {
        cleanup()
        return
      }

      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          if (cancelled) return
          if (apply()) cleanup()
        })
        observer.observe(document.documentElement)
      }
      timeoutId = window.setTimeout(cleanup, 1500)
      return cleanup
    }

    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const y = parseInt(raw, 10)
    if (!Number.isFinite(y) || y <= 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    // Bypass the hero entrance BEFORE scroll restoration so the lock
    // doesn't latch and the user doesn't see the trace replay.
    bypassEntrance()

    // Below-the-fold sections are Suspense-wrapped lazy chunks. On Home
    // re-mount the document may be only ~200vh tall while chunks resolve,
    // so a single window.scrollTo(0, y) past the placeholder clamps to
    // max-scroll. Apply once, then re-apply each time the document grows
    // (ResizeObserver) until y is reachable, capped by a short timeout.
    //
    // No user-input cancel: macOS swipe-back gestures fire wheel events
    // that would trip the cancel and abort restore before chunks load.
    // The retry window is short enough (≤500ms) that if a user scrolls
    // immediately they'll see at most one or two corrective scrolls.
    let cancelled = false
    let observer: ResizeObserver | null = null
    let timeoutId: number | null = null

    const cleanup = (): void => {
      cancelled = true
      observer?.disconnect()
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      sessionStorage.removeItem(STORAGE_KEY)
    }

    const apply = (): boolean => {
      if (cancelled) return false
      window.scrollTo(0, y)
      scrollTo(y, { immediate: true, force: true })
      return window.scrollY >= y
    }

    if (apply()) {
      cleanup()
      return
    }

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (cancelled) return
        if (apply()) cleanup()
      })
      observer.observe(document.documentElement)
    }
    // After ~500ms the chunks should have settled; let the user own scroll
    // beyond that even if the target was never reached.
    timeoutId = window.setTimeout(cleanup, 500)

    return cleanup
  }, [bypassEntrance, scrollTo])

  // Continuously mirror Home's scrollY into sessionStorage. This is more
  // robust than saving in a useEffect cleanup: cleanup can run after
  // ProjectDetail's window.scrollTo(0, 0), capturing the wrong value, and
  // unmount timing under React 19 + concurrent nav is not guaranteed to
  // run before the new route's effects.
  useEffect(() => {
    let pending = false
    const onScroll = (): void => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y > 0) sessionStorage.setItem(STORAGE_KEY, String(y))
        pending = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Restore the homepage title + meta description on mount, in case the
  // user is coming back from a project detail page where they were swapped
  // out. Captured-once-then-restored is enough; we don't translate the
  // homepage title per language (the static one in index.html stands).
  useEffect(() => {
    resetPageMeta()
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
