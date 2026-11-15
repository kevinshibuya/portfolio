import { useEffect } from 'react'
import { useMotion } from '../context/MotionContext'

/**
 * Releases the page's scroll lock when the entrance gate resolves.
 *
 * main.tsx stamps `document.body.dataset.loaderState = "loading"` before React
 * mounts, and index.css locks scroll on that value. Every route opens behind
 * the same loader, so every route waits on the same gate.
 */
export function useScrollLockDuringEntrance(): void {
  const { entranceDone } = useMotion()

  useEffect(() => {
    let cancelled = false
    entranceDone
      .then(() => {
        if (!cancelled) document.body.dataset.loaderState = 'done'
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [entranceDone])
}
