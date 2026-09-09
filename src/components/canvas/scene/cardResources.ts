import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import type { Mockups } from '../../../types/content'
import { CARD_W, CARD_H } from '../../../utils/sceneMotion'
import { CARD_RADIUS, COVER_H, COVER_RADIUS, COVER_W } from './cardAnatomy'
import { roundedRectGeometry } from './roundedRect'

/**
 * The sole owner of everything two card consumers share: the cover textures and
 * the two card geometries (Q11).
 *
 * The corridor and the act-two wall both mount card objects, and the featured
 * projects appear in both, so a cover can have two consumers at once. Neither
 * of them may dispose it — a consumer that unmounts would blank the survivor's
 * card. Every shared subtree therefore sets `dispose={null}` so R3F's automatic
 * disposal never reaches these either, and this module disposes on the LAST
 * release alone.
 *
 * The final release is deferred one tick and cancelled by a new acquisition.
 * StrictMode's development double-invoke mounts, unmounts and mounts again in
 * that gap, and disposing in between would hand the remount a dead texture out
 * of `useLoader`'s own cache — which is why the entry is cleared there too, and
 * only after the texture is really finished with.
 */

/** What a card's cover is drawn from, best first (Q10). No new assets. */
export function coverUrlFor(mockups: Mockups | undefined): string | null {
  if (!mockups) return null
  return mockups.stackCover || mockups.desktopBento || mockups.desktop || null
}

interface Entry<T> {
  value: T
  count: number
  /** A pending final release, cancelled if the entry is acquired again. */
  pending: number | undefined
}

/** Decrements, and schedules `finalise` for the tick after the last release. */
function release<K, T>(entries: Map<K, Entry<T>>, key: K, finalise: (entry: Entry<T>) => void): void {
  const entry = entries.get(key)
  if (!entry) return
  entry.count = Math.max(0, entry.count - 1)
  // At most one release is ever in flight: a second one must not schedule a
  // second timer, or an unbalanced release would dispose the entry twice.
  // Cancelling is `acquire`'s job, which is why nothing is re-checked below.
  if (entry.count > 0 || entry.pending !== undefined) return
  entry.pending = window.setTimeout(() => {
    entries.delete(key)
    finalise(entry)
  }, 0)
}

/** Increments, and cancels any release still waiting out its tick. */
function acquire<T>(entry: Entry<T>): T {
  if (entry.pending !== undefined) {
    window.clearTimeout(entry.pending)
    entry.pending = undefined
  }
  entry.count += 1
  return entry.value
}

const covers = new Map<string, Entry<THREE.Texture>>()

/**
 * Registers one consumer of `url`'s cover and returns the canonical texture.
 * `texture` is what `useLoader` handed the caller; the first one in wins, so
 * every consumer of a url draws the same instance.
 */
export function acquireCover(url: string, texture: THREE.Texture): THREE.Texture {
  const existing = covers.get(url)
  if (existing) return acquire(existing)
  const entry: Entry<THREE.Texture> = { value: texture, count: 1, pending: undefined }
  covers.set(url, entry)
  return texture
}

/** Drops one consumer of `url`. The last one out disposes, a tick later. */
export function releaseCover(url: string): void {
  release(covers, url, (entry) => {
    entry.value.dispose()
    useLoader.clear(THREE.TextureLoader, url)
  })
}

export type CardGeometryKind = 'frame' | 'cover'

const GEOMETRY_BUILDERS: Record<CardGeometryKind, () => THREE.BufferGeometry> = {
  frame: () => roundedRectGeometry(CARD_W, CARD_H, CARD_RADIUS),
  cover: () => roundedRectGeometry(COVER_W, COVER_H, COVER_RADIUS),
}

const geometries = new Map<CardGeometryKind, Entry<THREE.BufferGeometry>>()

/** Registers one consumer of a card geometry and returns the shared instance. */
export function acquireCardGeometry(kind: CardGeometryKind): THREE.BufferGeometry {
  const existing = geometries.get(kind)
  if (existing) return acquire(existing)
  const entry: Entry<THREE.BufferGeometry> = {
    value: GEOMETRY_BUILDERS[kind](),
    count: 1,
    pending: undefined,
  }
  geometries.set(kind, entry)
  return entry.value
}

/**
 * The shared instance for `kind` WITHOUT taking a reference on it.
 *
 * A card needs its geometry while it renders, but only an effect can pair an
 * acquire with a release: counting here would add a reference on every
 * re-render — a language switch alone re-renders the corridor — and the
 * geometry would never reach its last release. Any release still waiting out
 * its tick is cancelled instead, so what render hands a mesh cannot be disposed
 * before that mesh's effect acquires it.
 */
export function cardGeometry(kind: CardGeometryKind): THREE.BufferGeometry {
  const existing = geometries.get(kind)
  if (existing) {
    if (existing.pending !== undefined) {
      window.clearTimeout(existing.pending)
      existing.pending = undefined
    }
    return existing.value
  }
  const entry: Entry<THREE.BufferGeometry> = {
    value: GEOMETRY_BUILDERS[kind](),
    count: 0,
    pending: undefined,
  }
  geometries.set(kind, entry)
  return entry.value
}

/** Drops one consumer of a card geometry; the last one out disposes it. */
export function releaseCardGeometry(kind: CardGeometryKind): void {
  release(geometries, kind, (entry) => entry.value.dispose())
}
