import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { FluidWaves } from '../canvas/FluidWaves'

const ROLE_DURATION_MS = 5000

export function Hero(): ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { prefersReducedMotion } = useMotion()

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
    // Reduced-motion users get the static canonical role (roles[0]) — no
    // interval, no Framer slide transition ever fires.
    if (!prefersReducedMotion) startCycling()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // startCycling is stable enough for our purposes; re-running on roles is
    // what matters (language toggle rebuilds the array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, prefersReducedMotion])

  const cycleRole = (): void => {
    if (roles.length <= 1) return
    setRoleIdx((i) => (i + 1) % roles.length)
    startCycling()
  }

  const activeRole = roles[roleIdx] ?? ''

  // No entrance timeline. The ink-bleed loader (main.tsx) IS the entrance: it
  // dissolves onto a hero that is already in its final settled state from the
  // first React paint. main.tsx is the sole resolver of the entrance gate
  // (finishLoader → resolveEntrance) on the normal path; bypassEntrance() owns
  // the SPA back-nav path. Hero only renders — it never resolves the gate.

  return (
    <section id="top" className="hero">
      <div className="hero-canvas">
        <FluidWaves variant="hero" />
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-meta">
        <span>{t('hero.meta.location')}</span>
        <span>{t('hero.meta.availability')}</span>
      </div>

      <div className="hero-bottom">
        <div className="hero-role-line">
          {/* Framer Motion animates the .hero-role span (the click/keyboard
              cycle swap). No entrance rise wrapper — the hero is settled from
              first paint. */}
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
        </div>

        <h1 className="hero-name" aria-label={`${t('hero.name1')} ${t('hero.name2')}`}>
          <span className="hero-line">{t('hero.name1')}</span>
          <span className="hero-line">{t('hero.name2')}</span>
        </h1>
      </div>
    </section>
  )
}
