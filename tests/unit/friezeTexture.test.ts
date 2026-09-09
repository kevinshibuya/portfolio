import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import * as THREE from 'three'
import type { ArchiveItem } from '../../src/types/content'
import {
  FRIEZE_CELL_H,
  FRIEZE_CELL_W,
  FRIEZE_ROWS,
  countCell,
  friezeExtent,
  friezeLayout,
  type Cell,
  type FriezeLayout,
} from '../../src/utils/friezeLayout'
import { sceneGeometry } from '../../src/utils/sceneMotion'
import { archive } from '../../src/data/archive'
import {
  CELL_TITLE_WORLD,
  CELL_META_WORLD,
  CELL_INSET_WORLD,
  CELL_LINE_HEIGHT,
  YEAR_COUNT_BAND_WORLD,
  cellText,
  wrapTitle,
  fitMeta,
  digitAdvance,
} from '../../src/components/canvas/scene/friezeText'
import {
  FRIEZE_DENSITY_CEILING,
  FRIEZE_MASK_MAX_PX,
  FRIEZE_RASTER_SLICE,
  IDLE_TIMEOUT_MS,
  onIdle,
  FriezeRasterCancelled,
  friezeDensity,
  friezeGeneration,
  maskSize,
  panelsFor,
  rasteriseFrieze,
  disposeFriezeTextures,
  type FriezePanel,
  type FriezeTexture,
  type RasterScheduler,
} from '../../src/components/canvas/scene/friezeTexture'
import { RESIZE_DEBOUNCE_MS } from '../../src/components/canvas/scene/textTexture'

/* ------------------------------------------------------------------------ */
/* A software 2D context: jsdom has no canvas. Every glyph is 0.55 em wide,  */
/* `fillText` paints its box in the fill colour, and `getImageData` reads    */
/* the buffer back, so channel content can be asserted without a rasteriser. */
/* ------------------------------------------------------------------------ */

interface StubContext extends CanvasRenderingContext2D {
  __fillTexts: Array<{ text: string; x: number; y: number; fill: string; font: string }>
}

const contexts: StubContext[] = []
const canvases: HTMLCanvasElement[] = []
let measureThrows = false

function hexChannel(fill: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fill)
  if (!m) throw new Error(`stub context only understands #rrggbb, got ${fill}`)
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function stubContext(canvas: HTMLCanvasElement): StubContext {
  let buffer = new Uint8ClampedArray(0)
  let bufferW = -1
  let bufferH = -1
  const sync = (): void => {
    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      bufferW = canvas.width
      bufferH = canvas.height
      buffer = new Uint8ClampedArray(bufferW * bufferH * 4)
    }
  }
  const paint = (x0: number, y0: number, w: number, h: number, fill: string): void => {
    sync()
    const [r, g, b] = hexChannel(fill)
    const xa = Math.max(0, Math.floor(x0))
    const ya = Math.max(0, Math.floor(y0))
    const xb = Math.min(bufferW, Math.ceil(x0 + w))
    const yb = Math.min(bufferH, Math.ceil(y0 + h))
    for (let y = ya; y < yb; y++) {
      for (let x = xa; x < xb; x++) {
        const i = (y * bufferW + x) * 4
        buffer[i] = r
        buffer[i + 1] = g
        buffer[i + 2] = b
        buffer[i + 3] = 255
      }
    }
  }
  const ctx = {
    canvas,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '#000000',
    __fillTexts: [],
    em(): number {
      return Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 0)
    },
    measureText(text: string) {
      if (measureThrows) throw new Error('measureText exploded')
      return { width: text.length * this.em() * 0.55 }
    },
    fillText(text: string, x: number, y: number) {
      const em = this.em()
      this.__fillTexts.push({ text, x, y, fill: String(this.fillStyle), font: this.font })
      // textBaseline 'middle': the box is centred on y.
      paint(x, y - em / 2, text.length * em * 0.55, em, String(this.fillStyle))
    },
    fillRect(x: number, y: number, w: number, h: number) {
      paint(x, y, w, h, String(this.fillStyle))
    },
    clearRect(x: number, y: number, w: number, h: number) {
      sync()
      const xa = Math.max(0, Math.floor(x))
      const ya = Math.max(0, Math.floor(y))
      const xb = Math.min(bufferW, Math.ceil(x + w))
      const yb = Math.min(bufferH, Math.ceil(y + h))
      for (let yy = ya; yy < yb; yy++) {
        buffer.fill(0, (yy * bufferW + xa) * 4, (yy * bufferW + xb) * 4)
      }
    },
    getImageData(x: number, y: number, w: number, h: number) {
      sync()
      if (x !== 0 || y !== 0 || w !== bufferW || h !== bufferH) {
        throw new Error('stub getImageData reads the whole canvas only')
      }
      return { data: buffer, width: w, height: h, colorSpace: 'srgb' }
    },
    scale: vi.fn(),
  }
  return ctx as unknown as StubContext
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    const existing = contexts.find((c) => c.canvas === this)
    if (existing) return existing
    const ctx = stubContext(this)
    contexts.push(ctx)
    canvases.push(this)
    return ctx
  } as never
})

beforeEach(() => {
  contexts.length = 0
  canvases.length = 0
  measureThrows = false
})

/* ------------------------------------------------------------------------ */
/* Fixtures                                                                 */
/* ------------------------------------------------------------------------ */

