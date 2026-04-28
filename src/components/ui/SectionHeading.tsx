import { useRef } from 'react'
import { useScrollFade } from '../../hooks/useScrollFade'

interface SectionHeadingProps {
  index: string
  label?: string
  /** Title accepts HTML with <em> for blue-accent italic (e.g. "selected <em>work.</em>") */
  title: string
  description?: string
}

export function SectionHeading({
  index,
  label,
  title,
  description,
}: SectionHeadingProps) {
  const indexText = label ? `${index} · ${label}` : index
  const titleRef = useRef<HTMLHeadingElement>(null)
  useScrollFade(titleRef)

  return (
    <div className="section-header">
      <span className="section-index">{indexText}</span>
      <h2
        ref={titleRef}
        className="section-title"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}
