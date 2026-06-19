import { Link } from 'react-router-dom'
import type { Database } from '../../lib/database.types'
import { formatDate } from '../../pages/admin/adminUi'
import { firstPropertyImageUrl } from '../../lib/propertyImages'
import { isBondPaymentReceiptContext } from '../../lib/listings'
import TenancyAgreementExplainer from '../TenancyAgreementExplainer'
import BookingLeasePanel from '../booking/BookingLeasePanel'
import RtaBondRecordForm from '../bond/RtaBondRecordForm'
import ListingBondPaymentGuidance from '../booking/ListingBondPaymentGuidance'
import { resolveTenancyPackage } from '../../../api/lib/resolveTenancyPackage'
import { listingBondPaymentTenantGuidance } from '../../lib/tenancy/listingBondPaymentCopy'
import { parseQldBondRemittancePreference } from '../../lib/tenancy/qldBondRemittance'
import { tenantBookingCardBanner, tenantBookingStatusLabel } from '../../lib/tenantBookingStatus'
import BookingAgreedRentNotice from '../booking/BookingAgreedRentNotice'
import { parseRentOverrideProvenance } from '../../lib/pricing/rentAgreedOverride'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingStatus = BookingRow['status']

type PropertyBookingEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'title' | 'slug' | 'suburb' | 'images' | 'rent_per_week' | 'property_type' | 'state' | 'is_registered_rooming_house'
>

export type StudentDashboardBooking = BookingRow & {
  properties: PropertyBookingEmbed | null
}

