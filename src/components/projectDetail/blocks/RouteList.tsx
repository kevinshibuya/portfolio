import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type RouteListBlock = Extract<Block, { type: 'route-list' }>

interface Props {
  block: RouteListBlock
  lang: 'en' | 'pt'
}

export function RouteList({ block, lang: _lang }: Props) {
  // `lang` is part of the unified BlockRenderer signature but route labels
  // are not bilingual in the schema; underscore-prefix satisfies
  // tsconfig.app.json's noUnusedParameters: true.
  void _lang
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const Wrapper = block.collapsible ? 'details' : 'div'

  return (
    <motion.div
      className="project-detail-route-list"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.5 }}
    >
      <Wrapper>
        {block.collapsible && (
          <summary className="project-detail-route-list-summary">
            {t('projectDetail.routesCount', { count: block.routes.length })}
          </summary>
        )}
        <ul className="project-detail-route-list-items">
          {block.routes.map((r) => (
            <li key={r.path} className="project-detail-route-list-item">
              <code className="project-detail-route-path">{r.path}</code>
              <span className="project-detail-route-label">{r.label}</span>
            </li>
          ))}
        </ul>
      </Wrapper>
    </motion.div>
  )
}
