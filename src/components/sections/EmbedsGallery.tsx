import { useState, useMemo, useCallback } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { RevealOnView } from '../ui/RevealOnView'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import {
  embeds,
  embedTypes,
  editorialCategories,
  typeGradients,
} from '../../data/embeds'
import {
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  REDUCED_MOTION_VARIANT,
} from '../../utils/animations'
import type { Embed, EmbedType } from '../../types/content'

const PAGE_SIZE = 12

export function EmbedsGallery() {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const [activeType, setActiveType] = useState<EmbedType | null>(null)
  const [activeEditorial, setActiveEditorial] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    let result = embeds
    if (activeType) result = result.filter((e) => e.type === activeType)
    if (activeEditorial) result = result.filter((e) => e.editorial === activeEditorial)
    return result
  }, [activeType, activeEditorial])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleTypeFilter = useCallback((type: EmbedType | null) => {
    setActiveType(type)
    setVisibleCount(PAGE_SIZE)
  }, [])

  const handleEditorialFilter = useCallback((editorial: string | null) => {
    setActiveEditorial(editorial)
    setVisibleCount(PAGE_SIZE)
  }, [])

  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(STAGGER_PRESETS.embedRows)
  const rowVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS.slideInLeft

  return (
    <section id="embeds" className="section section--sand">
      <div className="section-inner">
        <RevealOnView recipe="stampIn">
          <SectionHeading
            index={t('sections.embeds.index')}
            label={t('sections.embeds.label')}
            title={t('sections.embeds.title')}
            description={t('sections.embeds.description')}
          />
        </RevealOnView>

        <div className="embeds-filters">
          <div className="embeds-filter-group">
            <span className="embeds-filter-label">
              {t('sections.embeds.filterByType')}
            </span>
            <div className="embeds-chips">
              <Tag
                label={t('sections.embeds.all')}
                variant="chip"
                active={activeType === null}
                onClick={() => handleTypeFilter(null)}
              />
              {embedTypes.map((type) => (
                <Tag
                  key={type}
                  label={type.toLowerCase()}
                  variant="chip"
                  active={activeType === type}
                  onClick={() => handleTypeFilter(type)}
                />
              ))}
            </div>
          </div>

          <div className="embeds-filter-group">
            <span className="embeds-filter-label">
              {t('sections.embeds.filterByEditorial')}
            </span>
            <div className="embeds-chips">
              <Tag
                label={t('sections.embeds.all')}
                variant="chip"
                active={activeEditorial === null}
                onClick={() => handleEditorialFilter(null)}
              />
              {editorialCategories.map((ed) => (
                <Tag
                  key={ed}
                  label={ed.toLowerCase()}
                  variant="chip"
                  active={activeEditorial === ed}
                  onClick={() => handleEditorialFilter(ed)}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="embeds-count">
          <strong>{filtered.length}</strong> {t('sections.embeds.countLabel')}
        </p>

        {/*
          EmbedRow renders motion.a directly so each .tbl-row stays a direct
          child of .tbl — keeps the .tbl-row:last-child border-bottom rule
          intact. Stagger is driven by staggerContainer(embedRows) here
          instead of the <Stagger> wrapper for the same reason.
        */}
        <motion.div
          className="tbl section-spacing-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={parentVariants}
        >
          {visible.map((embed, idx) => (
            <EmbedRow
              key={embed.link}
              idx={idx}
              embed={embed}
              variants={rowVariants}
            />
          ))}
        </motion.div>

        {hasMore && (
          <div className="embeds-more">
            <button
              className="btn btn--ghost"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {t('sections.embeds.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

interface EmbedRowProps {
  idx: number
  embed: Embed
  variants: Variants
}

function EmbedRow({ idx, embed, variants }: EmbedRowProps) {
  const num = String(idx + 1).padStart(2, '0')
  const gradient = typeGradients[embed.type]

  return (
    <motion.a
      variants={variants}
      href={embed.link}
      target="_blank"
      rel="noopener noreferrer"
      className="tbl-row"
    >
      <span className="tbl-num">{num}</span>
      <div className="tbl-preview" style={{ background: gradient }} />
      <span className="tbl-title">{embed.title}</span>
      <span className="tbl-role">{embed.type.toLowerCase()}</span>
      <span className="tbl-year">{embed.editorial.toLowerCase()}</span>
      <span className="tbl-arrow">↗</span>
    </motion.a>
  )
}
