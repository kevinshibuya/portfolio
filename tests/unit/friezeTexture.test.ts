import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { archive } from '../../src/data/archive'
import en from '../../src/i18n/locales/en.json'
import pt from '../../src/i18n/locales/pt.json'
import type { ArchiveItem } from '../../src/types/content'
import { friezeLayout, FRIEZE_ROWS, type Cell } from '../../src/utils/friezeLayout'
import {
  cellText, CELL_TITLE_WORLD, layoutCellText, wrapWords,
  type MeasuringContext,
} from '../../src/components/canvas/scene/friezeText'
import {
  createFriezeTextures, panelsFor, sizeFriezeTextures, maskMemory,
  FRIEZE_DENSITY_CEILING, FRIEZE_TEXTURE_CAP,
  type CoverageContext, type FriezeRecipe, type FriezeTexture,
} from '../../src/components/canvas/scene/friezeTexture'
import { RESIZE_DEBOUNCE_MS } from '../../src/components/canvas/scene/textTexture'

function piece(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'piece', title: 'Coordenação', origin: 'professional', type: 'INFOGRAFICO',
    editorial: 'Coordenação INFOGRÁFICO', date: '09/08/2024', sortDate: 0,
    year: 2024, href: '/piece', internal: false, serial: 7, ...overrides,
  }
}

// Deterministic arithmetic only. These rectangles are NOT Jakarta glyphs.
function measure(): MeasuringContext {
  return {
    font: '600 10px "Plus Jakarta Sans"',
    measureText(text: string): { width: number } {
      const em = Number(/([\d.]+)px/.exec(this.font)?.[1])
      return { width: [...text].reduce((sum, c) => sum +
        (/\d/.test(c) ? 0.35 + Number(c) * 0.05 : 0.5) * em, 0) }
    },
  }
}

interface Mark { text: string; font: string; x: number; y: number }
function surface(): { ctx: CoverageContext; marks: Mark[]; reads: number[] } {
  const canvas = { width: 0, height: 0 }
  const marks: Mark[] = []
  const reads: number[] = []
  const paints: Array<{ left: number; right: number; top: number; bottom: number; green: boolean }> = []
  let clip = { x: 0, y: 0, w: Infinity, h: Infinity }
  const ctx: CoverageContext = {
    ...measure(), canvas, fillStyle: '', textAlign: 'left', textBaseline: 'middle',
    save(): void {}, restore(): void {}, beginPath(): void {}, clip(): void {},
    rect(x, y, w, h): void { clip = { x, y, w, h } },
    fillText(text, x, y): void {
      marks.push({ text, font: this.font, x, y })
      const em = Number(/([\d.]+)px/.exec(this.font)?.[1])
      // Deliberate overshoot exercises pixel-aligned clipping between roles.
      paints.push({
        left: Math.max(x, clip.x), right: Math.min(x + this.measureText(text).width, clip.x + clip.w),
        top: Math.max(y - em, clip.y), bottom: Math.min(y + em, clip.y + clip.h),
        green: this.fillStyle === '#00ff00',
      })
    },
    getImageData(x, y, width, height): { data: Uint8ClampedArray } {
      reads.push(width * height * 4)
      const data = new Uint8ClampedArray(width * height * 4)
      for (const paint of paints) {
        for (let py = Math.max(y, Math.floor(paint.top)); py < Math.min(y + height, paint.bottom); py++) {
          for (let px = Math.max(x, Math.ceil(paint.left)); px < Math.min(x + width, paint.right); px++) {
            const i = ((py - y) * width + px - x) * 4
            // Half coverage, source-over. Overlapping roles produce BOTH R and G.
            const oldAlpha = data[i + 3] / 255
            const alpha = 0.5 + oldAlpha * 0.5
            data[i] = ((paint.green ? 0 : 127.5) + data[i] * oldAlpha * 0.5) / alpha
            data[i + 1] = ((paint.green ? 127.5 : 0) + data[i + 1] * oldAlpha * 0.5) / alpha
            data[i + 3] = alpha * 255
          }
        }
      }
      return { data }
    },
  }
  return { ctx, marks, reads }
}

function recipe(count = 9, overrides: Partial<FriezeRecipe> = {}): FriezeRecipe {
  const items = Array.from({ length: count }, (_, i) => piece({ id: `p${i}`, title: `cell${i}`, serial: i + 1 }))
  return { items, layout: friezeLayout(items, 6), rows: 6, lang: 'en', cssPxPerWorld: 100, dpr: 1, ...overrides }
}

