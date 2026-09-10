import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import { CARD_W, CARD_H } from '../../src/utils/sceneMotion'
import { COVER_H, COVER_W } from '../../src/components/canvas/scene/cardAnatomy'
import type { Mockups } from '../../src/types/content'
import {
  acquireCardGeometry,
  acquireCover,
  cardGeometry,
  coverUrlFor,
  releaseCardGeometry,
  releaseCover,
} from '../../src/components/canvas/scene/cardResources'

/** Counts `dispose` events without a WebGL context; jsdom has none. */
function disposals(target: THREE.Texture | THREE.BufferGeometry): () => number {
  let count = 0
  target.addEventListener('dispose', () => {
    count += 1
  })
  return () => count
}

/** A distinct url per test, so the module-level cache never leaks across them. */
let seq = 0
const nextUrl = (): string => `/images/test/cover-${(seq += 1)}.webp`

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('acquireCover', () => {
  it('hands both consumers the one canonical texture for a url', () => {
    const url = nextUrl()
    const first = new THREE.Texture()
    const second = new THREE.Texture()
    expect(acquireCover(url, first)).toBe(first)
    // useLoader caches by url, so a second consumer arrives with the same
    // instance; the cache returns the canonical one either way.
    expect(acquireCover(url, second)).toBe(first)
    releaseCover(url)
    releaseCover(url)
    vi.runOnlyPendingTimers()
  })

  it('keeps separate counts per url', () => {
    const a = nextUrl()
    const b = nextUrl()
    const textureA = new THREE.Texture()
    const textureB = new THREE.Texture()
    const disposedA = disposals(textureA)
    acquireCover(a, textureA)
    acquireCover(b, textureB)
    releaseCover(b)
    vi.runOnlyPendingTimers()
    expect(disposedA()).toBe(0)
    releaseCover(a)
    vi.runOnlyPendingTimers()
    expect(disposedA()).toBe(1)
  })
})

