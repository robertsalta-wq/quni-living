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
  const [formatError, setFormatError] = useState(false)
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
      setFormatError(false)
      return
    }
    const parsed = parseAuNumericDateToIso(trimmed)
    if (!parsed) {
      setFormatError(birthDate)
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
    setFormatError(false)
  }, [text, value, effectiveMin, effectiveMax, onChange, birthDate])

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
  const formatErrorId = birthDate ? `${inputId}-birth-format-error` : undefined

  return (
    <div className="w-full space-y-2">
      {birthDate ? (
        <div
          id={hintId}
          className="rounded-lg border border-[#FF6F61]/30 bg-[#FFF8F0] px-3 py-2.5 text-sm text-stone-800 leading-relaxed"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF6F61]">
            How to enter your birth date
          </p>
          <p className="mt-1.5">
            <span className="font-semibold text-stone-900">Easiest:</span> type in the box as{' '}
            <span className="font-semibold">day / month / year</span> — for example{' '}
            <span className="font-semibold tabular-nums">06/12/1996</span> for 6 December 1996.
          </p>
          <p className="mt-1.5 text-stone-700">
            <span className="font-semibold text-stone-900">Or</span> tap{' '}
            <span className="font-semibold">Pick date</span>, then tap the{' '}
            <span className="font-semibold">year</span> at the top of the calendar to jump back to your birth year.
          </p>
        </div>
      ) : null}
      <div className="flex w-full gap-1.5 items-stretch">
      <input
        ref={ref}
        id={inputId}
        type="text"
        inputMode="numeric"
        placeholder={birthDate ? 'e.g. 06/12/1996' : 'dd/mm/yyyy'}
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
        onChange={(e) => {
          setText(e.target.value)
          if (formatError) setFormatError(false)
        }}
        aria-invalid={ariaInvalid || formatError || undefined}
        aria-describedby={[ariaDescribedBy, hintId, formatError ? formatErrorId : undefined]
          .filter(Boolean)
          .join(' ') || undefined}
        className={className}
      />
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className={
            calendarButtonClassName ??
            (birthDate
              ? 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#FF6F61]/40 bg-white px-3 py-2 text-sm font-semibold text-[#FF6F61] hover:bg-[#FFF8F0] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 min-w-[5.5rem]'
              : 'rounded-lg border border-gray-900/20 px-2.5 py-2 text-stone-600 hover:bg-stone-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white')
          }
          aria-label={birthDate ? 'Pick date from calendar' : 'Choose date'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          {birthDate ? <span>Pick date</span> : null}
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
              setFormatError(false)
            }
          }}
        />
      </div>
    </div>
    {formatError ? (
      <p id={formatErrorId} className="text-xs text-red-700" role="alert">
        Use day/month/year with slashes, e.g. <span className="font-semibold tabular-nums">06/12/1996</span>.
      </p>
    ) : null}
    </div>
  )
})
