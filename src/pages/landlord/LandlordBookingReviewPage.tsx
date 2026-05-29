import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  useLandlordBookingReview,
  bookingReferenceLabel,
  type LandlordBookingReviewStudent,
} from '../../hooks/useLandlordBookingReview'
import type { LandlordSafeStudentSnapshot } from '../../components/landlord/LandlordStudentProfileModal'
import LandlordApplicantReviewHeader from '../../components/landlord/LandlordApplicantReviewHeader'
import LandlordApplicantVerificationSection from '../../components/landlord/LandlordApplicantVerificationSection'
import LandlordApplicantAIAssessmentPanel from '../../components/landlord/LandlordApplicantAIAssessmentPanel'
import BookingFitSummaryTable from '../../components/landlord/BookingFitSummaryTable'
import LandlordBookingOccupancySummary from '../../components/landlord/LandlordBookingOccupancySummary'
import {
  bookingHasOccupancySnapshot,
  parseCoTenantSnapshot,
  parseRentBreakdownAud,
} from '../../lib/pricing/bookingOccupancySnapshot'
import { formatDate } from '../admin/adminUi'
import type { Database } from '../../lib/database.types'
import { isBoardingLodgerBondContext } from '../../lib/listings'
import { apiUrl } from '../../lib/apiUrl'
import {
  landlordBookingConfirmAllowed,
  landlordBookingConfirmBlockedBanner,
} from '../../lib/landlordBookingConfirmGate'
import { landlordListingBondReceivedPrimaryVisible } from '../../lib/landlordListingBondReceivedGate'
import { confirmLandlordBookingWithOptionalThreeDS } from '../../lib/landlordBookingConfirm'
import LandlordListingPaymentModal from '../../components/landlord/LandlordListingPaymentModal'
import { landlordAcceptTierUiModel } from '../../lib/landlordAcceptTierOptions'
import { useServiceTierResolverOptions } from '../../context/PlatformFeaturesContext'
import BookingLeasePanel from '../../components/booking/BookingLeasePanel'
import { landlordServiceTierTitle } from '../../lib/landlordServiceTier'

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

const SUGGESTED_QUESTIONS = [
  'Could you tell me more about your daily routine?',
  'Do you have any pets?',
  'What are your expectations around shared spaces?',
  'Can you confirm your preferred move-in date?',
]

function statusBadgeClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-900'
  if (s === 'bond_pending') return 'bg-amber-100 text-amber-900'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'confirmed' || s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-rose-50 text-rose-900'
  return 'bg-gray-100 text-gray-700'
}

