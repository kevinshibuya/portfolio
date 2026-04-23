import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useHeroTimeline } from '../../hooks/useHeroTimeline'
import { StatCounter } from '../ui/StatCounter'
import { heroStats } from '../../data/stats'

const ROLE_DURATION_MS = 2800

export function Hero() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const eyebrowRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)

  const roles = useMemo(() => {
    const value = t('hero.roles', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
  }, [t, lang])

  const [roleIdx, setRoleIdx] = useState(0)
  useEffect(() => {
    if (roles.length === 0) return
    const id = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length)
    }, ROLE_DURATION_MS)
    return () => clearInterval(id)
  }, [roles])

  useHeroTimeline(
    {
      name: nameRef,
      eyebrow: eyebrowRef,
      role: roleRef,
      description: descriptionRef,
      cta: ctaRef,
      stats: statsRef,
      scrollIndicator: scrollIndicatorRef,
    },
    [lang],
  )

  const activeRole = roles[roleIdx] ?? ''

  return (
    <section
      id="top"
      className="relative min-h-screen grid grid-rows-[auto_1fr_auto_auto] gap-8 md:gap-10 px-6 md:px-12 lg:px-20 pt-32 md:pt-36 pb-12 overflow-hidden"
    >
      <div className="hero-grid-bg" aria-hidden="true" />

      <div className="relative z-10">
        <span
          ref={eyebrowRef}
          className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-400"
        >
          {t('hero.eyebrow')}
        </span>
      </div>

      <div className="relative z-10 self-center max-w-[1200px]">
        <h1
          ref={nameRef}
          className="font-display font-bold lowercase leading-[0.88] tracking-[-0.05em] text-text m-0"
          style={{ fontSize: 'clamp(72px, 13vw, 220px)' }}
        >
          <span className="block">{t('hero.name1')}</span>
          <span className="block ghost-outline">{t('hero.name2')}</span>
        </h1>

        <div
          ref={roleRef}
          className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mt-8 md:mt-10"
        >
          <span
            className="font-body font-light lowercase text-text-muted tracking-[-0.02em]"
            style={{ fontSize: 'clamp(20px, 2.2vw, 32px)' }}
          >
            {t('hero.rolePrefix')}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${lang}-${roleIdx}`}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="font-body font-semibold lowercase text-terra-400 tracking-[-0.02em] border-b-2 border-terra-200 pb-1"
              style={{ fontSize: 'clamp(22px, 2.4vw, 36px)' }}
            >
              {activeRole}
            </motion.span>
          </AnimatePresence>
        </div>

        <p
          ref={descriptionRef}
          className="mt-6 max-w-[560px] font-body text-[17px] lowercase leading-[1.6] text-text-muted"
        >
          {t('hero.description')}
        </p>

        <div ref={ctaRef} className="flex flex-wrap gap-3 mt-8">
          <a
            href="#contact"
            data-cursor-hover
            className="inline-flex items-center gap-2 font-body text-[12px] font-semibold lowercase tracking-[0.04em] text-text-light bg-text rounded-full px-[22px] py-[13px] transition-[background,transform] duration-300 hover:bg-terra-400 hover:-translate-y-0.5"
          >
            {t('hero.cta.collaborate')}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
          <Link
            to="/resume"
            data-cursor-hover
            className="inline-flex items-center gap-2 font-body text-[12px] font-semibold lowercase tracking-[0.04em] text-text border-[1.5px] border-text rounded-full px-[22px] py-[11.5px] transition-colors duration-300 hover:bg-text hover:text-text-light"
          >
            {t('hero.cta.resume')}
            <span className="inline-block">↓</span>
          </Link>
        </div>
      </div>

      <div
        ref={statsRef}
        className="relative z-10 flex flex-wrap gap-x-12 md:gap-x-16 gap-y-6 pt-10 border-t border-border max-w-[720px]"
      >
        {heroStats.map((stat) => (
          <StatCounter
            key={stat.labelKey}
            value={stat.value}
            prefix={stat.prefix}
            label={t(stat.labelKey)}
          />
        ))}
      </div>

      <div
        ref={scrollIndicatorRef}
        className="relative z-10 flex items-center gap-3 font-body text-[10px] uppercase tracking-[0.2em] text-text-faded"
      >
        <span className="scroll-line" aria-hidden="true" />
        <span>{t('hero.scrollIndicator')}</span>
      </div>
    </section>
  )
}
