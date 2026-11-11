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
  bondObligations?: ListingBondPaymentLandlordObligations | null
  agreementBondLine?: string | null
  confirmPhrase?: 'confirm once lodged' | 'confirm once received' | null
  justAccepted?: boolean
  onDismissCelebration?: () => void
  signAgreementUrl?: string | null
  landlordHasSigned?: boolean
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
  bondObligations = null,
  agreementBondLine = null,
  confirmPhrase = null,
  justAccepted = false,
  onDismissCelebration,
  signAgreementUrl = null,
  landlordHasSigned = false,
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
              The agreement is on its way to both of you to sign.
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
        {signAgreementUrl && !landlordHasSigned ? (
          <li className="flex gap-2">
            <span className="text-admin-success font-bold shrink-0" aria-hidden>
              1
            </span>
            <span>
              <span className="font-semibold">Next step: Sign the agreement.</span>{' '}
              <a
                href={signAgreementUrl}
                className="inline-flex mt-2 min-h-[2.5rem] items-center justify-center rounded-admin-md bg-admin-coral px-4 py-2 text-sm font-semibold text-white"
              >
                Sign the agreement
              </a>
            </span>
          </li>
        ) : null}
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Booking accepted.</span> The agreement is on its way to both of you to
            sign. You can also sign from this page once it is ready.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Quni lease fee:</span> Charged only once everyone has signed. Nothing is
            charged for accepting.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-admin-success font-bold shrink-0" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-semibold">Next step is the bond ({bondLine}).</span>{' '}
            {agreementBondLine
              ? agreementBondLine
              : bondObligations
                ? 'Offer the renter the state bond authority route first, or accept payment to you. See the obligations below. Quni does not hold bond.'
                : 'Bond follows the agreement for this booking.'}{' '}
            {confirmPhrase
              ? `${confirmPhrase[0].toUpperCase()}${confirmPhrase.slice(1)}`
              : 'Confirm'}{' '}
            on Quni before <span className="font-semibold">{formatBondDeadline(bondDeadlineIso)}</span> so the booking
            stays active.
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
