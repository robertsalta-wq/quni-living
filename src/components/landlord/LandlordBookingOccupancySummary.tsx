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
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Occupancy &amp; rent
      </h2>

      <dl className="text-sm space-y-2 text-gray-700">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Occupants</dt>
          <dd className="font-medium text-gray-900 text-right">{formatOccupantCountLabel(occupantCount)}</dd>
        </div>
        {parkingSelected === true ? (
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Carpark</dt>
            <dd className="font-medium text-gray-900 text-right">Included at booking</dd>
          </div>
        ) : null}
      </dl>

      {showBreakdown && breakdown ? (
        <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 space-y-1.5 text-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weekly rent breakdown</p>
          <div className="flex justify-between">
            <span className="text-gray-600">Base rent</span>
            <span className="tabular-nums font-medium">${fmtAud(breakdown.base)}</span>
          </div>
          {breakdown.couple != null && breakdown.couple > 0 ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Second person</span>
              <span className="tabular-nums font-medium">+${fmtAud(breakdown.couple)}</span>
            </div>
          ) : null}
          {breakdown.parking != null && breakdown.parking > 0 && parkingSelected ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Carpark</span>
              <span className="tabular-nums font-medium">+${fmtAud(breakdown.parking)}</span>
            </div>
          ) : null}
          {weeklyRent != null && Number.isFinite(Number(weeklyRent)) ? (
            <div className="flex justify-between pt-1.5 border-t border-stone-200 font-semibold text-gray-900">
              <span>Total per week</span>
              <span className="tabular-nums">${fmtAud(Number(weeklyRent))}</span>
            </div>
          ) : null}
        </div>
      ) : weeklyRent != null && Number.isFinite(Number(weeklyRent)) ? (
        <p className="text-sm text-gray-700">
          Weekly rent:{' '}
          <span className="font-semibold tabular-nums">${fmtAud(Number(weeklyRent))}</span>
        </p>
      ) : null}

      {coTenant ? (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Co-tenant on lease</p>
          <dl className="text-sm space-y-1.5 text-gray-700">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900 text-right">{coTenant.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900 text-right break-all">{coTenant.email}</dd>
            </div>
            {coTenant.phone ? (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900 text-right">{coTenant.phone}</dd>
              </div>
            ) : null}
            {coTenant.date_of_birth ? (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Date of birth</dt>
                <dd className="font-medium text-gray-900 text-right">{formatDate(coTenant.date_of_birth)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </section>
  )
}
