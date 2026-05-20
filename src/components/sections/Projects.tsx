import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'

const FEATURED_LIMIT = 4

function getFeatured(): Project[] {
  return projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= FEATURED_LIMIT)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = getFeatured()
  const [active, setActive] = useState(0)
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    mediaRefs.current.forEach((node, idx) => {
      if (!node) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(idx)
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
      )
      obs.observe(node)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const current = featured[active]

  return (
    <section id="projects" className="section project-section">
      <div className="project-grid">
        <aside className="project-aside">
          {/* Mobile-static block (Task 3) */}
          <div className="project-aside__mobile">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>
            <h2 className="project-aside__title-static">
              <Trans i18nKey="sections.projects.title" components={{ em: <em /> }} />
            </h2>
            <p className="project-aside__copy">{t('sections.projects.intro')}</p>
            <span className="project-aside__year">
              {String(featured.length).padStart(2, '0')} · projects
            </span>
          </div>

          {/* Desktop-dynamic block — swaps per active project */}
          <div className="project-aside__desktop">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>

            <div className="project-aside__index">
              <span className="project-aside__index-now">{String(active + 1).padStart(2, '0')}</span>
              <span className="project-aside__index-sep">/</span>
              <span className="project-aside__index-total">
                {String(featured.length).padStart(2, '0')}
              </span>
            </div>

            <motion.h2
              key={current.id + '-t'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="project-aside__title"
            >
              {current.title[lang]}
            </motion.h2>

            {current.tagline && (
              <motion.p
                key={current.id + '-tg'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="project-aside__tagline"
              >
                {current.tagline[lang]}
              </motion.p>
            )}

            <motion.p
              key={current.id + '-d'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="project-aside__copy"
            >
              {current.description[lang]}
            </motion.p>

            <motion.ul
              key={current.id + '-tech'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="project-aside__tech"
            >
              {current.techStack.slice(0, 6).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </motion.ul>

            <div className="project-aside__bottom">
              <span className="project-aside__year">year · {current.year}</span>
              <Link to={`/projects/${current.slug}`} className="project-aside__cta">
                ↗ {t('sections.projects.caseStudy')}
              </Link>
            </div>
          </div>
        </aside>

        <div className="project-list">
          {featured.map((project, idx) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={idx}
              lang={lang}
              mediaRefCb={(el) => {
                mediaRefs.current[idx] = el
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface ProjectRowProps {
  project: Project
  index: number
  lang: 'en' | 'pt'
  mediaRefCb: (el: HTMLDivElement | null) => void
}

function ProjectRow({ project, index, lang, mediaRefCb }: ProjectRowProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])
  const [hover, setHover] = useState(false)

  function setRef(el: HTMLDivElement | null) {
    mediaRef.current = el
    mediaRefCb(el)
  }

  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div
        ref={setRef}
        className="project-row__media"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{ background: project.gradient }}
      >
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            style={{ y: imgY }}
            animate={{ scale: hover ? 1.06 : 1 }}
            transition={{ scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}
