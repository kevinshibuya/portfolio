import type { Block } from '../../types/content'
import { Paragraph } from './blocks/Paragraph'
import { Heading } from './blocks/Heading'
import { Pullquote } from './blocks/Pullquote'
import { Divider } from './blocks/Divider'
import { Figure } from './blocks/Figure'
import { FigurePair } from './blocks/FigurePair'
import { FigureGrid } from './blocks/FigureGrid'
import { StatRow } from './blocks/StatRow'
import { RouteList } from './blocks/RouteList'

interface Props {
  blocks: Block[]
  lang: 'en' | 'pt'
}

export function BlockRenderer({ blocks, lang }: Props) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <Paragraph key={i} block={block} lang={lang} />
          case 'heading':
            return <Heading key={i} block={block} lang={lang} />
          case 'pullquote':
            return <Pullquote key={i} block={block} lang={lang} />
          case 'divider':
            return <Divider key={i} />
          case 'figure':
            return <Figure key={i} block={block} lang={lang} />
          case 'figure-pair':
            return <FigurePair key={i} block={block} lang={lang} />
          case 'figure-grid':
            return <FigureGrid key={i} block={block} lang={lang} />
          case 'stat-row':
            return <StatRow key={i} block={block} lang={lang} />
          case 'route-list':
            return <RouteList key={i} block={block} lang={lang} />
          case 'mockup':
            return null  // replaced in Task 9 with the Mockup component
          default: {
            // Exhaustiveness guard
            const _exhaustive: never = block
            return _exhaustive
          }
        }
      })}
    </>
  )
}
