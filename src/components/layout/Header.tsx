import { useEffect, useState, type MouseEvent, type ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useLenis } from '../../hooks/useLenis'
import { useMotion } from '../../context/MotionContext'
import { Roll } from '../ui/Roll'
import { NameHover } from '../ui/NameHover'
import { TLink, usePageChange } from './PageChange'
import type { Lang } from '../../types/content'

/** The nav's four entries. `work` is a page; the others are sections. */
const LINKS = ['about', 'work', 'experience', 'contact'] as const
type LinkId = (typeof LINKS)[number]

const LANGS: readonly Lang[] = ['en', 'pt']

/**
 * The header every page carries, with no bar behind it: four links at the
 * left margin, the name line at the fourth column on inner pages, the
 * language pair at the right. At the top of a page the links are plain text.
 * Going down the page the header leaves, so nothing sits over what is being
 * read; going back up it returns, each link on a pale chip so it reads over
 * paint, cream, black and frames alike. A link that takes keyboard focus
 * brings the header back. Nothing hides behind a menu at any width.
 */

/** How far the page must move one way before the header answers, in px. */
const TURN = 6
/** The header never leaves this close to the top of a page. */
const KEEP = 72
export function Header(): ReactElement {
  const { t, lang, setLang } = useI18n()
  const { scrollTo } = useLenis()
  const { entranceDone } = useMotion()
  const { go } = usePageChange()
  const location = useLocation()
  const onHome = location.pathname === '/'

  const [visible, setVisible] = useState(false)
  const [moved, setMoved] = useState(false)
  const [away, setAway] = useState(false)
  const [current, setCurrent] = useState<LinkId | null>(onHome ? null : 'work')

  useEffect(() => {
    let cancelled = false
    entranceDone
      .then(() => {
        if (!cancelled) setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [entranceDone])

  useEffect(() => {
    // `anchor` is where the page last turned: the header answers once the page
    // has gone TURN px past it, down (it leaves) or up (it returns).
    let anchor = window.scrollY
    const onScroll = (): void => {
      const y = window.scrollY
      setMoved(y > 4)
      if (y <= KEEP) {
        anchor = y
        setAway(false)
      } else if (y > anchor + TURN) {
        anchor = y
        setAway(true)
      } else if (y < anchor - TURN) {
        anchor = y
        setAway(false)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  // Which section holds the middle of the viewport. Sections mount late, so
  // the observer is armed on whatever exists and re-armed as the page grows.
  useEffect(() => {
    const base: LinkId | null = onHome ? null : 'work'
    setCurrent(base)
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as LinkId
          if (entry.isIntersecting) setCurrent(id)
          else setCurrent((value) => (value === id ? base : value))
        }
      },
      { rootMargin: '-45% 0px -54% 0px', threshold: 0 },
    )
    const arm = (): void => {
      for (const id of LINKS) {
        const el = document.getElementById(id)
        if (el && !seen.has(el)) {
          seen.add(el)
          io.observe(el)
        }
      }
    }
    const mo = new MutationObserver(arm)
    mo.observe(document.body, { childList: true, subtree: true })
    arm()
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [onHome, location.pathname])

  const toSection = (id: LinkId) => (e: MouseEvent) => {
    e.preventDefault()
    if (document.getElementById(id)) scrollTo(`#${id}`, { duration: 1 })
    // The section lives on the home page: go there and hand it the target.
    else go('/', { state: { scrollToId: id } })
  }

  return (
    <header
      className={`nav${visible ? ' is-visible' : ''}${moved ? ' is-moved' : ''}${away ? ' is-away' : ''}`}
      data-over={onHome ? 'paint' : 'cream'}
    >
      <div className="nav-row container grid">
        <nav className="nav-links" aria-label={t('nav.primary')}>
          {LINKS.map((id) =>
            id === 'work' ? (
              <TLink
                key={id}
                to="/all-work"
                className="nav-link"
                aria-current={current === id ? 'page' : undefined}
                data-motion="page-change"
              >
                <Roll>{t(`nav.${id}`)}</Roll>
              </TLink>
            ) : (
              <a
                key={id}
                href={onHome || id === 'contact' ? `#${id}` : `/#${id}`}
                onClick={toSection(id)}
                className="nav-link"
                aria-current={current === id ? 'true' : undefined}
              >
                <Roll>{t(`nav.${id}`)}</Roll>
              </a>
            ),
          )}
        </nav>

        {!onHome && (
          <TLink to="/" state={{ top: true }} className="nav-name nav-top-only" aria-label={t('nav.home')}>
            <NameHover text={t('nav.name')} side="down" />
          </TLink>
        )}

        <div className="nav-lang nav-top-only" role="group" aria-label={t('nav.language')}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              className="nav-lang-btn"
              aria-pressed={lang === code}
              lang={code}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
