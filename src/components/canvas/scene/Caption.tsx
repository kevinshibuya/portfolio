import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CARD_W,
  CARD_MAX_PX,
  CAPTION_NAME_PX,
  sceneGeometry,
} from '../../../utils/sceneMotion'
import { accentDeepLargeFor } from '../../../utils/palette'
import {
  BAND_TOP_Y,
  BAND_BOTTOM_Y,
  CAPTION_Z,
  CAPTION_INSET_PX,
  CAPTION_INSET_WORLD,
  CAPTION_SUBTITLE_PX,
  CAPTION_LINE_GAP_PX,
  CAPTION_ARROW_PX,
  CAPTION_GAP_PX,
  WALL_ORDER,
} from './cardAnatomy'
import {
  drawTextTexture,
  drawTextBox,
  measureLine,
  captionScale,
  loadTextFont,
  arrowFamily,
  RESIZE_DEBOUNCE_MS,
  type TextTexture,
} from './textTexture'
import {
  wallCaptionRuns,
  WALL_CAPTION_LINE_HEIGHT,
  WALL_CAPTION_W,
  WALL_META_WORLD,
  WALL_TITLE_WORLD,
  type WallCaptionText,
} from './wallCaption'

const NAME_COLOR = '#0B0E14'
const SUBTITLE_COLOR = 'rgba(11,14,20,0.62)'
const ARROW = '↗'
const BAND_CENTRE_Y = (BAND_TOP_Y + BAND_BOTTOM_Y) / 2
/** Above the frame and cover (0), below the title (10). */
const CAPTION_ORDER = 1

/** What the caption hands its consumer; nothing here reaches into SceneRefs. */
export interface CaptionHandles {
  /** Both of the caption's materials — they fade with the card together. */
  materials: THREE.MeshBasicMaterial[]
  /** The title plane's material; act two's hover tints this one alone. */
  title: THREE.MeshBasicMaterial
  /** The arrow's slide group, or null where the caption has no arrow. */
  arrow: THREE.Object3D | null
}

/**
 * The wall's second row, plus the density it is drawn at (third amendment).
 * The title comes from `title`, the same prop act one's caption reads.
 */
export interface WallCaptionPresentation extends Omit<WallCaptionText, 'title'> {
  /** Texels per world unit — the wall's own, so card and cells match. */
  texelsPerWorld: number
}

interface CaptionProps {
  /** Picks the corridor arrow's accent; the wall's caption has no arrow. */
  index: number
  title: string
  /** Act one's second line. The wall builds its own second row instead. */
  subtitle?: string
  /** Called with the caption's handles at mount and with null at unmount. */
  onHandles?: (handles: CaptionHandles | null) => void
  /** Present: the wall's two-plane caption. Absent: act one's corridor one. */
  wall?: WallCaptionPresentation
  /** The wall title's rest ink; hover writes over it on the title material. */
  titleColor?: string
}

function captionMaterial(wall: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    // A wall caption draws in order over the frieze rather than testing
    // against it, exactly as the card's frame and cover do (Q9).
    depthTest: !wall,
    fog: true,
    toneMapped: false,
  })
}

/**
 * The caption ON the card (ADR 0011), in both places the card appears.
 *
 * Act one's corridor: the name and `year · tech · tech` on the left of the
 * white body band, the arrow on the right, each a textured plane inside the
 * card's group so it travels, yaws, breathes and fogs with it.
 *
 * Act two's wall: two stacked planes of the same size and no arrow (third
 * amendment) — the title as WHITE coverage the material tints, and a muted
 * plane carrying the origin, the serial and, on the one card that has to, its
 * block's year count. Sized from the same box, the two can never drift apart.
 *
 * Both meshes and materials mount synchronously and hand their consumer explicit
 * handles in a layout effect; the textures arrive when the async draw resolves
 * and are assigned imperatively, so the corridor's once-only registration never
 * sees a null and nothing here suspends. A wall card passes no `onHandles` and
 * so registers nothing at all.
 *
 * Sizing: the corridor draws at the card's projected width at the slot, in
 * device px, so at rest one texture px is one device px (no minification, no
 * magnification). The wall draws at the density its masks were rasterised at.
 * Both rebuild on a language switch and on a debounced resize.
 */
