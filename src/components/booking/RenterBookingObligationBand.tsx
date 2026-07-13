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
      className={`rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm ${className}`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Action needed</p>
      <p className="mt-1 text-lg sm:text-xl font-bold text-amber-950 leading-snug">{band.title}</p>
      <p className="mt-1.5 text-sm text-amber-900 leading-relaxed">{band.detail}</p>
    </section>
  )
}
