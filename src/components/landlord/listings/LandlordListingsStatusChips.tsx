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

export default function LandlordListingsStatusChips({ active, counts, onChange }: Props) {
  return (
    <div className="relative -mx-4 sm:-mx-6">
      <div
        className="flex gap-1.5 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter listings by status"
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
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-[11px] py-1.5 text-[12px] font-semibold transition-colors',
                isActive
                  ? 'border-transparent bg-[rgba(255,111,97,0.14)] text-[var(--quni-coral-active)]'
                  : 'border-[var(--quni-line)] bg-white text-[var(--quni-ink-4)] hover:bg-[var(--quni-surface-2)]',
              ].join(' ')}
            >
              <span>{chip.label}</span>
              <span className="tabular-nums font-bold">{count}</span>
            </button>
          )
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-gray-50 to-transparent"
      />
    </div>
  )
}
