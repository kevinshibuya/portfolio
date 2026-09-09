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
  CAPTION_SUBTITLE_PX,
  CAPTION_LINE_GAP_PX,
  CAPTION_ARROW_PX,
  CAPTION_GAP_PX,
} from './cardAnatomy'
import {
  drawTextTexture,
  captionScale,
  loadTextFont,
  arrowFamily,
  RESIZE_DEBOUNCE_MS,
  type TextTexture,
} from './textTexture'
import type { SceneCard } from '../SelectedWorkScene'
import type { SceneRefs } from './sceneRefs'

const NAME_COLOR = '#0B0E14'
const SUBTITLE_COLOR = 'rgba(11,14,20,0.62)'
const ARROW = '↗'
const BAND_CENTRE_Y = (BAND_TOP_Y + BAND_BOTTOM_Y) / 2
/** Above the frame and cover (0), below the title (10). */
const CAPTION_ORDER = 1

interface CaptionProps {
  index: number
  card: SceneCard
  sceneRefs: SceneRefs
}

function captionMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    toneMapped: false,
  })
}

/**
 * The caption ON the card (ADR 0011): the name and `year · tech · tech` on the
 * left of the white body band, the arrow on the right, each a textured plane
 * inside the card's group so it travels, yaws, breathes and fogs with it.
 *
 * Both meshes and materials mount synchronously and register themselves in
 * their own layout effect; the textures arrive when the async draw resolves
 * and are assigned imperatively, so the corridor's once-only registration
 * never sees a null and nothing here suspends.
 *
 * Sizing: the texture is drawn at the card's projected width at the slot, in
 * device px, so at rest one texture px is one device px (no minification, no
 * magnification). Rebuilt on a language switch and on a debounced resize.
 */
export function Caption({ index, card, sceneRefs }: CaptionProps) {
  const gl = useThree((state) => state.gl)
  const dpr = useThree((state) => state.viewport.dpr)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  const textRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Mesh>(null)
  const arrowSlideRef = useRef<THREE.Group>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const textMaterial = useMemo(captionMaterial, [])
  const arrowMaterial = useMemo(captionMaterial, [])

  useEffect(
    () => () => {
      geometry.dispose()
      for (const m of [textMaterial, arrowMaterial]) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [geometry, textMaterial, arrowMaterial],
  )

  useLayoutEffect(() => {
    sceneRefs.captionMaterials[index] = [textMaterial, arrowMaterial]
    sceneRefs.arrows[index] = arrowSlideRef.current
    return () => {
      sceneRefs.captionMaterials[index] = []
      sceneRefs.arrows[index] = null
    }
  }, [sceneRefs, index, textMaterial, arrowMaterial])

  // Text changes (a language switch) and the first draw are immediate; a
  // resize alone waits for the window to settle.
  const drawnKey = useRef('')
  const textKey = `${card.title} ${card.subtitle} ${index} ${dpr}`

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

    const draw = async (): Promise<void> => {
      await loadTextFont()
      if (cancelled) return
      const g = sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1))
      // Device px, once: the card's projected CSS width at the slot times the
      // renderer's ratio. Every px below is a texture px equal to a device px.
      const cardDevicePx = g.fraction * g.widthPx * dpr
      const scale = captionScale(cardDevicePx)
      const worldPerTexPx = CARD_W / cardDevicePx
      const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())

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
      const text = drawTextTexture({
        lines: [
          { text: card.title, fontPx: CAPTION_NAME_PX * scale, weight: 600, color: NAME_COLOR },
          {
            text: card.subtitle,
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
        text.texture.dispose()
        return
      }
      const inset = (CAPTION_INSET_PX / CARD_MAX_PX) * CARD_W
      apply(textMaterial, textRef.current, text, worldPerTexPx, -CARD_W / 2 + inset, 1)
      apply(arrowMaterial, arrowRef.current, arrow, worldPerTexPx, CARD_W / 2 - inset, -1)
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
    card.title,
    card.subtitle,
    index,
    dpr,
    size.width,
    size.height,
    gl,
    invalidate,
    textMaterial,
    arrowMaterial,
  ])

  // renderOrder, not distance: three sorts transparent meshes by their origin's
  // view depth, and with the camera pitched down the caption's centre (lower on
  // the card) reads as FARTHER than the frame's, so the frame would paint over
  // it. The caption always draws after its card.
  // The arrow sits in its own group: the rig offsets the GROUP for the hover
  // slide, so the mesh keeps the base position the draw gave it.
  return (
    <>
      <mesh ref={textRef} geometry={geometry} material={textMaterial} renderOrder={CAPTION_ORDER} />
      <group ref={arrowSlideRef}>
        <mesh ref={arrowRef} geometry={geometry} material={arrowMaterial} renderOrder={CAPTION_ORDER} />
      </group>
    </>
  )
}
