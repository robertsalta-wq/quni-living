import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Stripe } from '@stripe/stripe-js'
import { Link, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import {
  isBoardingLodgerBondContext,
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
import { apiUrl } from '../lib/apiUrl'
import { useBookingFlowChrome } from '../context/BookingFlowChromeContext'
import {
  formatIsoDateAuNumeric,
  isIsoDateString,
  moveOutFromBookingLeaseLength,
} from '../lib/listingAvailabilityDates'
import { fetchUnavailablePropertyIdsForDateRange } from '../lib/propertyLeaseAvailability'
import {
  listingIsoDateUtc,
  normalizeListingBound,
  propertyListingDateWindowStatus,
} from '../lib/propertyListingDateWindow'
import { AUDateField } from '../components/AUDateField'
import PaymentsSecuredByStripe from '../components/PaymentsSecuredByStripe'

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
}

const LEASE_OPTIONS = ['3 months', '6 months', '12 months', 'Flexible'] as const
type LeaseOption = (typeof LEASE_OPTIONS)[number]

const BOOKING_FEE_AUD = 49

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
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '—'
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

function bondAuthorityBody(state: string | null | undefined): string {
  const s = (state ?? 'NSW').toUpperCase()
  const map: Record<string, string> = {
    NSW: 'NSW Fair Trading (Rental Bonds Online)',
    VIC: 'Residential Tenancies Bond Authority (RTBA)',
    QLD: 'Residential Tenancies Authority (RTA)',
    WA: 'Bond Administrator, Dept of Mines',
    SA: 'Consumer and Business Services',
    ACT: 'ACT Revenue Office',
    TAS: 'Consumer, Building and Occupational Services',
    NT: 'NT Consumer Affairs',
  }
  return map[s] ?? map.NSW
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

  const [myLandlordId, setMyLandlordId] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [moveIn, setMoveIn] = useState(() => minMoveInIso())
  const [leaseLength, setLeaseLength] = useState<LeaseOption>('6 months')
  const [message, setMessage] = useState('')
  const [bondCheck, setBondCheck] = useState(false)

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

  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0)
  const [draftPersistReady, setDraftPersistReady] = useState(false)
  const draftHydrationAttemptedRef = useRef(false)
  const { setElevateFloatingChrome } = useBookingFlowChrome()

  const studentProfile = role === 'student' && profile ? (profile as StudentRow) : null

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
    if (!propertyId || !isSupabaseConfigured || authLoading) {
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
            landlord_profiles ( id, full_name, avatar_url, verified, stripe_charges_enabled, email ),
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
    if (!propertyId || !property?.id || property.id !== propertyId) return
    if (draftHydrationAttemptedRef.current) return
    draftHydrationAttemptedRef.current = true

    let restoredDraft = false
    try {
      const raw = localStorage.getItem(bookingDraftStorageKey(propertyId))
      if (raw) {
        const d = JSON.parse(raw) as {
          listingId?: string
          step?: number
          moveIn?: string
          leaseLength?: string
          message?: string
          bondCheck?: boolean
          clientSecret?: string | null
          depositCents?: number | null
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

          let nextStep: 1 | 2 | 3 = d.step === 2 ? 2 : d.step === 3 ? 3 : 1
          if (nextStep === 3 && (!d.clientSecret || typeof d.clientSecret !== 'string')) {
            nextStep = 2
          }
          setStep(nextStep)
          if (nextStep === 3 && d.clientSecret) {
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
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }, 100)
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
          v: 1,
          listingId: propertyId,
          step,
          moveIn,
          leaseLength,
          message,
          bondCheck,
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
    bondCheck,
    clientSecret,
    depositCents,
    success,
  ])

  useEffect(() => {
    setElevateFloatingChrome(step === 3)
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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const t = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.getElementById('booking-success-heading')?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [success])

  const rent = property ? Number(property.rent_per_week) : 0
  const platformPctWeekly = rent > 0 ? Math.round(rent * 0.03) : 0
  const totalWeekly = rent + platformPctWeekly
  const depositDollars = rent
  const totalChargeDisplay = (depositDollars + BOOKING_FEE_AUD).toLocaleString('en-AU', {
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
        setPiError('__payment_user__')
        return
      }

      if (!j.clientSecret || typeof j.depositCents !== 'number') {
        setPiError('__payment_user__')
        return
      }

      setClientSecret(j.clientSecret)
      setDepositCents(j.depositCents)
      setStep(3)
    } catch (e) {
      console.warn('[booking] create-booking-payment-intent request error', {
        url: apiUrl('/api/create-booking-payment-intent'),
        message: e instanceof Error ? e.message : String(e),
      })
      setPiError('__payment_user__')
    } finally {
      setPiBusy(false)
    }
  }, [property?.id, studentProfile, moveIn, leaseLength, message])

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
          void sendBookingRequestToLandlord(j.bookingId)
        }

        clearBookingDraft(property.id)
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
    ],
  )

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

  const stripeReady = property.landlord_profiles?.stripe_charges_enabled === true
  if (!stripeReady) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Bookings not available yet</h1>
        <p className="text-gray-600 text-sm mt-3 leading-relaxed">
          This host has not finished connecting their bank account for payouts. Online booking and deposit payments will
          be available once they complete Stripe Connect from their landlord dashboard.
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
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <h1 id="booking-success-heading" className="text-2xl font-bold text-gray-900">
          Request sent
        </h1>
        <p className="text-gray-600 text-sm mt-3 leading-relaxed">
          Your booking deposit is held securely until your host responds. They have <strong>48 hours</strong> to confirm
          or decline. You can track status under <strong className="text-gray-800">Student profile → Bookings</strong> or
          your dashboard.
        </p>
        <PaymentsSecuredByStripe align="center" className="mt-5 max-w-sm mx-auto" />
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/student-dashboard"
            className="inline-flex justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-3 text-sm font-semibold hover:bg-[#e85d52]"
          >
            Go to dashboard
          </Link>
          <Link
            to="/listings"
            className="inline-flex justify-center rounded-xl border border-gray-200 text-gray-800 px-5 py-3 text-sm font-medium hover:bg-gray-50"
          >
            Browse more listings
          </Link>
        </div>
      </div>
    )
  }

  const mainPhoto = (property.images ?? []).find((src) => Boolean(src?.trim())) ?? null
  const landlord = property.landlord_profiles
  const bondAuthorityName = bondAuthorityBody(property.state)
  const listingTypeLabel =
    property.property_type && isPropertyListingType(property.property_type)
      ? PROPERTY_LISTING_TYPE_LABELS[property.property_type]
      : null
  const boardingLodgerBondCopy = isBoardingLodgerBondContext(property.property_type, property.listing_type)

  const bondAmountAud =
    property.bond != null && Number.isFinite(Number(property.bond)) && Number(property.bond) > 0
      ? Number(property.bond)
      : null
  const bondWeeksVsRent = bondAmountAud != null && rent > 0 ? bondAmountAud / rent : null
  const showNswBondCapCopy = (property.state ?? 'NSW').toUpperCase() === 'NSW'

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  const bookingRootStyle: CSSProperties | undefined =
    step === 3 && keyboardInsetPx > 0
      ? { paddingBottom: `max(12rem, ${keyboardInsetPx + 48}px)` }
      : undefined

  return (
    <div
      className={`max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 booking-scroll ${
        step === 3 ? 'max-md:pb-[min(42dvh,19rem)] pb-20 sm:pb-10' : 'pb-20'
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
            ${rent.toLocaleString('en-AU', { maximumFractionDigits: 0 })} / week
          </p>
          {landlord && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-medium capitalize">{(landlord.full_name ?? 'Host').toLowerCase()}</span>
              {landlord.verified ? (
                <span className="ml-2 text-xs font-semibold text-emerald-700">Verified host</span>
              ) : null}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-2 text-xs font-semibold text-gray-500">
        <span className={step >= 1 ? 'text-[#FF6F61]' : ''}>1. Details</span>
        <span aria-hidden>→</span>
        <span className={step >= 2 ? 'text-[#FF6F61]' : ''}>2. Bond info</span>
        <span aria-hidden>→</span>
        <span className={step >= 3 ? 'text-[#FF6F61]' : ''}>3. Payment</span>
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
                    ? `This room is available from ${formatIsoDateAuNumeric(step1DateBlock.from)} — please choose a move-in date on or after this date.`
                    : step1DateBlock.kind === 'after_to'
                      ? `This listing is available until ${formatIsoDateAuNumeric(step1DateBlock.to)} — please adjust your dates.`
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
                <span className="text-gray-600">Weekly rent</span>
                <span className="font-semibold text-gray-900 tabular-nums">${rent.toLocaleString('en-AU')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform fee (3%)</span>
                <span className="font-semibold text-gray-900 tabular-nums">${platformPctWeekly.toLocaleString('en-AU')}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200/80">
                <span className="text-gray-800 font-medium">Total per week</span>
                <span className="font-bold text-gray-900 tabular-nums">${totalWeekly.toLocaleString('en-AU')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Booking deposit</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  ${depositDollars.toLocaleString('en-AU')}{' '}
                  <span className="text-gray-500 font-normal">(1 week rent)</span>
                </span>
              </div>
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
              placeholder="Introduce yourself — tell the landlord a bit about your studies and why you're interested in the property"
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
                    `This room is available from ${formatIsoDateAuNumeric(listingFromBound)} — please choose a move-in date on or after this date.`,
                  )
                  return
                }
                if (listingToBound && (moveIn > listingToBound || (conflictMoveOutDate && conflictMoveOutDate > listingToBound))) {
                  setSubmitError(
                    `This listing is available until ${formatIsoDateAuNumeric(listingToBound)} — please adjust your dates.`,
                  )
                  return
                }
                if (bookingDateConflictBlocked) {
                  setSubmitError(
                    'Sorry, this property is already booked for your selected dates. Please choose different dates.',
                  )
                  return
                }
                setSubmitError(null)
                setStep(2)
              }}
              disabled={step1DateBlock !== null}
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

      {step === 2 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">About your bond</h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              {bondAmountAud != null ? (
                <>
                  Your landlord has set a bond of <strong className="tabular-nums">{formatBondAmountAud(bondAmountAud)}</strong>
                  {bondWeeksVsRent != null ? (
                    <>
                      {' '}
                      (<span className="tabular-nums">{bondWeeksAtRentPhrase(bondWeeksVsRent, rent)}</span>)
                    </>
                  ) : null}
                  , payable directly to them before or on your move-in date.
                  {showNswBondCapCopy ? <> Under NSW law, bond cannot exceed 4 weeks rent.</> : null}
                </>
              ) : (
                <>No bond is required for this property.</>
              )}
            </p>
            {boardingLodgerBondCopy ? (
              <>
                <p>
                  As this is a boarding/lodger arrangement, the Residential Tenancies Act does not apply. Your bond is held
                  directly by your landlord and is not required to be lodged with NSW Fair Trading.
                </p>
                <p>We strongly recommend getting a written receipt when you pay your bond, and keeping a copy for your records.</p>
                <p>Your landlord can generate an official bond receipt through their Quni Living dashboard.</p>
              </>
            ) : (
              <>
                <p>
                  Your landlord is legally required to lodge your bond with the relevant state authority within{' '}
                  <strong>10 business days</strong>.
                </p>
                <div>
                  <p className="font-semibold text-gray-900">
                    {(property.state ?? 'NSW').toUpperCase()} — state bond authority
                  </p>
                  <p className="mt-1">{bondAuthorityName}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-amber-950 text-sm">
                  <p className="font-semibold">Always get a receipt when you pay your bond.</p>
                  <p className="mt-1">
                    Never pay a bond without receiving official confirmation of lodgement from the state authority.
                  </p>
                </div>
              </>
            )}
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
              {boardingLodgerBondCopy ? (
                <>
                  I understand the bond is paid directly to my landlord and will not be lodged with NSW Fair Trading.
                </>
              ) : (
                <>
                  I understand the bond is paid directly to my landlord and must be lodged with the relevant state
                  authority.
                </>
              )}
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setClientSecret(null)
                setDepositCents(null)
              }}
              className="flex-1 rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!bondCheck || piBusy}
              onClick={() => {
                if (!bondCheck) return
                void startPaymentStep()
              }}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
            >
              {piBusy ? 'Preparing payment…' : 'Continue to payment'}
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

      {step === 3 && (
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-semibold tabular-nums">${BOOKING_FEE_AUD.toLocaleString('en-AU')} (one-off)</span>
                </div>
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
              setStep(2)
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
