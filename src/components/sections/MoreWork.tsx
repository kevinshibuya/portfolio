import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { useMotion } from '../../context/MotionContext'
import { ARCHIVE_TOTALS, rankedProjects } from '../../data/archive'
import { workExperiences } from '../../data/workExperience'
import { coverOf } from '../../data/media'
import { onFrame } from '../../utils/frame'
import { outPow } from '../../utils/ease'
import { TLink } from '../layout/PageChange'
import { Frame } from '../ui/Frame'
import { Label } from '../ui/Label'
import { Tags, WorkRow } from '../ui/WorkRow'
import { Arrow } from '../ui/Arrow'
import { PaintWindow } from '../canvas/PaintWindow'

const OTHERS = rankedProjects.slice(3)
/** The three most recent jobs; the full history is in the curriculum. */
const JOBS = workExperiences.slice(0, 3)

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** A job's first and last month, counted in months, read from its period ("Nov 2022 – Oct 2023"); an open end is this month. */
function monthsOf(period: string, now: number): [number, number] {
  const marks = [...period.matchAll(/([A-Za-z]{3})[a-z]* (\d{4})/g)].map((m) => Number(m[2]) * 12 + Math.max(0, MONTHS.indexOf(m[1].toLowerCase())))
  const start = marks[0] ?? now
  return [start, marks[1] ?? now]
}

/** Each job's span as a share of the time the three cover together: where its bar starts and how long it is. */
function spansOf(): { left: number; width: number }[] {
  const today = new Date()
  const now = today.getFullYear() * 12 + today.getMonth()
  const spans = JOBS.map((job) => monthsOf(job.period.en, now))
  const first = Math.min(...spans.map(([start]) => start))
  const whole = Math.max(1, now + 1 - first)
  return spans.map(([start, end]) => ({ left: ((start - first) / whole) * 100, width: ((end + 1 - start) / whole) * 100 }))
}

/**
 * A black section whose top edge arrives early: a band grows up out of it as
 * it crosses the viewport, up to 99 px, so the black is there a little sooner
 * than the layout says.
 */
export function DarkSection({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}): ReactElement {
  const ref = useRef<HTMLElement>(null)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion) return
    let last = -1
    return onFrame(() => {
      const top = el.getBoundingClientRect().top
      const fold = window.innerHeight
      if (top > fold + 100 || top < -100) return
      const edge = outPow((fold - top) / 900, 1.5)
      if (Math.abs(edge - last) < 0.002) return
      last = edge
      el.style.setProperty('--edge', edge.toFixed(3))
    })
  }, [prefersReducedMotion])

  return (
    <section ref={ref} id={id} className={`dark${className ? ` ${className}` : ''}`} data-theme="dark">
      <div className="dark-edge" aria-hidden="true" />
      {children}
    </section>
  )
}

/** The closing block: three lines of very large words at staggered indents, the way to all work. */
function AllWorkLink(): ReactElement {
  const { t } = useI18n()
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.classList.add('is-in')
        io.disconnect()
      },
      { rootMargin: '0px 0px -100px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const word = (from: number, order: number): CSSProperties =>
    ({ '--from': `${from}px`, '--cb-delay': `${order * 60}ms` }) as CSSProperties

  return (
    <TLink ref={ref} to="/all-work" className="cb container" aria-label={t('allLink.label', { count: ARCHIVE_TOTALS.pieces })}>
      <p className="cb-note p2 lower" aria-hidden="true">
        {t('allLink.note1', { count: ARCHIVE_TOTALS.caseStudies })}
        <br />
        {t('allLink.note2', { count: ARCHIVE_TOTALS.interactives })}
      </p>
      <span className="cb-lines mega" aria-hidden="true">
        <span className="cb-line">
          <span className="cb-word" style={word(-144, 0)}>
            {t('allLink.l1')}
          </span>
          <span className="cb-word" style={word(144, 1)}>
            <PaintWindow text={String(ARCHIVE_TOTALS.pieces)} />
          </span>
        </span>
        <span className="cb-line">
          <span className="cb-word" style={word(-144, 2)}>
            {t('allLink.l3')}
          </span>
        </span>
        <span className="cb-line">
          <span className="cb-word" style={word(144, 3)}>
            {t('allLink.l4')}
          </span>
          <span className="cb-word cb-arrow" style={word(144, 4)}>
            <Arrow />
          </span>
        </span>
      </span>
    </TLink>
  )
}

/**
 * The home page's black section: the other six case studies as rows, the
 * three most recent jobs as rows of the same anatomy, each with its span drawn
 * as a bar of the paint on one shared time line, and the way to all work.
 */
export function MoreWork(): ReactElement {
  const { t, lang } = useI18n()
  const spans = spansOf()

  return (
    <DarkSection className="more">
      <div className="container more-block">
        <h2>
          <Label text={t('work.more')} />
        </h2>
        <ul className="rows">
          {OTHERS.map((project) => (
            <li key={project.slug}>
              <WorkRow
                to={`/projects/${project.slug}`}
                title={project.title[lang]}
                tags={[project.kind[lang], `${project.year}, ${t(`project.status.${project.status}`)}`]}
                thumb={
                  <Frame
                    className="wrow-thumb"
                    item={coverOf(project.slug)}
                    alt={t('project.screen', { title: project.title[lang], n: 1 })}
                    sizes="(max-width: 860px) 80vw, 200px"
                  />
                }
              />
            </li>
          ))}
        </ul>
      </div>

      <div id="experience" className="container more-block">
        <h2>
          <Label text={t('experience.title')} />
        </h2>
        <ul className="rows">
          {JOBS.map((job, index) => (
            <li key={job.id}>
              <div className="wrow">
                <span className="wrow-head">
                  <span className="wrow-title h2">{job.company}</span>
                  <Tags tags={[job.role[lang], job.period[lang]]} />
                </span>
                <span className="wrow-spacer" />
                <span className="span" aria-hidden="true">
                  <PaintWindow className="span-bar" style={{ left: `${spans[index].left.toFixed(2)}%`, width: `${spans[index].width.toFixed(2)}%` }} />
                </span>
                <span className="wrow-aside">
                  <span>{job.location[lang]}</span>
                  <span>{t(`experience.modes.${job.workMode}`)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <AllWorkLink />
    </DarkSection>
  )
}
