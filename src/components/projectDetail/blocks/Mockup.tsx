import type { Block, Project } from '../../../types/content'

type MockupBlock = Extract<Block, { type: 'mockup' }>

interface Props {
  block: MockupBlock
  project: Project
  lang: 'en' | 'pt'
}

export function Mockup({ block, project, lang }: Props) {
  const src = project.mockups?.[block.variant]
  if (!src) {
    console.warn(
      `Mockup block referenced ${block.variant} on project "${project.id}" with no mockups`
    )
    return null
  }
  const alt = `${project.title[lang]} ${block.variant} mockup`
  return (
    <figure className="project-detail-figure project-detail-figure--wide">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="project-detail-figure-img"
      />
    </figure>
  )
}
