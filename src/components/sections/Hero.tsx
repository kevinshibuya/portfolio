import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLenis } from '../../hooks/useLenis'
import { useMotion } from '../../context/MotionContext'
import { RevealOnView } from '../ui/RevealOnView'
import { HeroAccentSilhouette } from '../canvas/HeroAccentSilhouette'
import { HeroNameDrawing } from '../ui/HeroNameDrawing'

const HeroAccent3D = lazy(() => import('../canvas/HeroAccent3D'))

const ROLE_DURATION_MS = 5000

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { scrollTo } = useLenis()
  const { entranceDone, resolveEntrance } = useMotion()

  // gate: enables the supplementary RevealOnView cascade. Fires when the
  // hero name's trace + ink-fill animation completes.
  const [gate, setGate] = useState(false)
  useEffect(() => {
    let cancelled = false
    entranceDone
      .then(() => { if (!cancelled) setGate(true) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [entranceDone])

  const roles = useMemo(() => {
    const value = t('hero.roles', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
  }, [t, lang])

  const [roleIdx, setRoleIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start (or reset) the auto-cycle interval. Used by both the gate
  // effect and the click handler — clicking restarts the timer so the
  // user gets a full ROLE_DURATION_MS to read the role they just
  // advanced to, instead of getting cycled by a stale interval.
  const startCycling = (): void => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!gate || roles.length <= 1) return
    intervalRef.current = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length)
    }, ROLE_DURATION_MS)
  }

  useEffect(() => {
    // Gate the role-cycling interval on the entrance: don't start
    // counting until the hero name has finished its trace + ink-fill.
    if (!gate) return
    setRoleIdx(0)
    startCycling()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // startCycling is stable enough across renders for our purposes;
    // re-running the effect on roles + gate is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, gate])

  const cycleRole = (): void => {
    if (roles.length <= 1) return
    setRoleIdx((i) => (i + 1) % roles.length)
    startCycling()
  }

  const activeRole = roles[roleIdx] ?? ''

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(`#${id}`, { duration: 1.2 })
  }

  return (
    <section id="top" className="hero">
      <div className="hero-main">
        {/* The SVG drawing IS the title — it traces in, then ink-fills to
            its final state. Its onComplete resolves the entrance gate that
            the rest of the hero cascade waits on. */}
        <HeroNameDrawing onComplete={resolveEntrance} />

        <div className="hero-supplementary">
          <RevealOnView recipe="slideInLeft" delay={0.0} gate={gate}>
            <div className="hero-role-line">
              <span className="hero-role-prefix">{t('hero.rolePrefix')}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${lang}-${roleIdx}`}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.94 }}
                  className="hero-role hero-role--clickable"
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
          </RevealOnView>

          <RevealOnView recipe="fadeUp" delay={0.18} gate={true}>
            <p className="hero-desc max-w-[640px]">
              <Trans i18nKey="hero.description" components={{ strong: <strong /> }} />
            </p>
          </RevealOnView>

          <RevealOnView recipe="scaleIn" delay={0.36} gate={gate}>
            <div className="hero-cta">
              <a
                href="#contact"
                onClick={go('contact')}
                className="btn btn--primary"
              >
                {t('hero.cta.collaborate')}
                <span className="btn-arrow">→</span>
              </a>
              <Link to="/resume" className="btn btn--ghost">
                {t('hero.cta.resume')}
                <span className="btn-arrow">↓</span>
              </Link>
            </div>
          </RevealOnView>
        </div>
      </div>

      <RevealOnView recipe="fadeUp" delay={0.6} gate={gate} className="hero-accent-mount">
        <Suspense fallback={<HeroAccentSilhouette />}>
          <HeroAccent3D />
        </Suspense>
      </RevealOnView>
    </section>
  )
}
