import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface MarqueeDividerProps {
  text: string
  separator?: string
  speed?: number
  direction?: 'left' | 'right'
  variant?: 'light' | 'dark'
  className?: string
}

export function MarqueeDivider({
  text,
  separator = '·',
  speed = 50,
  direction = 'left',
  variant = 'light',
  className = '',
}: MarqueeDividerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const textColor =
    variant === 'dark' ? 'text-text-light/10' : 'text-text-faded/30'
  const accentColor =
    variant === 'dark' ? 'text-terra-200/60' : 'text-terra-300/80'

  const repeatCount = 8
  const items = Array.from({ length: repeatCount }, (_, i) => (
    <span key={i} className="flex items-center gap-5 shrink-0">
      <span>{text}</span>
      <span className={accentColor}>{separator}</span>
    </span>
  ))

  useGSAP(
    () => {
      if (!trackRef.current || prefersReducedMotion) return

      const track = trackRef.current
      const totalWidth = track.scrollWidth / 2
      const duration = totalWidth / speed

      gsap.set(track, { xPercent: direction === 'left' ? 0 : -50 })

      gsap.to(track, {
        xPercent: direction === 'left' ? -50 : 0,
        duration,
        ease: 'none',
        repeat: -1,
      })
    },
    { dependencies: [prefersReducedMotion, speed, direction] },
  )

  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden py-5 md:py-7 ${className}`}
    >
      <div
        ref={trackRef}
        className={`flex items-center gap-5 whitespace-nowrap font-display font-bold lowercase tracking-[-0.03em] ${textColor}`}
        style={{ fontSize: 'clamp(56px, 10vw, 140px)' }}
      >
        {items}
        {items}
      </div>
    </div>
  )
}
