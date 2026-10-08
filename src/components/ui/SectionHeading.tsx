interface SectionHeadingProps {
  /** Rendered as HTML. Titles are plain lowercase nouns with no italic word and no period (spec decision 16, e.g. "experience"). */
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