export function Caption({ index, title, subtitle = '', onHandles, wall, titleColor }: CaptionProps) {
  const gl = useThree((state) => state.gl)
  const dpr = useThree((state) => state.viewport.dpr)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  const isWall = wall !== undefined
  const titleRef = useRef<THREE.Mesh>(null)
  // The arrow in the corridor, the muted plane on the wall: one slot, because
  // a caption is always exactly two planes.
  const secondRef = useRef<THREE.Mesh>(null)
  const arrowSlideRef = useRef<THREE.Group>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const titleMaterial = useMemo(() => captionMaterial(isWall), [isWall])
  const secondMaterial = useMemo(() => captionMaterial(isWall), [isWall])

  useEffect(
    () => () => {
      geometry.dispose()
      for (const m of [titleMaterial, secondMaterial]) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [geometry, titleMaterial, secondMaterial],
  )

  useLayoutEffect(() => {
    onHandles?.({
      materials: [titleMaterial, secondMaterial],
      title: titleMaterial,
      arrow: arrowSlideRef.current,
    })
    return () => onHandles?.(null)
  }, [onHandles, titleMaterial, secondMaterial])

  // The rest ink, applied on its own: hover writes the same field every frame,
  // and this must not re-run and undo it on an unrelated re-render.
  useLayoutEffect(() => {
    if (titleColor) titleMaterial.color.set(titleColor)
  }, [titleColor, titleMaterial])

  // Text changes (a language switch) and the first draw are immediate; a
  // resize alone waits for the window to settle.
  const drawnKey = useRef('')
  const density = wall?.texelsPerWorld ?? 0
  const origin = wall?.origin ?? ''
  const serial = wall?.serial ?? ''
  const count = wall?.count ?? ''
  const textKey = `${title} ${subtitle} ${index} ${dpr} ${density} ${origin} ${serial} ${count}`

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const apply = (
      material: THREE.MeshBasicMaterial,
      mesh: THREE.Mesh | null,
      drawn: TextTexture,
      worldPerTexPx: number,
      anchorX: number,
      side: -1 | 1,
    ): void => {
      material.map?.dispose()
      material.map = drawn.texture
      material.needsUpdate = true
      if (!mesh) return
      const w = drawn.widthPx * worldPerTexPx
      const h = drawn.heightPx * worldPerTexPx
      mesh.scale.set(w, h, 1)
      mesh.position.set(anchorX + (side * w) / 2, BAND_CENTRE_Y, CAPTION_Z)
    }

    /** Act two: two planes cut from one box, so their rows line up by construction. */
    const drawWall = (anisotropy: number): void => {
      const box = {
        rowEmPx: [WALL_TITLE_WORLD * density, WALL_META_WORLD * density],
        widthPx: WALL_CAPTION_W * density,
        dpr: 1,
        lineHeight: WALL_CAPTION_LINE_HEIGHT,
        anisotropy,
      }
      const runs = wallCaptionRuns(
        { title, origin, serial, count: count || undefined },
        density,
        measureLine,
      )
      const tinted = drawTextBox({ ...box, runs: runs.title })
      const muted = drawTextBox({ ...box, runs: runs.muted })
      if (cancelled) {
        tinted.texture.dispose()
        muted.texture.dispose()
        return
      }
      const left = -CARD_W / 2 + CAPTION_INSET_WORLD
      apply(titleMaterial, titleRef.current, tinted, 1 / density, left, 1)
      apply(secondMaterial, secondRef.current, muted, 1 / density, left, 1)
    }

    /** Act one: one coloured two-line texture, and the arrow beside it. */
    const drawCorridor = (anisotropy: number): void => {
      const g = sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1))
      // Device px, once: the card's projected CSS width at the slot times the
      // renderer's ratio. Every px below is a texture px equal to a device px.
      const cardDevicePx = g.fraction * g.widthPx * dpr
      const scale = captionScale(cardDevicePx)
      const worldPerTexPx = CARD_W / cardDevicePx

      const arrow = drawTextTexture({
        lines: [
          {
            text: ARROW,
            fontPx: CAPTION_ARROW_PX * scale,
            weight: 600,
            color: accentDeepLargeFor(index),
            family: arrowFamily(),
          },
        ],
        dpr: 1,
        maxWidthPx: Infinity,
        align: 'left',
        anisotropy,
      })
      const bandTexPx = (CARD_MAX_PX - 2 * CAPTION_INSET_PX) * scale
      const body = drawTextTexture({
        lines: [
          { text: title, fontPx: CAPTION_NAME_PX * scale, weight: 600, color: NAME_COLOR },
          {
            text: subtitle,
            fontPx: CAPTION_SUBTITLE_PX * scale,
            weight: 500,
            color: SUBTITLE_COLOR,
          },
        ],
        dpr: 1,
        maxWidthPx: bandTexPx - arrow.widthPx - CAPTION_GAP_PX * scale,
        align: 'left',
        gapPx: CAPTION_LINE_GAP_PX * scale,
        anisotropy,
      })
      if (cancelled) {
        arrow.texture.dispose()
        body.texture.dispose()
        return
      }
      apply(titleMaterial, titleRef.current, body, worldPerTexPx, -CARD_W / 2 + CAPTION_INSET_WORLD, 1)
      apply(secondMaterial, secondRef.current, arrow, worldPerTexPx, CARD_W / 2 - CAPTION_INSET_WORLD, -1)
    }

    const draw = async (): Promise<void> => {
      await loadTextFont()
      if (cancelled) return
      const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      if (isWall) drawWall(anisotropy)
      else drawCorridor(anisotropy)
      invalidate() // reduced motion renders on demand; the redraw needs a frame
    }

    if (drawnKey.current !== textKey) {
      drawnKey.current = textKey
      void draw()
    } else {
      timer = window.setTimeout(() => void draw(), RESIZE_DEBOUNCE_MS)
    }
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [
    textKey,
    title,
    subtitle,
    index,
    dpr,
    size.width,
    size.height,
    gl,
    invalidate,
    titleMaterial,
    secondMaterial,
    isWall,
    density,
    origin,
    serial,
    count,
  ])

  // renderOrder, not distance: three sorts transparent meshes by their origin's
  // view depth, and with the camera pitched down the caption's centre (lower on
  // the card) reads as FARTHER than the frame's, so the frame would paint over
  // it. The caption always draws after its card.
  // In the corridor the arrow sits in its own group: the rig offsets the GROUP
  // for the hover slide, so the mesh keeps the base position the draw gave it.
  // The wall has no arrow — a static one would promise a slide act two forbids.
  // A wall caption takes no hits: the block's occupancy table is act two's one
  // interaction source, and a plane over a cell would shadow it.
  const order = isWall ? WALL_ORDER.caption : CAPTION_ORDER
  const raycast = isWall ? () => null : undefined
  return (
    <>
      <mesh
        ref={titleRef}
        geometry={geometry}
        material={titleMaterial}
        renderOrder={order}
        raycast={raycast}
      />
      {isWall ? (
        <mesh
          ref={secondRef}
          geometry={geometry}
          material={secondMaterial}
          renderOrder={order}
          raycast={raycast}
        />
      ) : (
        <group ref={arrowSlideRef}>
          <mesh ref={secondRef} geometry={geometry} material={secondMaterial} renderOrder={order} />
        </group>
      )}
    </>
  )
}
