import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLenis } from '../../hooks/useLenis'
import { useMotion } from '../../context/MotionContext'
import { ScrambleText } from '../ui/ScrambleText'
import { RevealOnView } from '../ui/RevealOnView'
import { HeroAccentSilhouette } from '../canvas/HeroAccentSilhouette'
import { HeroNameDrawing, type HeroNameDrawingHandle } from '../ui/HeroNameDrawing'
import { LoadingCursor } from '../ui/LoadingCursor'

const HeroAccent3D = lazy(() => import('../canvas/HeroAccent3D'))

const ROLE_DURATION_MS = 2800

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { scrollTo } = useLenis()
  const { handoffDone, prefersReducedMotion } = useMotion()

  // gate: enables the RevealOnView cascade. Fires when the cursor's flight
  // to the nav completes — the eye is already at the top of the page so the
  // cascade reads as the page filling in around the now-static name.
  const [gate, setGate] = useState(false)
  // showSvg: keep HeroNameDrawing mounted until crossfade completes.
  const [showSvg, setShowSvg] = useState(true)
  // h1Visible: the static <h1> starts hidden, crossfades in on handoffDone.
  const [h1Visible, setH1Visible] = useState(prefersReducedMotion)

  const drawingRef = useRef<HeroNameDrawingHandle>(null)
  const getAnchors = () => drawingRef.current?.getCursorAnchors() ?? null

  useEffect(() => {
    let cancelled = false
    handoffDone
      .then(() => {
        if (cancelled) return
        setGate(true)
        setH1Visible(true)
        window.setTimeout(() => {
          if (!cancelled) setShowSvg(false)
        }, 220)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [handoffDone])

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
        <div className="hero-name-stack">
          {showSvg && (
            <motion.div
              className="hero-name-stack-layer hero-name-stack-layer--svg"
              initial={false}
              animate={{ opacity: h1Visible ? 0 : 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <HeroNameDrawing ref={drawingRef} />
            </motion.div>
          )}
          <motion.h1
            className="hero-name hero-name-stack-layer hero-name-stack-layer--h1"
            initial={false}
            animate={{ opacity: h1Visible ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            aria-hidden={!h1Visible || undefined}
          >
            <span className="hero-name-line" data-hero-word="kevin">
              {t('hero.name1')}
            </span>
            <span
              className="hero-name-line hero-name-line--ghost"
              data-hero-word="shibuya"
            >
              <ScrambleText>{t('hero.name2') as string}</ScrambleText>
            </span>
          </motion.h1>
        </div>

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
                  className="hero-role"
                >
                  {activeRole}
                </motion.span>
              </AnimatePresence>
            </div>
          </RevealOnView>

          <RevealOnView recipe="fadeUp" delay={0.18} gate={gate}>
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

      <LoadingCursor getAnchors={getAnchors} />
    </section>
  )
}
