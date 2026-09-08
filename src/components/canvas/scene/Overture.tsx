import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { overtureWidth, sceneGeometry } from '../../../utils/sceneMotion'
import { drawTextTexture, layoutText, loadTextFont } from './textTexture'
import { TITLE_LAYER, type SceneRefs } from './sceneRefs'

const INK = '#0B0E14'
const WEIGHT = 650
/** Transparent margin, in texture px, so clamp-to-edge never smears the ink. */
const PAD_PX = 4
/** The rasteriser's hard ceiling for the line's texture width. */
const MAX_TEXTURE_PX = 4096
/** Drawn this many times the frame width: it is magnified up to ~5× on the pass. */
const OVERSAMPLE = 1.5
/** A resize alone waits this long before the texture is rebuilt. */
const RESIZE_DEBOUNCE_MS = 150
/** Above everything on its layer except the title (10). */
const OVERTURE_ORDER = 9

interface OvertureProps {
  /** The localised line. */
  text: string
  sceneRefs: SceneRefs
}

/**
 * The overture: one line of Jakarta standing alone in the cream before the
 * corridor, which the camera flies through as the cards appear (spec Q7).
 *
 * A single plane at eye height, facing the camera, on the title layer so the
 * composer never blurs it. It is rasterised LARGER than its first frame
 * (`OVERSAMPLE × frame width`), so as the camera nears and the line grows it
 * stays minified and mip-filtered, crisp until it is mostly off frame. The rig
 * places it, fades it and breathes it every frame; nothing here animates.
 *
 * Rebuilt on a language switch and on a debounced resize.
 */
export function Overture({ text, sceneRefs }: OvertureProps) {
  const gl = useThree((state) => state.gl)
  const dpr = useThree((state) => state.viewport.dpr)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  const meshRef = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        opacity: 0,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.map?.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    mesh?.layers.set(TITLE_LAYER)
    sceneRefs.overture = mesh
    sceneRefs.overtureMaterial = material
    return () => {
      sceneRefs.overture = null
      sceneRefs.overtureMaterial = null
    }
  }, [sceneRefs, material])

  const drawnKey = useRef('')
  const drawKey = `${text} ${dpr}`

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const draw = async (): Promise<void> => {
      await loadTextFont()
      if (cancelled) return
      const g = sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1))
      // Device px, once: the texture spans OVERSAMPLE frame widths at the
      // renderer's ratio; the em is whatever makes the line fill that.
      const targetPx = Math.min(MAX_TEXTURE_PX, OVERSAMPLE * g.widthPx * dpr) - 2 * PAD_PX
      const probe = layoutText({
        lines: [{ text, fontPx: 100, weight: WEIGHT, color: INK }],
        dpr: 1,
        maxWidthPx: Infinity,
        align: 'center',
        padPx: 0,
      })
      const fontPx = probe.widthPx > 0 ? (100 * targetPx) / probe.widthPx : 100
      const drawn = drawTextTexture({
        lines: [{ text, fontPx, weight: WEIGHT, color: INK }],
        dpr: 1,
        maxWidthPx: Infinity,
        align: 'center',
        padPx: PAD_PX,
        anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()),
      })
      if (cancelled) {
        drawn.texture.dispose()
        return
      }
      material.map?.dispose()
      material.map = drawn.texture
      material.needsUpdate = true
      const mesh = meshRef.current
      if (mesh) {
        // World width fills 0.7 of the visible width at the top of the overture.
        const w = overtureWidth(g)
        mesh.scale.set(w, (w * drawn.heightPx) / drawn.widthPx, 1)
      }
      invalidate()
    }

    if (drawnKey.current !== drawKey) {
      drawnKey.current = drawKey
      void draw()
    } else {
      timer = window.setTimeout(() => void draw(), RESIZE_DEBOUNCE_MS)
    }
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [drawKey, text, dpr, size.width, size.height, gl, invalidate, material])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={OVERTURE_ORDER}
      visible={false}
    />
  )
}
