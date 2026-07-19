import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stagger } from '../ui/Stagger'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { WorkRow } from '../ui/WorkRow'
import { workExperiences } from '../../data/workExperience'
import { STAGGER_PRESETS } from '../../utils/animations'

export function WorkExperience() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const [expandedIdx, setExpandedIdx] = useState(0)

  return (
    <section id="work" className="section">
      <SectionHeading
        index={t('sections.work.index')}
        label={t('sections.work.label')}
        title={t('sections.work.title')}
        description={t('sections.work.description')}
      />

      <Stagger
        recipe="slideInLeft"
        stagger={STAGGER_PRESETS.workRows}
        className="work-list section-spacing-content"
      >
        {workExperiences.map((exp, i) => (
          <WorkRow
            key={exp.id}
            index={i}
            title={exp.company.toLowerCase()}
            meta={[exp.role[lang], exp.period[lang]]}
            expandable
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
          >
            {(exp.location || exp.workMode) && (
              <div className="work-meta-line">
                {exp.location && (
                  <span className="work-location">{exp.location.toLowerCase()}</span>
                )}
                {exp.workMode && (
                  <span className="work-mode-pill">
                    <span className="work-mode-dot" aria-hidden="true" />
                    {t(`sections.work.modes.${exp.workMode}`)}
                  </span>
                )}
              </div>
            )}

            <ul className="work-bullets">
              {exp.description[lang].map((bullet, j) => (
                <li key={j}>{bullet.toLowerCase()}</li>
              ))}
            </ul>

            {exp.highlight && (
              <div className="work-highlight">
                <span className="work-highlight-label">{t('sections.work.award')}</span>
                <p>{exp.highlight[lang].toLowerCase()}</p>
              </div>
            )}

            <div className="work-tags">
              {exp.technologies.map((tech) => (
                <Tag key={tech} label={tech.toLowerCase()} variant="pill" />
              ))}
            </div>
          </WorkRow>
        ))}
      </Stagger>
    </section>
  )
}
