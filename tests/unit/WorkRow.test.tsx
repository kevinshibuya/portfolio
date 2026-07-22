import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../src/context/MotionContext'
import { WorkRow } from '../../src/components/ui/WorkRow'
import { accentFor, ACCENTS } from '../../src/utils/palette'

function wrap(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <MotionProvider>{ui}</MotionProvider>
    </MemoryRouter>,
  )
}

describe('WorkRow', () => {
  it('internal href renders a router link with padded index and tint var', () => {
    wrap(<WorkRow index={0} title="radar legislativo" meta={['2026', 'nestjs']} href="/projects/radar-legislativo" />)
    const link = screen.getByRole('link', { name: /radar legislativo/i })
    expect(link).toHaveAttribute('href', '/projects/radar-legislativo')
    expect(screen.getByText('01')).toBeInTheDocument()
    const root = link.closest('.workrow') as HTMLElement
    expect(root.style.getPropertyValue('--row-tint')).toBe(ACCENTS[0])
  })

  it('external href renders a new-tab anchor', () => {
    wrap(<WorkRow index={1} title="enquete" href="https://gauchazh.clicrbs.com.br/x" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('expandable variant is a button with aria-expanded and shows children when open', () => {
    wrap(
      <WorkRow index={2} title="grupo rbs" expandable expanded onToggle={vi.fn()}>
        <p>bullets</p>
      </WorkRow>,
    )
    expect(screen.getByRole('button', { name: /grupo rbs/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('bullets')).toBeInTheDocument()
  })

  it('tint rotates through the tricolor by index', () => {
    expect(accentFor(0)).toBe('#E64D66')
    expect(accentFor(1)).toBe('#4D80E6')
    expect(accentFor(2)).toBe('#E6CC4D')
    expect(accentFor(3)).toBe('#E64D66')
  })
})
