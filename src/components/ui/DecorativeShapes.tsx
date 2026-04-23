import { motion } from 'framer-motion'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type ShapeType = 'star' | 'crosshair' | 'ring'

interface DecorativeShapeProps {
  type: ShapeType
  size?: number
  className?: string
  animate?: boolean
}

function StarSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  )
}

function CrosshairSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="0" x2="12" y2="24" />
      <line x1="0" y1="12" x2="24" y2="12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

function RingSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

const shapeMap: Record<ShapeType, React.FC<{ size: number }>> = {
  star: StarSvg,
  crosshair: CrosshairSvg,
  ring: RingSvg,
}

export function DecorativeShape({
  type,
  size = 24,
  className = '',
  animate = true,
}: DecorativeShapeProps) {
  const prefersReducedMotion = useReducedMotion()
  const ShapeComponent = shapeMap[type]
  const shouldAnimate = animate && !prefersReducedMotion

  return (
    <motion.div
      aria-hidden="true"
      role="presentation"
      className={className}
      animate={shouldAnimate ? { rotate: 360 } : undefined}
      transition={
        shouldAnimate
          ? { duration: 20, repeat: Infinity, ease: 'linear' }
          : undefined
      }
    >
      <ShapeComponent size={size} />
    </motion.div>
  )
}
