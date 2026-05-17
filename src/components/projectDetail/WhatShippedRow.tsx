import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import { MockupFrame } from './MockupFrame'
import type { Bilingual } from '../../types/content'

interface Props {
  mobileSrc: string
  text: Bilingual
  lang: 'en' | 'pt'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function WhatShippedRow({ mobileSrc, text, lang, alt }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const value = text[lang]

  return (
    <section className="project-detail-what-shipped">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.55, ease: EASE }}
      >
        <MockupFrame src={mobileSrc} variant="mobile" alt={alt} />
      </motion.div>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.55,
          delay: prefersReducedMotion ? 0 : 0.12,
          ease: EASE,
        }}
      >
        <h2 className="project-detail-what-shipped-label">
          {t('projectDetail.whatShipped')}
        </h2>
        <p className="project-detail-what-shipped-text">{parseInline(value)}</p>
      </motion.div>
    </section>
  )
}
