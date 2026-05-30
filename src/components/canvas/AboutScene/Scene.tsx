import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import { ToyModel } from './ToyModel'
import { StormText } from './StormText'

interface SceneProps {
  scrollYProgress: MotionValue<number>
  cameraZ: MotionValue<number>
  robotSpinY: MotionValue<number>
  cylinderRotation: MotionValue<number>
  fragmentOpacities: readonly MotionValue<number>[]
}

export function Scene({
  scrollYProgress,
  cameraZ,
  robotSpinY,
  cylinderRotation,
  fragmentOpacities,
}: SceneProps) {
  return (
    <>
      <CameraController cameraZ={cameraZ} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={0.8} />

      <ToyModel scrollYProgress={scrollYProgress} robotSpinY={robotSpinY} />

      <StormText
        cylinderRotation={cylinderRotation}
        fragmentOpacities={fragmentOpacities}
      />
    </>
  )
}

interface CameraControllerProps {
  cameraZ: MotionValue<number>
}

function CameraController({ cameraZ }: CameraControllerProps) {
  useFrame((state) => {
    state.camera.position.z = cameraZ.get()
  })
  return null
}
