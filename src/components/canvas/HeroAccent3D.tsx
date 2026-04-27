import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function Mesh() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.4, 0]} />
      <meshBasicMaterial color="#A2D2FF" wireframe />
    </mesh>
  )
}

export default function HeroAccent3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
    >
      <Mesh />
    </Canvas>
  )
}
