import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projects } from '../../data/projects'
import { captionMeta } from '../../utils/projectMeta'
import { WorkRow } from '../ui/WorkRow'

/**
 * More work (ADR 0014): the highlighted projects the corridor does not carry,
 * under the scene, in normal flow on the chapter's cream, closed by the volume
 * sentence that links to All work.
 *
 * The list markup mirrors the Stream's (an `ol` of WorkRows), not Work
 * Experience's stagger, so a screen reader hears a plain list of links. No
 * heading, eyebrow or number of its own: the Selected Work heading names the
 * section. Static, so it renders the same with and without WebGL.
 */

/** Past the corridor's four, in the site's own ranking. */
const MORE = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) > 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

export function MoreWork(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  return (
    <div className="more-work">
      <ol className="more-work-list">
        {MORE.map((p, index) => (
          <li key={p.slug}>
            <WorkRow index={index} title={p.title[lang]} meta={captionMeta(p)} href={`/projects/${p.slug}`} />
          </li>
        ))}
      </ol>
      <p className="more-work-volume">
        {t('sections.projects.moreWork.claim')}
        <span aria-hidden="true"> · </span>
        <Link to="/all-work">
          {t('sections.projects.moreWork.link')}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
    </div>
  )
}
