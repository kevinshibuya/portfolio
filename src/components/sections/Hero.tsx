import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { heroStats } from '../../data/stats'
import { useMotion } from '../../context/MotionContext'
import { useScrollFade } from '../../hooks/useScrollFade'
import { useLenis } from '../../hooks/useLenis'
import { ScrambleText } from '../ui/ScrambleText'

// HeroDataFragments owns ~all of the GSAP entry/parallax/scroll-fade work for
// the right side composition. None of that motion fires until loaderDone
// resolves, so loading the component lazily after first paint shaves measurable
// JS off the LCP critical path without affecting the visual sequence.
const HeroDataFragments = lazy(() =>
  import('../canvas/HeroDataFragments').then((m) => ({ default: m.HeroDataFragments }))
)

const ROLE_DURATION_MS = 2800

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { loaderDone } = useMotion()
  const { scrollTo } = useLenis()
  const suppRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  useScrollFade(nameRef)

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

  // Reveal supplementary content after loader resolves
  useEffect(() => {
    let cancelled = false
    loaderDone
      .then(() => {
        if (cancelled) return
        suppRef.current?.classList.add('is-revealed')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [loaderDone])

  const activeRole = roles[roleIdx] ?? ''

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(`#${id}`, { duration: 1.2 })
  }

  return (
    <section id="top" className="hero">
      <div className="hero-main">
        <h1 className="hero-name" ref={nameRef}>
          <span className="hero-name-line" data-hero-word="kevin">
            {t('hero.name1')}
          </span>
          <span
            className="hero-name-line hero-name-line--ghost"
            data-hero-word="shibuya"
          >
            <ScrambleText>{t('hero.name2') as string}</ScrambleText>
          </span>
        </h1>

        {/*
          Supplementary content — starts hidden (opacity: 0 via CSS),
          reveals after loaderDone by adding .is-revealed.
          data-hero-eyebrow is on THIS element so getComputedStyle reads
          its own opacity (opacity does not cascade to children in CSS).
        */}
        <div
          ref={suppRef}
          className="hero-supplementary"
          data-hero-eyebrow
        >
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

          <p className="hero-desc">{t('hero.description')}</p>

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
        </div>
      </div>

      <div className="hero-stats">
        {heroStats.map((stat) => (
          <div key={stat.labelKey} className="hero-stat">
            <span className="hero-stat-v">{stat.value}</span>
            <span className="hero-stat-l">{t(stat.labelKey)}</span>
          </div>
        ))}
      </div>

      <Suspense fallback={null}>
        <HeroDataFragments />
      </Suspense>
    </section>
  )
}
