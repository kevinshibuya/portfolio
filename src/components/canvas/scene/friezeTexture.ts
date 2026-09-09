import * as THREE from 'three'
import type { ArchiveItem } from '../../../types/content'
import {
  FRIEZE_CELL_H, FRIEZE_CELL_W,
  type Cell, type FriezeBlock, type FriezeLayout,
} from '../../../utils/friezeLayout'
import {
  cellText, layoutCellText, COVERAGE_CHANNEL, CELL_LINE_HEIGHT, CELL_MUTED_WORLD,
  type CellTextRun, type MeasuringContext,
} from './friezeText'
import { loadTextFont, RESIZE_DEBOUNCE_MS, TEXT_FAMILY } from './textTexture'

export const FRIEZE_DENSITY_CEILING = 612.8
export const FRIEZE_TEXTURE_CAP = 4096
const CELLS_PER_SLICE = 4

export interface FriezePanel {
  /** Relative to the block's lookup and occupancy table, never to a new table. */
  columnOffset: number
  columns: number
  yearCount: number | null
}

export interface SizedFriezePanel extends FriezePanel {
  block: number
  widthPx: number
  heightPx: number
  texelsPerWorld: number
}

export interface FriezeTexture extends SizedFriezePanel {
  /** RG8 needs a typed upload, rather than an RGBA DOM canvas source. */
  texture: THREE.DataTexture
}

/** Ceiling first. Keep the minimum panel count, with the nearest feasible boundaries. */
export function panelsFor(
  block: FriezeBlock, cells: readonly Cell[], density: number, cap = FRIEZE_TEXTURE_CAP,
): FriezePanel[] {
  density = Math.min(density, FRIEZE_DENSITY_CEILING)
  if (!(density > 0) || !Number.isFinite(density) || !(cap > 0)) throw new Error('Invalid mask density or cap')
  if (block.columns === 0) return []
  const count = Math.ceil(block.columns * FRIEZE_CELL_W * density / cap)
  const maxColumns = Math.floor(cap / (FRIEZE_CELL_W * density))
  const forbidden = new Set(cells.filter(cell => cell.span === 2)
    .map(cell => cell.col - block.startCol + 1))
  const deadEnds = new Set<string>()
  const split = (from: number, index: number): number[] | null => {
    if (index === count) return block.columns - from <= maxColumns ? [block.columns] : null
    const key = `${from}:${index}`
    if (deadEnds.has(key)) return null
    const ideal = block.columns * index / count
    const candidates: number[] = []
    for (let col = from + 1; col <= Math.min(from + maxColumns, block.columns - (count - index)); col++) {
      if (!forbidden.has(col)) candidates.push(col)
    }
    candidates.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal) || a - b)
    for (const col of candidates) {
      const rest = split(col, index + 1)
      if (rest) return [col, ...rest]
    }
    deadEnds.add(key)
    return null
  }
  const boundaries = split(0, 1)
  if (!boundaries) throw new Error(`blocked: year ${block.year} has no legal boundary for ${count} panels at ${density} texels/world`)
  return boundaries.map((end, i) => {
    const columnOffset = i ? boundaries[i - 1] : 0
    return { columnOffset, columns: end - columnOffset, yearCount: i === 0 ? block.count : null }
  })
}

export function sizeFriezeTextures(
  layout: FriezeLayout, rows: number, cssPxPerWorld: number, dpr: number,
): SizedFriezePanel[] {
  const density = Math.min(cssPxPerWorld * Math.min(dpr, 1.5), FRIEZE_DENSITY_CEILING)
  const neededHeight = rows * FRIEZE_CELL_H * density
  if (!Number.isInteger(rows) || rows < 1 || !(density > 0)) throw new Error('Invalid mask rows or density')
  if (neededHeight > FRIEZE_TEXTURE_CAP) throw new Error(`blocked: mask height ${neededHeight} exceeds ${FRIEZE_TEXTURE_CAP}; column panels cannot fix height`)
  return layout.blocks.flatMap((block, index) => panelsFor(block, layout.cells.filter(c => c.block === index), density)
    .map(panel => ({ ...panel, block: index, texelsPerWorld: density,
      widthPx: Math.max(1, Math.round(panel.columns * FRIEZE_CELL_W * density)),
      heightPx: Math.max(1, Math.round(neededHeight)),
    })))
}

export interface MaskMemory {
  panelBytes: number[]
  steadyBytes: number
  redrawGpuBytes: number
  assemblyBytes: number
  nominalPeakBytes: number
  cpuPeakBytes: number
  actualPeakBytes: number
  budgetBytes: number
  withinBudget: boolean
}

