import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import { Group, MeshBasicMaterial } from 'three'
import type { MotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ABOUT_FRAGMENTS } from '../../../data/aboutFragments'
import { fragmentAngle } from './storm-math'

const FONT_URL = '/fonts/PlusJakartaSans-VariableFont_wght.ttf'

const CYLINDER_RADIUS = 6
const FONT_SIZE = 0.55
const MAX_WIDTH = 8
const LINE_HEIGHT = 1.05
const LETTER_SPACING = 0.02
const INK = '#111822'

// Per-fragment vertical jitter (world Y) so fragments don't sit on robot's eye-line.
const Y_JITTER: readonly number[] = [0, 0.4, -0.3, 0.2, -0.4, 0.1]

interface StormTextProps {
  cylinderRotation: MotionValue<number>
  fragmentOpacities: readonly MotionValue<number>[]
}

export function StormText({ cylinderRotation, fragmentOpacities }: StormTextProps) {
  const groupRef = useRef<Group>(null)

  // Drive the group's Y rotation each frame from the MotionValue.
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = cylinderRotation.get()
    }
  })

  return (
    <group ref={groupRef}>
      {ABOUT_FRAGMENTS.map((fragment, i) => (
        <StormFragment
          key={fragment.id}
          index={i}
          i18nKey={fragment.i18nKey}
          opacity={fragmentOpacities[i]}
        />
      ))}
    </group>
  )
}

interface StormFragmentProps {
  index: number
  i18nKey: string
  opacity: MotionValue<number>
}

function StormFragment({ index, i18nKey, opacity }: StormFragmentProps) {
  const { t } = useTranslation()
  const materialRef = useRef<MeshBasicMaterial>(null)

  const { position, rotation } = useMemo(() => {
    const theta = fragmentAngle(index, ABOUT_FRAGMENTS.length)
    // Local Y rotation = -theta so that, when the group rotates by ψ = θ at this
    // fragment's peak, world rotation Y = -θ + θ = 0 — text +Z faces world +Z
    // (= toward camera). At other ψ values the fragment is foreshortened, as
    // intended for "painted on the cylinder wall".
    return {
      position: [
        CYLINDER_RADIUS * Math.sin(theta),
        Y_JITTER[index] ?? 0,
        -CYLINDER_RADIUS * Math.cos(theta),
      ] as [number, number, number],
      rotation: [0, -theta, 0] as [number, number, number],
    }
  }, [index])

  // Bridge MotionValue → material.opacity. Threshold 0.005 skips imperceptible writes.
  useEffect(() => {
    let last = -1
    const unsubscribe = opacity.on('change', (v) => {
      if (Math.abs(v - last) < 0.005) return
      last = v
      if (materialRef.current) {
        materialRef.current.opacity = v
      }
    })
    return unsubscribe
  }, [opacity])

  return (
    <Text
      position={position}
      rotation={rotation}
      fontSize={FONT_SIZE}
      maxWidth={MAX_WIDTH}
      lineHeight={LINE_HEIGHT}
      letterSpacing={LETTER_SPACING}
      color={INK}
      anchorX="center"
      anchorY="middle"
      font={FONT_URL}
      textAlign="center"
    >
      {t(i18nKey)}
      <meshBasicMaterial
        ref={materialRef}
        attach="material"
        color={INK}
        transparent
        opacity={0}
        toneMapped={false}
      />
    </Text>
  )
}
