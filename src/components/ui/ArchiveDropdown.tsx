import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { EASE_HOUSE as EASE } from '../../utils/animations'

interface DropdownOption {
  value: string
  label: string
}

interface ArchiveDropdownProps {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function ArchiveDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: ArchiveDropdownProps) {
  const { prefersReducedMotion } = useMotion()
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  // close() restores focus to the trigger so keyboard users don't lose place.
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    // Tab also closes (without preventDefault) so focus moves out naturally
    // instead of leaking the open listbox into the next page interaction.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Tab') close()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  useEffect(() => {
    if (open) setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open, options, value])

  // Move keyboard focus into the listbox so onListKey actually receives events.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  const onTriggerKey = (e: React.KeyboardEvent): void => {
    if (disabled) return
    if (
      e.key === 'Enter' ||
      e.key === ' ' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp'
    ) {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIdx]
      if (opt) {
        onChange(opt.value)
        close()
      }
    }
  }

  const optionId = (i: number): string => `${listId}-option-${i}`

  return (
    <div className={`archive-dropdown${disabled ? ' is-disabled' : ''}`} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`archive-dropdown-trigger${open ? ' is-open' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
      >
        <span className="archive-dropdown-label">{label}</span>
        <span className="archive-dropdown-value">{selected?.label ?? '—'}</span>
        <span className="archive-dropdown-caret" aria-hidden={true}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
        <motion.ul
          ref={listRef}
          id={listId}
          className="archive-dropdown-list"
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={options[activeIdx] ? optionId(activeIdx) : undefined}
          onKeyDown={onListKey}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: -4,
            scale: 0.98,
            transition: { duration: prefersReducedMotion ? 0 : 0.14, ease: EASE },
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: EASE }}
          style={{ transformOrigin: 'top' }}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={o.value === value}
              className={`archive-dropdown-option${
                i === activeIdx ? ' is-active' : ''
              }${o.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                onChange(o.value)
                close()
              }}
            >
              {o.label}
            </li>
          ))}
        </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