/** Mask stores only: excludes lookups, covers, driver overhead and the composer. */
export function maskMemory(panels: readonly SizedFriezePanel[]): MaskMemory {
  const panelBytes = panels.map(p => p.widthPx * p.heightPx * 2)
  const steadyBytes = panelBytes.reduce((sum, bytes) => sum + bytes, 0)
  const largest = Math.max(0, ...panelBytes)
  const redrawGpuBytes = 2 * steadyBytes
  // The amendment's 71.4 MiB assumes one RGBA canvas assembly store.
  const assemblyBytes = 2 * largest
  const nominalPeakBytes = redrawGpuBytes + assemblyBytes
  // Real retained CPU stores: RGBA canvas + RG upload + one RGBA scanline.
  const cpuPeakBytes = Math.max(0, ...panels.map(p => p.widthPx * p.heightPx * 6 + p.widthPx * 4))
  const actualPeakBytes = redrawGpuBytes + cpuPeakBytes
  const budgetBytes = 86.45 * 1048576
  return { panelBytes, steadyBytes, redrawGpuBytes, assemblyBytes, nominalPeakBytes,
    cpuPeakBytes, actualPeakBytes, budgetBytes, withinBudget: actualPeakBytes <= budgetBytes }
}

export interface CoverageContext extends MeasuringContext {
  canvas: { width: number; height: number }
  fillStyle: string | CanvasGradient | CanvasPattern
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  save(): void
  restore(): void
  beginPath(): void
  rect(x: number, y: number, width: number, height: number): void
  clip(): void
  fillText(text: string, x: number, y: number): void
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray }
}

export interface FriezeRecipe {
  layout: FriezeLayout
  items: readonly ArchiveItem[]
  rows: number
  lang: 'en' | 'pt'
  /** Motion's maximum projected CSS px/world at the reading poses. */
  cssPxPerWorld: number
  dpr: number
}

export interface FriezeTextureHost {
  /** Synchronous upload, e.g. gl.initTexture. Must finish before this returns. */
  upload(texture: THREE.DataTexture): void
  /** Atomically replace the caller's complete set of borrowed masks. */
  onSwap(masks: readonly FriezeTexture[]): void
  /** Set data-frieze=failed; this is independent of warm-up and WebGL availability. */
  onFailure(error: unknown): void
  createContext?: () => CoverageContext
  fontReady?: () => Promise<void>
}

export interface FriezeTextures {
  /** Cancels obsolete work immediately; resize only delays the replacement. */
  redraw(recipe: FriezeRecipe, options?: { resize?: boolean }): Promise<readonly FriezeTexture[] | null>
  allowWarmup(): void
  cancel(): void
  contextLost(): void
  contextRestored(): Promise<readonly FriezeTexture[] | null>
  dispose(): void
}

function createContext(): CoverageContext {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    canvas.width = canvas.height = 0
    throw new Error('2D canvas context unavailable for the frieze')
  }
  return ctx
}

function scheduleSlice(callback: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, { timeout: 150 })
    return () => cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, 0)
  return () => window.clearTimeout(id)
}

