import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { User, TrendingUp, MessageSquare, FileText, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Section from '../ui/Section'
import BookingTermsBlock from './BookingTermsBlock'
import BookingActivityTimeline from './BookingActivityTimeline'
import BookingLeasePanel from './BookingLeasePanel'
import BookingFitSummaryTable from '../landlord/BookingFitSummaryTable'
import TenancyAgreementExplainer from '../TenancyAgreementExplainer'
import LanguagesSpokenDisplay from '../profile/LanguagesSpokenDisplay'
import { VerifiedLandlordBadge } from '../VerifiedLandlordBadge'
import ListingPaymentInstructions, {
  shouldShowListingPaymentInstructions,
} from '../student/ListingPaymentInstructions'
import { renterBondReceiptDownloadVisible } from '../../lib/booking/renterBondReceiptCta'
import { landlordServiceTierTitle } from '../../lib/landlordServiceTier'
import {
  bookingHasOccupancySnapshot,
  parseCoTenantSnapshot,
  parseRentBreakdownAud,
} from '../../lib/pricing/bookingOccupancySnapshot'
import { resolveBookingBondAmountAud } from '../../lib/booking/resolveBookingBondAmount'
import { parseRentOverrideProvenance } from '../../lib/pricing/rentAgreedOverride'
import BookingAgreedRentNotice from './BookingAgreedRentNotice'
import BookingReinstatementPanel from './BookingReinstatementPanel'
import { buildBookingFitSummary } from '../../lib/bookingFitSummary'
import { bookingReferenceLabel } from '../../lib/bookingReference'
import { formatDate } from '../../pages/admin/adminUi'
import { firstPropertyImageUrl } from '../../lib/propertyImages'
import { resolveBookingReviewLayout } from '../../lib/booking/bookingReviewLayout'
import {
  formatBookingReviewShortDate,
  resolveLandlordAwaitingInfoQuestion,
  resolveRenterBookingReviewActionCopy,
} from '../../lib/booking/bookingReviewActionModel'
import { renterBookingObligation } from '../../lib/booking/renterBookingObligation'
import { buildBookingReviewChatThread, initialsOf } from '../../lib/booking/bookingReviewChatThread'
import {
  BookingReviewActionCard,
  BookingReviewBookingSummary,
  BookingReviewPropertySummary,
  BookingReviewSummaryStrip,
  BookingReviewSurfaceCard,
  bookingReviewGhostButtonClass,
  bookingReviewLinkButtonClass,
  bookingReviewPrimaryButtonClass,
} from './review'
import type { Database } from '../../lib/database.types'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type BookingMessageRow = Pick<
  Database['public']['Tables']['booking_messages']['Row'],
  'id' | 'sender_role' | 'message' | 'created_at'
>

/** Loose property embed — matches StudentDashboard booking joins without over-constraining. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropertyEmbed = Record<string, any> & {
  state?: string | null
  property_type?: string | null
  is_registered_rooming_house?: boolean | null
  bond?: number | null
  bond_weeks?: number | null
  rent_per_week?: number | null
  landlord_profiles?: {
    full_name?: string | null
    avatar_url?: string | null
    verified?: boolean | null
    languages_spoken?: string[] | null
  } | null
}

type Props = {
  booking: BookingRow & { properties: PropertyEmbed | null }
  property: PropertyEmbed | null
  /** Renter's own profile — drives the read-only fit summary. */
  studentProfile: StudentRow | null
  renterDisplayName: string
  isCurrent: boolean
  bondDownloadBusy: boolean
  bondDownloadError: boolean
  onDownloadBondReceipt: () => void
  /** Persisted tenancy_documents bond_receipt row exists for this booking. */
  hasBondReceipt: boolean
  bondGuidance?: ReactNode
}

const EMPTY_STUDENT_PREFS: Pick<
  StudentRow,
  'occupancy_type' | 'move_in_flexibility' | 'has_pets' | 'needs_parking' | 'bills_preference' | 'furnishing_preference'
