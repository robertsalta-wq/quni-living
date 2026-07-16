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
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
      role="tablist"
      aria-label="Filter listings by status"
    >
      {CHIPS.map((chip) => {
        const isActive = active === chip.id
        const count = counts[chip.id]
        const showCount = chip.id !== 'paused' || count > 0 || isActive
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.id)}
            className={[
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
              isActive
                ? 'border-transparent bg-[rgba(255,111,97,0.14)] text-[#CC4A3C]'
                : 'border-[#E5E4E7] bg-white text-[#6B6375] hover:bg-[#FBFAF7]',
            ].join(' ')}
          >
            <span>{chip.label}</span>
            {showCount ? (
              <span className="tabular-nums font-bold">{count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
