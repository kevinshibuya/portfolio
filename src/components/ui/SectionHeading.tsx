interface SectionHeadingProps {
  index?: string
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
  const indexText = index
    ? (label ? `${index} · ${label}` : index)
    : null

  return (
    <div className="section-header">
      {indexText && <span className="section-index">{indexText}</span>}
      <h2
        className="section-title"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}
