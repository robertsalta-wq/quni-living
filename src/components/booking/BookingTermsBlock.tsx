import { formatDate } from '../../pages/admin/adminUi'
import { formatOccupantCountLabel, type CoTenantSnapshot } from '../../lib/pricing/bookingOccupancySnapshot'
import type { RentBreakdownAud } from '../../lib/pricing/resolveWeeklyRent'
import {
  computeBookingMoneyBlockLines,
  type BookingMoneyBlockInput,
} from '../../lib/booking/bookingMoneyBlock'

export type BookingTermsBlockProps = {
  money: BookingMoneyBlockInput
  moveInIso: string | null
  leaseLength: string | null
  occupantCount: number | null
  parkingSelected: boolean | null
  coTenant: CoTenantSnapshot | null
  breakdown: RentBreakdownAud | null
  serviceTierTitle: string
}

function fmtAud(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

/** Zone 3 shared shape — money block (§4 + §4.1) leads, then the terms `dl`. Landlord + renter mirror this. */
export default function BookingTermsBlock({
  money,
  moveInIso,
  leaseLength,
  occupantCount,
  parkingSelected,
  coTenant,
  breakdown,
  serviceTierTitle,
}: BookingTermsBlockProps) {
  const lines = computeBookingMoneyBlockLines(money)
  const showBreakdown =
    breakdown != null && (breakdown.couple != null || breakdown.parking != null || breakdown.base !== money.weeklyRentAud)

  return (
    <div className="space-y-5">
      <div className="divide-y divide-admin-line-soft overflow-hidden rounded-admin-md border border-admin-line-soft">
        {lines.map((line) => (
          <div
            key={line.key}
            className={`flex items-start justify-between gap-4 px-4 py-3 ${
              line.emphasis ? 'bg-admin-surface-2' : 'bg-white'
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm ${line.emphasis ? 'font-semibold text-admin-ink' : 'text-admin-ink-3'}`}>
                {line.label}
              </p>
              {line.helpText ? <p className="mt-0.5 text-xs leading-snug text-admin-ink-5">{line.helpText}</p> : null}
            </div>
            <p className={`shrink-0 text-sm tabular-nums ${line.emphasis ? 'font-semibold text-admin-ink' : 'text-admin-ink-2'}`}>
              {line.valueLabel}
            </p>
          </div>
        ))}
      </div>

      {showBreakdown && breakdown ? (
        <div className="space-y-1.5 border-t border-admin-line-soft pt-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-5">Weekly rent breakdown</p>
          <div className="flex justify-between">
            <span className="text-admin-ink-4">Base rent</span>
            <span className="tabular-nums font-medium">${fmtAud(breakdown.base)}</span>
          </div>
          {breakdown.couple != null && breakdown.couple > 0 ? (
            <div className="flex justify-between">
              <span className="text-admin-ink-4">Second person</span>
              <span className="tabular-nums font-medium">+${fmtAud(breakdown.couple)}</span>
            </div>
          ) : null}
          {breakdown.parking != null && breakdown.parking > 0 && parkingSelected ? (
            <div className="flex justify-between">
              <span className="text-admin-ink-4">Carpark</span>
              <span className="tabular-nums font-medium">+${fmtAud(breakdown.parking)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-admin-ink-5">Move-in</dt>
          <dd className="font-medium text-admin-ink">{formatDate(moveInIso ?? '')}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-admin-ink-5">Lease</dt>
          <dd className="font-medium text-admin-ink">{leaseLength?.trim() || '-'}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-admin-ink-5">Occupants</dt>
          <dd className="font-medium text-admin-ink">{formatOccupantCountLabel(occupantCount)}</dd>
        </div>
        {parkingSelected === true ? (
          <div>
            <dt className="text-[11px] text-admin-ink-5">Carpark</dt>
            <dd className="font-medium text-admin-ink">Included at booking</dd>
          </div>
        ) : null}
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-[11px] text-admin-ink-5">Service model</dt>
          <dd className="font-medium text-admin-ink">{serviceTierTitle}</dd>
        </div>
      </dl>

      {coTenant ? (
        <div className="space-y-2 border-t border-admin-line-soft pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-5">Co-tenant on lease</p>
          <dl className="space-y-1.5 text-sm text-admin-ink-3">
            <div className="flex justify-between gap-4">
              <dt className="text-admin-ink-5">Name</dt>
              <dd className="text-right font-medium text-admin-ink">{coTenant.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-admin-ink-5">Email</dt>
              <dd className="break-all text-right font-medium text-admin-ink">{coTenant.email}</dd>
            </div>
            {coTenant.phone ? (
              <div className="flex justify-between gap-4">
                <dt className="text-admin-ink-5">Phone</dt>
                <dd className="text-right font-medium text-admin-ink">{coTenant.phone}</dd>
              </div>
            ) : null}
            {coTenant.date_of_birth ? (
              <div className="flex justify-between gap-4">
                <dt className="text-admin-ink-5">Date of birth</dt>
                <dd className="text-right font-medium text-admin-ink">{formatDate(coTenant.date_of_birth)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