function drawRun(ctx: CoverageContext, run: CellTextRun, x = 0, y = 0): void {
  ctx.save()
  ctx.beginPath()
  // Integer boundaries prevent neighbouring role clips sharing antialiased texels.
  const top = Math.round(y + run.clip.y)
  const bottom = Math.round(y + run.clip.y + run.clip.height)
  ctx.rect(x + run.clip.x, top, run.clip.width, bottom - top)
  ctx.clip()
  ctx.font = `${run.weight} ${run.fontPx}px ${TEXT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  // These are channel selectors. Alpha is coverage; neither is a presentation ink.
  ctx.fillStyle = COVERAGE_CHANNEL[run.role] === 0 ? '#ff0000' : '#00ff00'
  ctx.fillText(run.text, x + run.x, y + run.y)
  ctx.restore()
}

function packCoverage(ctx: CoverageContext): Uint8Array {
  const { width, height } = ctx.canvas
  const rg = new Uint8Array(width * height * 2)
  for (let y = 0; y < height; y++) {
    // No full-panel ImageData: only one scanline is live alongside the two stores.
    const { data } = ctx.getImageData(0, y, width, 1)
    for (let x = 0; x < width; x++) {
      const source = x * 4
      const target = (y * width + x) * 2
      rg[target] = Math.round(data[source] * data[source + 3] / 255)
      rg[target + 1] = Math.round(data[source + 1] * data[source + 3] / 255)
    }
  }
  return rg
}

function disposeMasks(masks: readonly FriezeTexture[]): void {
  for (const mask of masks) {
    mask.texture.image.data = null
    mask.texture.dispose()
  }
}

interface Generation {
  recipe: FriezeRecipe
  masks: FriezeTexture[]
  context: CoverageContext | null
  stopSlice: (() => void) | null
  timer: number | null
  eligible: boolean
  started: boolean
  done: boolean
  resolve(masks: readonly FriezeTexture[] | null): void
}

/** Owns masks across redraws; callers borrow them and must not dispose them. */
export function createFriezeTextures(host: FriezeTextureHost): FriezeTextures {
  let warmup = false
  let lost = false
  let disposed = false
  let recipe: FriezeRecipe | null = null
  let current: readonly FriezeTexture[] = []
  let pending: Generation | null = null

  const releaseCanvas = (job: Generation): void => {
    if (job.context) {
      job.context.canvas.width = job.context.canvas.height = 0
      job.context = null
    }
  }
  const cancel = (): void => {
    if (!pending) return
    const job = pending
    pending = null
    job.done = true
    job.stopSlice?.()
    if (job.timer !== null) window.clearTimeout(job.timer)
    releaseCanvas(job)
    disposeMasks(job.masks)
    job.resolve(null)
  }
  const clear = (): void => {
    const old = current
    current = []
    host.onSwap(current)
    disposeMasks(old)
  }
  const fail = (job: Generation, error: unknown): void => {
    if (job.done) return
    cancel()
    clear()
    host.onFailure(error)
  }
  const start = (): void => {
    const job = pending
    if (!warmup || lost || disposed || !job || !job.eligible || job.started) return
    job.started = true
    const draw = async (): Promise<void> => {
      await (host.fontReady ?? loadTextFont)()
      if (job.done) return
      const r = job.recipe
      const panels = sizeFriezeTextures(r.layout, r.rows, r.cssPxPerWorld, r.dpr)
      if (!maskMemory(panels).withinBudget) throw new Error('blocked: frieze mask stores exceed 86.45 MiB')
      const items = new Map(r.items.map(item => [item.id, item]))
      let panelIndex = 0
      let cellIndex = 0
      let cells: Cell[] = []
      const slice = (): void => {
        if (job.done) return
        try {
          const panel = panels[panelIndex]
          if (panel) {
            const block = r.layout.blocks[panel.block]
            const startCol = block.startCol + panel.columnOffset
            const density = panel.texelsPerWorld
            if (!job.context) {
              job.context = (host.createContext ?? createContext)()
              job.context.canvas.width = panel.widthPx
              job.context.canvas.height = panel.heightPx
              cells = r.layout.cells.filter(c => c.block === panel.block && c.col >= startCol && c.col < startCol + panel.columns)
              cellIndex = 0
              if (panel.yearCount !== null) {
                for (const run of layoutCellText(job.context, { title: '', meta: '', serial: String(panel.yearCount) }, density)) drawRun(job.context, run)
              }
            }
            const ctx = job.context
            const end = Math.min(cellIndex + CELLS_PER_SLICE, cells.length)
            for (; cellIndex < end; cellIndex++) {
              const cell = cells[cellIndex]
              const item = items.get(cell.itemId)
              if (!item) throw new Error(`Missing frieze item ${cell.itemId}`)
              const x = (cell.col - startCol) * FRIEZE_CELL_W * density
              const y = cell.row * FRIEZE_CELL_H * density
              const topOffsetWorld = panel.yearCount !== null && cell.col === startCol && cell.row === 0
                ? CELL_MUTED_WORLD * CELL_LINE_HEIGHT : 0
              for (const run of layoutCellText(ctx, cellText(item, r.lang), density, { caseStudy: !!item.caseStudy, topOffsetWorld })) drawRun(ctx, run, x, y)
            }
            if (cellIndex < cells.length) {
              job.stopSlice = scheduleSlice(slice)
              return
            }
            const texture = new THREE.DataTexture(packCoverage(ctx), panel.widthPx, panel.heightPx, THREE.RGFormat, THREE.UnsignedByteType)
            texture.generateMipmaps = false
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.colorSpace = THREE.NoColorSpace
            texture.unpackAlignment = 1
            texture.flipY = false // Row zero is the top; Task 5 maps UVs accordingly.
            job.masks.push({ ...panel, texture })
            texture.needsUpdate = true
            host.upload(texture)
            texture.image.data = null // Context restoration uses the recipe, not a retained upload.
            releaseCanvas(job)
            panelIndex++
          }
          if (panelIndex < panels.length) {
            job.stopSlice = scheduleSlice(slice)
          } else {
            const old = current
            host.onSwap(job.masks)
            current = job.masks
            disposeMasks(old)
            job.done = true
            pending = null
            job.resolve(current)
          }
        } catch (error) { fail(job, error) }
      }
      job.stopSlice = scheduleSlice(slice)
    }
    void draw().catch(error => fail(job, error))
  }
  const redraw: FriezeTextures['redraw'] = (next, options = {}) => {
    if (disposed) return Promise.resolve(null)
    recipe = next
    cancel()
    return new Promise(resolve => {
      const job: Generation = { recipe: next, masks: [], context: null, stopSlice: null,
        timer: null, eligible: !options.resize, started: false, done: false, resolve }
      pending = job
      if (options.resize) job.timer = window.setTimeout(() => { job.eligible = true; start() }, RESIZE_DEBOUNCE_MS)
      start()
    })
  }
  return {
    redraw, cancel,
    allowWarmup: (): void => { warmup = true; start() },
    contextLost: (): void => { lost = true; cancel(); clear() },
    contextRestored: (): Promise<readonly FriezeTexture[] | null> => {
      lost = false
      return Promise.resolve([])
    },
    dispose: (): void => { disposed = true; recipe = null; cancel(); clear() },
  }
}
