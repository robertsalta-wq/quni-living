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
import { formatDate } from '../admin/adminUi'
import type { Database } from '../../lib/database.types'
import { isBoardingLodgerBondContext } from '../../lib/listings'
import { apiUrl } from '../../lib/apiUrl'

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

const SUGGESTED_QUESTIONS = [
  'Could you tell me more about your daily routine?',
  'Do you have any pets?',
  'What are your expectations around shared spaces?',
  'Can you confirm your preferred move-in date?',
]

function statusBadgeClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-900'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'confirmed' || s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-rose-50 text-rose-900'
  return 'bg-gray-100 text-gray-700'
}

function formatAudCents(cents: number | null | undefined) {
  if (cents == null || !Number.isFinite(Number(cents))) return '—'
  return `$${(Number(cents) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { data, loading, error, reload, receivedAgo } = useLandlordBookingReview(bookingId, user?.id)

  const [aiAssessment, setAiAssessment] = useState<string | null>(null)
  const [aiAssessmentAt, setAiAssessmentAt] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)

  const [actionBusy, setActionBusy] = useState(false)
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

  const refreshCooldownRemainingSec = useMemo(() => {
    if (!aiAssessmentAt) return 0
    const t = new Date(aiAssessmentAt).getTime()
    if (!Number.isFinite(t)) return 0
    const elapsed = Date.now() - t
    const left = 3600_000 - elapsed
    return left > 0 ? Math.ceil(left / 1000) : 0
  }, [aiAssessmentAt, aiLoading])

  const canConfirm =
    data &&
    (data.booking.status === 'pending_confirmation' || data.booking.status === 'awaiting_info') &&
    data.landlordStripeReady

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
    setActionBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const res = await fetch('/api/create-rent-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId }),
      })
      const j = await readJsonApiResponse(res)
      if (!res.ok) {
        const msg =
          (typeof j.message === 'string' && j.message.trim()) ||
          (typeof j.error === 'string' && j.error) ||
          'Could not confirm booking.'
        throw new Error(msg)
      }
      navigate('/landlord/dashboard?tab=bookings')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not confirm.')
    } finally {
      setActionBusy(false)
    }
  }, [bookingId, navigate])

  const onDecline = useCallback(async () => {
    if (!bookingId) return
    setActionError(null)
    setActionBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expired. Please sign in again.')
      const res = await fetch('/api/refund-booking-deposit', {
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
      const res = await fetch('/api/booking-request-info', {
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

  const { booking, property, messages, fitRows, landlordStripeReady, otherPendingPipelineCount, tenancy } = data
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
            {flowLabel && (
              <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                {flowLabel}
              </span>
            )}
          </div>
        </header>

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

        {!landlordStripeReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Set up your payout account before confirming</p>
            <p className="mt-1 text-amber-900/90">
              Students can pay a holding deposit, but you need Stripe Connect to capture it when you confirm.
            </p>
            <Link
              to="/landlord/dashboard"
              className="inline-block mt-2 text-sm font-semibold text-[#FF6F61] underline underline-offset-2"
            >
              Open dashboard &amp; connect Stripe →
            </Link>
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</div>
        )}

        <LandlordApplicantReviewHeader student={snapshot} displayName={displayName} bio={data.student?.bio} />

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Fit summary
          </h2>
          <BookingFitSummaryTable rows={fitRows} />
        </section>

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
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Weekly rent</dt>
              <dd className="font-medium text-right tabular-nums">
                {booking.weekly_rent != null
                  ? `$${Number(booking.weekly_rent).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
                  : '—'}
              </dd>
            </div>
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
          <button
            type="button"
            disabled={!canConfirm || actionBusy}
            onClick={() => void onConfirm()}
            className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            {actionBusy ? '…' : 'Confirm booking'}
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
        </div>
      </div>

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
