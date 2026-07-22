import { Link } from 'react-router-dom'
import { formatDate } from '../../pages/admin/adminUi'
import LandlordListingBondObligations from './LandlordListingBondObligations'
import type { ListingBondPaymentLandlordObligations } from '../../lib/tenancy/listingBondPaymentCopy'

type Props = {
  bookingReference: string
  propertyTitle: string
  propertyAddress: string
  bondAmountAud: number | null
  bondDeadlineIso: string | null
  listingFeeDisplay: string
  bondObligations?: ListingBondPaymentLandlordObligations | null
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
  bondObligations = null,
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
      className="scroll-mt-4 rounded-admin-lg border border-admin-success bg-admin-success-bg p-5 sm:p-6 shadow-sm space-y-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-success-fg">
            {justAccepted ? 'Booking accepted' : 'Listing booking confirmed'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-admin-ink">
            {justAccepted ? 'Congratulations - you confirmed this booking' : 'What happens next'}
          </h2>
          <p className="mt-2 text-sm text-admin-ink-3 leading-relaxed">
            Reference <span className="font-mono font-semibold">{bookingReference}</span>
            {' · '}
            {locationLine}
          </p>
          {justAccepted && (
            <p className="mt-2 text-sm text-admin-success-fg leading-relaxed">
              We&apos;ve emailed you and the renter with the same summary below.
            </p>
          )}
        </div>
        {justAccepted && onDismissCelebration && (
          <button
            type="button"
            onClick={onDismissCelebration}
            className="shrink-0 text-xs font-medium text-admin-success-fg underline underline-offset-2 hover:text-admin-success-fg"
          >
            Dismiss
          </button>
        )}
      </div>

      <ul className="text-sm text-admin-ink-2 space-y-3 list-none m-0 p-0">
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Listing fee ({listingFeeDisplay}):</span> Charged to your saved card. This
            includes your state-appropriate{' '}
            <span className="font-semibold">tenancy agreement</span> - both parties should receive a Quni signing
            email now (or use the signing link on this page).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Bond ({bondLine}):</span>{' '}
            {bondObligations
              ? `Offer the renter the state bond authority route first, or accept payment to you - see obligations below. Quni does not hold bond.`
              : `Collect directly from the renter off-platform (bank transfer, cash, or as agreed). Quni does not hold bond on Listing stays.`}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Deadline:</span> Confirm bond receipt on Quni before{' '}
            <span className="font-semibold">{formatBondDeadline(bondDeadlineIso)}</span> so the booking stays active.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Renter deposit:</span> The holding deposit on Quni has been released back to
            the renter.
          </span>
        </li>
      </ul>

      {bondObligations && <LandlordListingBondObligations obligations={bondObligations} embedded />}

      <p className="text-sm text-admin-ink-3 leading-relaxed pt-1 border-t border-admin-success/80">
        When bond is received (paid to you or lodged with the authority), use{' '}
        <span className="font-semibold">Bond received from renter</span> at the bottom of this page. You can review or sign
        the agreement in{' '}
        <a href="#tenancy-agreement-preview" className="font-semibold text-admin-coral underline underline-offset-2">
          Tenancy agreement
        </a>{' '}
        below, or return anytime from{' '}
        <Link to="/landlord/dashboard?tab=bookings" className="font-semibold text-admin-coral underline underline-offset-2">
          Bookings on your dashboard
        </Link>
        .
      </p>
    </section>
  )
}
