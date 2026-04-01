import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import {
  isPropertyListingType,
  PROPERTY_LISTING_TYPE_LABELS,
  type PropertyListingType,
} from '../lib/listings'
import type { Database } from '../lib/database.types'
import { getStripePublishableKey, isStripePublishableKeyConfigured } from '../lib/stripePublic'
import { sendBookingRequestToLandlord } from '../lib/bookingEmail'

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
const BOOKING_FEE_CENTS = 4900

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const x = new Date(t)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

function minMoveInIso(): string {
  return addDaysIso(new Date().toISOString().slice(0, 10), 7)
}

function leaseEndDate(moveIn: string, lease: LeaseOption): string | null {
  if (lease === 'Flexible') return null
  const days = lease === '3 months' ? 92 : lease === '6 months' ? 183 : 365
  return addDaysIso(moveIn, days)
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

function weeklyRentCents(rent: number): number {
  return Math.round(rent * 100)
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
  const [err, setErr] = useState<string | null>(null)
  const [elementReady, setElementReady] = useState(false)
  const [elementLoadError, setElementLoadError] = useState<string | null>(null)

  async function submit() {
    if (!stripe || !elements) return
    if (!elementReady || elementLoadError) {
      setErr(
        elementLoadError ??
          'Wait for the card form to appear above. If it does not load, refresh the page or contact support.',
      )
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const { error: submitErr } = await elements.submit()
      if (submitErr) {
        setErr(submitErr.message ?? 'Check your payment details.')
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
        setErr(error.message ?? 'Payment failed.')
        return
      }

      if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
        onPaid(paymentIntent.id)
        return
      }

      setErr(`Payment status: ${paymentIntent?.status ?? 'unknown'}. Try again or contact support.`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Payment error.')
    } finally {
      setBusy(false)
    }
  }

  const payDisabled = busy || !stripe || !elementReady || Boolean(elementLoadError)

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => {
          setElementReady(true)
          setElementLoadError(null)
        }}
        onLoadError={(e) => {
          setElementReady(false)
          setElementLoadError(paymentElementLoadErrorMessage(e))
        }}
      />
      {elementLoadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {elementLoadError}
        </div>
      )}
      {!elementLoadError && stripe && !elementReady && (
        <p className="text-sm text-gray-500">Loading secure payment form…</p>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
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
  const { user, profile, role } = useAuthContext()

  const [property, setProperty] = useState<PropertyForBooking | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingProperty, setLoadingProperty] = useState(Boolean(propertyId && isSupabaseConfigured))

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
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [success, setSuccess] = useState(false)

  const studentProfile = role === 'student' && profile ? (profile as StudentRow) : null

  const loadProperty = useCallback(async () => {
    if (!propertyId || !isSupabaseConfigured) {
      setProperty(null)
      setLoadError(null)
      setLoadingProperty(false)
      return
    }
    setLoadingProperty(true)
    setLoadError(null)
    try {
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
      setProperty(data ? (data as PropertyForBooking) : null)
      if (!data) setLoadError('This listing is not available for booking.')
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listing.')
      setProperty(null)
    } finally {
      setLoadingProperty(false)
    }
  }, [propertyId])

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

  const rent = property ? Number(property.rent_per_week) : 0
  const platformPctWeekly = rent > 0 ? Math.round(rent * 0.03) : 0
  const totalWeekly = rent + platformPctWeekly
  const depositDollars = rent
  const totalChargeDisplay = (depositDollars + BOOKING_FEE_AUD).toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const stripePromise = useMemo(() => {
    const k = getStripePublishableKey()
    return k ? loadStripe(k) : null
  }, [])

  const startPaymentStep = useCallback(async () => {
    setPiError(null)
    if (!property?.id || !studentProfile) return
    setPiBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setPiError('Session expired. Please sign in again.')
        return
      }

      const res = await fetch('/api/create-booking-payment-intent', {
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

      const j = (await res.json()) as {
        error?: string
        message?: string
        clientSecret?: string
        depositCents?: number
      }

      if (!res.ok) {
        if (j.error === 'stripe_not_ready') {
          setPiError(
            j.message ??
              'This host has not finished connecting their bank account. Try again once Stripe setup is complete.',
          )
          return
        }
        setPiError(j.error || j.message || 'Could not start payment.')
        return
      }

      if (!j.clientSecret || typeof j.depositCents !== 'number') {
        setPiError('Invalid payment setup response.')
        return
      }

      setClientSecret(j.clientSecret)
      setDepositCents(j.depositCents)
      setStep(3)
    } catch (e) {
      setPiError(e instanceof Error ? e.message : 'Could not start payment.')
    } finally {
      setPiBusy(false)
    }
  }, [property?.id, studentProfile, moveIn, leaseLength, message])

  const finalizeBooking = useCallback(
    async (paymentIntentId: string) => {
      if (!property?.id || !property.landlord_id || !studentProfile) return
      const dep = depositCents ?? weeklyRentCents(rent)
      setSubmitError(null)
      setSubmittingBooking(true)
      try {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        const endDate = leaseEndDate(moveIn, leaseLength)
        const pt = property.property_type
        const propertyTypeSnapshot =
          pt && isPropertyListingType(pt) ? pt : ('entire_property' satisfies PropertyListingType)

        const row: Database['public']['Tables']['bookings']['Insert'] = {
          property_id: property.id,
          student_id: studentProfile.id,
          landlord_id: property.landlord_id,
          start_date: moveIn,
          move_in_date: moveIn,
          end_date: endDate,
          weekly_rent: rent,
          status: 'pending_confirmation',
          notes: null,
          student_message: message.trim() || null,
          lease_length: leaseLength,
          bond_acknowledged: true,
          stripe_payment_intent_id: paymentIntentId,
          deposit_amount: dep,
          platform_fee_amount: BOOKING_FEE_CENTS,
          booking_fee_paid: true,
          property_type: propertyTypeSnapshot,
          expires_at: expiresAt,
        }

        const { data: inserted, error: insErr } = await withSentryMonitoring('Booking/insert-booking', () =>
          supabase.from('bookings').insert(row).select('id').single(),
        )
        if (insErr) throw insErr

        const lp = property.landlord_profiles
        if (lp?.email?.trim() && inserted?.id) {
          void sendBookingRequestToLandlord(inserted.id)
        }

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
      depositCents,
      rent,
      moveIn,
      leaseLength,
      message,
      user?.email,
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
        <h1 className="text-2xl font-bold text-gray-900">Request sent</h1>
        <p className="text-gray-600 text-sm mt-3 leading-relaxed">
          Your booking deposit is held securely until your host responds. They have <strong>48 hours</strong> to confirm
          or decline. You can track status under <strong className="text-gray-800">Student profile → Bookings</strong> or
          your dashboard.
        </p>
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

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-20">
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
          <div className="rounded-2xl border border-gray-100 bg-stone-50/80 p-5 space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking summary</h2>
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
                ${depositDollars.toLocaleString('en-AU')} <span className="text-gray-500 font-normal">(1 week rent)</span>
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="bk-move-in" className={labelClass}>
              Move-in date
            </label>
            <input
              id="bk-move-in"
              type="date"
              min={minMoveInIso()}
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
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
              onChange={(e) => setLeaseLength(e.target.value as LeaseOption)}
              className={inputClass}
            >
              {LEASE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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
              placeholder="Introduce yourself — tell the landlord a bit about your studies and why you're interested in the property"
              className={`${inputClass} resize-y min-h-[6rem]`}
            />
          </div>

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
                setSubmitError(null)
                setStep(2)
              }}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52]"
            >
              Continue
            </button>
            <Link
              to={property.slug ? `/properties/${property.slug}` : '/listings'}
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
              Your landlord may request a bond of up to <strong>4 weeks rent</strong> (
              <span className="tabular-nums">${(rent * 4).toLocaleString('en-AU')}</span> at ${rent}/week) payable
              directly to them before or on your move-in date.
            </p>
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
            {listingTypeLabel && (
              <p className="text-xs text-gray-600 pt-2 border-t border-stone-100">
                <span className="font-medium text-gray-800">Property type: </span>
                {listingTypeLabel}
              </p>
            )}
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-amber-950 text-sm">
              <p className="font-semibold">Always get a receipt when you pay your bond.</p>
              <p className="mt-1">
                Never pay a bond without receiving official confirmation of lodgement from the state authority.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bondCheck}
              onChange={(e) => setBondCheck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
            />
            <span className="text-sm text-gray-800">
              I understand the bond is paid directly to my landlord and must be lodged with the relevant state authority.
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
          {piError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{piError}</div>
          )}
        </div>
      )}

      {step === 3 && clientSecret && stripePromise && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Pay booking deposit</h2>
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

          {!isStripePublishableKeyConfigured() && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add <code className="text-xs">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable card payments.
            </div>
          )}

          <Elements
            key={clientSecret}
            stripe={stripePromise}
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

          {submittingBooking && (
            <p className="text-sm text-gray-500 text-center">Saving your booking…</p>
          )}
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
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
