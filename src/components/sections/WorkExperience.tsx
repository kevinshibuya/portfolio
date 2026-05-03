import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Stagger } from '../ui/Stagger'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { workExperiences } from '../../data/workExperience'
import { STAGGER_PRESETS } from '../../utils/animations'
import { useMotion } from '../../context/MotionContext'

export function WorkExperience() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const { prefersReducedMotion } = useMotion()
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
                <motion.span
                  className="work-toggle"
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  +
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="body"
                    className="work-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.32,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ overflow: 'hidden' }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </Stagger>
    </section>
  )
}
