import { Link } from 'react-router-dom'
import type { TenantBookingStatus } from '../../lib/tenantCurrentBooking'
import { tenantDashboardStatusStrip } from '../../lib/tenantBookingStatus'

export default function StudentDashboardBookingStatusStrip({ status }: { status: TenantBookingStatus }) {
  const strip = tenantDashboardStatusStrip(status)
  if (!strip) return null

  return (
    <section className={strip.containerClass} aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-4">{strip.eyebrow}</p>
      <p className="mt-1 text-lg sm:text-xl font-bold text-admin-ink leading-snug">{strip.title}</p>
      <p className="mt-1.5 text-sm text-admin-ink-3 leading-relaxed">{strip.detail}</p>
      {status === 'awaiting_info' && (
        <Link
          to="/messages"
          className="mt-3 inline-flex text-sm font-semibold text-admin-coral hover:text-admin-ink"
        >
          Open messages →
        </Link>
      )}
    </section>
  )
}
