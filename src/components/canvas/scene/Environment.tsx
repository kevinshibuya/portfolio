import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { focusDistance, sceneGeometry } from '../../../utils/sceneMotion'

const CREAM = '#F5F2EC'

interface EnvironmentProps {
  /** Depth of field and grain are desktop-only; phones mount no composer. */
  desktopEffects: boolean
}

/**
 * The cream void the corridor stands in.
 *
 * The floor is the SAME hex as the fog and the clear colour, so it has no
 * visible horizon at all — it exists only to catch the cards' blob shadows,
 * which is the one cue that says the cards are hovering above something.
 */
export function Environment({ desktopEffects }: EnvironmentProps) {
  const size = useThree((state) => state.size)
  const geometry = useMemo(() => new THREE.PlaneGeometry(60, 60), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const g = useMemo(
    () => sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1)),
    [size.width, size.height],
  )

  return (
    <>
      <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={[0, 0, -g.spacing]}>
        <meshBasicMaterial color={CREAM} fog />
      </mesh>

      {desktopEffects ? (
        // Default multisampling is kept deliberately: the yawed card edges need
        // MSAA, and the composer's own AA is what supplies it once the scene
        // renders through a render target.
        <EffectComposer>
          <DepthOfField
            worldFocusDistance={focusDistance(g)}
            worldFocusRange={0.5 * g.spacing}
            bokehScale={2.5}
          />
          <Noise opacity={0.035} />
        </EffectComposer>
      ) : null}
    </>
  )
}
