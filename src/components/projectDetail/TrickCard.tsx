import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import { Tag } from '../ui/Tag'
import type { Bilingual } from '../../types/content'

interface Props {
  trick: Bilingual
  stack: string[]
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function TrickCard({ trick, stack, lang }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  return (
    <motion.section
      className="project-detail-trick"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.5,
        delay: prefersReducedMotion ? 0 : 0.05,
        ease: EASE,
      }}
    >
      <h2 className="project-detail-trick-label">{t('projectDetail.trick')}</h2>
      <p className="project-detail-trick-body">{parseInline(trick[lang])}</p>

      {stack.length > 0 && (
        <>
          <hr className="project-detail-trick-divider" />
          <h2 className="project-detail-trick-label">{t('projectDetail.stack')}</h2>
          <div className="project-detail-trick-chips">
            {stack.map((tech) => (
              <Tag key={tech} label={tech.toLowerCase()} variant="pill" />
            ))}
          </div>
        </>
      )}
    </motion.section>
  )
}
