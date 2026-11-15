import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { useLenis } from './useLenis'
import { persistScroll, recallScroll, rememberScroll } from '../utils/scrollMemory'

type ScrollTo = ReturnType<typeof useLenis>['scrollTo']

/**
 * Keeps the record of where each history entry is scrolled to (scrollMemory).
 * Mounted once, above the routes.
 *
 * The position is read when the scroll event arrives and filed under the entry
 * on show at that moment. A page change moves the key before the next page's
 * own jump to its top is reported, so that jump is never filed under the page
 * that was left.
 */
export function useScrollMemory(): void {
  const { key } = useLocation()
  const keyRef = useRef(key)
  useLayoutEffect(() => {
    keyRef.current = key
  }, [key])

  useEffect(() => {
    const onScroll = (): void => rememberScroll(keyRef.current, window.scrollY)
    // A phone may discard a background tab without ever sending pagehide; it
    // does say when the page is hidden.
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') persistScroll()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', persistScroll)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', persistScroll)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [])
}

/** The position this page should return to: set when it was reached by going back or forward in history. */
export function useReturnPosition(): number | null {
  const { key } = useLocation()
  const returning = useNavigationType() === 'POP'
  return returning ? recallScroll(key) : null
}

/**
 * Put the page at `y` and keep it there until the document is tall enough to
 * reach it: a page's lower parts and its images arrive after its first render.
 * Returns a function that stops trying.
 */
export function holdScroll(y: number, scrollTo: ScrollTo, giveUpMs: number, done?: () => void): () => void {
  let stopped = false
  let observer: ResizeObserver | null = null
  let timer = 0
  const stop = (): void => {
    stopped = true
    observer?.disconnect()
    window.clearTimeout(timer)
  }
  const finish = (): void => {
    if (stopped) return
    stop()
    done?.()
  }
  const apply = (): boolean => {
    window.scrollTo(0, y)
    scrollTo(y, { immediate: true, force: true })
    return window.scrollY >= y - 1
  }
  if (apply()) {
    finish()
    return stop
  }
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      if (!stopped && apply()) finish()
    })
    observer.observe(document.documentElement)
  }
  timer = window.setTimeout(finish, giveUpMs)
  return stop
}

/**
 * Where a page opens: at its top when a link led to it, and where the reader
 * left it when they come back to it through the browser's history.
 */
export function useOpeningScroll(): void {
  const { scrollTo } = useLenis()
  const { key } = useLocation()
  const y = useReturnPosition()
  // The smooth scroller arrives after the entrance and changes `scrollTo`'s
  // identity; the page's opening position is set once for each entry, with
  // whichever is current.
  const scrollRef = useRef(scrollTo)
  scrollRef.current = scrollTo
  const yRef = useRef(y)
  yRef.current = y

  useLayoutEffect(() => {
    const to: ScrollTo = (target, opts) => scrollRef.current(target, opts)
    const target = yRef.current
    if (target === null) {
      window.scrollTo(0, 0)
      to(0, { immediate: true, force: true })
      return
    }
    return holdScroll(target, to, 1200)
  }, [key])
}
