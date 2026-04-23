import { motion } from 'framer-motion'

interface TagProps {
  label: string
  variant?: 'default' | 'accent' | 'muted' | 'chip'
  size?: 'sm' | 'md'
  onClick?: () => void
  active?: boolean
}

const variantStyles = {
  default:
    'border-border text-text-muted bg-bg hover:border-terra-300 hover:text-text',
  accent:
    'border-terra-200 text-terra-500 bg-terra-100',
  muted:
    'border-transparent text-text-muted bg-bg-sand',
  chip:
    'border-border text-text-muted bg-bg hover:border-terra-300 hover:text-text',
} as const

const activeStyle = 'border-text bg-text text-text-light'

export function Tag({
  label,
  variant = 'default',
  size = 'sm',
  onClick,
  active = false,
}: TagProps) {
  const sizeClass =
    size === 'md'
      ? 'px-3.5 py-1.5 text-[11px]'
      : 'px-2.5 py-1 text-[10px]'
  const baseClass = `inline-flex items-center rounded-full border font-body font-medium lowercase tracking-[0.02em] transition-colors duration-200 ${sizeClass}`
  const colorClass = active ? activeStyle : variantStyles[variant]
  const interactiveClass = onClick ? 'cursor-pointer' : ''

  return (
    <motion.span
      className={`${baseClass} ${colorClass} ${interactiveClass}`}
      onClick={onClick}
      data-cursor-hover={onClick ? '' : undefined}
      whileHover={onClick ? { scale: 1.04 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
    >
      {label}
    </motion.span>
  )
}
