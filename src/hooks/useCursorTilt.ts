import { useEffect, type RefObject } from 'react'
import { useMotion } from '../context/MotionContext'

interface CursorTiltOpts {
  tilt: number
  scale: number
  shift: number
}

export function useCursorTilt(
  cardRef: RefObject<HTMLElement | null>,
  wrapRef: RefObject<HTMLElement | null>,
  opts: CursorTiltOpts
): void {
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    if (prefersReducedMotion) return
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return

    const card = cardRef.current
    const wrap = wrapRef.current
    if (!card || !wrap) return

    let rafId = 0
    let pending: { x: number; y: number } | null = null

    const apply = () => {
      rafId = 0
      if (!pending) return
      const rect = card.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (pending.x - cx) / (rect.width / 2)
      const dy = (pending.y - cy) / (rect.height / 2)
      const rx = (-dy * opts.tilt).toFixed(2)
      const ry = (dx * opts.tilt).toFixed(2)
      const tx = (dx * opts.shift).toFixed(1)
      const ty = (dy * opts.shift).toFixed(1)
      wrap.style.setProperty(
        '--cursor-tilt',
        `scale(${opts.scale}) rotateX(${rx}deg) rotateY(${ry}deg) translateX(${tx}px) translateY(${ty}px)`
      )
      pending = null
    }

    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (rafId === 0) rafId = window.requestAnimationFrame(apply)
    }
    const onLeave = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId)
        rafId = 0
      }
      pending = null
      wrap.style.setProperty('--cursor-tilt', 'none')
    }

    card.addEventListener('mousemove', onMove)
    card.addEventListener('mouseleave', onLeave)
    return () => {
      card.removeEventListener('mousemove', onMove)
      card.removeEventListener('mouseleave', onLeave)
      if (rafId !== 0) window.cancelAnimationFrame(rafId)
    }
  }, [cardRef, wrapRef, prefersReducedMotion, opts.tilt, opts.scale, opts.shift])
}
