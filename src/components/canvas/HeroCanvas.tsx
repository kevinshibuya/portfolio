import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useScrollContext } from '../../contexts/ScrollContext'
import { ParticleField } from './ParticleField'

export default function HeroCanvas() {
  const reducedMotion = useReducedMotion()
  const { scrollYRef } = useScrollContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dpr, setDpr] = useState(1.5)
  const [visible, setVisible] = useState(true)

  // Scroll-driven opacity fade — rAF loop reading ref, zero re-renders from scroll
  useEffect(() => {
    if (reducedMotion) return

    let rafId: number

    const updateOpacity = (): void => {
      if (!containerRef.current) {
        rafId = requestAnimationFrame(updateOpacity)
        return
      }

      const scrollY = scrollYRef.current
      const viewportHeight = window.innerHeight
      const progress = scrollY / viewportHeight
      // Fade out: fully visible at 0, gone by ~1.25x viewport
      const opacity = Math.max(0, 1 - progress * 0.8)

      containerRef.current.style.opacity = String(opacity)

      // Toggle frameloop when scrolled past hero
      const isVisible = opacity > 0.01
      setVisible(isVisible)

      rafId = requestAnimationFrame(updateOpacity)
    }

    rafId = requestAnimationFrame(updateOpacity)

    return () => cancelAnimationFrame(rafId)
  }, [scrollYRef, reducedMotion])

  if (reducedMotion) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
    >
      <Canvas
        dpr={dpr}
        camera={{ fov: 60, position: [0, 0, 5], near: 0.1, far: 50 }}
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: 'high-performance',
        }}
        frameloop={visible ? 'always' : 'never'}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <ParticleField scrollYRef={scrollYRef} />
      </Canvas>
    </div>
  )
}
