import { Link } from 'react-router-dom'
import type { TenantBookingStatus } from '../../lib/tenantCurrentBooking'
import { tenantDashboardStatusStrip } from '../../lib/tenantBookingStatus'

export default function StudentDashboardBookingStatusStrip({ status }: { status: TenantBookingStatus }) {
  const strip = tenantDashboardStatusStrip(status)
  if (!strip) return null

  return (
    <section className={strip.containerClass} aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{strip.eyebrow}</p>
      <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900 leading-snug">{strip.title}</p>
      <p className="mt-1.5 text-sm text-gray-700 leading-relaxed">{strip.detail}</p>
      {status === 'awaiting_info' && (
        <Link
          to="/messages"
          className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          Open messages →
        </Link>
      )}
    </section>
  )
}
