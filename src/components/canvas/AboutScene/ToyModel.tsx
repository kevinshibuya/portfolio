import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group, Mesh, MeshStandardMaterial } from 'three'

const MODEL_URL = '/models/about-toy.glb'

// Portfolio palette mapped to a small set of materials. Parts get assigned
// in a stable order so the palette distribution is deterministic across
// renders.
const PALETTE: ReadonlyArray<{ color: string; metalness: number; roughness: number }> = [
  { color: '#A2D2FF', metalness: 0.35, roughness: 0.45 }, // blue-300 — main body
  { color: '#D4E5F2', metalness: 0.20, roughness: 0.55 }, // mist     — accents
  { color: '#6A8CAA', metalness: 0.50, roughness: 0.30 }, // dust     — joints / smaller parts
  { color: '#3A96E8', metalness: 0.40, roughness: 0.40 }, // blue-400 — highlight
]

useGLTF.preload(MODEL_URL)

export function ToyModel() {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  // Collect mesh refs in a stable, ordered list. Used by Task 13 to
  // animate per-part transforms.
  const partsRef = useRef<Mesh[]>([])

  useEffect(() => {
    const meshes: Mesh[] = []
    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const m = obj as Mesh
        meshes.push(m)
      }
    })
    partsRef.current = meshes

    // Apply palette override — deterministic by mesh index in traversal order.
    meshes.forEach((mesh, i) => {
      const swatch = PALETTE[i % PALETTE.length]
      mesh.material = new MeshStandardMaterial({
        color: swatch.color,
        metalness: swatch.metalness,
        roughness: swatch.roughness,
      })
      // Cache the assembled rest pose so Task 13 can lerp from/to it.
      mesh.userData.assembled = {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
      }
    })
  }, [scene])

  // Centre the model: drei's useGLTF returns the scene at whatever origin
  // the model was authored with. The group wrapper lets us recentre + scale.
  const transform = useMemo(() => ({
    scale: 1.2,
    position: [0, -0.3, 0] as [number, number, number],
  }), [])

  return (
    <group ref={groupRef} {...transform}>
      <primitive object={scene} />
    </group>
  )
}
