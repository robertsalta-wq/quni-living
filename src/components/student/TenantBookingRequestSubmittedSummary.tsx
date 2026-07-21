import { Link } from 'react-router-dom'
import { formatIsoDateAuNumeric } from '../../lib/listingAvailabilityDates'
import { bookingReferenceLabel } from '../../lib/bookingReference'
import { landlordResponseExpiryLabel } from '../../lib/booking/landlordResponseExpiry'
import PaymentsSecuredByStripe from '../PaymentsSecuredByStripe'

type Props = {
  bookingId: string
  propertyTitle: string
  propertySuburb: string | null
  moveInDate: string
  leaseLength: string
  /** Quni Listing apply — no student payment or deposit hold through Quni. */
  isListing?: boolean
}

export default function TenantBookingRequestSubmittedSummary({
  bookingId,
  propertyTitle,
  propertySuburb,
  moveInDate,
  leaseLength,
  isListing = false,
}: Props) {
  const locationLine = [propertyTitle.trim() || 'Your listing', propertySuburb?.trim()].filter(Boolean).join(' · ')
  const moveInDisplay = formatIsoDateAuNumeric(moveInDate) || moveInDate

  const responseWindow = landlordResponseExpiryLabel(isListing ? 'listing' : 'managed')

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <section
        className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 shadow-sm text-left space-y-4"
        role="status"
        aria-live="polite"
        aria-labelledby="booking-success-heading"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Request submitted</p>
          <h1 id="booking-success-heading" className="mt-1 text-2xl font-bold text-gray-900">
            Your booking request was sent
          </h1>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            Reference <span className="font-mono font-semibold">{bookingReferenceLabel(bookingId)}</span>
            {' · '}
            {locationLine}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            <span className="text-gray-500">Move-in:</span> {moveInDisplay}
            {leaseLength ? (
              <>
                {' '}
                <span className="text-gray-400">·</span> {leaseLength}
              </>
            ) : null}
          </p>
        </div>

        <ul className="text-sm text-gray-800 space-y-3 list-none m-0 p-0">
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0" aria-hidden>
              ✓
            </span>
            <span>
              <span className="font-semibold">We received your application.</span> Your host has up to{' '}
              <span className="font-semibold">{responseWindow}</span> to accept or decline.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0" aria-hidden>
              ✓
            </span>
            <span>
              {isListing ? (
                <>
                  <span className="font-semibold">No payment through Quni.</span> This is a Quni Listing property — we did
                  not charge your card or hold a deposit. If your host accepts, you will pay bond directly to them (or via
                  the state bond authority where required) before move-in.
                </>
              ) : (
                <>
                  <span className="font-semibold">Deposit hold:</span> One week&apos;s rent is held securely on Stripe
                  until your host responds. If they decline, the hold is released automatically.
                </>
              )}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0" aria-hidden>
              ✓
            </span>
            <span>
              <span className="font-semibold">Track status:</span> Your dashboard shows &ldquo;Request submitted&rdquo;
              until your host decides. We&apos;ll email you when there&apos;s an update.
            </span>
          </li>
        </ul>
      </section>

      {!isListing ? <PaymentsSecuredByStripe align="center" className="mt-6 max-w-sm mx-auto" /> : null}

      <div className="mt-8 flex flex-col gap-3">
        <Link
          to="/student-dashboard?tab=bookings"
          className="inline-flex justify-center rounded-xl bg-[var(--quni-coral)] text-white px-5 py-3 text-sm font-semibold hover:bg-[var(--quni-coral-hover)]"
        >
          View on dashboard
        </Link>
        <Link
          to="/listings"
          className="inline-flex justify-center rounded-xl border border-gray-200 text-gray-800 px-5 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Browse more listings
        </Link>
      </div>
    </div>
  )
}
