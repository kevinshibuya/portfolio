import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Block, Project } from '../../types/content'
import { useMotion } from '../../context/MotionContext'
import { VARIANTS, REDUCED_MOTION_VARIANT } from '../../utils/animations'
import { Paragraph } from './blocks/Paragraph'
import { Heading } from './blocks/Heading'
import { Pullquote } from './blocks/Pullquote'
import { Divider } from './blocks/Divider'
import { Figure } from './blocks/Figure'
import { FigurePair } from './blocks/FigurePair'
import { FigureGrid } from './blocks/FigureGrid'
import { StatRow } from './blocks/StatRow'
import { RouteList } from './blocks/RouteList'
import { Mockup } from './blocks/Mockup'

interface Props {
  blocks: Block[]
  project: Project
  lang: 'en' | 'pt'
}

export function BlockRenderer({ blocks, project, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const variants = prefersReducedMotion ? REDUCED_MOTION_VARIANT : VARIANTS.fadeUp

  return (
    <>
      {blocks.map((block, i) => (
        <motion.div
          key={i}
          variants={variants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3, margin: '0px 0px -25% 0px' }}
        >
          {renderBlock(block, project, lang)}
        </motion.div>
      ))}
    </>
  )
}

function renderBlock(block: Block, project: Project, lang: 'en' | 'pt'): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <Paragraph block={block} lang={lang} />
    case 'heading':
      return <Heading block={block} lang={lang} />
    case 'pullquote':
      return <Pullquote block={block} lang={lang} />
    case 'divider':
      return <Divider />
    case 'figure':
      return <Figure block={block} lang={lang} />
    case 'figure-pair':
      return <FigurePair block={block} lang={lang} />
    case 'figure-grid':
      return <FigureGrid block={block} lang={lang} />
    case 'stat-row':
      return <StatRow block={block} lang={lang} />
    case 'route-list':
      return <RouteList block={block} lang={lang} />
    case 'mockup':
      return <Mockup block={block} project={project} lang={lang} />
    default: {
      const _exhaustive: never = block
      return _exhaustive
    }
  }
}
