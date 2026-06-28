import type { Database } from '../../lib/database.types'
import { formatDate } from '../../pages/admin/adminUi'
import { resolveBookingBondAmountAud } from '../../lib/booking/resolveBookingBondAmount'
import { resolveTenancyPackage } from '../../../api/lib/resolveTenancyPackage'
import {
  formatPropertyPayoutBsbDisplay,
  normalizePropertyPayoutEmbed,
  propertyPayoutDetailsComplete,
  type PropertyPayoutDetailsInput,
} from '../../lib/propertyPayoutDetails'

type BookingRow = Database['public']['Tables']['bookings']['Row']

type PropertyFields = Pick<
  Database['public']['Tables']['properties']['Row'],
  'title' | 'address' | 'suburb' | 'state' | 'postcode' | 'property_type' | 'is_registered_rooming_house' | 'rent_per_week' | 'bond' | 'bond_weeks'
> & {
  property_payout_details?: PropertyPayoutDetailsInput | PropertyPayoutDetailsInput[] | null
}

function formatAud(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '-'
  return `$${amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function propertyAddressLine(property: PropertyFields): string {
  return (
    [property.address, property.suburb, property.state, property.postcode].filter(Boolean).join(', ') ||
    property.title?.trim() ||
    ''
  )
}

function bookingMoveInIso(booking: Pick<BookingRow, 'move_in_date' | 'start_date'>): string | undefined {
  const moveIn =
    (typeof booking.move_in_date === 'string' && booking.move_in_date.trim()) ||
    (typeof booking.start_date === 'string' && booking.start_date.trim()) ||
    ''
  return moveIn || undefined
}

export function shouldShowListingPaymentInstructions(args: {
  booking: Pick<
    BookingRow,
    | 'service_tier_final'
    | 'status'
    | 'move_in_date'
    | 'start_date'
  >
  property: PropertyFields
}): boolean {
  if (args.booking.service_tier_final !== 'listing') return false
  if (!['bond_pending', 'confirmed', 'active'].includes(args.booking.status)) return false

  const pkg = resolveTenancyPackage({
    state: args.property.state ?? 'NSW',
    property_type: args.property.property_type ?? '',
    is_registered_rooming_house: Boolean(args.property.is_registered_rooming_house),
    date: bookingMoveInIso(args.booking),
  })
  if (!pkg.supported || pkg.pdfKind !== 'occupancy_agreement') return false

  return propertyPayoutDetailsComplete(normalizePropertyPayoutEmbed(args.property.property_payout_details))
}

type Props = {
  booking: Pick<
    BookingRow,
    | 'bond_amount'
    | 'weekly_rent'
    | 'bond_window_expires_at'
    | 'bond_received_by_landlord_at'
    | 'move_in_date'
    | 'start_date'
  >
  property: PropertyFields
  renterDisplayName: string
}

export default function ListingPaymentInstructions({ booking, property, renterDisplayName }: Props) {
  const payout = normalizePropertyPayoutEmbed(property.property_payout_details)
  if (!propertyPayoutDetailsComplete(payout)) return null

  const bondAmountAud = resolveBookingBondAmountAud(
    booking.bond_amount,
    property,
    booking.weekly_rent ?? property.rent_per_week,
  )
  const weeklyRentAud =
    booking.weekly_rent != null && Number.isFinite(Number(booking.weekly_rent))
      ? Number(booking.weekly_rent)
      : property.rent_per_week != null && Number.isFinite(Number(property.rent_per_week))
        ? Number(property.rent_per_week)
        : null
  const moveInRaw = bookingMoveInIso(booking)
  const moveInLabel = moveInRaw ? formatDate(moveInRaw.slice(0, 10)) : '-'
  const bondDeadlineLabel = booking.bond_window_expires_at?.trim()
    ? formatDate(booking.bond_window_expires_at.slice(0, 10))
    : '-'
  const showBondLine = booking.bond_received_by_landlord_at == null
  const addressLine = propertyAddressLine(property)
  const paymentReference = `${renterDisplayName.trim()} — ${addressLine}`.trim()

  return (
    <div
      className="rounded-xl border border-indigo-200/90 bg-white px-4 py-3 text-sm text-indigo-950 space-y-2"
      role="note"
    >
      <p className="font-semibold leading-snug">How to pay your bond and rent</p>
      <p className="text-xs leading-relaxed text-indigo-900/95">
        Pay your host directly by fee-free bank transfer. Use the reference below so they can match your payment.
      </p>
      {showBondLine ? (
        <p>
          <span className="font-semibold">Bond:</span> {formatAud(bondAmountAud)} due by{' '}
          <span className="font-semibold">{bondDeadlineLabel}</span>.
        </p>
      ) : null}
      <p>
        <span className="font-semibold">Rent:</span> {formatAud(weeklyRentAud)} per week, paid weekly in advance from
        your move-in date (<span className="font-semibold">{moveInLabel}</span>).
      </p>
      <div>
        <p className="font-semibold">Pay to</p>
        <p className="mt-0.5 tabular-nums">
          Account name: {payout!.account_name!.trim()}
          <br />
          BSB: {formatPropertyPayoutBsbDisplay(payout!.bsb!)}
          <br />
          Account number: {payout!.account_number!.trim()}
        </p>
      </div>
      <p>
        <span className="font-semibold">Reference:</span> {paymentReference}
      </p>
      <p className="text-xs text-indigo-900/95">
        <span className="font-semibold">Method:</span> Fee-free bank transfer.
      </p>
    </div>
  )
}
