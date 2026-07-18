import {
  formatAudWeekly,
  parseRentOverrideProvenance,
} from '../../lib/pricing/rentAgreedOverride'
import { bookingHasInviteOfferProvenance } from '../../lib/pricing/tenantInviteOffer'

type Props = {
  weeklyRent: number | null | undefined
  rentBreakdown: unknown
  bondAmount?: number | null
  audience: 'landlord' | 'student'
  /** Strip bordered card chrome when nested inside SurfaceCard / editor. */
  embedded?: boolean
}

export default function BookingAgreedRentNotice({
  weeklyRent,
  rentBreakdown,
  bondAmount,
  audience,
  embedded = false,
}: Props) {
  const prov = parseRentOverrideProvenance(rentBreakdown)
  if (!prov.overrideApplied) return null

  const applyRent = prov.applyWeeklyRentAud
  const agreedRent = weeklyRent != null ? Number(weeklyRent) : prov.agreedWeeklyRentAud

  const tone =
    audience === 'student'
      ? 'border-admin-info bg-admin-info-bg text-admin-info-fg'
      : 'border-admin-warning bg-admin-warning-bg text-admin-warning-fg'

  return (
    <div
      className={
        embedded
          ? `text-sm space-y-2 ${audience === 'student' ? 'text-admin-info-fg' : 'text-admin-warning-fg'}`
          : `rounded-admin-md border px-4 py-3 text-sm space-y-2 ${tone}`
      }
      role="status"
    >
      <p className="font-semibold">
        {audience === 'student' ? 'Agreed weekly rent' : 'Agreed rent override active'}
      </p>
      <dl className="space-y-1">
        {applyRent != null && agreedRent != null && applyRent !== agreedRent ? (
          <div className="flex justify-between gap-4">
            <dt className="opacity-80">Applied at</dt>
            <dd className="font-medium tabular-nums line-through opacity-70">{formatAudWeekly(applyRent)}/wk</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="opacity-80">Agreed weekly rent</dt>
          <dd className="font-semibold tabular-nums">{formatAudWeekly(agreedRent)}/wk</dd>
        </div>
        {bondAmount != null && Number.isFinite(Number(bondAmount)) ? (
          <div className="flex justify-between gap-4">
            <dt className="opacity-80">Bond for this booking</dt>
            <dd className="font-medium tabular-nums">{formatAudWeekly(Number(bondAmount))}</dd>
          </div>
        ) : null}
      </dl>
      {audience === 'student' ? (
        <p className="text-xs leading-relaxed opacity-90">
          {bookingHasInviteOfferProvenance(rentBreakdown)
            ? 'Your host included this special rent offer in your invite. It will appear on your tenancy agreement when you sign.'
            : 'Your host set this agreed rent before accepting your application. It will appear on your tenancy agreement when you sign.'}
        </p>
      ) : (
        <p className="text-xs leading-relaxed opacity-90">
          The student sees this agreed figure before they accept or sign. Listing price is unchanged.
        </p>
      )}
    </div>
  )
}
