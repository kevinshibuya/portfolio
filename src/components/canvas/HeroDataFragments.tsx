import { Suspense, lazy, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useMotion } from '../../context/MotionContext'
import { projectEaseGsap } from '../../utils/animations'
import { HeroAccentSilhouette } from './HeroAccentSilhouette'

const HeroAccent3D = lazy(() => import('./HeroAccent3D'))

export function HeroDataFragments() {
  const { loaderDone, prefersReducedMotion, r3fAccentEnabled } = useMotion()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion) {
        gsap.set('[data-fragment]', { opacity: 1, y: 0 })
        return
      }
      gsap.set('[data-fragment]', { opacity: 0, y: 12 })
      let cancelled = false
      loaderDone.then(() => {
        if (cancelled) return
        const tl = gsap.timeline()
        tl.to('[data-fragment="bars"] rect',      { scaleY: 1, transformOrigin: 'bottom', duration: 0.7, stagger: 0.06, ease: projectEaseGsap }, 0)
          .to('[data-fragment="bars"]',            { opacity: 1, y: 0, duration: 0.5, ease: projectEaseGsap }, 0)
          .to('[data-fragment="line"] path',       { strokeDashoffset: 0, duration: 0.9, ease: projectEaseGsap }, 0.1)
          .to('[data-fragment="line"]',            { opacity: 1, y: 0, duration: 0.5, ease: projectEaseGsap }, 0.1)
          .to('[data-fragment="annotation"]',      { opacity: 1, y: 0, duration: 0.4, ease: projectEaseGsap }, 0.3)
          .to('[data-fragment="lattice"] circle',  { opacity: 1, duration: 0.5, stagger: { amount: 0.4, from: 'random' }, ease: projectEaseGsap }, 0.2)
          .to('[data-fragment="lattice"]',         { opacity: 1, y: 0, duration: 0.4, ease: projectEaseGsap }, 0.2)
          .to('[data-fragment="numeric"]',         { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: projectEaseGsap }, 0.35)
          .fromTo('[data-fragment="numeric"]',     { scale: 0.92 }, { scale: 1, duration: 0.6, ease: projectEaseGsap }, 0.35)
          .to('[data-fragment="accent"]',          { opacity: 1, duration: 0.7, ease: projectEaseGsap }, 0.5)
      })
      return () => { cancelled = true }
    },
    { dependencies: [prefersReducedMotion], scope: root }
  )

  return (
    <div ref={root} className="hero-fragments" aria-hidden="true">
      {/* Bars */}
      <div data-fragment="bars" className="hero-frag hero-frag--bars">
        <svg viewBox="0 0 200 220" width="100%" height="100%">
          {[40, 95, 60, 140, 175].map((h, i) => (
            <rect key={i} x={20 + i * 36} y={220 - h} width={24} height={h} fill="#DCF0FF" rx="3" />
          ))}
        </svg>
      </div>
      {/* Line chart */}
      <div data-fragment="line" className="hero-frag hero-frag--line">
        <svg viewBox="0 0 240 160" width="100%" height="100%">
          <path
            d="M10,120 L40,90 L70,100 L100,60 L130,75 L160,40 L190,55 L220,30"
            fill="none"
            stroke="#6A8CAA"
            strokeWidth="1.5"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
          <circle cx="100" cy="60" r="5" fill="#3A96E8" />
          <circle cx="160" cy="40" r="4" fill="#3A96E8" opacity={0.35} />
        </svg>
      </div>
      {/* Annotation */}
      <div data-fragment="annotation" className="hero-frag hero-frag--annotation">
        <span>fig. 01 — 2026</span>
      </div>
      {/* Lattice */}
      <div data-fragment="lattice" className="hero-frag hero-frag--lattice">
        <svg viewBox="0 0 140 100" width="100%" height="100%">
          {Array.from({ length: 5 }).flatMap((_, row) =>
            Array.from({ length: 7 }).map((__, col) => {
              const isHi = row === 2 && col === 4
              return (
                <circle
                  key={`${row}-${col}`}
                  cx={10 + col * 20}
                  cy={10 + row * 20}
                  r={isHi ? 4 : 2.5}
                  fill={isHi ? '#3A96E8' : '#D4E5F2'}
                  data-hi={isHi || undefined}
                />
              )
            })
          )}
        </svg>
      </div>
      {/* Numeric callout */}
      <div data-fragment="numeric" className="hero-frag hero-frag--numeric">
        <span>47</span>
      </div>
      {/* Accent: R3F or silhouette */}
      <div data-fragment="accent" className="hero-frag hero-frag--accent">
        {r3fAccentEnabled ? (
          <Suspense fallback={<HeroAccentSilhouette />}>
            <HeroAccent3D />
          </Suspense>
        ) : (
          <HeroAccentSilhouette />
        )}
      </div>
    </div>
  )
}
