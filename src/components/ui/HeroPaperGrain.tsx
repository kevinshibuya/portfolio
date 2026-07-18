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
    const el = containerRef.current
    if (!el) return
    const finePointer = !window.matchMedia('(pointer: coarse)').matches

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const xPct = ((event.clientX - rect.left) / rect.width) * 100
      const yPct = ((event.clientY - rect.top) / rect.height) * 100
      lx.set(`${xPct}%`)
      ly.set(`${yPct}%`)
    }

    // Hero visibility gates both costs: the grain-drift keyframes (paused via
    // the data-offscreen attribute — stamped imperatively, NEVER through
    // setState, which would freeze an in-flight entrance stagger) and the
    // window pointermove listener (attached only while the hero is on screen).
    let listening = false
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting
      el.dataset.offscreen = visible ? 'false' : 'true'
      if (!finePointer) return
      if (visible && !listening) {
        window.addEventListener('pointermove', handlePointerMove)
        listening = true
      } else if (!visible && listening) {
        window.removeEventListener('pointermove', handlePointerMove)
        listening = false
      }
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (listening) window.removeEventListener('pointermove', handlePointerMove)
    }
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
