import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'
import { formatDisplayName } from '../lib/formatDisplayName'
import { formatDate } from './admin/adminUi'
import { LandlordStripePayoutsCard } from '../components/landlord/LandlordStripePayoutsCard'
import {
  buildLandlordVerificationFromProfile,
  LandlordApplicantVerificationBadges,
  LandlordApplicantVerificationDetail,
} from '../components/landlord/LandlordApplicantVerificationBadges'
import LandlordStudentProfileModal, {
  type LandlordSafeStudentSnapshot,
} from '../components/landlord/LandlordStudentProfileModal'
import AiSparkleIcon from '../components/AiSparkleIcon'
import OnboardingChecklistBanner from '../components/OnboardingChecklistBanner'
import { isLandlordListingUnlocked, landlordDisplayNameComplete } from '../lib/onboardingChecklist'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { looksLikeMissingDbColumn, messageFromSupabaseError } from '../lib/supabaseErrorMessage'
import { apiUrl } from '../lib/apiUrl'
import QaseSubmitModal from '../components/qase/QaseSubmitModal'
type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type EnquiryRow = Database['public']['Tables']['enquiries']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type EnquiryStatus = EnquiryRow['status']
type BookingStatus = BookingRow['status']

type PropertySummary = Pick<
  PropertyRow,
  'id' | 'title' | 'slug' | 'rent_per_week' | 'room_type' | 'suburb' | 'images' | 'status' | 'featured' | 'created_at'
>

type EnquiryWithProperty = EnquiryRow & {
  properties: { title: string; slug: string } | null
}

/** Signed agreement objects in Storage (`tenancy-documents` bucket), from `tenancy_documents` after signing. */
type LandlordAgreementSignedPaths =
  | { kind: 'dual'; rta: string; addendum: string }
  | { kind: 'single'; path: string }

type BookingWithRelations = BookingRow & {
  properties: { title: string; slug: string; suburb: string | null } | null
  student_profiles: LandlordSafeStudentSnapshot | null
  /** DocuSeal signer embed — only while signing is pending (not after `status === 'signed'`). */
  landlord_agreement_signing_url: string | null
  /** When the lease/RTA row is signed and Storage paths exist — download instead of opening DocuSeal. */
  landlord_agreement_signed_paths: LandlordAgreementSignedPaths | null
}

/** DocuSeal stores per-submitter signing links on the submission; email uses landlord `embed_src`. */
function landlordDocusealEmbedFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const dr = (metadata as Record<string, unknown>).docuseal_response
  if (!dr || typeof dr !== 'object' || Array.isArray(dr)) return null
  const submitters = (dr as Record<string, unknown>).submitters
  if (!Array.isArray(submitters)) return null
  const landlord = submitters.find(
    (s) =>
      s &&
      typeof s === 'object' &&
      String((s as Record<string, unknown>).role || '')
        .toLowerCase()
        .includes('landlord'),
  ) as Record<string, unknown> | undefined
  const first = submitters[0] as Record<string, unknown> | undefined
  const fromLandlord = landlord && typeof landlord.embed_src === 'string' ? landlord.embed_src.trim() : ''
  const fromFirst = first && typeof first.embed_src === 'string' ? first.embed_src.trim() : ''
  const url = fromLandlord || fromFirst
  return url || null
}

function docusealSigningDocScore(doc: { document_type: string; status: string }, hasUrl: boolean): number {
  if (!hasUrl) return 0
  const dt = doc.document_type
  if (dt !== 'lease' && dt !== 'residential_tenancy') return 0
  const st = doc.status
  /** Completed signings: never use DocuSeal embed (redirects to /completed). */
  if (st === 'signed') return 0
  if (dt === 'residential_tenancy' && st === 'sent_for_signing') return 100
  if (dt === 'lease' && st === 'sent_for_signing') return 80
  return 10
}

type TenancyDocRow = {
  document_type: string
  status: string
  metadata: unknown
  file_path: string | null
}

type TenancyWithDocsForSigning = {
  booking_id: string | null
  tenancy_documents: unknown
}

function buildLandlordSigningUrlByBookingId(rows: TenancyWithDocsForSigning[] | null | undefined): Map<string, string> {
  const best = new Map<string, { score: number; url: string }>()
  for (const row of rows ?? []) {
    const bid = row.booking_id
    if (!bid) continue
    const raw = row.tenancy_documents
    const docs = Array.isArray(raw) ? raw : raw ? [raw] : []
    for (const item of docs) {
      if (!item || typeof item !== 'object') continue
      const doc = item as TenancyDocRow
      const url = landlordDocusealEmbedFromMetadata(doc.metadata)
      if (!url) continue
      const score = docusealSigningDocScore(doc, true)
      if (score === 0) continue
      const prev = best.get(bid)
      if (!prev || score > prev.score) best.set(bid, { score, url })
    }
  }
  const out = new Map<string, string>()
  for (const [bid, v] of best) out.set(bid, v.url)
  return out
}

function signedAgreementPathsFromDoc(doc: TenancyDocRow): LandlordAgreementSignedPaths | null {
  if (doc.status !== 'signed') return null
  if (doc.document_type !== 'lease' && doc.document_type !== 'residential_tenancy') return null
  const meta =
    doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
      ? (doc.metadata as Record<string, unknown>)
      : {}
  const rta =
    typeof meta.signed_rta_file_path === 'string' && meta.signed_rta_file_path.trim().length > 0
      ? meta.signed_rta_file_path.trim()
      : ''
  const addendum =
    typeof meta.signed_addendum_file_path === 'string' && meta.signed_addendum_file_path.trim().length > 0
      ? meta.signed_addendum_file_path.trim()
      : ''
  if (rta && addendum) return { kind: 'dual', rta, addendum }
  const fp = typeof doc.file_path === 'string' && doc.file_path.trim().length > 0 ? doc.file_path.trim() : ''
  if (fp) return { kind: 'single', path: fp }
  return null
}

function signedAgreementDocScore(doc: TenancyDocRow): number {
  if (doc.status !== 'signed') return 0
  if (doc.document_type !== 'lease' && doc.document_type !== 'residential_tenancy') return 0
  if (signedAgreementPathsFromDoc(doc) == null) return 0
  return doc.document_type === 'residential_tenancy' ? 20 : 10
}

/** Prefer residential_tenancy over legacy lease when both have signed Storage paths. */
function buildSignedAgreementPathsByBookingId(rows: TenancyWithDocsForSigning[] | null | undefined): Map<string, LandlordAgreementSignedPaths> {
  const best = new Map<string, { score: number; paths: LandlordAgreementSignedPaths }>()
  for (const row of rows ?? []) {
    const bid = row.booking_id
    if (!bid) continue
    const raw = row.tenancy_documents
    const docs = Array.isArray(raw) ? raw : raw ? [raw] : []
    for (const item of docs) {
      if (!item || typeof item !== 'object') continue
      const doc = item as TenancyDocRow
      const paths = signedAgreementPathsFromDoc(doc)
      if (!paths) continue
      const score = signedAgreementDocScore(doc)
      if (score === 0) continue
      const prev = best.get(bid)
      if (!prev || score > prev.score) best.set(bid, { score, paths })
    }
  }
  const out = new Map<string, LandlordAgreementSignedPaths>()
  for (const [bid, v] of best) out.set(bid, v.paths)
  return out
}

