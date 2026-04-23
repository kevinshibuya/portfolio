import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface StatCounterProps {
  value: number
  prefix?: string
  suffix?: string
  label: string
}

export function StatCounter({
  value,
  prefix = '',
  suffix = '',
  label,
}: StatCounterProps) {
  const numberRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (!numberRef.current || prefersReducedMotion) {
        if (numberRef.current) {
          numberRef.current.textContent = `${prefix}${value}${suffix}`
        }
        return
      }

      const proxy = { val: 0 }

      gsap.to(proxy, {
        val: value,
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: numberRef.current,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
        onUpdate() {
          if (numberRef.current) {
            numberRef.current.textContent = `${prefix}${Math.round(proxy.val)}${suffix}`
          }
        },
      })
    },
    { dependencies: [value, prefix, suffix, prefersReducedMotion] },
  )

  return (
    <div className="flex flex-col gap-1">
      <span
        ref={numberRef}
        className="font-display font-semibold text-text tracking-[-0.02em] tabular-nums"
        style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}
      >
        {prefix}0{suffix}
      </span>
      <span className="font-body text-[11px] lowercase tracking-[0.08em] text-text-faded">
        {label}
      </span>
    </div>
  )
}
