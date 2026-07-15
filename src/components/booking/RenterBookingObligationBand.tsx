import {
  renterBookingObligation,
  type RenterObligationBooking,
  type RenterObligationProperty,
} from '../../lib/booking/renterBookingObligation'

type Props = {
  booking: RenterObligationBooking
  property?: RenterObligationProperty
  className?: string
}

/**
 * Pinned warning band for outstanding renter obligations.
 * Reads current booking state only — never booking_events.
 */
export default function RenterBookingObligationBand({ booking, property, className = '' }: Props) {
  const band = renterBookingObligation(booking, property)
  if (!band) return null

  return (
    <section
      className={`rounded-admin-lg border border-admin-warning bg-admin-warning-bg px-4 py-4 sm:px-5 sm:py-5 shadow-sm ${className}`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-warning-fg">Action needed</p>
      <p className="mt-1 text-lg sm:text-xl font-bold text-admin-warning-fg leading-snug">{band.title}</p>
      <p className="mt-1.5 text-sm text-admin-warning-fg leading-relaxed">{band.detail}</p>
    </section>
  )
}
