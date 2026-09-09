import * as THREE from 'three'
import type { ArchiveItem } from '../../../types/content'
import {
  FRIEZE_CELL_H,
  FRIEZE_CELL_W,
  countCell,
  type Cell,
  type FriezeBlockExtent,
  type FriezeExtent,
  type FriezeLayout,
} from '../../../utils/friezeLayout'
import { friezeFrame, friezeHeightFill, type SceneGeometry } from '../../../utils/sceneMotion'
import { TEXT_FAMILY, loadTextFont } from './textTexture'
import {
  CELL_INSET_WORLD,
  CELL_LINE_HEIGHT,
  CELL_META_WEIGHT,
  CELL_META_WORLD,
  CELL_TITLE_WEIGHT,
  CELL_TITLE_WORLD,
  YEAR_COUNT_BAND_WORLD,
  cellText,
  digitAdvance,
  fitMeta,
  wrapTitle,
} from './friezeText'

/**
 * The wall's coverage masks: one two-channel texture per panel, drawn on a
 * single reusable scratch canvas a few cells at a time.
 *
 * A panel is a year block, or a column-aligned slice of one when the block's
 * mask would pass the 4096 px cap (second amendment). R is title coverage, G
 * is meta and serial together: the shader inks both from the same muted ink
 * and hover recolours the title alone, so the two never need separating and
 * must never overlap inside a cell. `RGFormat`, two bytes a texel, is what
 * pays for the density ceiling.
 *
 * Coverage, not colour: the canvas is filled black and the roles are drawn in
 * pure red and pure green, so a texel's R and G ARE the glyph coverage after
 * antialiasing. No presentation colour is baked in; the origin tint and the
 * hover tint live in the lookup texture and the shader (Task 5).
 *
 * Lifetime (Q8): the job waits for warm-up permission and the face, then draws
 * at most `FRIEZE_RASTER_SLICE` cells per idle slice, packs each finished
 * panel into a `DataTexture`, and releases the scratch canvas when it is done
 * or abandoned. A cancelled or failed job disposes every texture it created.
 */

/**
 * Texels per world unit the masks stop growing at: 1:1 at renderer DPR 1.5 up
 * to a 1080 CSS px viewport (`0.82 · 1080 / (6 · FRIEZE_CELL_H) · 1.5`). Above
 * it a 5K display magnifies 1.2× rather than the mask bytes growing with the
 * square of the projected density.
 */
export const FRIEZE_DENSITY_CEILING = 612.8
/** Long-side cap per texture; a block past it is split into panels. */
export const FRIEZE_MASK_MAX_PX = 4096
/** Cells drawn per idle slice. */
export const FRIEZE_RASTER_SLICE = 4
/**
 * How long a slice waits for an idle period before running anyway. Two frames,
 * not a comfortable 200 ms: a thread that is never idle (measured headless,
 * `timeRemaining()` 0 on every slice) makes every slice pay the whole timeout,
 * and 43 slices at 200 ms was 11.4 s of waiting for 48 ms of drawing.
 */
export const IDLE_TIMEOUT_MS = 32

const TITLE_FILL = '#FF0000'
const META_FILL = '#00FF00'
const GROUND_FILL = '#000000'

export interface FriezePanel {
  /** Zero-based block index into the layout. */
  block: number
  /** Zero-based within the block; the year count is drawn in the panel holding its cell. */
  panel: number
  /** Absolute first column, from the frieze's left edge. */
  startCol: number
  columns: number
}

export interface MaskSize {
  widthPx: number
  heightPx: number
  /** Effective texels per world unit after the cap, i.e. `density · scale`. */
  texelsPerWorld: number
  scale: number
}

/** What a generation was drawn from, kept so context loss can redraw it. */
export interface FriezeRasterRecipe {
  layout: FriezeLayout
  rows: number
  items: readonly ArchiveItem[]
  lang: 'en' | 'pt'
  density: number
}

export interface FriezeTexture {
  texture: THREE.DataTexture
  panel: FriezePanel
  /** Texture pixels. */
  widthPx: number
  heightPx: number
  texelsPerWorld: number
  /** `widthPx · heightPx · 2`: what the mask costs on the GPU, no mipmaps. */
  bytes: number
  /** Texels carrying both R and G; zero by contract, exposed for the tests. */
  overlapTexels: number
  recipe: FriezeRasterRecipe
}

