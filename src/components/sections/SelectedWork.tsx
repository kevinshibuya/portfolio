import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useI18n } from '../../i18n'
import { useMotion } from '../../context/MotionContext'
import { rankedProjects } from '../../data/archive'
import { leadOf } from '../../data/media'
import { onFrame } from '../../utils/frame'
import { TLink } from '../layout/PageChange'
import { Frame } from '../ui/Frame'
import { Label } from '../ui/Label'
import { Arrow } from '../ui/Arrow'

/** The three projects the home page shows whole, in rank order. */
const SELECTED = rankedProjects.slice(0, 3)

/** The height of the screen's bottom corner that the pinned line keeps to itself, in px. */
const PIN_ZONE = 190

/** The widest lean of a frame, in degrees, and the scroll speed (px a frame) that reaches it. */
const LEAN_MAX = 9
const LEAN_SPEED = 40

/**
 * Three projects stacked down the page: a frame playing a recording in the
 * middle columns, each with its name at the far left from the moment its
 * frame is half on the screen; beside the one in play,
 * the arrow and "view" at the far right; names and "view" drift a little
 * against the scroll; and, pinned to
 * the bottom corners of the screen, a line that says what it is with one
 * result, and its kind, year and state. The frames lean back with the speed
 * of the scroll. On a phone each project is a frame with its name and line
 * under it, and nothing is pinned.
 */
export function SelectedWork(): ReactElement {
  const { t, lang } = useI18n()
  const { prefersReducedMotion } = useMotion()
  const stackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return
    const items = [...stack.querySelectorAll<HTMLElement>('.stack-item')]
    const sides = items.map((item) => [...item.querySelectorAll<HTMLElement>('.stack-side')])
    let lean = 0
    let drifting = false
    let current: number | null = null

    return onFrame((_, delta) => {
      const fold = window.innerHeight
      const box = stack.getBoundingClientRect()
      if (box.bottom < -200 || box.top > fold + 200) return
      const wide = window.innerWidth > 860

      // The project in play: the last one whose top edge has passed the middle of the screen.
      let next: number | null = null
      const rects = items.map((item) => item.getBoundingClientRect())
      rects.forEach((rect, index) => {
        if (rect.top < fold * 0.5) next = index
      })
      if (next !== null && rects[next].bottom < fold * 0.18) next = null
      if (next !== current) {
        current = next
        setActive(next)
      }
      // A project is named once the middle of its frame stands clear of the pinned line's corner.
      rects.forEach((rect, index) => {
        const named = rect.top + rect.height / 2 < fold - PIN_ZONE
        if (named !== ('named' in items[index].dataset)) {
          if (named) items[index].dataset.named = ''
          else delete items[index].dataset.named
        }
      })

      if (!wide || prefersReducedMotion) {
        if (lean !== 0) {
          lean = 0
          stack.style.removeProperty('--lean')
        }
        if (drifting) {
          drifting = false
          for (const group of sides) for (const side of group) side.style.removeProperty('transform')
        }
        return
      }
      drifting = true
      // Names and "view" drift from half their height high to two fifths low as their project crosses.
      rects.forEach((rect, index) => {
        const through = Math.min(1, Math.max(0, (fold - rect.top) / (fold + rect.height)))
        for (const side of sides[index]) side.style.transform = `translateY(${((-0.5 + 0.9 * through) * side.offsetHeight).toFixed(1)}px)`
      })
      // The light 3D: every frame leans back about its trailing edge, by how fast the page moves.
      const wanted = Math.max(-1, Math.min(1, delta / LEAN_SPEED)) * LEAN_MAX
      lean += (wanted - lean) * 0.12
      if (Math.abs(lean) < 0.02 && wanted === 0) lean = 0
      stack.style.setProperty('--lean', `${lean.toFixed(2)}deg`)
      stack.style.setProperty('--lean-origin', lean >= 0 ? '50% 100%' : '50% 0%')
    })
  }, [prefersReducedMotion])

  const shown = active === null ? null : SELECTED[active]

  return (
    <section id="work" className="selected">
      <div className="container">
        <h2>
          <Label text={t('work.selected')} filmed />
        </h2>
        <div className="stack" ref={stackRef}>
          {SELECTED.map((project, index) => (
            <TLink
              key={project.slug}
              to={`/projects/${project.slug}`}
              className={`stack-item grid${active === index ? ' is-active' : ''}`}
              aria-label={t('work.open', { title: project.title[lang] })}
            >
              <span className="stack-name stack-side h2">{project.title[lang]}</span>
              <Frame
                className="stack-frame"
                item={leadOf(project.slug)}
                alt={t('project.recording', { title: project.title[lang], n: 1 })}
                sizes="(max-width: 860px) 80vw, 520px"
              />
              <span className={`stack-arrow stack-side stack-way${active === index ? ' pop' : ''}`} aria-hidden="true">
                <Arrow />
              </span>
              <span className={`stack-view stack-side stack-way h2${active === index ? ' pop' : ''}`}>{t('work.view')}</span>
              <span className="stack-line p1">{project.line[lang]}</span>
            </TLink>
          ))}
        </div>
      </div>
      <div className="pin container grid" aria-hidden={shown ? undefined : 'true'}>
        {shown && (
          <>
            <p key={`line-${shown.slug}`} className="pin-line h4 pop">
              {shown.line[lang]}
            </p>
            <p key={`tags-${shown.slug}`} className="pin-tags p2 lower pop">
              <span>{shown.kind[lang]}</span>
              <span>
                {shown.year}, {t(`project.status.${shown.status}`)}
              </span>
            </p>
          </>
        )}
      </div>
      <div className="selected-end" />
    </section>
  )
}
