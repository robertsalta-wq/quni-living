import type { LandlordListingFilterChip } from '../../../lib/landlordListingsGrouped'

const CHIPS: Array<{ id: LandlordListingFilterChip; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'draft', label: 'Draft' },
  { id: 'booked', label: 'Booked' },
  { id: 'paused', label: 'Paused' },
]

type Props = {
  active: LandlordListingFilterChip
  counts: Record<LandlordListingFilterChip, number>
  onChange: (chip: LandlordListingFilterChip) => void
}

/** Underline text-tabs (Edit Hub / admin Tabs pattern) — not pill chips. */
export default function LandlordListingsStatusChips({ active, counts, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Filter listings by status"
      className="-mb-px flex gap-0 overflow-x-auto border-b border-[var(--quni-line)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {CHIPS.map((chip) => {
        const isActive = active === chip.id
        const count = counts[chip.id]
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.id)}
            className={[
              'inline-flex shrink-0 items-baseline gap-1.5 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              isActive
                ? 'border-b-2 border-[var(--quni-coral)] text-[var(--quni-ink)] -mb-px'
                : 'border-b-2 border-transparent text-[var(--quni-ink-4)] hover:text-[var(--quni-ink)]',
            ].join(' ')}
          >
            <span>{chip.label}</span>
            <span
              className={[
                'tabular-nums text-[12px] font-medium',
                isActive ? 'text-[var(--quni-ink-4)]' : 'text-[var(--quni-ink-5)]',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
