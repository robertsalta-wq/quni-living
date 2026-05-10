import { useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'

export interface ChipFilterOption<T extends string> {
  value: T
  label: string
}

export interface ChipFilterProps<T extends string> {
  label: string
  value: T
  options: ReadonlyArray<ChipFilterOption<T>>
  /**
   * When true the chip renders in the active coral-tint style. Defaults to
   * `value !== options[0].value` so the leftmost option (typically "All") is
   * implicit "not filtered".
   */
  active?: boolean
  onChange: (next: T) => void
  /**
   * Disabled chips render dim with a tooltip — used while a filter source is
   * not yet wired (e.g. "University" until students are universally linked).
   */
  disabled?: boolean
  disabledHint?: string
}

/**
 * Toolbar dropdown chip used on table pages (Bookings, Enquiries, etc.).
 *
 * Per HANDOFF.md §2: generic over the option value `T`. The chip itself opens
 * a small native-style popover anchored below the chip. Closes on outside
 * click, Escape, or option select. No animation library — pure CSS positioning.
 */
export function ChipFilter<T extends string>({
  label,
  value,
  options,
  active,
  onChange,
  disabled,
  disabledHint,
}: ChipFilterProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isActive = disabled ? false : (active ?? value !== options[0]?.value)
  const currentLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '—'

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cls = disabled
    ? 'cursor-not-allowed border-admin-line bg-white text-admin-ink-5 opacity-60'
    : isActive
      ? 'border-admin-coral-30 bg-admin-coral-tint-15 text-admin-coral-active'
      : 'border-admin-line bg-white text-admin-ink-3 hover:bg-admin-surface-2'

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={disabled ? disabledHint : undefined}
        className={
          'inline-flex items-center gap-1.5 rounded-admin-pill border px-3 py-1 text-[12px] font-medium transition-colors ' +
          cls
        }
      >
        <span className="text-admin-ink-5">{label}:</span>
        <span className="font-semibold">{currentLabel}</span>
        <Icon name="chevron-down" size={11} className="text-admin-ink-5" />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-admin-md border border-admin-line bg-white shadow-admin-modal"
        >
          {options.map((opt) => {
            const selected = opt.value === value
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors ' +
                    (selected
                      ? 'bg-admin-coral-tint-15 text-admin-coral-active'
                      : 'text-admin-ink-2 hover:bg-admin-surface-2')
                  }
                >
                  <span>{opt.label}</span>
                  {selected ? (
                    <Icon name="check" size={13} className="text-admin-coral-active" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
