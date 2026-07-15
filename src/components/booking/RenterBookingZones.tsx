import { useState, type ReactNode } from 'react'
import Section from '../ui/Section'
import BookingTermsBlock from './BookingTermsBlock'
import BookingActivityTimeline from './BookingActivityTimeline'
import BookingLeasePanel from './BookingLeasePanel'
import RenterBookingObligationBand from './RenterBookingObligationBand'
import TenancyAgreementExplainer from '../TenancyAgreementExplainer'
import ListingPaymentInstructions, {
  shouldShowListingPaymentInstructions,
} from '../student/ListingPaymentInstructions'
import StudentDashboardBookingStatusStrip from '../student/StudentDashboardBookingStatusStrip'
import { tenantBookingCardBanner } from '../../lib/tenantBookingStatus'
import { isBondPaymentReceiptContext } from '../../lib/listings'
import { landlordServiceTierTitle } from '../../lib/landlordServiceTier'
import {
  bookingHasOccupancySnapshot,
  parseCoTenantSnapshot,
  parseRentBreakdownAud,
} from '../../lib/pricing/bookingOccupancySnapshot'
import { resolveBookingBondAmountAud } from '../../lib/booking/resolveBookingBondAmount'
import type { Database } from '../../lib/database.types'

type BookingRow = Database['public']['Tables']['bookings']['Row']

/** Loose property embed — matches StudentDashboard booking joins without over-constraining. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropertyEmbed = Record<string, any> & {
  state?: string | null
  property_type?: string | null
  is_registered_rooming_house?: boolean | null
  bond?: number | null
  bond_weeks?: number | null
  rent_per_week?: number | null
}

type Props = {
  booking: BookingRow & { properties: PropertyEmbed | null }
  property: PropertyEmbed | null
  renterDisplayName: string
  isCurrent: boolean
  bondDownloadBusy: boolean
  bondDownloadError: boolean
  onDownloadBondReceipt: () => void
  bondGuidance?: ReactNode
}

/**
 * Renter booking detail — three zones (Owe / Agreed / History) on `<Section>`.
 * Timeline stays `mode="renter"` (audience='both' filtering unchanged).
 */
export default function RenterBookingZones({
  booking,
  property,
  renterDisplayName,
  isCurrent,
  bondDownloadBusy,
  bondDownloadError,
  onDownloadBondReceipt,
  bondGuidance,
}: Props) {
  const [agreedExpanded, setAgreedExpanded] = useState(true)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const banner = tenantBookingCardBanner(booking.status, booking.service_tier_at_request)
  const tierFinal = booking.service_tier_final ?? booking.service_tier_at_request
  const isListing = tierFinal === 'listing'
  const weeklyRent =
    booking.weekly_rent != null
      ? Number(booking.weekly_rent)
      : property?.rent_per_week != null
        ? Number(property.rent_per_week)
        : null
  const bondAud = resolveBookingBondAmountAud(booking.bond_amount, property ?? null, weeklyRent)
  const showLeaseStrip =
    booking.status === 'bond_pending' || booking.status === 'confirmed' || booking.status === 'active'
  const showBondReceipt =
    (booking.status === 'confirmed' || booking.status === 'active') &&
    property != null &&
    isBondPaymentReceiptContext(property.property_type)

  const oweNeedsAction =
    Boolean(banner) ||
    booking.status === 'awaiting_info' ||
    booking.status === 'bond_pending' ||
    booking.status === 'pending_payment'

  const agreedSummary = [
    weeklyRent != null ? `$${weeklyRent}/wk` : null,
    bondAud != null ? `bond $${bondAud}` : null,
    booking.lease_length?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ')

  const bannerClass = banner?.panelClass.replace(/^border-t\s+/, 'rounded-admin-md border ') ?? ''

  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      <Section
        id={`renter-owe-${booking.id}`}
        title="What you owe"
        subtitle={oweNeedsAction ? 'Action needed' : 'All clear for now'}
        tone={oweNeedsAction ? 'warning' : 'default'}
        collapsible={false}
      >
        <div className="space-y-3">
          {isCurrent ? (
            <>
              <RenterBookingObligationBand booking={booking} property={property ?? undefined} />
              <StudentDashboardBookingStatusStrip status={booking.status} />
            </>
          ) : null}
          {banner ? <div className={bannerClass}>{banner.text}</div> : null}
          {showLeaseStrip &&
          property &&
          shouldShowListingPaymentInstructions({ booking, property: property as never }) ? (
            <ListingPaymentInstructions
              booking={booking}
              property={property as never}
              renterDisplayName={renterDisplayName}
            />
          ) : null}
          {bondGuidance}
          {showBondReceipt ? (
            <div className="space-y-2">
              {bondDownloadError ? (
                <p className="text-xs leading-relaxed text-admin-warning-fg">
                  Bond receipt isn&apos;t available yet. Your host will generate it from their dashboard after they
                  record your bond payment.
                </p>
              ) : null}
              <button
                type="button"
                disabled={bondDownloadBusy}
                onClick={onDownloadBondReceipt}
                className="inline-flex items-center rounded-admin-sm bg-admin-coral px-4 py-2 text-sm font-semibold text-white hover:bg-admin-coral-hover disabled:opacity-50"
              >
                {bondDownloadBusy ? 'Opening…' : 'Download bond receipt'}
              </button>
            </div>
          ) : null}
          {!oweNeedsAction && !showLeaseStrip && !showBondReceipt && !banner && !isCurrent ? (
            <p className="text-sm text-admin-ink-4">Nothing due right now.</p>
          ) : null}
        </div>
      </Section>

      <Section
        id={`renter-agreed-${booking.id}`}
        title="What you agreed"
        summary={agreedSummary || 'Terms'}
        editLabel="View terms"
        expanded={agreedExpanded}
        onToggle={() => setAgreedExpanded((v) => !v)}
      >
        <BookingTermsBlock
          money={{
            tier: isListing ? 'listing' : 'managed',
            status: booking.status,
            weeklyRentAud: weeklyRent,
            bondAud,
            listingFeeExempt: false,
            depositAmountCents: booking.deposit_amount,
            depositReleasedAt: booking.deposit_released_at,
            platformFeeCents: booking.platform_fee_amount,
            viewer: 'renter',
          }}
          moveInIso={(booking.move_in_date || booking.start_date || '').slice(0, 10) || null}
          leaseLength={booking.lease_length}
          occupantCount={booking.occupant_count}
          parkingSelected={booking.parking_selected}
          coTenant={parseCoTenantSnapshot(booking.co_tenant)}
          breakdown={
            bookingHasOccupancySnapshot(booking) ? parseRentBreakdownAud(booking.rent_breakdown) : null
          }
          serviceTierTitle={landlordServiceTierTitle(tierFinal)}
        />
      </Section>

      <Section
        id={`renter-history-${booking.id}`}
        title="What's happened"
        summary="Agreement & activity"
        editLabel="View history"
        expanded={historyExpanded}
        onToggle={() => setHistoryExpanded((v) => !v)}
      >
        <div className="space-y-4">
          {showLeaseStrip && property ? (
            <>
              <TenancyAgreementExplainer
                state={property.state ?? ''}
                propertyType={property.property_type ?? ''}
                isRegisteredRoomingHouse={Boolean(property.is_registered_rooming_house)}
              />
              <BookingLeasePanel bookingId={booking.id} />
            </>
          ) : null}
          <BookingActivityTimeline bookingId={booking.id} mode="renter" />
        </div>
      </Section>
    </div>
  )
}
