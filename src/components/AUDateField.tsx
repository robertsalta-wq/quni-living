import { forwardRef, useCallback, useEffect, useId, useRef, useState, type FocusEventHandler } from 'react'
import {
  formatIsoDateAuNumeric,
  isIsoDateString,
  parseAuNumericDateToIso,
} from '../lib/listingAvailabilityDates'

const BIRTH_DATE_MIN = '1920-01-01'
const BIRTH_DATE_DEFAULT_YEARS_AGO = 30

function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ISO date ~30 years before max — mobile pickers otherwise open on today and bury the year. */
export function birthDatePickerAnchorIso(maxIso?: string, minIso?: string): string {
  const max = maxIso && isIsoDateString(maxIso) ? maxIso : todayIsoLocal()
  const [y, m, d] = max.split('-').map(Number)
  let year = y - BIRTH_DATE_DEFAULT_YEARS_AGO
  if (minIso && isIsoDateString(minIso)) {
    const minYear = Number(minIso.slice(0, 4))
    if (year < minYear) year = minYear
  }
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export type AUDateFieldProps = {
  id?: string
  value: string
  onChange: (isoDate: string) => void
  min?: string
  max?: string
  /** Birth-date UX: type dd/mm/yyyy, calendar opens ~30 years back, capped at today. */
  birthDate?: boolean
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
    birthDate = false,
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
  const hintId = birthDate ? `${inputId}-birth-hint` : undefined
  const effectiveMax = birthDate ? (max && isIsoDateString(max) ? max : todayIsoLocal()) : max
  const effectiveMin = birthDate ? (min && isIsoDateString(min) ? min : BIRTH_DATE_MIN) : min
  const hiddenRef = useRef<HTMLInputElement>(null)
  const [pickerDraftIso, setPickerDraftIso] = useState('')
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
    if (effectiveMin && isIsoDateString(effectiveMin) && parsed < effectiveMin) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
      return
    }
    if (effectiveMax && isIsoDateString(effectiveMax) && parsed > effectiveMax) {
      setText(value && isIsoDateString(value) ? formatIsoDateAuNumeric(value) : '')
      return
    }
    onChange(parsed)
    setText(formatIsoDateAuNumeric(parsed))
  }, [text, value, effectiveMin, effectiveMax, onChange])

  const openPicker = () => {
    const el = hiddenRef.current
    if (!el || disabled) return
    const anchor =
      birthDate && !isIsoDateString(value)
        ? birthDatePickerAnchorIso(effectiveMax, effectiveMin)
        : null
    if (anchor) {
      setPickerDraftIso(anchor)
    }
    window.requestAnimationFrame(() => {
      if (anchor) el.value = anchor
      try {
        el.showPicker?.()
      } catch {
        el.click()
      }
    })
  }

  const hiddenPickerValue = isIsoDateString(value) ? value : birthDate ? pickerDraftIso : ''

  return (
    <div className="w-full space-y-1">
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
        aria-describedby={[ariaDescribedBy, hintId].filter(Boolean).join(' ') || undefined}
        className={className}
      />
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className={
            calendarButtonClassName ??
            'rounded-lg border border-gray-900/20 px-2.5 py-2 text-stone-600 hover:bg-stone-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
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
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden
          value={hiddenPickerValue}
          min={effectiveMin}
          max={effectiveMax}
          onChange={(e) => {
            const v = e.target.value
            if (v && isIsoDateString(v)) {
              onChange(v)
              setText(formatIsoDateAuNumeric(v))
              setPickerDraftIso('')
            }
          }}
        />
      </div>
    </div>
    {birthDate ? (
      <p id={hintId} className="text-xs text-stone-500 leading-relaxed">
        Type <span className="font-medium">dd/mm/yyyy</span> (e.g. 06/12/1996). Or tap the calendar — then tap the{' '}
        <span className="font-medium">year</span> at the top to jump back quickly.
      </p>
    ) : null}
    </div>
  )
})
