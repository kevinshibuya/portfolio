import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import {
  embeds,
  embedTypes,
  editorialCategories,
  typeGradients,
} from '../../data/embeds'
import type { Embed, EmbedType } from '../../types/content'

const PAGE_SIZE = 12

export function EmbedsGallery() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const [activeType, setActiveType] = useState<EmbedType | null>(null)
  const [activeEditorial, setActiveEditorial] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const contentRef = useRef<HTMLDivElement>(null)
  useScrollReveal(contentRef)

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

  return (
    <section
      id="embeds"
      className="relative px-6 md:px-12 lg:px-20 py-28 md:py-36 bg-bg-sand"
    >
      <div className="max-w-[1280px] mx-auto">
        <SectionHeading
          index={t('sections.embeds.index')}
          label={t('sections.embeds.label')}
          title={t('sections.embeds.title')}
          description={t('sections.embeds.description')}
          deps={[lang]}
        />

        <div ref={contentRef}>
          <div className="flex flex-col gap-5 mb-8">
            <FilterGroup label={t('sections.embeds.filterByType')}>
              <Tag
                label={t('sections.embeds.all')}
                variant="chip"
                size="md"
                active={activeType === null}
                onClick={() => handleTypeFilter(null)}
              />
              {embedTypes.map((type) => (
                <Tag
                  key={type}
                  label={type.toLowerCase()}
                  variant="chip"
                  size="md"
                  active={activeType === type}
                  onClick={() => handleTypeFilter(type)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label={t('sections.embeds.filterByEditorial')}>
              <Tag
                label={t('sections.embeds.all')}
                variant="chip"
                size="md"
                active={activeEditorial === null}
                onClick={() => handleEditorialFilter(null)}
              />
              {editorialCategories.map((ed) => (
                <Tag
                  key={ed}
                  label={ed.toLowerCase()}
                  variant="chip"
                  size="md"
                  active={activeEditorial === ed}
                  onClick={() => handleEditorialFilter(ed)}
                />
              ))}
            </FilterGroup>
          </div>

          <p className="mb-6 font-body text-[13px] lowercase text-text-muted">
            <strong className="font-semibold text-text">{filtered.length}</strong>{' '}
            {t('sections.embeds.countLabel')}
          </p>

          <div className="bg-bg border border-border rounded-[18px] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((embed, idx) => (
                <EmbedRow key={embed.link} idx={idx} embed={embed} />
              ))}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                data-cursor-hover
                className="font-body text-[12px] font-semibold lowercase tracking-[0.04em] text-text border border-text rounded-full px-6 py-3 hover:bg-text hover:text-text-light transition-colors duration-300"
              >
                {t('sections.embeds.showMore')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

interface FilterGroupProps {
  label: string
  children: React.ReactNode
}

function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faded">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

interface EmbedRowProps {
  idx: number
  embed: Embed
}

function EmbedRow({ idx, embed }: EmbedRowProps) {
  const gradient = typeGradients[embed.type]
  const num = String(idx + 1).padStart(2, '0')

  return (
    <motion.a
      href={embed.link}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor-hover
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover="hover"
      className="group grid items-center gap-3 md:gap-4 px-5 md:px-6 py-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-bg-sand transition-colors duration-500 [grid-template-columns:32px_56px_1fr_24px] md:[grid-template-columns:48px_64px_1fr_auto_auto_30px]"
    >
      {/* Row number */}
      <span className="font-body text-[10px] tabular-nums tracking-[0.1em] text-text-faded">
        {num}
      </span>

      {/* Type preview */}
      <motion.div
        variants={{
          hover: { scale: 1.08 },
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-14 h-10 rounded-md shrink-0"
        style={{ background: gradient }}
      />

      {/* Title */}
      <motion.span
        variants={{
          hover: { x: 6 },
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="font-body font-semibold text-[13px] md:text-sm uppercase tracking-[0.06em] text-text leading-snug line-clamp-2 group-hover:font-bold transition-[font-weight] duration-200"
      >
        {embed.title}
      </motion.span>

      {/* Type (hidden on mobile) */}
      <span className="hidden md:inline font-body text-[11px] lowercase text-text-muted whitespace-nowrap">
        {embed.type.toLowerCase()}
      </span>

      {/* Editorial (hidden on mobile) */}
      <span className="hidden md:inline font-body text-[11px] lowercase text-text-faded whitespace-nowrap">
        {embed.editorial.toLowerCase()}
      </span>

      {/* Arrow */}
      <motion.span
        variants={{
          hover: { opacity: 1 },
        }}
        initial={{ opacity: 0.3 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="font-body text-sm text-text"
      >
        ↗
      </motion.span>
    </motion.a>
  )
}
