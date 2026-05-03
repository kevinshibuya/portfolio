import { useEffect, useRef, useState, useId, useCallback } from 'react'

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
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
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

  const onTriggerKey = (e: React.KeyboardEvent): void => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
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
      onChange(options[activeIdx].value)
      close()
    }
  }

  return (
    <div className={`archive-dropdown${disabled ? ' is-disabled' : ''}`} ref={wrapRef}>
      <button
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
        <span className="archive-dropdown-value">
          {selected?.label ?? options[0]?.label ?? '—'}
        </span>
        <span className="archive-dropdown-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <ul
          id={listId}
          className="archive-dropdown-list"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
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
        </ul>
      )}
    </div>
  )
}
