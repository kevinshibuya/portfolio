import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { TLink } from '../layout/PageChange'
import { Arrow, type ArrowKind } from './Arrow'

/**
 * A work row: a title, two small tag lines on its baseline, and the arrow in
 * its box at the right margin. On hover the right arrow swings away, a second
 * arrow swings in at the third column and the title slides over to clear it
 * (the ROWS rules in index.css). The same row carries a case study on the
 * work index, on the home page's black list, and the address in the closing.
 */
export interface WorkRowProps {
  title: string
  tags?: string[]
  /** A page of this site (plays the page change) or an outside address. */
  to?: string
  href?: string
  /** `big` is the 90 px row of the work index. */
  big?: boolean
  mark?: ArrowKind
  /** A picture between the tags and the arrow. */
  thumb?: ReactNode
  /** Marks the row the motion films look for. */
  filmed?: boolean
  /** The step of a page's arrival this row belongs to. */
  group?: number
  className?: string
}

/** The two small lines beside a row's title; the last one shares the title's baseline. */
export function Tags({ tags, enter }: { tags: string[]; enter?: string }): ReactElement {
  return (
    <span className="wrow-tags" data-enter={enter && 'pop'} data-enter-group={enter}>
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </span>
  )
}

export function WorkRow({
  title,
  tags = [],
  to,
  href,
  big = false,
  mark = 'in',
  thumb,
  filmed = false,
  group,
  className,
}: WorkRowProps): ReactElement {
  const ref = useRef<HTMLAnchorElement>(null)
  // Where nothing hovers, the row nearest the middle of the screen nudges its arrow instead.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => el.classList.toggle('is-near', entry.isIntersecting), {
      rootMargin: '-42% 0px -42% 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const classes = `wrow${big ? ' wrow--big' : ''}${className ? ` ${className}` : ''}`
  const enter = group === undefined ? undefined : String(group)
  const body = (
    <>
      <span className="wrow-arrow wrow-arrow--l" aria-hidden="true">
        <Arrow kind={mark} />
      </span>
      <span className="wrow-head">
        <span className={`wrow-title ${big ? 'h1' : 'h2'}`} data-enter={enter && 'title'} data-enter-group={enter}>
          {title}
        </span>
        {tags.length > 0 && <Tags tags={tags} enter={enter} />}
      </span>
      <span className="wrow-spacer" />
      {thumb}
      <span className="wrow-arrow wrow-arrow--r" data-enter={enter && 'pop'} data-enter-group={enter}>
        <Arrow kind={mark} />
      </span>
    </>
  )
  const motion = filmed ? 'row-hover' : undefined
  if (to) {
    return (
      <TLink ref={ref} to={to} className={classes} data-motion={motion}>
        {body}
      </TLink>
    )
  }
  const outside = href?.startsWith('http')
  return (
    <a
      ref={ref}
      href={href}
      className={classes}
      data-motion={motion}
      target={outside ? '_blank' : undefined}
      rel={outside ? 'noopener noreferrer' : undefined}
    >
      {body}
    </a>
  )
}
