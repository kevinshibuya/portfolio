import { useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLenis } from '../hooks/useLenis'
import { setPageMeta, resetPageMeta } from '../utils/pageMeta'
import { Stream } from '../components/sections/Stream'

/**
 * All work: every piece, through the Stream in its visible mode, on a page of
 * its own (ADR 0014). The Stream's header is the page's header, so its title
 * is the page's one `h1` and its total the page's one count.
 *
 * Ink, like the project detail pages: it sits outside the light chapter, so
 * every token resolves to the cream steps and the rows tint in raw tricolor.
 */
export function AllWork(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const { scrollTo } = useLenis()

  // Arrives at the top, as a detail page does. Home keeps its own scrollY in
  // sessionStorage, so the back link returns the reader where they left it.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    scrollTo(0, { immediate: true, force: true })
  }, [scrollTo])

  useEffect(() => {
    setPageMeta(t('allWork.meta.title'), t('allWork.meta.description'))
    return resetPageMeta
  }, [t, lang])

  return (
    <main className="section all-work">
      <Link to="/" className="project-detail-back">
        ← {t('projectDetail.back')}
      </Link>
      <Stream headingLevel={1} />
    </main>
  )
}
