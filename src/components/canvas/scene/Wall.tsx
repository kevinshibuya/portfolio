import { Suspense, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { ArchiveItem } from '../../../types/content'
import type { FriezeExtent, FriezeLayout } from '../../../utils/friezeLayout'
import { friezeFrame, sceneGeometry } from '../../../utils/sceneMotion'
import { Frieze } from './Frieze'
import { friezeDensity, friezeGeneration, type FriezeGeneration } from './friezeTexture'
import { RESIZE_DEBOUNCE_MS } from './textTexture'
import type { SceneRefs } from './sceneRefs'

interface WallProps {
  /** The archive in its own order; an item's index picks its hover tint. */
  items: readonly ArchiveItem[]
  /** The packing every consumer shares — renderer, hit test and wrapper alike. */
  layout: FriezeLayout
  extent: FriezeExtent
  lang: 'en' | 'pt'
  sceneRefs: SceneRefs
  onCellClick: (itemId: string) => void
  onCellHover: (itemId: string | null) => void
}

/**
 * The wall's host: everything about a mask GENERATION rather than about the
 * wall itself — when one may start, which one is on screen, and when the one it
 * replaced may be disposed.
 *
 * Three rules shape it.
 *
 * The warm-up owns the start. Nothing rasterises until `prepare` is called,
 * because drawing 171 cells during the loader's exit is exactly the jank the
 * warm-up exists to avoid, just moved earlier. `prepare` resolves when the
 * generation settles either way, so a failed raster can never leave the canvas
 * un-warm.
 *
 * A generation is swapped, never blanked. A resize commits a new density, and
 * the wall keeps drawing the old masks until the new ones exist — so the reader
 * never sees the wall flash cream on the way past.
 *
 * And the one it replaced is disposed only after the replacement has rendered:
 * the `[shown]` effect's cleanup runs after commit, so no frame is ever drawn
 * from a texture that has already been let go.
 */
export function Wall({
  items,
  layout,
  extent,
  lang,
  sceneRefs,
  onCellClick,
  onCellHover,
}: WallProps) {
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const invalidate = useThree((state) => state.invalidate)

  const g = useMemo(
    () => sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1)),
    [size.width, size.height],
  )
  // The wall's placement accessor, never a second transform of our own.
  const frame = useMemo(() => friezeFrame(extent, g), [extent, g])

  // Placement follows the window immediately; the RASTER waits for it to
  // settle, because a redraw is 171 cells of text and a drag is many resizes.
  const target = friezeDensity(extent, g, dpr)
  const [density, setDensity] = useState(target)
  useEffect(() => {
    if (density === target) return
    const timer = window.setTimeout(() => setDensity(target), RESIZE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [target, density])

  // The generation on screen. Its own cleanup disposes it, which React runs
  // after the replacement has been committed.
  const [shown, setShown] = useState<FriezeGeneration | null>(null)
  const shownRef = useRef<FriezeGeneration | null>(null)
  useEffect(() => () => shown?.dispose(), [shown])

  // Permission is granted once, by the warm-up. A generation made after that
  // (a language switch, a settled resize) is born permitted, or it would park
  // on a promise nobody will ever resolve and the wall would keep the old text.
  const permitted = useRef(false)

  useEffect(() => {
    const generation = friezeGeneration(
      { layout, rows: extent.rows, items, lang, density },
      undefined,
      permitted.current,
    )
    let superseded = false

    // Registered for the warm-up, which awaits it before flagging the canvas.
    sceneRefs.frieze.prepare = async () => {
      permitted.current = true
      generation.permit()
      await generation.settled
      const masks = generation.masks()
      sceneRefs.frieze.textures = masks ? masks.map((mask) => mask.texture) : []
    }

    void generation.settled.then(() => {
      if (superseded) {
        generation.dispose()
        return
      }
      shownRef.current = generation
      // A transition, so the nine covers loading below do not swap the wall
      // out for its fallback: React keeps the cream wall on screen until the
      // new generation can be committed whole.
      startTransition(() => setShown(generation))
      invalidate() // reduced motion renders on demand; new masks need a frame
    })

    return () => {
      superseded = true
      sceneRefs.frieze.prepare = null
      // One that reached the screen belongs to the `[shown]` effect now; one
      // that never did has no other owner.
      if (shownRef.current !== generation) generation.dispose()
    }
  }, [layout, extent.rows, items, lang, density, sceneRefs, invalidate])

  // `pending` until a generation settles, then `ready` or `failed`. A failed
  // raster is a cream wall, never the permanent WebGL-unavailable path.
  const status = shown ? shown.status() : 'pending'
  useEffect(() => {
    gl.domElement.dataset.frieze = status
  }, [gl, status])

  // Act one must not take the pointer through the wall standing behind it. The
  // rig reports the crossing; this is a boolean per pass, not per frame.
  const [active, setActive] = useState(false)
  useEffect(() => {
    sceneRefs.frieze.onActive = setActive
    return () => {
      sceneRefs.frieze.onActive = null
    }
  }, [sceneRefs])

  // The wall's OWN boundary. Its card objects load nine covers, which resolve
  // after the scene is live. Suspending the scene's shared boundary then would
  // tear down Corridor and Environment and re-register the corridor, which
  // `data-registrations` forbids (ADR 0011).
  // Everything above this line lives outside it, so a suspension can never
  // destroy the generation the warm-up is waiting on.
  return (
    <Suspense fallback={null}>
      <Frieze
        items={items}
        layout={layout}
        extent={extent}
        frame={frame}
        masks={shown?.masks() ?? null}
        active={active}
        texelsPerWorld={density}
        lang={lang}
        onCellClick={onCellClick}
        onCellHover={onCellHover}
      />
    </Suspense>
  )
}
