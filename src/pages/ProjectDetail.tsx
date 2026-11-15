import { useEffect, useLayoutEffect, useRef, type ReactElement } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { rankedProjects } from '../data/archive'
import { architectures, mediaNotes } from '../data/architecture'
import type { RowLayout } from '../data/galleries'
import { columnOf, coverOf, frameAspect, galleryOf } from '../data/media'
import { useOpeningScroll } from '../hooks/useScrollMemory'
import { useWide } from '../hooks/useWide'
import { setPageMeta, resetPageMeta } from '../utils/pageMeta'
import type { MediaItem, Project } from '../types/content'
import { PaintWindow } from '../components/canvas/PaintWindow'
import { Closing } from '../components/layout/Closing'
import { TLink, pageArrived, usePageEnter } from '../components/layout/PageChange'
import { DarkSection } from '../components/sections/MoreWork'
import { Diagram } from '../components/ui/Diagram'
import { Frame, Shot } from '../components/ui/Frame'
import { Label } from '../components/ui/Label'
import { Roll } from '../components/ui/Roll'
import { SoftSticky, Travel } from '../components/ui/Travel'
import { WorkRow } from '../components/ui/WorkRow'

/** The host of a public address, as a reader would say it. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** The five projects after this one in rank order, wrapping round. */
function othersOf(project: Project): Project[] {
  const at = rankedProjects.indexOf(project)
  return Array.from({ length: 5 }, (_, i) => rankedProjects[(at + 1 + i) % rankedProjects.length])
}

function NotFound(): ReactElement {
  const { t } = useI18n()
  useLayoutEffect(() => {
    pageArrived()
  }, [])
  return (
    <main className="notfound container">
      <h1 className="h1">{t('project.notFound')}</h1>
      <p className="p1">{t('project.notFoundDescription')}</p>
      <TLink to="/" state={{ top: true }} className="chip p2 lower">
        {t('project.backHome')}
      </TLink>
    </main>
  )
}

/** The size hint for a still in each kind of row. */
const SIZES: Record<RowLayout, string> = {
  full: '(max-width: 860px) 92vw, 1180px',
  pair: '(max-width: 860px) 92vw, 590px',
  duo: '(max-width: 860px) 92vw, 880px',
  phones: '280px',
}

/**
 * A case study, the same template for every project, in two forms.
 *
 * Wide: the opening screen has the title, what kind of thing it is, one line
 * and the way to the live thing, the year cut out of the paint at the lower
 * left, and a slot at the lower right where the project's recording starts;
 * the recording travels down the page to head the media column. Then one
 * paragraph, every frame in one numbered column with no words between them,
 * the architecture where the project has one, and the credits in a column
 * that comes to rest beside them.
 *
 * Narrow: the facts (who it was for, the role, the team, the stack) stand
 * under the title with the way to the live thing; the recording, the one
 * paragraph, the architecture, then the evidence in a few groups, each at its
 * own scale.
 *
 * Both end with more work and the way back to all work, on black.
 */
