import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useScrollTo } from '../../contexts/ScrollContext'

const NAV_ITEMS = [
  'about',
  'work',
  'skills',
  'projects',
  'embeds',
  'contact',
] as const

export function Header() {
  const { t, i18n } = useTranslation()
  const { scrollToSection } = useScrollTo()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let rafId: number
    let prevY = 0
    const pollScroll = (): void => {
      const container = document.querySelector('[data-scroll-container]')
      if (container) {
        const style = window.getComputedStyle(container)
        const matrix = new DOMMatrix(style.transform)
        const y = Math.abs(matrix.m42)
        if (y !== prevY) {
          prevY = y
          setScrolled(y > 40)
        }
      } else {
        const y = window.scrollY
        if (y !== prevY) {
          prevY = y
          setScrolled(y > 40)
        }
      }
      rafId = requestAnimationFrame(pollScroll)
    }
    rafId = requestAnimationFrame(pollScroll)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  const toggleLanguage = (): void => {
    const next = i18n.language === 'en' ? 'pt' : 'en'
    i18n.changeLanguage(next)
  }

  const handleNavClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      scrollToSection(id)
    },
    [scrollToSection],
  )

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-bg/85 backdrop-blur-md border-b border-border py-3 md:py-3.5'
          : 'bg-transparent py-4 md:py-5'
      } px-6 md:px-10`}
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8">
        <a
          href="#top"
          onClick={(e) => handleNavClick(e, 'top')}
          data-cursor-hover
          className="inline-flex items-center gap-2.5 justify-self-start"
        >
          <span className="w-[30px] h-[30px] rounded-lg bg-text text-terra-200 grid place-items-center font-display font-bold text-[12px] lowercase tracking-[-0.02em]">
            ks
          </span>
          <span className="hidden sm:inline font-body text-[13px] font-medium lowercase tracking-[-0.01em] text-text">
            kevin shibuya
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6 justify-self-center">
          {NAV_ITEMS.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              onClick={(e) => handleNavClick(e, key)}
              data-cursor-hover
              className="nav-link relative font-body text-[12px] font-medium lowercase tracking-[0.02em] text-text-muted py-1.5 transition-colors duration-300 hover:text-text"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3.5 justify-self-end">
          <span className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-bg border border-border rounded-full font-body text-[10px] font-semibold uppercase tracking-[0.1em] text-text">
            <span className="avail-dot" aria-hidden="true" />
            <span>{t('nav.available')}</span>
          </span>
          <button
            onClick={toggleLanguage}
            data-cursor-hover
            className="font-body text-[11px] font-semibold tracking-[0.15em] text-terra-400 py-1 hover:text-text transition-colors duration-300"
          >
            {t('lang')}
          </button>
        </div>
      </div>
    </motion.header>
  )
}