type TabId = 'listings' | 'enquiries' | 'bookings'

/** Loaded for landlord dashboard — safe fields only (see LandlordSafeStudentSnapshot). */
type LandlordLoadedStudentRow = LandlordSafeStudentSnapshot

const LANDLORD_DASHBOARD_STUDENT_SELECT_BASE =
  'id, verification_type, full_name, avatar_url, course, year_of_study, study_level, student_type, nationality, room_type_preference, budget_min_per_week, budget_max_per_week, bio, occupancy_type, move_in_flexibility, has_pets, needs_parking, bills_preference, furnishing_preference, has_guarantor, guarantor_name, accommodation_verification_route, uni_email_verified, uni_email_verified_at'
const LANDLORD_DASHBOARD_STUDENT_SELECT_SUFFIX =
  ', id_submitted_at, enrolment_submitted_at, identity_supporting_submitted_at, is_smoker, universities ( name )'
const LANDLORD_DASHBOARD_STUDENT_SELECT_FULL =
  `${LANDLORD_DASHBOARD_STUDENT_SELECT_BASE}, work_email_verified, work_email_verified_at${LANDLORD_DASHBOARD_STUDENT_SELECT_SUFFIX}`
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY =
  'id, verification_type, full_name, avatar_url, course, year_of_study, study_level, student_type, nationality, room_type_preference, budget_min_per_week, budget_max_per_week, accommodation_verification_route, uni_email_verified, uni_email_verified_at'
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX =
  ', id_submitted_at, enrolment_submitted_at, identity_supporting_submitted_at, is_smoker, universities ( name )'
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_FULL =
  `${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY}, work_email_verified, work_email_verified_at${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX}`
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_CORE = `${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY}${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX}`

function firstNameFromLandlord(p: LandlordRow): string {
  const fn = p.first_name?.trim()
  if (fn) return formatDisplayName(fn).split(/\s+/)[0] || 'there'
  const full = p.full_name?.trim()
  if (full) {
    const w = formatDisplayName(full).split(/\s+/)[0]
    return w || 'there'
  }
  const local = p.email?.split('@')[0]
  return local ? formatDisplayName(local) : 'there'
}

function listingStatusClass(s: PropertyRow['status']) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'pending') return 'bg-amber-100 text-amber-800'
  if (s === 'draft') return 'bg-slate-100 text-slate-700'
  return 'bg-gray-100 text-gray-600'
}

function listingStatusLabel(s: PropertyRow['status']) {
  if (s === 'inactive') return 'paused'
  if (s === 'draft') return 'draft'
  return s
}

function enquiryStatusClass(s: EnquiryStatus) {
  if (s === 'new') return 'bg-blue-100 text-blue-800'
  if (s === 'replied') return 'bg-emerald-100 text-emerald-800'
  return 'bg-gray-100 text-gray-600'
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-800'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'confirmed' || s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-red-50 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function studentDisplayFromBooking(b: BookingWithRelations): string {
  const sp = b.student_profiles
  if (!sp) return '—'
  if (sp.full_name?.trim()) return sp.full_name.trim()
  return '—'
}

/** Stable key for session UI (e.g. AI assessment nudge) per booking request (not per student — same student can have multiple listings). */
function applicantSessionKeyFromBooking(b: BookingWithRelations): string {
  return b.id
}

const ENQUIRY_TRUNC = 100

function ExpiresIn({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [txt, setTxt] = useState('—')
  useEffect(() => {
    if (!expiresAt) {
      setTxt('—')
      return
    }
    const deadline = expiresAt
    function fmt() {
      const ms = new Date(deadline).getTime() - Date.now()
      if (ms <= 0) return 'Expired'
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      return `${h}h ${m}m left to respond`
    }
    setTxt(fmt())
    const id = window.setInterval(() => setTxt(fmt()), 30_000)
    return () => clearInterval(id)
  }, [expiresAt])
  return (
    <span className="block max-w-full text-sm font-semibold text-amber-900 tabular-nums break-words">
      {txt}
    </span>
  )
}

/** Prominent tenancy start date for landlord follow-up (rent is arranged off-platform until recurring rent exists). */
function formatMoveInDateProminent(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = iso.trim().slice(0, 10)
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(iso)
    return d.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function LandlordBookingPaymentErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3">
      <p>
        Payment could not be processed. Please check your details and try again, or contact support at{' '}
        <a href="mailto:hello@quni.com.au" className="font-medium text-red-900 underline underline-offset-2">
          hello@quni.com.au
        </a>
        .
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg bg-white border border-red-200 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/80"
      >
        Try again
      </button>
    </div>
  )
}

