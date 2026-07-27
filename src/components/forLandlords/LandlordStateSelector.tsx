import type { CSSProperties } from 'react'
import type { LandlordDeskState } from '../../lib/forLandlordsState'
import { LANDLORD_DESK_STATES, LANDLORD_STATE_FACTS } from '../../lib/forLandlordsState'

type LandlordStateSelectorProps = {
  state: LandlordDeskState
  onChange: (state: LandlordDeskState) => void
  className?: string
  style?: CSSProperties
}

/** Section 2 — NSW·QLD factual context only; never a legal answer. */
export default function LandlordStateSelector({
  state,
  onChange,
  className = '',
  style,
}: LandlordStateSelectorProps) {
  return (
    <div
      className={[
        'desk-settle flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)]',
        'bg-[var(--quni-surface-1)] px-4 py-3 shadow-[var(--shadow-1)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--quni-ink-5)]">
          Your state
        </span>
        <div
          className="inline-flex rounded-[var(--radius-pill)] border border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)] p-0.5"
          role="group"
          aria-label="Select state for factual context"
        >
          {LANDLORD_DESK_STATES.map((code) => {
            const active = state === code
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(code)}
                className={[
                  'rounded-[var(--radius-pill)] px-3.5 py-1 text-[11px] font-extrabold tracking-[0.06em] transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
                  active
                    ? 'bg-[var(--quni-navy)] text-white'
                    : 'bg-transparent text-[var(--quni-ink-4)] hover:text-[var(--quni-ink-2)]',
                ].join(' ')}
              >
                {code}
              </button>
            )
          })}
        </div>
        <span className="text-[10px] font-semibold text-[var(--quni-ink-4)]">
          Bond scheme: {LANDLORD_STATE_FACTS[state].bondScheme}
        </span>
      </div>
      <p className="m-0 text-[10px] font-semibold text-[var(--quni-ink-5)]">
        Not in NSW or QLD? Quni Listing is not available in your state yet.
      </p>
    </div>
  )
}
