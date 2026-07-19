import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { WorkRow } from '../ui/WorkRow'
import { projects } from '../../data/projects'
import {
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  REDUCED_MOTION_VARIANT,
} from '../../utils/animations'

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(STAGGER_PRESETS.projectCards)
  const rowVariants = prefersReducedMotion ? REDUCED_MOTION_VARIANT : VARIANTS.fadeUp

  return (
    <section id="projects" className="section">
      <SectionHeading
        index={t('sections.projects.index')}
        label={t('sections.projects.label')}
        title={t('sections.projects.title')}
        description={t('sections.projects.description')}
      />

      <motion.div
        className="projects-list section-spacing-content"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={parentVariants}
      >
        {featured.map((project, i) => {
          const title = project.title[lang]
          return (
            <motion.div key={project.id} className="workrow-wrap" variants={rowVariants}>
              <WorkRow
                index={i}
                title={title}
                meta={[
                  String(project.year),
                  ...project.techStack.slice(0, 2).map((tech) => tech.toLowerCase()),
                ]}
                href={`/projects/${project.slug}`}
                preview={{ src: project.mockups?.desktopBento, alt: `${title} preview` }}
              />
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
