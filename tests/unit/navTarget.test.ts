import { describe, it, expect, beforeEach } from 'vitest'
import {
  scrollTargetFor,
  volumeShotPlayhead,
  sceneWrapperSvh,
} from '../../src/utils/sceneMotion'
import { columnsFromSvh, resolveNavTarget } from '../../src/utils/navTarget'

// Today's data: 35 frieze columns, so `.scene-scroll` publishes 1575 svh. The
// wrapper's pixel height follows the viewport, never a literal: at 900 px it is
// 1575 × 900 / 100 = 14175.
const COLUMNS = 35
const SVH = 1575
const VIEWPORT = 900
const WRAPPER_PX = (SVH * VIEWPORT) / 100
const WRAPPER_TOP = 4200

/** A document carrying `#projects` and, optionally, a measured `.scene-scroll`. */
function stubDoc(svh: string | null): Document {
  document.body.innerHTML = '<section id="projects"></section>'
  const section = document.querySelector('#projects')!
  if (svh !== null) {
    const wrapper = document.createElement('div')
    wrapper.className = 'scene-scroll'
    if (svh !== '') wrapper.dataset.svh = svh
    Object.defineProperty(wrapper, 'offsetHeight', { value: WRAPPER_PX, configurable: true })
    wrapper.getBoundingClientRect = () =>
      ({ top: WRAPPER_TOP, left: 0, right: 0, bottom: 0, width: 0, height: WRAPPER_PX, x: 0, y: WRAPPER_TOP, toJSON: () => ({}) }) as DOMRect
    section.appendChild(wrapper)
  }
  return document
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('columnsFromSvh', () => {
  it('inverts sceneWrapperSvh on the value the scene actually publishes', () => {
    expect(sceneWrapperSvh(COLUMNS)).toBe(SVH)
    expect(columnsFromSvh(SVH)).toBe(COLUMNS)
  })

  it('reads the fixed 700 svh floor as zero columns', () => {
    expect(columnsFromSvh(700)).toBe(0)
  })

  it('refuses a value that is not a whole number of columns', () => {
    expect(columnsFromSvh(1585)).toBeNull()
  })

  it('refuses a non-finite value and a missing one', () => {
    expect(columnsFromSvh(NaN)).toBeNull()
    expect(columnsFromSvh(null)).toBeNull()
    expect(columnsFromSvh(Infinity)).toBeNull()
  })

  it('refuses a value below the floor', () => {
    expect(columnsFromSvh(550)).toBeNull()
  })
})

describe('resolveNavTarget', () => {
  it('lands the archive link on the volume shot, composed not re-derived', () => {
    const target = resolveNavTarget('archive', stubDoc(String(SVH)), VIEWPORT)
    expect(target).toBe(
      scrollTargetFor(
        volumeShotPlayhead(COLUMNS),
        WRAPPER_TOP,
        WRAPPER_PX,
        VIEWPORT,
        COLUMNS,
      ),
    )
  })

  it('passes the column count to scrollTargetFor too, not just to the playhead', () => {
    const target = resolveNavTarget('archive', stubDoc(String(SVH)), VIEWPORT) as number
    // With the default `columns = 0` the same playhead maps through act one
    // alone and lands past the end of the wrapper.
    const wrong = scrollTargetFor(volumeShotPlayhead(COLUMNS), WRAPPER_TOP, WRAPPER_PX, VIEWPORT)
    expect(target).not.toBeCloseTo(wrong, 0)
    expect(target).toBeLessThan(WRAPPER_TOP + WRAPPER_PX)
  })

  it('falls back to the stream itself when there is no wrapper (no WebGL)', () => {
    expect(resolveNavTarget('archive', stubDoc(null), VIEWPORT)).toBe('#archive')
  })

  it('falls back to the section while the wrapper has no readable data-svh', () => {
    // In that mode `#archive` is a fixed 0×0 box, so a selector scroll to it
    // is a no-op; the section's top is where the reader should end up.
    expect(resolveNavTarget('archive', stubDoc(''), VIEWPORT)).toBe('#projects')
    expect(resolveNavTarget('archive', stubDoc('not-a-number'), VIEWPORT)).toBe('#projects')
  })

  it('leaves every other id as its own selector', () => {
    const doc = stubDoc(String(SVH))
    expect(resolveNavTarget('work', doc, VIEWPORT)).toBe('#work')
    expect(resolveNavTarget('contact', doc, VIEWPORT)).toBe('#contact')
  })
})
