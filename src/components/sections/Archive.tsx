import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { ArchiveDropdown } from '../ui/ArchiveDropdown'
import { WorkRow } from '../ui/WorkRow'
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
  archiveKinds,
  byFeatured,
} from '../../data/archive'
import { resolveTitle } from '../../types/content'
import type { ArchiveItem } from '../../types/content'

const PAGE_SIZE = 12
const STAGGER_MS = 40

/** Light-era typeGradients are pastel and glare on the dark rows — wrap them
 *  in a translucent ink overlay so previews read as atmospheric, not raw. */
const darkenedPreview = (gradient: string): string =>
  `linear-gradient(rgba(11,14,20,0.35), rgba(11,14,20,0.35)), ${gradient}`

type SortKey = 'featured' | 'newest' | 'oldest' | 'az' | 'za'

function normalize(s: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) so 'saúde' matches 'saude'.
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function Archive() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language as 'en' | 'pt'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [kind, setKind] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [editorial, setEditorial] = useState<string>('all')
  const [year, setYear] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('featured')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Debounce search by 150ms.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(id)
  }, [search])

  // Reset pagination whenever filter/sort/search changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [debouncedSearch, kind, type, editorial, year, sort])

  // Type and Editorial dropdowns disable when kind != 'all' && kind != 'editorial'.
  const filtersDisabledForNonEditorial = kind !== 'all' && kind !== 'editorial'

  const filtered = useMemo(() => {
    const collation = lang === 'pt' ? 'pt-BR' : 'en'
    let result = archive
    if (kind !== 'all') result = result.filter((i) => i.kind === kind)
    // Skip type/editorial filters when the dropdowns are disabled so a
    // stale 'quiz' selection doesn't silently zero-out a featured-only
    // result. The selections persist; they re-apply when kind returns
    // to 'all' or 'editorial'.
    if (type !== 'all' && !filtersDisabledForNonEditorial)
      result = result.filter((i) => i.type === type)
    if (editorial !== 'all' && !filtersDisabledForNonEditorial)
      result = result.filter((i) => i.editorial === editorial)
    if (year !== 'all') {
      const yNum = parseInt(year, 10)
      result = result.filter((i) => new Date(i.sortDate).getUTCFullYear() === yNum)
    }
    if (debouncedSearch) {
      const q = normalize(debouncedSearch)
      result = result.filter((i) => normalize(resolveTitle(i, lang)).includes(q))
    }
    if (sort === 'featured') result = [...result].sort(byFeatured)
    else if (sort === 'newest') result = [...result].sort((a, b) => b.sortDate - a.sortDate)
    else if (sort === 'oldest') result = [...result].sort((a, b) => a.sortDate - b.sortDate)
    else if (sort === 'az')
      result = [...result].sort((a, b) =>
        resolveTitle(a, lang).localeCompare(resolveTitle(b, lang), collation)
      )
    else if (sort === 'za')
      result = [...result].sort((a, b) =>
        resolveTitle(b, lang).localeCompare(resolveTitle(a, lang), collation)
      )
    return result
  }, [kind, type, editorial, year, debouncedSearch, sort, lang, filtersDisabledForNonEditorial])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const allOpt = useMemo(
    () => ({ value: 'all', label: t('sections.archive.toolbar.all') }),
    [t]
  )
  const kindOptions = useMemo(
    () => [allOpt, ...archiveKinds.map((k) => ({ value: k, label: k }))],
    [allOpt]
  )
  const typeOptions = useMemo(
    () => [allOpt, ...archiveTypes.map((tp) => ({ value: tp, label: tp.toLowerCase() }))],
    [allOpt]
  )
  const editorialOptions = useMemo(
    () => [allOpt, ...archiveEditorials.map((e) => ({ value: e, label: e }))],
    [allOpt]
  )
  const yearOptions = useMemo(
    () => [allOpt, ...archiveYears.map((y) => ({ value: String(y), label: String(y) }))],
    [allOpt]
  )
  const sortOptions = useMemo(
    () => [
      { value: 'featured', label: t('sections.archive.sort.featured') },
      { value: 'newest', label: t('sections.archive.sort.newest') },
      { value: 'oldest', label: t('sections.archive.sort.oldest') },
      { value: 'az', label: t('sections.archive.sort.az') },
      { value: 'za', label: t('sections.archive.sort.za') },
    ],
    [t]
  )

  const activeChips: { label: string; clear: () => void }[] = []
  if (kind !== 'all') activeChips.push({ label: `kind: ${kind}`, clear: () => setKind('all') })
  // Hide type/editorial chips when their filters aren't actually applying
  // (otherwise the chip suggests an active filter that the filtered() memo
  // is silently bypassing).
  if (type !== 'all' && !filtersDisabledForNonEditorial)
    activeChips.push({ label: `type: ${type.toLowerCase()}`, clear: () => setType('all') })
  if (editorial !== 'all' && !filtersDisabledForNonEditorial)
    activeChips.push({ label: `editorial: ${editorial}`, clear: () => setEditorial('all') })
  if (year !== 'all') activeChips.push({ label: `year: ${year}`, clear: () => setYear('all') })

  return (
    <section id="archive" className="section section--sand">
      <div className="section-inner">
        <SectionHeading
          index={t('sections.archive.index')}
          label={t('sections.archive.label')}
          title={t('sections.archive.title')}
          description={t('sections.archive.description')}
        />

        <div className="archive-toolbar">
          <input
            type="search"
            className="archive-search"
            placeholder={t('sections.archive.toolbar.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.kind')}
            value={kind}
            options={kindOptions}
            onChange={setKind}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.type')}
            value={type}
            options={typeOptions}
            onChange={setType}
            disabled={filtersDisabledForNonEditorial}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.editorial')}
            value={editorial}
            options={editorialOptions}
            onChange={setEditorial}
            disabled={filtersDisabledForNonEditorial}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.year')}
            value={year}
            options={yearOptions}
            onChange={setYear}
          />
          <ArchiveDropdown
            label={t('sections.archive.toolbar.sort')}
            value={sort}
            options={sortOptions}
            onChange={(v) => setSort(v as SortKey)}
          />
        </div>

        {activeChips.length > 0 && (
          <div className="archive-chips">
            {activeChips.map((c) => (
              <button key={c.label} className="archive-chip" onClick={c.clear} type="button">
                {c.label} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}

        <p className="archive-count">
          <strong>{filtered.length}</strong> {t('sections.archive.toolbar.countLabel')}
        </p>

        <div className="archive-list section-spacing-content">
          {visible.map((item, idx) => (
            <ArchiveRow
              key={item.id}
              idx={idx}
              item={item}
              lang={lang}
              reduced={prefersReducedMotion}
            />
          ))}
        </div>

        {hasMore && (
          <div className="archive-more">
            <button
              className="btn btn--ghost"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {t('sections.archive.toolbar.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

interface ArchiveRowProps {
  idx: number
  item: ArchiveItem
  lang: 'en' | 'pt'
  reduced: boolean
}

function ArchiveRow({ idx, item, lang, reduced }: ArchiveRowProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const title = resolveTitle(item, lang)
  const isHighlight = item.kind === 'featured' && item.highlight === true
  const delay = reduced ? 0 : Math.min((idx % PAGE_SIZE) * (STAGGER_MS / 1000), 0.4)

  const motionProps = {
    initial: { opacity: 0, x: reduced ? 0 : -16 },
    animate: inView ? { opacity: 1, x: 0 } : { opacity: 0, x: reduced ? 0 : -16 },
    transition: { duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const, delay },
  }

  return (
    <motion.div ref={ref} className="workrow-wrap" {...motionProps}>
      <WorkRow
        index={idx}
        title={title}
        meta={[item.type, item.editorial, item.date].filter(Boolean) as string[]}
        href={item.href}
        internal={item.internal}
        preview={{ gradient: darkenedPreview(item.gradient) }}
        ornament={isHighlight ? <span className="archive-star">★</span> : undefined}
      />
    </motion.div>
  )
}
