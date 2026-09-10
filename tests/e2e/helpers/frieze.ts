import { FRIEZE_CELL_W, FRIEZE_CELL_H, type FriezeExtent } from '../../../src/utils/friezeLayout'
import { FOV_DEG, friezeFrame, type SceneGeometry } from '../../../src/utils/sceneMotion'

/**
 * Where a frieze cell lands in the frame.
 *
 * PURE geometry: nothing here imports Playwright, so `tests/unit` can hold the
 * three.js oracle test that pins the rotation order (see below). The spec files
 * own the browser half — reading the live pose, measuring the canvas, clicking.
 *
 * `testDir` is `tests/e2e` with the default `*.spec.ts` match, so this file is
 * not collected as a suite.
 */

const DEG = Math.PI / 180
/** `sceneMotion` keeps its own copy private; FOV_DEG is the shared source. */
const HALF_FOV_TAN = Math.tan((FOV_DEG * DEG) / 2)

/** An act-two camera. `yaw` is absent in act one, where it is always 0. */
export interface YawedPose {
  x: number
  y: number
  z: number
  pitch: number
  yaw?: number
}

export interface Projected {
  fx: number
  fy: number
  ahead: number
}

/**
 * World point → frame fractions, for a camera that yaws AND pitches.
 *
 * The camera is `camera.rotation.order = 'YXZ'` with `rotation.set(pitch, yaw, 0)`,
 * so local-to-world is `Ry(yaw)·Rx(pitch)` and world-to-camera is its inverse,
 * `Rx(-pitch)·Ry(-yaw)`: YAW COMES OFF FIRST. Yaw is about the world Y axis and
 * can be removed while still in world axes; pitch is about the camera's own,
 * already-yawed X axis, so it is only removable once the yaw is gone. Undoing
 * pitch first would rotate about world X, which is not the axis the camera
 * pitched around unless yaw is 0.
 *
 * At yaw = 0 this reduces EXACTLY to `sceneMotion.projectPoint`, character for
 * character — `xr` becomes `dx` and `dr` becomes `d`. It is a generalisation,
 * not a second opinion.
 *
 * Act two never holds both angles at once (yaw only on APPROACH, pitch only on
 * RELEASE), so no test driving the real scene can tell this order from the
 * wrong one. `tests/unit/friezeProjection.test.ts` pins it against three.js at
 * a pose the scene never adopts; that is the only thing standing between this
 * file and a helper that silently clicks background the day a beat combines
 * the two.
 *
 * `g.aspect` must come from the CANVAS, not the window: `sceneGeometry` is
 * built from R3F's `size`, and on any viewport where the canvas is not
 * full-window the two differ and every x lands short.
 */
export function projectPointYawed(
  x: number,
  y: number,
  z: number,
  cam: YawedPose,
  g: Pick<SceneGeometry, 'aspect'>,
): Projected {
  const dx = x - cam.x
  const h = y - cam.y
  const d = cam.z - z

  const yaw = cam.yaw ?? 0
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const xr = dx * cy + d * sy
  const dr = d * cy - dx * sy

  const phi = -cam.pitch
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const f = dr * cos - h * sin
  const u = h * cos + dr * sin

  const ndcY = u / (f * HALF_FOV_TAN)
  const ndcX = xr / (f * HALF_FOV_TAN * g.aspect)
  return { fx: 0.5 + 0.5 * ndcX, fy: 0.5 - 0.5 * ndcY, ahead: f }
}

/** The footprint a cell occupies on the wall, in cells. */
export interface CellSpan {
  col: number
  row: number
  span: number
}

export interface WorldPoint {
  x: number
  y: number
  z: number
}

/**
 * A cell's centre in world space.
 *
 * Mirrors `Frieze.tsx`, which parents the wall at `[frame.left, frame.top,
 * frame.z]` and places a card at `[(col + 1)·W, -(row + 1)·H]` — a 2x2 card, so
 * the general form is `col + span/2` across and `row + span/2` DOWN. Row 0 is
 * the TOP row, which is also why `cellAtUv` reads `y = 1 - v`.
 */
export function cellCentreWorld(
  cell: CellSpan,
  extent: FriezeExtent,
  g: SceneGeometry,
): WorldPoint {
  const frame = friezeFrame(extent, g)
  return {
    x: frame.left + (cell.col + cell.span / 2) * FRIEZE_CELL_W,
    y: frame.top - (cell.row + cell.span / 2) * FRIEZE_CELL_H,
    z: frame.z,
  }
}

export interface CellTarget extends Projected {
  /** The cell's projected footprint, as a fraction of the frame. */
  widthFrac: number
  heightFrac: number
  /** False when any corner leaves the frame, or the cell sits behind the lens. */
  inFrame: boolean
}

/**
 * Where to click for `cell`, with the guards that stop a test passing on
 * background.
 *
 * A point BEHIND the lens still projects to a finite, plausible-looking (fx, fy)
 * — mirrored — so `ahead` is checked, not assumed. The footprint is returned
 * because a cell can project to two or three pixels at the volume shot, where a
 * click "hits" by luck and flakes forever after.
 */