> = {
  occupancy_type: null,
  move_in_flexibility: null,
  has_pets: null,
  needs_parking: null,
  bills_preference: null,
  furnishing_preference: null,
}

function propertyAddressLine(property: PropertyEmbed): string {
  return (
    [property.address, property.suburb, property.state, property.postcode].filter(Boolean).join(', ') ||
    property.title?.trim() ||
    ''
  )
}

/**
 * Renter mirror of the v3 booking review shell — same slots as the landlord page, role-flipped:
 * rail = action card + read-only terms; main = summary strip, host, fit, messages, agreement, activity.
 * Timeline stays `mode="renter"` only (audience='both' filtering server + client) — never `internal`.
 * No AI, tier chooser, backups warning, or landlord terms editor on this surface.
 */
export default function RenterBookingZones({
  booking,
  property,
  studentProfile,
  renterDisplayName,
  isCurrent,
  bondDownloadBusy,
  bondDownloadError,
  onDownloadBondReceipt,
  hasBondReceipt,
  bondGuidance,
}: Props) {
  const [fitExpandedOverride, setFitExpandedOverride] = useState<boolean | null>(null)
  const [messagesExpandedOverride, setMessagesExpandedOverride] = useState<boolean | null>(null)
  const [agreementExpanded, setAgreementExpanded] = useState(false)
  const [activityExpanded, setActivityExpanded] = useState(false)
  const [messages, setMessages] = useState<BookingMessageRow[]>([])

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('booking_messages')
      .select('id, sender_role, message, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setMessages((data ?? []) as BookingMessageRow[])
      })
    return () => {
      cancelled = true
    }
  }, [booking.id])

  const reviewLayout = resolveBookingReviewLayout(booking.status, 'renter')

  const tierFinal = booking.service_tier_final ?? booking.service_tier_at_request
  const isListing = tierFinal === 'listing'
  const weeklyRent =
    booking.weekly_rent != null
      ? Number(booking.weekly_rent)
      : property?.rent_per_week != null
        ? Number(property.rent_per_week)
        : null
  const bondAud = resolveBookingBondAmountAud(booking.bond_amount, property ?? null, weeklyRent)
  const bondDeadlineLabel = booking.bond_window_expires_at?.trim()
    ? formatDate(booking.bond_window_expires_at.slice(0, 10))
    : null

  const showLeaseStrip =
    booking.status === 'bond_pending' || booking.status === 'confirmed' || booking.status === 'active'
  const showBondReceipt = renterBondReceiptDownloadVisible({
    bookingStatus: booking.status,
    hasBondReceipt,
  })

  const rentOverride = parseRentOverrideProvenance(booking.rent_breakdown)
  const showAgreedRentNotice =
    rentOverride.overrideApplied &&
    (booking.status === 'pending_confirmation' ||
      booking.status === 'awaiting_info' ||
      booking.status === 'bond_pending')

  const landlordProfile = property?.landlord_profiles ?? null
  const hostName = landlordProfile?.full_name?.trim() || 'Your host'

  const askedQuestion = resolveLandlordAwaitingInfoQuestion(messages)
  const obligation = renterBookingObligation(booking, property ?? undefined)

  const actionCopy = resolveRenterBookingReviewActionCopy({
    status: booking.status,
    landlordDisplayName: hostName,
    askedAtLabel: askedQuestion?.askedAtLabel ?? null,
    sentAtLabel: formatBookingReviewShortDate(booking.created_at),
    bondDeadlineLabel,
    obligationSub: obligation?.detail ?? null,
  })

  const chatThread = useMemo(
    () =>
      buildBookingReviewChatThread({
        viewerRole: 'student',
        introMessage: booking.student_message,
        introCreatedAt: booking.created_at,
        otherPartyName: hostName,
        messages,
      }),
    [booking.student_message, booking.created_at, messages, hostName],
  )

  const openMessagesSection = useCallback(() => {
    setMessagesExpandedOverride(true)
    requestAnimationFrame(() => {
      document.getElementById(`review-messages-${booking.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [booking.id])

  const scrollToAgreement = useCallback(() => {
    setAgreementExpanded(true)
    requestAnimationFrame(() => {
      document.getElementById(`tenancy-agreement-preview-${booking.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [booking.id])

  const fitExpanded = fitExpandedOverride ?? reviewLayout.evaluationDefaultOpen
  const messagesExpanded = messagesExpandedOverride ?? reviewLayout.messagesDefaultOpen

  const propertyAddress = property ? propertyAddressLine(property) : ''
  const propertyPhotoUrl = property ? firstPropertyImageUrl(property.images) : null
  const planLabel = tierFinal === 'managed' ? 'Managed by Quni' : 'Quni Listing'
  const planTooltip =
    tierFinal === 'managed'
      ? 'Managed by Quni — Quni collects rent, chases signatures and handles the tenancy for a fee.'
      : 'Quni Listing — your host manages this tenancy directly. Quni holds no money; bond and rent are paid directly.'
  const listingHref = property?.slug ? `/properties/${property.slug}` : null
  const receivedLabel = booking.created_at ? `Sent ${formatDate(booking.created_at.slice(0, 10))}` : null

  const fitRows = useMemo(
    () =>
      buildBookingFitSummary({
        booking: {
          move_in_date: booking.move_in_date,
          start_date: booking.start_date,
          lease_length: booking.lease_length,
          occupant_count: booking.occupant_count,
          parking_selected: booking.parking_selected,
        },
        student: studentProfile ?? EMPTY_STUDENT_PREFS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        property: (property as any) ?? null,
      }),
    [
      booking.move_in_date,
      booking.start_date,
      booking.lease_length,
      booking.occupant_count,
      booking.parking_selected,
      studentProfile,
      property,
    ],
  )

  let actionBody: ReactNode
  if (booking.status === 'awaiting_info') {
    actionBody = (
      <button type="button" onClick={openMessagesSection} className={bookingReviewPrimaryButtonClass()}>
        Reply
      </button>
    )
  } else if (booking.status === 'bond_pending') {
    actionBody = (
      <p className="px-0.5 text-xs leading-relaxed text-admin-ink-5">
        Paid directly to {hostName}. Quni holds $0 and never touches your bond.
      </p>
    )
  } else if (booking.status === 'confirmed') {
    actionBody = (
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={scrollToAgreement} className={bookingReviewPrimaryButtonClass()}>
          Review &amp; sign
        </button>
        {showBondReceipt ? (
          <button
            type="button"
            disabled={bondDownloadBusy}
            onClick={onDownloadBondReceipt}
            className={bookingReviewGhostButtonClass()}
          >
            {bondDownloadBusy ? 'Opening…' : 'View bond receipt'}
          </button>
        ) : null}
      </div>
    )
  } else if (booking.status === 'active' || booking.status === 'completed') {
    actionBody = (
      <div className="flex flex-col gap-2.5">
        {showBondReceipt ? (
          <button
            type="button"
            disabled={bondDownloadBusy}
            onClick={onDownloadBondReceipt}
            className={bookingReviewGhostButtonClass()}
          >
            {bondDownloadBusy ? 'Opening…' : 'Download bond receipt'}
          </button>
        ) : null}
        <button type="button" onClick={scrollToAgreement} className={bookingReviewGhostButtonClass()}>
          View agreement
        </button>
        {bondDownloadError ? (
          <p className="text-xs leading-relaxed text-admin-warning-fg">
            Bond receipt isn&apos;t available yet — check back after your host records your bond payment.
          </p>
        ) : null}
      </div>
    )
  } else if (
    booking.status === 'pending' ||
    booking.status === 'pending_payment' ||
    booking.status === 'pending_confirmation'
  ) {
    actionBody = (
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={openMessagesSection} className={bookingReviewGhostButtonClass()}>
          Message host
        </button>
        <button
          type="button"
          disabled
          aria-disabled
          title="Contact support to withdraw a request"
          className={`${bookingReviewLinkButtonClass(true)} cursor-not-allowed opacity-60`}
        >
          Withdraw request
        </button>
      </div>
    )
  } else {
    actionBody = undefined
  }

  return (
    <div className="bg-admin-surface-2 px-5 py-6" aria-current={isCurrent ? 'true' : undefined}>
      <div className="grid grid-cols-1 items-start gap-6 min-[921px]:grid-cols-[minmax(0,1fr)_320px]">
        {/* —— Rail (first in DOM for mobile order) —— */}
        <div className="order-first flex flex-col gap-4 min-[921px]:order-last min-[921px]:sticky min-[921px]:top-5">
          <BookingReviewActionCard
            eyebrow={actionCopy.eyebrow}
            eyebrowTone={actionCopy.eyebrowTone}
            title={actionCopy.title}
            sub={actionCopy.sub}
            deadline={actionCopy.deadlineLabel ?? undefined}
            deadlineTone={actionCopy.deadlineTone}
          >
            {actionBody}
          </BookingReviewActionCard>

          {/* Info siblings — below ActionCard (never nested inside it) */}
          {booking.status === 'awaiting_info' && askedQuestion ? (
            <div className="rounded-admin-md border border-admin-line bg-admin-surface-2 px-4 py-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
                Your host asked
              </p>
              <blockquote className="m-0 text-sm leading-relaxed text-admin-ink-2">
                &ldquo;{askedQuestion.text}&rdquo;
              </blockquote>
            </div>
          ) : null}

          {booking.status === 'bond_pending' ? (
            <>
              {bondGuidance}
              {showLeaseStrip &&
              property &&
              shouldShowListingPaymentInstructions({ booking, property: property as never }) ? (
                <ListingPaymentInstructions
                  booking={booking}
                  property={property as never}
                  renterDisplayName={renterDisplayName}
                />
              ) : null}
            </>
          ) : null}

          {booking.status === 'expired' ? (
            <BookingReinstatementPanel bookingId={booking.id} bookingStatus={booking.status} />
          ) : null}

          <BookingReviewSurfaceCard padding="rail">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-md bg-admin-coral-tint text-admin-coral [&_svg]:h-[18px] [&_svg]:w-[18px]">
                <FileText />
              </span>
              <span className="text-[15px] font-semibold text-admin-ink">Terms</span>
            </div>
            <div className="space-y-4">
              {showAgreedRentNotice ? (
                <BookingAgreedRentNotice
                  weeklyRent={booking.weekly_rent}
                  rentBreakdown={booking.rent_breakdown}
                  bondAmount={booking.bond_amount}
                  audience="student"
                  embedded
                />
              ) : null}
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
            </div>
          </BookingReviewSurfaceCard>
        </div>

        {/* —— Main column —— */}
        <div className="flex min-w-0 flex-col gap-4">
          <BookingReviewSummaryStrip
            booking={
              <BookingReviewBookingSummary
                title={reviewLayout.pageTitle}
                referenceLabel={bookingReferenceLabel(booking.id)}
                receivedLabel={receivedLabel}
                stepperIndex={reviewLayout.stepperIndex}
                stepperComplete={reviewLayout.stepperComplete}
              />
            }
            property={
              <BookingReviewPropertySummary
                title={property?.title?.trim() || propertyAddress || 'Property'}
                subtitle={propertyAddress || null}
                planLabel={planLabel}
                planTooltip={planTooltip}
                listingHref={listingHref}
                photoUrl={propertyPhotoUrl}
              />
            }
          />

          <Section id={`renter-host-${booking.id}`} title="Your host" icon={<User />} collapsible={false}>
            <div className="flex items-center gap-3.5">
              {landlordProfile?.avatar_url ? (
                <img
                  src={landlordProfile.avatar_url}
                  alt=""
                  className="h-[46px] w-[46px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-admin-coral-tint text-[16px] font-semibold text-admin-coral">
                  {initialsOf(hostName)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-base font-bold text-admin-ink">{hostName}</p>
                  {landlordProfile?.verified ? <VerifiedLandlordBadge /> : null}
                </div>
                {landlordProfile?.languages_spoken?.length ? (
                  <LanguagesSpokenDisplay languages={landlordProfile.languages_spoken} inline className="mt-0.5" />
                ) : null}
              </div>
            </div>
          </Section>

          <Section
            id={`renter-fit-${booking.id}`}
            title="Fit summary"
            icon={<TrendingUp />}
            expanded={fitExpanded}
            onToggle={() => setFitExpandedOverride(!fitExpanded)}
          >
            <BookingFitSummaryTable rows={fitRows} />
          </Section>

          <Section
            id={`review-messages-${booking.id}`}
            title="Messages"
            icon={<MessageSquare />}
            summary={`Conversation with ${hostName} · ${chatThread.length} message${chatThread.length === 1 ? '' : 's'}`}
            expanded={messagesExpanded}
            onToggle={() => setMessagesExpandedOverride(!messagesExpanded)}
          >
            <div className="space-y-3.5">
              {chatThread.length === 0 ? (
                <p className="text-sm text-admin-ink-4">No messages yet.</p>
              ) : (
                chatThread.map((m) => (
                  <div key={m.key} className={`flex gap-2.5 ${m.fromViewer ? 'flex-row-reverse' : ''}`}>
                    <span
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        m.fromViewer ? 'bg-admin-coral-tint text-admin-coral-active' : 'bg-admin-navy-tint text-admin-navy'
                      }`}
                    >
                      {initialsOf(m.name)}
                    </span>
                    <div className={`min-w-0 max-w-[78%] ${m.fromViewer ? 'text-right' : ''}`}>
                      <div className={`mb-1 flex items-baseline gap-2 ${m.fromViewer ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[12.5px] font-semibold text-admin-ink">{m.name}</span>
                        <span className="text-[11.5px] text-admin-ink-5">{m.timeLabel}</span>
                      </div>
                      <div
                        className={`inline-block rounded-admin-md px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed text-admin-ink-2 ${
                          m.fromViewer
                            ? 'border border-admin-coral-30 bg-admin-coral-tint'
                            : 'bg-admin-surface-2'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="mt-2 border-t border-admin-line-soft pt-3.5">
                <p className="text-xs leading-relaxed text-admin-ink-5">
                  This is a read-only history of your booking request.{' '}
                  <Link to="/messages" className="font-semibold text-admin-coral hover:text-admin-coral-active">
                    Message your host →
                  </Link>
                </p>
              </div>
            </div>
          </Section>

          {reviewLayout.showAgreement && (
            <Section
              id={`review-agreement-${booking.id}`}
              title="Tenancy agreement"
              icon={<FileText />}
              expanded={agreementExpanded}
              onToggle={() => setAgreementExpanded((v) => !v)}
            >
              <div className="space-y-5">
                {showLeaseStrip && property && (
                  <div id={`tenancy-agreement-preview-${booking.id}`} className="scroll-mt-4 space-y-2">
                    <TenancyAgreementExplainer
                      state={property.state ?? ''}
                      propertyType={property.property_type ?? ''}
                      isRegisteredRoomingHouse={Boolean(property.is_registered_rooming_house)}
                      embedded
                    />
                    <BookingLeasePanel bookingId={booking.id} embedded />
                  </div>
                )}
              </div>
            </Section>
          )}

          {reviewLayout.showActivity && (
            <Section
              id={`review-activity-${booking.id}`}
              title="Activity"
              icon={<Clock />}
              expanded={activityExpanded}
              onToggle={() => setActivityExpanded((v) => !v)}
            >
              <BookingActivityTimeline bookingId={booking.id} mode="renter" embedded />
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
