import {
  BOOKINGS_SCHEDULE_VIEWS,
  type BookingsScheduleView,
} from '../../../lib/landlordBookingsScheduling'

type Props = {
  value: BookingsScheduleView
  onChange: (next: BookingsScheduleView) => void
}

/** iOS-style segmented control: Requests | Calendar | Timeline */
export default function BookingsViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Bookings view"
      className="inline-flex w-full max-w-md rounded-[10px] border border-[var(--quni-line)] bg-[#EFEDE6] p-[3px] sm:w-auto"
    >
      {BOOKINGS_SCHEDULE_VIEWS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 rounded-[8px] border-0 px-3 py-1.5 text-[12px] font-semibold transition-colors sm:flex-none sm:px-4',
              active
                ? 'bg-white text-[var(--quni-ink)] shadow-[0_1px_2px_rgba(8,6,13,0.08),0_1px_3px_rgba(8,6,13,0.06)]'
                : 'bg-transparent text-[var(--quni-ink-4)] hover:text-[var(--quni-ink-2)]',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
