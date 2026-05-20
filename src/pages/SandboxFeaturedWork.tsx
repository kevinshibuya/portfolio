import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import type { Project } from '../types/content'
import '../styles/sandbox-featured-work.css'

const featured: Project[] = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 6)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
  .slice(0, 5)

const lang: 'en' | 'pt' = 'en'

export function SandboxFeaturedWork() {
  // Cursor follower — position springs to smooth motion; velocity drives skew.
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { damping: 28, stiffness: 380, mass: 0.4 })
  const springY = useSpring(cursorY, { damping: 28, stiffness: 380, mass: 0.4 })
  const vx = useVelocity(springX)
  // Aggressive rotate driven by horizontal velocity — the box swings around
  // the cursor anchor. Negative coefficient so the leading edge tips back
  // against the direction of motion (it visibly "trails").
  const rotate = useTransform(vx, [-2500, 2500], [18, -18], { clamp: true })

  const [hovering, setHovering] = useState(false)
  const [active, setActive] = useState(0)

  // Detect the project closest to the viewport center via IntersectionObserver.
  // rootMargin -45/-45 makes the active item whichever sits in the middle 10%.
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

  function handleMove(e: React.MouseEvent) {
    cursorX.set(e.clientX)
    cursorY.set(e.clientY)
  }

  const current = featured[active]

  return (
    <main className="sandbox-fw" onMouseMove={handleMove}>
      <SandboxHeader />

      <section className="fw">
        <div className="fw__grid">
          <aside className="fw__sticky">
            {/* ---- Mobile: static fallback (the sticky aside isn't actually
                 sticky on small screens, so showing per-project info would
                 strand it above the fold once you scroll into the list) ---- */}
            <div className="fw__sticky-mobile">
              <span className="fw__eyebrow">// selected work</span>
              <h2 className="fw__title fw__title--static">
                selected <em>work.</em>
              </h2>
              <p className="fw__copy">
                a handful of recent projects i&apos;m proudest of — newsroom tools, scroll-driven specials,
                and interactive embeds that reached millions of brazilian readers.
              </p>
              <span className="fw__year">
                {String(featured.length).padStart(2, '0')} · projects
              </span>
            </div>

            {/* ---- Desktop: dynamic per-active-project content ---- */}
            <div className="fw__sticky-desktop">
            <span className="fw__eyebrow">// selected work</span>

            <div className="fw__index">
              <span className="fw__index-now">{String(active + 1).padStart(2, '0')}</span>
              <span className="fw__index-sep">/</span>
              <span className="fw__index-total">{String(featured.length).padStart(2, '0')}</span>
            </div>

            <motion.h2
              key={current.id + '-t'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="fw__title"
            >
              {current.title[lang]}
            </motion.h2>

            {current.tagline && (
              <motion.p
                key={current.id + '-tg'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="fw__tagline"
              >
                {current.tagline[lang]}
              </motion.p>
            )}

            <motion.p
              key={current.id + '-d'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="fw__copy"
            >
              {current.description[lang]}
            </motion.p>

            <motion.ul
              key={current.id + '-tech'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="fw__tech"
            >
              {current.techStack.slice(0, 6).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </motion.ul>

            <div className="fw__bottom">
              <span className="fw__year">year · {current.year}</span>
              <Link to={`/projects/${current.slug}`} className="fw__cta">
                ↗ case study
              </Link>
            </div>
            </div>
          </aside>

          <div className="fw__list">
            {featured.map((project, idx) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={idx}
                mediaRefCb={(el) => {
                  mediaRefs.current[idx] = el
                }}
                onHoverEnter={() => setHovering(true)}
                onHoverLeave={() => setHovering(false)}
              />
            ))}
          </div>
        </div>
      </section>

      <SandboxFooter />

      <motion.div
        className="fw__cursor"
        style={{ x: springX, y: springY }}
        aria-hidden="true"
      >
        <motion.div
          className="fw__cursor-rotor"
          style={{ rotate }}
          animate={hovering ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="fw__cursor-box">view project</span>
        </motion.div>
      </motion.div>
    </main>
  )
}

interface ProjectRowProps {
  project: Project
  index: number
  mediaRefCb: (el: HTMLDivElement | null) => void
  onHoverEnter: () => void
  onHoverLeave: () => void
}

function ProjectRow({ project, index, mediaRefCb, onHoverEnter, onHoverLeave }: ProjectRowProps) {
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
    <Link to={`/projects/${project.slug}`} className="fw__row">
      <div
        ref={setRef}
        className="fw__media"
        onPointerEnter={() => {
          setHover(true)
          onHoverEnter()
        }}
        onPointerLeave={() => {
          setHover(false)
          onHoverLeave()
        }}
        style={{ background: project.gradient }}
      >
        <span className="fw__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="fw__img"
            style={{ y: imgY }}
            animate={{ scale: hover ? 1.06 : 1 }}
            transition={{ scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
          />
        )}
      </div>
      <div className="fw__meta">
        <h3 className="fw__meta-title">{project.title[lang]}</h3>
        <span className="fw__meta-tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}

function SandboxHeader() {
  return (
    <header className="sandbox-fw__nav">
      <span className="sandbox-fw__crumb">sandbox · featured work</span>
      <span className="sandbox-fw__crumb sandbox-fw__crumb--muted">
        sticky-left swaps per active card · skewing cursor box · image-only hover
      </span>
    </header>
  )
}

function SandboxFooter() {
  return (
    <footer className="sandbox-fw__footer">
      <p>throwaway prototype · branch: feat/featured-work-good-fella-test</p>
    </footer>
  )
}

export default SandboxFeaturedWork
