import { describe, it, expect } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { FOV_DEG } from '../../src/utils/sceneMotion'
import { projectPointYawed, type YawedPose } from '../e2e/helpers/frieze'

/**
 * The projection helper, pinned against three.js itself.
 *
 * Act two never holds yaw and pitch at the same instant (yaw only on APPROACH,
 * pitch only on RELEASE), so a helper that composed the two rotations in the
 * WRONG order would produce bit-identical output on every pose the scene ever
 * adopts. No e2e test can catch it. This file is the guard: it drives three's
 * own camera at a pose the scene never uses, where the two orders disagree.
 */

const ASPECT = 16 / 9
const G = { aspect: ASPECT }

/** three.js as the oracle: the same camera the scene builds, asked directly. */
function oracle(x: number, y: number, z: number, pose: YawedPose): { fx: number; fy: number } {
  const cam = new PerspectiveCamera(FOV_DEG, ASPECT, 0.1, 1000)
  cam.rotation.order = 'YXZ'
  cam.position.set(pose.x, pose.y, pose.z)
  cam.rotation.set(pose.pitch, pose.yaw ?? 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld(true)
  const v = new Vector3(x, y, z).project(cam)
  return { fx: 0.5 + 0.5 * v.x, fy: 0.5 - 0.5 * v.y }
}

/** The plausible-looking mistake: pitch undone before yaw. */
function wrongOrder(
  x: number,
  y: number,
  z: number,
  cam: YawedPose,
): { fx: number; fy: number } {
  const HALF_FOV_TAN = Math.tan(((FOV_DEG * Math.PI) / 180) / 2)
  const dx = x - cam.x
  const h = y - cam.y
  const d = cam.z - z
  const phi = -cam.pitch
  const f0 = d * Math.cos(phi) - h * Math.sin(phi)
  const u = h * Math.cos(phi) + d * Math.sin(phi)
  const yaw = cam.yaw ?? 0
  const xr = dx * Math.cos(yaw) + f0 * Math.sin(yaw)
  const dr = f0 * Math.cos(yaw) - dx * Math.sin(yaw)
  return {
    fx: 0.5 + 0.5 * (xr / (dr * HALF_FOV_TAN * ASPECT)),
    fy: 0.5 - 0.5 * (u / (dr * HALF_FOV_TAN)),
  }
}

const POINTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, -10],
  [1.3, 0.7, -12],
  [-2.1, 1.9, -8],
  [0.4, -0.6, -15],
]

const POSES: ReadonlyArray<readonly [string, YawedPose]> = [
  ['both zero', { x: 0, y: 0.5, z: 3, pitch: 0, yaw: 0 }],
  ['pitch only (RELEASE)', { x: 0, y: 0.9, z: 4, pitch: -0.21, yaw: 0 }],
  ['yaw only (APPROACH)', { x: 0.8, y: 0.6, z: 5, pitch: 0, yaw: 0.34 }],
  ['both non-zero (never in the scene)', { x: -0.7, y: 1.1, z: 6, pitch: -0.4, yaw: 0.6 }],
]

describe('projectPointYawed', () => {
  for (const [name, pose] of POSES) {
    it(`matches three.js at ${name}`, () => {
      for (const [x, y, z] of POINTS) {
        const mine = projectPointYawed(x, y, z, pose, G)
        const theirs = oracle(x, y, z, pose)
        expect(mine.fx).toBeCloseTo(theirs.fx, 9)
        expect(mine.fy).toBeCloseTo(theirs.fy, 9)
        expect(mine.ahead).toBeGreaterThan(0)
      }
    })
  }

  it('yaw defaults to 0, so act-one poses need no fixture change', () => {
    const withOut: YawedPose = { x: 0, y: 0.9, z: 4, pitch: -0.21 }
    const withZero: YawedPose = { ...withOut, yaw: 0 }
    expect(projectPointYawed(1.3, 0.7, -12, withOut, G)).toEqual(
      projectPointYawed(1.3, 0.7, -12, withZero, G),
    )
  })

  // The reason this file exists. If these two ever agree at a combined pose,
  // the oracle tests above have stopped proving anything.
  it('the wrong composition order is INDISTINGUISHABLE on every pose act two adopts', () => {
    for (const [, pose] of POSES.filter(([n]) => n !== 'both non-zero (never in the scene)')) {
      for (const [x, y, z] of POINTS) {
        const mine = projectPointYawed(x, y, z, pose, G)
        const bad = wrongOrder(x, y, z, pose)
        expect(bad.fx).toBeCloseTo(mine.fx, 12)
        expect(bad.fy).toBeCloseTo(mine.fy, 12)
      }
    }
  })

  it('and DIVERGES once both angles are non-zero, which is what pins the order', () => {
    const pose = POSES[3][1]
    const mine = projectPointYawed(1.3, 0.7, -12, pose, G)
    const bad = wrongOrder(1.3, 0.7, -12, pose)
    const theirs = oracle(1.3, 0.7, -12, pose)
    expect(mine.fx).toBeCloseTo(theirs.fx, 9)
    expect(Math.abs(bad.fx - theirs.fx)).toBeGreaterThan(1e-3)
  })
})
