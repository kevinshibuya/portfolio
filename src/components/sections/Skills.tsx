import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RevealOnView, childVariants } from '../ui/RevealOnView'
import { SectionHeading } from '../ui/SectionHeading'
import { skillCategories } from '../../data/skills'

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
        <RevealOnView variant="fade-up">
          <SectionHeading
            index={t('sections.skills.index')}
            label={t('sections.skills.label')}
            title={t('sections.skills.title')}
            description={t('sections.skills.description')}
          />
        </RevealOnView>

        <RevealOnView variant="stagger-children" staggerAmount={0.06} className="skills-grid">
          {skillCategories.map((category, ci) => (
            <motion.div key={category.key} variants={childVariants} className="skills-col">
              <div className="skills-col-head">
                <span className="skills-num">0{ci + 1}</span>
                <h3 className="skills-title">{t(categoryKeys[category.key])}</h3>
              </div>
              <ul className="skills-list">
                {category.skills.map((skill) => (
                  <li key={skill} className="skills-item">
                    <span className="skills-dot" />
                    <span>{skill.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </RevealOnView>
      </div>
    </section>
  )
}