export interface RasterScheduler {
  /** Runs `run` when the thread is idle, or after `timeout` ms; returns a cancel. */
  idle(run: () => void, timeout: number): () => void
  fontReady(): Promise<void>
}

export interface FriezeRasterRequest extends FriezeRasterRecipe {
  /** Warm-up permission: nothing is drawn before it resolves. */
  permit?: Promise<void>
  scheduler?: RasterScheduler
  /** Called once per slice with the units drawn so far. */
  onProgress?: (drawn: number, total: number) => void
}

export interface FriezeRasterJob {
  promise: Promise<FriezeTexture[]>
  cancel(): void
  /** Textures created so far; they are disposed if the job does not complete. */
  created(): number
}

export class FriezeRasterCancelled extends Error {
  constructor() {
    super('frieze rasterisation cancelled')
    this.name = 'FriezeRasterCancelled'
  }
}

/**
 * The first of an idle period or a real timer, then the other is cancelled.
 *
 * Not requestIdleCallback's own `timeout` option: Chrome honours that loosely
 * when the thread is busy — measured under load, a 32 ms timeout fired every
 * ~185 ms — and a busy thread is exactly when the fallback matters. A
 * setTimeout task interleaves with frames on its own schedule.
 */
export function onIdle(run: () => void, timeout: number): () => void {
  let idle: number | undefined
  let timer: number | undefined
  const cancel = (): void => {
    if (idle !== undefined) cancelIdleCallback(idle)
    if (timer !== undefined) window.clearTimeout(timer)
    idle = timer = undefined
  }
  const fire = (): void => {
    cancel()
    run()
  }
  timer = window.setTimeout(fire, timeout)
  if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(fire)
  return cancel
}

const defaultScheduler: RasterScheduler = { idle: onIdle, fontReady: loadTextFont }

/**
 * Texels per world unit the dolly needs: the wall's projected CSS px per world
 * at the reading distance times the renderer's ratio, applied once here and
 * never again, then ceilinged.
 */
export function friezeDensity(frieze: FriezeExtent, g: SceneGeometry, dpr: number): number {
  const frame = friezeFrame(frieze, g)
  const cssPerWorld = (g.heightPx * friezeHeightFill(frieze, g)) / frame.height
  return Math.min(FRIEZE_DENSITY_CEILING, cssPerWorld * dpr)
}

/** The mask a panel of `columns` × `rows` cells needs at `density`, capped. */
export function maskSize(
  columns: number,
  rows: number,
  density: number,
  cap = FRIEZE_MASK_MAX_PX,
): MaskSize {
  const neededWidth = columns * FRIEZE_CELL_W * density
  const neededHeight = rows * FRIEZE_CELL_H * density
  const scale = Math.min(1, cap / neededWidth, cap / neededHeight)
  return {
    widthPx: Math.min(cap, Math.round(neededWidth * scale)),
    heightPx: Math.min(cap, Math.round(neededHeight * scale)),
    texelsPerWorld: density * scale,
    scale,
  }
}

/**
 * Column-aligned panels for one block: one when its mask fits the cap, else
 * `ceil(needed / cap)` near-equal whole-column runs whose boundaries never
 * pass through a 2×2 span. A boundary that would is moved to the nearest
 * clear column; a block with no clear interior column is refused rather than
 * drawn wrong.
 */
export function panelsFor(
  block: FriezeBlockExtent & { index: number },
  cells: readonly Cell[],
  density: number,
  cap = FRIEZE_MASK_MAX_PX,
): FriezePanel[] {
  const neededWidth = block.columns * FRIEZE_CELL_W * density
  const count = Math.max(1, Math.ceil(neededWidth / cap))
  if (count === 1) {
    return [{ block: block.index, panel: 0, startCol: block.startCol, columns: block.columns }]
  }
  // A boundary at relative column b is bridged by a span whose left column is b − 1.
  const bridged = new Set<number>()
  for (const cell of cells) {
    if (cell.block === block.index && cell.span === 2) bridged.add(cell.col - block.startCol + 1)
  }
  const boundaries: number[] = []
  let previous = 0
  for (let k = 1; k < count; k++) {
    const ideal = Math.round((k * block.columns) / count)
    let chosen = -1
    for (let shift = 0; shift < block.columns && chosen < 0; shift++) {
      for (const candidate of shift === 0 ? [ideal] : [ideal - shift, ideal + shift]) {
        if (candidate > previous && candidate < block.columns && !bridged.has(candidate)) {
          chosen = candidate
          break
        }
      }
    }
    if (chosen < 0) {
      throw new Error(
        `frieze block ${block.year}: no column boundary clear of a 2×2 span for panel ${k}`,
      )
    }
    boundaries.push(chosen)
    previous = chosen
  }
  const edges = [0, ...boundaries, block.columns]
  return edges.slice(0, -1).map((start, panel) => ({
    block: block.index,
    panel,
    startCol: block.startCol + start,
    columns: edges[panel + 1] - start,
  }))
}

