import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeading } from '../../src/components/ui/SectionHeading'

describe('SectionHeading', () => {
  it('renders the title HTML', () => {
    const { container } = render(<SectionHeading title="selected <em>work.</em>" />)
    const title = container.querySelector('h2.section-title')
    expect(title).not.toBeNull()
    expect(title?.innerHTML).toBe('selected <em>work.</em>')
  })

  it('renders the description when given', () => {
    render(<SectionHeading title="how i <em>work.</em>" description="a short lede" />)
    expect(screen.getByText('a short lede')).toBeInTheDocument()
  })

  it('renders no section index ever', () => {
    const { container } = render(
      <SectionHeading title="how i <em>work.</em>" description="a short lede" />,
    )
    expect(container.querySelector('.section-index')).toBeNull()
    expect(container.firstElementChild?.firstElementChild?.tagName).toBe('H2')
  })
})
