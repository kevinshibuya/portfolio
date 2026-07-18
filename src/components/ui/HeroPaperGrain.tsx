import { useEffect, useRef } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'

/**
 * Scene 0 leaf: a static feTurbulence paper-grain texture plus a soft
 * pointer-follow light. Mounted by Hero only after `entranceDone` (Task 4).
 *
 * Pointer state MUST NOT flow through React state — a re-render above an
 * in-flight whileInView(once) stagger freezes children at opacity 0. The
 * pointer position is routed pointer -> MotionValue -> CSS custom property,
 * never through setState.
 */
export function HeroPaperGrain(): React.JSX.Element {
  const { prefersReducedMotion } = useMotion()
  const lx = useMotionValue('50%')
  const ly = useMotionValue('40%')
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const handlePointerMove = (event: PointerEvent): void => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const xPct = ((event.clientX - rect.left) / rect.width) * 100
      const yPct = ((event.clientY - rect.top) / rect.height) * 100
      lx.set(`${xPct}%`)
      ly.set(`${yPct}%`)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [prefersReducedMotion, lx, ly])

  return (
    <motion.div
      ref={containerRef}
      className="hero-paper-grain"
      aria-hidden="true"
      style={
        prefersReducedMotion
          ? undefined
          : { '--lx': lx, '--ly': ly } as React.CSSProperties
      }
    />
  )
}