function piece(id: string, overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id,
    title: id,
    origin: 'professional',
    date: '01/01/2024',
    sortDate: Date.UTC(2024, 0, 1),
    year: 2024,
    href: '#',
    internal: false,
    serial: 1,
    ...overrides,
  }
}

const editorial = piece('editorial-0', {
  title: 'ação e reação',
  type: 'INFOGRAFICO',
  editorial: 'Folha de S.Paulo',
  date: '05/03/2024',
  serial: 171,
})

const project = (id: string, origin: ArchiveItem['origin'], serial: number): ArchiveItem =>
  piece(id, {
    title: { en: 'Essential Politics', pt: 'Política Essencial' },
    origin,
    caseStudy: { slug: id },
    date: '2024',
    internal: true,
    href: `/projects/${id}`,
    serial,
  })

/** Measured with the stub's 0.55 em glyphs, at a 100 px em. */
const measure = (text: string): number => text.length * 100 * 0.55

/**
 * A scheduler the test drives by hand: `idle` queues, `step()` runs one slice,
 * the font promise and the permit are resolved on demand.
 */
interface ManualScheduler extends RasterScheduler {
  step(): boolean
  drain(): Promise<void>
  pending(): number
  resolveFont(): void
  cancelled: number
}

function manualScheduler(): ManualScheduler {
  const queue: Array<() => void> = []
  let resolveFontReady: () => void = () => {}
  const font = new Promise<void>((resolve) => {
    resolveFontReady = resolve
  })
  const scheduler: ManualScheduler = {
    cancelled: 0,
    idle(run) {
      queue.push(run)
      return () => {
        const i = queue.indexOf(run)
        if (i >= 0) {
          queue.splice(i, 1)
          scheduler.cancelled++
        }
      }
    },
    fontReady: () => font,
    step() {
      const run = queue.shift()
      if (!run) return false
      run()
      return true
    },
    async drain() {
      // Let the job's awaits settle between slices.
      for (let guard = 0; guard < 10_000; guard++) {
        await Promise.resolve()
        await Promise.resolve()
        if (!scheduler.step()) {
          await Promise.resolve()
          await Promise.resolve()
          if (!scheduler.step()) return
        }
      }
      throw new Error('drain did not settle')
    },
    pending: () => queue.length,
    resolveFont: () => resolveFontReady(),
  }
  return scheduler
}

const fillTexts = (): StubContext['__fillTexts'] => contexts.flatMap((c) => c.__fillTexts)

/** Reads the packed RG mask back as a channel sampler. */
function sampler(mask: FriezeTexture): (x: number, y: number) => { r: number; g: number } {
  const data = mask.texture.image.data as Uint8Array
  return (x, y) => {
    const i = (Math.floor(y) * mask.widthPx + Math.floor(x)) * 2
    return { r: data[i], g: data[i + 1] }
  }
}

function anyInk(
  mask: FriezeTexture,
  box: { x: number; y: number; w: number; h: number },
  channel: 'r' | 'g',
): boolean {
  const at = sampler(mask)
  for (let y = Math.floor(box.y); y < Math.ceil(box.y + box.h); y++) {
    for (let x = Math.floor(box.x); x < Math.ceil(box.x + box.w); x++) {
      if (at(x, y)[channel] > 0) return true
    }
  }
  return false
}

/* ------------------------------------------------------------------------ */
/* Presentation                                                             */
/* ------------------------------------------------------------------------ */

describe('cell typography constants', () => {
  it('fixes the Q7 sizes in world units and the count band as one meta line', () => {
    expect(CELL_TITLE_WORLD).toBe(0.06)
    expect(CELL_META_WORLD).toBe(0.04)
    expect(CELL_INSET_WORLD).toBe(0.03)
    expect(CELL_LINE_HEIGHT).toBe(1.2)
    expect(YEAR_COUNT_BAND_WORLD).toBeCloseTo(0.048, 12)
  })

  it('fits two title lines, meta, serial, the insets and the count band inside one cell', () => {
    const stack =
      2 * CELL_TITLE_WORLD * CELL_LINE_HEIGHT +
      2 * CELL_META_WORLD * CELL_LINE_HEIGHT +
      2 * CELL_INSET_WORLD +
      YEAR_COUNT_BAND_WORLD
    expect(stack).toBeLessThan(FRIEZE_CELL_H)
  })
})

describe('cellText', () => {
  it('lowercases an editorial meta with a dotted date and keeps the accented title as authored', () => {
    expect(cellText(editorial, 'en')).toEqual({
      title: 'ação e reação',
      meta: 'infografico · folha de s.paulo · 05.03.2024',
      serial: '171',
    })
    expect(cellText(editorial, 'pt').meta).toBe('infografico · folha de s.paulo · 05.03.2024')
    // The stored date is not rewritten by presentation.
    expect(editorial.date).toBe('05/03/2024')
  })

  it('leaves a professional case study without meta in both languages', () => {
    const p = project('featured-a', 'professional', 9)
    expect(cellText(p, 'en')).toEqual({ title: 'Essential Politics', meta: '', serial: '9' })
    expect(cellText(p, 'pt')).toEqual({ title: 'Política Essencial', meta: '', serial: '9' })
  })

  it('labels freelance and personal case studies from the shared locale pairs', () => {
    expect(cellText(project('f', 'freelance', 2), 'en').meta).toBe('freelance')
    expect(cellText(project('f', 'freelance', 2), 'pt').meta).toBe('freelance')
    expect(cellText(project('p', 'personal', 3), 'en').meta).toBe('personal')
    expect(cellText(project('p', 'personal', 3), 'pt').meta).toBe('pessoal')
  })

  it('shows serials unpadded, and skips an empty editorial in the meta', () => {
    const bare = piece('editorial-1', { type: 'QUIZ', editorial: '', date: '31/12/2023', serial: 7 })
    expect(cellText(bare, 'en')).toEqual({ title: 'editorial-1', meta: 'quiz · 31.12.2023', serial: '7' })
  })

  it('passes a date it cannot read through unchanged rather than inventing one', () => {
    const odd = piece('editorial-2', { type: 'QUIZ', editorial: 'X', date: 'March 2024' })
    expect(cellText(odd, 'en').meta).toBe('quiz · x · March 2024')
  })
})

