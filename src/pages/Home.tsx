import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/sections/Hero'
import { useLenis } from '../hooks/useLenis'
import { useMotion } from '../context/MotionContext'
import { resetPageMeta } from '../utils/pageMeta'
import { pageArrived } from '../components/layout/PageChange'

// Everything under the first screen is one chunk, fetched once the entrance
// has played: until then the page is scroll-locked, so the first paint carries
// only the hero.
const About = lazy(() => import('./HomeSections').then((m) => ({ default: m.About })))
const HomeSections = lazy(() => import('./HomeSections').then((m) => ({ default: m.HomeSections })))

const STORAGE_KEY = 'portfolio:home:scrollY'

// A beat after the opening type starts to rise, so the sections' requests do
// not compete with the first screen.
const SECTIONS_DELAY_MS = 300

interface HomeState {
  scrollToId?: string
  top?: boolean
}

/** The position to return to, read once: a later write must never be replayed. */
function readStored(state: HomeState | null): number | null {
  try {
    if (state?.top || state?.scrollToId) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    const y = Number.parseInt(sessionStorage.getItem(STORAGE_KEY) ?? '', 10)
    return Number.isFinite(y) && y > 0 ? y : null
  } catch {
    return null
  }
}

export function Home(): ReactElement {
  const { scrollTo } = useLenis()
  const { bypassEntrance, entranceDone, entranceBypassed } = useMotion()
  const location = useLocation()
  // Both targets are captured once at mount. The effect below runs again when
  // the scroll helper changes identity (the smooth scroller arrives after the
  // entrance), and that second run must find only what is still pending.
  const state = location.state as HomeState | null
  const navTargetRef = useRef<string | undefined>(state?.scrollToId)
  const topRef = useRef<boolean>(state?.top === true)
  const restoreRef = useRef<number | null | undefined>(undefined)
  if (restoreRef.current === undefined) restoreRef.current = readStored(state)

  const [sectionsDue, setSectionsDue] = useState(entranceBypassed)
  useEffect(() => {
    if (sectionsDue) return
    let cancelled = false
    let timer = 0
    const askedAt = performance.now()
    entranceDone
      .then(() => {
        // An entrance that has already played leaves nothing to wait for.
        const played = performance.now() - askedAt < 50
        timer = window.setTimeout(
          () => {
            if (!cancelled) setSectionsDue(true)
          },
          played ? 0 : SECTIONS_DELAY_MS,
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [entranceDone, sectionsDue])

  useLayoutEffect(() => {
    // The header's off-route nav hands over a target section through
    // location.state. The section is lazy, so wait for it to mount (the
    // document grows) before scrolling.
    const targetId = navTargetRef.current
    if (targetId) {
      bypassEntrance()

      let cancelled = false
      let observer: ResizeObserver | null = null
      let timeoutId: number | null = null

      const cleanup = (): void => {
        cancelled = true
        observer?.disconnect()
        if (timeoutId !== null) window.clearTimeout(timeoutId)
      }
      const finish = (): void => {
        navTargetRef.current = undefined
        cleanup()
      }
      const apply = (): boolean => {
        if (cancelled) return false
        if (!document.getElementById(targetId)) return false
        scrollTo(`#${targetId}`, { immediate: true, force: true })
        return true
      }

      if (apply()) {
        finish()
        return
      }
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          if (!cancelled && apply()) finish()
        })
        observer.observe(document.documentElement)
      }
      timeoutId = window.setTimeout(finish, 2500)
      return cleanup
    }

    const y = restoreRef.current
    if (y === null || y === undefined) {
      // A jump to the top is asked for once; a later run must not pull the reader back up.
      if (topRef.current) {
        topRef.current = false
        window.scrollTo(0, 0)
        scrollTo(0, { immediate: true, force: true })
      }
      return
    }
    // Returning to Home: skip the entrance and put the reader back where they
    // were. The sections arrive as a lazy chunk, so the position is applied
    // again each time the document grows until it is reachable.
    bypassEntrance()

    let cancelled = false
    let observer: ResizeObserver | null = null
    let timeoutId: number | null = null

    const cleanup = (): void => {
      cancelled = true
      observer?.disconnect()
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
    // Applied, or given up on: either way the position is spent.
    const finish = (): void => {
      restoreRef.current = null
      cleanup()
    }
    const apply = (): boolean => {
      if (cancelled) return false
      window.scrollTo(0, y)
      scrollTo(y, { immediate: true, force: true })
      return window.scrollY >= y - 1
    }

    if (apply()) {
      finish()
      return
    }
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (!cancelled && apply()) finish()
      })
      observer.observe(document.documentElement)
    }
    timeoutId = window.setTimeout(finish, 1200)
    return cleanup
    // Everything read from `location.state` comes through refs captured at mount.
  }, [bypassEntrance, scrollTo])

  // Home's scroll position is mirrored into sessionStorage as it changes, so a
  // return from a project page can restore it.
  useEffect(() => {
    let pending = false
    const onScroll = (): void => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(STORAGE_KEY, String(Math.round(window.scrollY)))
        } catch {
          /* storage is a convenience */
        }
        pending = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    pageArrived()
  }, [])
  useEffect(() => {
    resetPageMeta()
  }, [])

  return (
    <main>
      <Hero />
      {sectionsDue && (
        <Suspense fallback={null}>
          <About />
          <HomeSections />
        </Suspense>
      )}
    </main>
  )
}