/** Where a piece of text is drawn, in panel texels. */
interface DrawUnit {
  kind: 'cell' | 'count'
  x: number
  y: number
  width: number
  height: number
  text: { title: string; meta: string; serial: string }
  /** The cell carrying the year count yields its first line to it. */
  belowCount: boolean
}

interface PanelPlan {
  panel: FriezePanel
  size: MaskSize
  units: DrawUnit[]
}

function planPanels(recipe: FriezeRasterRecipe): PanelPlan[] {
  const { layout, rows, items, lang, density } = recipe
  const byId = new Map(items.map((item) => [item.id, item]))
  const plans: PanelPlan[] = []
  layout.blocks.forEach((block, index) => {
    const panels = panelsFor({ ...block, index }, layout.cells, density)
    for (const panel of panels) {
      const size = maskSize(panel.columns, rows, density)
      const t = size.texelsPerWorld
      const units: DrawUnit[] = []
      // One rule, two readers: `cellAtUv` makes the same band noninteractive.
      const counted = countCell(layout, index)
      const holdsCount =
        counted !== null &&
        counted.col >= panel.startCol &&
        counted.col < panel.startCol + panel.columns
      if (holdsCount) {
        units.push({
          kind: 'count',
          x: (counted.col - panel.startCol) * FRIEZE_CELL_W * t,
          y: counted.row * FRIEZE_CELL_H * t,
          width: FRIEZE_CELL_W * t,
          height: YEAR_COUNT_BAND_WORLD * t + 2 * CELL_INSET_WORLD * t,
          text: { title: '', meta: String(block.count), serial: '' },
          belowCount: false,
        })
      }
      for (const cell of layout.cells) {
        if (cell.block !== index) continue
        if (cell.col < panel.startCol || cell.col >= panel.startCol + panel.columns) continue
        // A Project's card object fills its 2×2 exactly (Q9) and draws its own
        // title, origin and serial, so anything the mask drew here would be
        // invisible ink behind it (third amendment).
        if (cell.span === 2) continue
        const item = byId.get(cell.itemId)
        if (!item) throw new Error(`frieze cell ${cell.itemId} has no archive item`)
        units.push({
          kind: 'cell',
          x: (cell.col - panel.startCol) * FRIEZE_CELL_W * t,
          y: cell.row * FRIEZE_CELL_H * t,
          width: cell.span * FRIEZE_CELL_W * t,
          height: cell.span * FRIEZE_CELL_H * t,
          text: cellText(item, lang),
          belowCount: cell === counted,
        })
      }
      plans.push({ panel, size, units })
    }
  })
  return plans
}

const font = (weight: number, px: number): string => `${weight} ${px}px ${TEXT_FAMILY}`

