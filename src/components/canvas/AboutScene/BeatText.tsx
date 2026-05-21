import { Text } from '@react-three/drei'
import type { MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const FONT_URL = '/fonts/PlusJakartaSans-VariableFont_wght.ttf'

interface BeatTextProps {
  content: string
  position: [number, number, number]
  fontSize: number
  fontWeight: number
  color: string
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
  maxWidth?: number
  /** Framer motion value driving 0..1 opacity. */
  opacity: MotionValue<number>
}

/**
 * Drei <Text> wrapper that bridges a Framer MotionValue into the THREE
 * material's fillOpacity. Framer motion values can't drive THREE props
 * directly, so we subscribe and store the latest value in React state
 * (cheap — opacity only updates while the user is actively scrolling).
 */
export function BeatText({
  content,
  position,
  fontSize,
  fontWeight,
  color,
  anchorX = 'center',
  anchorY = 'middle',
  maxWidth,
  opacity,
}: BeatTextProps) {
  const [op, setOp] = useState(opacity.get())
  const lastRef = useRef(op)

  useEffect(() => {
    const unsub = opacity.on('change', (v) => {
      // Skip render if change is below perceptual threshold — avoids
      // re-rendering canvas children every animation frame.
      if (Math.abs(v - lastRef.current) > 0.005) {
        lastRef.current = v
        setOp(v)
      }
    })
    return () => unsub()
  }, [opacity])

  return (
    <Text
      position={position}
      font={FONT_URL}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      maxWidth={maxWidth}
      fillOpacity={op}
      // Match the portfolio's wireframe-leaning aesthetic — no outline
      // unless we deliberately add one in a later polish task.
    >
      {content}
    </Text>
  )
}
