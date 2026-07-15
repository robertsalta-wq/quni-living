import type { RentBreakdownAud } from '../../lib/pricing/resolveWeeklyRent'
import {
  formatOccupantCountLabel,
  type CoTenantSnapshot,
} from '../../lib/pricing/bookingOccupancySnapshot'
import { formatDate } from '../../pages/admin/adminUi'

type Props = {
  occupantCount: number | null | undefined
  parkingSelected: boolean | null | undefined
  weeklyRent: number | null | undefined
  breakdown: RentBreakdownAud | null
  coTenant: CoTenantSnapshot | null
}

function fmtAud(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

export default function LandlordBookingOccupancySummary({
  occupantCount,
  parkingSelected,
  weeklyRent,
  breakdown,
  coTenant,
}: Props) {
  const occ = Math.floor(Number(occupantCount))
  const hasOccupancyData =
    (Number.isFinite(occ) && occ >= 1) ||
    parkingSelected === true ||
    breakdown != null ||
    coTenant != null

  if (!hasOccupancyData) return null

  const showBreakdown =
    breakdown != null &&
    (breakdown.couple != null || breakdown.parking != null || breakdown.base !== weeklyRent)

  return (
    <section className="rounded-admin-lg border border-admin-line-soft bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-admin-ink">
        Occupancy &amp; rent
      </h2>

      <dl className="text-sm space-y-2 text-admin-ink-3">
        <div className="flex justify-between gap-4">
          <dt className="text-admin-ink-5">Occupants</dt>
          <dd className="font-medium text-admin-ink text-right">{formatOccupantCountLabel(occupantCount)}</dd>
        </div>
        {parkingSelected === true ? (
          <div className="flex justify-between gap-4">
            <dt className="text-admin-ink-5">Carpark</dt>
            <dd className="font-medium text-admin-ink text-right">Included at booking</dd>
          </div>
        ) : null}
      </dl>

      {showBreakdown && breakdown ? (
        <div className="rounded-admin-md bg-admin-surface-2 border border-admin-line-soft px-4 py-3 space-y-1.5 text-sm">
          <p className="text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">Weekly rent breakdown</p>
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
          {weeklyRent != null && Number.isFinite(Number(weeklyRent)) ? (
            <div className="flex justify-between pt-1.5 border-t border-admin-line font-semibold text-admin-ink">
              <span>Total per week</span>
              <span className="tabular-nums">${fmtAud(Number(weeklyRent))}</span>
            </div>
          ) : null}
        </div>
      ) : weeklyRent != null && Number.isFinite(Number(weeklyRent)) ? (
        <p className="text-sm text-admin-ink-3">
          Weekly rent:{' '}
          <span className="font-semibold tabular-nums">${fmtAud(Number(weeklyRent))}</span>
        </p>
      ) : null}

      {coTenant ? (
        <div className="pt-3 border-t border-admin-line-soft space-y-2">
          <p className="text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">Co-tenant on lease</p>
          <dl className="text-sm space-y-1.5 text-admin-ink-3">
            <div className="flex justify-between gap-4">
              <dt className="text-admin-ink-5">Name</dt>
              <dd className="font-medium text-admin-ink text-right">{coTenant.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-admin-ink-5">Email</dt>
              <dd className="font-medium text-admin-ink text-right break-all">{coTenant.email}</dd>
            </div>
            {coTenant.phone ? (
              <div className="flex justify-between gap-4">
                <dt className="text-admin-ink-5">Phone</dt>
                <dd className="font-medium text-admin-ink text-right">{coTenant.phone}</dd>
              </div>
            ) : null}
            {coTenant.date_of_birth ? (
              <div className="flex justify-between gap-4">
                <dt className="text-admin-ink-5">Date of birth</dt>
                <dd className="font-medium text-admin-ink text-right">{formatDate(coTenant.date_of_birth)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </section>
  )
}
