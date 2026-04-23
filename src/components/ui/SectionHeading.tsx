import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useTextReveal } from '../../hooks/useTextReveal'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { EASE_REVEAL } from '../../utils/gsapConfig'

interface SectionHeadingProps {
  index: string
  label?: string
  title: string
  description?: string
  alignment?: 'left' | 'center'
  variant?: 'light' | 'dark'
  deps?: unknown[]
}

/**
 * Section heading — handoff pattern:
 *   <span class="section-index">03 · featured</span>
 *   <h2 class="section-title">selected <em>work.</em></h2>
 *   <p class="section-desc">…</p>
 *
 * Title accepts text or JSX with `<em>` spans which render as italic terra accent.
 * Pass a title like "selected <em>work.</em>" and it will be rendered via dangerouslySetInnerHTML.
 */
export function SectionHeading({
  index,
  label,
  title,
  description,
  alignment = 'left',
  variant = 'light',
  deps = [],
}: SectionHeadingProps) {
  const alignClass = alignment === 'center' ? 'text-center' : 'text-left'
  const isDark = variant === 'dark'
  const indexColor = isDark ? 'text-terra-200' : 'text-terra-400'
  const titleColor = isDark ? 'text-text-light' : 'text-text'
  const descColor = isDark ? 'text-text-light-muted' : 'text-text-muted'

  const containerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const indexLineRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useTextReveal(headingRef, { deps: [title, ...deps] })

  useGSAP(
    () => {
      if (!indexLineRef.current || prefersReducedMotion) return
      gsap.fromTo(
        indexLineRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: EASE_REVEAL,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        },
      )
    },
    { dependencies: [prefersReducedMotion] },
  )

  const indexText = label ? `${index} · ${label}` : index

  return (
    <div
      ref={containerRef}
      className={`mb-12 md:mb-16 max-w-[720px] ${alignClass}`}
    >
      <span
        ref={indexLineRef}
        className={`block mb-3.5 font-body text-[11px] font-semibold lowercase tracking-[0.15em] ${indexColor}`}
      >
        {indexText}
      </span>
      <h2
        ref={headingRef}
        className={`font-display font-normal lowercase ${titleColor} section-title-heading`}
        style={{
          fontSize: 'clamp(44px, 6vw, 84px)',
          lineHeight: 0.98,
          letterSpacing: '-0.035em',
        }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {description && (
        <p
          className={`mt-5 max-w-[560px] font-body text-[17px] leading-[1.6] lowercase ${descColor}`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
