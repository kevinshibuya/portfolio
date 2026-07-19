import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { useMotion, curtainGone } from '../../context/MotionContext'
import { FluidWavesHero } from '../canvas/FluidWavesHero'

// House ease registered ONCE at module scope (T1). CustomEase ships in the
// public `gsap` package. Used for the role + name clipped rises.
gsap.registerPlugin(CustomEase)
CustomEase.create('house', '0.22,1,0.36,1')

const ROLE_DURATION_MS = 5000

export function Hero(): ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { resolveEntrance, prefersReducedMotion, entranceBypassed } = useMotion()
  const heroRef = useRef<HTMLElement>(null)

  const roles = useMemo(() => {
    const value = t('hero.roles', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
    // lang forces a recompute when the language toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, lang])

  // roles[0] is the canonical title; every load starts the cycle there.
  const [roleIdx, setRoleIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start (or reset) the auto-cycle interval. Clicking restarts the timer so
  // the user gets a full ROLE_DURATION_MS to read the role they advanced to.
  const startCycling = (): void => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (roles.length <= 1) return
    intervalRef.current = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length)
    }, ROLE_DURATION_MS)
  }

  useEffect(() => {
    setRoleIdx(0)
    startCycling()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // startCycling is stable enough for our purposes; re-running on roles is
    // what matters (language toggle rebuilds the array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles])

  const cycleRole = (): void => {
    if (roles.length <= 1) return
    setRoleIdx((i) => (i + 1) % roles.length)
    startCycling()
  }

  const activeRole = roles[roleIdx] ?? ''

  // Entrance timeline. Deferred useEffect (NEVER useLayoutEffect — S3) so the
  // back-nav bypass guard can run before any timeline is scheduled. Deps
  // include entranceBypassed: Home calls bypassEntrance() before restoring
  // scroll, and curtainGone is a once-resolved module promise — without this
  // early-return a naive .then(run) would replay the full entrance on every
  // back-navigation into Home.
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const q = gsap.utils.selector(el)
    const canvas = q('.hero-canvas')
    const risers = [...q('.hero-role-rise'), ...q('.hero-line')]
    const meta = q('.hero-meta')

    if (prefersReducedMotion || entranceBypassed) {
      // Snap all targets to their final state; no timeline, no curtain wait.
      gsap.set(canvas, { autoAlpha: 1, scale: 1 })
      gsap.set(risers, { yPercent: 0, clearProps: 'transform' })
      gsap.set(meta, { autoAlpha: 1 })
      resolveEntrance()
      return
    }

    // Establish the hidden pre-entrance state synchronously so GSAP owns the
    // transform outright — a CSS translateY baseline would be parsed as px and
    // compound with yPercent, leaving the name stuck one line-height down. The
    // loader curtain covers the viewport until curtainGone resolves, so setting
    // this after the first paint is never visible.
    gsap.set(canvas, { autoAlpha: 0, scale: 1.045 })
    gsap.set(risers, { yPercent: 112 })
    gsap.set(meta, { autoAlpha: 0 })

    // Guard so the timeline can't be built twice (StrictMode / re-entry).
    let built = false
    let ctx: gsap.Context | undefined
    const run = (): void => {
      if (built) return
      built = true
      ctx = gsap.context(() => {
        const tl = gsap.timeline()
        tl.to('.hero-canvas',
          { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0)
        tl.to('.hero-role-rise',
          { yPercent: 0, duration: 0.6, ease: 'house' }, 0.12)
        // Ladder timing (offset 0.24 / duration 0.55): keeps the name land
        // comfortably inside the entrance budget under headless WebGL load,
        // where the shader first-frame delays curtainGone ~1s.
        tl.to('.hero-line',
          { yPercent: 0, duration: 0.55, ease: 'house', stagger: 0.18 }, 0.24)
        // Resolve the entrance gate the moment the name lands (nav + scroll
        // unlock) rather than waiting on the trailing meta fade.
        tl.call(resolveEntrance, undefined, 0.97)
        tl.to('.hero-meta',
          { autoAlpha: 1, duration: 0.5 }, 0.9)
      }, el)
    }

    let cancelled = false
    curtainGone.then(() => { if (!cancelled) run() }).catch(() => {})

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [prefersReducedMotion, entranceBypassed, resolveEntrance])

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-canvas">
        <FluidWavesHero />
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-meta">
        <span>{t('hero.meta.location')}</span>
        <span>{t('hero.meta.availability')}</span>
      </div>

      <div className="hero-bottom">
        <div className="hero-mask hero-role-mask">
          {/* GSAP animates the .hero-role-rise wrapper (the clipped entrance
              rise); Framer Motion animates the inner .hero-role span (the
              click/keyboard cycle swap) — separate elements, separate
              transforms, no library collision. */}
          <span className="hero-role-rise">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${lang}-${roleIdx}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.94 }}
                className="hero-role"
                onClick={cycleRole}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    cycleRole()
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`cycle role — currently ${activeRole}`}
              >
                {activeRole}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        <h1 className="hero-name">
          <span className="hero-mask"><span className="hero-line">{t('hero.name1')}</span></span>
          <span className="hero-mask"><span className="hero-line">{t('hero.name2')}</span></span>
        </h1>
      </div>
    </section>
  )
}