function formatAudCents(cents: number | null | undefined) {
  if (cents == null || !Number.isFinite(Number(cents))) return '—'
  return `$${(Number(cents) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type ConfirmPhase = 'idle' | 'submitting' | 'payment' | 'finalizing'

function confirmBookingBusyLabel(phase: ConfirmPhase, tier: 'listing' | 'managed'): string {
  switch (phase) {
    case 'payment':
      return 'Confirm card payment…'
    case 'finalizing':
      return 'Finalising…'
    case 'submitting':
      return tier === 'listing' ? 'Charging listing fee & confirming…' : 'Confirming booking…'
    default:
      return 'Confirm booking'
  }
}

function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function studentToSnapshot(row: LandlordBookingReviewStudent | null | undefined): LandlordSafeStudentSnapshot | null {
  if (!row) return null
  return {
    id: row.id,
    verification_type: row.verification_type,
    accommodation_verification_route: row.accommodation_verification_route,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    course: row.course,
    year_of_study: row.year_of_study,
    study_level: row.study_level,
    student_type: row.student_type,
    nationality: row.nationality,
    room_type_preference: row.room_type_preference,
    budget_min_per_week: row.budget_min_per_week,
    budget_max_per_week: row.budget_max_per_week,
    universities: row.universities ?? null,
    uni_email_verified: row.uni_email_verified,
    uni_email_verified_at: row.uni_email_verified_at,
    work_email_verified: row.work_email_verified,
    work_email_verified_at: row.work_email_verified_at,
    id_submitted_at: row.id_submitted_at,
    enrolment_submitted_at: row.enrolment_submitted_at,
    identity_supporting_submitted_at: row.identity_supporting_submitted_at,
    is_smoker: row.is_smoker,
    bio: row.bio,
    occupancy_type: row.occupancy_type,
    move_in_flexibility: row.move_in_flexibility,
    has_pets: row.has_pets,
    needs_parking: row.needs_parking,
    bills_preference: row.bills_preference,
    furnishing_preference: row.furnishing_preference,
    has_guarantor: row.has_guarantor,
    guarantor_name: row.guarantor_name,
  }
}

async function readJsonApiResponse(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  const raw = await res.text()
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as { error?: string } & Record<string, unknown>
  } catch {
    return { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }
}

export default function LandlordBookingReviewPage() {
  const serviceTierResolverOptions = useServiceTierResolverOptions()
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { data, loading, error, reload, receivedAgo } = useLandlordBookingReview(bookingId, user?.id)

  const [aiAssessment, setAiAssessment] = useState<string | null>(null)
  const [aiAssessmentAt, setAiAssessmentAt] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)

  const [actionBusy, setActionBusy] = useState(false)
  const [confirmPhase, setConfirmPhase] = useState<ConfirmPhase>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const [infoOpen, setInfoOpen] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

  const [bondModalOpen, setBondModalOpen] = useState(false)
  const [bondDate, setBondDate] = useState('')
  const [bondAmount, setBondAmount] = useState('')
  const [bondMethod, setBondMethod] = useState<'Cash' | 'Bank Transfer' | 'Other'>('Bank Transfer')
  const [bondNotes, setBondNotes] = useState('')
  const [bondBusy, setBondBusy] = useState(false)
  const [bondFormError, setBondFormError] = useState<string | null>(null)

  const [listingPaymentModalOpen, setListingPaymentModalOpen] = useState(false)

  const [bondReceivedBusy, setBondReceivedBusy] = useState(false)
  const [bondReceivedError, setBondReceivedError] = useState<string | null>(null)
  const [bondReceivedToast, setBondReceivedToast] = useState<string | null>(null)
  const [leasePanelRefreshKey, setLeasePanelRefreshKey] = useState(0)

  const [listingCancelOpen, setListingCancelOpen] = useState(false)
  const [listingCancelBusy, setListingCancelBusy] = useState(false)
  const [listingCancelError, setListingCancelError] = useState<string | null>(null)
  const [listingCancelReason, setListingCancelReason] = useState('')

  const [selectedConfirmTier, setSelectedConfirmTier] = useState<'listing' | 'managed'>('managed')

  useEffect(() => {
    if (!data?.booking) return
    const a = data.booking.ai_assessment
    setAiAssessment(typeof a === 'string' && a.trim() ? a.trim() : null)
    setAiAssessmentAt(data.booking.ai_assessment_at ?? null)
    setAiError(false)
  }, [data?.booking?.id, data?.booking?.ai_assessment, data?.booking?.ai_assessment_at])

  const snapshot = useMemo(() => studentToSnapshot(data?.student ?? null), [data?.student])
  const displayName =
    snapshot?.full_name?.trim() ||
    [data?.student?.first_name, data?.student?.last_name].filter(Boolean).join(' ').trim() ||
    'Student'

  const tierModel = useMemo(() => {
    if (!data?.property || !data.listingBillingLoaded) return null
    return landlordAcceptTierUiModel({
      state: data.property.state,
      propertyType: data.property.property_type,
      isRegisteredRoomingHouse: data.property.is_registered_rooming_house,
      moduleEnabled: data.listingBilling?.moduleEnabled === true,
      managedGloballyEnabled: serviceTierResolverOptions.managedGloballyEnabled,
      managedOverrides: serviceTierResolverOptions.managedOverrides,
      propertyServiceTier: data.property.service_tier,
    })
  }, [
    data?.property?.id,
    data?.property?.state,
    data?.property?.property_type,
    data?.property?.is_registered_rooming_house,
    data?.property?.service_tier,
    data?.listingBillingLoaded,
    data?.listingBilling?.moduleEnabled,
    serviceTierResolverOptions,
  ])

  useEffect(() => {
    if (!tierModel) return
    setSelectedConfirmTier(tierModel.defaultTier)
  }, [tierModel?.defaultTier, tierModel?.showListing, tierModel?.showManaged, tierModel?.showManagedUpgrade])

  const refreshCooldownRemainingSec = useMemo(() => {
    if (!aiAssessmentAt) return 0
    const t = new Date(aiAssessmentAt).getTime()
    if (!Number.isFinite(t)) return 0
    const elapsed = Date.now() - t
    const left = 3600_000 - elapsed
    return left > 0 ? Math.ceil(left / 1000) : 0
  }, [aiAssessmentAt, aiLoading])

  const canConfirm =
    !!data &&
    !!tierModel &&
    (tierModel.showListing || tierModel.showManaged) &&
    landlordBookingConfirmAllowed({
      bookingStatus: data.booking.status,
      selectedConfirmTier,
      listingBillingLoaded: data.listingBillingLoaded,
      listingBilling: data.listingBilling,
      landlordStripeReady: data.landlordStripeReady,
    })

  const canDeclineOrInfo =
    data &&
    (data.booking.status === 'pending_confirmation' || data.booking.status === 'awaiting_info') &&
    Boolean(data.booking.stripe_payment_intent_id)

  const callAssessmentApi = useCallback(
    async (opts: { refresh: boolean }) => {
      if (!bookingId) return
      setAiLoading(true)
      setAiError(false)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setAiError(true)
          return
        }
        const res = await fetch('/api/ai/student-assessment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookingId, refresh: opts.refresh }),
        })
        const j = (await readJsonApiResponse(res)) as {
          error?: string
          assessment?: string
          assessmentAt?: string | null
          cached?: boolean
        }
        if (!res.ok || typeof j.assessment !== 'string' || !j.assessment.trim()) {
          setAiError(true)
          return
        }
        setAiAssessment(j.assessment.trim())
        setAiAssessmentAt(typeof j.assessmentAt === 'string' ? j.assessmentAt : new Date().toISOString())
        await reload()
      } catch {
        setAiError(true)
      } finally {
        setAiLoading(false)
      }
    },
    [bookingId, reload],
  )

  const onConfirm = useCallback(async () => {
    if (!bookingId) return
    setActionError(null)
    setConfirmPhase('submitting')
    setActionBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const result = await confirmLandlordBookingWithOptionalThreeDS(
        bookingId,
        token,
        {},
        {
          serviceTier: selectedConfirmTier,
          onProgress: (p) => {
            if (p.stage === 'payment_auth') setConfirmPhase('payment')
            if (p.stage === 'retry') setConfirmPhase('finalizing')
          },
        },
      )
      if (!result.ok) throw new Error(result.error)
      navigate('/landlord/dashboard?tab=bookings')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not confirm.')
    } finally {
      setConfirmPhase('idle')
      setActionBusy(false)
    }
  }, [bookingId, navigate, selectedConfirmTier])

  const onDecline = useCallback(async () => {
    if (!bookingId) return
    setActionError(null)
    setActionBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const res = await fetch(apiUrl('/api/refund-booking-deposit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, declineReason: declineReason.trim() || undefined }),
      })
      const j = await readJsonApiResponse(res)
      if (!res.ok) throw new Error((typeof j.error === 'string' && j.error) || 'Could not decline booking.')
      setDeclineOpen(false)
      navigate('/landlord/dashboard?tab=bookings')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not decline.')
    } finally {
      setActionBusy(false)
    }
  }, [bookingId, declineReason, navigate])

  const openBondModal = useCallback(() => {
    if (!data?.tenancy) return
    setBondDate(todayYmdLocal())
    const t = data.tenancy.bond_amount
    const p = data.property?.bond
    const fromTenancy = t != null && Number.isFinite(Number(t)) && Number(t) > 0 ? Number(t) : null
    const fromProp = p != null && Number.isFinite(Number(p)) && Number(p) > 0 ? Number(p) : null
    setBondAmount(fromTenancy != null ? String(fromTenancy) : fromProp != null ? String(fromProp) : '')
    setBondMethod('Bank Transfer')
    setBondNotes('')
    setBondFormError(null)
    setBondModalOpen(true)
  }, [data?.tenancy, data?.property?.bond])

  const onSubmitBondReceipt = useCallback(async () => {
    if (!data?.tenancy?.id) return
    setBondFormError(null)
    const amt = Number(bondAmount)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bondDate)) {
      setBondFormError('Please choose a valid date.')
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setBondFormError('Enter a valid amount greater than zero.')
      return
    }
    setBondBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const res = await fetch(apiUrl('/api/documents/generate-bond-receipt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenancy_id: data.tenancy.id,
          date_received: bondDate,
          amount: amt,
          payment_method: bondMethod,
          notes: bondNotes.trim() || null,
        }),
      })
      const j = await readJsonApiResponse(res)
      if (!res.ok) {
        throw new Error((typeof j.error === 'string' && j.error) || 'Could not generate bond receipt.')
      }
      setBondModalOpen(false)
      await reload()
    } catch (e) {
      setBondFormError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBondBusy(false)
    }
  }, [bondAmount, bondDate, bondMethod, bondNotes, data?.tenancy?.id, reload])

  const onRequestInfo = useCallback(async () => {
    if (!bookingId || !infoMessage.trim()) return
    setActionError(null)
    setActionBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const res = await fetch(apiUrl('/api/booking-request-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, message: infoMessage.trim() }),
      })
      const j = await readJsonApiResponse(res)
      if (!res.ok) throw new Error((typeof j.error === 'string' && j.error) || 'Could not send message.')
      setInfoOpen(false)
      setInfoMessage('')
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not send.')
    } finally {
      setActionBusy(false)
    }
  }, [bookingId, infoMessage, reload])

  const onMarkBondReceived = useCallback(async () => {
    if (!bookingId) return
    setBondReceivedError(null)
    setBondReceivedBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setBondReceivedError('You need to be signed in.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-mark-bond-received'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      })
      const j = (await readJsonApiResponse(res)) as { error?: string }
      if (!res.ok) {
        setBondReceivedError(typeof j.error === 'string' ? j.error : 'Could not record bond received.')
        return
      }
      setBondReceivedToast('Bond received recorded.')
      window.setTimeout(() => setBondReceivedToast(null), 4500)
      await reload()
      /** Re-fetch lease state so the preview-mode panel flips to ready_to_sign. */
      setLeasePanelRefreshKey((k) => k + 1)
    } catch {
      setBondReceivedError('Something went wrong.')
    } finally {
      setBondReceivedBusy(false)
    }
  }, [bookingId, reload])

  const onConfirmCancelListing = useCallback(async () => {
    if (!bookingId) return
    setListingCancelBusy(true)
    setListingCancelError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setListingCancelError('You need to be signed in.')
        return
      }
      const reason = listingCancelReason.trim()
      const res = await fetch(apiUrl('/api/booking-listing-cancel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          ...(reason ? { reason } : {}),
        }),
      })
      const j = (await readJsonApiResponse(res)) as { error?: string }
      if (!res.ok) {
        setListingCancelError(typeof j.error === 'string' ? j.error : 'Could not cancel booking.')
        return
      }
      setListingCancelOpen(false)
      setListingCancelReason('')
      await reload()
    } catch {
      setListingCancelError('Something went wrong.')
    } finally {
      setListingCancelBusy(false)
    }
  }, [bookingId, listingCancelReason, reload])

  if (!bookingId) {
    return (
      <div className="max-w-site mx-auto px-4 py-10 text-sm text-gray-600">
        Missing booking id.{' '}
        <Link to="/landlord/dashboard?tab=bookings" className="text-[#FF6F61] font-medium underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#FEF9E4]/30">
        <div className="h-10 w-10 border-2 border-[#FF6F61] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-site mx-auto px-4 py-10">
        <p className="text-red-700 text-sm">{error ?? 'Could not load booking.'}</p>
        <Link to="/landlord/dashboard?tab=bookings" className="mt-4 inline-block text-sm font-medium text-[#FF6F61]">
          ← Back to bookings
        </Link>
      </div>
    )
  }

  const {
    landlordProfileId,
    booking,
    property,
    messages,
    fitRows,
    landlordStripeReady,
    listingBillingLoaded,
    listingBilling,
    otherPendingPipelineCount,
    tenancy,
  } = data

  const showBondReceivedPrimary = landlordListingBondReceivedPrimaryVisible({
    bookingStatus: booking.status,
    serviceTierFinal: booking.service_tier_final,
    bookingLandlordId: booking.landlord_id,
    viewerLandlordProfileId: landlordProfileId,
  })

  const canCancelListingBondPending =
    booking.status === 'bond_pending' && booking.service_tier_final === 'listing'

  const confirmBlockedBanner = landlordBookingConfirmBlockedBanner({
    bookingStatus: booking.status,
    selectedConfirmTier,
    listingBillingLoaded,
    listingBilling,
    landlordStripeReady,
  })
  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  const depositCents = booking.deposit_amount ?? null
  const feeCents = booking.platform_fee_amount ?? null

  const showMarkBondReceived =
    Boolean(tenancy) &&
    !tenancy?.bond_lodged_at &&
    property &&
    isBoardingLodgerBondContext(property.property_type, property.listing_type) &&
    (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed')

  const flowLabel =
    booking.status === 'awaiting_info'
      ? 'Awaiting student response'
      : booking.status === 'pending_confirmation'
        ? 'Awaiting your response'
        : null

  return (
    <div className="min-h-full bg-[#FEF9E4]/25 pb-36 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            to="/landlord/dashboard?tab=bookings"
            className="font-medium text-gray-600 hover:text-gray-900 underline-offset-2"
          >
            ← Bookings
          </Link>
        </div>

        <header className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Review booking request
          </h1>
          <p className="text-sm text-gray-600">
            Reference{' '}
            <span className="font-mono font-semibold text-gray-900">{bookingReferenceLabel(booking.id)}</span>
            {receivedAgo ? (
              <>
                {' '}
                · <span className="text-gray-500">{receivedAgo}</span>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(booking.status)}`}>
              {booking.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1">
              {landlordServiceTierTitle(selectedConfirmTier)}
            </span>
            {flowLabel && (
              <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                {flowLabel}
              </span>
            )}
          </div>
        </header>

        {tierModel?.showManagedUpgrade && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              This property is on Quni Listing
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You chose to self-manage this property. You can accept this request as Listing, or permanently upgrade the
              property to Quni Managed for this and future bookings.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedConfirmTier('listing')}
                className={`rounded-2xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/50 ${
                  selectedConfirmTier === 'listing'
                    ? 'border-[#FF6F61] bg-[#FF6F61]/5 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="text-sm font-bold text-gray-900">Accept as Quni Listing</div>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  You arrange bond and rent directly with the renter. The one-off Listing acceptance fee applies.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedConfirmTier('managed')}
                className={`rounded-2xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/50 ${
                  selectedConfirmTier === 'managed'
                    ? 'border-[#FF6F61] bg-[#FF6F61]/5 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="text-sm font-bold text-gray-900">Upgrade property to Quni Managed</div>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Quni handles the managed tenancy workflow. This permanently switches this property to Managed.
                </p>
              </button>
            </div>
          </section>
        )}

        {otherPendingPipelineCount > 0 && (
          <div
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            role="status"
          >
            <p className="font-medium leading-snug">
              ⚠️ {otherPendingPipelineCount} other student{otherPendingPipelineCount === 1 ? '' : 's'} have also
              requested this property. Confirming this booking will automatically decline and refund the others.
            </p>
          </div>
        )}

        {confirmBlockedBanner === 'host_identity_required' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Verify your identity before confirming</p>
            <p className="mt-1 text-amber-900/90">
              Students can place booking requests and pay a holding deposit, but you must complete Stripe identity
              verification before you can accept. This also unlocks your Verified host badge when approved.
            </p>
            <Link
              to="/landlord/dashboard"
              className="inline-block mt-2 text-sm font-semibold text-[#FF6F61] underline underline-offset-2"
            >
              Open dashboard &amp; verify with Stripe →
            </Link>
          </div>
        )}

        {confirmBlockedBanner === 'listing_module_disabled' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="leading-relaxed">
              Listing bookings are temporarily paused. Please try again in a few minutes.
            </p>
          </div>
        )}

        {confirmBlockedBanner === 'listing_no_payment_method' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Add a payment method to confirm</p>
            <p className="mt-1 text-amber-900/90">
              You need a saved payment method to accept Quni Listing bookings. The platform fee ($99) is charged to your
              card on accept.
            </p>
            <button
              type="button"
              onClick={() => setListingPaymentModalOpen(true)}
              className="inline-block mt-2 text-sm font-semibold text-[#FF6F61] underline underline-offset-2"
            >
              Add a card
            </button>
          </div>
        )}

        {confirmBlockedBanner === 'listing_billing_unavailable' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Could not verify Listing billing</p>
            <p className="mt-1 text-amber-900/90">Refresh the page and try again. If this keeps happening, contact support.</p>
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</div>
        )}

        {bondReceivedError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bondReceivedError}</div>
        )}

        <LandlordApplicantReviewHeader student={snapshot} displayName={displayName} bio={data.student?.bio} />

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Fit summary
          </h2>
          <BookingFitSummaryTable rows={fitRows} />
        </section>

        <LandlordBookingOccupancySummary
          occupantCount={booking.occupant_count}
          parkingSelected={booking.parking_selected}
          weeklyRent={booking.weekly_rent != null ? Number(booking.weekly_rent) : null}
          breakdown={parseRentBreakdownAud(booking.rent_breakdown)}
          coTenant={parseCoTenantSnapshot(booking.co_tenant)}
        />

        <LandlordApplicantVerificationSection student={snapshot} />

        {data.student?.verification_type === 'student' && (
          <LandlordApplicantAIAssessmentPanel
            assessment={aiAssessment}
            assessmentAt={aiAssessmentAt}
            loading={aiLoading}
            error={aiError}
            onGenerate={() => void callAssessmentApi({ refresh: false })}
            onRefresh={() => void callAssessmentApi({ refresh: true })}
            refreshDisabled={refreshCooldownRemainingSec > 0 && !aiLoading}
            refreshDisabledReason={`Available in ${Math.ceil(refreshCooldownRemainingSec / 60)} min`}
            showGenerate={!aiAssessment}
          />
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Booking details
          </h2>
          <dl className="text-sm space-y-2 text-gray-700">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Move-in</dt>
              <dd className="font-medium text-gray-900 text-right">{formatDate(moveIn)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Lease length</dt>
              <dd className="font-medium text-gray-900 text-right">{booking.lease_length?.trim() || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Service model</dt>
              <dd className="font-medium text-gray-900 text-right">{landlordServiceTierTitle(selectedConfirmTier)}</dd>
            </div>
            {booking.student_message?.trim() && (
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Message from student</dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-800">{booking.student_message.trim()}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 pt-2 border-t border-gray-100">
              <dt className="text-gray-500">Deposit held</dt>
              <dd className="font-medium text-right tabular-nums">{formatAudCents(depositCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Deposit authorised</dt>
              <dd className="text-right text-xs text-gray-500">{formatDate(booking.created_at.slice(0, 10))}</dd>
            </div>
            {!bookingHasOccupancySnapshot(booking) ? (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Weekly rent</dt>
                <dd className="font-medium text-right tabular-nums">
                  {booking.weekly_rent != null
                    ? `$${Number(booking.weekly_rent).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
                    : '—'}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Bond (listing)</dt>
              <dd className="font-medium text-right tabular-nums">
                {property?.bond != null
                  ? `$${Number(property.bond).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Platform booking fee</dt>
              <dd className="font-medium text-right tabular-nums">{formatAudCents(feeCents)}</dd>
            </div>
            {tenancy?.bond_lodged_at && tenancy.bond_lodgement_reference && (
              <div className="pt-3 border-t border-gray-100 space-y-1">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Bond received</p>
                <p className="text-sm text-gray-800">
                  Receipt <span className="font-mono font-semibold">{tenancy.bond_lodgement_reference}</span>
                  {' · '}
                  {formatDate(tenancy.bond_lodged_at.slice(0, 10))}
                </p>
              </div>
            )}
          </dl>
          {showMarkBondReceived && (
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={openBondModal}
                className="w-full sm:w-auto rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52]"
              >
                Mark bond as received
              </button>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                For boarding/lodger or homestay stays, record when you receive the bond and we&apos;ll email a PDF receipt
                to you and the student.
              </p>
            </div>
          )}
        </section>

        {(booking.status === 'bond_pending' ||
          booking.status === 'confirmed' ||
          booking.status === 'active') && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Tenancy agreement
            </h2>
            <BookingLeasePanel bookingId={booking.id} refreshKey={leasePanelRefreshKey} />
          </section>
        )}

        {messages.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Message thread
            </h2>
            <ul className="space-y-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.sender_role === 'landlord' ? 'bg-[#FEF9E4]/80 ml-4' : 'bg-gray-50 mr-4'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {m.sender_role === 'landlord' ? 'You' : 'Student'} ·{' '}
                    {new Date(m.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap">{m.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:px-0 md:py-0">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
          {showBondReceivedPrimary ? (
            <div className="w-full space-y-2">
              <button
                type="button"
                disabled={bondReceivedBusy}
                onClick={() => void onMarkBondReceived()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6F61] text-white px-4 py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60 shadow-sm min-h-[3rem]"
              >
                {bondReceivedBusy ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Saving…</span>
                  </>
                ) : (
                  'Bond received from renter'
                )}
              </button>
              <p className="text-xs text-gray-600 leading-relaxed px-0.5">
                Confirms you&apos;ve received bond directly from the renter. The renter&apos;s lease will become signable
                once you confirm. This is a self-report — Quni does not hold bond on Listing tenancies.
              </p>
              {canCancelListingBondPending && (
                <button
                  type="button"
                  disabled={bondReceivedBusy || listingCancelBusy}
                  onClick={() => {
                    setListingCancelError(null)
                    setListingCancelOpen(true)
                  }}
                  className="w-full rounded-xl border-2 border-gray-300 bg-white text-gray-800 px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 min-h-[3rem]"
                >
                  Cancel booking
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={!canConfirm || actionBusy}
                onClick={() => void onConfirm()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm min-h-[3rem]"
              >
                {actionBusy ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{confirmBookingBusyLabel(confirmPhase, selectedConfirmTier)}</span>
                  </>
                ) : (
                  selectedConfirmTier === 'listing'
                    ? 'Accept as Quni Listing'
                    : tierModel?.propertyServiceTier === 'listing'
                      ? 'Upgrade and accept as Quni Managed'
                      : 'Accept as Quni Managed'
                )}
              </button>
              <button
                type="button"
                disabled={!canDeclineOrInfo || actionBusy}
                onClick={() => setDeclineOpen(true)}
                className="flex-1 rounded-xl border-2 border-rose-300 text-rose-800 bg-white px-4 py-3 text-sm font-semibold hover:bg-rose-50 disabled:opacity-50"
              >
                Decline booking
              </button>
              <button
                type="button"
                disabled={!canDeclineOrInfo || actionBusy}
                onClick={() => setInfoOpen(true)}
                className="flex-1 rounded-xl border border-gray-300 bg-white text-gray-800 px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Request more information
              </button>
            </>
          )}
        </div>
      </div>

      {listingCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !listingCancelBusy && setListingCancelOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Cancel this booking?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your $99 fee will be refunded in full. The renter will be notified.
            </p>
            <label className="block mt-4 text-sm font-medium text-gray-700">
              Optional note to the renter <span className="text-gray-400 font-normal">(shown in their email)</span>
            </label>
            <textarea
              value={listingCancelReason}
              onChange={(e) => setListingCancelReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Reason for cancelling (optional)"
            />
            {listingCancelError && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {listingCancelError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onConfirmCancelListing()}
                disabled={listingCancelBusy}
                className="rounded-xl bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {listingCancelBusy ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
              <button
                type="button"
                onClick={() => setListingCancelOpen(false)}
                disabled={listingCancelBusy}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setDeclineOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Decline this booking?</h3>
            <p className="mt-2 text-sm text-gray-600">
              The student&apos;s deposit authorisation will be cancelled or refunded. You can optionally leave a short note
              for your records.
            </p>
            <label className="block mt-4 text-sm font-medium text-gray-700">Reason (optional)</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Optional — not shown to the student"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onDecline()}
                disabled={actionBusy}
                className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {actionBusy ? '…' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={() => setDeclineOpen(false)}
                disabled={actionBusy}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {bondModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !bondBusy && setBondModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">Mark bond as received</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              We&apos;ll generate a bond receipt PDF, save it to this tenancy, and email a copy to you and the student.
            </p>
            {bondFormError && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{bondFormError}</p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="bond-date">
                  Date received
                </label>
                <input
                  id="bond-date"
                  type="date"
                  value={bondDate}
                  onChange={(e) => setBondDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="bond-amt">
                  Amount received (AUD)
                </label>
                <input
                  id="bond-amt"
                  type="number"
                  min={0}
                  step="0.01"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="bond-method">
                  Payment method
                </label>
                <select
                  id="bond-method"
                  value={bondMethod}
                  onChange={(e) => setBondMethod(e.target.value as typeof bondMethod)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="bond-notes">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bond-notes"
                  rows={3}
                  value={bondNotes}
                  onChange={(e) => setBondNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                  placeholder="Reference, transaction ID, etc."
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onSubmitBondReceipt()}
                disabled={bondBusy}
                className="rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
              >
                {bondBusy ? 'Generating…' : 'Generate receipt'}
              </button>
              <button
                type="button"
                onClick={() => setBondModalOpen(false)}
                disabled={bondBusy}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <LandlordListingPaymentModal
        open={listingPaymentModalOpen}
        onClose={() => setListingPaymentModalOpen(false)}
        onSuccess={() => {
          setListingPaymentModalOpen(false)
          void reload()
        }}
      />

      {bondReceivedToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 px-4" role="status">
          <div className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg bg-emerald-600">
            {bondReceivedToast}
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setInfoOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">Request more information</h3>
            <p className="mt-2 text-sm text-gray-600">
              We&apos;ll email the student and set this booking to &quot;awaiting info&quot; until they reply from their
              dashboard.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInfoMessage((prev) => (prev.trim() ? `${prev.trim()}\n\n${q}` : q))}
                  className="text-xs rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100"
                >
                  + {q}
                </button>
              ))}
            </div>
            <label className="block mt-4 text-sm font-medium text-gray-700">Your message</label>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="What would you like to know?"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onRequestInfo()}
                disabled={actionBusy || !infoMessage.trim()}
                className="rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
              >
                {actionBusy ? '…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                disabled={actionBusy}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
