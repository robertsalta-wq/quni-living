import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Stripe } from '@stripe/stripe-js'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import { isQldOnSiteBoarderLodgerListing, qldOnSiteTenantBondCallout } from '../lib/tenancy/qldBoarderLodger'
import QldRtaLodgementGuidance from '../components/bond/QldRtaLodgementGuidance'
import {
  isLandlordHeldBondContext,
  isPropertyListingType,
  PROPERTY_LISTING_TYPE_LABELS,
  type PropertyListingType,
} from '../lib/listings'
import type { Database } from '../lib/database.types'
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
  isStripeTestPublishableKey,
} from '../lib/stripePublic'
import { sendBookingRequestToLandlord } from '../lib/bookingEmail'
import { mintBookingAttemptId, recordBookingPageOpened } from '../lib/bookingAttempt'
import { apiUrl } from '../lib/apiUrl'
import {
  clearQuniTenantInviteContext,
  getQuniTenantInviteToken,
  setQuniTenantInviteContext,
} from '../lib/quniTenantInvite'
import { recordTenantInviteFunnelEvent } from '../lib/tenantInviteFunnel'
import TenantInviteOfferBanner from '../components/tenantInvite/TenantInviteOfferBanner'
import {
  effectiveWeeklyRentWithInviteOffer,
  tenantInviteOfferFromRpcRow,
  type TenantInviteOfferDisplay,
} from '../lib/pricing/tenantInviteOffer'
import { useBookingFlowChrome } from '../context/BookingFlowChromeContext'
import { useScrollToTopOnChange } from '../hooks/useScrollToTopOnChange'
import { scrollWindowToTop } from '../lib/scrollToTop'
import {
  formatIsoDateAuNumeric,
  isIsoDateString,
  moveOutFromBookingLeaseLength,
} from '../lib/listingAvailabilityDates'
import { fetchUnavailablePropertyIdsForDateRange } from '../lib/propertyLeaseAvailability'
import {
  bondStepRegulatoryCopy,
  fallbackBondAuthorityPublicLine,
  fallbackSchemeLodgementDeadlineBold,
} from '../lib/tenancy/bondCopy'
import { resolveTenancyPackage } from '../lib/tenancy/resolveTenancyPackage'
import { statutoryRentBankTransferCopy, normalizeAuStateCode } from '../lib/tenancy/jurisdictionCopy'
import {
  listingIsoDateUtc,
  normalizeListingBound,
  propertyListingDateWindowStatus,
} from '../lib/propertyListingDateWindow'
import { AUDateField } from '../components/AUDateField'
import NswRentalBondOnlineLink from '../components/bond/NswRentalBondOnlineLink'
import PaymentsSecuredByStripe from '../components/PaymentsSecuredByStripe'
import TenantBookingRequestSubmittedSummary from '../components/student/TenantBookingRequestSubmittedSummary'
import LanguagesSpokenDisplay from '../components/profile/LanguagesSpokenDisplay'
import {
  BookingOccupancySection,
  validateBookingOccupancy,
  type CoTenantFormState,
} from '../components/booking/BookingOccupancySection'
import {
  calculateBookingFeeCents,
  fetchPricingForPropertyTier,
  propertyHasVariableOccupancyPricing,
  resolvePropertyTierFromListing,
  resolveWeeklyRent,
  ResolveWeeklyRentError,
  type PricingCell,
} from '../lib/pricing'

function bookingDraftStorageKey(listingId: string) {
  return `booking_draft_${listingId}`
}

function clearBookingDraft(listingId: string) {
  try {
    localStorage.removeItem(bookingDraftStorageKey(listingId))
  } catch {
    /* ignore */
  }
}

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type LandlordForBooking = NonNullable<Property['landlord_profiles']> & {
  stripe_charges_enabled?: boolean | null
  email?: string | null
}

type PropertyForBooking = Omit<Property, 'landlord_profiles'> & {
  landlord_profiles: LandlordForBooking | null
  property_type?: string | null
  service_tier?: string | null
}

const LEASE_OPTIONS = ['3 months', '6 months', '12 months', 'Flexible'] as const
type LeaseOption = (typeof LEASE_OPTIONS)[number]

type RentPaymentMethod = 'bank_transfer' | 'quni_platform'

type Step1DateBlock =
  | null
  | 'incomplete'
  | 'min_lead'
  | { kind: 'before_from'; from: string }
  | { kind: 'after_to'; to: string }
  | { kind: 'overlap' }

/** User-facing copy for Stripe/payment failures (deposit step and payment-intent setup). */
type BookingConflictState =
  | { kind: 'property_unavailable' }
  | { kind: 'duplicate_booking' }
  | { kind: 'race_condition' }
  | {
      kind: 'date_overlap'
      conflict: { property_address: string; start_date: string; end_date: string }
    }

