import { forwardRef, useCallback, useEffect, useId, useRef, useState, type FocusEventHandler } from 'react'
import {
  formatIsoDateAuNumeric,
  isIsoDateString,
  parseAuNumericDateToIso,
} from '../lib/listingAvailabilityDates'

export type AUDateFieldProps = {
  id?: string
  value: string
  onChange: (isoDate: string) => void
  min?: string
  max?: string
  /** Applied to the visible text input (same role as a native date input’s class). */
  className?: string
  /** Optional styles for the calendar trigger (e.g. match `border-stone-200` sidebars). */
  calendarButtonClassName?: string
  disabled?: boolean
  required?: boolean
  onFocus?: FocusEventHandler<HTMLInputElement>
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

export const AUDateField = forwardRef<HTMLInputElement, AUDateFieldProps>(function AUDateField(
  {
    id,
    value,
    onChange,
    min,
    max,
    className = '',
    calendarButtonClassName,
    disabled,
    required,
    onFocus,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
  },
  ref,
) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const hiddenRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(() =>
    value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '',
  )
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
    }
  }, [value, focused])

  const commitText = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) {
      onChange('')
      setText('')
      return
    }
    const parsed = parseAuNumericDateToIso(trimmed)
    if (!parsed) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
      return
    }
    if (min && isIsoDateString(min) && parsed < min) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
      return
    }
    if (max && isIsoDateString(max) && parsed > max) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
      return
    }
    onChange(parsed)
    setText(formatIsoDateAuNumeric(parsed))
  }, [text, value, min, max, onChange])

  const openPicker = () => {
    const el = hiddenRef.current
    if (!el || disabled) return
    try {
      el.showPicker?.()
    } catch {
      el.click()
    }
  }

  return (
    <div className="flex w-full gap-1.5 items-stretch">
      <input
        ref={ref}
        id={inputId}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        required={required}
        value={text}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={() => {
          setFocused(false)
          commitText()
        }}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={className}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={
          calendarButtonClassName ??
          'shrink-0 rounded-lg border border-gray-900/20 px-2.5 py-2 text-stone-600 hover:bg-stone-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
        }
        aria-label="Choose date"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      </button>
      <input
        ref={hiddenRef}
        type="date"
        className="sr-only fixed left-0 top-0 h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden
        value={isIsoDateString(value) ? value : ''}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value
          if (v && isIsoDateString(v)) {
            onChange(v)
            setText(formatIsoDateAuNumeric(v))
          }
        }}
      />
    </div>
  )
})
