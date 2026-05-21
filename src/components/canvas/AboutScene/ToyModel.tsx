import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { MotionValue } from 'framer-motion'
import { scatterOffset, spreadDirection } from './scatterMath'

const MODEL_URL = '/models/about-toy.glb'

const PALETTE: ReadonlyArray<{ color: string; metalness: number; roughness: number }> = [
  { color: '#A2D2FF', metalness: 0.35, roughness: 0.45 },
  { color: '#D4E5F2', metalness: 0.20, roughness: 0.55 },
  { color: '#6A8CAA', metalness: 0.50, roughness: 0.30 },
  { color: '#3A96E8', metalness: 0.40, roughness: 0.40 },
]

useGLTF.preload(MODEL_URL)

interface ToyModelProps {
  /** 0..1 scroll progress across the About section. */
  progress: MotionValue<number>
}

interface PartCache {
  mesh: Mesh
  assembled: Vector3
  scattered: Vector3
  spread: Vector3
}

const _tmp = new Vector3()

function lerpClamped(a: number, b: number, t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return a + (b - a) * c
}

function positionForProgress(part: PartCache, p: number, out: Vector3): Vector3 {
  if (p < 0.33) {
    const t = p / 0.33
    out.lerpVectors(part.scattered, part.assembled, t)
  } else if (p < 0.66) {
    out.copy(part.assembled)
  } else {
    const t = (p - 0.66) / 0.34
    _tmp.copy(part.spread).multiplyScalar(0.3).add(part.assembled)
    out.lerpVectors(part.assembled, _tmp, t)
  }
  return out
}

export function ToyModel({ progress }: ToyModelProps) {
  const groupRef = useRef<Group>(null)
  const partsRef = useRef<PartCache[]>([])
  const { scene } = useGLTF(MODEL_URL)

  useEffect(() => {
    const cache: PartCache[] = []
    let i = 0
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return
      const mesh = obj as Mesh
      const swatch = PALETTE[i % PALETTE.length]
      mesh.material = new MeshStandardMaterial({
        color: swatch.color,
        metalness: swatch.metalness,
        roughness: swatch.roughness,
      })
      // useGLTF caches the scene across mounts. On remount, mesh.position
      // holds whatever the last useFrame wrote — not the GLB's rest pose.
      // Capture the original on first mount into userData, and read from
      // there on every subsequent capture so assembled stays authoritative.
      if (!mesh.userData.assembledRest) {
        mesh.userData.assembledRest = mesh.position.clone()
      }
      const assembled = (mesh.userData.assembledRest as Vector3).clone()
      cache.push({
        mesh,
        assembled,
        scattered: assembled.clone().add(scatterOffset(i)),
        spread: spreadDirection(assembled),
      })
      i++
    })
    partsRef.current = cache
    return () => {
      for (const part of cache) {
        (part.mesh.material as MeshStandardMaterial).dispose()
      }
    }
  }, [scene])

  useFrame(() => {
    const p = progress.get()
    const parts = partsRef.current
    for (const part of parts) {
      positionForProgress(part, p, part.mesh.position)
    }
    if (groupRef.current) {
      // Subtle Y rotation during the "live" middle phase (0.33..0.66).
      const liveT = lerpClamped(0, 1, (p - 0.33) / 0.33)
      groupRef.current.rotation.y = liveT * (Math.PI / 6) // ~30°
    }
  })

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