function formatAuShortDate(isoDate: string): string {
  const s = isoDate.trim()
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '-'
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDateOverlapConflict(raw: unknown): {
  property_address: string
  start_date: string
  end_date: string
} {
  if (!raw || typeof raw !== 'object') {
    return { property_address: 'another property', start_date: '', end_date: '' }
  }
  const c = raw as Record<string, unknown>
  const addr =
    typeof c.property_address === 'string' && c.property_address.trim() ? c.property_address.trim() : 'another property'
  return {
    property_address: addr,
    start_date: typeof c.start_date === 'string' ? c.start_date.slice(0, 10) : '',
    end_date: typeof c.end_date === 'string' ? c.end_date.slice(0, 10) : '',
  }
}

type DateOverlapConflict = { property_address: string; start_date: string; end_date: string }

function DateOverlapConflictActions(opts: {
  conflict: DateOverlapConflict
  onDismiss: () => void
  onChooseDifferentDates?: () => void
}) {
  const startDisp = formatAuShortDate(opts.conflict.start_date)
  const endDisp = formatAuShortDate(opts.conflict.end_date)
  return (
    <>
      <p
        id="booking-date-overlap-title"
        className="font-semibold text-stone-900 md:pr-10"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Booking dates overlap
      </p>
      <p className="text-stone-700 leading-relaxed">
        You already have a booking at{' '}
        <span className="font-medium text-stone-900">{opts.conflict.property_address}</span> from {startDisp} to{' '}
        {endDisp} that overlaps with your requested dates.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <Link
          to="/student-dashboard?tab=bookings"
          className="inline-flex justify-center rounded-xl bg-[#FF6F61] text-white px-4 py-3 text-sm font-semibold hover:bg-[#e85d52]"
        >
          View my bookings
        </Link>
        {opts.onChooseDifferentDates ? (
          <button
            type="button"
            onClick={opts.onChooseDifferentDates}
            className="inline-flex justify-center rounded-xl border border-stone-400 text-stone-900 px-4 py-3 text-sm font-semibold hover:bg-white/80"
          >
            Choose different dates
          </button>
        ) : null}
        <button
          type="button"
          onClick={opts.onDismiss}
          className="inline-flex justify-center rounded-xl border border-stone-300 text-stone-800 px-4 py-3 text-sm font-medium hover:bg-white/80"
        >
          Dismiss
        </button>
      </div>
    </>
  )
}

/** Desktop: centered modal. Mobile: bottom sheet. Portal to document.body. */
function BookingDateOverlapOverlay(opts: {
  conflict: DateOverlapConflict
  onDismiss: () => void
  onChooseDifferentDates?: () => void
}) {
  const [sheetEnter, setSheetEnter] = useState(false)

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setSheetEnter(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') opts.onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opts.onDismiss])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex md:items-center md:justify-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-date-overlap-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60"
        aria-label="Dismiss"
        onClick={opts.onDismiss}
      />

      {/* Mobile: bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex max-h-[min(92dvh,100%)] flex-col justify-end md:hidden">
        <div
          className={`pointer-events-auto w-full max-h-[min(92dvh,100%)] overflow-y-auto rounded-t-2xl border border-b-0 border-stone-200 bg-[#FEF9E4] shadow-2xl transition-transform duration-300 ease-out ${
            sheetEnter ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-stone-300" aria-hidden />
          </div>
          <div className="space-y-3 px-4 pb-6 pt-1 text-sm text-stone-900 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
            <DateOverlapConflictActions
              conflict={opts.conflict}
              onDismiss={opts.onDismiss}
              onChooseDifferentDates={opts.onChooseDifferentDates}
            />
          </div>
        </div>
      </div>

      {/* Desktop: modal */}
      <div className="pointer-events-none relative z-10 hidden w-full max-w-md flex-col md:flex">
        <div className="pointer-events-auto relative w-full rounded-xl border border-stone-200 bg-[#FEF9E4] px-4 py-4 text-sm text-stone-900 shadow-2xl space-y-3">
          <button
            type="button"
            onClick={opts.onDismiss}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
          <DateOverlapConflictActions
            conflict={opts.conflict}
            onDismiss={opts.onDismiss}
            onChooseDifferentDates={opts.onChooseDifferentDates}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BookingConflictPanel(opts: {
  state: BookingConflictState
  onDismiss: () => void
  onChooseDifferentDates?: () => void
}) {
  if (opts.state.kind === 'date_overlap') {
    return (
      <BookingDateOverlapOverlay
        conflict={opts.state.conflict}
        onDismiss={opts.onDismiss}
        onChooseDifferentDates={opts.onChooseDifferentDates}
      />
    )
  }

  const copy =
    opts.state.kind === 'property_unavailable'
      ? {
          title: 'No longer available',
          body: 'This property is no longer available. It has been booked by another student.',
          primary: { to: '/listings', label: 'Browse other listings' },
        }
      : opts.state.kind === 'duplicate_booking'
        ? {
            title: 'Existing request',
            body: 'You already have an active booking request for this property.',
            primary: { to: '/student-dashboard?tab=bookings', label: 'View your booking' },
          }
        : {
            title: 'Property just taken',
            body:
              'Sorry, this property was just booked by another student. Your payment has been cancelled and you will not be charged.',
            primary: { to: '/listings', label: 'Browse other listings' },
          }

  return (
    <div className="rounded-xl border border-stone-200 bg-[#FEF9E4] px-4 py-4 text-sm text-stone-900 space-y-3">
      <p className="font-semibold text-stone-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {copy.title}
      </p>
      <p className="text-stone-700 leading-relaxed">{copy.body}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          to={copy.primary.to}
          className="inline-flex justify-center rounded-xl bg-[#FF6F61] text-white px-4 py-3 text-sm font-semibold hover:bg-[#e85d52]"
        >
          {copy.primary.label}
        </Link>
        <button
          type="button"
          onClick={opts.onDismiss}
          className="inline-flex justify-center rounded-xl border border-stone-300 text-stone-800 px-4 py-3 text-sm font-medium hover:bg-white/80"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function bookingPaymentUserErrorBlock(opts: {
  variant: 'payment' | 'form'
  onTryAgain: () => void
}) {
  const isForm = opts.variant === 'form'
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3">
      <p>
        {isForm ? (
          <>
            The secure payment form could not be loaded. Please refresh the page or contact support at{' '}
            <a href="mailto:hello@quni.com.au" className="font-medium text-red-900 underline underline-offset-2">
              hello@quni.com.au
            </a>
            .
          </>
        ) : (
          <>
            Payment could not be processed. Please check your details and try again, or contact support at{' '}
            <a href="mailto:hello@quni.com.au" className="font-medium text-red-900 underline underline-offset-2">
              hello@quni.com.au
            </a>
            .
          </>
        )}
      </p>
      <button
        type="button"
        onClick={opts.onTryAgain}
        className="rounded-lg bg-white border border-red-200 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/80"
      >
        {isForm ? 'Refresh page' : 'Try again'}
      </button>
    </div>
  )
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const x = new Date(t)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

function minMoveInIso(): string {
  return addDaysIso(new Date().toISOString().slice(0, 10), 7)
}

function formatBondAmountAud(n: number): string {
  return `$${n.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function formatWeeklyRentForBondCopy(n: number): string {
  const rounded = Math.round(n * 100) / 100
  const maxFrac = Math.abs(rounded - Math.round(rounded)) < 0.005 ? 0 : 2
  return `$${n.toLocaleString('en-AU', { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 })}`
}

/** Whole weeks when close to integer, else one decimal (e.g. 4, 4.5). */
function formatWeeksCountForBondCopy(weeks: number): string {
  const x = Math.round(weeks * 100) / 100
  const whole = Math.round(x)
  if (Math.abs(x - whole) < 0.05) return String(whole)
  return x.toFixed(1).replace(/\.0$/, '')
}

function bondWeeksAtRentPhrase(weeks: number, rentPerWeek: number): string {
  const w = formatWeeksCountForBondCopy(weeks)
  const wNum = Number(w)
  const unit = wNum === 1 ? 'week' : 'weeks'
  return `${w} ${unit} rent at ${formatWeeklyRentForBondCopy(rentPerWeek)}/week`
}

function scrollEditableIntoView(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function paymentElementLoadErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const e = (payload as { error?: { message?: string } }).error
    if (e && typeof e.message === 'string' && e.message.trim()) return e.message.trim()
  }
  return 'Payment form could not load. Check that your Stripe publishable key matches the same account and mode (test/live) as the server secret key, then redeploy.'
}

function DepositPaymentInner({
  onPaid,
  totalAudDisplay,
}: {
  onPaid: (paymentIntentId: string) => void
  totalAudDisplay: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [stripeUserIssue, setStripeUserIssue] = useState<'payment' | 'form' | null>(null)
  const [elementReady, setElementReady] = useState(false)
  const [elementBroken, setElementBroken] = useState(false)

  async function submit() {
    if (!stripe || !elements) return
    if (!elementReady || elementBroken) {
      if (!elementBroken) {
        setStripeUserIssue(null)
      }
      return
    }
    setStripeUserIssue(null)
    setBusy(true)
    try {
      const { error: submitErr } = await elements.submit()
      if (submitErr) {
        setStripeUserIssue('payment')
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname}`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setStripeUserIssue('payment')
        return
      }

      if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
        onPaid(paymentIntent.id)
        return
      }

      setStripeUserIssue('payment')
    } catch {
      setStripeUserIssue('payment')
    } finally {
      setBusy(false)
    }
  }

  const payDisabled = busy || !stripe || !elementReady || elementBroken

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => {
          setElementReady(true)
          setElementBroken(false)
        }}
        onLoadError={(e) => {
          setElementReady(false)
          setElementBroken(true)
          console.warn('[booking] PaymentElement load error', paymentElementLoadErrorMessage(e))
          setStripeUserIssue('form')
        }}
      />
      {stripeUserIssue && (
        bookingPaymentUserErrorBlock({
          variant: stripeUserIssue === 'form' ? 'form' : 'payment',
          onTryAgain:
            stripeUserIssue === 'form'
              ? () => window.location.reload()
              : () => setStripeUserIssue(null),
        })
      )}
      {!elementBroken && stripe && !elementReady && (
        <p className="text-sm text-gray-500">Loading secure payment form…</p>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={payDisabled}
        className="w-full rounded-xl bg-stone-900 text-white py-3 text-sm font-semibold hover:bg-stone-800 disabled:opacity-50"
      >
        {busy ? 'Processing…' : `Pay $${totalAudDisplay}`}
      </button>
    </div>
  )
}

export default function Booking() {
  const { propertyId: propertyIdParam } = useParams<{ propertyId: string }>()
  const propertyId = propertyIdParam?.trim() ?? ''
  const [searchParams] = useSearchParams()
  const conversationIdFromThread = searchParams.get('conversationId')?.trim() ?? ''
  const inviteTokenFromUrl = searchParams.get('invite')?.trim() ?? ''
  const tenantInviteToken = inviteTokenFromUrl || getQuniTenantInviteToken() || undefined
  const { user, profile, role, loading: authLoading } = useAuthContext()

  const [property, setProperty] = useState<PropertyForBooking | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [studentBookingBlocked, setStudentBookingBlocked] = useState(false)
  const [bookingDateConflictBlocked, setBookingDateConflictBlocked] = useState(false)
  const [explicitMoveOutFromUrl, setExplicitMoveOutFromUrl] = useState<string | null>(() => {
    try {
      const o = new URLSearchParams(window.location.search).get('move_out')?.trim() ?? ''
      return isIsoDateString(o) ? o : null
    } catch {
      return null
    }
  })
  const [loadingProperty, setLoadingProperty] = useState(Boolean(propertyId && isSupabaseConfigured))

  const propertyLoadTargetRef = useRef(propertyId)
  propertyLoadTargetRef.current = propertyId

  const bookingAttemptIdRef = useRef<string | null>(null)

  const [myLandlordId, setMyLandlordId] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const formTopRef = useRef<HTMLDivElement>(null)

  useScrollToTopOnChange(step, { anchorRef: formTopRef })
  const [moveIn, setMoveIn] = useState(() => minMoveInIso())
  const [leaseLength, setLeaseLength] = useState<LeaseOption>('6 months')
  const [message, setMessage] = useState('')
  const [rentPaymentMethod, setRentPaymentMethod] = useState<RentPaymentMethod>('quni_platform')
  const [bondCheck, setBondCheck] = useState(false)
  const [occupantCount, setOccupantCount] = useState<1 | 2>(1)
  const [parkingSelected, setParkingSelected] = useState(false)
  const [coTenantForm, setCoTenantForm] = useState<CoTenantFormState>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  })
  const [occupancyError, setOccupancyError] = useState<string | null>(null)

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [depositCents, setDepositCents] = useState<number | null>(null)
  const [piBusy, setPiBusy] = useState(false)
  const [piError, setPiError] = useState<string | null>(null)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [bookingConflict, setBookingConflict] = useState<BookingConflictState | null>(null)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const moveInFieldRef = useRef<HTMLInputElement>(null)
  const [bookingSummaryOpen, setBookingSummaryOpen] = useState(false)
  const chooseDifferentDatesAfterOverlap = useCallback(() => {
    setBookingConflict(null)
    setStep(1)
    setClientSecret(null)
    setDepositCents(null)
    requestAnimationFrame(() => {
      moveInFieldRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [])
  const [success, setSuccess] = useState(false)
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null)
  const [managedPricingCell, setManagedPricingCell] = useState<PricingCell | null>(null)

  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0)
  const [draftPersistReady, setDraftPersistReady] = useState(false)
  const draftHydrationAttemptedRef = useRef(false)
  const tenantInviteBookingStartedRef = useRef(false)
  const [inviteOfferDisplay, setInviteOfferDisplay] = useState<TenantInviteOfferDisplay | null>(null)
  const { setElevateFloatingChrome } = useBookingFlowChrome()

  const studentProfile = role === 'student' && profile ? (profile as StudentRow) : null

  useEffect(() => {
    if (studentProfile?.occupancy_type === 'couple') {
      setOccupantCount(2)
    }
  }, [studentProfile?.occupancy_type])

  useEffect(() => {
    if (!tenantInviteToken || loadingProperty || !property) return
    if (tenantInviteBookingStartedRef.current) return
    tenantInviteBookingStartedRef.current = true
    recordTenantInviteFunnelEvent(tenantInviteToken, 'booking_started')
  }, [tenantInviteToken, loadingProperty, property])

  const maxOccupants = Math.min(10, Math.max(1, Math.floor(Number(property?.max_occupants ?? 1))))

  const occupancyPricingInput = useMemo(() => {
    if (!property) return null
    return {
      rent_per_week: property.rent_per_week,
      max_occupants: property.max_occupants ?? 1,
      couple_surcharge_per_week: property.couple_surcharge_per_week,
      parking_surcharge_per_week: property.parking_surcharge_per_week,
      parking_available: property.parking_available ?? false,
    }
  }, [property])

  const rentResolution = useMemo(() => {
    if (!occupancyPricingInput) return null
    try {
      return resolveWeeklyRent(occupancyPricingInput, { occupantCount, parkingSelected })
    } catch (e) {
      const msg =
        e instanceof ResolveWeeklyRentError ? e.message : 'Could not calculate weekly rent for this selection.'
      return { error: msg }
    }
  }, [occupancyPricingInput, occupantCount, parkingSelected])

  const coTenantEmailWarning = useMemo(() => {
    const studentEmail = studentProfile?.email?.trim().toLowerCase() ?? ''
    const coEmail = coTenantForm.email.trim().toLowerCase()
    return Boolean(studentEmail && coEmail && studentEmail === coEmail)
  }, [studentProfile?.email, coTenantForm.email])

  const buildCoTenantPayload = useCallback(() => {
    return {
      full_name: coTenantForm.fullName.trim(),
      email: coTenantForm.email.trim(),
      phone: coTenantForm.phone.trim(),
      date_of_birth: coTenantForm.dateOfBirth.trim().slice(0, 10),
    }
  }, [coTenantForm])

  const validateOccupancyStep = useCallback((): string | null => {
    if (rentResolution != null && 'error' in rentResolution) return rentResolution.error
    return validateBookingOccupancy({
      maxOccupants,
      occupantCount,
      parkingSelected,
      parkingAvailable: Boolean(property?.parking_available),
      coTenant: coTenantForm,
      primaryTenantEmail: studentProfile?.email ?? null,
    })
  }, [
    rentResolution,
    maxOccupants,
    occupantCount,
    parkingSelected,
    property?.parking_available,
    coTenantForm,
    studentProfile?.email,
  ])

  const conflictMoveOutDate = useMemo(() => {
    if (explicitMoveOutFromUrl && isIsoDateString(explicitMoveOutFromUrl)) return explicitMoveOutFromUrl
    if (!moveIn || !isIsoDateString(moveIn)) return null
    return moveOutFromBookingLeaseLength(moveIn, leaseLength)
  }, [explicitMoveOutFromUrl, moveIn, leaseLength])

  const listingFromBound = useMemo(
    () => normalizeListingBound(property?.available_from),
    [property?.available_from],
  )
  const listingToBound = useMemo(() => normalizeListingBound(property?.available_to), [property?.available_to])

  const minMoveInForPicker = useMemo(() => {
    const min7 = minMoveInIso()
    if (listingFromBound && listingFromBound > min7) return listingFromBound
    return min7
  }, [listingFromBound])

  const step1DateBlock: Step1DateBlock = useMemo(() => {
    if (!moveIn || !isIsoDateString(moveIn)) return 'incomplete'
    if (moveIn < minMoveInIso()) return 'min_lead'
    if (listingFromBound && moveIn < listingFromBound) return { kind: 'before_from', from: listingFromBound }
    if (listingToBound) {
      if (moveIn > listingToBound) return { kind: 'after_to', to: listingToBound }
      if (conflictMoveOutDate && conflictMoveOutDate > listingToBound) return { kind: 'after_to', to: listingToBound }
    }
    if (bookingDateConflictBlocked) return { kind: 'overlap' }
    return null
  }, [moveIn, listingFromBound, listingToBound, conflictMoveOutDate, bookingDateConflictBlocked])

  const loadProperty = useCallback(async () => {
    if (!propertyId || !isSupabaseConfigured || (authLoading && user)) {
      if (!propertyId || !isSupabaseConfigured) {
        setProperty(null)
        setLoadError(null)
        setStudentBookingBlocked(false)
        setLoadingProperty(false)
      }
      return
    }
    const loadTarget = propertyId
    setLoadingProperty(true)
    setLoadError(null)
    setStudentBookingBlocked(false)
    try {
      if (user && role === 'student') {
        const { data: access, error: rpcErr } = await supabase.rpc('property_access_status_for_viewer_by_id', {
          p_id: propertyId,
        })
        if (rpcErr) throw rpcErr
        const st = typeof access === 'string' ? access : null
        if (st === 'forbidden_student_only') {
          setProperty(null)
          setStudentBookingBlocked(true)
          setLoadError(null)
          setLoadingProperty(false)
          return
        }
        if (st === 'not_found') {
          setProperty(null)
          setLoadError('This listing is not available for booking.')
          setLoadingProperty(false)
          return
        }
      }

      const { data, error } = await withSentryMonitoring('Booking/load-property', () =>
        supabase
          .from('properties')
          .select(
            `
            *,
            landlord_profiles ( id, full_name, avatar_url, verified, stripe_charges_enabled, email, languages_spoken ),
            universities ( id, name, slug ),
            campuses ( id, name )
          `,
          )
          .eq('id', propertyId)
          .eq('status', 'active')
          .maybeSingle(),
      )

      if (error) throw error
      if (propertyLoadTargetRef.current !== loadTarget) return

      if (data && propertyListingDateWindowStatus(data, listingIsoDateUtc()) === 'after_end') {
        setProperty(null)
        setLoadError('This listing is not available for booking.')
      } else {
        setProperty(data ? (data as PropertyForBooking) : null)
        if (!data) {
          setLoadError('This listing is not available for booking.')
        }
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listing.')
      setProperty(null)
    } finally {
      setLoadingProperty(false)
    }
  }, [propertyId, user, role, authLoading, studentProfile?.id])

  useEffect(() => {
    if (!property?.id || !isSupabaseConfigured) {
      setBookingDateConflictBlocked(false)
      return
    }
    if (!moveIn || !isIsoDateString(moveIn) || moveIn < minMoveInIso()) {
      setBookingDateConflictBlocked(false)
      return
    }
    const fromB = normalizeListingBound(property.available_from)
    const toB = normalizeListingBound(property.available_to)
    if (fromB && moveIn < fromB) {
      setBookingDateConflictBlocked(false)
      return
    }
    if (toB && (moveIn > toB || (conflictMoveOutDate != null && conflictMoveOutDate > toB))) {
      setBookingDateConflictBlocked(false)
      return
    }
    let cancelled = false
    void (async () => {
      const blocked = await fetchUnavailablePropertyIdsForDateRange(
        supabase,
        [property.id],
        moveIn,
        conflictMoveOutDate,
        studentProfile?.id ?? null,
      )
      if (!cancelled) setBookingDateConflictBlocked(blocked.has(property.id))
    })()
    return () => {
      cancelled = true
    }
  }, [property?.id, property?.available_from, property?.available_to, moveIn, conflictMoveOutDate, studentProfile?.id])

  useEffect(() => {
    if (bookingDateConflictBlocked && step > 1) setStep(1)
  }, [bookingDateConflictBlocked, step])

  useEffect(() => {
    void loadProperty()
  }, [loadProperty])

  useEffect(() => {
    if (!propertyId || !user?.id || authLoading) return
    const attemptId = mintBookingAttemptId()
    bookingAttemptIdRef.current = attemptId
    recordBookingPageOpened(attemptId, propertyId)
  }, [propertyId, user?.id, authLoading])

  useEffect(() => {
    if (!property) {
      setManagedPricingCell(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const propertyTier = resolvePropertyTierFromListing(
          property.property_type,
          property.is_registered_rooming_house,
        ) as 't1' | 't2' | 't3'
        const cell = await fetchPricingForPropertyTier(propertyTier, 'managed')
        if (!cancelled) setManagedPricingCell(cell)
      } catch {
        if (!cancelled) setManagedPricingCell(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [property])

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setMyLandlordId(null)
      return
    }
    void (async () => {
      const { data } = await withSentryMonitoring('Booking/fetch-landlord-id', () =>
        supabase.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      )
      setMyLandlordId(data?.id ?? null)
    })()
  }, [user?.id])

  useEffect(() => {
    setDraftPersistReady(false)
    draftHydrationAttemptedRef.current = false
  }, [propertyId])

  useEffect(() => {
    if (!tenantInviteToken || !propertyId || !isSupabaseConfigured) {
      setInviteOfferDisplay(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('resolve_tenant_invite', { p_token: tenantInviteToken })
        if (cancelled || error) return
        const row = Array.isArray(data) ? data[0] : data
        if (!row || row.invite_status !== 'pending' || row.property_id !== propertyId) {
          setInviteOfferDisplay(null)
          return
        }
        const offer = tenantInviteOfferFromRpcRow(row)
        setInviteOfferDisplay(offer)
        if (offer.hasOffer) {
          setQuniTenantInviteContext(tenantInviteToken, propertyId, {
            offeredWeeklyRentAud: offer.offeredWeeklyRentAud,
            offerReason: offer.offerReason,
          })
        }
      } catch {
        if (!cancelled) setInviteOfferDisplay(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenantInviteToken, propertyId])

  useEffect(() => {
    if (inviteTokenFromUrl && propertyId) {
      setQuniTenantInviteContext(inviteTokenFromUrl, propertyId)
    }
  }, [inviteTokenFromUrl, propertyId])

  useEffect(() => {
    if (!propertyId || !property?.id || property.id !== propertyId) return
    if (draftHydrationAttemptedRef.current) return
    draftHydrationAttemptedRef.current = true

    let restoredDraft = false
    try {
      const raw = localStorage.getItem(bookingDraftStorageKey(propertyId))
      if (raw) {
        const d = JSON.parse(raw) as {
          v?: number
          listingId?: string
          step?: number
          moveIn?: string
          leaseLength?: string
          message?: string
          bondCheck?: boolean
          clientSecret?: string | null
          depositCents?: number | null
          rentPaymentMethod?: string
          occupantCount?: number
          parkingSelected?: boolean
          coTenantForm?: CoTenantFormState
        }
        if (!d.listingId || d.listingId === propertyId) {
          restoredDraft = true
          const leaseOk = LEASE_OPTIONS.includes(d.leaseLength as LeaseOption)
            ? (d.leaseLength as LeaseOption)
            : '6 months'
          if (typeof d.moveIn === 'string' && d.moveIn) setMoveIn(d.moveIn)
          setLeaseLength(leaseOk)
          if (typeof d.message === 'string') setMessage(d.message)
          if (typeof d.bondCheck === 'boolean') setBondCheck(d.bondCheck)
          if (d.rentPaymentMethod === 'bank_transfer' || d.rentPaymentMethod === 'quni_platform') {
            setRentPaymentMethod(d.rentPaymentMethod)
          }
          if (d.occupantCount === 2) setOccupantCount(2)
          else if (d.occupantCount === 1) setOccupantCount(1)
          if (typeof d.parkingSelected === 'boolean') setParkingSelected(d.parkingSelected)
          if (d.coTenantForm && typeof d.coTenantForm === 'object') {
            setCoTenantForm({
              fullName: typeof d.coTenantForm.fullName === 'string' ? d.coTenantForm.fullName : '',
              email: typeof d.coTenantForm.email === 'string' ? d.coTenantForm.email : '',
              phone: typeof d.coTenantForm.phone === 'string' ? d.coTenantForm.phone : '',
              dateOfBirth:
                typeof d.coTenantForm.dateOfBirth === 'string' ? d.coTenantForm.dateOfBirth : '',
            })
          }

          const draftV2 = d.v === 2 || d.v === 3
          let nextStep: 1 | 2 | 3 | 4 = 1
          if (draftV2) {
            if (d.step === 2) nextStep = 2
            else if (d.step === 3) nextStep = 3
            else if (d.step === 4) nextStep = 4
            if (nextStep === 4 && (!d.clientSecret || typeof d.clientSecret !== 'string')) {
              nextStep = 3
            }
          } else {
            if (d.step === 2) nextStep = 2
            else if (d.step === 3) {
              nextStep = 4
              if (!d.clientSecret || typeof d.clientSecret !== 'string') {
                nextStep = 3
              }
            }
          }
          setStep(nextStep)
          if (nextStep === 4 && d.clientSecret) {
            setClientSecret(d.clientSecret)
            if (typeof d.depositCents === 'number') setDepositCents(d.depositCents)
            setBondCheck(true)
          }
        }
      }
    } catch {
      /* ignore corrupt draft */
    }

    try {
      const sp = new URLSearchParams(window.location.search)
      const urlIn = sp.get('move_in')?.trim() ?? ''
      if (isIsoDateString(urlIn)) setMoveIn(urlIn)
      const urlLease = sp.get('lease')?.trim() ?? ''
      if (urlLease === '3') setLeaseLength('3 months')
      else if (urlLease === '6') setLeaseLength('6 months')
      else if (urlLease === '12') setLeaseLength('12 months')
      else if (urlLease === 'flex') setLeaseLength('Flexible')
      const urlOut = sp.get('move_out')?.trim() ?? ''
      if (isIsoDateString(urlOut)) setExplicitMoveOutFromUrl(urlOut)
    } catch {
      /* ignore */
    }

    if (restoredDraft) {
      scrollWindowToTop('auto')
    }

    queueMicrotask(() => setDraftPersistReady(true))
  }, [propertyId, property?.id])

  useEffect(() => {
    if (!propertyId || !property?.id || property.id !== propertyId) return
    if (!draftPersistReady) return
    if (success) return

    try {
      localStorage.setItem(
        bookingDraftStorageKey(propertyId),
        JSON.stringify({
          v: 3,
          listingId: propertyId,
          step,
          moveIn,
          leaseLength,
          message,
          rentPaymentMethod,
          bondCheck,
          occupantCount,
          parkingSelected,
          coTenantForm,
          clientSecret,
          depositCents,
        }),
      )
    } catch {
      /* quota / private mode */
    }
  }, [
    propertyId,
    property?.id,
    draftPersistReady,
    step,
    moveIn,
    leaseLength,
    message,
    rentPaymentMethod,
    bondCheck,
    occupantCount,
    parkingSelected,
    coTenantForm,
    clientSecret,
    depositCents,
    success,
  ])

  useEffect(() => {
    setElevateFloatingChrome(step === 4)
    return () => setElevateFloatingChrome(false)
  }, [step, setElevateFloatingChrome])

  useEffect(() => {
    if (step !== 3) {
      setKeyboardInsetPx(0)
      return
    }
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const obscured = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInsetPx(obscured)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [step])

  useEffect(() => {
    if (!success) return
    scrollWindowToTop('auto')
    const t = window.setTimeout(() => {
      scrollWindowToTop('auto')
      document.getElementById('booking-success-heading')?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [success])

  const baseRentDisplay = property ? Number(property.rent_per_week) : 0
  const listingWeeklyRent =
    rentResolution && 'weeklyRent' in rentResolution ? rentResolution.weeklyRent : baseRentDisplay
  const weeklyRent = effectiveWeeklyRentWithInviteOffer(
    listingWeeklyRent,
    inviteOfferDisplay?.offeredWeeklyRentAud,
  )
  const breakdownAud =
    rentResolution && 'breakdownAud' in rentResolution
      ? rentResolution.breakdownAud
      : { base: baseRentDisplay }
  const listingShowsFromPrice =
    property != null &&
    propertyHasVariableOccupancyPricing({
      rent_per_week: property.rent_per_week,
      max_occupants: property.max_occupants ?? 1,
      couple_surcharge_per_week: property.couple_surcharge_per_week,
      parking_surcharge_per_week: property.parking_surcharge_per_week,
      parking_available: property.parking_available ?? false,
    })
  const bookingFeeCents = calculateBookingFeeCents(
    managedPricingCell ??
      ({
        student_fee_mode: 'fixed',
        student_fee_fixed_cents: 0,
        student_fee_percent: 0,
      } as PricingCell),
    Math.round(weeklyRent * 100),
  )
  const bookingFeeAud = bookingFeeCents / 100
  const depositDollars = weeklyRent
  const totalChargeDisplay = (depositDollars + bookingFeeAud).toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const stripePublishableKey = useMemo(() => getStripePublishableKey(), [])
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  )
  const [stripeJsReady, setStripeJsReady] = useState<Stripe | null>(null)
  const [stripeJsInitError, setStripeJsInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!stripePromise) {
      setStripeJsReady(null)
      setStripeJsInitError(null)
      return
    }
    let cancelled = false
    const timeoutMs = 30000
    const to = window.setTimeout(() => {
      if (!cancelled) {
        setStripeJsReady(null)
        setStripeJsInitError(
          'Payment security (Stripe) is taking too long to load. Check your connection, try disabling VPN or content blockers, or complete booking in a regular browser.',
        )
      }
    }, timeoutMs)
    void stripePromise
      .then((stripe) => {
        if (cancelled) return
        window.clearTimeout(to)
        if (!stripe) {
          setStripeJsReady(null)
          setStripeJsInitError(
            'Could not initialize payments. The Stripe publishable key may be missing or invalid in this build.',
          )
          return
        }
        setStripeJsReady(stripe)
        setStripeJsInitError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        window.clearTimeout(to)
        setStripeJsReady(null)
        setStripeJsInitError(e instanceof Error ? e.message : 'Could not load Stripe.js.')
      })
    return () => {
      cancelled = true
      window.clearTimeout(to)
    }
  }, [stripePromise])

  const startPaymentStep = useCallback(async () => {
    setPiError(null)
    setBookingConflict(null)
    if (!property?.id || !studentProfile) return
    const occErr = validateOccupancyStep()
    if (occErr) {
      setOccupancyError(occErr)
      return
    }
    setOccupancyError(null)
    setPiBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setPiError('Session expired. Please sign in again.')
        return
      }

      const piEndpoint = apiUrl('/api/create-booking-payment-intent')
      const res = await fetch(piEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: property.id,
          moveInDate: moveIn,
          leaseLength,
          studentMessage: message.trim(),
          bondAcknowledged: true,
          occupantCount,
          parkingSelected,
          ...(bookingAttemptIdRef.current ? { attemptId: bookingAttemptIdRef.current } : {}),
        }),
      })

      const raw = await res.text()
      let j: {
        error?: string
        message?: string
        clientSecret?: string
        depositCents?: number
        bookingId?: string
        conflict?: unknown
      }
      try {
        j = JSON.parse(raw) as typeof j
      } catch {
        const looksHtml = raw.trimStart().toLowerCase().startsWith('<!doctype') || raw.trimStart().startsWith('<html')
        setPiError(
          looksHtml
            ? 'Could not reach the payment service (received a web page instead of data). If you are in the Quni app, update to the latest version. On a computer, try booking from the live site or run the dev server with API routes (see project README).'
            : 'Invalid response from the payment service. Please try again.',
        )
        return
      }

      if (!res.ok) {
        console.warn('[booking] create-booking-payment-intent failed', {
          status: res.status,
          url: piEndpoint,
          error: j.error,
          message: j.message,
        })
        if (j.error === 'stripe_not_ready') {
          setPiError(
            j.message ??
              'This host has not finished connecting their bank account. Try again once Stripe setup is complete.',
          )
          return
        }
        if (res.status === 409 && j.error === 'date_overlap') {
          setBookingConflict({ kind: 'date_overlap', conflict: parseDateOverlapConflict(j.conflict) })
          return
        }
        const piConflict = j.error
        if (
          res.status === 409 &&
          (piConflict === 'property_unavailable' || piConflict === 'duplicate_booking' || piConflict === 'race_condition')
        ) {
          setBookingConflict({ kind: piConflict })
          return
        }
        if (res.status === 400 && typeof j.message === 'string' && j.message.trim()) {
          setOccupancyError(j.message.trim())
          return
        }
        setPiError('__payment_user__')
        return
      }

      if (!j.clientSecret || typeof j.depositCents !== 'number') {
        setPiError('__payment_user__')
        return
      }

      setClientSecret(j.clientSecret)
      setDepositCents(j.depositCents)
      setStep(4)
    } catch (e) {
      console.warn('[booking] create-booking-payment-intent request error', {
        url: apiUrl('/api/create-booking-payment-intent'),
        message: e instanceof Error ? e.message : String(e),
      })
      setPiError('__payment_user__')
    } finally {
      setPiBusy(false)
    }
  }, [property?.id, studentProfile, moveIn, leaseLength, message, occupantCount, parkingSelected, validateOccupancyStep])

  const isListingProperty = property?.service_tier === 'listing'

  const finalizeListingBooking = useCallback(async () => {
    if (!property?.id || !property.landlord_id || !studentProfile) return
    setSubmitError(null)
    setBookingConflict(null)
    setSubmittingBooking(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setSubmitError('Session expired. Please sign in again.')
        return
      }

      const pt = property.property_type
      const propertyTypeSnapshot =
        pt && isPropertyListingType(pt) ? pt : ('entire_property' satisfies PropertyListingType)

      const commitUrl = apiUrl('/api/create-booking-payment-intent')
      const res = await fetch(commitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commit: true,
          propertyId: property.id,
          moveInDate: moveIn,
          leaseLength,
          studentMessage: message.trim(),
          bondAcknowledged: true,
          propertyType: propertyTypeSnapshot,
          occupantCount,
          parkingSelected,
          ...(occupantCount === 2 ? { coTenant: buildCoTenantPayload() } : {}),
          ...(conversationIdFromThread ? { conversationId: conversationIdFromThread } : {}),
          ...(tenantInviteToken ? { tenantInviteToken } : {}),
          ...(bookingAttemptIdRef.current ? { attemptId: bookingAttemptIdRef.current } : {}),
        }),
      })

      const raw = await res.text()
      let j: { error?: string; message?: string; bookingId?: string; ok?: boolean; conflict?: unknown }
      try {
        j = JSON.parse(raw) as typeof j
      } catch {
        setSubmitError('Invalid response while saving your booking. Please try again.')
        return
      }

      if (res.status === 403 && j.error === 'email_not_confirmed') {
        setSubmitError(
          j.message ??
            'Confirm your email before submitting a booking request. Check your inbox for the confirmation link.',
        )
        return
      }

      if (res.status === 409 && j.error === 'date_overlap') {
        setBookingConflict({ kind: 'date_overlap', conflict: parseDateOverlapConflict(j.conflict) })
        return
      }
      const commitConflict = j.error
      if (
        res.status === 409 &&
        (commitConflict === 'property_unavailable' || commitConflict === 'duplicate_booking')
      ) {
        setBookingConflict({ kind: commitConflict })
        return
      }
      if (res.status === 409 && j.error === 'race_condition') {
        setBookingConflict({ kind: 'race_condition' })
        return
      }
      if (!res.ok || !j.ok || typeof j.bookingId !== 'string') {
        setSubmitError(
          (typeof j.message === 'string' && j.message.trim()) ||
            (typeof j.error === 'string' && j.error) ||
            'Could not save booking.',
        )
        return
      }

      const lp = property.landlord_profiles
      if (lp?.email?.trim() && j.bookingId) {
        void sendBookingRequestToLandlord(j.bookingId, bookingAttemptIdRef.current)
      }

      clearBookingDraft(property.id)
      if (tenantInviteToken) {
        recordTenantInviteFunnelEvent(tenantInviteToken, 'booking_submitted')
        clearQuniTenantInviteContext()
      }
      setSuccessBookingId(j.bookingId)
      setSuccess(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save booking.')
    } finally {
      setSubmittingBooking(false)
    }
  }, [
    property,
    studentProfile,
    moveIn,
    leaseLength,
    message,
    conversationIdFromThread,
    tenantInviteToken,
    occupantCount,
    parkingSelected,
    buildCoTenantPayload,
  ])

  const finalizeBooking = useCallback(
    async (paymentIntentId: string) => {
      if (!property?.id || !property.landlord_id || !studentProfile) return
      setSubmitError(null)
      setBookingConflict(null)
      setSubmittingBooking(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setSubmitError('Session expired. Please sign in again.')
          return
        }

        const pt = property.property_type
        const propertyTypeSnapshot =
          pt && isPropertyListingType(pt) ? pt : ('entire_property' satisfies PropertyListingType)

        const commitUrl = apiUrl('/api/create-booking-payment-intent')
        const res = await fetch(commitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            commit: true,
            paymentIntentId,
            propertyId: property.id,
            moveInDate: moveIn,
            leaseLength,
            studentMessage: message.trim(),
            bondAcknowledged: true,
            propertyType: propertyTypeSnapshot,
            rentPaymentMethod,
            occupantCount,
            parkingSelected,
            ...(occupantCount === 2 ? { coTenant: buildCoTenantPayload() } : {}),
            ...(conversationIdFromThread ? { conversationId: conversationIdFromThread } : {}),
            ...(bookingAttemptIdRef.current ? { attemptId: bookingAttemptIdRef.current } : {}),
          }),
        })

        const raw = await res.text()
        let j: { error?: string; message?: string; bookingId?: string; ok?: boolean; conflict?: unknown }
        try {
          j = JSON.parse(raw) as typeof j
        } catch {
          setSubmitError('Invalid response while saving your booking. Please try again.')
          return
        }

        if (res.status === 409 && j.error === 'date_overlap') {
          setBookingConflict({ kind: 'date_overlap', conflict: parseDateOverlapConflict(j.conflict) })
          return
        }
        const commitConflict = j.error
        if (
          res.status === 409 &&
          (commitConflict === 'property_unavailable' || commitConflict === 'duplicate_booking')
        ) {
          setBookingConflict({ kind: commitConflict })
          return
        }
        if (res.status === 409 && j.error === 'race_condition') {
          setBookingConflict({ kind: 'race_condition' })
          return
        }
        if (!res.ok || !j.ok || typeof j.bookingId !== 'string') {
          setSubmitError(
            (typeof j.message === 'string' && j.message.trim()) ||
              (typeof j.error === 'string' && j.error) ||
              'Could not save booking.',
          )
          return
        }

        const lp = property.landlord_profiles
        if (lp?.email?.trim() && j.bookingId) {
          void sendBookingRequestToLandlord(j.bookingId, bookingAttemptIdRef.current)
        }

        clearBookingDraft(property.id)
        setSuccessBookingId(j.bookingId)
        setSuccess(true)
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Could not save booking.')
      } finally {
        setSubmittingBooking(false)
      }
    },
    [
      property,
      studentProfile,
      moveIn,
      leaseLength,
      message,
      rentPaymentMethod,
      conversationIdFromThread,
      occupantCount,
      parkingSelected,
      buildCoTenantPayload,
    ],
  )

  const tenancyPackage = useMemo(
    () =>
      resolveTenancyPackage({
        state: property?.state ?? '',
        property_type: property?.property_type ?? '',
        is_registered_rooming_house: Boolean(property?.is_registered_rooming_house),
        date: moveIn || undefined,
      }),
    [property?.state, property?.property_type, property?.is_registered_rooming_house, moveIn],
  )

  const bondRegulatoryCopy = useMemo(() => {
    if (!tenancyPackage.supported) {
      return null
    }
    return bondStepRegulatoryCopy(tenancyPackage.rules.bond, property?.state)
  }, [tenancyPackage, property?.state])

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (!propertyId) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Book a property</h1>
        <p className="text-gray-600 text-sm mt-2">Open a listing and choose Request to book to start.</p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  if (loadingProperty) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (studentBookingBlocked) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Student tenants only</h1>
        <p className="text-gray-600 text-sm mt-3 leading-relaxed">
          This landlord has listed for student tenants only.
        </p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  if (loadError || !property) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Book this property</h1>
        <p className="text-red-600 text-sm mt-4">{loadError ?? 'Listing not found.'}</p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  if (myLandlordId && property.landlord_id === myLandlordId) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Cannot book this listing</h1>
        <p className="text-gray-600 text-sm mt-2">You cannot book your own property.</p>
        <Link
          to={property.slug ? `/properties/${property.slug}` : '/listings'}
          className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Back to listing
        </Link>
      </div>
    )
  }

  if (!property.landlord_id) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Book this property</h1>
        <p className="text-gray-600 text-sm mt-4">This listing does not have a linked host yet.</p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  const hostStripeChargesReady = property.landlord_profiles?.stripe_charges_enabled === true
  if (!isListingProperty && !hostStripeChargesReady) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Bookings not available yet</h1>
        <p className="text-gray-600 text-sm mt-3 leading-relaxed">
          This host has not finished Stripe payout setup for Quni Managed bookings. Online booking and deposit payments
          will be available once they complete Stripe Connect from their landlord dashboard.
        </p>
        <Link
          to={property.slug ? `/properties/${property.slug}` : '/listings'}
          className="inline-block mt-8 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Back to listing
        </Link>
      </div>
    )
  }

  if (success) {
    if (successBookingId && property) {
      return (
        <TenantBookingRequestSubmittedSummary
          bookingId={successBookingId}
          propertyTitle={property.title ?? 'Property'}
          propertySuburb={property.suburb ?? null}
          moveInDate={moveIn}
          leaseLength={leaseLength}
          isListing={isListingProperty}
        />
      )
    }
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your booking request was sent</h1>
        <p className="text-gray-600 text-sm mt-3">Track status on your dashboard.</p>
        <Link
          to="/student-dashboard?tab=bookings"
          className="inline-flex justify-center mt-8 rounded-xl bg-[#FF6F61] text-white px-5 py-3 text-sm font-semibold hover:bg-[#e85d52]"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  const mainPhoto = firstPropertyImageUrl(property.images)
  const landlord = property.landlord_profiles

  const listingTypeLabel =
    property.property_type && isPropertyListingType(property.property_type)
      ? PROPERTY_LISTING_TYPE_LABELS[property.property_type]
      : null

  const bondAmountAud = (() => {
    const listingBond =
      property?.bond != null && Number.isFinite(Number(property.bond)) && Number(property.bond) > 0
        ? Number(property.bond)
        : null
    if (listingBond == null) return null
    if (
      inviteOfferDisplay?.offeredWeeklyRentAud != null &&
      listingWeeklyRent > 0 &&
      weeklyRent < listingWeeklyRent
    ) {
      return Math.round(((listingBond * weeklyRent) / listingWeeklyRent) * 100) / 100
    }
    return listingBond
  })()
  const bondWeeksVsRent = bondAmountAud != null && weeklyRent > 0 ? bondAmountAud / weeklyRent : null

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  const bookingRootStyle: CSSProperties | undefined =
    step === 4 && keyboardInsetPx > 0
      ? { paddingBottom: `max(12rem, ${keyboardInsetPx + 48}px)` }
      : undefined

  const stateAu = normalizeAuStateCode(property?.state)
  const rtaExemptArrangement = isLandlordHeldBondContext(property?.property_type, property?.state)
  const statutoryRentCopy = statutoryRentBankTransferCopy(property?.state, rtaExemptArrangement)

  return (
    <div
      className={`max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 booking-scroll ${
        step === 4 ? 'max-md:pb-[min(42dvh,19rem)] pb-20 sm:pb-10' : 'pb-20'
      }`}
      style={bookingRootStyle}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-start">
        <div className="shrink-0 w-full sm:w-44 aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-100 shadow-sm">
          {mainPhoto ? (
            <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full min-h-[10rem] flex items-center justify-center text-gray-300 text-sm">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request to book</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">{property.title}</h1>
          {property.suburb && <p className="text-sm text-gray-500 mt-0.5">{property.suburb}</p>}
          <p className="text-lg font-semibold text-gray-900 mt-2">
            {listingShowsFromPrice && occupantCount === 1 && !parkingSelected ? (
              <>
                From ${baseRentDisplay.toLocaleString('en-AU', { maximumFractionDigits: 0 })} / week
                <span className="block text-xs font-normal text-gray-500 mt-0.5">
                  Your total is ${weeklyRent.toLocaleString('en-AU', { maximumFractionDigits: 0 })}/wk based on
                  selections below
                </span>
              </>
            ) : (
              <>${weeklyRent.toLocaleString('en-AU', { maximumFractionDigits: 0 })} / week</>
            )}
          </p>
          {landlord && (
            <div className="mt-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium capitalize">{(landlord.full_name ?? 'Host').toLowerCase()}</span>
                {landlord.verified ? (
                  <span className="ml-2 text-xs font-semibold text-emerald-700">Verified host</span>
                ) : null}
              </p>
              <LanguagesSpokenDisplay
                languages={landlord.languages_spoken}
                inline
                label="Host speaks"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {inviteOfferDisplay?.hasOffer && inviteOfferDisplay.offeredWeeklyRentAud != null ? (
        <div className="mt-6">
          <TenantInviteOfferBanner
            offeredWeeklyRentAud={inviteOfferDisplay.offeredWeeklyRentAud}
            listingWeeklyRentAud={listingWeeklyRent}
            offerReason={inviteOfferDisplay.offerReason}
          />
        </div>
      ) : null}

      <div
        ref={formTopRef}
        className="scroll-mt-below-header mt-8 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-gray-500"
      >
        <span className={step >= 1 ? 'text-[#FF6F61]' : ''}>1. Details</span>
        <span aria-hidden>→</span>
        <span className={step >= 2 ? 'text-[#FF6F61]' : ''}>2. Rent payment</span>
        <span aria-hidden>→</span>
        <span className={step >= 3 ? 'text-[#FF6F61]' : ''}>3. Bond info</span>
        <span aria-hidden>→</span>
        <span className={step >= 4 ? 'text-[#FF6F61]' : ''}>4. Payment</span>
      </div>

      {step === 1 && (
        <div className="mt-8 space-y-6">
          {step1DateBlock !== null && step1DateBlock !== 'incomplete' && (
            <p
              className="flex flex-wrap items-baseline gap-x-1 gap-y-1 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 leading-snug"
              role="alert"
            >
              <span>
                {step1DateBlock === 'min_lead'
                  ? 'Move-in must be at least 7 days from today.'
                  : step1DateBlock.kind === 'before_from'
                    ? `This room is available from ${formatIsoDateAuNumeric(step1DateBlock.from)} - please choose a move-in date on or after this date.`
                    : step1DateBlock.kind === 'after_to'
                      ? `This listing is available until ${formatIsoDateAuNumeric(step1DateBlock.to)} - please adjust your dates.`
                      : 'Sorry, this property is already booked for your selected dates. Please choose different dates.'}
              </span>
              <Link
                to="/listings"
                className="shrink-0 font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
              >
                Browse listings
              </Link>
            </p>
          )}

          <div>
            <label htmlFor="bk-move-in" className={labelClass}>
              Move-in date
            </label>
            <AUDateField
              ref={moveInFieldRef}
              id="bk-move-in"
              value={moveIn}
              min={minMoveInForPicker}
              max={listingToBound ?? undefined}
              onChange={(iso) => {
                setMoveIn(iso)
                setExplicitMoveOutFromUrl(null)
                setSubmitError(null)
              }}
              onFocus={(e) => scrollEditableIntoView(e.target)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="bk-lease" className={labelClass}>
              Lease length
            </label>
            <select
              id="bk-lease"
              value={leaseLength}
              onChange={(e) => {
                setLeaseLength(e.target.value as LeaseOption)
                setExplicitMoveOutFromUrl(null)
                setSubmitError(null)
              }}
              onFocus={(e) => scrollEditableIntoView(e.target)}
              className={inputClass}
            >
              {LEASE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <BookingOccupancySection
            maxOccupants={maxOccupants}
            parkingAvailable={Boolean(property.parking_available)}
            occupantCount={occupantCount}
            onOccupantCountChange={(n) => {
              setOccupantCount(n)
              setOccupancyError(null)
              if (n === 1) setParkingSelected(false)
            }}
            parkingSelected={parkingSelected}
            onParkingSelectedChange={(v) => {
              setParkingSelected(v)
              setOccupancyError(null)
            }}
            coTenant={coTenantForm}
            onCoTenantChange={(patch) => setCoTenantForm((prev) => ({ ...prev, ...patch }))}
            coTenantEmailWarning={coTenantEmailWarning}
            studentEmail={studentProfile?.email ?? null}
            breakdownAud={breakdownAud}
            weeklyRent={weeklyRent}
            occupancyError={occupancyError}
            inputClass={inputClass}
            labelClass={labelClass}
            onFieldFocus={scrollEditableIntoView}
          />

          <div className="rounded-2xl border border-gray-100 bg-stone-50/80 overflow-hidden">
            <button
              type="button"
              className="md:hidden w-full flex items-center justify-between gap-2 px-5 py-3 text-left border-b border-gray-100/80 bg-stone-50/80"
              aria-expanded={bookingSummaryOpen}
              onClick={() => setBookingSummaryOpen((o) => !o)}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking summary</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 text-gray-500 transition-transform ${bookingSummaryOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="hidden md:block text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 pt-5 pb-0">
              Booking summary
            </h2>
            <div
              className={`space-y-2 px-5 pb-5 pt-4 md:pt-2 ${bookingSummaryOpen ? 'block' : 'hidden'} md:block`}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Weekly rent (your selection)</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  ${weeklyRent.toLocaleString('en-AU')}
                </span>
              </div>
              {breakdownAud.couple != null && breakdownAud.couple > 0 && occupantCount === 2 ? (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Includes second person</span>
                  <span className="tabular-nums">+${breakdownAud.couple.toLocaleString('en-AU')}</span>
                </div>
              ) : null}
              {breakdownAud.parking != null && breakdownAud.parking > 0 && parkingSelected ? (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Includes carpark</span>
                  <span className="tabular-nums">+${breakdownAud.parking.toLocaleString('en-AU')}</span>
                </div>
              ) : null}
              {!isListingProperty ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Booking deposit</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    ${depositDollars.toLocaleString('en-AU')}{' '}
                    <span className="text-gray-500 font-normal">(1 week rent)</span>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  No payment through Quni for this listing — bond and rent are arranged directly with your host.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="bk-msg" className={labelClass}>
              Message to landlord <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="bk-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={(e) => scrollEditableIntoView(e.target)}
              placeholder="Introduce yourself - tell the landlord a bit about your studies and why you're interested in the property"
              className={`${inputClass} resize-y min-h-[6rem]`}
            />
          </div>

          {submitError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-2"
              role="alert"
            >
              <p>{submitError}</p>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="rounded-lg bg-white border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100/80"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!moveIn) {
                  setSubmitError('Please choose a move-in date.')
                  return
                }
                if (moveIn < minMoveInIso()) {
                  setSubmitError('Move-in must be at least 7 days from today.')
                  return
                }
                if (listingFromBound && moveIn < listingFromBound) {
                  setSubmitError(
                    `This room is available from ${formatIsoDateAuNumeric(listingFromBound)} - please choose a move-in date on or after this date.`,
                  )
                  return
                }
                if (listingToBound && (moveIn > listingToBound || (conflictMoveOutDate && conflictMoveOutDate > listingToBound))) {
                  setSubmitError(
                    `This listing is available until ${formatIsoDateAuNumeric(listingToBound)} - please adjust your dates.`,
                  )
                  return
                }
                if (bookingDateConflictBlocked) {
                  setSubmitError(
                    'Sorry, this property is already booked for your selected dates. Please choose different dates.',
                  )
                  return
                }
                const occErr = validateOccupancyStep()
                if (occErr) {
                  setOccupancyError(occErr)
                  return
                }
                setOccupancyError(null)
                setSubmitError(null)
                setStep(isListingProperty ? 3 : 2)
              }}
              disabled={step1DateBlock !== null || (rentResolution != null && 'error' in rentResolution)}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50 disabled:pointer-events-none"
            >
              Continue
            </button>
            <Link
              to={property.slug ? `/properties/${property.slug}` : '/listings'}
              onClick={() => clearBookingDraft(property.id)}
              className="flex-1 text-center rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Back to listing
            </Link>
          </div>
        </div>
      )}

      {step === 2 && !isListingProperty && (
        <div className="mt-8 space-y-6" role="radiogroup" aria-labelledby="rent-payment-heading">
          <h2 id="rent-payment-heading" className="text-lg font-bold text-gray-900">
            How would you like to pay your weekly rent?
          </h2>
          {rtaExemptArrangement ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              Paying through Quni by card is the usual way to get started; any card surcharge is passed through at cost. You
              can also pay rent by bank transfer. There is no legal requirement to offer bank transfer for this listing type,
              but both options are available for consistency.
            </p>
          ) : statutoryRentCopy ? (
            <p className="text-sm text-gray-600 leading-relaxed">{statutoryRentCopy}</p>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed">
              Bank transfer and card payment through Quni are available. Card surcharges apply at actual cost.
            </p>
          )}

          <div className="space-y-3">
            <button
              type="button"
              role="radio"
              aria-checked={rentPaymentMethod === 'quni_platform'}
              onClick={() => setRentPaymentMethod('quni_platform')}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/50 ${
                rentPaymentMethod === 'quni_platform'
                  ? 'border-[#FF6F61] bg-[#FF6F61]/5 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Pay via Quni (card)</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Pay by card via the Quni platform. A processing surcharge applies at actual cost: 1.7% + $0.30 for Australian
                cards, 3.5% + $0.30 for international cards.
              </p>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={rentPaymentMethod === 'bank_transfer'}
              onClick={() => setRentPaymentMethod('bank_transfer')}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/50 ${
                rentPaymentMethod === 'bank_transfer'
                  ? 'border-[#FF6F61] bg-[#FF6F61]/5'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="text-sm font-bold text-gray-900">Bank transfer (free - no additional cost)</div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Transfer directly to Quni&apos;s account each week. BSB and account details are provided after booking is
                confirmed.
              </p>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">About your bond</h2>
          {isListingProperty ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              Quni does not collect bond or rent on Listing stays. If your host accepts, you will pay bond directly to
              them (or lodge it with the state authority where required). No card payment is taken when you submit this
              request.
            </p>
          ) : null}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              {bondAmountAud != null ? (
                <>
                  Your landlord has set a bond of <strong className="tabular-nums">{formatBondAmountAud(bondAmountAud)}</strong>
                  {bondWeeksVsRent != null ? (
                    <>
                      {' '}
                      (<span className="tabular-nums">{bondWeeksAtRentPhrase(bondWeeksVsRent, weeklyRent)}</span>)
                    </>
                  ) : null}
                  , payable directly to them before or on your move-in date.
                  {bondRegulatoryCopy?.bondCapFragment}
                </>
              ) : (
                <>No bond is required for this property.</>
              )}
            </p>
            {bondAmountAud != null ? (
              bondRegulatoryCopy ? (
              bondRegulatoryCopy.mode === 'landlord_held' ? (
                <>
                  {bondRegulatoryCopy.landlordHeldParagraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </>
              ) : (
                <>
                  <p>
                    {bondRegulatoryCopy.schemeLeadBeforeBold}
                    <strong>{bondRegulatoryCopy.schemeBoldDeadline}</strong>
                    {bondRegulatoryCopy.schemeLeadAfterBold}
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{bondRegulatoryCopy.authorityStateHeading}</p>
                    <p className="mt-1">{bondRegulatoryCopy.authorityPublicLine}</p>
                    <NswRentalBondOnlineLink when={(property.state ?? '').toUpperCase() === 'NSW'} />
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-amber-950 text-sm">
                    <p className="font-semibold">{bondRegulatoryCopy.amberTitle}</p>
                    <p className="mt-1">{bondRegulatoryCopy.amberBody}</p>
                  </div>
                  {isQldOnSiteBoarderLodgerListing(property.state, property.property_type) ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
                      <p>{qldOnSiteTenantBondCallout()}</p>
                    </div>
                  ) : null}
                  {(property.state ?? '').trim().toUpperCase() === 'QLD' &&
                  bondRegulatoryCopy.mode === 'scheme' ? (
                    <QldRtaLodgementGuidance />
                  ) : null}
                </>
              )
            ) : (
              <>
                {/* Resolver unsupported or T3 deferred - no structured rules; generic scheme-style guidance only */}
                <p>
                  Your landlord is legally required to lodge your bond with the relevant state authority within{' '}
                  <strong>{fallbackSchemeLodgementDeadlineBold(property.state)}</strong>.
                </p>
                <div>
                  <p className="font-semibold text-gray-900">
                    {(stateAu || 'Your state')} - state bond authority
                  </p>
                  <p className="mt-1">{fallbackBondAuthorityPublicLine(property.state)}</p>
                  <NswRentalBondOnlineLink when={(property.state ?? '').toUpperCase() === 'NSW'} />
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-amber-950 text-sm">
                  <p className="font-semibold">Always get a receipt when you pay your bond.</p>
                  <p className="mt-1">
                    Never pay a bond without receiving official confirmation of lodgement from the state authority.
                  </p>
                </div>
              </>
            )
            ) : null}
            {listingTypeLabel && (
              <p className="text-xs text-gray-600 pt-2 border-t border-stone-100">
                <span className="font-medium text-gray-800">Property type: </span>
                {listingTypeLabel}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bondCheck}
              onChange={(e) => setBondCheck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
            />
            <span className="text-sm text-gray-800">
              {bondAmountAud != null ? (
                bondRegulatoryCopy ? (
                  bondRegulatoryCopy.acknowledgementCheckbox
                ) : (
                  <>
                    I understand the bond is paid directly to my landlord and must be lodged with the relevant state
                    authority.
                  </>
                )
              ) : (
                <>I understand no bond is required for this stay.</>
              )}
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(isListingProperty ? 1 : 2)
                setClientSecret(null)
                setDepositCents(null)
              }}
              className="flex-1 rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!bondCheck || piBusy || submittingBooking}
              onClick={() => {
                if (!bondCheck) return
                if (isListingProperty) {
                  void finalizeListingBooking()
                  return
                }
                void startPaymentStep()
              }}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
            >
              {isListingProperty
                ? submittingBooking
                  ? 'Submitting…'
                  : 'Submit booking request'
                : piBusy
                  ? 'Preparing payment…'
                  : 'Continue to payment'}
            </button>
          </div>
          {bookingConflict && (
            <BookingConflictPanel
              state={bookingConflict}
              onDismiss={() => setBookingConflict(null)}
              onChooseDifferentDates={
                bookingConflict.kind === 'date_overlap' ? chooseDifferentDatesAfterOverlap : undefined
              }
            />
          )}
          {occupancyError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {occupancyError}
            </div>
          )}
          {piError &&
            (piError === '__payment_user__' ? (
              bookingPaymentUserErrorBlock({
                variant: 'payment',
                onTryAgain: () => setPiError(null),
              })
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{piError}</div>
            ))}
        </div>
      )}

      {step === 4 && !isListingProperty && (
        <div className="mt-8 space-y-6 max-md:min-h-[min(48dvh,26rem)] scroll-mt-4">
          {!clientSecret ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Payment session is not ready. Go back one step and tap <strong>Continue to payment</strong> again.
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900">Pay booking deposit</h2>
              {bookingConflict && (
                <BookingConflictPanel
                  state={bookingConflict}
                  onDismiss={() => setBookingConflict(null)}
                  onChooseDifferentDates={
                    bookingConflict.kind === 'date_overlap' ? chooseDifferentDatesAfterOverlap : undefined
                  }
                />
              )}
              <p className="text-sm text-gray-600 leading-relaxed">
                Your booking deposit of <strong className="text-gray-900">${depositDollars.toLocaleString('en-AU')}</strong>{' '}
                is held securely by Quni Living until your move-in date. It will be released to your landlord after you move
                in. If your landlord declines your request, you will receive a full automatic refund within 5–7 business
                days.
              </p>

              <div className="rounded-2xl border border-gray-100 bg-stone-50/80 p-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking deposit</span>
                  <span className="font-semibold tabular-nums">${depositDollars.toLocaleString('en-AU')} (1 week rent)</span>
                </div>
                {bookingFeeAud > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform fee</span>
                    <span className="font-semibold tabular-nums">${bookingFeeAud.toLocaleString('en-AU')} (one-off)</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                  <span>Total charged now</span>
                  <span className="tabular-nums">${totalChargeDisplay}</span>
                </div>
              </div>

              {clientSecret && isStripePublishableKeyConfigured() && stripePromise ? (
                <PaymentsSecuredByStripe align="start" className="max-w-md" />
              ) : null}

              {!isStripePublishableKeyConfigured() || !stripePromise ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 leading-relaxed">
                  <p className="font-semibold text-red-900">Card payments are not configured in this app build</p>
                  <p className="mt-2">
                    The booking deposit step needs <code className="text-xs bg-red-100/80 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code>{' '}
                    at build time (same Stripe mode as the server). Rebuild the native app after adding it, or complete payment on the website.
                  </p>
                </div>
              ) : stripeJsInitError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{stripeJsInitError}</div>
              ) : !stripeJsReady ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">Loading secure payment form…</p>
                </div>
              ) : (
                <div className="max-md:min-h-[min(40dvh,22rem)] space-y-4">
                  {isStripeTestPublishableKey() && (
                    <div
                      role="note"
                      className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-xs text-slate-600 leading-snug"
                    >
                      <span className="font-semibold text-slate-700">Test mode:</span> Use card 4242 4242 4242 4242, any
                      future expiry, any CVC
                    </div>
                  )}

                  <Elements
                    key={clientSecret}
                    stripe={stripeJsReady}
                    options={{
                      clientSecret,
                      appearance: { theme: 'stripe', variables: { colorPrimary: '#FF6F61' } },
                    }}
                  >
                    <DepositPaymentInner
                      totalAudDisplay={totalChargeDisplay}
                      onPaid={(piId) => void finalizeBooking(piId)}
                    />
                  </Elements>
                </div>
              )}

              {submittingBooking && (
                <p className="text-sm text-gray-500 text-center">Saving your booking…</p>
              )}
              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3">
                  <p>{submitError}</p>
                  <p className="text-xs text-red-900/90">
                    Need help?{' '}
                    <a href="mailto:hello@quni.com.au" className="font-medium underline underline-offset-2">
                      hello@quni.com.au
                    </a>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="rounded-lg bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-900 hover:bg-red-100/80"
                  >
                    Try again
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setStep(3)
              setClientSecret(null)
              setDepositCents(null)
              setPiError(null)
            }}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to bond step
          </button>
        </div>
      )}
    </div>
  )
}
