import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom can't observe Framer's rAF-driven spring frames deterministically, so
// we assert on the .jump() CONTRACT instead: the first-hover fix teleports the
// tracking values to the cursor via jump(). The buggy version calls .set()
// (spring-traverses from -400) and never jumps on enter → this test fails RED.
const jumpCalls: number[] = []
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  const wrap = <T extends { jump: (v: number) => void }>(mv: T): T => {
    const orig = mv.jump.bind(mv)
    mv.jump = (v: number) => {
      jumpCalls.push(v)
      orig(v)
    }
    return mv
  }
  return {
    ...actual,
    useMotionValue: (init: number) => wrap(actual.useMotionValue(init)),
    useSpring: (src: unknown, cfg: unknown) =>
      wrap(actual.useSpring(src as never, cfg as never)),
  }
})

beforeEach(() => {
  jumpCalls.length = 0
  // Force desktop hover + fine pointer so the float is enabled.
  window.matchMedia = ((q: string) => ({
    matches: /hover: hover/.test(q) && /pointer: fine/.test(q),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as unknown as typeof window.matchMedia
})

import { MotionProvider } from '../../src/context/MotionContext'
import { WorkRow } from '../../src/components/ui/WorkRow'

describe('WorkRow float first-hover', () => {
  it('teleports the float to the cursor on mouseEnter (jump, not spring-traversal)', () => {
    render(
      <MemoryRouter>
        <MotionProvider>
          <WorkRow
            index={0}
            title="radar"
            href="/projects/radar"
            preview={{ src: '/x.png', alt: 'x' }}
          />
        </MotionProvider>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /radar/i })
    const before = jumpCalls.length
    fireEvent.mouseEnter(link, { clientX: 640, clientY: 360 })
    const added = jumpCalls.slice(before)
    expect(added).toContain(640)
    expect(added).toContain(360)
  })
})
