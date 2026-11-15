import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useI18n } from '../i18n'
import { ARCHIVE_TOTALS, interactives, rankedProjects, typeCounts } from '../data/archive'
import { stripOf } from '../data/media'
import { useOpeningScroll } from '../hooks/useScrollMemory'
import { setPageMeta, resetPageMeta } from '../utils/pageMeta'
import type { EmbedType } from '../types/content'
import { Closing } from '../components/layout/Closing'
import { usePageEnter } from '../components/layout/PageChange'
import { DarkSection } from '../components/sections/MoreWork'
import { PaintWindow } from '../components/canvas/PaintWindow'
import { Arrow } from '../components/ui/Arrow'
import { Shot } from '../components/ui/Frame'
import { Label } from '../components/ui/Label'
import { Tags, WorkRow } from '../components/ui/WorkRow'

/** Where each project's first frame number starts: frames are numbered across the page. */
const STRIPS = rankedProjects.map((project) => stripOf(project.slug))
const FIRST = STRIPS.map((_, index) => STRIPS.slice(0, index).reduce((sum, strip) => sum + strip.length, 0))

/** One kind of newsroom piece: a row that opens its list in place. */
function TypeRow({ type, count }: { type: EmbedType; count: number }): ReactElement {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const id = `pieces-${type.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <li>
      <button type="button" className="type-row" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span className="wrow-head">
          <span className="wrow-title h2">{t(`allWork.types.${type}`)}</span>
          <Tags tags={[t('allWork.pieces', { count })]} />
        </span>
        <span className="wrow-spacer" />
        <span className="type-toggle" aria-hidden="true">
          <Arrow kind="down" />
        </span>
      </button>
      {open && (
        <ul id={id} className="type-list" lang="pt">
          {interactives
            .filter((piece) => piece.type === type)
            .map((piece) => (
              <li key={piece.link}>
                <a href={piece.link} target="_blank" rel="noopener noreferrer" className="piece">
                  <span className="piece-date">
                    {piece.day}.{String(piece.year).slice(2)}
                  </span>
                  <span>{piece.title}</span>
                  <Arrow kind="out" />
                </a>
              </li>
            ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Everything shipped. The page's one heading is the label. Under it, every
 * case study is a row: its title, what it is, the year and state, the arrow,
 * and three numbered frames of one height (a screen, a phone screen, a screen). Then, on black, the newsroom pieces: their
 * count cut out of the paint and a row for each kind, closed until asked for.
 */
export function AllWork(): ReactElement {
  const { t, lang } = useI18n()
  const rootRef = useRef<HTMLElement>(null)

  useOpeningScroll()

  useEffect(() => {
    setPageMeta(t('allWork.meta.title'), t('allWork.meta.description'))
    return () => resetPageMeta()
  }, [t])

  usePageEnter(rootRef)

  return (
    <main ref={rootRef}>
      <section className="aw-open container">
        <h1>
          <Label text={t('allWork.title')} delay={120} filmed />
        </h1>
      </section>

      <section id="work" className="container">
        <ol className="aw-list">
          {rankedProjects.map((project, index) => (
            <li key={project.slug}>
              <WorkRow
                big
                to={`/projects/${project.slug}`}
                title={project.title[lang]}
                asWritten
                tags={[project.kind[lang], `${project.year}, ${t(`project.status.${project.status}`)}`]}
                filmed={index === 0}
                group={index < 3 ? index : undefined}
              />
              <div className="strip">
                {STRIPS[index].map((item, k) => (
                  <Shot
                    key={item.id}
                    n={FIRST[index] + k + 1}
                    item={item}
                    grow
                    alt={t('project.screen', { title: project.title[lang], n: k + 1 })}
                    sizes={item.shape === 'phone' ? '180px' : '(max-width: 860px) 92vw, 520px'}
                    eager={index === 0}
                    enter={index < 3}
                    group={index}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <DarkSection className="pieces">
        <div className="container">
          <h2>
            <Label text={t('allWork.interactives')} />
          </h2>
          <div className="pieces-head grid">
            <p className="pieces-count mega">
              <PaintWindow text={String(ARCHIVE_TOTALS.interactives)} />
            </p>
            <p className="pieces-note p1">{t('allWork.note')}</p>
          </div>
          <ul className="rows">
            {typeCounts.map(({ type, count }) => (
              <TypeRow key={type} type={type} count={count} />
            ))}
          </ul>
        </div>
      </DarkSection>

      <Closing />
    </main>
  )
}
