import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import { MockupFrame } from './MockupFrame'
import type { Bilingual } from '../../types/content'

interface Props {
  mobileSrc: string
  trick: Bilingual
  lang: 'en' | 'pt'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function MobileTrickRow({ mobileSrc, trick, lang, alt }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const value = trick[lang]

  return (
    <section className="project-detail-mobile-trick">
      <MockupFrame src={mobileSrc} variant="mobile" alt={alt} />
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.7,
          delay: prefersReducedMotion ? 0 : 0.2,
          ease: EASE,
        }}
      >
        <h2 className="project-detail-mobile-trick-label">
          {t('projectDetail.trick')}
        </h2>
        <p className="project-detail-mobile-trick-text">{parseInline(value)}</p>
      </motion.div>
    </section>
  )
}