/** Draws one unit's roles into the scratch canvas at texel scale `t`. */
function drawUnit(ctx: CanvasRenderingContext2D, unit: DrawUnit, t: number): void {
  const inset = CELL_INSET_WORLD * t
  const titlePx = CELL_TITLE_WORLD * t
  const metaPx = CELL_META_WORLD * t
  const titleBox = titlePx * CELL_LINE_HEIGHT
  const metaBox = metaPx * CELL_LINE_HEIGHT
  const maxWidth = unit.width - 2 * inset
  const left = unit.x + inset
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  ctx.font = font(CELL_META_WEIGHT, metaPx)
  const measureMeta = (text: string): number => ctx.measureText(text).width
  const advance = digitAdvance(measureMeta)

  const drawDigits = (serial: string, x: number, y: number): void => {
    ctx.font = font(CELL_META_WEIGHT, metaPx)
    ctx.fillStyle = META_FILL
    let cursor = x
    for (const digit of serial) {
      ctx.fillText(digit, cursor, y)
      cursor += advance
    }
  }

  if (unit.kind === 'count') {
    ctx.fillStyle = META_FILL
    ctx.fillText(fitMeta(measureMeta, unit.text.meta, maxWidth), left, unit.y + inset + metaBox / 2)
    return
  }

  let top = unit.y + inset + (unit.belowCount ? YEAR_COUNT_BAND_WORLD * t : 0)
  ctx.font = font(CELL_TITLE_WEIGHT, titlePx)
  ctx.fillStyle = TITLE_FILL
  const lines = wrapTitle((text) => ctx.measureText(text).width, unit.text.title, maxWidth)
  for (const line of lines) {
    ctx.fillText(line, left, top + titleBox / 2)
    top += titleBox
  }
  if (unit.text.meta) {
    ctx.font = font(CELL_META_WEIGHT, metaPx)
    ctx.fillStyle = META_FILL
    ctx.fillText(fitMeta(measureMeta, unit.text.meta, maxWidth), left, top + metaBox / 2)
    top += metaBox
  }
  drawDigits(unit.text.serial, left, top + metaBox / 2)
}

/** Packs the scratch canvas's R and G into a two-channel texture. */
function packPanel(
  ctx: CanvasRenderingContext2D,
  plan: PanelPlan,
  recipe: FriezeRasterRecipe,
): FriezeTexture {
  const { widthPx, heightPx } = plan.size
  const { data } = ctx.getImageData(0, 0, widthPx, heightPx)
  const packed = new Uint8Array(widthPx * heightPx * 2)
  let overlapTexels = 0
  for (let i = 0, o = 0; o < packed.length; i += 4, o += 2) {
    const r = data[i]
    const g = data[i + 1]
    packed[o] = r
    packed[o + 1] = g
    if (r > 0 && g > 0) overlapTexels++
  }
  const texture = new THREE.DataTexture(packed, widthPx, heightPx, THREE.RGFormat, THREE.UnsignedByteType)
  texture.colorSpace = THREE.NoColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.unpackAlignment = 1
  // Row 0 is the canvas top, so v = 0 is the wall's top edge: the same
  // top-left frame the cells are laid out in. Task 5's UV lookup relies on it.
  texture.flipY = false
  texture.needsUpdate = true
  return {
    texture,
    panel: plan.panel,
    widthPx,
    heightPx,
    texelsPerWorld: plan.size.texelsPerWorld,
    bytes: packed.byteLength,
    overlapTexels,
    recipe,
  }
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for the frieze')
  return ctx
}

/** A 0×0 canvas holds no backing store. */
function releaseCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

export function rasteriseFrieze(request: FriezeRasterRequest): FriezeRasterJob {
  const { permit, scheduler = defaultScheduler, onProgress, ...recipe } = request
  const masks: FriezeTexture[] = []
  let scratch: HTMLCanvasElement | null = null
  let settled = false
  let cancelled = false
  let cancelIdle: (() => void) | null = null
  let rejectJob: (reason: unknown) => void = () => {}

  /** Everything this job made goes; the caller never sees a partial result. */
  const abandon = (): void => {
    disposeFriezeTextures(masks)
    masks.length = 0
    releaseCanvas(scratch)
    scratch = null
  }

  const promise = new Promise<FriezeTexture[]>((resolve, reject) => {
    rejectJob = reject
    const fail = (error: unknown): void => {
      if (settled) return
      settled = true
      abandon()
      reject(error)
    }
    const run = async (): Promise<void> => {
      await permit
      await scheduler.fontReady()
      if (cancelled) return
      const plans = planPanels(recipe)
      const total = plans.reduce((sum, plan) => sum + plan.units.length, 0)
      let drawn = 0
      const canvas = document.createElement('canvas')
      scratch = canvas
      const ctx = context2d(canvas)

      let planIndex = 0
      let unitIndex = 0
      const beginPanel = (plan: PanelPlan): void => {
        canvas.width = plan.size.widthPx
        canvas.height = plan.size.heightPx
        // Resizing resets the 2D state; the ground is opaque black so the
        // antialiased channel values read as coverage.
        ctx.fillStyle = GROUND_FILL
        ctx.fillRect(0, 0, plan.size.widthPx, plan.size.heightPx)
      }

      const slice = (): void => {
        cancelIdle = null
        if (cancelled) return
        try {
          const plan = plans[planIndex]
          if (unitIndex === 0) beginPanel(plan)
          const end = Math.min(plan.units.length, unitIndex + FRIEZE_RASTER_SLICE)
          for (; unitIndex < end; unitIndex++) {
            drawUnit(ctx, plan.units[unitIndex], plan.size.texelsPerWorld)
            drawn++
          }
          if (unitIndex >= plan.units.length) {
            masks.push(packPanel(ctx, plan, recipe))
            planIndex++
            unitIndex = 0
          }
          onProgress?.(drawn, total)
          if (planIndex >= plans.length) {
            releaseCanvas(canvas)
            scratch = null
            settled = true
            resolve(masks)
            return
          }
          cancelIdle = scheduler.idle(slice, IDLE_TIMEOUT_MS)
        } catch (error) {
          fail(error)
        }
      }
      cancelIdle = scheduler.idle(slice, IDLE_TIMEOUT_MS)
    }
    run().catch(fail)
  })

  return {
    promise,
    cancel(): void {
      if (cancelled || settled) return
      cancelled = true
      settled = true
      cancelIdle?.()
      cancelIdle = null
      abandon()
      rejectJob(new FriezeRasterCancelled())
    },
    created: () => masks.length,
  }
}

