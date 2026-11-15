import { useEffect, useState } from 'react'
import { useMotion } from '../context/MotionContext'

// The rise: each line travels up out of its clip mask on the house curve, one
// step after the line before it. Both numbers mirror the `.rise` rules in
// index.css.
const RISE_MS = 900
const LINE_STEP_MS = 80

export interface Entered {
  /** True one frame after the loader hands the page over: the lines start to rise. */
  entered: boolean
  /** True once the last line has landed: the clip masks may let go. */
  settled: boolean
  /** Nothing to play: reduced motion, or a page whose entrance has been bypassed. */
  instant: boolean
}

/** The state of a page's opening rise, for an opening of `lines` lines. */
export function useEntered(lines: number): Entered {
  const { prefersReducedMotion, entranceDone, entranceBypassed } = useMotion()
  const instant = prefersReducedMotion || entranceBypassed
  const [entered, setEntered] = useState(instant)
  const [settled, setSettled] = useState(instant)

  useEffect(() => {
    if (instant) {
      setEntered(true)
      setSettled(true)
      return
    }
    let cancelled = false
    let raf = 0
    let timer = 0
    entranceDone
      .then(() => {
        if (cancelled) return
        // Two frames, so the hidden state has been painted before it changes.
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            if (cancelled) return
            setEntered(true)
            timer = window.setTimeout(
              () => {
                if (!cancelled) setSettled(true)
              },
              (lines - 1) * LINE_STEP_MS + RISE_MS + 90,
            )
          })
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [instant, entranceDone, lines])

  return { entered, settled, instant }
}
