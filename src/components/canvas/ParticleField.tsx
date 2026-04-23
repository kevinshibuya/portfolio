import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  scrollYRef: React.RefObject<number>
  count?: number
}

const ACCENT_COLOR = new THREE.Color('#E07A56')
const SECONDARY_COLOR = new THREE.Color('#F0A582')
const BASE_COLOR = new THREE.Color('#1A1512')
const ACCENT_RATIO = 0.12
const SECONDARY_RATIO = 0.08

/** Create a small circular texture for round particles instead of GL_POINTS squares */
function createCircleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2

  // Radial gradient: solid white center → transparent edge
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** Sets the scene background imperatively — more reliable than the Canvas scene prop */
function SceneBackground({ color }: { color: string }) {
  const { scene } = useThree()
  useMemo(() => {
    scene.background = new THREE.Color(color)
  }, [scene, color])
  return null
}

export function ParticleField({ scrollYRef, count = 1000 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const prevScrollY = useRef(0)

  const circleTexture = useMemo(() => createCircleTexture(), [])

  const { positions, colors, phases, basePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const basePositions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Spread: X ±8, Y ±6, Z ±5
      const x = (Math.random() - 0.5) * 16
      const y = (Math.random() - 0.5) * 12
      const z = (Math.random() - 0.5) * 10

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      basePositions[i3] = x
      basePositions[i3 + 1] = y
      basePositions[i3 + 2] = z

      // 12% terracotta accent, 8% softer peach secondary, rest warm ink
      const r = Math.random()
      const color =
        r < ACCENT_RATIO
          ? ACCENT_COLOR
          : r < ACCENT_RATIO + SECONDARY_RATIO
            ? SECONDARY_COLOR
            : BASE_COLOR
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      // Per-particle phase offset for breathing desync
      phases[i] = Math.random() * Math.PI * 2
    }

    return { positions, colors, phases, basePositions }
  }, [count])

  useFrame(({ clock, camera }) => {
    if (!pointsRef.current) return

    const time = clock.elapsedTime
    const posAttr = pointsRef.current.geometry.attributes.position
    const posArray = posAttr.array as Float32Array

    const scrollY = scrollYRef.current
    const scrollDelta = scrollY - prevScrollY.current
    // Clamp velocity displacement to avoid wild jumps
    const velocityOffset = Math.max(-0.8, Math.min(0.8, scrollDelta * 0.002))
    prevScrollY.current = scrollY

    // Update per-particle positions
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const phase = phases[i]

      // Breathing: sinusoidal Y oscillation
      const breathe = Math.sin(time * 0.3 + phase) * 0.15

      posArray[i3] = basePositions[i3]
      posArray[i3 + 1] = basePositions[i3 + 1] + breathe + velocityOffset
      posArray[i3 + 2] = basePositions[i3 + 2]
    }

    posAttr.needsUpdate = true

    // Slow continuous rotation of entire field
    pointsRef.current.rotation.y = time * 0.02

    // Scroll-reactive camera Z parallax
    const viewportHeight = window.innerHeight
    const scrollProgress = Math.min(scrollY / viewportHeight, 1)
    camera.position.z = 5 - scrollProgress * 1.5
  })

  return (
    <>
      <SceneBackground color="#FAFAF8" />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={circleTexture}
          vertexColors
          transparent
          opacity={0.35}
          size={0.04}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </>
  )
}
