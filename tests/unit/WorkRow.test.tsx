import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../src/context/MotionContext'
import { PageChangeProvider } from '../../src/components/layout/PageChange'
import { WorkRow } from '../../src/components/ui/WorkRow'

function wrap(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <PageChangeProvider>{ui}</PageChangeProvider>
      </MotionProvider>
    </MemoryRouter>,
  )
}

describe('WorkRow', () => {
  it('a page of this site renders a same-tab link with its title and tags', () => {
    wrap(<WorkRow to="/projects/radar-legislativo" title="Radar Legislativo" tags={['legislative data platform', '2026, pre-launch']} />)
    const link = screen.getByRole('link', { name: /radar legislativo/i })
    expect(link).toHaveAttribute('href', '/projects/radar-legislativo')
    expect(link).not.toHaveAttribute('target')
    expect(link.querySelector('.wrow-title')).toHaveTextContent('Radar Legislativo')
    expect(link.querySelector('.wrow-tags')).toHaveTextContent('legislative data platform')
    expect(link.querySelector('.wrow-tags')).toHaveTextContent('2026, pre-launch')
  })

  it('an outside address opens in a new tab without an opener', () => {
    wrap(<WorkRow href="https://example.com/x" title="outside" mark="out" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('a mailto address stays in the tab', () => {
    wrap(<WorkRow href="mailto:someone@example.com" title="someone@example.com" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'mailto:someone@example.com')
    expect(link).not.toHaveAttribute('target')
  })

  it('the arrow points the way the link goes, on both sides of the row', () => {
    // `in` stays on this site, `out` leaves it, `down` saves a file.
    const { unmount } = wrap(<WorkRow to="/all-work" title="all work" />)
    let arrows = screen.getByRole('link').querySelectorAll('svg.arrow')
    expect(arrows).toHaveLength(2)
    for (const arrow of arrows) expect(arrow).toHaveAttribute('data-kind', 'in')
    unmount()

    wrap(<WorkRow href="https://example.com/x" title="outside" mark="out" />)
    arrows = screen.getByRole('link').querySelectorAll('svg.arrow')
    for (const arrow of arrows) expect(arrow).toHaveAttribute('data-kind', 'out')
  })

  it('the big row of the work index sets its title at h1, the others at h2', () => {
    const { unmount } = wrap(<WorkRow big to="/projects/x" title="big" />)
    expect(screen.getByRole('link')).toHaveClass('wrow--big')
    expect(screen.getByText('big')).toHaveClass('h1')
    unmount()

    wrap(<WorkRow to="/projects/x" title="small" />)
    expect(screen.getByRole('link')).not.toHaveClass('wrow--big')
    expect(screen.getByText('small')).toHaveClass('h2')
  })

  it('a row in a page arrival carries its group on the title, tags and arrow', () => {
    wrap(<WorkRow to="/projects/x" title="grouped" tags={['a']} group={2} />)
    const link = screen.getByRole('link')
    expect(link.querySelector('.wrow-title')).toHaveAttribute('data-enter', 'title')
    expect(link.querySelector('.wrow-title')).toHaveAttribute('data-enter-group', '2')
    expect(link.querySelector('.wrow-tags')).toHaveAttribute('data-enter-group', '2')
    expect(link.querySelector('.wrow-arrow--r')).toHaveAttribute('data-enter', 'pop')
  })
})