function Page({ project }: { project: Project }): ReactElement {
  const { t, lang } = useI18n()
  const rootRef = useRef<HTMLElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const { slug } = project
  const title = project.title[lang]

  useOpeningScroll()

  useEffect(() => {
    setPageMeta(`${project.title[lang]} · kevin shibuya`, project.description[lang])
    return () => resetPageMeta()
  }, [project, lang])

  usePageEnter(rootRef, slug)

  const wide = useWide()
  const { lead, groups } = galleryOf(slug)
  const column = columnOf(slug)
  const architecture = architectures[slug]
  const alt = (item: MediaItem, n: number): string =>
    t(item.type === 'clip' ? 'project.recording' : 'project.screen', { title, n })
  const status = t(`project.status.${project.status}`)
  const quiet = t(project.status === 'unlaunched' ? 'project.neverLaunched' : 'project.privateLink')
  // A personal project was made for no client: the page says so in the reader's language.
  const client = project.origin === 'personal' ? t('project.personal') : project.client
  // Frames are numbered down the page; the lead is 01.
  const numbers = new Map(groups.flatMap((group) => group.rows.flatMap((row) => row.items)).map((item, index) => [item.id, index + 2]))

  return (
    <main ref={rootRef}>
      <section className="p-open">
        <div className="p-open-in container">
          <h1 className="p-title h1" data-enter="title">
            {title}
          </h1>
          <div className="p-row grid">
            <p className="p-kind p1 lower" data-enter="pop">
              {project.kind[lang]}
            </p>
            <p className="p-desc p1" data-enter="pop">
              {project.line[lang]}
            </p>
            {wide && (
              <p className="p-live p1" data-enter="pop">
                {project.liveUrl ? (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="p-live-link lower">
                    <Roll>{t('project.live')}</Roll>
                    <span className="chip p2">{hostOf(project.liveUrl)}</span>
                  </a>
                ) : (
                  <span className="muted lower">
                    {status} · {quiet}
                  </span>
                )}
              </p>
            )}
          </div>
          {!wide && (
            <div className="p-facts" data-enter="pop">
              <dl className="facts p2">
                <dt>{t('project.client')}</dt>
                <dd>{client}</dd>
                <dt>{t('project.year')}</dt>
                <dd>{project.year}</dd>
                <dt>{t('project.state')}</dt>
                <dd>
                  {project.liveUrl ? status : `${status}, ${quiet}`}
                </dd>
                <dt>{t('project.role')}</dt>
                <dd>{project.role[lang]}</dd>
                <dt>{t('project.team')}</dt>
                <dd>{project.team[lang]}</dd>
                <dt>{t('project.stack')}</dt>
                <dd>{project.techStack.slice(0, 7).join(', ')}</dd>
              </dl>
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="p-live-link p1 lower">
                  <Roll>{t('project.live')}</Roll>
                  <span className="chip p2">{hostOf(project.liveUrl)}</span>
                </a>
              )}
            </div>
          )}
          <p className="p-yearmark mega" data-enter="pop" aria-hidden="true">
            <PaintWindow text={String(project.year)} />
          </p>
          <nav className="p-crumbs" aria-label="breadcrumb" data-enter="late">
            <TLink to="/all-work">
              <Roll>{t('project.crumbWork')}</Roll>
            </TLink>
            <span className="chip" aria-current="page">
              {title}
            </span>
          </nav>
          <div className="p-slot" ref={slotRef} style={{ aspectRatio: frameAspect(lead).toFixed(4) }}>
            <Frame item={lead} alt={lead ? alt(lead, 1) : ''} sizes="40vw" />
          </div>
        </div>
      </section>

      {wide ? (
        <section className="p-detail p-detail--column container grid">
          <div className="p-media">
            {lead && (
              <Travel slotRef={slotRef}>
                <Shot n={1} item={lead} alt={alt(lead, 1)} sizes="760px" eager enter />
              </Travel>
            )}
            <div className="p-body p1">
              <p>{project.body[lang]}</p>
              {mediaNotes[slug] && <p className="p-note p2 muted">{mediaNotes[slug][lang]}</p>}
            </div>
            <div className="p-column">
              {column.map((item, index) => (
                <Shot
                  key={item.id}
                  n={index + 2}
                  item={item}
                  alt={alt(item, index + 2)}
                  className={item.shape === 'phone' ? 'shot--half' : undefined}
                  sizes={item.shape === 'phone' ? '380px' : '760px'}
                />
              ))}
            </div>
            {architecture && (
              <figure className="diagram">
                <Frame className="diagram-frame">
                  <Diagram architecture={architecture} title={t('project.diagram', { title })} />
                </Frame>
                <figcaption className="diagram-caption p1">{architecture.caption[lang]}</figcaption>
              </figure>
            )}
          </div>

          <SoftSticky top={96} className="p-credits p1">
            <div className="credit-group">
              <h2 className="tag">{t('project.credits')}</h2>
              <dl className="credit-rows">
                <dt>{t('project.client')}</dt>
                <dd>{client}</dd>
                <dt>{t('project.year')}</dt>
                <dd>{project.year}</dd>
                <dt>{t('project.state')}</dt>
                <dd>{status}</dd>
                <dt>{t('project.role')}</dt>
                <dd>{project.role[lang]}</dd>
                <dt>{t('project.team')}</dt>
                <dd>{project.team[lang]}</dd>
              </dl>
            </div>
            <div className="credit-group">
              <h2 className="tag">{t('project.stack')}</h2>
              <ul className="credit-list">
                {project.techStack.slice(0, 7).map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </SoftSticky>
        </section>
      ) : (
        <section className="p-detail container">
          <div className="p-lead grid">
            <div className="p-lead-media">
              {lead && (
                <Travel slotRef={slotRef}>
                  <Shot n={1} item={lead} alt={alt(lead, 1)} sizes="(max-width: 860px) 92vw, 780px" eager enter />
                </Travel>
              )}
            </div>
            <div className="p-body p1">
              <p>{project.body[lang]}</p>
              {mediaNotes[slug] && <p className="p-note p2 muted">{mediaNotes[slug][lang]}</p>}
            </div>
          </div>

          {architecture && (
            <figure className="diagram grid">
              <Frame className="diagram-frame">
                <Diagram architecture={architecture} title={t('project.diagram', { title })} />
              </Frame>
              <figcaption className="diagram-caption p1">{architecture.caption[lang]}</figcaption>
            </figure>
          )}

          {groups.map((group, g) => (
            <div key={g} className="p-group">
              {group.label && <h2 className="tag p-group-label">{group.label[lang]}</h2>}
              {group.rows.map((row, r) => (
                <div key={r} className={`p-shots p-shots--${row.layout}`}>
                  {row.items.map((item) => {
                    const n = numbers.get(item.id) ?? 0
                    return (
                      <Shot
                        key={item.id}
                        n={n}
                        item={item}
                        alt={alt(item, n)}
                        grow={row.layout === 'duo'}
                        className={item.shape === 'phone' ? 'shot--phone' : undefined}
                        sizes={item.shape === 'phone' ? SIZES.phones : SIZES[row.layout]}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <DarkSection className="mw">
        <div className="container">
          <h2>
            <Label text={t('project.more')} filmed />
          </h2>
          <ul className="rows">
            {othersOf(project).map((other) => (
              <li key={other.slug}>
                <WorkRow
                  to={`/projects/${other.slug}`}
                  title={other.title[lang]}
                  thumb={
                    <Frame
                      className="wrow-thumb"
                      item={coverOf(other.slug)}
                      alt={t('project.screen', { title: other.title[lang], n: 1 })}
                      sizes="(max-width: 860px) 92vw, 300px"
                    />
                  }
                />
              </li>
            ))}
            <li>
              <WorkRow to="/all-work" title={t('allWork.title')} />
            </li>
          </ul>
        </div>
      </DarkSection>

      <Closing />
    </main>
  )
}

export function ProjectDetail(): ReactElement {
  const { slug } = useParams<{ slug: string }>()
  const project = rankedProjects.find((p) => p.slug === slug)
  if (!project) return <NotFound />
  // Keyed by project: another project is another page, opened from its top.
  return <Page key={project.slug} project={project} />
}