/**
 * One generation of the wall's masks, from permission to disposal.
 *
 * Two things pull on a generation from opposite ends. The warm-up must not
 * flag the canvas warm before the masks are uploaded, and a resize or a
 * language switch must be able to supersede a generation that is still drawing
 * without handing the renderer a texture the next one is about to replace.
 *
 * So `settled` NEVER rejects. A failed raster settles as `failed` and the wall
 * stays cream: a rasterisation failure must not reach the WebGL-unavailable
 * path, which would end act one for the whole session over a surface the
 * reader has not even scrolled to.
 */
export interface FriezeGeneration {
  /** Resolves when this generation has finished, failed or been disposed. */
  settled: Promise<void>
  /** The drawn masks, or null while pending, after a failure, or once disposed. */
  masks(): readonly FriezeTexture[] | null
  status(): 'pending' | 'ready' | 'failed'
  /** Lets the raster start. Nothing is drawn before it is called. */
  permit(): void
  /** Cancels the raster and disposes everything this generation owns. */
  dispose(): void
}

export function friezeGeneration(
  recipe: FriezeRasterRecipe,
  scheduler?: RasterScheduler,
  /**
   * True for a generation made after the warm-up has already granted
   * permission: a language switch or a settled resize. Permission is a
   * one-time event, so a later generation that waited for it would wait
   * for ever.
   */
  permitted = false,
): FriezeGeneration {
  let allow: () => void = () => {}
  const permission = new Promise<void>((resolve) => {
    allow = resolve
  })
  if (permitted) allow()
  let drawn: FriezeTexture[] | null = null
  let state: 'pending' | 'ready' | 'failed' = 'pending'
  let disposed = false

  const job = rasteriseFrieze({ ...recipe, permit: permission, scheduler })
  const settled = job.promise.then(
    (masks) => {
      // Superseded between the last slice and here: this generation owns these
      // textures and nothing else will ever dispose them.
      if (disposed) {
        disposeFriezeTextures(masks)
        return
      }
      drawn = masks
      state = 'ready'
    },
    () => {
      // Cancellation and a real draw failure arrive the same way; the job has
      // already disposed whatever it made in both cases.
      if (!disposed) state = 'failed'
    },
  )

  return {
    settled,
    masks: () => drawn,
    status: () => state,
    permit: () => allow(),
    dispose(): void {
      disposed = true
      job.cancel()
      // Nulling `drawn` is what makes a second call a no-op, so disposal is
      // idempotent without a flag to guard it.
      if (drawn) disposeFriezeTextures(drawn)
      drawn = null
      // `cancel` already settles the job, but the raster is still parked on
      // `await permit`; releasing it lets that closure reach its own
      // cancellation check and go, rather than being held for the page's life.
      allow()
    },
  }
}

export function disposeFriezeTextures(masks: readonly FriezeTexture[]): void {
  for (const mask of masks) mask.texture.dispose()
}
