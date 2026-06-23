import { formatAudWeekly } from '../../lib/pricing/tenantInviteOffer'

type Props = {
  offeredWeeklyRentAud?: number | null
  bondAmountAud?: number | null
  listingWeeklyRentAud?: number | null
  offerReason?: string | null
  compact?: boolean
}

export default function TenantInviteOfferBanner({
  offeredWeeklyRentAud,
  bondAmountAud,
  listingWeeklyRentAud,
  offerReason,
  compact = false,
}: Props) {
  const showRent = offeredWeeklyRentAud != null && Number.isFinite(Number(offeredWeeklyRentAud))
  const showBond = bondAmountAud != null && Number.isFinite(Number(bondAmountAud))
  const showWas =
    showRent &&
    listingWeeklyRentAud != null &&
    Number.isFinite(Number(listingWeeklyRentAud)) &&
    Number(listingWeeklyRentAud) > Number(offeredWeeklyRentAud)

  if (!showRent && !showBond) return null

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 ${
        compact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm space-y-2'
      }`}
      role="status"
    >
      <p className="font-semibold">Your invite offer</p>
      {showRent ? (
        <p className={compact ? 'mt-1' : ''}>
          Weekly rent:{' '}
          <span className="font-bold tabular-nums">{formatAudWeekly(Number(offeredWeeklyRentAud))}/wk</span>
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
      ) : null}
      {showBond ? (
        <p className={compact ? 'mt-1' : ''}>
          Bond: <span className="font-bold tabular-nums">{formatAudWeekly(Number(bondAmountAud))}</span>
        </p>
      ) : null}
      {offerReason ? (
        <p className={`text-emerald-900/90 ${compact ? 'mt-1 text-xs' : 'text-xs leading-relaxed'}`}>
          &ldquo;{offerReason}&rdquo;
        </p>
      ) : null}
      {!compact ? (
        <p className="text-xs leading-relaxed text-emerald-900/85">
          These figures apply when you submit your booking request, subject to your occupancy selections.
        </p>
      ) : null}
    </div>
  )
}
