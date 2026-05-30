import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { MotionValue } from 'framer-motion'

const MODEL_URL = '/models/about-toy.glb'

// Palette overrides for the robot's materials (replaces texture-based colors).
const PALETTE = ['#A2D2FF', '#D4E5F2', '#6A8CAA', '#3A96E8']

// Module-scoped temp vector — no allocations inside useFrame.
const _tmp = new Vector3()

// Drift sinusoid params (during scatter-hold phase).
const DRIFT_AMPLITUDE = 0.05
const DRIFT_FREQUENCY = 0.4 // Hz

// Outward-explosion factor: each part moves to (rest - centroid) * EXPLOSION_FACTOR
// at full scatter. >1 means parts move further from the centroid than they sit at rest.
// Because the offsets are PURELY radial from the centroid, sum of offsets ≈ 0,
// so the visual centroid stays anchored during the explosion.
const EXPLOSION_FACTOR = 3.8

// GLB is authored small (~0.18u tall) and offset (model origin at robot feet).
// Wrap the primitive so the outer group owns scroll-driven Y spin while the
// inner primitive carries static fit transforms.
const MODEL_SCALE = 3.0
const MODEL_OFFSET_Y = -0.6      // shift model down so its center lands near world Y=0
const MODEL_FRONT_OFFSET_Y = -Math.PI / 4   // tuned via visual sweep so robot faces camera at p=0

interface ToyModelProps {
  scrollYProgress: MotionValue<number>
  robotSpinY: MotionValue<number>
}

export function ToyModel({ scrollYProgress, robotSpinY }: ToyModelProps) {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  // Set up palette overrides and cache per-mesh scatter target + phase offsets ONCE on mount.
  useEffect(() => {
    // First pass: collect meshes and compute centroid of rest positions.
    const meshes: Mesh[] = []
    scene.traverse((node) => {
      if ((node as Mesh).isMesh) meshes.push(node as Mesh)
    })
    const centroid = new Vector3()
    meshes.forEach((m) => centroid.add(m.position))
    if (meshes.length > 0) centroid.divideScalar(meshes.length)

    // Second pass: assign material + cache scatter target = radial vector
    // from centroid, scaled by EXPLOSION_FACTOR. Because targets are pure
    // radial from the centroid, their sum is ~zero → centroid stays anchored.
    meshes.forEach((mesh, meshIndex) => {
      const color = PALETTE[meshIndex % PALETTE.length]
      mesh.material = new MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1,
      })
      const radial = mesh.position.clone().sub(centroid)
      // Parts sitting exactly at the centroid get a tiny deterministic outward
      // nudge so they don't stay glued there during the explosion.
      if (radial.lengthSq() < 1e-6) {
        radial.set(
          Math.cos(meshIndex * 1.3),
          Math.sin(meshIndex * 0.7),
          Math.sin(meshIndex * 2.1),
        ).multiplyScalar(0.05)
      }
      mesh.userData.scatterTarget = radial.multiplyScalar(EXPLOSION_FACTOR)
      // Stable per-mesh phase offsets (deterministic from meshIndex so they
      // survive across remounts).
      mesh.userData.phaseX = (meshIndex * 0.7) % (Math.PI * 2)
      mesh.userData.phaseY = (meshIndex * 1.3) % (Math.PI * 2)
      mesh.userData.phaseZ = (meshIndex * 2.1) % (Math.PI * 2)
      mesh.userData.meshIndex = meshIndex
    })
    return () => {
      meshes.forEach((mesh) => {
        const m = mesh.material
        if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
        else m?.dispose()
      })
    }
  }, [scene])

  // Frame loop: spin + scatter + drift + reassemble.
  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    const p = scrollYProgress.get()
    const t = state.clock.elapsedTime

    // Group spin (Phase A).
    group.rotation.y = robotSpinY.get()

    // Scatter / hold / reassemble per mesh.
    scene.traverse((node) => {
      if (!(node as Mesh).isMesh) return
      const mesh = node as Mesh

      // Capture assembled rest pose on first frame.
      if (!mesh.userData.assembledRest) {
        mesh.userData.assembledRest = mesh.position.clone()
      }
      const rest = mesh.userData.assembledRest as Vector3
      const target = mesh.userData.scatterTarget as Vector3
      // `target` is RELATIVE to rest — i.e. how far we scatter from rest.
      // Final scattered position = rest + target.

      let scatterAmount = 0 // 0 = assembled, 1 = fully scattered

      if (p <= 0.25) {
        scatterAmount = 0
      } else if (p < 0.5) {
        scatterAmount = (p - 0.25) / 0.25
      } else if (p < 0.75) {
        scatterAmount = 1
      } else {
        scatterAmount = 1 - (p - 0.75) / 0.25
      }

      // Base position lerps from rest to (rest + target) by scatterAmount.
      _tmp.copy(rest).addScaledVector(target, scatterAmount)

      // Drift only during the hold window (0.5–0.75) — fade in/out so seams hide.
      let driftWeight = 0
      if (p > 0.45 && p < 0.8) {
        if (p < 0.5) driftWeight = (p - 0.45) / 0.05
        else if (p > 0.75) driftWeight = (0.8 - p) / 0.05
        else driftWeight = 1
      }
      if (driftWeight > 0) {
        const phaseX = mesh.userData.phaseX as number
        const phaseY = mesh.userData.phaseY as number
        const phaseZ = mesh.userData.phaseZ as number
        const omega = DRIFT_FREQUENCY * Math.PI * 2
        _tmp.x += driftWeight * DRIFT_AMPLITUDE * Math.sin(t * omega + phaseX)
        _tmp.y += driftWeight * DRIFT_AMPLITUDE * Math.sin(t * omega + phaseY)
        _tmp.z += driftWeight * DRIFT_AMPLITUDE * Math.sin(t * omega + phaseZ)
      }

      mesh.position.copy(_tmp)
    })
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        dispose={null}
        scale={MODEL_SCALE}
        position={[0, MODEL_OFFSET_Y, 0]}
        rotation={[0, MODEL_FRONT_OFFSET_Y, 0]}
      />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
