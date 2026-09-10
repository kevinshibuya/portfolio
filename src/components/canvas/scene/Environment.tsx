import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Noise } from '@react-three/postprocessing'
import type { DepthOfFieldEffect } from 'postprocessing'
import * as THREE from 'three'
import { focusDistance, sceneGeometry } from '../../../utils/sceneMotion'
import { TITLE_LAYER, type SceneRefs } from './sceneRefs'

const CREAM = '#F5F2EC'
/** The composer renders at this priority; the title pass runs after it. */
const COMPOSER_PRIORITY = 1

/**
 * The title pass. The composer must never see the title layer (depth of field
 * would blur it), so the camera is narrowed to layer 0 before the composer
 * runs and the title is drawn afterwards, depth-tested against the corridor.
 *
 * Two renders, not one: the depth on the default framebuffer is stale after
 * the composer's final full-screen pass, and transparent objects sort back to
 * front — the title is farther than the settled card, so a single render
 * would draw the title first and the depth-only card could never cover it.
 * autoClear is saved and restored by hand: @react-three/postprocessing 3.1.1
 * restores it around its own render only, and a runtime desktopEffects flip
 * would otherwise leave R3F's main render never clearing.
 */
function TitlePass() {
  const camera = useThree((state) => state.camera)
  const depthOnly = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), [])
  useEffect(() => () => depthOnly.dispose(), [depthOnly])
  // On unmount (composer gone) the main pass must see the title again.
  useEffect(() => () => camera.layers.enableAll(), [camera])

  useFrame(({ camera }) => {
    camera.layers.set(0)
  }, 0)
  useFrame(({ gl, scene, camera }) => {
    const autoClear = gl.autoClear
    gl.autoClear = false
    gl.clearDepth()
    scene.overrideMaterial = depthOnly
    camera.layers.set(0)
    gl.render(scene, camera)
    scene.overrideMaterial = null
    camera.layers.set(TITLE_LAYER)
    gl.render(scene, camera)
    camera.layers.enableAll()
    gl.autoClear = autoClear
  }, COMPOSER_PRIORITY + 1)

  return null
}

interface EnvironmentProps {
  /** Depth of field and grain are desktop-only; phones mount no composer. */
  desktopEffects: boolean
  /** The rig writes the focus distance here every frame; the DoF effect reads it. */
  sceneRefs: SceneRefs
}

/**
 * The cream void the corridor stands in.
 *
 * The floor is the SAME hex as the fog and the clear colour, so it has no
 * visible horizon at all — it exists only to catch the cards' blob shadows,
 * which is the one cue that says the cards are hovering above something.
 */
export function Environment({ desktopEffects, sceneRefs }: EnvironmentProps) {
  const size = useThree((state) => state.size)
  const dofRef = useRef<DepthOfFieldEffect | null>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(60, 60), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const g = useMemo(
    () => sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1)),
    [size.width, size.height],
  )

  // Focus follows the scene: the slot through act one, walking out to the wall
  // across act two's release. Written through `sceneRefs` rather than a prop so
  // it costs zero React renders (ADR 0010), and only when it actually moves.
  //
  // Priority note: this shares priority 0 with SceneRig, and equal priorities
  // run in subscription order. Environment mounts inside `Suspense` after the
  // rig, so it reads the value the rig wrote this frame. Kept explicit because
  // a mount-order change would silently cost a frame of lag.
  useFrame(({ camera }) => {
    const effect = dofRef.current
    if (!effect) return
    if (effect.cocMaterial.worldFocusDistance !== sceneRefs.focus.distance) {
      effect.cocMaterial.worldFocusDistance = sceneRefs.focus.distance
    }
    // The CoC pass reconstructs view depth from the depth buffer with its OWN
    // copy of the camera's near/far, taken once when the effect was built. The
    // rig then widens `far` past act one's for the volume shot, so without this
    // the pass linearises against a frustum the depth buffer was never drawn
    // with and blurs the wrong distance in BOTH acts.
    // `adoptCameraSettings` is the alias the shipped typings expose; it
    // delegates straight to `copyCameraSettings`, the same way this file
    // already reaches focus through the typed `worldFocusDistance` alias.
    if (effect.cocMaterial.uniforms.cameraFar.value !== camera.far) {
      effect.cocMaterial.adoptCameraSettings(camera)
    }
  }, COMPOSER_PRIORITY - 1)

  return (
    <>
      <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={[0, 0, -g.spacing]}>
        <meshBasicMaterial color={CREAM} fog />
      </mesh>

      {desktopEffects ? (
        // Default multisampling is kept deliberately: the yawed card edges need
        // MSAA, and the composer's own AA is what supplies it once the scene
        // renders through a render target.
        <>
          <EffectComposer renderPriority={COMPOSER_PRIORITY}>
            <DepthOfField
              ref={dofRef}
              worldFocusDistance={focusDistance(g)}
              worldFocusRange={0.5 * g.spacing}
              bokehScale={2.5}
            />
            <Noise opacity={0.035} />
          </EffectComposer>
          <TitlePass />
        </>
      ) : null}
    </>
  )
}
