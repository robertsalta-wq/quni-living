import { useId, useState } from 'react'
import './desk.css'

const RENT_MIN = 150
const RENT_MAX = 700
const RENT_STEP = 10
const RENT_DEFAULT = 350
const ROOMS_MIN = 1
const ROOMS_MAX = 5

function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

type LedgerCalculatorProps = {
  /** Called when weekly rent changes (letterhead binds to this). */
  onRentChange?: (weeklyRent: number) => void
  className?: string
  compact?: boolean
  /** `/home-v4` — tighter spacing only; same colours and type tokens as the ledger card. */
  slim?: boolean
}

/** Landlord desk in-tray — visitor-driven ledger. No market estimates. */
export default function LedgerCalculator({
  onRentChange,
  className = '',
  compact = false,
  slim = false,
}: LedgerCalculatorProps) {
  const [rent, setRent] = useState(RENT_DEFAULT)
  const [rooms, setRooms] = useState(ROOMS_MIN)
  const statusId = useId()

  const weeklyTotal = rent * rooms
  const yearly = weeklyTotal * 52

  function updateRent(next: number) {
    setRent(next)
    onRentChange?.(next)
  }

  return (
    <div
      className={[
        'rounded-xl bg-[var(--quni-surface-1)] text-[var(--quni-ink)] shadow-[0_2px_10px_rgba(0,0,0,0.22)]',
        slim ? 'px-2.5 py-2' : compact ? 'px-3.5 py-3.5' : 'px-3.5 pb-3 pt-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'flex items-baseline justify-between gap-3 border-b border-[var(--quni-line)]',
          slim ? 'pb-1' : 'pb-2',
        ].join(' ')}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
          Room rent · per week
        </span>
        <span className="font-[family-name:var(--font-sans)] text-[17px] font-bold tabular-nums">
          {formatAud(rent)}
        </span>
      </div>

      <div className={slim ? 'mt-1' : 'mt-2'}>
        <input
          type="range"
          className="desk-range"
          min={RENT_MIN}
          max={RENT_MAX}
          step={RENT_STEP}
          value={rent}
          aria-label="Room rent per week"
          onChange={(e) => updateRent(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Home') {
              e.preventDefault()
              updateRent(RENT_MIN)
            } else if (e.key === 'End') {
              e.preventDefault()
              updateRent(RENT_MAX)
            }
          }}
        />
        {slim ? null : (
          <div className="mt-1 flex justify-between text-[10.5px] text-[var(--quni-ink-5)]">
            <span>{formatAud(RENT_MIN)}</span>
            <span>{formatAud(RENT_MAX)}</span>
          </div>
        )}
      </div>

      <div
        className={[
          slim ? 'mt-1.5' : 'mt-2.5',
          'flex items-center justify-between gap-3 border-b border-[var(--quni-line)]',
          slim ? 'pb-1' : 'pb-2',
        ].join(' ')}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
          Rooms to let
        </span>
        <div
          className="inline-flex overflow-hidden rounded-lg border border-[var(--quni-line)] bg-[var(--quni-surface-2)]"
          role="group"
          aria-label="Rooms to let"
        >
          <button
            type="button"
            aria-label="One room fewer"
            disabled={rooms <= ROOMS_MIN}
            onClick={() => setRooms((r) => Math.max(ROOMS_MIN, r - 1))}
            className={[
              'flex items-center justify-center font-semibold text-[var(--quni-ink-2)]',
              'hover:bg-[var(--quni-coral-tint)] disabled:cursor-not-allowed disabled:opacity-40',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral)]',
              slim || !compact ? 'h-7 w-[30px]' : 'h-[34px] w-[34px]',
            ].join(' ')}
          >
            −
          </button>
          <span
            className={[
              'flex min-w-[2.25rem] items-center justify-center border-x border-[var(--quni-line)]',
              'font-[family-name:var(--font-sans)] font-bold tabular-nums text-[var(--quni-ink)]',
              slim || !compact ? 'text-base' : 'text-[15px]',
            ].join(' ')}
            aria-live="polite"
          >
            {rooms}
          </span>
          <button
            type="button"
            aria-label="One room more"
            disabled={rooms >= ROOMS_MAX}
            onClick={() => setRooms((r) => Math.min(ROOMS_MAX, r + 1))}
            className={[
              'flex items-center justify-center font-semibold text-[var(--quni-ink-2)]',
              'hover:bg-[var(--quni-coral-tint)] disabled:cursor-not-allowed disabled:opacity-40',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral)]',
              slim || !compact ? 'h-7 w-[30px]' : 'h-[34px] w-[34px]',
            ].join(' ')}
          >
            +
          </button>
        </div>
      </div>

      {rooms >= 2 ? (
        <p
          className={[
            slim ? 'mt-1.5 pb-1' : 'mt-2.5 pb-2.5',
            'border-b border-[var(--quni-line)] text-[13px] text-[var(--quni-ink-3)]',
          ].join(' ')}
        >
          {rooms} rooms × {formatAud(rent)} = {formatAud(weeklyTotal)}/wk
        </p>
      ) : null}

      <div
        className={[
          slim ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2',
          'border-t-[2px] border-double border-[var(--quni-ink-4)]',
        ].join(' ')}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
            Your figure, a year
          </span>
          <span
            id={statusId}
            role="status"
            aria-live="polite"
            className={[
              'font-[family-name:var(--font-sans)] font-bold leading-none tabular-nums',
              slim || !compact ? 'text-[22px]' : 'text-[26px]',
            ].join(' ')}
          >
            {formatAud(yearly)}
          </span>
        </div>
      </div>

      <p className={[slim ? 'mt-1' : 'mt-1.5', 'text-[10px] text-[var(--quni-ink-5)]'].join(' ')}>
        Your own figures, before costs. Not a Quni estimate.
      </p>
    </div>
  )
}

export { RENT_DEFAULT }
