import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeading } from '../ui/SectionHeading'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { skillCategories } from '../../data/skills'

const categoryKeys: Record<string, string> = {
  frontend: 'sections.skills.frontend',
  backend: 'sections.skills.backend',
  expertise: 'sections.skills.expertise',
}

export function Skills() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const gridRef = useRef<HTMLDivElement>(null)

  useScrollReveal(gridRef, { childSelector: ':scope > div', stagger: 0.15 })

  return (
    <section
      id="skills"
      className="relative px-6 md:px-12 lg:px-20 py-28 md:py-36 bg-bg-sand"
    >
      <div className="max-w-[1280px] mx-auto">
        <SectionHeading
          index={t('sections.skills.index')}
          label={t('sections.skills.label')}
          title={t('sections.skills.title')}
          description={t('sections.skills.description')}
          deps={[lang]}
        />

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 max-w-[1100px]"
        >
          {skillCategories.map((category, ci) => (
            <div key={category.key}>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-body text-[11px] font-semibold tabular-nums tracking-[0.1em] text-terra-400">
                  0{ci + 1}
                </span>
                <h3 className="flex-1 font-display text-[18px] font-semibold lowercase tracking-[-0.01em] text-text border-b border-border pb-2.5 m-0">
                  {t(categoryKeys[category.key])}
                </h3>
              </div>
              <ul className="flex flex-col gap-2.5">
                {category.skills.map((skill) => (
                  <li
                    key={skill}
                    className="group flex items-center gap-3 font-body text-[14px] lowercase text-text-muted py-2 border-b border-dashed border-transparent transition-all duration-300 hover:text-text hover:border-terra-200 hover:translate-x-1"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-terra-300 transition-all duration-300 group-hover:bg-terra-500 group-hover:scale-[1.6]"
                    />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
