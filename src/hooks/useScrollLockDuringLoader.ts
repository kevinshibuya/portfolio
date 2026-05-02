import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMotion } from '../context/MotionContext'

/** Manages document.body.dataset.loaderState for the entire loader
 *  lifecycle. Sets "loading" on mount; flips to "done" when handoffDone
 *  resolves. The CSS rule in index.css keys off this attribute to lock
 *  scroll on html + body.
 *
 *  On non-home routes, the SVG name draw doesn't make sense (the loader
 *  visualizes "kevin shibuya." being authored — only meaningful on the
 *  landing page). We immediately resolve handoffDone there so the header
 *  gate releases and the page renders normally. */
export function useScrollLockDuringLoader(): void {
  const { handoffDone, resolveHandoff } = useMotion()
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname !== '/') {
      // Non-home route: skip the lock and unblock all loader-gated UI.
      resolveHandoff()
      document.body.dataset.loaderState = 'done'
      return
    }

    document.body.dataset.loaderState = 'loading'
    let cancelled = false
    handoffDone
      .then(() => {
        if (cancelled) return
        document.body.dataset.loaderState = 'done'
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (document.body.dataset.loaderState === 'loading') {
        delete document.body.dataset.loaderState
      }
    }
  }, [handoffDone, resolveHandoff, pathname])
}
