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
      className="inline-flex w-full max-w-md rounded-[10px] border border-admin-line bg-admin-line-soft p-[3px] sm:w-auto"
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
                ? 'bg-admin-surface-1 text-admin-ink shadow-admin-card'
                : 'bg-transparent text-admin-ink-4 hover:text-admin-ink-2',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
