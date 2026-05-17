import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import type { Bilingual } from '../../types/content'

interface Props {
  text: Bilingual
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function WhatShipped({ text, lang }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const value = text[lang]

  return (
    <motion.section
      className="project-detail-what-shipped"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.8, ease: EASE }}
    >
      <h2 className="project-detail-what-shipped-label">
        {t('projectDetail.whatShipped')}
      </h2>
      <p className="project-detail-what-shipped-text">{parseInline(value)}</p>
    </motion.section>
  )
}
