import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  useLandlordBookingReview,
  bookingReferenceLabel,
  type LandlordBookingReviewStudent,
} from '../../hooks/useLandlordBookingReview'
import type { LandlordSafeStudentSnapshot } from '../../components/landlord/LandlordStudentProfileModal'
import LandlordApplicantReviewHeader from '../../components/landlord/LandlordApplicantReviewHeader'
import LandlordApplicantProfileDrawer from '../../components/landlord/LandlordApplicantProfileDrawer'
import LandlordApplicantVerificationSection from '../../components/landlord/LandlordApplicantVerificationSection'
import LandlordApplicantAIAssessmentPanel from '../../components/landlord/LandlordApplicantAIAssessmentPanel'
import BookingFitSummaryTable from '../../components/landlord/BookingFitSummaryTable'
import { formatDate } from '../admin/adminUi'
import type { Database } from '../../lib/database.types'
import { isBondPaymentReceiptContext } from '../../lib/listings'
import { parseQldBondRemittancePreference } from '../../lib/tenancy/qldBondRemittance'
import QldRtaLodgementGuidance from '../../components/bond/QldRtaLodgementGuidance'
import { apiUrl } from '../../lib/apiUrl'
import {
  landlordBookingConfirmAllowed,
  landlordBookingConfirmBlockedBanner,
  landlordBookingConfirmBlockedUserMessage,
} from '../../lib/landlordBookingConfirmGate'
import { deriveLandlordPrimaryAction } from '../../lib/booking/landlordPrimaryAction'
import { confirmLandlordBookingWithOptionalThreeDS } from '../../lib/landlordBookingConfirm'
import LandlordListingPaymentModal from '../../components/landlord/LandlordListingPaymentModal'
import { landlordAcceptTierUiModel } from '../../lib/landlordAcceptTierOptions'
import { useServiceTierResolverOptions } from '../../context/PlatformFeaturesContext'
import BookingLeasePanel from '../../components/booking/BookingLeasePanel'
import TenancyAgreementExplainer from '../../components/TenancyAgreementExplainer'
import LandlordListingAcceptedSummary from '../../components/landlord/LandlordListingAcceptedSummary'
import { landlordServiceTierTitle } from '../../lib/landlordServiceTier'
import { startLandlordStripeConnect } from '../../lib/startLandlordStripeConnect'
import UserDashboardBreadcrumb from '../../components/dashboard/UserDashboardBreadcrumb'
import { landlordBookingsPath, userDashboardBreadcrumbs } from '../../lib/userDashboardNav'
import { resolveTenancyPackage } from '../../../api/lib/resolveTenancyPackage'
import { listingBondPaymentLandlordObligations } from '../../lib/tenancy/listingBondPaymentCopy'
import { bookingHasStudentDepositAuthorization } from '../../lib/bookingStudentDepositAuthorization'
import BookingActivityTimeline from '../../components/booking/BookingActivityTimeline'
import BookingReinstatementPanel from '../../components/booking/BookingReinstatementPanel'
import {
  BookingReadinessDriver,
  BookingReadinessReadyRibbon,
  BookingReviewActionCard,
  BookingReviewBookingSummary,
  BookingReviewPropertySummary,
  BookingReviewSummaryStrip,
  BookingReviewSurfaceCard,
  BookingReviewTermsRail,
  bookingReviewGhostButtonClass,
  bookingReviewPrimaryButtonClass,
  type BookingReadinessGate,
} from '../../components/booking/review'
import { resolveBookingReviewLayout } from '../../lib/booking/bookingReviewLayout'
import {
  resolveBookingReviewReadinessGates,
  bookingReviewReadinessAllClear,
  bookingReviewReadinessHint,
  bookingReviewShowReadyRibbon,
  bookingReviewHasNonGateBlocker,
  type BookingReviewReadinessGate as BookingReadinessGateDef,
} from '../../lib/booking/bookingReviewReadinessGates'
import {
  resolveLandlordAwaitingInfoQuestion,
  resolveLandlordBookingReviewActionCopy,
} from '../../lib/booking/bookingReviewActionModel'
import { buildBookingReviewChatThread, initialsOf } from '../../lib/booking/bookingReviewChatThread'
import { resolveListingBondAud } from '../../lib/booking/resolveBookingBondAmount'
import { firstPropertyImageUrl } from '../../lib/propertyImages'
import { studentDisplayName } from '../../lib/nameResolution'
import Section from '../../components/ui/Section'
import { User, Sparkles, TrendingUp, MessageSquare, ArrowLeftRight, FileText, Clock } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  'Could you tell me more about your daily routine?',
  'Do you have any pets?',
  'What are your expectations around shared spaces?',
  'Can you confirm your preferred move-in date?',
]

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
    preferred_name: row.preferred_name,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    course: row.course,
    year_of_study: row.year_of_study,
    study_level: row.study_level,
    student_type: row.student_type,
    languages_spoken: row.languages_spoken ?? [],
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
    preferred_lease_length: row.preferred_lease_length,
    preferred_move_in_date: row.preferred_move_in_date,
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthContext()
  const { data, loading, error, reload, receivedAgo } = useLandlordBookingReview(bookingId, user?.id)

  const [listingAcceptCelebration, setListingAcceptCelebration] = useState(false)

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

  const [rtaBondNumber, setRtaBondNumber] = useState('')
  const [rtaAckRef, setRtaAckRef] = useState('')
  const [rtaLodgedDate, setRtaLodgedDate] = useState('')
  const [rtaRecordBusy, setRtaRecordBusy] = useState(false)
  const [rtaRecordError, setRtaRecordError] = useState<string | null>(null)
  const [rtaRecordToast, setRtaRecordToast] = useState<string | null>(null)
  const [bondReceivedBusy, setBondReceivedBusy] = useState(false)
  const [bondReceivedError, setBondReceivedError] = useState<string | null>(null)
  const [bondReceivedToast, setBondReceivedToast] = useState<string | null>(null)
  const [leasePanelRefreshKey, setLeasePanelRefreshKey] = useState(0)

  const [listingCancelOpen, setListingCancelOpen] = useState(false)
  const [listingCancelBusy, setListingCancelBusy] = useState(false)
  const [listingCancelError, setListingCancelError] = useState<string | null>(null)
  const [listingCancelReason, setListingCancelReason] = useState('')

  const [resendPaymentOpen, setResendPaymentOpen] = useState(false)
  const [resendPaymentBusy, setResendPaymentBusy] = useState(false)
  const [resendPaymentError, setResendPaymentError] = useState<string | null>(null)
  const [resendPaymentNotice, setResendPaymentNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(
    null,
  )

  const [selectedConfirmTier, setSelectedConfirmTier] = useState<'listing' | 'managed'>('managed')

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)

  /** Collapsible section overrides — null means use layout defaults for the current status. */
  const [applicantExpandedOverride, setApplicantExpandedOverride] = useState<boolean | null>(null)
  const [aiExpandedOverride, setAiExpandedOverride] = useState<boolean | null>(null)
  const [fitExpandedOverride, setFitExpandedOverride] = useState<boolean | null>(null)
  const [messagesExpandedOverride, setMessagesExpandedOverride] = useState<boolean | null>(null)
  const [agreementExpanded, setAgreementExpanded] = useState(false)
  const [activityExpanded, setActivityExpanded] = useState(false)

  const [stripeConnectLoading, setStripeConnectLoading] = useState(false)
  const [stripeConnectError, setStripeConnectError] = useState<string | null>(null)

  const onVerifyWithStripe = useCallback(async () => {
    setStripeConnectError(null)
    setStripeConnectLoading(true)
    try {
      const result = await startLandlordStripeConnect('landlord_dashboard')
      if (!result.ok) {
        setStripeConnectError(result.error)
        return
      }
      if (result.alreadyConnected) {
        await reload()
      }
    } finally {
      setStripeConnectLoading(false)
    }
  }, [reload])

  useEffect(() => {
    if (loading || data?.stripeChargesEnabled || data?.adminOverrideVerified) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [loading, reload, data?.stripeChargesEnabled, data?.adminOverrideVerified])

  useEffect(() => {
    if (searchParams.get('accepted') !== 'listing') return
    setListingAcceptCelebration(true)
    setSearchParams({}, { replace: true })
    requestAnimationFrame(() => {
      document.getElementById('listing-accepted-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!data?.booking) return
    const a = data.booking.ai_assessment
    setAiAssessment(typeof a === 'string' && a.trim() ? a.trim() : null)
    setAiAssessmentAt(data.booking.ai_assessment_at ?? null)
    setAiError(false)
  }, [data?.booking?.id, data?.booking?.ai_assessment, data?.booking?.ai_assessment_at])

  const snapshot = useMemo(() => studentToSnapshot(data?.student ?? null), [data?.student])
  const displayName = studentDisplayName(
    {
      preferred_name: snapshot?.preferred_name ?? data?.student?.preferred_name,
      full_name: snapshot?.full_name ?? data?.student?.full_name,
      first_name: snapshot?.first_name ?? data?.student?.first_name,
      last_name: snapshot?.last_name ?? data?.student?.last_name,
    },
    'Student',
  )

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
      studentDepositAuthorized: bookingHasStudentDepositAuthorization(data.booking),
    })
  }, [
    data?.property?.id,
    data?.property?.state,
    data?.property?.property_type,
    data?.property?.is_registered_rooming_house,
    data?.property?.service_tier,
    data?.booking?.stripe_payment_intent_id,
    data?.booking?.service_tier_at_request,
    data?.listingBillingLoaded,
    data?.listingBilling?.moduleEnabled,
    serviceTierResolverOptions,
  ])

  useEffect(() => {
    if (!tierModel) return
    setSelectedConfirmTier(tierModel.defaultTier)
  }, [tierModel?.defaultTier, tierModel?.showListing, tierModel?.showManaged, tierModel?.showManagedUpgrade])

  useEffect(() => {
    if (loading || !data) return
    const hash = window.location.hash.replace(/^#/, '')
    if (hash !== 'applicant-review' && hash !== 'landlord-ai-assessment') return
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading, data])

  const refreshCooldownRemainingSec = useMemo(() => {
    if (!aiAssessmentAt) return 0
    const t = new Date(aiAssessmentAt).getTime()
    if (!Number.isFinite(t)) return 0
    const elapsed = Date.now() - t
    const left = 3600_000 - elapsed
    return left > 0 ? Math.ceil(left / 1000) : 0
  }, [aiAssessmentAt, aiLoading])

  const listingBondObligations = useMemo(() => {
    if (!data?.property || !data.booking) return null
    const isListingBondPending =
      data.booking.status === 'bond_pending' && data.booking.service_tier_final === 'listing'
    if (!isListingBondPending) return null
    const moveIn =
      (typeof data.booking.move_in_date === 'string' && data.booking.move_in_date.trim()) ||
      (typeof data.booking.start_date === 'string' && data.booking.start_date.trim()) ||
      undefined
    const pkg = resolveTenancyPackage({
      state: data.property.state ?? 'NSW',
      property_type: data.property.property_type ?? '',
      is_registered_rooming_house: Boolean(data.property.is_registered_rooming_house),
      date: moveIn,
    })
    if (!pkg.supported) return null
    const qldPref = parseQldBondRemittancePreference(data.property.qld_bond_remittance_preference)
    return listingBondPaymentLandlordObligations(pkg.rules.bond, data.property.state, {
      qldBondRemittancePreference: qldPref,
    })
  }, [
    data?.booking?.status,
    data?.booking?.service_tier_final,
    data?.booking?.move_in_date,
    data?.booking?.start_date,
    data?.property?.state,
    data?.property?.property_type,
    data?.property?.is_registered_rooming_house,
    data?.property?.qld_bond_remittance_preference,
  ])

  const canConfirm =
    !!data &&
    !!tierModel &&
    (tierModel.showListing || tierModel.showManaged) &&
    landlordBookingConfirmAllowed({
      bookingStatus: data.booking.status,
      selectedConfirmTier,
      listingBillingLoaded: data.listingBillingLoaded,
      listingBilling: data.listingBilling,
      stripeChargesEnabled: data.stripeChargesEnabled,
      adminOverrideVerified: data.adminOverrideVerified,
      listingFeeExempt: data.landlordFeeExempt,
      listingUsesOccupancyAgreement: data.listingUsesOccupancyAgreement,
      propertyPayoutComplete: data.propertyPayoutComplete,
      property: data.property,
      booking: data.booking,
    })

  const isListingApplyBooking =
    data?.booking?.service_tier_at_request === 'listing' ||
    (data?.property?.service_tier === 'listing' &&
      data?.booking != null &&
      !bookingHasStudentDepositAuthorization(data.booking))

  const canDeclineOrInfo =
    data &&
    (data.booking.status === 'pending_confirmation' || data.booking.status === 'awaiting_info') &&
    (isListingApplyBooking || Boolean(data.booking.stripe_payment_intent_id))

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
      if (selectedConfirmTier === 'listing') {
        await reload()
        setListingAcceptCelebration(true)
        requestAnimationFrame(() => {
          document.getElementById('listing-accepted-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
      navigate('/landlord/dashboard?tab=bookings')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not confirm.')
    } finally {
      setConfirmPhase('idle')
      setActionBusy(false)
    }
  }, [bookingId, navigate, reload, selectedConfirmTier])

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
  }, [bookingId, reload])

  useEffect(() => {
    if (!data?.booking) return
    const b = data.booking as Database['public']['Tables']['bookings']['Row']
    setRtaBondNumber(typeof b.rta_bond_number === 'string' ? b.rta_bond_number : '')
    setRtaAckRef(typeof b.rta_acknowledgement_reference === 'string' ? b.rta_acknowledgement_reference : '')
    setRtaLodgedDate(
      typeof b.rta_bond_lodged_at === 'string' && b.rta_bond_lodged_at.trim()
        ? b.rta_bond_lodged_at.slice(0, 10)
        : '',
    )
  }, [data?.booking?.id, data?.booking?.rta_bond_number, data?.booking?.rta_acknowledgement_reference, data?.booking?.rta_bond_lodged_at])

  const onSaveRtaBondDetails = useCallback(async () => {
    if (!bookingId) return
    setRtaRecordError(null)
    setRtaRecordBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setRtaRecordError('You need to be signed in.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-record-rta-bond'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          rtaBondNumber: rtaBondNumber.trim() || null,
          rtaAcknowledgementReference: rtaAckRef.trim() || null,
          rtaBondLodgedAt: rtaLodgedDate.trim() || null,
        }),
      })
      const j = (await readJsonApiResponse(res)) as { error?: string }
      if (!res.ok) {
        setRtaRecordError(typeof j.error === 'string' ? j.error : 'Could not save RTA bond details.')
        return
      }
      setRtaRecordToast('RTA bond details saved.')
      window.setTimeout(() => setRtaRecordToast(null), 4500)
      await reload()
    } catch {
      setRtaRecordError('Something went wrong.')
    } finally {
      setRtaRecordBusy(false)
    }
  }, [bookingId, rtaAckRef, rtaBondNumber, rtaLodgedDate, reload])

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

  const onConfirmResendPaymentInstructions = useCallback(async () => {
    if (!bookingId) return
    setResendPaymentError(null)
    setResendPaymentBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setResendPaymentError('You need to be signed in.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-resend-payment-instructions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      })
      const j = (await readJsonApiResponse(res)) as { error?: string; code?: string }
      if (!res.ok) {
        const message =
          typeof j.error === 'string' ? j.error : 'Could not send payment instructions to the renter.'
        setResendPaymentOpen(false)
        setResendPaymentNotice({ message, tone: 'error' })
        window.setTimeout(() => setResendPaymentNotice(null), 6000)
        return
      }
      setResendPaymentOpen(false)
      setResendPaymentNotice({ message: 'Payment instructions sent to the renter.', tone: 'success' })
      window.setTimeout(() => setResendPaymentNotice(null), 4500)
    } catch {
      setResendPaymentError('Something went wrong.')
    } finally {
      setResendPaymentBusy(false)
    }
  }, [bookingId])

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

  // Hooks must stay above loading/error early returns — otherwise React #310 when data arrives.
  const chatThread = useMemo(
    () =>
      buildBookingReviewChatThread({
        viewerRole: 'landlord',
        introMessage: data?.booking?.student_message,
        introCreatedAt: data?.booking?.created_at,
        otherPartyName: displayName,
        messages: data?.messages ?? [],
      }),
    [data?.booking?.student_message, data?.booking?.created_at, data?.messages, displayName],
  )

  const openMessagesSection = useCallback(() => {
    setMessagesExpandedOverride(true)
    requestAnimationFrame(() => {
      document.getElementById('review-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const scrollToAgreement = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('tenancy-agreement-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  if (!bookingId) {
    return (
      <div className="max-w-site mx-auto px-4 py-10 text-sm text-admin-ink-4">
        Missing booking id.{' '}
        <Link to="/landlord/dashboard?tab=bookings" className="text-admin-coral font-medium underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-admin-cream/30">
        <div className="h-10 w-10 border-2 border-admin-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-site mx-auto px-4 py-10">
        <p className="text-admin-danger-fg text-sm">{error ?? 'Could not load booking.'}</p>
        <Link to="/landlord/dashboard?tab=bookings" className="mt-4 inline-block text-sm font-medium text-admin-coral">
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
    stripeChargesEnabled,
    adminOverrideVerified,
    listingBillingLoaded,
    listingBilling,
    otherPendingPipelineCount,
    tenancy,
    landlordFeeExempt,
    listingUsesOccupancyAgreement,
    propertyPayoutComplete,
  } = data

  const isListingBondPending =
    booking.status === 'bond_pending' && booking.service_tier_final === 'listing'

  const isListingPropertyContext =
    property?.service_tier === 'listing' ||
    booking.service_tier_at_request === 'listing' ||
    booking.service_tier_final === 'listing'

  const listingFeeDisplay = landlordFeeExempt ? '$0.00' : '$99.00'

  const propertyAddressLine = property
    ? [property.address, property.suburb, property.state, property.postcode].filter(Boolean).join(', ') ||
      property.title?.trim() ||
      ''
    : ''

  const showResendPaymentInstructions =
    booking.service_tier_final === 'listing' &&
    listingUsesOccupancyAgreement &&
    propertyPayoutComplete &&
    (booking.status === 'bond_pending' || booking.status === 'confirmed' || booking.status === 'active')

  const canCancelListingBondPending =
    booking.status === 'bond_pending' && booking.service_tier_final === 'listing'

  const confirmBlockedBanner = landlordBookingConfirmBlockedBanner({
    bookingStatus: booking.status,
    selectedConfirmTier,
    listingBillingLoaded,
    listingBilling,
    stripeChargesEnabled,
    adminOverrideVerified,
    listingFeeExempt: landlordFeeExempt,
    listingUsesOccupancyAgreement,
    propertyPayoutComplete,
    property: property ?? undefined,
    booking,
  })
  const readinessGates: BookingReadinessGateDef[] =
    booking.status === 'pending_confirmation'
      ? resolveBookingReviewReadinessGates({
          selectedConfirmTier,
          stripeChargesEnabled,
          adminOverrideVerified,
          property,
          booking,
          listingUsesOccupancyAgreement,
          propertyPayoutComplete,
          listingFeeExempt: landlordFeeExempt,
          listingBillingLoaded,
          listingBilling,
        })
      : []
  const readinessAllClear = readinessGates.length > 0 && bookingReviewReadinessAllClear(readinessGates)
  const readinessHint = bookingReviewReadinessHint(readinessGates)
  const showReadinessDriver = booking.status === 'pending_confirmation' && readinessGates.length > 0 && !readinessAllClear
  // Non-gate blockers (module paused / billing unavailable) keep Accept off — never show the green ribbon then.
  const showReadinessReady =
    booking.status === 'pending_confirmation' &&
    bookingReviewShowReadyRibbon({ readinessAllClear, canConfirm })
  const readinessNonGateBlockMessage =
    booking.status === 'pending_confirmation' &&
    bookingReviewHasNonGateBlocker({ readinessAllClear, canConfirm })
      ? landlordBookingConfirmBlockedUserMessage(confirmBlockedBanner, booking.status, property ?? undefined)
      : null
  const readinessUiGates: BookingReadinessGate[] = readinessGates.map((g) => ({
    id: g.id,
    label: g.label,
    sub: g.sub,
    state: g.state,
    actionLabel: g.actionLabel,
    onAction:
      g.state === 'done'
        ? undefined
        : () => {
            if (g.actionKind === 'verify_identity') {
              void onVerifyWithStripe()
              return
            }
            if (g.actionKind === 'add_payment_method') {
              setListingPaymentModalOpen(true)
              return
            }
            if (g.actionHref) navigate(g.actionHref)
          },
  }))

  const isQldSchemeListing =
    (property?.state ?? '').trim().toUpperCase() === 'QLD' &&
    listingBondObligations != null

  const isQldBoardingProperty =
    (property?.state ?? '').trim().toUpperCase() === 'QLD' &&
    isBondPaymentReceiptContext(property?.property_type)

  const showRtaBondRecord =
    isQldSchemeListing &&
    (isListingBondPending ||
      booking.status === 'confirmed' ||
      booking.status === 'active' ||
      booking.status === 'completed')

  const reviewLayout = resolveBookingReviewLayout(booking.status, 'landlord')

  const propertyPhotoUrl = property ? firstPropertyImageUrl(property.images) : null
  const propertyStreetLine = property?.address?.trim() || property?.title?.trim() || ''
  const bondDisplayAud =
    booking.bond_amount != null
      ? Number(booking.bond_amount)
      : resolveListingBondAud(property, booking.weekly_rent != null ? Number(booking.weekly_rent) : null)
  const bondDeadlineLabel = booking.bond_window_expires_at?.trim()
    ? formatDate(booking.bond_window_expires_at.slice(0, 10))
    : null

  const breadcrumbSegments = isListingBondPending
    ? userDashboardBreadcrumbs('landlord', { label: 'Bookings', to: landlordBookingsPath() })
    : userDashboardBreadcrumbs(
        'landlord',
        { label: 'Bookings', to: landlordBookingsPath() },
        { label: 'Review request' },
      )

  const primaryAction = deriveLandlordPrimaryAction({
    bookingStatus: booking.status,
    serviceTierFinal: booking.service_tier_final,
    bookingLandlordId: booking.landlord_id,
    viewerLandlordProfileId: landlordProfileId,
    bondReceivedByLandlordAt: booking.bond_received_by_landlord_at,
    hasTenancy: Boolean(tenancy),
    tenancyBondLodgedAt: tenancy?.bond_lodged_at ?? null,
    tenancyBondLodgementReference: tenancy?.bond_lodgement_reference ?? null,
    propertyType: property?.property_type ?? null,
    hasProperty: Boolean(property),
  })
  const primaryActionKind = primaryAction.kind

  const awaitingInfoQuestion = resolveLandlordAwaitingInfoQuestion(messages)

  const canReplyInThread = Boolean(canDeclineOrInfo)

  // Action-card copy by status (pure model). copyStatus may borrow bond_pending when mark-bond.
  const actionCopy = resolveLandlordBookingReviewActionCopy({
    status: primaryAction.copyStatus,
    studentDisplayName: displayName,
    askedAtLabel: awaitingInfoQuestion?.askedAtLabel ?? null,
    bondDeadlineLabel,
    hasActionRequired: booking.status === 'pending_confirmation',
  })
  const actionDeadlineLabel = primaryAction.suppressDeadlinePill ? null : actionCopy.deadlineLabel

  const applicantExpanded =
    applicantExpandedOverride ?? reviewLayout.applicantDefaultOpen
  const aiExpanded = aiExpandedOverride ?? reviewLayout.evaluationDefaultOpen
  const fitExpanded = fitExpandedOverride ?? reviewLayout.evaluationDefaultOpen
  const messagesExpanded = messagesExpandedOverride ?? reviewLayout.messagesDefaultOpen

  const serviceTierResolved = booking.service_tier_final ?? selectedConfirmTier
  const planLabel =
    serviceTierResolved === 'managed' ? 'Managed by Quni' : 'Quni Listing'
  const planTooltip =
    serviceTierResolved === 'managed'
      ? 'Managed by Quni — we collect rent, chase signatures and handle the tenancy for a 6% fee.'
      : 'Quni Listing — you manage this tenancy yourself. Quni holds no money; bond and rent are paid to you directly.'
  const listingHref = property?.id ? `/property/${property.id}` : null
  const propertySubtitle = propertyAddressLine || propertyStreetLine || null

  const receivedLabel = booking.created_at
    ? `Received ${formatDate(booking.created_at.slice(0, 10))}`
    : receivedAgo
      ? `Received ${receivedAgo}`
      : null

  return (
    <div className="min-h-full bg-admin-surface-2">
      <div className="mx-auto max-w-[1180px] px-6 py-6 pb-20">
        <UserDashboardBreadcrumb segments={breadcrumbSegments} className="mb-[26px] text-[13px] text-admin-ink-5" />

        <div className="grid grid-cols-1 items-start gap-7 min-[921px]:grid-cols-[minmax(0,1fr)_356px]">
          {/* —— Rail (first in DOM for mobile order) —— */}
          <div className="order-first flex flex-col gap-4 min-[921px]:order-last min-[921px]:sticky min-[921px]:top-5">
            <BookingReviewActionCard
              eyebrow={actionCopy.eyebrow}
              eyebrowTone={actionCopy.eyebrowTone}
              title={actionCopy.title}
              sub={actionCopy.sub}
              deadline={actionDeadlineLabel ?? undefined}
              deadlineTone={actionCopy.deadlineTone}
            >
              <div className="space-y-3.5">
                {actionError && (
                  <div className="rounded-admin-sm border border-admin-danger/30 bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
                    {actionError}
                  </div>
                )}

                {bondReceivedError && (
                  <div className="rounded-admin-sm border border-admin-danger/30 bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
                    {bondReceivedError}
                  </div>
                )}

                {isListingBondPending && (
                  <LandlordListingAcceptedSummary
                    bookingReference={bookingReferenceLabel(booking.id)}
                    propertyTitle={property?.title?.trim() ?? ''}
                    propertyAddress={propertyAddressLine}
                    bondAmountAud={
                      booking.bond_amount != null
                        ? Number(booking.bond_amount)
                        : resolveListingBondAud(
                            property,
                            booking.weekly_rent != null ? Number(booking.weekly_rent) : null,
                          )
                    }
                    bondDeadlineIso={booking.bond_window_expires_at}
                    listingFeeDisplay={listingFeeDisplay}
                    bondObligations={listingBondObligations}
                    justAccepted={listingAcceptCelebration}
                    onDismissCelebration={() => setListingAcceptCelebration(false)}
                  />
                )}

                {booking.status === 'pending_confirmation' ? (
                  <div id="confirm-requirements" className="scroll-mt-4 space-y-3">
                    {showReadinessDriver ? (
                      <BookingReadinessDriver gates={readinessUiGates} hint={readinessHint ?? undefined} />
                    ) : null}
                    {showReadinessReady ? <BookingReadinessReadyRibbon /> : null}
                    {readinessNonGateBlockMessage ? (
                      <p className="m-0 text-[13px] leading-snug text-admin-warning-fg" role="status">
                        {readinessNonGateBlockMessage}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {confirmBlockedBanner === 'host_identity_required' && (
                      <div
                        id="confirm-requirements"
                        className="scroll-mt-4 rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg"
                      >
                        <p className="font-medium">Verify your identity before confirming</p>
                        <p className="mt-1 text-admin-warning-fg/90">
                          Renters can place booking requests and pay a holding deposit, but you must complete Stripe identity
                          verification before you can accept. This also unlocks your Verified host badge when approved.
                        </p>
                        {stripeConnectError && (
                          <p className="mt-2 text-sm text-admin-danger-fg" role="alert">
                            {stripeConnectError}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={stripeConnectLoading}
                          onClick={() => void onVerifyWithStripe()}
                          className="mt-2 inline-block text-sm font-semibold text-admin-coral underline underline-offset-2 disabled:opacity-60"
                        >
                          {stripeConnectLoading ? 'Opening Stripe…' : 'Verify with Stripe →'}
                        </button>
                        <p className="mt-2 text-xs text-admin-warning-fg/80">
                          Complete verification in Stripe, then return here - we refresh when you switch back to this tab.
                        </p>
                      </div>
                    )}

                    {confirmBlockedBanner === 'listing_module_disabled' && (
                      <div className="rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
                        <p className="leading-relaxed">
                          Listing bookings are temporarily paused. Please try again in a few minutes.
                        </p>
                      </div>
                    )}

                    {confirmBlockedBanner === 'listing_no_payment_method' && (
                      <div
                        id="confirm-requirements"
                        className="scroll-mt-4 rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg"
                      >
                        <p className="font-medium">Add a payment method to confirm</p>
                        <p className="mt-1 text-admin-warning-fg/90">
                          You need a saved payment method to accept Quni Listing bookings. The platform fee ($99) is charged to your
                          card on accept.
                        </p>
                        <button
                          type="button"
                          onClick={() => setListingPaymentModalOpen(true)}
                          className="mt-2 inline-block text-sm font-semibold text-admin-coral underline underline-offset-2"
                        >
                          Add a card
                        </button>
                      </div>
                    )}

                    {confirmBlockedBanner === 'listing_payout_details_missing' && property ? (
                      <div
                        id="confirm-requirements"
                        className="scroll-mt-4 rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg"
                      >
                        <p className="font-medium">Add payee bank details to accept</p>
                        <p className="mt-1 text-admin-warning-fg/90">
                          This listing needs payout bank details before you can accept Quni Listing bookings. Renters pay bond and
                          weekly rent directly to this account by fee-free bank transfer.
                        </p>
                        <Link
                          to={`/landlord/property/edit/${property.id}#section-pricing-availability`}
                          className="mt-2 inline-block text-sm font-semibold text-admin-coral underline underline-offset-2"
                        >
                          Add payee bank details →
                        </Link>
                      </div>
                    ) : null}

                    {confirmBlockedBanner === 'listing_billing_unavailable' && (
                      <div className="rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
                        <p className="font-medium">Could not verify Listing billing</p>
                        <p className="mt-1 text-admin-warning-fg/90">Refresh the page and try again. If this keeps happening, contact support.</p>
                      </div>
                    )}
                  </>
                )}

              {showResendPaymentInstructions ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={resendPaymentBusy}
                    onClick={() => {
                      setResendPaymentError(null)
                      setResendPaymentOpen(true)
                    }}
                    className="min-h-[3rem] w-full rounded-admin-md border border-admin-line bg-admin-surface-1 px-4 py-3 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-60"
                  >
                    Resend payment instructions to renter
                  </button>
                  <p className="px-0.5 text-xs leading-relaxed text-admin-ink-4">
                    Email the renter the current bond and rent payment details (same as at acceptance).
                  </p>
                </div>
              ) : null}

              {primaryActionKind === 'bond-received' ? (
                <div className="space-y-2">
                  {bondDeadlineLabel ? (
                    <div className="flex items-center gap-2.5 rounded-admin-md border border-admin-coral-30 bg-admin-coral-tint px-3 py-2.5">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="shrink-0 stroke-admin-coral-active"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.02em] text-admin-coral-active">
                          Confirm bond received by
                        </p>
                        <p className="text-[15px] font-bold text-admin-ink">{bondDeadlineLabel}</p>
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={bondReceivedBusy}
                    onClick={() => void onMarkBondReceived()}
                    className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-admin-md bg-admin-coral px-4 py-3 text-sm font-semibold text-white shadow-admin-card hover:bg-admin-coral-hover disabled:opacity-60"
                  >
                    {bondReceivedBusy ? (
                      <>
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      'Bond received from renter'
                    )}
                  </button>
                  <p className="px-0.5 text-xs leading-relaxed text-admin-ink-4">
                    {isQldBoardingProperty ? (
                      <>
                        Records off-platform bond receipt on Quni only — this is <strong>not</strong> RTA lodgement. You
                        must still lodge with the RTA within 10 days and keep the Acknowledgement of Rental Bond.
                      </>
                    ) : (
                      <>
                        Confirms you&apos;ve received bond directly from the renter. We&apos;ll generate a PDF receipt,
                        save it to this tenancy, and email a copy to you and the renter.
                      </>
                    )}{' '}
                    Signing links are in{' '}
                    <a href="#tenancy-agreement-preview" className="font-semibold text-admin-coral underline underline-offset-2">
                      Tenancy agreement
                    </a>{' '}
                    below and in your DocuSeal email. This is a self-report - Quni does not hold bond on Listing tenancies.
                  </p>
                  {isQldSchemeListing ? <QldRtaLodgementGuidance className="mt-2" /> : null}
                  {showRtaBondRecord ? (
                    <div className="mt-1 space-y-3 rounded-admin-md border border-admin-line bg-admin-surface-1 p-4">
                      <p className="text-sm font-semibold text-admin-ink">RTA bond record (optional)</p>
                      <p className="text-xs leading-relaxed text-admin-ink-4">
                        After lodgement, save the bond number from your Acknowledgement of Rental Bond. This does not gate
                        booking confirmation.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="rta-bond-number" className="mb-1 block text-xs font-medium text-admin-ink-3">
                            RTA bond number
                          </label>
                          <input
                            id="rta-bond-number"
                            type="text"
                            value={rtaBondNumber}
                            onChange={(e) => setRtaBondNumber(e.target.value)}
                            className="w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                            placeholder="From Acknowledgement of Rental Bond"
                          />
                        </div>
                        <div>
                          <label htmlFor="rta-ack-ref" className="mb-1 block text-xs font-medium text-admin-ink-3">
                            Acknowledgement reference
                          </label>
                          <input
                            id="rta-ack-ref"
                            type="text"
                            value={rtaAckRef}
                            onChange={(e) => setRtaAckRef(e.target.value)}
                            className="w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="rta-lodged-date" className="mb-1 block text-xs font-medium text-admin-ink-3">
                            Lodgement date
                          </label>
                          <input
                            id="rta-lodged-date"
                            type="date"
                            value={rtaLodgedDate}
                            onChange={(e) => setRtaLodgedDate(e.target.value)}
                            className="w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      {rtaRecordError ? <p className="text-xs text-admin-danger-fg">{rtaRecordError}</p> : null}
                      {rtaRecordToast ? <p className="text-xs text-admin-success-fg">{rtaRecordToast}</p> : null}
                      <button
                        type="button"
                        disabled={rtaRecordBusy}
                        onClick={() => void onSaveRtaBondDetails()}
                        className="inline-flex items-center justify-center rounded-admin-sm border border-admin-line bg-admin-surface-1 px-4 py-2 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-60"
                      >
                        {rtaRecordBusy ? 'Saving…' : 'Save RTA bond details'}
                      </button>
                    </div>
                  ) : null}
                  {canCancelListingBondPending && (
                    <button
                      type="button"
                      disabled={bondReceivedBusy || listingCancelBusy}
                      onClick={() => {
                        setListingCancelError(null)
                        setListingCancelOpen(true)
                      }}
                      className="min-h-[3rem] w-full rounded-admin-md border-2 border-admin-line bg-admin-surface-1 px-4 py-3 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-50"
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              ) : primaryActionKind === 'mark-bond' ? (
                <div>
                  <button
                    type="button"
                    onClick={openBondModal}
                    className="w-full rounded-admin-md bg-admin-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-admin-coral-hover sm:w-auto"
                  >
                    Mark bond as received
                  </button>
                  <p className="mt-2 text-xs leading-relaxed text-admin-ink-5">
                    {isQldBoardingProperty
                      ? 'Record when you receive bond payment from the renter. We\u2019ll email a payment receipt (not RTA lodgement confirmation) and remind you to lodge with the RTA within 10 days.'
                      : 'For boarding/lodger or homestay stays, record when you receive the bond and we\u2019ll email a PDF receipt to you and the renter.'}
                  </p>
                </div>
              ) : primaryActionKind === 'accept-decline-info' ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={!canConfirm || actionBusy}
                    aria-disabled={!canConfirm || actionBusy}
                    onClick={() => {
                      if (!canConfirm) {
                        document.getElementById('confirm-requirements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        return
                      }
                      void onConfirm()
                    }}
                    className={`inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-admin-md px-4 py-3 text-[15px] font-semibold shadow-admin-card ${
                      canConfirm && !actionBusy
                        ? 'bg-admin-coral text-white hover:bg-admin-coral-hover'
                        : 'cursor-not-allowed bg-admin-surface-3 text-admin-ink-5'
                    }`}
                  >
                    {actionBusy ? (
                      <>
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{confirmBookingBusyLabel(confirmPhase, selectedConfirmTier)}</span>
                      </>
                    ) : selectedConfirmTier === 'listing' ? (
                      'Accept as Quni Listing'
                    ) : tierModel?.propertyServiceTier === 'listing' ? (
                      'Upgrade and accept as Quni Managed'
                    ) : (
                      'Accept as Quni Managed'
                    )}
                  </button>
                  {!canConfirm && !actionBusy && showReadinessDriver ? (
                    <p className="mt-0.5 text-center text-xs text-admin-ink-5">Complete the steps above to accept.</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canDeclineOrInfo || actionBusy}
                    onClick={() => setDeclineOpen(true)}
                    className="min-h-[3rem] w-full rounded-admin-md border border-admin-line bg-transparent px-4 py-3 text-sm font-semibold text-admin-ink-4 hover:bg-admin-surface-2 disabled:opacity-50"
                  >
                    Decline booking
                  </button>
                  <button
                    type="button"
                    disabled={!canDeclineOrInfo || actionBusy}
                    onClick={() => setInfoOpen(true)}
                    className="min-h-[3rem] w-full rounded-admin-md border border-admin-line bg-admin-surface-1 px-4 py-3 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-50"
                  >
                    Request more information
                  </button>
                </div>
              ) : booking.status === 'awaiting_info' ? (
                <div className="space-y-3">
                  {awaitingInfoQuestion ? (
                    <div className="rounded-admin-md border border-admin-line bg-admin-surface-2 px-4 py-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
                        Your question
                      </p>
                      <blockquote className="m-0 text-sm leading-relaxed text-admin-ink-2">
                        &ldquo;{awaitingInfoQuestion.text}&rdquo;
                      </blockquote>
                    </div>
                  ) : null}
                  <button type="button" onClick={openMessagesSection} className={bookingReviewGhostButtonClass()}>
                    Send another message
                  </button>
                </div>
              ) : booking.status === 'confirmed' ? (
                <button type="button" onClick={scrollToAgreement} className={bookingReviewPrimaryButtonClass()}>
                  View agreement
                </button>
              ) : booking.status === 'active' || booking.status === 'completed' ? (
                <div className="flex flex-col gap-2.5">
                  <button type="button" onClick={scrollToAgreement} className={bookingReviewGhostButtonClass()}>
                    View tenancy
                  </button>
                  <button type="button" onClick={openMessagesSection} className={bookingReviewGhostButtonClass()}>
                    Message tenant
                  </button>
                </div>
              ) : booking.status === 'expired' ? (
                <div className="space-y-2.5">
                  <BookingReinstatementPanel bookingId={booking.id} bookingStatus={booking.status} onChanged={() => void reload()} />
                  <Link
                    to={landlordBookingsPath()}
                    className={`${bookingReviewGhostButtonClass()} inline-flex items-center justify-center`}
                  >
                    ← Back to bookings
                  </Link>
                </div>
              ) : null}
              </div>
            </BookingReviewActionCard>

            <BookingReviewSurfaceCard padding="rail">
              <BookingReviewTermsRail
                booking={booking}
                propertyBondWeeks={property?.bond_weeks != null ? Number(property.bond_weeks) : null}
                tier={isListingApplyBooking ? 'listing' : 'managed'}
                bondDisplayAud={bondDisplayAud}
                serviceTierTitle={landlordServiceTierTitle(booking.service_tier_final ?? selectedConfirmTier)}
                leaseHolderName={displayName}
                inputsDisabled={reviewLayout.inputsDisabled}
                onSaved={() => {
                  void reload()
                  setLeasePanelRefreshKey((k) => k + 1)
                }}
              />
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
                  title={property?.title?.trim() || propertyStreetLine || 'Property'}
                  subtitle={propertySubtitle}
                  planLabel={planLabel}
                  planTooltip={planTooltip}
                  listingHref={listingHref}
                  photoUrl={propertyPhotoUrl}
                />
              }
            />

            <Section
              id="review-applicant"
              title="The applicant"
              icon={<User />}
              collapsible={reviewLayout.applicantCollapsible}
              expanded={applicantExpanded}
              onToggle={() => setApplicantExpandedOverride(!applicantExpanded)}
              summary={`${displayName} · applicant`}
            >
              <div className="space-y-5">
                <div id="applicant-review" className="scroll-mt-4">
                  <LandlordApplicantReviewHeader
                    student={snapshot}
                    displayName={displayName}
                    bio={data.student?.bio}
                    embedded
                    onOpenFullProfile={() => setProfileDrawerOpen(true)}
                  />
                </div>

                <hr className="my-3 border-admin-line-soft" aria-hidden />

                <LandlordApplicantVerificationSection student={snapshot} embedded />
              </div>
            </Section>

            <Section
              id="review-ai"
              title="AI assessment"
              tone="ai"
              icon={<Sparkles />}
              expanded={aiExpanded}
              onToggle={() => setAiExpandedOverride(!aiExpanded)}
            >
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
            </Section>

            <Section
              id="review-fit"
              title="Fit summary"
              icon={<TrendingUp />}
              expanded={fitExpanded}
              onToggle={() => setFitExpandedOverride(!fitExpanded)}
            >
              <BookingFitSummaryTable rows={fitRows} />
            </Section>

            <Section
              id="review-messages"
              title="Messages"
              icon={<MessageSquare />}
              summary={`Conversation with ${displayName} · ${chatThread.length} message${chatThread.length === 1 ? '' : 's'}`}
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
                  {canReplyInThread ? (
                    <>
                      <label htmlFor="review-messages-reply" className="sr-only">
                        Reply to {displayName}
                      </label>
                      <textarea
                        id="review-messages-reply"
                        value={infoMessage}
                        onChange={(e) => setInfoMessage(e.target.value)}
                        rows={3}
                        placeholder={`Reply to ${displayName}…`}
                        className="w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={actionBusy || !infoMessage.trim()}
                          onClick={() => void onRequestInfo()}
                          className="inline-flex items-center gap-1.5 rounded-admin-md bg-admin-coral px-4 py-2 text-sm font-semibold text-white hover:bg-admin-coral-hover disabled:opacity-50"
                        >
                          {actionBusy ? 'Sending…' : 'Send'}
                        </button>
                      </div>
                      {actionError && <p className="mt-2 text-xs text-admin-danger-fg">{actionError}</p>}
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-admin-ink-5">
                      You can reply while this request is pending or awaiting more information.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {reviewLayout.showTierChooser && tierModel?.showManagedUpgrade && (
              <Section
                id="review-tier"
                title="How will you handle this tenancy?"
                icon={<ArrowLeftRight />}
                collapsible={false}
              >
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-admin-ink">This property is on Quni Listing</h3>
                  <p className="text-sm leading-relaxed text-admin-ink-4">
                    You chose to self-manage this property. You can accept this request as Listing, or permanently upgrade the
                    property to Quni Managed for this and future bookings.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedConfirmTier('listing')}
                      className={`rounded-admin-lg border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-coral/50 ${
                        selectedConfirmTier === 'listing'
                          ? 'border-admin-coral bg-admin-coral-tint shadow-admin-card'
                          : 'border-admin-line bg-admin-surface-1 hover:border-admin-ink-5'
                      }`}
                    >
                      <div className="text-sm font-bold text-admin-ink">Accept as Quni Listing</div>
                      <p className="mt-2 text-sm leading-relaxed text-admin-ink-4">
                        You arrange bond and rent directly with the renter. The one-off Listing acceptance fee applies.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedConfirmTier('managed')}
                      className={`rounded-admin-lg border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-coral/50 ${
                        selectedConfirmTier === 'managed'
                          ? 'border-admin-coral bg-admin-coral-tint shadow-admin-card'
                          : 'border-admin-line bg-admin-surface-1 hover:border-admin-ink-5'
                      }`}
                    >
                      <div className="text-sm font-bold text-admin-ink">Upgrade property to Quni Managed</div>
                      <p className="mt-2 text-sm leading-relaxed text-admin-ink-4">
                        Quni handles the managed tenancy workflow. This permanently switches this property to Managed.
                      </p>
                    </button>
                  </div>
                </div>
              </Section>
            )}

            {reviewLayout.showBackupsWarning && otherPendingPipelineCount > 0 && (
              <div
                className="rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg shadow-admin-card"
                role="status"
              >
                <p className="font-medium leading-snug">
                  {otherPendingPipelineCount} other student{otherPendingPipelineCount === 1 ? '' : 's'} have also
                  requested this property.{' '}
                  {isListingPropertyContext ? (
                    isListingBondPending ? (
                      <>
                        They remain as backups until you confirm bond receipt below; confirming bond will automatically
                        decline them. Quni does not hold deposits on Listing applications.
                      </>
                    ) : (
                      <>
                        They stay as backups while you review this request. If you accept and later confirm bond receipt,
                        remaining applicants are automatically declined. Quni does not hold deposits on Listing applications.
                      </>
                    )
                  ) : (
                    <>Confirming this booking will automatically decline and refund the others.</>
                  )}
                </p>
              </div>
            )}

            {reviewLayout.showAgreement && (
              <Section
                id="review-agreement"
                title="Tenancy agreement"
                icon={<FileText />}
                expanded={agreementExpanded}
                onToggle={() => setAgreementExpanded((v) => !v)}
              >
                <div className="space-y-5">
                  {(booking.status === 'bond_pending' ||
                    booking.status === 'confirmed' ||
                    booking.status === 'active') &&
                    property && (
                    <div id="tenancy-agreement-preview" className="scroll-mt-4 space-y-2">
                      <TenancyAgreementExplainer
                        state={property.state ?? ''}
                        propertyType={property.property_type ?? ''}
                        isRegisteredRoomingHouse={Boolean(property.is_registered_rooming_house)}
                      />
                      <BookingLeasePanel
                        bookingId={booking.id}
                        refreshKey={leasePanelRefreshKey}
                        allowPrepareRetry={
                          booking.service_tier_final === 'listing' &&
                          booking.status === 'bond_pending' &&
                          booking.listing_agreement_status === 'failed'
                        }
                        allowRegenerateAgreement={
                          booking.service_tier_final === 'listing' && booking.status === 'bond_pending'
                        }
                      />
                      {(tenancy?.bond_lodged_at || tenancy?.bond_lodgement_reference) && (
                        <div className="space-y-1 rounded-admin-md border border-admin-line-soft bg-admin-surface-2 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
                            {isQldBoardingProperty ? 'Bond payment receipt' : 'Bond received'}
                          </p>
                          <p className="text-sm text-admin-ink-2">
                            Receipt <span className="font-mono font-semibold">{tenancy.bond_lodgement_reference}</span>
                            {tenancy.bond_lodged_at ? (
                              <>
                                {' · '}
                                {formatDate(tenancy.bond_lodged_at.slice(0, 10))}
                              </>
                            ) : null}
                          </p>
                          {isQldBoardingProperty ? (
                            <p className="text-xs leading-relaxed text-admin-ink-5">
                              Payment receipt only — not RTA lodgement. Keep your RTA Acknowledgement of Rental Bond when lodged.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {reviewLayout.showActivity && (
              <Section
                id="review-activity"
                title="Activity"
                icon={<Clock />}
                expanded={activityExpanded}
                onToggle={() => setActivityExpanded((v) => !v)}
              >
                <BookingActivityTimeline bookingId={booking.id} mode="internal" embedded />
              </Section>
            )}
          </div>
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
          <div className="relative z-10 w-full max-w-md rounded-admin-lg bg-white shadow-xl border border-admin-line p-6">
            <h3 className="text-lg font-semibold text-admin-ink">Cancel this booking?</h3>
            <p className="mt-2 text-sm text-admin-ink-4">
              {listingFeeDisplay === '$0.00'
                ? 'No Listing fee was charged for this booking. The renter will be notified.'
                : `Your ${listingFeeDisplay} Listing fee will be refunded in full. The renter will be notified.`}
            </p>
            <label className="block mt-4 text-sm font-medium text-admin-ink-3">
              Optional note to the renter <span className="text-gray-400 font-normal">(shown in their email)</span>
            </label>
            <textarea
              value={listingCancelReason}
              onChange={(e) => setListingCancelReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
              placeholder="Reason for cancelling (optional)"
            />
            {listingCancelError && (
              <p className="mt-3 text-sm text-admin-danger-fg bg-admin-danger-bg border border-admin-danger rounded-admin-sm px-3 py-2">
                {listingCancelError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onConfirmCancelListing()}
                disabled={listingCancelBusy}
                className="rounded-admin-md bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {listingCancelBusy ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
              <button
                type="button"
                onClick={() => setListingCancelOpen(false)}
                disabled={listingCancelBusy}
                className="rounded-admin-md border border-admin-line bg-white px-4 py-2.5 text-sm font-semibold text-admin-ink-3"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {resendPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !resendPaymentBusy && setResendPaymentOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-admin-lg bg-white shadow-xl border border-admin-line p-6">
            <h3 className="text-lg font-semibold text-admin-ink">Resend payment instructions?</h3>
            <p className="mt-2 text-sm text-admin-ink-4 leading-relaxed">
              Resend payment instructions to {displayName}? They&apos;ll get an email with the bond and rent payment
              details.
            </p>
            {resendPaymentError && (
              <p className="mt-3 text-sm text-admin-danger-fg bg-admin-danger-bg border border-admin-danger rounded-admin-sm px-3 py-2">
                {resendPaymentError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onConfirmResendPaymentInstructions()}
                disabled={resendPaymentBusy}
                className="rounded-admin-md bg-admin-coral text-white px-4 py-2.5 text-sm font-semibold hover:bg-admin-coral-hover disabled:opacity-50"
              >
                {resendPaymentBusy ? 'Sending…' : 'Send email'}
              </button>
              <button
                type="button"
                onClick={() => setResendPaymentOpen(false)}
                disabled={resendPaymentBusy}
                className="rounded-admin-md border border-admin-line bg-white px-4 py-2.5 text-sm font-semibold text-admin-ink-3"
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
          <div className="relative z-10 w-full max-w-md rounded-admin-lg bg-white shadow-xl border border-admin-line p-6">
            <h3 className="text-lg font-semibold text-admin-ink">Decline this booking?</h3>
            <p className="mt-2 text-sm text-admin-ink-4">
              The renter&apos;s deposit authorisation will be cancelled or refunded. You can optionally leave a short note
              for your records.
            </p>
            <label className="block mt-4 text-sm font-medium text-admin-ink-3">Reason (optional)</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
              placeholder="Optional - not shown to the renter"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onDecline()}
                disabled={actionBusy}
                className="rounded-admin-md bg-admin-danger text-white px-4 py-2.5 text-sm font-semibold hover:bg-admin-danger disabled:opacity-50"
              >
                {actionBusy ? '…' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={() => setDeclineOpen(false)}
                disabled={actionBusy}
                className="rounded-admin-md border border-admin-line bg-white px-4 py-2.5 text-sm font-semibold text-admin-ink-3"
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
          <div className="relative z-10 w-full max-w-md rounded-admin-lg bg-white shadow-xl border border-admin-line p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-admin-ink">Mark bond as received</h3>
            <p className="mt-2 text-sm text-admin-ink-4 leading-relaxed">
              {isQldBoardingProperty
                ? 'We\u2019ll generate a bond payment receipt PDF (not RTA lodgement confirmation), save it to this tenancy, and email a copy to you and the renter. You must still lodge with the RTA within 10 days.'
                : 'We\u2019ll generate a bond receipt PDF, save it to this tenancy, and email a copy to you and the renter.'}
            </p>
            {bondFormError && (
              <p className="mt-3 text-sm text-admin-danger-fg bg-admin-danger-bg border border-admin-danger rounded-admin-sm px-3 py-2">{bondFormError}</p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-ink-3" htmlFor="bond-date">
                  Date received
                </label>
                <input
                  id="bond-date"
                  type="date"
                  value={bondDate}
                  onChange={(e) => setBondDate(e.target.value)}
                  className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-ink-3" htmlFor="bond-amt">
                  Amount received (AUD)
                </label>
                <input
                  id="bond-amt"
                  type="number"
                  min={0}
                  step="0.01"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(e.target.value)}
                  className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-ink-3" htmlFor="bond-method">
                  Payment method
                </label>
                <select
                  id="bond-method"
                  value={bondMethod}
                  onChange={(e) => setBondMethod(e.target.value as typeof bondMethod)}
                  className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-ink-3" htmlFor="bond-notes">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bond-notes"
                  rows={3}
                  value={bondNotes}
                  onChange={(e) => setBondNotes(e.target.value)}
                  className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm resize-y"
                  placeholder="Reference, transaction ID, etc."
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onSubmitBondReceipt()}
                disabled={bondBusy}
                className="rounded-admin-md bg-admin-coral text-white px-4 py-2.5 text-sm font-semibold hover:bg-admin-coral-hover disabled:opacity-50"
              >
                {bondBusy ? 'Generating…' : 'Generate receipt'}
              </button>
              <button
                type="button"
                onClick={() => setBondModalOpen(false)}
                disabled={bondBusy}
                className="rounded-admin-md border border-admin-line bg-white px-4 py-2.5 text-sm font-semibold text-admin-ink-3"
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
          <div className="rounded-admin-md px-4 py-3 text-center text-sm font-semibold text-white shadow-lg bg-admin-success">
            {bondReceivedToast}
          </div>
        </div>
      )}

      {resendPaymentNotice && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 px-4" role="status">
          <div
            className={`rounded-admin-md px-4 py-3 text-center text-sm font-semibold text-white shadow-lg ${
              resendPaymentNotice.tone === 'success' ? 'bg-admin-success' : 'bg-admin-danger'
            }`}
          >
            {resendPaymentNotice.message}
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setInfoOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-admin-lg bg-white shadow-xl border border-admin-line p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-admin-ink">Request more information</h3>
            <p className="mt-2 text-sm text-admin-ink-4">
              We&apos;ll email the renter and set this booking to &quot;awaiting info&quot; until they reply from their
              dashboard.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInfoMessage((prev) => (prev.trim() ? `${prev.trim()}\n\n${q}` : q))}
                  className="text-xs rounded-full border border-admin-line bg-admin-surface-2 px-3 py-1.5 text-left text-admin-ink-3 hover:bg-admin-surface-3"
                >
                  + {q}
                </button>
              ))}
            </div>
            <label className="block mt-4 text-sm font-medium text-admin-ink-3">Your message</label>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-admin-sm border border-admin-line px-3 py-2 text-sm"
              placeholder="What would you like to know?"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onRequestInfo()}
                disabled={actionBusy || !infoMessage.trim()}
                className="rounded-admin-md bg-admin-coral text-white px-4 py-2.5 text-sm font-semibold hover:bg-admin-coral-hover disabled:opacity-50"
              >
                {actionBusy ? '…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                disabled={actionBusy}
                className="rounded-admin-md border border-admin-line bg-white px-4 py-2.5 text-sm font-semibold text-admin-ink-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <LandlordApplicantProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        student={snapshot}
        displayName={displayName}
        onMessage={() => {
          setProfileDrawerOpen(false)
          openMessagesSection()
        }}
      />
    </div>
  )
}