describe('wrapTitle', () => {
  const em = 100
  // 0.55 em per glyph: 'lorem' is 275 px, 'lorem ipsum' 605 px.
  it('keeps a short title on one line', () => {
    expect(wrapTitle(measure, 'lorem', 1000)).toEqual(['lorem'])
  })

  it('wraps at a word boundary to two lines', () => {
    expect(wrapTitle(measure, 'lorem ipsum', 400)).toEqual(['lorem', 'ipsum'])
  })

  it('drops whole trailing words and hangs an ellipsis when a third line would be needed', () => {
    // 'lorem ipsum dolor sit amet' at 400 px: line 1 'lorem', line 2 must end in an ellipsis
    // and contain only whole words.
    const lines = wrapTitle(measure, 'lorem ipsum dolor sit amet', 400)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('lorem')
    expect(lines[1].endsWith('…')).toBe(true)
    expect(measure(lines[1])).toBeLessThanOrEqual(400)
    const words = lines[1].slice(0, -1).trim().split(' ')
    for (const w of words) expect('ipsum dolor sit amet'.split(' ')).toContain(w)
    expect(lines[1]).not.toContain('dol…')
  })

  it('uses an ellipsis alone for an indivisible token wider than the line', () => {
    expect(wrapTitle(measure, 'supercalifragilistic', 5 * em * 0.55)).toEqual(['…'])
    // Second-line overflow by one token: nothing after the ellipsis.
    expect(wrapTitle(measure, 'lorem supercalifragilistic', 400)).toEqual(['lorem', '…'])
  })

  it('never exceeds the width on either line', () => {
    const lines = wrapTitle(measure, 'a bb ccc dddd eeeee ffffff ggggggg', 300)
    expect(lines.length).toBeLessThanOrEqual(2)
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(300)
  })
})

describe('fitMeta', () => {
  it('keeps meta on one line and ellipsises whole words', () => {
    expect(fitMeta(measure, 'quiz · folha · 05.03.2024', 10_000)).toBe('quiz · folha · 05.03.2024')
    const meta = 'infografico · folha de s.paulo · 05.03.2024'
    const fitted = fitMeta(measure, meta, 1100)
    expect(fitted.endsWith('…')).toBe(true)
    expect(measure(fitted)).toBeLessThanOrEqual(1100)
    expect(fitted).toBe('infografico · folha…')
    // A separator never dangles before the ellipsis.
    expect(fitMeta(measure, meta, 800)).toBe('infografico…')
    expect(fitMeta(measure, 'supercalifragilistic', 100)).toBe('…')
  })
})

describe('digitAdvance', () => {
  it('is the widest measured digit, so serials keep a fixed advance', () => {
    const wide = (text: string): number => (text === '4' ? 90 : 60)
    expect(digitAdvance(wide)).toBe(90)
  })
})

/* ------------------------------------------------------------------------ */
/* Sizing                                                                   */
/* ------------------------------------------------------------------------ */

const packed = friezeLayout(archive, FRIEZE_ROWS)
const extent = friezeExtent(packed, FRIEZE_ROWS)

describe('friezeDensity', () => {
  it('is the dolly reading scale times the renderer ratio, applied once', () => {
    const g = sceneGeometry(1280, 720)
    expect(friezeDensity(extent, g, 1.5)).toBeCloseTo(432, 6)
    expect(friezeDensity(extent, g, 1)).toBeCloseTo(288, 6)
  })

  it('grows with the height fit above the 761 px crossover', () => {
    const g = sceneGeometry(1440, 900)
    // 0.82 · 900 / (6 · FRIEZE_CELL_H) CSS px per world, times 1.5.
    expect(friezeDensity(extent, g, 1.5)).toBeCloseTo((0.82 * 900) / (6 * FRIEZE_CELL_H) * 1.5, 6)
  })

  it('is ceilinged at 612.8 texels per world unit', () => {
    expect(FRIEZE_DENSITY_CEILING).toBe(612.8)
    expect(friezeDensity(extent, sceneGeometry(1920, 1080), 1.5)).toBe(612.8)
    expect(friezeDensity(extent, sceneGeometry(2560, 1440), 1.5)).toBe(612.8)
  })
})