function PropertyThumbPlaceholder() {
  return (
    <div className="w-full h-full min-h-[5.5rem] flex items-center justify-center text-gray-300 bg-gray-100">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        />
        <polyline
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          points="9 22 9 12 15 12 15 22"
        />
      </svg>
    </div>
  )
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-900'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'bond_pending') return 'bg-emerald-100 text-emerald-900'
  if (s === 'confirmed' || s === 'active') return 'bg-green-100 text-green-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-red-50 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '-'
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} /wk`
}

function ListingBondGuidanceForBooking({
  booking,
  property,
}: {
  booking: BookingRow
  property: PropertyBookingEmbed
}) {
  const moveIn =
    (typeof booking.move_in_date === 'string' && booking.move_in_date.trim()) ||
    (typeof booking.start_date === 'string' && booking.start_date.trim()) ||
    undefined
  const pkg = resolveTenancyPackage({
    state: property.state ?? 'NSW',
    property_type: property.property_type ?? '',
    is_registered_rooming_house: Boolean(property.is_registered_rooming_house),
    date: moveIn,
  })
  if (!pkg.supported || !pkg.rules.bond.schemeApplies) return null
  const guidance = listingBondPaymentTenantGuidance(pkg.rules.bond, property.state, {
    qldBondRemittancePreference: parseQldBondRemittancePreference(
      (property as { qld_bond_remittance_preference?: string | null }).qld_bond_remittance_preference,
    ),
  })
  if (!guidance) return null
  const bondAud =
    booking.bond_amount != null && Number.isFinite(Number(booking.bond_amount))
      ? Number(booking.bond_amount)
      : typeof property.rent_per_week === 'number' && Number.isFinite(property.rent_per_week)
        ? Math.round(property.rent_per_week * 4 * 100) / 100
        : null
  return <ListingBondPaymentGuidance guidance={guidance} bondAmountAud={bondAud} />
}

export default function StudentDashboardBookingCard({
  booking: b,
  highlighted = false,
  bondDownloadBusyId,
  bondDownloadErrorId,
  onDownloadBondReceipt,
}: {
  booking: StudentDashboardBooking
  highlighted?: boolean
  bondDownloadBusyId: string | null
  bondDownloadErrorId: string | null
  onDownloadBondReceipt: (bookingId: string) => void
}) {
  const prop = b.properties
  const slug = prop?.slug
  const img = firstPropertyImageUrl(prop?.images ?? null)
  const rent = b.weekly_rent ?? prop?.rent_per_week ?? null
  const rentOverride = parseRentOverrideProvenance(b.rent_breakdown)
  const showAgreedRentNotice =
    rentOverride.overrideApplied &&
    (b.status === 'pending_confirmation' ||
      b.status === 'awaiting_info' ||
      b.status === 'bond_pending')

  return (
    <li
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
        highlighted ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-5">
        <div className="shrink-0 w-full sm:w-40 aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-100">
          {img ? (
            <img src={img} alt="" className="w-full h-full object-cover" />
          ) : (
            <PropertyThumbPlaceholder />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            {slug ? (
              <Link
                to={`/properties/${slug}`}
                className="text-lg font-bold text-gray-900 hover:text-indigo-700 line-clamp-2"
              >
                {prop?.title ?? 'Property'}
              </Link>
            ) : (
              <span className="text-lg font-bold text-gray-900">{prop?.title ?? 'Property'}</span>
            )}
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${bookingStatusClass(b.status)}`}
            >
              {tenantBookingStatusLabel(b.status)}
            </span>
          </div>
          {prop?.suburb && <p className="text-sm text-gray-500 mt-0.5">{prop.suburb}</p>}
          <p className="text-sm text-gray-700 mt-2">
            <span className="text-gray-500">Stay:</span> {formatDate(b.start_date)}
            {b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
          </p>
          <p className="text-base font-bold text-gray-900 mt-1">{formatWeeklyRent(rent)}</p>
        </div>
      </div>
      {(() => {
        const banner = tenantBookingCardBanner(b.status)
        return banner ? <div className={banner.panelClass}>{banner.text}</div> : null
      })()}
      {showAgreedRentNotice ? (
        <div className="px-5 pb-4">
          <BookingAgreedRentNotice
            weeklyRent={b.weekly_rent}
            rentBreakdown={b.rent_breakdown}
            bondAmount={b.bond_amount}
            audience="student"
          />
        </div>
      ) : null}
      {(b.status === 'bond_pending' || b.status === 'confirmed' || b.status === 'active') && (
        <div className="border-t border-indigo-100 bg-indigo-50/80 px-5 py-3 text-sm text-indigo-950 space-y-3">
          {b.status === 'bond_pending' && b.service_tier_final === 'listing' && prop && (
            <>
              <ListingBondGuidanceForBooking booking={b} property={prop} />
              {(prop.state ?? '').trim().toUpperCase() === 'QLD' ? (
                <RtaBondRecordForm
                  bookingId={b.id}
                  compact
                  initialBondNumber={b.rta_bond_number}
                  initialAckRef={b.rta_acknowledgement_reference}
                  initialLodgedDate={
                    typeof b.rta_bond_lodged_at === 'string' ? b.rta_bond_lodged_at.slice(0, 10) : null
                  }
                />
              ) : null}
            </>
          )}
          <TenancyAgreementExplainer
            state={prop?.state ?? ''}
            propertyType={prop?.property_type ?? ''}
            isRegisteredRoomingHouse={Boolean(prop?.is_registered_rooming_house)}
          />
          <BookingLeasePanel bookingId={b.id} />
        </div>
      )}
      {(b.status === 'confirmed' || b.status === 'active') &&
        prop &&
        isBondPaymentReceiptContext(prop.property_type) && (
          <div className="border-t border-stone-200 bg-[#FEF9E4]/70 px-5 py-3 text-sm text-stone-800 space-y-2">
            {bondDownloadErrorId === b.id ? (
              <p className="text-amber-900 text-xs leading-relaxed">
                Bond receipt isn&apos;t available yet. Your host will generate it from their dashboard after they
                record your bond payment.
              </p>
            ) : null}
            <button
              type="button"
              disabled={bondDownloadBusyId === b.id}
              onClick={() => onDownloadBondReceipt(b.id)}
              className="inline-flex items-center rounded-lg bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2 hover:bg-[#e85d52] disabled:opacity-50"
            >
              {bondDownloadBusyId === b.id ? 'Opening…' : 'Download bond receipt'}
            </button>
          </div>
        )}
    </li>
  )
}
