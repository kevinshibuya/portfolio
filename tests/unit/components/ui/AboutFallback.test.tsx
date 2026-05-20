import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutFallback } from '../../../../src/components/ui/AboutFallback'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sections.about.beats.0.eyebrow': '01 — origin',
        'sections.about.beats.0.title': 'how i got here.',
        'sections.about.beats.0.body': 'as a kid …',
        'sections.about.beats.1.eyebrow': '02 — present',
        'sections.about.beats.1.title': 'how i work now.',
        'sections.about.beats.1.body': 'fullstack …',
        'sections.about.beats.2.eyebrow': "03 — what's next",
        'sections.about.beats.2.title': "where it's going.",
        'sections.about.beats.2.body': 'thinking-with-ai …',
      }
      return map[key] ?? key
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}))

describe('<AboutFallback>', () => {
  it('renders three beats with title + body each', () => {
    render(<AboutFallback />)
    expect(screen.getByText('how i got here.')).toBeInTheDocument()
    expect(screen.getByText('how i work now.')).toBeInTheDocument()
    expect(screen.getByText("where it's going.")).toBeInTheDocument()
    expect(screen.getByText('as a kid …')).toBeInTheDocument()
    expect(screen.getByText('fullstack …')).toBeInTheDocument()
    expect(screen.getByText('thinking-with-ai …')).toBeInTheDocument()
  })

  it('renders the poster image with empty alt (decorative)', () => {
    const { container } = render(<AboutFallback />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', '')
    expect(img!.getAttribute('src') || '').toContain('about-toy-poster')
  })

  it('does NOT render a <canvas>', () => {
    const { container } = render(<AboutFallback />)
    expect(container.querySelector('canvas')).toBeNull()
  })
})
