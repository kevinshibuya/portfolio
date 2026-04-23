import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { workExperiences } from '../../data/workExperience'

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

      <div className="work-list">
        {workExperiences.map((exp, i) => {
          const open = expandedIdx === i
          const num = `0${i + 1}`

          return (
            <div key={exp.id} className={`work-row${open ? ' is-open' : ''}`}>
              <button
                className="work-row-head"
                onClick={() => setExpandedIdx(open ? -1 : i)}
                aria-expanded={open}
              >
                <span className="work-num">{num}</span>
                <div className="work-main">
                  <div className="work-title-line">
                    <h3 className="work-company">{exp.company.toLowerCase()}</h3>
                    <span className="work-period">{exp.period}</span>
                  </div>
                  <span className="work-role">{exp.role[lang].toLowerCase()}</span>
                </div>
                <span className={`work-toggle${open ? ' is-open' : ''}`}>+</span>
              </button>

              {open && (
                <div className="work-body">
                  <div className="work-body-inner">
                    <ul className="work-bullets">
                      {exp.description[lang].map((bullet, j) => (
                        <li key={j}>{bullet.toLowerCase()}</li>
                      ))}
                    </ul>

                    {exp.highlight && (
                      <div className="work-highlight">
                        <span className="work-highlight-label">
                          {t('sections.work.award')}
                        </span>
                        <p>{exp.highlight[lang].toLowerCase()}</p>
                      </div>
                    )}

                    <div className="work-tags">
                      {exp.technologies.map((tech) => (
                        <Tag
                          key={tech}
                          label={tech.toLowerCase()}
                          variant="pill"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
