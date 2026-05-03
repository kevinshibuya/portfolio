import { useTranslation } from 'react-i18next'
import { Stagger } from '../ui/Stagger'
import { SectionHeading } from '../ui/SectionHeading'
import { skillCategories } from '../../data/skills'
import { STAGGER_PRESETS } from '../../utils/animations'

const categoryKeys: Record<string, string> = {
  frontend: 'sections.skills.frontend',
  backend: 'sections.skills.backend',
  expertise: 'sections.skills.expertise',
}

export function Skills() {
  const { t } = useTranslation()

  return (
    <section id="skills" className="section section--sand">
      <div className="section-inner">
        <SectionHeading
          index={t('sections.skills.index')}
          label={t('sections.skills.label')}
          title={t('sections.skills.title')}
          description={t('sections.skills.description')}
        />

        <Stagger
          recipe="slideInLeft"
          stagger={STAGGER_PRESETS.skillsColumns}
          className="skills-grid section-spacing-content"
        >
          {skillCategories.map((category, ci) => (
            <div key={category.key} className="skills-col">
              <div className="skills-col-head">
                <span className="skills-num">0{ci + 1}</span>
                <h3 className="skills-title">{t(categoryKeys[category.key])}</h3>
              </div>
              <Stagger
                recipe="slideInLeft"
                stagger={STAGGER_PRESETS.skillsItems}
                className="skills-list"
              >
                {category.skills.map((skill) => (
                  <div key={skill} className="skills-item">
                    <span className="skills-dot" />
                    <span>{skill.toLowerCase()}</span>
                  </div>
                ))}
              </Stagger>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