describe('maskSize', () => {
  it('sizes an uncapped block from its columns, rows and density', () => {
    const s = maskSize(2, FRIEZE_ROWS, 432)
    expect(s).toEqual({ widthPx: 432, heightPx: 936, texelsPerWorld: 432, scale: 1 })
  })

  it('caps the long side at 4096 and reports the reduced density', () => {
    expect(FRIEZE_MASK_MAX_PX).toBe(4096)
    const s = maskSize(22, FRIEZE_ROWS, 432)
    expect(s.widthPx).toBe(4096)
    expect(s.heightPx).toBe(807)
    expect(s.scale).toBeCloseTo(4096 / 4752, 9)
    expect(s.texelsPerWorld).toBeCloseTo(372.363636, 5)
  })

  it('caps the height too, and the cap dimensions are density-invariant while it binds', () => {
    const tall = maskSize(2, 200, 432)
    expect(tall.heightPx).toBe(4096)
    expect(tall.widthPx).toBeLessThan(432)
    expect(maskSize(22, FRIEZE_ROWS, 612.8)).toMatchObject({ widthPx: 4096, heightPx: 807 })
  })
})

describe('panelsFor', () => {
  const block2024 = { index: 2, year: 2024, startCol: 11, columns: 22 }

  it('keeps a block under the cap as a single panel', () => {
    const panels = panelsFor({ index: 0, year: 2026, startCol: 0, columns: 2 }, packed.cells, 432)
    expect(panels).toEqual<FriezePanel[]>([{ block: 0, panel: 0, startCol: 0, columns: 2 }])
  })

  it('splits 2024 into two eleven-column panels at the floor and at the ceiling', () => {
    for (const density of [432, 612.8]) {
      const panels = panelsFor(block2024, packed.cells, density)
      expect(panels).toEqual<FriezePanel[]>([
        { block: 2, panel: 0, startCol: 11, columns: 11 },
        { block: 2, panel: 1, startCol: 22, columns: 11 },
      ])
      for (const p of panels) {
        expect(p.columns * FRIEZE_CELL_W * density).toBeLessThanOrEqual(FRIEZE_MASK_MAX_PX)
      }
    }
  })

  it('never splits through a 2×2 span, moving the boundary to the nearest clear column', () => {
    // Four columns, forced into two panels; the span at relative column 1 bridges 1|2.
    const cells: Cell[] = [
      { itemId: 'span', block: 0, col: 1, row: 0, span: 2 },
      { itemId: 'a', block: 0, col: 0, row: 0, span: 1 },
      { itemId: 'b', block: 0, col: 3, row: 0, span: 1 },
    ]
    const cap = 3 * FRIEZE_CELL_W * 100 // three columns fit, four do not
    const panels = panelsFor({ index: 0, year: 2024, startCol: 0, columns: 4 }, cells, 100, cap)
    expect(panels.map((p) => p.columns)).toEqual([1, 3])
    for (let i = 1; i < panels.length; i++) {
      const boundary = panels[i].startCol
      for (const c of cells) {
        if (c.span === 2) expect(boundary === c.col + 1, `boundary ${boundary} splits ${c.itemId}`).toBe(false)
      }
    }
  })

  it('refuses a block whose every interior boundary is bridged by a span', () => {
    const cells: Cell[] = [
      { itemId: 'one', block: 0, col: 0, row: 0, span: 2 },
      { itemId: 'two', block: 0, col: 1, row: 2, span: 2 },
    ]
    const cap = 2 * FRIEZE_CELL_W * 100
    expect(() => panelsFor({ index: 0, year: 2024, startCol: 0, columns: 3 }, cells, 100, cap)).toThrow(
      /span/,
    )
  })

  it('ignores cells of other blocks when judging a boundary', () => {
    const cells: Cell[] = [{ itemId: 'elsewhere', block: 1, col: 1, row: 0, span: 2 }]
    const cap = 1 * FRIEZE_CELL_W * 100
    const panels = panelsFor({ index: 0, year: 2024, startCol: 0, columns: 2 }, cells, 100, cap)
    expect(panels.map((p) => p.startCol)).toEqual([0, 1])
  })
})

/* ------------------------------------------------------------------------ */
/* Rasterisation                                                            */
/* ------------------------------------------------------------------------ */

/** Two blocks: 2025 with a Project at its top-left and two editorials; 2024 with one editorial. */
function twoBlockFixture(): { items: ArchiveItem[]; layout: FriezeLayout } {
  const items = [
    piece('featured-a', {
      title: { en: 'Essential Politics', pt: 'Política Essencial' },
      origin: 'freelance',
      caseStudy: { slug: 'a' },
      year: 2025,
      internal: true,
      serial: 4,
    }),
    piece('editorial-0', { type: 'QUIZ', editorial: 'Folha', year: 2025, serial: 3 }),
    piece('editorial-1', { type: 'MAPA INTERATIVO', editorial: 'Folha', year: 2025, serial: 2 }),
    piece('editorial-2', { type: 'GALERIA', editorial: 'UOL', year: 2024, serial: 1 }),
  ]
  return { items, layout: friezeLayout(items, FRIEZE_ROWS) }
}

const DENSITY = 200

async function rasterised(
  overrides: Partial<Parameters<typeof rasteriseFrieze>[0]> = {},
): Promise<{ masks: FriezeTexture[]; scheduler: ManualScheduler; layout: FriezeLayout }> {
  const { items, layout } = twoBlockFixture()
  const scheduler = manualScheduler()
  const job = rasteriseFrieze({
    layout,
    rows: FRIEZE_ROWS,
    items,
    lang: 'en',
    density: DENSITY,
    scheduler,
    ...overrides,
  })
  scheduler.resolveFont()
  await scheduler.drain()
  const masks = await job.promise
  return { masks, scheduler, layout }
}