async function microtasks(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function idleQueue(): { slice: () => Promise<void>; drain: () => Promise<void>; pending: () => number } {
  let id = 0
  const queue = new Map<number, IdleRequestCallback>()
  vi.stubGlobal('requestIdleCallback', (fn: IdleRequestCallback): number => { queue.set(++id, fn); return id })
  vi.stubGlobal('cancelIdleCallback', (handle: number): void => { queue.delete(handle) })
  const slice = async (): Promise<void> => {
    await microtasks()
    const next = queue.entries().next().value
    if (next) {
      queue.delete(next[0])
      next[1]({ didTimeout: false, timeRemaining: () => 50 })
    }
    await microtasks()
  }
  return {
    slice, pending: () => queue.size,
    drain: async (): Promise<void> => {
      await microtasks()
      for (let i = 0; queue.size && i < 100; i++) await slice()
    },
  }
}

function harness(fontReady: () => Promise<void> = () => Promise.resolve()): {
  owner: ReturnType<typeof createFriezeTextures>
  surfaces: ReturnType<typeof surface>[]
  uploads: THREE.DataTexture[]
  bytes: Uint8Array[]
  disposed: THREE.DataTexture[]
  swaps: (readonly FriezeTexture[])[]
  failures: unknown[]
  uploadStores: number[][]
  events: string[]
  failUpload: (error: Error) => void
} {
  const surfaces: ReturnType<typeof surface>[] = []
  const uploads: THREE.DataTexture[] = []
  const bytes: Uint8Array[] = []
  const disposed: THREE.DataTexture[] = []
  const swaps: (readonly FriezeTexture[])[] = []
  const failures: unknown[] = []
  const uploadStores: number[][] = []
  const events: string[] = []
  let uploadFailure: Error | null = null
  const owner = createFriezeTextures({
    fontReady,
    createContext: (): CoverageContext => { const s = surface(); surfaces.push(s); return s.ctx },
    upload: (texture): void => {
      uploads.push(texture)
      events.push('upload')
      texture.addEventListener('dispose', () => { disposed.push(texture); events.push('dispose') })
      bytes.push(new Uint8Array(texture.image.data as Uint8Array))
      uploadStores.push(surfaces.map(s => s.ctx.canvas.width * s.ctx.canvas.height))
      if (uploadFailure) throw uploadFailure
    },
    onSwap: masks => { swaps.push(masks); events.push('swap') }, onFailure: error => failures.push(error),
  })
  return { owner, surfaces, uploads, bytes, disposed, swaps, failures, uploadStores, events,
    failUpload: (error): void => { uploadFailure = error } }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('cell presentation', () => {
  it.each(['en', 'pt'] as const)('formats editorial accents and dotted dates in %s', lang => {
    expect(cellText(piece(), lang)).toEqual({ title: 'Coordenação', meta: 'infografico · coordenação infográfico · 09.08.2024', serial: '7' })
  })

  it.each(['en', 'pt'] as const)('resolves bilingual professional titles without meta in %s', lang => {
    expect(cellText(piece({ title: { en: 'Coordination', pt: 'Coordenação' }, caseStudy: { slug: 'study' } }), lang))
      .toEqual({ title: lang === 'en' ? 'Coordination' : 'Coordenação', meta: '', serial: '7' })
  })

  it.each(['en', 'pt'] as const)('reads both origin words from the shared locale in %s', lang => {
    const locale = { en, pt }[lang].sections.archive.origin
    const original = { ...locale }
    // Sentinel values prove locale backing, including the identically spelt freelance.
    locale.freelance = `locale-${lang}-freelance`
    locale.personal = `locale-${lang}-personal`
    try {
      expect(['freelance', 'personal'].map(origin => cellText(piece({
        origin: origin as 'freelance' | 'personal', caseStudy: { slug: 'study' },
      }), lang).meta)).toEqual([`locale-${lang}-freelance`, `locale-${lang}-personal`])
    } finally { Object.assign(locale, original) }
  })
})

describe('measured layout', () => {
  it('uses ellipsis alone for an indivisible overlong token', () => {
    expect(wrapWords(measure(), 'anticonstitucionalissimamente', 30, 2)).toEqual(['…'])
  })
  it('limits titles to two lines and removes whole trailing words', () => {
    expect(wrapWords(measure(), 'one two three four five', 40, 2)).toEqual(['one two', 'three…'])
  })
  it('ellipsises meta on one line at word boundaries', () => {
    expect(wrapWords(measure(), 'one two three', 50, 1)).toEqual(['one two…'])
  })
  it('reserves the serial line with and without meta at the specified typography', () => {
    const ctx = measure()
    const summarise = (meta: string): unknown => layoutCellText(ctx, { title: 'Name', meta, serial: '1' }, 100)
      .map(({ text, role, x, y, fontPx, weight }) => ({ text, role, x, y: Number(y.toFixed(3)), fontPx, weight }))
    expect({ titleWorld: CELL_TITLE_WORLD, withMeta: summarise('meta'), withoutMeta: summarise('') }).toEqual({
      titleWorld: 0.06,
      withMeta: [
        { text: 'Name', role: 'title', x: 3, y: 6.6, fontPx: 6, weight: 600 },
        { text: 'meta', role: 'meta', x: 3, y: 12.6, fontPx: 4, weight: 500 },
        { text: '1', role: 'serial', x: 3, y: 17.4, fontPx: 4, weight: 500 },
      ],
      withoutMeta: [
        { text: 'Name', role: 'title', x: 3, y: 6.6, fontPx: 6, weight: 600 },
        { text: '1', role: 'serial', x: 3, y: 12.6, fontPx: 4, weight: 500 },
      ],
    })
  })
  it('positions different serial digits at the same widest-digit advances', () => {
    const xs = (serial: string): number[] => layoutCellText(measure(), { title: '', meta: '', serial }, 100)
      .filter(run => run.role === 'serial').map(run => Number(run.x.toFixed(3)))
    expect([xs('119'), xs('981')]).toEqual([[3, 6.2, 9.4], [3, 6.2, 9.4]])
  })
})

describe('density, panels and memory', () => {
  const layout = friezeLayout(archive, FRIEZE_ROWS)
  it('applies renderer DPR once and caps DPR at 1.5', () => {
    expect([1, 1.5, 2, 3].map(dpr => sizeFriezeTextures(layout, 6, 288, dpr)[0].texelsPerWorld))
      .toEqual([288, 432, 432, 432])
  })
  it('applies the 612.8 ceiling before counting capped panels', () => {
    expect({ ceiling: FRIEZE_DENSITY_CEILING, cap: FRIEZE_TEXTURE_CAP,
      directColumns: panelsFor(layout.blocks[2], layout.cells.filter(c => c.block === 2), 2000).map(p => p.columns),
      panels: sizeFriezeTextures(layout, 6, 2000, 1.5).map(p => [p.columns, p.widthPx, p.heightPx, p.texelsPerWorld]),
    }).toEqual({ ceiling: 612.8, cap: 4096, directColumns: [11, 11], panels: [
      [2, 613, 1328, 612.8], [9, 2758, 1328, 612.8],
      [11, 3370, 1328, 612.8], [11, 3370, 1328, 612.8], [2, 613, 1328, 612.8],
    ] })
  })
  it('preserves floor density on 2024 and exposes block offsets and panel-zero count', () => {
    expect(sizeFriezeTextures(layout, 6, 288, 1.5).filter(p => p.block === 2)
      .map(p => [p.columnOffset, p.columns, p.widthPx, p.heightPx, p.yearCount]))
      .toEqual([[0, 11, 2376, 936, 118], [11, 11, 2376, 936, null]])
  })
  it('moves an even boundary to the nearest legal whole column around a span', () => {
    const block = { year: 2024, startCol: 10, columns: 22, count: 1 }
    const cells: Cell[] = [{ itemId: 'span', col: 20, row: 0, span: 2, block: 0 }]
    expect(panelsFor(block, cells, 612.8).map(p => [p.columnOffset, p.columns]))
      .toEqual([[0, 10], [10, 12]])
  })
  it('uses near-equal whole columns for odd widths', () => {
    expect(panelsFor({ year: 2024, startCol: 0, columns: 23, count: 0 }, [], 612.8)
      .map(p => [p.columnOffset, p.columns])).toEqual([[0, 11], [11, 12]])
  })
  it('refuses a required panel count with no legal span-safe boundary', () => {
    const cells: Cell[] = [{ itemId: 'span', col: 1, row: 0, span: 2, block: 0 }]
    expect(() => panelsFor({ year: 2024, startCol: 0, columns: 4, count: 1 }, cells, 100, 100))
      .toThrow(/blocked:.*boundary/)
  })
  it('refuses height above 4096 instead of reducing density', () => {
    expect(() => sizeFriezeTextures(layout, 20, 2000, 1.5)).toThrow(/blocked:.*height/)
  })
  it('accounts for RG GPU masks, RGBA assembly, RG upload and one scanline under budget', () => {
    const panels = sizeFriezeTextures(layout, 6, 408.535714, 1.5)
    expect({ ...maskMemory(panels), oversizedWithinBudget: maskMemory([...panels, ...panels]).withinBudget }).toEqual({
      panelBytes: [1628128, 7325248, 8950720, 8950720, 1628128],
      steadyBytes: 28482944, redrawGpuBytes: 56965888,
      assemblyBytes: 17901440, nominalPeakBytes: 74867328,
      cpuPeakBytes: 26865640, actualPeakBytes: 83831528,
      budgetBytes: 90649395.2, withinBudget: true, oversizedWithinBudget: false,
    })
  })
})

describe('incremental mask lifetime', () => {
  it('does nothing before warm-up permission, even when fonts are ready', async () => {
    const idle = idleQueue(); const h = harness()
    const result = h.owner.redraw(recipe())
    await idle.drain()
    expect([h.surfaces.length, h.uploads.length, idle.pending()]).toEqual([0, 0, 0])
    h.owner.dispose(); await result
  })
  it('awaits Jakarta before allocating or drawing', async () => {
    const idle = idleQueue(); let ready: () => void = () => {}
    const h = harness(() => new Promise<void>(resolve => { ready = resolve }))
    h.owner.allowWarmup(); const result = h.owner.redraw(recipe())
    await idle.drain()
    expect(h.surfaces).toHaveLength(0)
    ready(); await idle.drain(); await result; h.owner.dispose()
  })
  it('draws at most four cells per idle slice', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const result = h.owner.redraw(recipe())
    const counts: number[] = []
    for (let i = 0; i < 3; i++) {
      await idle.slice()
      counts.push(h.surfaces.flatMap(s => s.marks).filter(m => m.text.startsWith('cell')).length)
    }
    expect(counts).toEqual([4, 8, 9])
    await idle.drain(); await result; h.owner.dispose()
  })
  it('uses timers when idle callbacks are missing', async () => {
    vi.useFakeTimers(); vi.stubGlobal('requestIdleCallback', undefined)
    const h = harness(); h.owner.allowWarmup(); const result = h.owner.redraw(recipe())
    await microtasks(); await vi.runAllTimersAsync()
    expect({ masks: h.uploads.length, cells: h.surfaces.flatMap(s => s.marks).filter(m => m.text.startsWith('cell')).length })
      .toEqual({ masks: 1, cells: 9 })
    await result; h.owner.dispose()
  })
  it('packs disjoint title R and muted G coverage without baking presentation colour', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const result = h.owner.redraw(recipe(1)); await idle.drain(); await result
    const data = h.bytes[0]; let red = false; let green = false; let overlap = false
    for (let i = 0; i < data.length; i += 2) {
      red ||= data[i] > 0; green ||= data[i + 1] > 0; overlap ||= data[i] > 0 && data[i + 1] > 0
    }
    expect({ red, green, overlap, coverage: Math.max(...data) }).toEqual({ red: true, green: true, overlap: false, coverage: 128 })
    h.owner.dispose()
  })
  it('assigns title, meta and serial to their respective channels', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const result = h.owner.redraw(recipe(1)); await idle.drain(); await result
    const pixel = (y: number): number[] => [...h.bytes[0].slice((y * 50 + 3) * 2, (y * 50 + 3) * 2 + 2)]
    expect([pixel(10), pixel(16), pixel(22)]).toEqual([[128, 0], [0, 128], [0, 128]])
    h.owner.dispose()
  })
  it('leaves case-study bodies blank and places only serials in the bottom strip', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const item = piece({ title: 'card title', caseStudy: { slug: 'card' } })
    const result = h.owner.redraw(recipe(0, { items: [item], layout: friezeLayout([item], 6) }))
    await idle.drain(); await result
    expect(h.surfaces[0].marks.map(m => [m.text, Number(m.y.toFixed(3))])).toEqual([['1', 5.4], ['7', 66.858]])
    h.owner.dispose()
  })
  it('uploads RG8 with linear filtering, no colour space or mipmaps and top-first rows', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const result = h.owner.redraw(recipe(1)); await idle.drain(); await result
    const t = h.uploads[0]
    expect([t.format, t.type, t.minFilter, t.magFilter, t.colorSpace, t.generateMipmaps, t.unpackAlignment, t.flipY])
      .toEqual([THREE.RGFormat, THREE.UnsignedByteType, THREE.LinearFilter, THREE.LinearFilter, THREE.NoColorSpace, false, 1, false])
    h.owner.dispose()
  })
  it('uploads one panel at a time then immediately releases canvases and CPU data', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const r = recipe(2); r.items[1].year = 2023; r.layout = friezeLayout(r.items, 6)
    const result = h.owner.redraw(r); await idle.drain(); await result
    expect({
      duringUpload: h.uploadStores,
      after: h.surfaces.map(s => [s.ctx.canvas.width, s.ctx.canvas.height]),
      cpuData: h.uploads.map(t => t.image.data),
      readBytes: h.surfaces.map(s => Math.max(...s.reads)),
    }).toEqual({ duringUpload: [[10850], [0, 10850]], after: [[0, 0], [0, 0]], cpuData: [null, null], readBytes: [200, 200] })
    h.owner.dispose()
  })
  it('cancels a partial generation on language change and settles its promise', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const r = recipe(10); r.items[0].year = 2025; r.layout = friezeLayout(r.items, 6)
    const abandoned = h.owner.redraw(r)
    await idle.slice(); await idle.slice()
    const replacement = h.owner.redraw({ ...r, lang: 'pt' })
    await idle.drain()
    expect({ abandoned: await abandoned, released: h.surfaces.slice(0, 2).map(s => [s.ctx.canvas.width, s.ctx.canvas.height]),
      disposed: h.disposed.length, swaps: h.swaps.length, masks: (await replacement)?.length,
    }).toEqual({ abandoned: null, released: [[0, 0], [0, 0]], disposed: 1, swaps: 1, masks: 2 })
    h.owner.dispose()
  })
  it('keeps old masks visible until all replacements upload, then swaps before disposal', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const initial = h.owner.redraw(recipe()); await idle.drain(); const old = await initial
    const result = h.owner.redraw(recipe(9, { lang: 'pt' })); await idle.slice()
    expect([h.swaps.length, h.disposed.length, h.swaps[0] === old]).toEqual([1, 0, true])
    await idle.drain(); await result
    expect([h.swaps.length, h.disposed[0] === old?.[0].texture, h.events])
      .toEqual([2, true, ['upload', 'swap', 'upload', 'swap', 'dispose']])
    h.owner.dispose()
  })
  it('debounces resize by the shared 150 ms and cancels obsolete drawing immediately', async () => {
    vi.useFakeTimers(); const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const abandoned = h.owner.redraw(recipe()); await idle.slice()
    const result = h.owner.redraw(recipe(9, { cssPxPerWorld: 200 }), { resize: true })
    await vi.advanceTimersByTimeAsync(149); await idle.drain()
    expect([RESIZE_DEBOUNCE_MS, await abandoned, h.surfaces.length, h.surfaces[0].ctx.canvas.width]).toEqual([150, null, 1, 0])
    await vi.advanceTimersByTimeAsync(1); await idle.drain()
    expect(h.uploads.map(t => t.image.width)).toEqual([200])
    await result; h.owner.dispose()
  })
  it('unmount cancels pending idle work, releases the canvas and never publishes it', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const result = h.owner.redraw(recipe()); await idle.slice(); h.owner.dispose(); await idle.drain()
    expect([await result, idle.pending(), h.surfaces[0].ctx.canvas.width, h.uploads.length]).toEqual([null, 0, 0, 0])
  })
  it('cancels while waiting for fonts and ignores their late completion', async () => {
    const idle = idleQueue(); let ready: () => void = () => {}
    const h = harness(() => new Promise<void>(resolve => { ready = resolve }))
    h.owner.allowWarmup(); const result = h.owner.redraw(recipe()); h.owner.dispose(); ready(); await idle.drain()
    expect([await result, h.surfaces.length, h.uploads.length]).toEqual([null, 0, 0])
  })
  it('drops lost-context resources and regenerates from the retained recipe', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const initial = h.owner.redraw(recipe()); await idle.drain(); await initial
    const abandoned = h.owner.redraw(recipe(9, { lang: 'pt' })); await idle.slice()
    h.owner.contextLost(); await idle.drain()
    expect([await abandoned, h.disposed.length, h.swaps.at(-1)?.length, h.surfaces[1].ctx.canvas.width]).toEqual([null, 1, 0, 0])
    const restored = h.owner.contextRestored(); await idle.drain()
    expect([(await restored)?.length, h.uploads.length]).toEqual([1, 2])
    h.owner.dispose()
  })
  it('a failed upload disposes partial and old masks and settles to a blank wall', async () => {
    const idle = idleQueue(); const h = harness(); h.owner.allowWarmup()
    const initial = h.owner.redraw(recipe(1)); await idle.drain(); await initial
    const failure = new Error('upload failed')
    const result = h.owner.redraw(recipe(1))
    h.failUpload(failure)
    await idle.drain()
    expect([await result, h.failures[0], h.swaps.at(-1)?.length, h.disposed.length,
      h.surfaces.at(-1)?.ctx.canvas.width]).toEqual([null, failure, 0, 2, 0])
    h.owner.dispose()
  })
})
