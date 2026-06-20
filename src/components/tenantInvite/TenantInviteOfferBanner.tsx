import { formatAudWeekly } from '../../lib/pricing/tenantInviteOffer'

type Props = {
  offeredWeeklyRentAud: number
  listingWeeklyRentAud?: number | null
  offerReason?: string | null
  compact?: boolean
}

export default function TenantInviteOfferBanner({
  offeredWeeklyRentAud,
  listingWeeklyRentAud,
  offerReason,
  compact = false,
}: Props) {
  const showWas =
    listingWeeklyRentAud != null &&
    Number.isFinite(Number(listingWeeklyRentAud)) &&
    Number(listingWeeklyRentAud) > offeredWeeklyRentAud

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 ${
        compact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm space-y-2'
      }`}
      role="status"
    >
      <p className={`font-semibold ${compact ? '' : ''}`}>Special rent offer</p>
      <p className={compact ? 'mt-1' : ''}>
        Your landlord invited you at{' '}
        <span className="font-bold tabular-nums">{formatAudWeekly(offeredWeeklyRentAud)}/wk</span>
        {showWas ? (
          <>
            {' '}
            <span className="text-emerald-800/80">
              (listing from {formatAudWeekly(Number(listingWeeklyRentAud))}/wk)
            </span>
          </>
        ) : null}
        .
      </p>
      {offerReason ? (
        <p className={`text-emerald-900/90 ${compact ? 'mt-1 text-xs' : 'text-xs leading-relaxed'}`}>
          &ldquo;{offerReason}&rdquo;
        </p>
      ) : null}
      {!compact ? (
        <p className="text-xs leading-relaxed text-emerald-900/85">
          This is the weekly rent that will apply when you submit your booking request, subject to your occupancy
          selections.
        </p>
      ) : null}
    </div>
  )
}