describe('rasteriseFrieze', () => {
  afterEach(() => {
    measureThrows = false
  })

  it('does not draw before warm-up permission, then draws once permitted', async () => {
    const { items, layout } = twoBlockFixture()
    const scheduler = manualScheduler()
    let permit: () => void = () => {}
    const permission = new Promise<void>((resolve) => {
      permit = resolve
    })
    const job = rasteriseFrieze({ layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY, scheduler, permit: permission })
    scheduler.resolveFont()
    await scheduler.drain()
    expect(fillTexts()).toHaveLength(0)
    expect(canvases).toHaveLength(0)
    permit()
    await scheduler.drain()
    const masks = await job.promise
    expect(masks.length).toBe(2)
    expect(fillTexts().length).toBeGreaterThan(0)
  })

  it('produces one RG mask per panel with the sizing contract and no colour space', async () => {
    const { masks, layout } = await rasterised()
    expect(masks.map((m) => m.panel)).toEqual<FriezePanel[]>([
      { block: 0, panel: 0, startCol: 0, columns: layout.blocks[0].columns },
      { block: 1, panel: 0, startCol: layout.blocks[1].startCol, columns: layout.blocks[1].columns },
    ])
    for (const [i, mask] of masks.entries()) {
      const expected = maskSize(layout.blocks[i].columns, FRIEZE_ROWS, DENSITY)
      expect(mask.widthPx).toBe(expected.widthPx)
      expect(mask.heightPx).toBe(expected.heightPx)
      expect(mask.texelsPerWorld).toBe(expected.texelsPerWorld)
      const t = mask.texture
      expect(t).toBeInstanceOf(THREE.DataTexture)
      expect(t.format).toBe(THREE.RGFormat)
      expect(t.type).toBe(THREE.UnsignedByteType)
      expect(t.colorSpace).toBe(THREE.NoColorSpace)
      expect(t.generateMipmaps).toBe(false)
      expect(t.minFilter).toBe(THREE.LinearFilter)
      expect(t.magFilter).toBe(THREE.LinearFilter)
      expect(t.unpackAlignment).toBe(1)
      expect(t.flipY).toBe(false)
      // `needsUpdate` is write-only; setting it bumps the version the uploader watches.
      expect(t.version).toBeGreaterThan(0)
      expect((t.image.data as Uint8Array).length).toBe(mask.widthPx * mask.heightPx * 2)
      expect(mask.bytes).toBe(mask.widthPx * mask.heightPx * 2)
    }
  })

  it('puts title coverage in R and meta plus serial in G, never overlapping in a cell', async () => {
    const { masks, layout } = await rasterised()
    const t = DENSITY
    const cellW = FRIEZE_CELL_W * t
    const cellH = FRIEZE_CELL_H * t
    const inset = CELL_INSET_WORLD * t
    // This cell carries the block's count, so its title starts below the band
    // rather than at the cell's own top inset.
    const editorialCell = countCell(layout, 0)!
    expect(editorialCell.itemId).toBe('editorial-0')
    const mask = masks[editorialCell.block]
    const x0 = (editorialCell.col - mask.panel.startCol) * cellW
    const y0 = editorialCell.row * cellH
    const titleBox = {
      x: x0 + inset,
      y: y0 + inset + YEAR_COUNT_BAND_WORLD * t,
      w: cellW - 2 * inset,
      h: CELL_TITLE_WORLD * CELL_LINE_HEIGHT * t,
    }
    expect(anyInk(mask, titleBox, 'r')).toBe(true)
    expect(anyInk(mask, titleBox, 'g')).toBe(false)
    // Meta and serial sit below the title stack, in G only.
    const below = { x: x0 + inset, y: titleBox.y + titleBox.h, w: cellW - 2 * inset, h: y0 + cellH - inset - (titleBox.y + titleBox.h) }
    expect(anyInk(mask, below, 'g')).toBe(true)
    expect(anyInk(mask, below, 'r')).toBe(false)
    // The inset is clear on every side.
    expect(anyInk(mask, { x: x0, y: y0, w: cellW, h: inset }, 'r')).toBe(false)
    expect(anyInk(mask, { x: x0, y: y0, w: inset, h: cellH }, 'g')).toBe(false)
    for (const m of masks) expect(m.overlapTexels).toBe(0)
  })

  it('leaves a Project footprint entirely blank, card and serial both', async () => {
    const { masks, layout } = await rasterised()
    const t = DENSITY
    const cell = layout.cells.find((c) => c.itemId === 'featured-a')!
    expect(cell.span).toBe(2)
    const mask = masks[cell.block]
    const footprint = {
      x: (cell.col - mask.panel.startCol) * FRIEZE_CELL_W * t,
      y: cell.row * FRIEZE_CELL_H * t,
      w: 2 * FRIEZE_CELL_W * t,
      h: 2 * FRIEZE_CELL_H * t,
    }
    // The card fills its 2x2 exactly (Q9), so the mask draws nothing under it:
    // not the title, not the meta, and not the serial strip the card now
    // carries in its own caption (third amendment).
    expect(anyInk(mask, footprint, 'r')).toBe(false)
    expect(anyInk(mask, footprint, 'g')).toBe(false)
    expect(fillTexts().filter((f) => f.text === '4' && f.fill === '#00FF00')).toHaveLength(0)
    // The count moved off this cell too, so no band crosses the card either.
    expect(countCell(layout, cell.block)?.itemId).not.toBe('featured-a')
  })

  it('draws serial digits one at a time at a fixed advance', async () => {
    const { items, layout } = twoBlockFixture()
    items[1].serial = 103
    const scheduler = manualScheduler()
    const job = rasteriseFrieze({ layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY, scheduler })
    scheduler.resolveFont()
    await scheduler.drain()
    await job.promise
    // Never as one string: the serial is three single-glyph draws in G.
    expect(fillTexts().some((f) => f.text === '103')).toBe(false)
    // Consecutive digits of the same serial advance by exactly the widest digit.
    const ordered = fillTexts().filter((f) => f.fill === '#00FF00')
    const i = ordered.findIndex((f, k) => f.text === '1' && ordered[k + 1]?.text === '0' && ordered[k + 2]?.text === '3')
    expect(i).toBeGreaterThanOrEqual(0)
    const advance = ordered[i + 1].x - ordered[i].x
    expect(advance).toBeCloseTo(ordered[i + 2].x - ordered[i + 1].x, 9)
    expect(advance).toBeCloseTo(digitAdvance((s) => s.length * CELL_META_WORLD * DENSITY * 0.55), 9)
  })

  it('draws the year count at the block first 1x1 cell and pushes that cell text below it', async () => {
    const { masks, layout } = await rasterised()
    const t = DENSITY
    const inset = CELL_INSET_WORLD * t
    // Row-major, first 1x1 wins: the count cannot sit on a 2x2, whose card
    // object would cover it exactly as the block's top-left corner did.
    const cell = countCell(layout, 0)!
    expect(cell.itemId).toBe('editorial-0')
    const mask = masks[cell.block]
    const x0 = (cell.col - mask.panel.startCol) * FRIEZE_CELL_W * t
    const y0 = cell.row * FRIEZE_CELL_H * t
    const band = {
      x: x0 + inset,
      y: y0 + inset,
      w: FRIEZE_CELL_W * t - 2 * inset,
      h: YEAR_COUNT_BAND_WORLD * t,
    }
    expect(anyInk(mask, band, 'g')).toBe(true)
    expect(anyInk(mask, band, 'r')).toBe(false)
    // That cell yields its first line to the count instead of overprinting it.
    const title = {
      x: x0 + inset,
      y: y0 + inset + YEAR_COUNT_BAND_WORLD * t,
      w: FRIEZE_CELL_W * t - 2 * inset,
      h: CELL_TITLE_WORLD * CELL_LINE_HEIGHT * t,
    }
    expect(anyInk(mask, title, 'r')).toBe(true)
    // Once per block: 2025 holds three pieces and editorial-0's serial is also
    // 3, so '3' is drawn twice in G and no more.
    const counts = fillTexts().filter(
      (f) => f.fill === '#00FF00' && f.text === String(layout.blocks[0].count),
    )
    expect(counts).toHaveLength(2)
  })

  it('draws at most four cells per idle slice and reports progress once a slice', async () => {
    const { items, layout } = twoBlockFixture()
    const scheduler = manualScheduler()
    const progress: number[] = []
    const job = rasteriseFrieze({
      layout,
      rows: FRIEZE_ROWS,
      items,
      lang: 'en',
      density: DENSITY,
      scheduler,
      onProgress: (drawn) => progress.push(drawn),
    })
    scheduler.resolveFont()
    await scheduler.drain()
    await job.promise
    expect(FRIEZE_RASTER_SLICE).toBe(4)
    expect(progress.length).toBeGreaterThan(1)
    let prev = 0
    for (const p of progress) {
      expect(p - prev).toBeLessThanOrEqual(FRIEZE_RASTER_SLICE)
      expect(p - prev).toBeGreaterThan(0)
      prev = p
    }
    // Three editorials plus two year counts: the fourth piece is a Project, and
    // its card covers the footprint, so the mask draws no unit for it.
    expect(prev).toBe(5)
  })

  it('cancels between slices, disposes what it drew and releases the scratch canvas', async () => {
    const { items, layout } = twoBlockFixture()
    const scheduler = manualScheduler()
    const job = rasteriseFrieze({ layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY, scheduler })
    scheduler.resolveFont()
    // Let the job finish its first panel and stop before the second's slice runs.
    for (let i = 0; i < 40 && job.created() < 1; i++) {
      await Promise.resolve()
      await Promise.resolve()
      scheduler.step()
    }
    await Promise.resolve()
    await Promise.resolve()
    const drawnBefore = fillTexts().length
    expect(drawnBefore).toBeGreaterThan(0)
    const created = job.created()
    expect(created).toBe(1)
    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    job.cancel()
    await expect(job.promise).rejects.toBeInstanceOf(FriezeRasterCancelled)
    // The pending idle slice was withdrawn, not left to fire into a dead job.
    expect(scheduler.pending()).toBe(0)
    expect(scheduler.cancelled).toBe(1)
    await scheduler.drain()
    expect(fillTexts().length).toBe(drawnBefore)
    for (const canvas of canvases) {
      expect(canvas.width).toBe(0)
      expect(canvas.height).toBe(0)
    }
    expect(disposed).toHaveBeenCalledTimes(created)
    disposed.mockRestore()
  })

  it('releases the scratch canvas after a successful generation and keeps the recipe', async () => {
    const { masks } = await rasterised()
    expect(canvases).toHaveLength(1)
    expect(canvases[0].width).toBe(0)
    expect(canvases[0].height).toBe(0)
    expect(masks[0].recipe).toMatchObject({ lang: 'en', density: DENSITY, rows: FRIEZE_ROWS })
  })

  it('rejects on a draw failure and disposes partial textures', async () => {
    const { items, layout } = twoBlockFixture()
    const scheduler = manualScheduler()
    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    const job = rasteriseFrieze({ layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY, scheduler })
    scheduler.resolveFont()
    // First panel completes, then the second panel's measurement explodes.
    let steps = 0
    for (let i = 0; i < 40; i++) {
      await Promise.resolve()
      await Promise.resolve()
      if (scheduler.step()) steps++
      if (job.created() === 1) break
    }
    expect(job.created()).toBe(1)
    measureThrows = true
    await scheduler.drain()
    await expect(job.promise).rejects.toThrow(/measureText exploded/)
    expect(disposed).toHaveBeenCalledTimes(1)
    for (const canvas of canvases) expect(canvas.width).toBe(0)
    disposed.mockRestore()
    expect(steps).toBeGreaterThan(0)
  })

  it('rasterises the whole archive at the floor into five panels within the approved memory', async () => {
    const scheduler = manualScheduler()
    const job = rasteriseFrieze({ layout: packed, rows: FRIEZE_ROWS, items: archive, lang: 'pt', density: 432, scheduler })
    scheduler.resolveFont()
    await scheduler.drain()
    const masks = await job.promise
    expect(masks.map((m) => [m.panel.block, m.panel.columns])).toEqual([[0, 2], [1, 9], [2, 11], [2, 11], [3, 2]])
    const steady = masks.reduce((sum, m) => sum + m.bytes, 0) / 1048576
    expect(steady).toBeLessThan(27.2)
    for (const m of masks) {
      expect(m.widthPx).toBeLessThanOrEqual(FRIEZE_MASK_MAX_PX)
      expect(m.texelsPerWorld).toBe(432)
      expect(m.overlapTexels).toBe(0)
    }
    // The 2024 count sits at its own first 1x1 cell, in the panel holding that
    // cell only; the second panel's matching band is clear.
    const inset = CELL_INSET_WORLD * 432
    const counted = countCell(packed, 2)!
    const bandX = (counted.col - masks[2].panel.startCol) * FRIEZE_CELL_W * 432
    expect(bandX).toBeGreaterThan(0)
    const band = {
      x: bandX + inset,
      y: counted.row * FRIEZE_CELL_H * 432 + inset,
      w: FRIEZE_CELL_W * 432 - 2 * inset,
      h: YEAR_COUNT_BAND_WORLD * 432,
    }
    expect(anyInk(masks[2], band, 'g')).toBe(true)
    expect(anyInk(masks[3], band, 'g')).toBe(false)
    // 2026 is three Projects filling its block exactly, so it has no 1x1 cell
    // to hold a count and the mask draws none: its top-left card carries it.
    expect(countCell(packed, 0)).toBeNull()
    disposeFriezeTextures(masks)
  })

  it('disposeFriezeTextures disposes every texture once', async () => {
    const { masks } = await rasterised()
    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    disposeFriezeTextures(masks)
    expect(disposed).toHaveBeenCalledTimes(masks.length)
    disposed.mockRestore()
  })
})

