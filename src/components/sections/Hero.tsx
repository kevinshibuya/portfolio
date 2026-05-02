import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLenis } from '../../hooks/useLenis'
import { useMotion } from '../../context/MotionContext'
import { ScrambleText } from '../ui/ScrambleText'
import { RevealOnView } from '../ui/RevealOnView'
import { HeroAccentSilhouette } from '../canvas/HeroAccentSilhouette'

const HeroAccent3D = lazy(() => import('../canvas/HeroAccent3D'))

const ROLE_DURATION_MS = 2800

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { scrollTo } = useLenis()
  const { loaderDone } = useMotion()

  // Gate the staged choreography on loaderDone. Without this the RevealOnView
  // chain fires from mount, which means the early stages (name stampIn at
  // 180ms, role slideIn at 520ms) play behind the loader and the user only
  // catches the tail. Flipping `gate` after the loader fully fades restarts
  // the cascade in plain view; the authored delays then become offsets from
  // the loader-gone moment instead of from mount.
  const [gate, setGate] = useState(false)
  useEffect(() => {
    let cancelled = false
    loaderDone
      .then(() => {
        if (!cancelled) setGate(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [loaderDone])

  const roles = useMemo(() => {
    const value = t('hero.roles', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
  }, [t, lang])

  const [roleIdx, setRoleIdx] = useState(0)
  useEffect(() => {
    setRoleIdx(0)
    if (roles.length <= 1) return
    const id = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length)
    }, ROLE_DURATION_MS)
    return () => clearInterval(id)
  }, [roles])

  const activeRole = roles[roleIdx] ?? ''

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(`#${id}`, { duration: 1.2 })
  }

  return (
    <section id="top" className="hero">
      <div className="hero-main">
        <h1 className="hero-name">
          <RevealOnView recipe="stampIn" delay={0.18} gate={gate}>
            <span className="hero-name-line" data-hero-word="kevin">
              {t('hero.name1')}
            </span>
            <span
              className="hero-name-line hero-name-line--ghost"
              data-hero-word="shibuya"
            >
              <ScrambleText>{t('hero.name2') as string}</ScrambleText>
            </span>
          </RevealOnView>
        </h1>

        <div className="hero-supplementary">
          <RevealOnView recipe="slideInLeft" delay={0.52} gate={gate}>
            <div className="hero-role-line">
              <span className="hero-role-prefix">{t('hero.rolePrefix')}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${lang}-${roleIdx}`}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="hero-role"
                >
                  {activeRole}
                </motion.span>
              </AnimatePresence>
            </div>
          </RevealOnView>

          <RevealOnView recipe="fadeUp" delay={0.78} gate={gate}>
            <p className="hero-desc max-w-[640px]">
              <Trans i18nKey="hero.description" components={{ strong: <strong /> }} />
            </p>
          </RevealOnView>

          <RevealOnView recipe="scaleIn" delay={1.04} gate={gate}>
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

      {/* Stats row REMOVED — relocates in Task 17 */}

      {/* Right column: HeroAccent3D + HeroAccentSilhouette were previously
          mounted inside HeroDataFragments (now deleted). They mount fresh here
          behind a Suspense boundary so the R3F bundle stays out of the LCP
          critical path. The silhouette serves as the Suspense fallback so the
          bbox is reserved while R3F loads. */}
      <RevealOnView recipe="fadeUp" delay={1.28} gate={gate} className="hero-accent-mount">
        <Suspense fallback={<HeroAccentSilhouette />}>
          <HeroAccent3D />
        </Suspense>
      </RevealOnView>
    </section>
  )
}
