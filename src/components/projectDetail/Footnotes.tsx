import { useTranslation } from 'react-i18next'
import type { Project } from '../../types/content'

interface Props {
  project: Project
}

export function Footnotes({ project }: Props) {
  const { t } = useTranslation()
  if (!project.mockedServices || project.mockedServices.length === 0) return null

  return (
    <aside className="project-detail-footnotes">
      <p className="project-detail-footnotes-label">{t('projectDetail.notes')}</p>
      <ul className="project-detail-footnotes-list">
        {project.mockedServices.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </aside>
  )
}