export function projectCell(
  cell: CellSpan,
  extent: FriezeExtent,
  g: SceneGeometry,
  cam: YawedPose,
): CellTarget {
  const c = cellCentreWorld(cell, extent, g)
  const halfW = (cell.span * FRIEZE_CELL_W) / 2
  const halfH = (cell.span * FRIEZE_CELL_H) / 2

  const centre = projectPointYawed(c.x, c.y, c.z, cam, g)
  const corners = [
    projectPointYawed(c.x - halfW, c.y + halfH, c.z, cam, g),
    projectPointYawed(c.x + halfW, c.y + halfH, c.z, cam, g),
    projectPointYawed(c.x - halfW, c.y - halfH, c.z, cam, g),
    projectPointYawed(c.x + halfW, c.y - halfH, c.z, cam, g),
  ]

  const xs = corners.map((p) => p.fx)
  const ys = corners.map((p) => p.fy)
  const inFrame =
    centre.ahead > 0 &&
    corners.every((p) => p.ahead > 0) &&
    Math.min(...xs) >= 0 &&
    Math.max(...xs) <= 1 &&
    Math.min(...ys) >= 0 &&
    Math.max(...ys) <= 1

  return {
    ...centre,
    widthFrac: Math.max(...xs) - Math.min(...xs),
    heightFrac: Math.max(...ys) - Math.min(...ys),
    inFrame,
  }
}

/** A canvas's position and size in CSS pixels, as `boundingBox()` returns it. */
export interface CanvasBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CellPixel extends CellTarget {
  /** Viewport coordinates, ready for `page.mouse`. */
  px: number
  py: number
}

/**
 * A cell's click point in viewport pixels.
 *
 * The geometry MUST be built from `box` — `sceneGeometry` is fed R3F's canvas
 * `size`, so a caller that reaches for `window.innerWidth` gets a different
 * aspect the moment the canvas is not full-window, and every x lands short
 * while nothing looks wrong.
 */
export function cellPixel(
  cell: CellSpan,
  extent: FriezeExtent,
  g: SceneGeometry,
  cam: YawedPose,
  box: CanvasBox,
): CellPixel {
  const target = projectCell(cell, extent, g, cam)
  return {
    ...target,
    px: box.x + target.fx * box.width,
    py: box.y + target.fy * box.height,
  }
}

export type WallSide = 'top' | 'bottom' | 'left' | 'right'

export interface EdgePoint {
  px: number
  py: number
  ahead: number
  /** The outward screen normal, so a caller brackets with `± eps` correctly. */
  outward: { dx: number; dy: number }
}

/**
 * A point ON the wall's outer edge, in viewport pixels, plus which way is off
 * the wall in screen space.
 *
 * This is the calibration probe. Hovering `eps` INSIDE must report a hit and
 * `eps` OUTSIDE must not; a systematic coordinate error larger than `eps`
 * therefore fails deterministically instead of waiting to surface as flake on
 * whichever viewport shrinks the cell pitch. It doubles as the settle check:
 * the edges only sit here when the rendered frame is at the `u` the pose was
 * built from, so a Lenis lag fails the same bracket.
 *
 * `alongFrac` slides the probe along the edge, 0 to 1, so a caller can pick a
 * spot that is comfortably in frame.
 */
export function wallEdgePoint(
  extent: FriezeExtent,
  g: SceneGeometry,
  cam: YawedPose,
  box: CanvasBox,
  side: WallSide,
  alongFrac: number,
): EdgePoint {
  const frame = friezeFrame(extent, g)
  const spanX = frame.left + alongFrac * frame.width
  const spanY = frame.bottom + alongFrac * frame.height

  const on =
    side === 'top'
      ? { x: spanX, y: frame.top }
      : side === 'bottom'
        ? { x: spanX, y: frame.bottom }
        : side === 'left'
          ? { x: frame.left, y: spanY }
          : { x: frame.right, y: spanY }

  // A second point a short step INWARD, projected too: the outward normal is
  // the screen direction away from it, which keeps the bracket honest under
  // any yaw instead of assuming the edge is axis-aligned on screen.
  const step = Math.min(FRIEZE_CELL_W, FRIEZE_CELL_H) / 4
  const inward =
    side === 'top'
      ? { x: on.x, y: on.y - step }
      : side === 'bottom'
        ? { x: on.x, y: on.y + step }
        : side === 'left'
          ? { x: on.x + step, y: on.y }
          : { x: on.x - step, y: on.y }

  const a = projectPointYawed(on.x, on.y, frame.z, cam, g)
  const b = projectPointYawed(inward.x, inward.y, frame.z, cam, g)
  const ax = box.x + a.fx * box.width
  const ay = box.y + a.fy * box.height
  const bx = box.x + b.fx * box.width
  const by = box.y + b.fy * box.height

  const len = Math.hypot(bx - ax, by - ay) || 1
  return {
    px: ax,
    py: ay,
    ahead: a.ahead,
    outward: { dx: -(bx - ax) / len, dy: -(by - ay) / len },
  }
}