describe('releaseCover', () => {
  it('leaves the survivor textured when one of two consumers unmounts', () => {
    const url = nextUrl()
    const texture = new THREE.Texture()
    const disposed = disposals(texture)
    acquireCover(url, texture)
    acquireCover(url, texture)

    releaseCover(url)
    vi.runOnlyPendingTimers()
    // The corridor let go; the wall is still drawing this cover.
    expect(disposed()).toBe(0)
    expect(acquireCover(url, texture)).toBe(texture)

    releaseCover(url)
    releaseCover(url)
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('defers the final release, and disposes exactly once when it lands', () => {
    const url = nextUrl()
    const texture = new THREE.Texture()
    const disposed = disposals(texture)
    const clear = vi.spyOn(useLoader, 'clear')
    acquireCover(url, texture)

    releaseCover(url)
    // Still alive in the same tick: a StrictMode remount happens in this gap.
    expect(disposed()).toBe(0)
    expect(clear).not.toHaveBeenCalled()

    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
    // Disposing alone would hand a remount a dead texture from useLoader's cache.
    expect(clear).toHaveBeenCalledWith(THREE.TextureLoader, url)

    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('cancels the pending release when StrictMode reacquires in the gap', () => {
    const url = nextUrl()
    const texture = new THREE.Texture()
    const disposed = disposals(texture)
    const clear = vi.spyOn(useLoader, 'clear')
    acquireCover(url, texture)

    releaseCover(url)
    expect(acquireCover(url, texture)).toBe(texture)
    vi.runOnlyPendingTimers()

    expect(disposed()).toBe(0)
    expect(clear).not.toHaveBeenCalled()

    releaseCover(url)
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('ignores a release with no matching acquire', () => {
    expect(() => releaseCover(nextUrl())).not.toThrow()
  })

  it('disposes once when a consumer releases twice', () => {
    const url = nextUrl()
    const texture = new THREE.Texture()
    const disposed = disposals(texture)
    acquireCover(url, texture)
    releaseCover(url)
    releaseCover(url)
    vi.runOnlyPendingTimers()
    // Two releases must not queue two finals: three disposes the texture again
    // and the second consumer's cache entry would already be gone.
    expect(disposed()).toBe(1)
  })

  it('does not let one consumer\'s stray release poison the next one', () => {
    const url = nextUrl()
    const texture = new THREE.Texture()
    const disposed = disposals(texture)
    acquireCover(url, texture)
    releaseCover(url)
    releaseCover(url)
    // Reacquired inside the deferral, so nothing was disposed and the count
    // must be back at one — not at minus one, which would make the NEXT
    // consumer's release dispose a cover the first one is still drawing.
    acquireCover(url, texture)
    acquireCover(url, texture)
    releaseCover(url)
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(0)

    releaseCover(url)
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })
})

describe('acquireCardGeometry', () => {
  it('shares one frame geometry and disposes it only after the last release', () => {
    const first = acquireCardGeometry('frame')
    const disposed = disposals(first)
    expect(acquireCardGeometry('frame')).toBe(first)
    // The card plane's own anatomy, not a unit quad.
    first.computeBoundingBox()
    const box = first.boundingBox!
    expect(box.max.x - box.min.x).toBeCloseTo(CARD_W, 5)
    expect(box.max.y - box.min.y).toBeCloseTo(CARD_H, 5)

    releaseCardGeometry('frame')
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(0)

    releaseCardGeometry('frame')
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('keeps the cover geometry separate from the frame', () => {
    const frame = acquireCardGeometry('frame')
    const cover = acquireCardGeometry('cover')
    expect(cover).not.toBe(frame)
    // The cover is the inset 16/9.5 crop, not another card plane.
    cover.computeBoundingBox()
    const box = cover.boundingBox!
    expect(box.max.x - box.min.x).toBeCloseTo(COVER_W, 5)
    expect(box.max.y - box.min.y).toBeCloseTo(COVER_H, 5)
    releaseCardGeometry('frame')
    releaseCardGeometry('cover')
    vi.runOnlyPendingTimers()
    // A released kind is rebuilt, never handed back disposed.
    const rebuilt = acquireCardGeometry('frame')
    expect(rebuilt).not.toBe(frame)
    releaseCardGeometry('frame')
    vi.runOnlyPendingTimers()
  })
})

describe('cardGeometry', () => {
  it('hands a renderer the shared instance without taking a reference', () => {
    const held = acquireCardGeometry('frame')
    const disposed = disposals(held)
    // A component reads the geometry on every render but can only pair an
    // acquire with a release in an effect: counting here would leak a
    // reference per render and the geometry would never be disposed.
    expect(cardGeometry('frame')).toBe(held)
    expect(cardGeometry('frame')).toBe(held)

    releaseCardGeometry('frame')
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('cancels a release still waiting out its tick, so render never gets a dead geometry', () => {
    const held = acquireCardGeometry('frame')
    const disposed = disposals(held)
    releaseCardGeometry('frame')

    // The next consumer renders inside the deferral; its effect has not run yet.
    expect(cardGeometry('frame')).toBe(held)
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(0)

    acquireCardGeometry('frame')
    releaseCardGeometry('frame')
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })

  it('builds the geometry when nothing holds one yet', () => {
    const built = cardGeometry('cover')
    const disposed = disposals(built)
    expect(acquireCardGeometry('cover')).toBe(built)
    releaseCardGeometry('cover')
    vi.runOnlyPendingTimers()
    expect(disposed()).toBe(1)
  })
})

describe('coverUrlFor', () => {
  const base: Mockups = {
    desktop: '/d.webp',
    desktopBento: '/db.webp',
    mobile: '/m.webp',
  }

  it('prefers the stack cover, then the bento, then the desktop mockup', () => {
    expect(coverUrlFor({ ...base, stackCover: '/sc.webp' })).toBe('/sc.webp')
    expect(coverUrlFor(base)).toBe('/db.webp')
    expect(coverUrlFor({ ...base, desktopBento: '' })).toBe('/d.webp')
  })

  it('returns null when a project has no usable mockup, so the frame stands alone', () => {
    expect(coverUrlFor({ ...base, desktopBento: '', desktop: '' })).toBeNull()
    expect(coverUrlFor(undefined)).toBeNull()
  })
})
