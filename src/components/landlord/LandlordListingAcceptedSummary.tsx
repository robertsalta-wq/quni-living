import { Link } from 'react-router-dom'
import { formatDate } from '../../pages/admin/adminUi'

type Props = {
  bookingReference: string
  propertyTitle: string
  propertyAddress: string
  bondAmountAud: number | null
  bondDeadlineIso: string | null
  listingFeeDisplay: string
  justAccepted?: boolean
  onDismissCelebration?: () => void
}

function formatBondDeadline(iso: string | null): string {
  if (!iso?.trim()) return 'the deadline shown in your email'
  const d = iso.slice(0, 10)
  return formatDate(d) || d
}

export default function LandlordListingAcceptedSummary({
  bookingReference,
  propertyTitle,
  propertyAddress,
  bondAmountAud,
  bondDeadlineIso,
  listingFeeDisplay,
  justAccepted = false,
  onDismissCelebration,
}: Props) {
  const locationLine = propertyAddress.trim() || propertyTitle.trim() || 'your listing'
  const bondLine =
    bondAmountAud != null && Number.isFinite(bondAmountAud) && bondAmountAud > 0
      ? `$${bondAmountAud.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
      : 'the amount on your listing'

  return (
    <section
      id="listing-accepted-summary"
      className="scroll-mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6 shadow-sm space-y-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {justAccepted ? 'Booking accepted' : 'Listing booking confirmed'}
          </p>
          <h2
            className="mt-1 text-xl font-semibold text-gray-900"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {justAccepted ? 'Congratulations — you confirmed this booking' : 'What happens next'}
          </h2>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            Reference <span className="font-mono font-semibold">{bookingReference}</span>
            {' · '}
            {locationLine}
          </p>
          {justAccepted && (
            <p className="mt-2 text-sm text-emerald-900 leading-relaxed">
              We&apos;ve emailed you and the renter with the same summary below.
            </p>
          )}
        </div>
        {justAccepted && onDismissCelebration && (
          <button
            type="button"
            onClick={onDismissCelebration}
            className="shrink-0 text-xs font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
          >
            Dismiss
          </button>
        )}
      </div>

      <ul className="text-sm text-gray-800 space-y-3 list-none m-0 p-0">
        <li className="flex gap-2">
          <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Listing fee ({listingFeeDisplay}):</span> Charged to your saved card. This
            includes your state-appropriate{' '}
            <span className="font-semibold">tenancy agreement draft</span> — the renter can preview it now; both of you
            sign electronically after you confirm bond receipt.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Bond ({bondLine}):</span> Collect directly from the renter off-platform (bank
            transfer, cash, or as agreed). Quni does not hold bond on Listing stays.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Deadline:</span> Confirm bond receipt on Quni before{' '}
            <span className="font-semibold">{formatBondDeadline(bondDeadlineIso)}</span> so the booking stays active.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Renter deposit:</span> The holding deposit on Quni has been released back to
            the renter.
          </span>
        </li>
      </ul>

      <p className="text-sm text-gray-700 leading-relaxed pt-1 border-t border-emerald-200/80">
        When bond is in your account, use{' '}
        <span className="font-semibold">Bond received from renter</span> at the bottom of this page. The agreement then
        becomes ready to sign. You can also review the draft in{' '}
        <a href="#tenancy-agreement-preview" className="font-semibold text-[#FF6F61] underline underline-offset-2">
          Tenancy agreement
        </a>{' '}
        below, or return anytime from{' '}
        <Link to="/landlord/dashboard?tab=bookings" className="font-semibold text-[#FF6F61] underline underline-offset-2">
          Bookings on your dashboard
        </Link>
        .
      </p>
    </section>
  )
}