describe('friezeGeneration', () => {
  const generation = (scheduler: ManualScheduler) => {
    const { items, layout } = twoBlockFixture()
    return friezeGeneration({ layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY }, scheduler)
  }

  it('draws nothing before it is permitted, and reports ready only once the masks exist', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    await scheduler.drain()
    // The warm-up has not asked yet: nothing drawn, nothing to upload.
    expect(gen.status()).toBe('pending')
    expect(gen.masks()).toBeNull()
    expect(fillTexts()).toHaveLength(0)

    gen.permit()
    await scheduler.drain()
    await gen.settled
    expect(gen.status()).toBe('ready')
    expect(gen.masks()).toHaveLength(2)
    gen.dispose()
  })

  it('born permitted, it draws without anyone calling permit, so a generation made after the warm-up never parks', async () => {
    const scheduler = manualScheduler()
    const { items, layout } = twoBlockFixture()
    const gen = friezeGeneration(
      { layout, rows: FRIEZE_ROWS, items, lang: 'en', density: DENSITY },
      scheduler,
      true,
    )
    scheduler.resolveFont()
    await scheduler.drain()
    await gen.settled
    expect(gen.status()).toBe('ready')
    expect(gen.masks()).toHaveLength(2)
    gen.dispose()
  })

  it('waits at most two frames for an idle slot, because a busy thread never offers one', async () => {
    // Measured headless: rAF at 34 ms, timeRemaining() 0, all 43 slices fired
    // on their timeout. At 200 ms that was 11.4 s of waiting for 48 ms of drawing.
    expect(IDLE_TIMEOUT_MS).toBeLessThanOrEqual(34)
    const base = manualScheduler()
    const seen: number[] = []
    const scheduler: ManualScheduler = {
      ...base,
      idle: (run, timeout) => {
        seen.push(timeout)
        return base.idle(run, timeout)
      },
    }
    const gen = generation(scheduler)
    gen.permit()
    scheduler.resolveFont()
    await scheduler.drain()
    await gen.settled
    expect(seen.length).toBeGreaterThan(1)
    expect(seen.every((t) => t === IDLE_TIMEOUT_MS)).toBe(true)
    gen.dispose()
  })

  it('settles when it is disposed before anyone permits it, so the warm-up never waits for ever', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    gen.dispose()
    // Resolves rather than rejects: the warm-up awaits this and must not throw.
    await expect(gen.settled).resolves.toBeUndefined()
    expect(gen.masks()).toBeNull()
    expect(fillTexts()).toHaveLength(0)
  })

  it('disposes what a superseded generation drew, and hands back none of it', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    gen.permit()
    for (let i = 0; i < 40 && fillTexts().length === 0; i++) {
      await Promise.resolve()
      await Promise.resolve()
      scheduler.step()
    }
    expect(fillTexts().length).toBeGreaterThan(0)
    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    gen.dispose()
    await gen.settled
    await scheduler.drain()
    // A resize supersedes this one mid-draw; the renderer must never be handed
    // a texture the next generation is about to replace.
    expect(gen.masks()).toBeNull()
    expect(scheduler.pending()).toBe(0)
    disposed.mockRestore()
  })

  it('disposes a finished generation exactly once when it is superseded later', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    gen.permit()
    await scheduler.drain()
    await gen.settled
    const masks = gen.masks()!
    expect(masks).toHaveLength(2)
    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    gen.dispose()
    gen.dispose()
    expect(disposed).toHaveBeenCalledTimes(masks.length)
    expect(gen.masks()).toBeNull()
    disposed.mockRestore()
  })

  it('disposes masks that land after it was superseded, so none are left orphaned', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    gen.permit()
    await Promise.resolve()
    await Promise.resolve()
    // Drive every slice with no microtask between them, so the job resolves
    // while its own continuation is still queued.
    while (scheduler.step());
    expect(fillTexts().length).toBeGreaterThan(0)

    const disposed = vi.spyOn(THREE.Texture.prototype, 'dispose')
    gen.dispose()
    await gen.settled
    // The masks arrive into a generation that is already superseded. Nothing
    // else owns them, so this one has to dispose them on the way past.
    expect(gen.masks()).toBeNull()
    expect(disposed).toHaveBeenCalledTimes(2)
    disposed.mockRestore()
  })

  it('releases a raster parked on its permit when disposed, rather than leaving it awaiting', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    const fontReady = vi.spyOn(scheduler, 'fontReady')
    scheduler.resolveFont()
    // Nothing past `await permit` has run yet.
    expect(fontReady).not.toHaveBeenCalled()

    gen.dispose()
    await gen.settled
    await Promise.resolve()
    await Promise.resolve()
    expect(fontReady).toHaveBeenCalled()
  })

  it('settles a failed raster as failed instead of rejecting, and keeps the wall cream', async () => {
    const scheduler = manualScheduler()
    const gen = generation(scheduler)
    scheduler.resolveFont()
    measureThrows = true
    gen.permit()
    await scheduler.drain()
    // A raster failure must never reach the WebGL-unavailable path: that kills
    // act one for the session over a wall the reader has not scrolled to.
    await expect(gen.settled).resolves.toBeUndefined()
    expect(gen.status()).toBe('failed')
    expect(gen.masks()).toBeNull()
    gen.dispose()
  })
})

