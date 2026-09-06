interface SectionHeadingProps {
  /** Title accepts HTML with <em> for blue-accent italic (e.g. "selected <em>work.</em>") */
  title: string
  description?: string
}

export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="section-header">
      <h2
        className="section-title"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}
