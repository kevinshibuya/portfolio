import { useScroll, useTransform, type MotionValue } from 'framer-motion'
import type { RefObject } from 'react'

/**
 * Returns the 4-stop opacity range for beat `i` (0, 1, or 2) over the
 * section's 0..1 scroll progress.
 *
 * Each beat occupies one third of the scroll range with ~22% crossfade
 * overlap into the next beat:
 *   beat 0: [0,     0.05, 0.33, 0.44]
 *   beat 1: [0.22,  0.39, 0.66, 0.77]
 *   beat 2: [0.55,  0.72, 1,    1   ]
 */
export function beatOpacityRange(i: 0 | 1 | 2): [number, number, number, number] {
  if (i === 0) return [0, 0.05, 0.33, 0.44]
  if (i === 1) return [0.22, 0.39, 0.66, 0.77]
  return [0.55, 0.72, 1, 1]
}

export interface AboutProgress {
  /** 0..1 across the entire 300vh outer wrapper. */
  scrollYProgress: MotionValue<number>
  /** Opacity 0..1 for each beat's billboard group. */
  beatOpacity: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
}

export function useAboutProgress(outerRef: RefObject<HTMLElement | null>): AboutProgress {
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  const beat0 = useTransform(scrollYProgress, beatOpacityRange(0), [0, 1, 1, 0])
  const beat1 = useTransform(scrollYProgress, beatOpacityRange(1), [0, 1, 1, 0])
  const beat2 = useTransform(scrollYProgress, beatOpacityRange(2), [0, 1, 1, 1])

  return { scrollYProgress, beatOpacity: [beat0, beat1, beat2] }
}
