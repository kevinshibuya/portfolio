import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

export function Cursor() {
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const isTouch = useRef(false)
  const [mounted, setMounted] = useState(false)

  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 }
  const ringX = useSpring(cursorX, springConfig)
  const ringY = useSpring(cursorY, springConfig)

  useEffect(() => {
    if (isTouchDevice()) {
      isTouch.current = true
      return
    }

    setMounted(true)
    document.documentElement.classList.add('cursor-none')

    const onMouseMove = (e: MouseEvent): void => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    const onMouseEnter = (): void => setVisible(true)
    const onMouseLeave = (): void => setVisible(false)

    const onPointerOver = (e: PointerEvent): void => {
      const target = e.target as HTMLElement
      if (
        target.closest('a, button, [data-cursor-hover]') ||
        target.tagName === 'A' ||
        target.tagName === 'BUTTON'
      ) {
        setHovered(true)
      }
    }

    const onPointerOut = (e: PointerEvent): void => {
      const target = e.target as HTMLElement
      if (
        target.closest('a, button, [data-cursor-hover]') ||
        target.tagName === 'A' ||
        target.tagName === 'BUTTON'
      ) {
        setHovered(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseenter', onMouseEnter)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerout', onPointerOut)

    return () => {
      document.documentElement.classList.remove('cursor-none')
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseenter', onMouseEnter)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
    }
  }, [cursorX, cursorY])

  if (!mounted || isTouch.current) return null

  return (
    <>
      {/* Dot — tracks exactly */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full bg-accent"
        style={{
          x: cursorX,
          y: cursorY,
          width: 6,
          height: 6,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      />

      {/* Ring — follows with spring lag */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full border border-accent/50"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: hovered ? 48 : 32,
          height: hovered ? 48 : 32,
          opacity: visible ? 1 : 0,
          borderColor: hovered
            ? 'rgba(212, 160, 32, 0.8)'
            : 'rgba(212, 160, 32, 0.5)',
        }}
        transition={{
          width: { type: 'spring', damping: 20, stiffness: 300 },
          height: { type: 'spring', damping: 20, stiffness: 300 },
          opacity: { duration: 0.15 },
        }}
      />
    </>
  )
}
