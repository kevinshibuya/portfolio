import { useRef, useMemo } from 'react'
import {
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { ABOUT_FRAGMENT_COUNT } from '../../../data/aboutFragments'
import { fragmentAngle, fragmentOpacityAtAngle, wrapPi } from './storm-math'

const TAU = Math.PI * 2

export interface AboutProgress {
  outerRef: React.RefObject<HTMLElement | null>
  scrollYProgress: MotionValue<number>
  cameraZ: MotionValue<number>
  robotSpinY: MotionValue<number>
  cylinderRotation: MotionValue<number>
  fragmentOpacities: readonly MotionValue<number>[]
}

/**
 * Wires the pinned-section scroll to all motion values the storm cinematic needs.
 * Pass the returned outerRef to the outer 300vh <section>.
 */
export function useAboutProgress(): AboutProgress {
  const outerRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })
  return useAboutProgressDerived(scrollYProgress, outerRef)
}

/** Test-friendly inner — drive with any MotionValue<number>. */
export function useAboutProgressDerived(
  scrollYProgress: MotionValue<number>,
  outerRef?: React.RefObject<HTMLElement | null>,
): AboutProgress {
  const cameraZ = useTransform(scrollYProgress, [0, 0.25, 1], [5.0, 2.5, 2.5])
  const robotSpinY = useTransform(scrollYProgress, [0, 0.25, 1], [0, TAU, TAU])
  const cylinderRotation = useTransform(scrollYProgress, [0, 1], [0, TAU])

  const o0 = useFragmentOpacity(cylinderRotation, 0)
  const o1 = useFragmentOpacity(cylinderRotation, 1)
  const o2 = useFragmentOpacity(cylinderRotation, 2)
  const o3 = useFragmentOpacity(cylinderRotation, 3)
  const o4 = useFragmentOpacity(cylinderRotation, 4)
  const o5 = useFragmentOpacity(cylinderRotation, 5)

  const fragmentOpacities = useMemo<readonly MotionValue<number>[]>(
    () => [o0, o1, o2, o3, o4, o5],
    [o0, o1, o2, o3, o4, o5],
  )

  return {
    outerRef: outerRef ?? { current: null },
    scrollYProgress,
    cameraZ,
    robotSpinY,
    cylinderRotation,
    fragmentOpacities,
  }
}

/**
 * Custom hook: returns a MotionValue<number> that holds the opacity
 * for fragment `index` derived from the cylinder rotation.
 *
 * NOTE: ABOUT_FRAGMENT_COUNT is locked at 6. If this constant ever changes,
 * the 6 explicit calls in useAboutProgressDerived above must be updated to match.
 */
function useFragmentOpacity(
  cylinderRotation: MotionValue<number>,
  index: number,
): MotionValue<number> {
  const baseAngle = fragmentAngle(index, ABOUT_FRAGMENT_COUNT)
  return useTransform(cylinderRotation, (psi) =>
    fragmentOpacityAtAngle(wrapPi(baseAngle + psi)),
  )
}
