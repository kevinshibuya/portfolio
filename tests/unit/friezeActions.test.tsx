import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MotionValue } from 'framer-motion'
import { MotionProvider } from '../../src/context/MotionContext'
// Projects reads `i18n.language` on its first render; without this it is undefined.
import '../../src/i18n'
import { archive } from '../../src/data/archive'

/**
 * The canvas boundary is mocked; the DECISION under test is Projects'.
 *
 * The scene is a WebGL surface with no DOM to drive, so the only honest way to
 * exercise a cell press is to take the callbacks the canvas is handed and call
 * them — which is exactly what the pointer does on the other side.
 */
let cell: {
  onCellClick: (itemId: string) => void
  onCellHover: (itemId: string | null) => void
}
let sceneRenders = 0

vi.mock('../../src/components/canvas/SelectedWorkScene', () => ({
  SelectedWorkScene: (props: {
    onCellClick: (itemId: string) => void
    onCellHover: (itemId: string | null) => void
    onReady: () => void
  }) => {
    sceneRenders += 1
    cell = props
    return <div data-testid="scene" />
  },
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

/** Every MotionValue Projects creates, so hover can be read where it lands. */
const motionValues: MotionValue<unknown>[] = []
vi.mock('framer-motion', async (original) => {
  const actual = await original<typeof import('framer-motion')>()
  return {
    ...actual,
    useMotionValue: (initial: unknown) => {
      const value = actual.useMotionValue(initial)
      if (!motionValues.includes(value)) motionValues.push(value)
      return value
    },
  }
})

const { Projects } = await import('../../src/components/sections/Projects')

const caseStudy = archive.find((item) => item.caseStudy !== undefined)!
const embed = archive.find((item) => item.caseStudy === undefined)!
/** A real archive href carrying a `#:~:text=` fragment. */
const fragmentEmbed = archive.find(
  (item) => item.caseStudy === undefined && item.href.includes('#'),
)!

function mount() {
  return render(
    <MemoryRouter>
      <MotionProvider>
        <Projects />
      </MotionProvider>
    </MemoryRouter>,
  )
}

describe('frieze cell actions', () => {
  let open: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    navigate.mockClear()
    motionValues.length = 0
    sceneRenders = 0
    // spyOn hands back the SAME spy when the property is already one, so the
    // call log has to be cleared or it accumulates across tests.
    open = vi.spyOn(window, 'open').mockReturnValue(null)
    open.mockClear()
  })

  it('routes a case study to its project page, never to a new tab', () => {
    mount()
    act(() => cell.onCellClick(caseStudy.id))
    expect(navigate).toHaveBeenCalledWith(`/projects/${caseStudy.caseStudy!.slug}`)
    expect(open).not.toHaveBeenCalled()
  })

  it('opens an embed in a new tab, synchronously, with its href untouched', () => {
    mount()
    // Synchronous on purpose: a popup opened after an await has lost the
    // trusted click stack and the browser blocks it.
    cell.onCellClick(embed.id)
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith(embed.href, '_blank', 'noopener')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('passes a fragment href through exactly as the archive stores it', () => {
    expect(fragmentEmbed.href).toContain('#')
    mount()
    cell.onCellClick(fragmentEmbed.id)
    expect(open).toHaveBeenCalledWith(fragmentEmbed.href, '_blank', 'noopener')
  })

  it('opens once per press, not once per matching row', () => {
    mount()
    cell.onCellClick(embed.id)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('does nothing at all for an id the archive does not hold', () => {
    mount()
    cell.onCellClick('not-an-item')
    expect(open).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('carries hover on a MotionValue, so crossing the wall never re-renders the scene', () => {
    mount()
    const hover = motionValues[0]
    expect(hover.get()).toBeNull()

    const before = sceneRenders
    act(() => cell.onCellHover(embed.id))
    expect(hover.get()).toBe(embed.id)
    // The pointer crosses 171 cells: a re-render per cell would drive the
    // scene's whole subtree from the pointer (ADR 0010).
    expect(sceneRenders).toBe(before)

    act(() => cell.onCellHover(null))
    expect(hover.get()).toBeNull()
    expect(sceneRenders).toBe(before)
  })
})