describe('shared resize debounce', () => {
  it('is the caption debounce, exported once from textTexture', () => {
    expect(RESIZE_DEBOUNCE_MS).toBe(150)
  })
})

describe('onIdle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** A browser whose idle callbacks fire only when the test says so. */
  function stubIdle() {
    const callbacks = new Map<number, IdleRequestCallback>()
    let next = 1
    vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => {
      const id = next++
      callbacks.set(id, cb)
      return id
    })
    vi.stubGlobal('cancelIdleCallback', (id: number) => {
      callbacks.delete(id)
    })
    return {
      fire() {
        for (const [id, cb] of callbacks) {
          callbacks.delete(id)
          cb({ didTimeout: false, timeRemaining: () => 10 })
        }
      },
      pending: () => callbacks.size,
    }
  }

  it('runs on a real timer when the thread never goes idle, once, and drops the idle request', () => {
    // Chrome honours requestIdleCallback's own timeout loosely: measured under
    // load, a 32 ms timeout fired every ~185 ms. A setTimeout is kept.
    const idle = stubIdle()
    const run = vi.fn()
    onIdle(run, 32)
    vi.advanceTimersByTime(31)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(idle.pending()).toBe(0)
    idle.fire()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('runs on the idle callback when one comes first, and clears the timer', () => {
    const idle = stubIdle()
    const run = vi.fn()
    onIdle(run, 32)
    idle.fire()
    expect(run).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(100)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('cancel stops both routes', () => {
    const idle = stubIdle()
    const run = vi.fn()
    const cancel = onIdle(run, 32)
    cancel()
    idle.fire()
    vi.advanceTimersByTime(100)
    expect(run).not.toHaveBeenCalled()
    expect(idle.pending()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
