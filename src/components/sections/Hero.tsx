import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { heroStats } from '../../data/stats'

const ROLE_DURATION_MS = 2800

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

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
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="top" className="hero">
      <div className="hero-main">
        <h1 className="hero-name">
          <span className="hero-name-line">{t('hero.name1')}</span>
          <span className="hero-name-line hero-name-line--ghost">
            {t('hero.name2')}
          </span>
        </h1>

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

      <div className="hero-stats">
        {heroStats.map((stat) => (
          <div key={stat.labelKey} className="hero-stat">
            <span className="hero-stat-v">{stat.value}</span>
            <span className="hero-stat-l">{t(stat.labelKey)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
