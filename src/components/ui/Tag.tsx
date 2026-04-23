interface TagProps {
  label: string
  variant?: 'pill' | 'chip'
  onClick?: () => void
  active?: boolean
}

/**
 * `pill` — static tag on solid backgrounds (tech chips, decorative).
 * `chip` — interactive filter chip (active = inverted ink/cream).
 */
export function Tag({ label, variant = 'pill', onClick, active = false }: TagProps) {
  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`chip${active ? ' is-active' : ''}`}
      >
        {label}
      </button>
    )
  }

  return <span className="pill">{label}</span>
}
