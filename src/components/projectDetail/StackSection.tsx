import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Tag } from '../ui/Tag'
import { useMotion } from '../../context/MotionContext'
import { staggerContainer } from '../../utils/animations'
import type { Project } from '../../types/content'

interface Props {
  project: Project
}

export function StackSection({ project }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  if (!project.techStack || project.techStack.length === 0) return null

  return (
    <motion.section
      className="project-detail-stack"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(0.04)}
    >
      <h2 className="project-detail-stack-label">{t('projectDetail.stack')}</h2>
      <div className="project-detail-stack-chips">
        {project.techStack.map((tech) => (
          <motion.span
            key={tech}
            variants={
              prefersReducedMotion
                ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                : {
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                  }
            }
          >
            <Tag label={tech.toLowerCase()} variant="pill" />
          </motion.span>
        ))}
      </div>
    </motion.section>
  )
}
