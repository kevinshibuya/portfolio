import { type RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { splitTextIntoChars } from '../utils/splitText'
import { EASE_REVEAL } from '../utils/gsapConfig'
import { useReducedMotion } from './useReducedMotion'

type OptionalRef = RefObject<HTMLElement | null> | undefined

interface HeroRefs {
  name: RefObject<HTMLElement | null>
  eyebrow?: OptionalRef
  role?: OptionalRef
  description?: OptionalRef
  cta?: OptionalRef
  social?: OptionalRef
  stats?: OptionalRef
  image?: OptionalRef
  scrollIndicator?: OptionalRef
}

/**
 * Master GSAP timeline for the Hero section.
 * Plays on mount with a cinematic character-stagger on the name + staged
 * reveals for surrounding elements. Any optional ref can be omitted.
 */
export function useHeroTimeline(refs: HeroRefs, deps: unknown[] = []): void {
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (prefersReducedMotion) return

      const nameEl = refs.name.current
      if (!nameEl) return

      const eyebrowEl = refs.eyebrow?.current
      const roleEl = refs.role?.current
      const descEl = refs.description?.current
      const ctaEl = refs.cta?.current
      const socialEl = refs.social?.current
      const statsEl = refs.stats?.current
      const imageEl = refs.image?.current
      const indicatorEl = refs.scrollIndicator?.current

      const chars = splitTextIntoChars(nameEl)

      gsap.set(chars, { y: '100%', opacity: 0 })
      if (eyebrowEl) gsap.set(eyebrowEl, { y: 16, opacity: 0 })
      if (roleEl) gsap.set(roleEl, { y: 24, opacity: 0 })
      if (descEl) gsap.set(descEl, { y: 40, opacity: 0 })
      if (ctaEl) gsap.set(ctaEl, { y: 20, opacity: 0 })
      if (socialEl) gsap.set(socialEl, { y: 20, opacity: 0 })
      if (statsEl) gsap.set(statsEl, { y: 30, opacity: 0 })
      if (imageEl) gsap.set(imageEl, { scale: 0.95, opacity: 0 })
      if (indicatorEl) gsap.set(indicatorEl, { opacity: 0 })

      const tl = gsap.timeline({ delay: 0.2 })

      if (eyebrowEl) {
        tl.to(eyebrowEl, { y: 0, opacity: 1, duration: 0.5, ease: EASE_REVEAL })
      }

      tl.to(
        chars,
        {
          y: '0%',
          opacity: 1,
          stagger: 0.03,
          duration: 0.7,
          ease: EASE_REVEAL,
        },
        eyebrowEl ? '-=0.2' : 0,
      )

      if (roleEl) {
        tl.to(
          roleEl,
          { y: 0, opacity: 1, duration: 0.6, ease: EASE_REVEAL },
          '-=0.4',
        )
      }

      if (descEl) {
        tl.to(
          descEl,
          { y: 0, opacity: 1, duration: 0.6, ease: EASE_REVEAL },
          '-=0.3',
        )
      }

      if (ctaEl) {
        tl.to(
          ctaEl,
          { y: 0, opacity: 1, duration: 0.5, ease: EASE_REVEAL },
          '-=0.35',
        )
      }

      if (imageEl) {
        tl.to(
          imageEl,
          { scale: 1, opacity: 1, duration: 0.8, ease: EASE_REVEAL },
          '-=0.4',
        )
      }

      if (socialEl) {
        tl.to(
          socialEl,
          { y: 0, opacity: 1, duration: 0.5, ease: EASE_REVEAL },
          '-=0.4',
        )
      }

      if (statsEl) {
        tl.to(
          statsEl,
          { y: 0, opacity: 1, duration: 0.6, ease: EASE_REVEAL },
          '-=0.3',
        )
      }

      if (indicatorEl) {
        tl.to(
          indicatorEl,
          { opacity: 1, duration: 0.8, ease: 'power2.inOut' },
          '-=0.1',
        )
      }
    },
    { dependencies: [prefersReducedMotion, ...deps] },
  )
}
