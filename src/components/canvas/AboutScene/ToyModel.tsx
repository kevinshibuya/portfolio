import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { MotionValue } from 'framer-motion'
import { scatterOffset } from './scatterMath'

const MODEL_URL = '/models/about-toy.glb'

// Palette overrides for the robot's materials (replaces texture-based colors).
const PALETTE = ['#A2D2FF', '#D4E5F2', '#6A8CAA', '#3A96E8']

// Module-scoped temp vector — no allocations inside useFrame.
const _tmp = new Vector3()

// Drift sinusoid params (during scatter-hold phase).
const DRIFT_AMPLITUDE = 0.05
const DRIFT_FREQUENCY = 0.4 // Hz

interface ToyModelProps {
  scrollYProgress: MotionValue<number>
  robotSpinY: MotionValue<number>
}

export function ToyModel({ scrollYProgress, robotSpinY }: ToyModelProps) {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  // Set up palette overrides and cache per-mesh scatter target + phase offsets ONCE on mount.
  useEffect(() => {
    let meshIndex = 0
    scene.traverse((node) => {
      if ((node as Mesh).isMesh) {
        const mesh = node as Mesh
        const color = PALETTE[meshIndex % PALETTE.length]
        mesh.material = new MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.1,
        })
        // Cache scatter target ONCE — scatterOffset allocates a new Vector3,
        // so we must not call it inside useFrame.
        mesh.userData.scatterTarget = scatterOffset(meshIndex)
        // Stable per-mesh phase offsets (deterministic from meshIndex so they
        // survive across remounts).
        mesh.userData.phaseX = (meshIndex * 0.7) % (Math.PI * 2)
        mesh.userData.phaseY = (meshIndex * 1.3) % (Math.PI * 2)
        mesh.userData.phaseZ = (meshIndex * 2.1) % (Math.PI * 2)
        mesh.userData.meshIndex = meshIndex
        meshIndex++
      }
    })
    return () => {
      scene.traverse((node) => {
        if ((node as Mesh).isMesh) {
          const m = (node as Mesh).material
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
          else m?.dispose()
        }
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

  return <primitive ref={groupRef} object={scene} dispose={null} />
}

useGLTF.preload(MODEL_URL)
