import { useEffect, useLayoutEffect } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COVER_Y, COVER_Z } from './cardAnatomy'
import {
  acquireCardGeometry,
  acquireCover,
  cardGeometry,
  releaseCardGeometry,
  releaseCover,
} from './cardResources'

/**
 * The scene's card: the white frame, its cover and whatever caption the
 * consumer nests inside it. The corridor's cards travel, so the rig drives them
 * through the handles the corridor registers.
 *
 * The cover textures and the two geometries belong to `cardResources`, and this
 * component only borrows them: every shared subtree carries `dispose={null}` so
 * R3F's automatic disposal cannot reach a resource another card is still
 * drawing.
 */

interface CardCoverProps {
  url: string
  /** Every material on this card, so one opacity drives the whole object. */
  materials: THREE.MeshBasicMaterial[]
}

/**
 * One card's cover image. Split out because `useLoader` suspends: keeping it in
 * its own component means a card with no cover never calls the hook, and no
 * conditional hook is needed.
 */
function CardCover({ url, materials }: CardCoverProps) {
  const gl = useThree((state) => state.gl)
  const loaded = useLoader(THREE.TextureLoader, url)
  const geometry = cardGeometry('cover')

  // The cache is the sole owner (Q11). Acquiring in an effect pairs it with the
  // release, and the deferred final release is what survives StrictMode's
  // mount/unmount/mount without handing the remount a disposed texture. Render
  // only READS the geometry: counting there would add a reference per render.
  useEffect(() => {
    acquireCover(url, loaded)
    acquireCardGeometry('cover')
    return () => {
      releaseCover(url)
      releaseCardGeometry('cover')
    }
  }, [url, loaded])

  useLayoutEffect(() => {
    loaded.colorSpace = THREE.SRGBColorSpace
    loaded.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    loaded.needsUpdate = true
  }, [loaded, gl])

  // The cover writes its material into the card's shared list and takes it out
  // again on unmount, so a remount can never leave a stale material behind.
  const register = (material: THREE.MeshBasicMaterial | null): (() => void) => {
    if (material && !materials.includes(material)) materials.push(material)
    return () => {
      if (!material) return
      const at = materials.indexOf(material)
      if (at >= 0) materials.splice(at, 1)
    }
  }

  return (
    <mesh position={[0, COVER_Y, COVER_Z]} geometry={geometry} dispose={null}>
      <meshBasicMaterial ref={register} map={loaded} transparent fog toneMapped={false} />
    </mesh>
  )
}

interface CardObjectProps {
  /** Null leaves the framed card standing on its own (Q10). */
  coverUrl: string | null
  /** The card's materials, owned by the consumer; the frame registers here. */
  materials: THREE.MeshBasicMaterial[]
  /** Receives the frame's material so the rig can drive its opacity. */
  onFrameMaterial?: (material: THREE.MeshBasicMaterial | null) => void
  children?: React.ReactNode
}

export function CardObject({ coverUrl, materials, onFrameMaterial, children }: CardObjectProps) {
  const geometry = cardGeometry('frame')

  useEffect(() => {
    acquireCardGeometry('frame')
    return () => releaseCardGeometry('frame')
  }, [])

  return (
    <>
      <mesh geometry={geometry} dispose={null}>
        <meshBasicMaterial
          ref={(material) => {
            onFrameMaterial?.(material)
          }}
          color="#FFFFFF"
          transparent
          fog
        />
      </mesh>
      {coverUrl ? <CardCover url={coverUrl} materials={materials} /> : null}
      {children}
    </>
  )
}
