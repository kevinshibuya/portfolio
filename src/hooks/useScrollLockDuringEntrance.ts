import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMotion } from '../context/MotionContext'

/** Locks body scroll while the hero entrance animation plays.
 *
 *  Sets `document.body.dataset.loaderState = "loading"` on mount; flips
 *  to `"done"` when entranceDone resolves. The CSS rule in index.css keys
 *  off this attribute to lock scroll on html + body.
 *
 *  On non-home routes the hero entrance doesn't render — we resolve the
 *  entrance gate immediately and skip the lock so other pages render
 *  normally. */
export function useScrollLockDuringEntrance(): void {
  const { entranceDone, resolveEntrance, entranceBypassed } = useMotion()
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname !== '/' || entranceBypassed) {
      resolveEntrance()
      document.body.dataset.loaderState = 'done'
      return
    }

    document.body.dataset.loaderState = 'loading'
    let cancelled = false
    entranceDone
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
  }, [entranceDone, resolveEntrance, pathname, entranceBypassed])
}
