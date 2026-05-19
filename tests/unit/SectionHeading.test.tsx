import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeading } from '../../src/components/ui/SectionHeading'

describe('SectionHeading', () => {
  it('renders the section index when provided', () => {
    render(<SectionHeading index="01 · featured" title="selected <em>work.</em>" />)
    expect(screen.getByText('01 · featured')).toBeInTheDocument()
  })

  it('omits the index span entirely when index is not passed', () => {
    const { container } = render(<SectionHeading title="how i <em>work.</em>" />)
    expect(container.querySelector('.section-index')).toBeNull()
  })

  it('joins index and label with a middle dot when both are provided', () => {
    render(<SectionHeading index="01" label="featured" title="selected <em>work.</em>" />)
    expect(screen.getByText('01 · featured')).toBeInTheDocument()
  })
})
