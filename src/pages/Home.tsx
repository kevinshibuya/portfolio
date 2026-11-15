import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { Hero } from '../components/sections/Hero'
import { useLenis } from '../hooks/useLenis'
import { holdScroll, useReturnPosition } from '../hooks/useScrollMemory'
import { useMotion } from '../context/MotionContext'
import { resetPageMeta } from '../utils/pageMeta'
import { pageArrived } from '../components/layout/PageChange'

// Everything under the first screen is one chunk, fetched once the entrance
// has played: until then the page is scroll-locked, so the first paint carries
// only the hero.
const About = lazy(() => import('./HomeSections').then((m) => ({ default: m.About })))
const HomeSections = lazy(() => import('./HomeSections').then((m) => ({ default: m.HomeSections })))

// A beat after the opening type starts to rise, so the sections' requests do
// not compete with the first screen.
const SECTIONS_DELAY_MS = 300

interface HomeState {
  scrollToId?: string
  top?: boolean
}

export function Home(): ReactElement {
  const { scrollTo } = useLenis()
  const { bypassEntrance, entranceDone, entranceBypassed } = useMotion()
  const location = useLocation()
  // Everything is captured once at mount. The effect below runs again when
  // the scroll helper changes identity (the smooth scroller arrives after the
  // entrance), and that second run must find only what is still pending.
  //
  // A target handed over by a link (a section, or the top) belongs to that
  // one arrival. It stays in the history entry's state for good, so coming
  // back to the entry through the browser's history must not read it again:
  // that return lands where the reader left the page.
  const state = location.state as HomeState | null
  const returning = useNavigationType() === 'POP'
  const returnTo = useReturnPosition()
  const navTargetRef = useRef<string | undefined>(returning ? undefined : state?.scrollToId)
  const topRef = useRef<boolean>(returning ? returnTo === null : state?.top === true)
  const restoreRef = useRef<number | null>(returnTo)

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
    if (y === null) {
      // A jump to the top is asked for once; a later run must not pull the reader back up.
      // A return through history to an entry that was left at its top is one
      // too: nothing else moves the page off the position of the page it came from.
      if (topRef.current) {
        topRef.current = false
        window.scrollTo(0, 0)
        scrollTo(0, { immediate: true, force: true })
      }
      return
    }
    // Returning to Home: skip the entrance and put the reader back where they
    // were. The sections arrive as a lazy chunk, so the position is applied
    // again each time the document grows until it is reachable. Applied, or
    // given up on: either way the position is spent.
    bypassEntrance()
    return holdScroll(y, scrollTo, 1200, () => {
      restoreRef.current = null
    })
    // Everything read from `location.state` comes through refs captured at mount.
  }, [bypassEntrance, scrollTo])

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
