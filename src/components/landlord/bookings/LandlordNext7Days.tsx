import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  buildNext7Days,
  next7DotClass,
  next7TagClass,
  type SchedulingBooking,
} from '../../../lib/landlordBookingsScheduling'
import { landlordBookingsPath } from '../../../lib/userDashboardNav'

type Props = {
  bookings: SchedulingBooking[]
}

export default function LandlordNext7Days({ bookings }: Props) {
  const items = useMemo(() => buildNext7Days(bookings), [bookings])
  const calendarHref = landlordBookingsPath('calendar')

  if (items.length === 0) return null

  return (
    <section className="mb-6 rounded-2xl border border-[#E5E4E7] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(8,6,13,0.08),0_1px_3px_rgba(8,6,13,0.06)]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#08060D]">Next 7 days</h2>
        <Link
          to={calendarHref}
          className="text-xs font-semibold text-[#FF6F61] hover:text-[#e85d52]"
        >
          Open calendar →
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={calendarHref}
              className="flex items-start gap-3 rounded-xl border border-transparent px-1 py-1.5 hover:border-[#E5E4E7] hover:bg-[#F8F6F1]/80 transition-colors"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${next7DotClass(item.tag)}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${next7TagClass(item.tag)}`}
                  >
                    {item.tag}
                  </span>
                  {item.subtitle ? (
                    <span className="text-[11px] text-[#908897]">{item.subtitle}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm font-medium text-[#2A2433]">{item.title}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