export default function LandlordDashboard() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<LandlordRow | null>(null)
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [enquiries, setEnquiries] = useState<EnquiryWithProperty[]>([])
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [tab, setTab] = useState<TabId>('listings')
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null)
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({})
  const [draftingReplyIds, setDraftingReplyIds] = useState<Record<string, boolean>>({})
  const [sendingReplyIds, setSendingReplyIds] = useState<Record<string, boolean>>({})
  const [enquiryInlineErrors, setEnquiryInlineErrors] = useState<Record<string, string | null>>({})
  const [connectLoading, setConnectLoading] = useState(false)
  const [stripeRequiredModalOpen, setStripeRequiredModalOpen] = useState(false)
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null)
  const [duplicateConfirmProperty, setDuplicateConfirmProperty] = useState<PropertySummary | null>(null)
  const [duplicatingListingId, setDuplicatingListingId] = useState<string | null>(null)
  const [publishingListingId, setPublishingListingId] = useState<string | null>(null)
  const [qaseOpen, setQaseOpen] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [studentProfileModal, setStudentProfileModal] = useState<{
    student: LandlordSafeStudentSnapshot | null
    fallbackName: string
    scrollToVerification: boolean
    scrollToAiAssessment: boolean
    sessionKey: string
    /** When set, AI assessment loads listing + rent from this booking (avoids empty context from the dashboard modal). */
    assessmentBookingId: string | null
  } | null>(null)
  const [aiAssessmentGeneratedSessionKeys, setAiAssessmentGeneratedSessionKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const [landlordBookingPaymentError, setLandlordBookingPaymentError] = useState(false)
  const [landlordStudentByProfileId, setLandlordStudentByProfileId] = useState<
    Record<string, LandlordLoadedStudentRow>
  >({})
  const [leaseDownloadErrorId, setLeaseDownloadErrorId] = useState<string | null>(null)
  const [agreementActionBusyId, setAgreementActionBusyId] = useState<string | null>(null)

  const downloadAgreementFromSignedUrls = useCallback(
    async (signedRta: string, signedAddendum: string | null) => {
      const openUrl = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      const trySaveAs = async (url: string, filename: string) => {
        try {
          const r = await fetch(url)
          if (!r.ok) throw new Error('fetch failed')
          const blob = await r.blob()
          const objectUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = objectUrl
          a.download = filename
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(objectUrl)
        } catch {
          openUrl(url)
        }
      }
      if (signedAddendum) {
        await trySaveAs(signedRta, 'NSW-Residential-Tenancy-Agreement.pdf')
        await new Promise((r) => setTimeout(r, 900))
        await trySaveAs(signedAddendum, 'Quni-Platform-Addendum.pdf')
      } else {
        openUrl(signedRta)
      }
    },
    [],
  )

  const fetchLeaseSignedUrlsViaApi = useCallback(async (bookingId: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl('/api/documents/lease-signed-url'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const j = (await res.json()) as {
      signed_url?: string
      signed_url_rta?: string
      signed_url_addendum?: string
      error?: string
    }
    if (!res.ok) return null
    return j
  }, [])

  const handleLandlordAgreement = useCallback(
    async (b: BookingWithRelations) => {
      setLeaseDownloadErrorId(null)
      setAgreementActionBusyId(b.id)
      try {
        const signed = b.landlord_agreement_signed_paths
        const bucket = supabase.storage.from('tenancy-documents')
        const expirySec = 60 * 60 * 24 * 7

        if (signed?.kind === 'dual') {
          const [r1, r2] = await Promise.all([
            bucket.createSignedUrl(signed.rta, expirySec),
            bucket.createSignedUrl(signed.addendum, expirySec),
          ])
          if (!r1.error && !r2.error && r1.data?.signedUrl && r2.data?.signedUrl) {
            await downloadAgreementFromSignedUrls(r1.data.signedUrl, r2.data.signedUrl)
            return
          }
          const api = await fetchLeaseSignedUrlsViaApi(b.id)
          if (api?.signed_url_rta && api.signed_url_addendum) {
            await downloadAgreementFromSignedUrls(api.signed_url_rta, api.signed_url_addendum)
            return
          }
          setLeaseDownloadErrorId(b.id)
          return
        }

        if (signed?.kind === 'single') {
          const r = await bucket.createSignedUrl(signed.path, expirySec)
          if (!r.error && r.data?.signedUrl) {
            await downloadAgreementFromSignedUrls(r.data.signedUrl, null)
            return
          }
          const api = await fetchLeaseSignedUrlsViaApi(b.id)
          if (api?.signed_url_rta && api.signed_url_addendum) {
            await downloadAgreementFromSignedUrls(api.signed_url_rta, api.signed_url_addendum)
            return
          }
          if (api?.signed_url) {
            await downloadAgreementFromSignedUrls(api.signed_url, null)
            return
          }
          setLeaseDownloadErrorId(b.id)
          return
        }

        const url = b.landlord_agreement_signing_url?.trim()
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        }

        const apiOnly = await fetchLeaseSignedUrlsViaApi(b.id)
        if (apiOnly?.signed_url_rta && apiOnly.signed_url_addendum) {
          await downloadAgreementFromSignedUrls(apiOnly.signed_url_rta, apiOnly.signed_url_addendum)
          return
        }
        if (apiOnly?.signed_url) {
          await downloadAgreementFromSignedUrls(apiOnly.signed_url, null)
          return
        }

        setLeaseDownloadErrorId(b.id)
      } catch {
        setLeaseDownloadErrorId(b.id)
      } finally {
        setAgreementActionBusyId(null)
      }
    },
    [downloadAgreementFromSignedUrls, fetchLeaseSignedUrlsViaApi],
  )

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (pErr) throw pErr
      if (!profRaw) {
        setProfile(null)
        setProperties([])
        setEnquiries([])
        setBookings([])
        setLandlordStudentByProfileId({})
        return
      }
      const prof = profRaw as LandlordRow
      setProfile(prof)

      const [propRes, enqRes, bookRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, slug, rent_per_week, room_type, suburb, images, status, featured, created_at')
          .eq('landlord_id', prof.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enquiries')
          .select('*, properties ( title, slug )')
          .eq('landlord_id', prof.id)
          .order('created_at', { ascending: false }),
        supabase.from('bookings').select('*').eq('landlord_id', prof.id).order('created_at', { ascending: false }),
      ])

      if (propRes.error) throw propRes.error
      if (enqRes.error) throw enqRes.error
      if (bookRes.error) throw bookRes.error

      type BookingPropertyDbRow = { id: string; title: string; slug: string; suburb: string | null }

      const bookingRows = (bookRes.data ?? []) as BookingRow[]
      const enquiryRows = (enqRes.data ?? []) as EnquiryWithProperty[]
      const studentIds = [
        ...new Set(
          [
            ...bookingRows.map((b) => b.student_id).filter(Boolean),
            ...enquiryRows.map((e) => e.student_id).filter(Boolean),
          ] as string[],
        ),
      ]
      const bookingPropertyIds = [...new Set(bookingRows.map((b) => b.property_id).filter(Boolean))] as string[]
      const bookingIds = bookingRows.map((b) => b.id)

      const [studRes, bookingPropsRes, tenancyRes] = await Promise.all([
        studentIds.length > 0
          ? (async () => {
              let r = await supabase
                .from('student_profiles')
                .select(LANDLORD_DASHBOARD_STUDENT_SELECT_FULL)
                .in('id', studentIds)
              if (!r.error) {
                return { data: (r.data ?? []) as LandlordLoadedStudentRow[], error: null }
              }
              if (looksLikeMissingDbColumn(r.error)) {
                const r2 = await supabase
                  .from('student_profiles')
                  .select(LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_FULL)
                  .in('id', studentIds)
                if (!r2.error && r2.data) {
                  return {
                    data: r2.data.map((row) => ({
                      ...row,
                      bio: null,
                      occupancy_type: null,
                      move_in_flexibility: null,
                      has_pets: null,
                      needs_parking: null,
                      bills_preference: null,
                      furnishing_preference: null,
                      has_guarantor: null,
                      guarantor_name: null,
                    })) as LandlordLoadedStudentRow[],
                    error: null,
                  }
                }
                if (r2.error && looksLikeMissingDbColumn(r2.error)) {
                  const r3 = await supabase
                    .from('student_profiles')
                    .select(LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_CORE)
                    .in('id', studentIds)
                  if (!r3.error && r3.data) {
                    return {
                      data: r3.data.map((row) => ({
                        ...row,
                        work_email_verified: null,
                        work_email_verified_at: null,
                        bio: null,
                        occupancy_type: null,
                        move_in_flexibility: null,
                        has_pets: null,
                        needs_parking: null,
                        bills_preference: null,
                        furnishing_preference: null,
                        has_guarantor: null,
                        guarantor_name: null,
                      })) as LandlordLoadedStudentRow[],
                      error: null,
                    }
                  }
                  return r3
                }
                return r2
              }
              return r
            })()
          : Promise.resolve({ data: [] as LandlordLoadedStudentRow[], error: null }),
        bookingPropertyIds.length > 0
          ? supabase.from('properties').select('id, title, slug, suburb').in('id', bookingPropertyIds)
          : Promise.resolve({ data: [] as BookingPropertyDbRow[], error: null }),
        bookingIds.length > 0
          ? supabase
              .from('tenancies')
              .select('booking_id, tenancy_documents ( document_type, status, metadata, file_path )')
              .in('booking_id', bookingIds)
          : Promise.resolve({ data: [] as TenancyWithDocsForSigning[], error: null }),
      ])

      if (bookingPropsRes.error) throw bookingPropsRes.error
      if (studRes.error) throw studRes.error

      const tenancyRows = (tenancyRes.data ?? []) as TenancyWithDocsForSigning[]
      const signingUrlByBookingId = tenancyRes.error
        ? new Map<string, string>()
        : buildLandlordSigningUrlByBookingId(tenancyRows)
      const signedPathsByBookingId = tenancyRes.error
        ? new Map<string, LandlordAgreementSignedPaths>()
        : buildSignedAgreementPathsByBookingId(tenancyRows)

      const studentById = new Map<string, LandlordLoadedStudentRow>()
      const studentRecord: Record<string, LandlordLoadedStudentRow> = {}
      if (!studRes.error && studRes.data) {
        for (const row of studRes.data as LandlordLoadedStudentRow[]) {
          if (row?.id) {
            studentById.set(row.id, row)
            studentRecord[row.id] = row
          }
        }
      }
      setLandlordStudentByProfileId(studentRecord)

      const propertyById = new Map<string, { title: string; slug: string; suburb: string | null }>()
      for (const row of (bookingPropsRes.data ?? []) as BookingPropertyDbRow[]) {
        if (row?.id) {
          propertyById.set(row.id, { title: row.title, slug: row.slug, suburb: row.suburb ?? null })
        }
      }

      const mergedBookings: BookingWithRelations[] = bookingRows.map((b) => {
        const sp = b.student_id ? studentById.get(b.student_id) : undefined
        const pr = b.property_id ? propertyById.get(b.property_id) : undefined
        return {
          ...b,
          properties: pr ? { title: pr.title, slug: pr.slug, suburb: pr.suburb } : null,
          student_profiles: sp ? { ...sp } : null,
          landlord_agreement_signing_url: signingUrlByBookingId.get(b.id) ?? null,
          landlord_agreement_signed_paths: signedPathsByBookingId.get(b.id) ?? null,
        }
      })

      setProperties((propRes.data ?? []) as PropertySummary[])
      setEnquiries(enquiryRows)
      setBookings(mergedBookings)
    } catch (e) {
      setError(messageFromSupabaseError(e))
      setProfile(null)
      setProperties([])
      setEnquiries([])
      setBookings([])
      setLandlordStudentByProfileId({})
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = useCallback((t: { kind: 'success' | 'error'; message: string }) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(t)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 4000)
  }, [])

  const stripeConnectParam = searchParams.get('stripe_connect')
  useEffect(() => {
    if (stripeConnectParam !== 'return' && stripeConnectParam !== 'refresh') return
    void load().then(() => {
      setSearchParams({}, { replace: true })
    })
  }, [stripeConnectParam, load, setSearchParams])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'bookings' || t === 'enquiries' || t === 'listings') setTab(t)
  }, [searchParams])

  const markEnquiryRead = useCallback(async (id: string, current: EnquiryStatus) => {
    if (current !== 'new') return
    const { error: upErr } = await supabase.from('enquiries').update({ status: 'read' }).eq('id', id)
    if (!upErr) {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'read' } : e)))
    }
  }, [])

  const toggleEnquiryRow = useCallback(
    (row: EnquiryWithProperty) => {
      if (row.status === 'new') void markEnquiryRead(row.id, row.status)
      setSelectedEnquiryId((prev) => (prev === row.id ? null : row.id))
    },
    [markEnquiryRead],
  )

  const onViewPropertyFromEnquiry = useCallback(
    (row: EnquiryWithProperty) => {
      if (row.status === 'new') void markEnquiryRead(row.id, row.status)
    },
    [markEnquiryRead],
  )

  const draftEnquiryReply = useCallback(
    async (row: EnquiryWithProperty) => {
      const studentName = row.name?.trim() || ''
      const studentMessage = row.message?.trim() || ''
      if (!studentName || !studentMessage) {
        setEnquiryInlineErrors((prev) => ({ ...prev, [row.id]: 'Student name and message are required.' }))
        return
      }

      setEnquiryInlineErrors((prev) => ({ ...prev, [row.id]: null }))
      setDraftingReplyIds((prev) => ({ ...prev, [row.id]: true }))
      try {
        let propertyTitle = row.properties?.title?.trim() || undefined
        let propertySuburb: string | undefined
        if (row.property_id) {
          const { data: propData, error: propErr } = await supabase
            .from('properties')
            .select('title, suburb')
            .eq('id', row.property_id)
            .maybeSingle()
          if (propErr) throw propErr
          propertyTitle = (propData?.title ?? propertyTitle)?.trim() || undefined
          propertySuburb = propData?.suburb?.trim() || undefined
        }

        const landlordName =
          profile?.full_name?.trim() ||
          [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(' ').trim() ||
          undefined

        const res = await fetch('/api/ai/draft-enquiry-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName,
            studentMessage,
            propertyTitle,
            propertySuburb,
            landlordName,
          }),
        })
        const payload = (await res.json().catch(() => ({}))) as { reply?: string; error?: string }
        if (!res.ok) throw new Error(payload.error || 'Could not draft reply.')
        const reply = typeof payload.reply === 'string' ? payload.reply.trim() : ''
        if (!reply) throw new Error('AI returned an empty reply.')

        setDraftReplies((prev) => ({ ...prev, [row.id]: reply }))
      } catch (e) {
        setEnquiryInlineErrors((prev) => ({
          ...prev,
          [row.id]: e instanceof Error ? e.message : 'Could not draft reply.',
        }))
      } finally {
        setDraftingReplyIds((prev) => ({ ...prev, [row.id]: false }))
      }
    },
    [profile],
  )

  const cancelDraftReply = useCallback((enquiryId: string) => {
    setDraftReplies((prev) => {
      const next = { ...prev }
      delete next[enquiryId]
      return next
    })
    setEnquiryInlineErrors((prev) => ({ ...prev, [enquiryId]: null }))
  }, [])

  const sendEnquiryReply = useCallback(async (enquiryId: string) => {
    const replyText = (draftReplies[enquiryId] ?? '').trim()
    if (!replyText) {
      setEnquiryInlineErrors((prev) => ({ ...prev, [enquiryId]: 'Reply cannot be empty.' }))
      return
    }

    setEnquiryInlineErrors((prev) => ({ ...prev, [enquiryId]: null }))
    setSendingReplyIds((prev) => ({ ...prev, [enquiryId]: true }))
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setEnquiryInlineErrors((prev) => ({
          ...prev,
          [enquiryId]: 'Session expired — please refresh the page and try again.',
        }))
        return
      }

      const res = await fetch('/api/enquiries/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enquiryId, reply: replyText }),
      })
      const payload = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error || 'Could not send reply.')
      }

      setEnquiries((prev) =>
        prev.map((row) =>
          row.id === enquiryId
            ? {
                ...row,
                reply: replyText,
                replied_at: new Date().toISOString(),
                status: 'replied',
              }
            : row,
        ),
      )
      setDraftReplies((prev) => {
        const next = { ...prev }
        delete next[enquiryId]
        return next
      })
    } catch (e) {
      setEnquiryInlineErrors((prev) => ({
        ...prev,
        [enquiryId]: e instanceof Error ? e.message : 'Could not send reply.',
      }))
    } finally {
      setSendingReplyIds((prev) => ({ ...prev, [enquiryId]: false }))
    }
  }, [draftReplies])

  const startStripeConnect = useCallback(async () => {
    setError(null)
    setConnectLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('You need to be signed in.')

      const res = await fetch('/api/create-connect-account-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnContext: 'landlord_dashboard' }),
      })
      const raw = await res.text()
      let body: { url?: string; error?: string; alreadyConnected?: boolean } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      if (body.alreadyConnected) {
        await load()
        setStripeRequiredModalOpen(false)
        return
      }
      if (!body.url) throw new Error('No onboarding URL returned.')

      const a = document.createElement('a')
      a.href = body.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
      setStripeRequiredModalOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe setup.')
    } finally {
      setConnectLoading(false)
    }
  }, [load])

  const publishDraftListing = useCallback(
    async (property: PropertySummary) => {
      if (property.status !== 'draft') return
      setPublishingListingId(property.id)
      try {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ status: 'active' })
          .eq('id', property.id)
        if (updateError) throw updateError
        await load()
        showToast({ kind: 'success', message: 'Listing published and now live.' })
      } catch (e) {
        const msg =
          e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
            ? String((e as { message: string }).message)
            : 'Could not publish listing.'
        showToast({ kind: 'error', message: msg })
      } finally {
        setPublishingListingId(null)
      }
    },
    [load, showToast],
  )

  const confirmDuplicateListing = useCallback(async () => {
    const src = duplicateConfirmProperty
    if (!src) return
    setDuplicatingListingId(src.id)
    setError(null)
    try {
      const { data: newId, error: rpcErr } = await supabase.rpc('duplicate_property_listing', {
        p_source_id: src.id,
      })
      if (rpcErr) throw rpcErr
      if (typeof newId !== 'string' || !newId.trim()) {
        throw new Error('Duplicate did not return a listing id.')
      }
      setDuplicateConfirmProperty(null)
      navigate(`/landlord/property/edit/${newId.trim()}`)
      void load()
    } catch (e) {
      setError(messageFromSupabaseError(e))
    } finally {
      setDuplicatingListingId(null)
    }
  }, [duplicateConfirmProperty, load, navigate])

  const togglePropertyStatus = useCallback(
    async (property: PropertySummary) => {
      if (property.status !== 'active' && property.status !== 'inactive') return
      const nextStatus: PropertyRow['status'] = property.status === 'active' ? 'inactive' : 'active'
      setUpdatingListingId(property.id)
      setError(null)
      try {
        const { error: updateError } = await withSentryMonitoring('LandlordDashboard/toggle-property-status', () =>
          supabase.from('properties').update({ status: nextStatus }).eq('id', property.id),
        )
        if (updateError) throw updateError
        await load()
      } catch (e) {
        setError(messageFromSupabaseError(e))
      } finally {
        setUpdatingListingId(null)
      }
    },
    [load],
  )

  const activeListings = properties.filter((p) => p.status === 'active').length
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length
  const pendingBookings = bookings.filter(
    (b) =>
      b.status === 'pending' ||
      b.status === 'pending_confirmation' ||
      b.status === 'pending_payment' ||
      b.status === 'awaiting_info',
  ).length

  const pendingConfirmation = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.status === 'pending_confirmation' && b.stripe_payment_intent_id) || b.status === 'awaiting_info',
      ),
    [bookings],
  )
  const otherBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          !((b.status === 'pending_confirmation' && b.stripe_payment_intent_id) || b.status === 'awaiting_info'),
      ),
    [bookings],
  )
  const checklistTotal = 7
  const nameOk = landlordDisplayNameComplete(profile)
  const phoneOk = Boolean(profile?.phone?.trim())
  const bioOk = Boolean(profile?.bio?.trim() && profile.bio.trim().length > 20)
  const avatarOk = Boolean(profile?.avatar_url?.trim())
  const termsOk = Boolean(profile?.terms_accepted_at)
  const landlordTermsOk = Boolean(profile?.landlord_terms_accepted_at)
  const stripeChargesOk = profile?.stripe_charges_enabled === true

  const checklistDone = [termsOk, landlordTermsOk, nameOk, phoneOk, bioOk, avatarOk, stripeChargesOk].filter(Boolean)
    .length
  const checklistPct = Math.round((checklistDone / checklistTotal) * 100)

  const firstIncomplete = (() => {
    if (!termsOk) return 'Accept terms of service →'
    if (!landlordTermsOk) return 'Accept landlord service agreement →'
    if (!nameOk) return 'Add your name →'
    if (!phoneOk) return 'Add your phone →'
    if (!bioOk) return 'Add a bio →'
    if (!avatarOk) return 'Add a profile photo →'
    if (!stripeChargesOk) return 'Connect bank account →'
    return null
  })()
  const listingUnlocked = isLandlordListingUnlocked(profile)

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-6 py-12 text-sm text-gray-600">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex min-h-0 w-full bg-gray-50 items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-6 py-12 max-w-lg mx-auto">
        <p className="text-red-700 text-sm">{error ?? 'Landlord profile not found.'}</p>
        <Link to="/landlord-profile" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Go to profile
        </Link>
      </div>
    )
  }

  const welcomeName = firstNameFromLandlord(profile)

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 pb-16">
      <div className="max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {user?.id && (
          <OnboardingChecklistBanner
            role="landlord"
            userId={user.id}
            studentProfile={null}
            landlordProfile={profile}
            onRefresh={load}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome back, {welcomeName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here’s what’s happening with your listings, enquiries, and booking requests.
            </p>
          </div>
          {listingUnlocked ? (
            <Link
              to="/landlord/property/new"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm shrink-0"
            >
              Add new listing
            </Link>
          ) : (
            <span
              title="Complete your account setup to add listings"
              className="inline-flex items-center justify-center rounded-xl bg-gray-300 text-gray-500 px-5 py-2.5 text-sm font-medium cursor-not-allowed shadow-sm shrink-0 select-none"
            >
              Add new listing
            </span>
          )}
        </div>

        <LandlordStripePayoutsCard profile={profile} onRefresh={load} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active listings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{activeListings}</p>
            <p className="text-xs text-gray-500 mt-1">Published as active</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Enquiries</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{enquiries.length}</p>
            <p className="text-xs mt-1">
              {newEnquiries > 0 ? (
                <span className="font-semibold text-amber-700">{newEnquiries} new</span>
              ) : (
                <span className="text-gray-500">No new messages</span>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bookings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{bookings.length}</p>
            <p className="text-xs mt-1">
              {pendingBookings > 0 ? (
                <span className="font-semibold text-amber-700">{pendingBookings} pending</span>
              ) : (
                <span className="text-gray-500">Nothing pending</span>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your profile</p>
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-3">
                {checklistDone === checklistTotal ? (
                  <p className="text-sm font-semibold text-emerald-700">Profile complete ✓</p>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{checklistPct}% complete</p>
                )}
                {checklistDone !== checklistTotal && (
                  <Link
                    to="/landlord-profile"
                    className="shrink-0 text-xs font-semibold text-[#FF6F61] hover:text-[#e85d52] underline underline-offset-2"
                  >
                    {firstIncomplete}
                  </Link>
                )}
              </div>

              {checklistDone !== checklistTotal && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-stone-200/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${checklistPct}%`, backgroundColor: '#FF6F61' }}
                      aria-label={`Profile completion ${checklistPct}%`}
                      role="progressbar"
                      aria-valuenow={checklistPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Complete these items to increase trust for students.
                  </p>
                </div>
              )}

              {checklistDone === checklistTotal && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Students can now trust your listing with confidence.</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQaseOpen(true)}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm w-full text-left hover:border-[#FF6F61]/30 hover:shadow-md transition-all group"
          >
            <p className="text-xs font-semibold text-[#FF6F61] uppercase tracking-wide">Need help?</p>
            <p className="text-lg font-bold text-gray-900 mt-2">Get support</p>
            <p className="text-sm text-gray-500 mt-1">Submit a support request and we&apos;ll get back to you.</p>
            <span className="text-sm font-semibold text-[#FF6F61] mt-3 inline-block">Contact support →</span>
          </button>
        </div>

        {profile.stripe_charges_enabled !== true && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-amber-900">
                Connect your bank account to start accepting bookings. Without this you won&apos;t be able to confirm booking requests.
              </p>
              <button
                type="button"
                onClick={() => void startStripeConnect()}
                disabled={connectLoading}
                className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-60"
              >
                {connectLoading ? 'Opening Stripe…' : 'Connect now →'}
              </button>
            </div>
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1 -mb-px" aria-label="Dashboard sections">
            {(
              [
                ['listings', 'Listings', null] as const,
                ['enquiries', 'Enquiries', enquiries.length > 0 ? enquiries.length : null] as const,
                [
                  'bookings',
                  'Bookings',
                  pendingBookings > 0 ? pendingBookings : bookings.length > 0 ? bookings.length : null,
                ] as const,
              ] as const
            ).map(([id, label, badge]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
                  tab === id
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
                ].join(' ')}
              >
                {label}
                {badge != null && (
                  <span className="tabular-nums rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'listings' && (
          <div>
            {properties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-600 text-sm mb-4">You haven&apos;t listed any properties yet.</p>
                {listingUnlocked ? (
                  <Link
                    to="/landlord/property/new"
                    className="inline-flex rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52]"
                  >
                    Add new listing
                  </Link>
                ) : (
                  <span
                    title="Complete your account setup to add listings"
                    className="inline-flex rounded-xl bg-gray-300 text-gray-500 px-5 py-2.5 text-sm font-medium cursor-not-allowed select-none"
                  >
                    Add new listing
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p) => {
                  const image = p.images?.[0]
                  const roomLabel =
                    p.room_type && isRoomType(p.room_type) ? ROOM_TYPE_LABELS[p.room_type] : null
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
                    >
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        {image ? (
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                        )}
                        {p.featured && (
                          <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                            Featured
                          </span>
                        )}
                        <span
                          className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${listingStatusClass(p.status)}`}
                        >
                          {listingStatusLabel(p.status)}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-baseline justify-between mb-1 gap-2">
                          <span className="text-xl font-bold text-gray-900">
                            ${Number(p.rent_per_week).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-sm font-normal text-gray-500"> /wk</span>
                          </span>
                          {roomLabel && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                              {roomLabel}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                          {p.title}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">{p.suburb ?? 'Location TBC'}</p>
                        <div className="mt-auto flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Link
                              to={`/landlord/property/edit/${p.id}`}
                              className="flex-1 text-center rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </Link>
                            <Link
                              to={`/properties/${p.slug}`}
                              className="flex-1 text-center rounded-lg bg-[#FF6F61] py-2 text-sm font-medium text-white hover:bg-[#e85d52]"
                            >
                              View
                            </Link>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {p.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => void publishDraftListing(p)}
                                disabled={publishingListingId === p.id || duplicatingListingId === p.id}
                                className="flex-1 min-w-[7.5rem] text-center rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60"
                              >
                                {publishingListingId === p.id ? 'Publishing…' : 'Publish'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDuplicateConfirmProperty(p)}
                              disabled={duplicatingListingId === p.id || publishingListingId === p.id}
                              className="flex-1 min-w-[7.5rem] text-center rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                            >
                              {duplicatingListingId === p.id ? 'Duplicating…' : 'Duplicate'}
                            </button>
                            {(p.status === 'active' || p.status === 'inactive') && (
                              <button
                                type="button"
                                onClick={() => void togglePropertyStatus(p)}
                                disabled={updatingListingId === p.id}
                                className={[
                                  'flex-1 min-w-[7.5rem] text-center rounded-lg border bg-white py-2 text-sm font-medium disabled:opacity-60',
                                  p.status === 'active'
                                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
                                ].join(' ')}
                              >
                                {updatingListingId === p.id
                                  ? 'Updating...'
                                  : p.status === 'active'
                                    ? 'Pause listing'
                                    : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'enquiries' && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {enquiries.length === 0 ? (
              <p className="p-10 text-center text-sm text-gray-500">No enquiries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" aria-label="Expand row" />
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((row) => {
                      const msg = row.message ?? ''
                      const shown = msg.length > ENQUIRY_TRUNC ? `${msg.slice(0, ENQUIRY_TRUNC)}…` : msg
                      const isExpanded = selectedEnquiryId === row.id
                      const slug = row.properties?.slug
                      const hasReply = Boolean(row.reply?.trim())
                      const canDraft = !hasReply && row.status !== 'replied'
                      const isDrafting = Boolean(draftingReplyIds[row.id])
                      const isSending = Boolean(sendingReplyIds[row.id])
                      const draftReply = draftReplies[row.id] ?? ''
                      const inlineError = enquiryInlineErrors[row.id]
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className="border-b border-gray-100 align-top cursor-pointer hover:bg-gray-50/60"
                            onClick={() => toggleEnquiryRow(row)}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {row.student_id ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStudentProfileModal({
                                      student: landlordStudentByProfileId[row.student_id!] ?? null,
                                      fallbackName: row.name?.trim() || row.email?.trim() || 'Student',
                                      scrollToVerification: false,
                                      scrollToAiAssessment: false,
                                      sessionKey: row.student_id ?? row.id,
                                      assessmentBookingId: null,
                                    })
                                  }
                                  className="text-left font-medium text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2"
                                >
                                  {row.name?.trim() || '—'}
                                </button>
                              ) : (
                                <span className="font-medium text-gray-900">{row.name?.trim() || '—'}</span>
                              )}
                              <span className="block text-xs text-gray-500">{row.email?.trim() || '—'}</span>
                            </td>
                            <td className="px-4 py-3 max-w-[11rem]">
                              {row.student_id ? (
                                <LandlordApplicantVerificationBadges
                                  verification={buildLandlordVerificationFromProfile(
                                    landlordStudentByProfileId[row.student_id] ?? null,
                                  )}
                                />
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {slug ? (
                                <Link
                                  to={`/properties/${slug}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onViewPropertyFromEnquiry(row)
                                  }}
                                  className="font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  {row.properties?.title ?? 'Listing'}
                                </Link>
                              ) : (
                                <span className="text-gray-700">{row.properties?.title ?? '—'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="text-gray-800 whitespace-pre-wrap break-words">{shown}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(row.created_at)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${enquiryStatusClass(row.status)}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400">
                              <svg
                                className={`ml-auto h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.16l3.71-3.93a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-gray-100">
                              <td
                                colSpan={7}
                                className="px-4 py-4"
                                style={{ backgroundColor: 'var(--color-background-secondary)' }}
                              >
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</p>
                                    <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{msg}</p>
                                  </div>
                                  <p className="text-xs text-gray-600">Received: {formatDate(row.created_at)}</p>
                                  {row.student_id ? (
                                    <div className="rounded-xl border border-gray-100 bg-white/90 px-4 py-3">
                                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          Student profile
                                        </p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setStudentProfileModal({
                                                student: landlordStudentByProfileId[row.student_id!] ?? null,
                                                fallbackName:
                                                  row.name?.trim() || row.email?.trim() || 'Student',
                                                scrollToVerification: false,
                                                scrollToAiAssessment: false,
                                                sessionKey: row.student_id ?? row.id,
                                                assessmentBookingId: null,
                                              })
                                            }
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                          >
                                            View profile
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setStudentProfileModal({
                                                student: landlordStudentByProfileId[row.student_id!] ?? null,
                                                fallbackName:
                                                  row.name?.trim() || row.email?.trim() || 'Student',
                                                scrollToVerification: true,
                                                scrollToAiAssessment: false,
                                                sessionKey: row.student_id ?? row.id,
                                                assessmentBookingId: null,
                                              })
                                            }
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                          >
                                            Verification details
                                          </button>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <LandlordApplicantVerificationDetail
                                          verification={buildLandlordVerificationFromProfile(
                                            landlordStudentByProfileId[row.student_id] ?? null,
                                          )}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      This enquiry was not linked to a signed-in student account, so verification status
                                      is unavailable.
                                    </p>
                                  )}
                                  {canDraft && !draftReply && (
                                    <button
                                      type="button"
                                      onClick={() => void draftEnquiryReply(row)}
                                      disabled={isDrafting}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6F61] bg-white px-3 py-1.5 text-xs font-semibold text-[#FF6F61] hover:bg-[#fff4f3] disabled:opacity-60"
                                    >
                                      {isDrafting ? (
                                        <>
                                          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#FF6F61] border-t-transparent" />
                                          Drafting...
                                        </>
                                      ) : (
                                        <>
                                          <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
                                          Draft a reply with AI
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {!hasReply && !!draftReply && (
                                    <div className="space-y-2">
                                      <textarea
                                        value={draftReply}
                                        onChange={(e) =>
                                          setDraftReplies((prev) => ({
                                            ...prev,
                                            [row.id]: e.target.value,
                                          }))
                                        }
                                        rows={4}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/30 focus:border-[#FF6F61]"
                                        placeholder="Write your reply..."
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void sendEnquiryReply(row.id)}
                                          disabled={isSending}
                                          className="rounded-lg bg-[#FF6F61] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e85d52] disabled:opacity-60"
                                        >
                                          {isSending ? 'Sending...' : 'Send reply'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => cancelDraftReply(row.id)}
                                          disabled={isSending}
                                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {hasReply && (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                                      <div className="mb-1">
                                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                          Replied
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{row.reply}</p>
                                    </div>
                                  )}
                                  {inlineError && <p className="text-xs text-red-600">{inlineError}</p>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {landlordBookingPaymentError && (
              <LandlordBookingPaymentErrorBanner onDismiss={() => setLandlordBookingPaymentError(false)} />
            )}
            {pendingConfirmation.length > 0 && (
              <div className="space-y-4 w-full min-w-0 max-w-full">
                <h3 className="text-sm font-semibold text-gray-900">Booking requests</h3>
                {pendingConfirmation.map((b) => {
                  const sp = b.student_profiles
                  const uni = sp?.universities?.name?.trim()
                  const moveInRaw = (b.move_in_date || b.start_date || '').slice(0, 10)
                  const bookingVerification = buildLandlordVerificationFromProfile(sp)
                  const applicantSessionKey = applicantSessionKeyFromBooking(b)
                  const hasAiAssessmentThisSession = aiAssessmentGeneratedSessionKeys.has(applicantSessionKey)
                  const awaitingStudent = b.status === 'awaiting_info'
                  return (
                    <div
                      key={b.id}
                      className="box-border w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/40 p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      <div className="min-w-0 overflow-hidden rounded-xl border border-indigo-200/90 bg-white/90 px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Move-in date</p>
                        <p className="mt-1 break-words text-lg font-bold text-gray-900 tabular-nums">
                          {formatMoveInDateProminent(moveInRaw || b.start_date)}
                        </p>
                        <p className="mt-2 break-words text-xs text-gray-600 leading-relaxed">
                          Use this date when arranging ongoing rent with your tenant. Rent is not charged automatically on
                          Quni until you set up recurring payments separately (when available).
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {sp?.avatar_url ? (
                            <img
                              src={sp.avatar_url}
                              alt=""
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-white shrink-0"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold shrink-0">
                              {studentDisplayFromBooking(b).charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setStudentProfileModal({
                                  student: sp ?? null,
                                  fallbackName: studentDisplayFromBooking(b),
                                  scrollToVerification: false,
                                  scrollToAiAssessment: false,
                                  sessionKey: applicantSessionKeyFromBooking(b),
                                  assessmentBookingId: b.id,
                                })
                              }
                              className="max-w-full text-left break-words font-semibold text-gray-900 hover:text-indigo-700 hover:underline underline-offset-2"
                            >
                              {studentDisplayFromBooking(b)}
                            </button>
                            <LandlordApplicantVerificationBadges verification={bookingVerification} />
                            <button
                              type="button"
                              onClick={() =>
                                setStudentProfileModal({
                                  student: sp ?? null,
                                  fallbackName: studentDisplayFromBooking(b),
                                  scrollToVerification: true,
                                  scrollToAiAssessment: false,
                                  sessionKey: applicantSessionKeyFromBooking(b),
                                  assessmentBookingId: b.id,
                                })
                              }
                              className="mt-1 block text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                            >
                              Verification details
                            </button>
                            {uni && (
                              <p className="mt-2 break-words text-sm text-gray-600">{uni}</p>
                            )}
                            {sp?.course?.trim() && (
                              <p className="break-words text-sm text-gray-600">{sp.course.trim()}</p>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 w-full shrink-0 text-left sm:ml-auto sm:w-auto sm:max-w-[min(20rem,100%)] sm:text-right">
                          {!awaitingStudent && (
                            <>
                              <ExpiresIn expiresAt={b.expires_at} />
                              <p className="mt-1 max-w-full break-words text-xs text-amber-900/80 sm:ml-auto">
                                You have 48 hours to respond before this request expires.
                              </p>
                            </>
                          )}
                          {awaitingStudent && (
                            <p className="break-words text-sm font-semibold text-sky-900">
                              Awaiting student response
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1 text-sm text-gray-700">
                        <p className="break-words">
                          <span className="text-gray-500">Property:</span>{' '}
                          <span className="font-medium text-gray-900">{b.properties?.title ?? '—'}</span>
                          {b.properties?.suburb ? ` · ${b.properties.suburb}` : ''}
                        </p>
                        <p className="break-words">
                          <span className="text-gray-500">Move-in:</span>{' '}
                          <span className="font-medium">{formatDate(moveInRaw || b.start_date)}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span className="text-gray-500">Lease:</span>{' '}
                          <span className="font-medium">{b.lease_length?.trim() || '—'}</span>
                        </p>
                        {b.student_message?.trim() && (
                          <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-amber-100/80 bg-white/80 px-4 py-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Message
                            </p>
                            <p className="break-words whitespace-pre-wrap text-gray-800">
                              {b.student_message.trim()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 border-t border-amber-200/50 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setStudentProfileModal({
                              student: sp ?? null,
                              fallbackName: studentDisplayFromBooking(b),
                              scrollToVerification: false,
                              scrollToAiAssessment: true,
                              sessionKey: applicantSessionKey,
                              assessmentBookingId: b.id,
                            })
                          }
                          className="group w-full min-w-0 rounded-lg border border-[#FF6F61]/25 bg-white/60 px-3 py-2 text-left text-xs font-medium leading-snug text-[#FF6F61]/85 underline-offset-2 hover:border-[#FF6F61]/40 hover:bg-[#FF6F61]/[0.07] hover:text-[#FF6F61] hover:underline sm:text-center"
                        >
                          <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-2 sm:mx-auto sm:max-w-md">
                            <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#FF6F61]/85 group-hover:text-[#FF6F61]" />
                            <span className="min-w-0 flex-1 break-words sm:flex-none sm:text-center">
                              {hasAiAssessmentThisSession
                                ? 'View AI assessment'
                                : 'Not sure yet? Get an AI assessment of this student before deciding.'}
                            </span>
                          </span>
                        </button>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-3 pt-2">
                        <Link
                          to={`/landlord/bookings/${b.id}/review`}
                          className="inline-flex w-full min-w-0 max-w-full shrink-0 items-center justify-center break-words rounded-xl bg-[#FF6F61] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e85d52] sm:w-auto"
                        >
                          Review request →
                        </Link>
                        {!awaitingStudent && (
                          <span className="min-w-0 max-w-full self-center break-words text-xs font-medium text-amber-900/90">
                            Awaiting your response
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {otherBookings.length === 0 && pendingConfirmation.length === 0 ? (
                <p className="p-10 text-center text-sm text-gray-500">No bookings yet.</p>
              ) : otherBookings.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-500">No other booking records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Verification</th>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3">Move-in → end</th>
                        <th className="px-4 py-3">Rent / wk</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherBookings.map((b) => (
                        <tr key={b.id} className="border-b border-gray-100 align-top">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setStudentProfileModal({
                                  student: b.student_profiles,
                                  fallbackName: studentDisplayFromBooking(b),
                                  scrollToVerification: false,
                                  scrollToAiAssessment: false,
                                  sessionKey: applicantSessionKeyFromBooking(b),
                                  assessmentBookingId: b.id,
                                })
                              }
                              className="text-left font-medium text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2"
                            >
                              {studentDisplayFromBooking(b)}
                            </button>
                          </td>
                          <td className="px-4 py-3 max-w-[11rem] align-top">
                            <LandlordApplicantVerificationBadges
                              verification={buildLandlordVerificationFromProfile(b.student_profiles)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{b.properties?.title ?? '—'}</span>
                            {b.properties?.suburb && (
                              <span className="block text-xs text-gray-500">{b.properties.suburb}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {formatDate(b.move_in_date || b.start_date)}
                            <span className="text-gray-400 mx-1">→</span>
                            {formatDate(b.end_date)}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {b.weekly_rent != null
                              ? `$${Number(b.weekly_rent).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookingStatusClass(b.status)}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {b.status === 'confirmed' || b.status === 'active' ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={agreementActionBusyId === b.id}
                                      onClick={() => void handleLandlordAgreement(b)}
                                      className="text-left text-xs font-semibold text-[#FF6F61] hover:text-[#e85d52] underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
                                    >
                                      {agreementActionBusyId === b.id
                                        ? 'Opening…'
                                        : b.landlord_agreement_signed_paths
                                          ? 'Download agreement'
                                          : 'Open agreement'}
                                    </button>
                                    <span className="text-gray-300 select-none" aria-hidden>
                                      ·
                                    </span>
                                    <Link
                                      to={`/landlord/bookings/${b.id}/review`}
                                      className="text-xs font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2"
                                    >
                                      Booking details
                                    </Link>
                                  </>
                                ) : (
                                  <Link
                                    to={`/landlord/bookings/${b.id}/review`}
                                    className="text-xs font-semibold text-[#FF6F61] hover:text-[#e85d52] underline underline-offset-2"
                                  >
                                    Review request
                                  </Link>
                                )}
                              </div>
                              {leaseDownloadErrorId === b.id &&
                                (b.status === 'confirmed' || b.status === 'active') && (
                                  <p className="text-[11px] leading-snug text-gray-500">Agreement not yet generated</p>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {studentProfileModal && (
          <LandlordStudentProfileModal
            open
            onClose={() => setStudentProfileModal(null)}
            student={studentProfileModal.student}
            fallbackName={studentProfileModal.fallbackName}
            scrollToVerification={studentProfileModal.scrollToVerification}
            scrollToAiAssessment={studentProfileModal.scrollToAiAssessment}
            assessmentIdentityKey={studentProfileModal.sessionKey}
            assessmentBookingId={studentProfileModal.assessmentBookingId}
            onAiAssessmentGenerated={() => {
              const k = studentProfileModal.sessionKey
              setAiAssessmentGeneratedSessionKeys((prev) => new Set(prev).add(k))
            }}
            landlordFirstName={
              profile?.first_name?.trim() ||
              profile?.full_name?.trim()?.split(/\s+/).filter(Boolean)[0] ||
              null
            }
          />
        )}

        {duplicateConfirmProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                if (!duplicatingListingId) setDuplicateConfirmProperty(null)
              }}
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Duplicate listing?</h3>
              <p className="mt-2 text-sm text-gray-600">
                This will create a draft copy of this listing. You can then edit the room details.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void confirmDuplicateListing()}
                  disabled={Boolean(duplicatingListingId)}
                  className="rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
                >
                  {duplicatingListingId ? 'Duplicating…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateConfirmProperty(null)}
                  disabled={Boolean(duplicatingListingId)}
                  className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {stripeRequiredModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setStripeRequiredModalOpen(false)} aria-hidden />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Bank account required</h3>
              <p className="mt-2 text-sm text-gray-600">
                You need to connect your bank account before you can accept bookings. This only takes a few minutes.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => void startStripeConnect()}
                  disabled={connectLoading}
                  className="rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
                >
                  {connectLoading ? 'Opening Stripe…' : 'Connect now →'}
                </button>
                <button
                  type="button"
                  onClick={() => setStripeRequiredModalOpen(false)}
                  disabled={connectLoading}
                  className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            className="fixed bottom-6 left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 px-4"
            role={toast.kind === 'success' ? 'status' : 'alert'}
          >
            <div
              className={`rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg ${
                toast.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}

        {profile && (
          <QaseSubmitModal
            isOpen={qaseOpen}
            onClose={() => setQaseOpen(false)}
            submitterType="landlord"
            submitterId={profile.id}
          />
        )}
      </div>
    </div>
  )
}
