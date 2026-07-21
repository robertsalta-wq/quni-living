import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import DashboardPageSkeleton from '../components/DashboardPageSkeleton'
import type { Database } from '../lib/database.types'
import { formatDisplayName } from '../lib/formatDisplayName'
import { landlordDisplayName, studentDisplayName } from '../lib/nameResolution'
import { formatDate } from './admin/adminUi'
import { LandlordStripePayoutsCard } from '../components/landlord/LandlordStripePayoutsCard'
import {
  buildLandlordVerificationFromProfile,
  LandlordApplicantVerificationBadges,
} from '../components/landlord/LandlordApplicantVerificationBadges'
import LandlordStudentProfileModal, {
  type LandlordSafeStudentSnapshot,
} from '../components/landlord/LandlordStudentProfileModal'
import AiSparkleIcon from '../components/AiSparkleIcon'
import { canLandlordCreateListing } from '../lib/onboardingChecklist'
import {
  computeLandlordReadiness,
  landlordProfileStatCardCopy,
  landlordPublishFirstIncompleteAction,
} from '../lib/landlordProfileReadiness'
import { consumeLoginWelcomePending } from '../lib/loginWelcomeToast'
import { landlordDashboardProfilePath } from '../lib/landlordDashboardProfilePaths'
import { looksLikeMissingDbColumn, messageFromSupabaseError } from '../lib/supabaseErrorMessage'
import { apiUrl } from '../lib/apiUrl'
import { startLandlordStripeConnect } from '../lib/startLandlordStripeConnect'
import QaseSubmitModal from '../components/qase/QaseSubmitModal'
import LandlordDuplicateListingModal from '../components/landlord/LandlordDuplicateListingModal'
import LandlordListingPaymentModal from '../components/landlord/LandlordListingPaymentModal'
import LandlordListingsGroupedPanel from '../components/landlord/listings/LandlordListingsGroupedPanel'
import LandlordTenantInviteModal from '../components/landlord/LandlordTenantInviteModal'
import LandlordDashboardProfileTab from '../components/landlord/LandlordDashboardProfileTab'
import { useLandlordPropertyListingActions } from '../hooks/useLandlordPropertyListingActions'
import { useConversationInbox } from '../hooks/useConversationInbox'
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount'
import LandlordDashboardPageHeader, {
  landlordDashboardPageInsetClass,
} from '../components/landlord/LandlordDashboardPageHeader'
import LandlordDashboardOverviewDesktop from '../components/landlord/LandlordDashboardOverviewDesktop'
import {
  fetchLandlordListingBillingSnapshot,
  type LandlordListingBillingSnapshot,
} from '../lib/landlordListingBilling'
import {
  landlordServiceTierShortLabel,
  landlordServiceTierTitle,
  parseLandlordServiceTier,
} from '../lib/landlordServiceTier'
import { signedTenancyAgreementDownloadFilename } from '../lib/tenancy/jurisdictionCopy'
import { landlordResponseExpiryLabel } from '../lib/booking/landlordResponseExpiry'
import LandlordBookingMobileCard from '../components/booking/list/LandlordBookingMobileCard'
import BookingsViewToggle from '../components/landlord/bookings/BookingsViewToggle'
import LandlordBookingsCalendar from '../components/landlord/bookings/LandlordBookingsCalendar'
import LandlordBookingsTimeline from '../components/landlord/bookings/LandlordBookingsTimeline'
import LandlordNext7Days from '../components/landlord/bookings/LandlordNext7Days'
import {
  parseBookingsScheduleView,
  type BookingsScheduleView,
  type SchedulingBooking,
} from '../lib/landlordBookingsScheduling'
import type { LandlordListingForGroup } from '../lib/landlordListingsGrouped'
type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingStatus = BookingRow['status']

type PropertySummary = Pick<
  PropertyRow,
  | 'id'
  | 'title'
  | 'slug'
  | 'rent_per_week'
  | 'room_type'
  | 'suburb'
  | 'address'
  | 'images'
  | 'status'
  | 'featured'
  | 'created_at'
  | 'service_tier'
  | 'authority_to_let_attested_at'
  | 'open_to_non_students'
  | 'max_occupants'
  | 'couple_surcharge_per_week'
  | 'parking_surcharge_per_week'
  | 'parking_available'
  | 'property_type'
  | 'property_group_id'
  | 'bedrooms'
>

/** Signed agreement objects in Storage (`tenancy-documents` bucket), from `tenancy_documents` after signing. */
type LandlordAgreementSignedPaths =
  | { kind: 'dual'; rta: string; addendum: string }
  | { kind: 'single'; path: string }

type BookingWithRelations = BookingRow & {
  properties: { title: string; slug: string; suburb: string | null; state: string | null } | null
  student_profiles: LandlordSafeStudentSnapshot | null
  /** DocuSeal signer embed - only while signing is pending (not after `status === 'signed'`). */
  landlord_agreement_signing_url: string | null
  /** When the lease/RTA row is signed and Storage paths exist - download instead of opening DocuSeal. */
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

type TabId = 'overview' | 'listings' | 'bookings' | 'profile'

function landlordTabFromSearch(search: string): TabId {
  const t = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('tab')
  if (t === 'bookings' || t === 'listings' || t === 'profile') return t
  return 'overview'
}

/** Survives remount when leaving /messages (separate route) and returning to the dashboard. */
type LandlordDashboardCache = {
  properties: PropertySummary[]
  bookings: BookingWithRelations[]
}

const landlordDashboardCacheByUserId = new Map<string, LandlordDashboardCache>()

function readLandlordDashboardCache(userId: string | undefined): LandlordDashboardCache | null {
  if (!userId) return null
  return landlordDashboardCacheByUserId.get(userId) ?? null
}

const LANDLORD_INVITE_MODAL_SESSION_KEY = 'quni-landlord-invite-modal:v1'

type InviteModalProperty = {
  id: string
  title: string
  slug: string
  open_to_non_students: boolean
  rent_per_week: number | null
  max_occupants?: number | null
  couple_surcharge_per_week?: number | null
  parking_surcharge_per_week?: number | null
  parking_available?: boolean | null
}

function readInviteModalFromSession(): InviteModalProperty | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LANDLORD_INVITE_MODAL_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InviteModalProperty
    if (!parsed?.id || !parsed.title || !parsed.slug) return null
    return {
      id: parsed.id,
      title: parsed.title,
      slug: parsed.slug,
      open_to_non_students: Boolean(parsed.open_to_non_students),
      rent_per_week:
        parsed.rent_per_week != null && Number.isFinite(Number(parsed.rent_per_week))
          ? Number(parsed.rent_per_week)
          : null,
      max_occupants: parsed.max_occupants ?? null,
      couple_surcharge_per_week: parsed.couple_surcharge_per_week ?? null,
      parking_surcharge_per_week: parsed.parking_surcharge_per_week ?? null,
      parking_available: parsed.parking_available ?? null,
    }
  } catch {
    return null
  }
}

function writeInviteModalToSession(property: InviteModalProperty | null): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (!property) {
      sessionStorage.removeItem(LANDLORD_INVITE_MODAL_SESSION_KEY)
      return
    }
    sessionStorage.setItem(LANDLORD_INVITE_MODAL_SESSION_KEY, JSON.stringify(property))
  } catch {
    // Quota or private browsing — ignore.
  }
}

/** Loaded for landlord dashboard - safe fields only (see LandlordSafeStudentSnapshot). */
type LandlordLoadedStudentRow = LandlordSafeStudentSnapshot

const LANDLORD_DASHBOARD_STUDENT_SELECT_BASE =
  'id, verification_type, preferred_name, full_name, first_name, last_name, avatar_url, course, year_of_study, study_level, student_type, languages_spoken, room_type_preference, budget_min_per_week, budget_max_per_week, bio, occupancy_type, move_in_flexibility, preferred_move_in_date, preferred_lease_length, has_pets, needs_parking, bills_preference, furnishing_preference, has_guarantor, guarantor_name, accommodation_verification_route, uni_email_verified, uni_email_verified_at'
const LANDLORD_DASHBOARD_STUDENT_SELECT_SUFFIX =
  ', id_submitted_at, enrolment_submitted_at, identity_supporting_submitted_at, is_smoker, universities ( name )'
const LANDLORD_DASHBOARD_STUDENT_SELECT_FULL =
  `${LANDLORD_DASHBOARD_STUDENT_SELECT_BASE}, work_email_verified, work_email_verified_at${LANDLORD_DASHBOARD_STUDENT_SELECT_SUFFIX}`
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY =
  'id, verification_type, preferred_name, full_name, first_name, last_name, avatar_url, course, year_of_study, study_level, student_type, languages_spoken, room_type_preference, budget_min_per_week, budget_max_per_week, accommodation_verification_route, uni_email_verified, uni_email_verified_at'
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX =
  ', id_submitted_at, enrolment_submitted_at, identity_supporting_submitted_at, is_smoker, universities ( name )'
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_FULL =
  `${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY}, work_email_verified, work_email_verified_at${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX}`
const LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_CORE = `${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY}${LANDLORD_DASHBOARD_STUDENT_SELECT_LEGACY_SUFFIX}`

function firstNameFromLandlord(p: LandlordRow): string {
  const display = landlordDisplayName(p, '')
  if (display) {
    const w = formatDisplayName(display).split(/\s+/)[0]
    return w || 'there'
  }
  const local = p.email?.split('@')[0]
  return local ? formatDisplayName(local) : 'there'
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-800'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'confirmed' || s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-red-50 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function bookingServiceTier(b: BookingWithRelations): 'listing' | 'managed' | null {
  return parseLandlordServiceTier(b.service_tier_final) ?? parseLandlordServiceTier(b.service_tier_at_request)
}

function studentDisplayFromBooking(b: BookingWithRelations): string {
  const sp = b.student_profiles
  if (!sp) return '-'
  return studentDisplayName(sp, '-')
}

/** Stable key for session UI (e.g. AI assessment nudge) per booking request (not per student - same student can have multiple listings). */
function applicantSessionKeyFromBooking(b: BookingWithRelations): string {
  return b.id
}

function ExpiresIn({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [txt, setTxt] = useState('-')
  useEffect(() => {
    if (!expiresAt) {
      setTxt('-')
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
  if (!iso) return '-'
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
    return '-'
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
  const { user, profile: authProfile, role } = useAuthContext()
  const authLandlord =
    role === 'landlord' && authProfile && 'id' in authProfile ? (authProfile as LandlordRow) : null
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cachedDash = readLandlordDashboardCache(user?.id)
  const [dataLoading, setDataLoading] = useState(() => !cachedDash)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<LandlordRow | null>(authLandlord)
  const [properties, setProperties] = useState<PropertySummary[]>(() => cachedDash?.properties ?? [])
  const [bookings, setBookings] = useState<BookingWithRelations[]>(() => cachedDash?.bookings ?? [])
  const [tab, setTab] = useState<TabId>(() => {
    try {
      return landlordTabFromSearch(window.location.search)
    } catch {
      return 'overview'
    }
  })
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null)
  const welcomeToastTimerRef = useRef<number | null>(null)
  const { items: conversations } = useConversationInbox(user?.id)
  const unreadMessageCount = useUnreadMessageCount(user?.id)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectSetupError, setConnectSetupError] = useState<string | null>(null)
  const [stripeRequiredModalOpen, setStripeRequiredModalOpen] = useState(false)
  const [qaseOpen, setQaseOpen] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [listingBilling, setListingBilling] = useState<LandlordListingBillingSnapshot | null>(null)
  const [listingPaymentModalOpen, setListingPaymentModalOpen] = useState(false)
  const toastTimerRef = useRef<number | null>(null)
  const loadGenRef = useRef(0)
  const profileLoadRetryGenRef = useRef(0)
  const authLandlordRef = useRef(authLandlord)
  authLandlordRef.current = authLandlord
  const showToastRef = useRef<(t: { kind: 'success' | 'error'; message: string }) => void>(() => {})
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
  const [leaseDownloadErrorId, setLeaseDownloadErrorId] = useState<string | null>(null)
  const [agreementActionBusyId, setAgreementActionBusyId] = useState<string | null>(null)

  const downloadAgreementFromSignedUrls = useCallback(
    async (signedRta: string, signedAddendum: string | null, state: string | null | undefined) => {
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
        await trySaveAs(signedRta, signedTenancyAgreementDownloadFilename(state))
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

  const fetchLeaseSigningUrlViaApi = useCallback(async (bookingId: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl('/api/documents/lease-state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const j = (await res.json()) as { signing_url?: string; state?: string; error?: string }
    if (!res.ok) return null
    const url = typeof j.signing_url === 'string' ? j.signing_url.trim() : ''
    return url || null
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
            await downloadAgreementFromSignedUrls(r1.data.signedUrl, r2.data.signedUrl, b.properties?.state)
            return
          }
          const api = await fetchLeaseSignedUrlsViaApi(b.id)
          if (api?.signed_url_rta && api.signed_url_addendum) {
            await downloadAgreementFromSignedUrls(api.signed_url_rta, api.signed_url_addendum, b.properties?.state)
            return
          }
          setLeaseDownloadErrorId(b.id)
          return
        }

        if (signed?.kind === 'single') {
          const r = await bucket.createSignedUrl(signed.path, expirySec)
          if (!r.error && r.data?.signedUrl) {
            await downloadAgreementFromSignedUrls(r.data.signedUrl, null, b.properties?.state)
            return
          }
          const api = await fetchLeaseSignedUrlsViaApi(b.id)
          if (api?.signed_url_rta && api.signed_url_addendum) {
            await downloadAgreementFromSignedUrls(api.signed_url_rta, api.signed_url_addendum, b.properties?.state)
            return
          }
          if (api?.signed_url) {
            await downloadAgreementFromSignedUrls(api.signed_url, null, b.properties?.state)
            return
          }
          setLeaseDownloadErrorId(b.id)
          return
        }

        const urlFromApi = await fetchLeaseSigningUrlViaApi(b.id)
        const url = urlFromApi || b.landlord_agreement_signing_url?.trim()
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        }

        const apiOnly = await fetchLeaseSignedUrlsViaApi(b.id)
        if (apiOnly?.signed_url_rta && apiOnly.signed_url_addendum) {
          await downloadAgreementFromSignedUrls(apiOnly.signed_url_rta, apiOnly.signed_url_addendum, b.properties?.state)
          return
        }
        if (apiOnly?.signed_url) {
          await downloadAgreementFromSignedUrls(apiOnly.signed_url, null, b.properties?.state)
          return
        }

        setLeaseDownloadErrorId(b.id)
      } catch {
        setLeaseDownloadErrorId(b.id)
      } finally {
        setAgreementActionBusyId(null)
      }
    },
    [downloadAgreementFromSignedUrls, fetchLeaseSignedUrlsViaApi, fetchLeaseSigningUrlViaApi],
  )

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current

    const isCurrent = () => gen === loadGenRef.current

    if (!isSupabaseConfigured) {
      if (isCurrent()) setDataLoading(false)
      return
    }

    let userId = user?.id
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      userId = session?.user?.id
    }
    if (!userId) {
      if (isCurrent()) setDataLoading(false)
      return
    }

    const hadCache = Boolean(readLandlordDashboardCache(userId))
    if (isCurrent()) {
      if (!hadCache) setDataLoading(true)
      setError(null)
    }

    try {
      let prof: LandlordRow | null = authLandlordRef.current
      if (!prof) {
        const { data: profRaw, error: pErr } = await supabase
          .from('landlord_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        if (pErr) throw pErr
        prof = profRaw as LandlordRow | null
      }
      if (!prof) {
        // Transient during JWT refresh — keep existing dashboard data; retry once after token settles.
        if (isCurrent() && profileLoadRetryGenRef.current !== gen) {
          profileLoadRetryGenRef.current = gen
          window.setTimeout(() => {
            void load()
          }, 750)
        }
        return
      }
      profileLoadRetryGenRef.current = 0
      if (!isCurrent()) return
      setProfile(prof)

      const [propRes, bookRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, slug, rent_per_week, room_type, suburb, address, images, status, featured, created_at, service_tier, authority_to_let_attested_at, open_to_non_students, max_occupants, couple_surcharge_per_week, parking_surcharge_per_week, parking_available, property_type, property_group_id, bedrooms')
          .eq('landlord_id', prof.id)
          .order('created_at', { ascending: false }),
        supabase.from('bookings').select('*').eq('landlord_id', prof.id).order('created_at', { ascending: false }),
      ])

      if (propRes.error) throw propRes.error
      if (bookRes.error) throw bookRes.error

      type BookingPropertyDbRow = { id: string; title: string; slug: string; suburb: string | null; state: string | null }

      const bookingRows = (bookRes.data ?? []) as BookingRow[]
      const studentIds = [...new Set(bookingRows.map((b) => b.student_id).filter(Boolean))] as string[]
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
                      preferred_move_in_date: null,
                      preferred_lease_length: null,
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
                        preferred_move_in_date: null,
                        preferred_lease_length: null,
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
          ? supabase.from('properties').select('id, title, slug, suburb, state').in('id', bookingPropertyIds)
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
      if (!studRes.error && studRes.data) {
        for (const row of studRes.data as LandlordLoadedStudentRow[]) {
          if (row?.id) studentById.set(row.id, row)
        }
      }

      const propertyById = new Map<string, { title: string; slug: string; suburb: string | null; state: string | null }>()
      for (const row of (bookingPropsRes.data ?? []) as BookingPropertyDbRow[]) {
        if (row?.id) {
          propertyById.set(row.id, {
            title: row.title,
            slug: row.slug,
            suburb: row.suburb ?? null,
            state: row.state ?? null,
          })
        }
      }

      const mergedBookings: BookingWithRelations[] = bookingRows.map((b) => {
        const sp = b.student_id ? studentById.get(b.student_id) : undefined
        const pr = b.property_id ? propertyById.get(b.property_id) : undefined
        return {
          ...b,
          properties: pr
            ? { title: pr.title, slug: pr.slug, suburb: pr.suburb, state: pr.state }
            : null,
          student_profiles: sp ? { ...sp } : null,
          landlord_agreement_signing_url: signingUrlByBookingId.get(b.id) ?? null,
          landlord_agreement_signed_paths: signedPathsByBookingId.get(b.id) ?? null,
        }
      })

      if (!isCurrent()) return
      const nextProperties = (propRes.data ?? []) as PropertySummary[]
      setProperties(nextProperties)
      setBookings(mergedBookings)
      landlordDashboardCacheByUserId.set(userId, {
        properties: nextProperties,
        bookings: mergedBookings,
      })

      void fetchLandlordListingBillingSnapshot().then((snapshot) => {
        if (isCurrent()) setListingBilling(snapshot)
      })
    } catch (e) {
      if (!isCurrent()) return
      const msg = messageFromSupabaseError(e)
      setProfile((prev) => {
        if (prev) {
          showToastRef.current({ kind: 'error', message: msg })
          return prev
        }
        setError(msg)
        setProperties([])
        setBookings([])
        setListingBilling(null)
        landlordDashboardCacheByUserId.delete(userId)
        return null
      })
    } finally {
      if (isCurrent()) setDataLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (authLandlord) setProfile(authLandlord)
  }, [authLandlord])

  useEffect(() => {
    const cached = readLandlordDashboardCache(user?.id)
    if (!cached) return
    setProperties(cached.properties)
    setBookings(cached.bookings)
    setDataLoading(false)
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
  showToastRef.current = showToast

  const {
    publishingListingId,
    duplicatingListingId,
    updatingListingId,
    duplicateConfirmProperty,
    setDuplicateConfirmProperty,
    publishDraftListing,
    confirmDuplicateListing,
    togglePropertyStatus,
  } = useLandlordPropertyListingActions({
    reload: load,
    navigate,
    showToast,
    onMutationError: (msg) => showToast({ kind: 'error', message: msg }),
  })

  const [inviteModalProperty, setInviteModalProperty] = useState<InviteModalProperty | null>(
    () => readInviteModalFromSession(),
  )

  const openInviteModal = useCallback((property: InviteModalProperty) => {
    setInviteModalProperty(property)
    writeInviteModalToSession(property)
  }, [])

  const closeInviteModal = useCallback(() => {
    setInviteModalProperty(null)
    writeInviteModalToSession(null)
  }, [])

  useEffect(() => {
    if (!inviteModalProperty || properties.length === 0) return
    if (!properties.some((p) => p.id === inviteModalProperty.id)) {
      closeInviteModal()
    }
  }, [inviteModalProperty, properties, closeInviteModal])

  const stripeConnectParam = searchParams.get('stripe_connect')
  useEffect(() => {
    if (stripeConnectParam !== 'return' && stripeConnectParam !== 'refresh') return
    void load().then(async () => {
      if (stripeConnectParam === 'return') {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token
          if (token) {
            await fetch('/api/sync-stripe-connect-status', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            })
          }
        } catch {
          /* non-fatal */
        }
      }
      setTab('profile')
      const next = new URLSearchParams(searchParams)
      next.set('tab', 'profile')
      next.delete('stripe_connect')
      if (!next.get('section')) next.set('section', 'payouts')
      setSearchParams(next, { replace: true })
    })
  }, [stripeConnectParam, load, setSearchParams, searchParams])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'enquiries') {
      navigate('/messages', { replace: true })
      return
    }
    if (t === 'bookings' || t === 'listings' || t === 'profile') {
      setTab(t)
      return
    }
    setTab('overview')
  }, [searchParams, navigate])

  useEffect(() => {
    if (!profile) return
    if (!consumeLoginWelcomePending()) return
    const name = firstNameFromLandlord(profile)
    setWelcomeToast(`Welcome back, ${name}`)
    if (welcomeToastTimerRef.current != null) window.clearTimeout(welcomeToastTimerRef.current)
    welcomeToastTimerRef.current = window.setTimeout(() => {
      setWelcomeToast(null)
      welcomeToastTimerRef.current = null
    }, 4500)
  }, [profile?.id])

  useEffect(() => {
    return () => {
      if (welcomeToastTimerRef.current != null) window.clearTimeout(welcomeToastTimerRef.current)
    }
  }, [])

  const selectDashboardTab = useCallback(
    (next: TabId) => {
      setTab(next)
      const params = new URLSearchParams(searchParams)
      if (next === 'overview') {
        params.delete('tab')
        params.delete('section')
        params.delete('view')
      } else if (next === 'listings') {
        params.set('tab', 'listings')
        params.delete('section')
        params.delete('view')
      } else {
        params.set('tab', next)
        if (next !== 'profile') params.delete('section')
        if (next !== 'bookings') params.delete('view')
      }
      const q = params.toString()
      navigate(q ? `/landlord/dashboard?${q}` : '/landlord/dashboard', { replace: true })
    },
    [navigate, searchParams],
  )

  useEffect(() => {
    if (!profile || window.location.hash.replace(/^#/, '') !== 'rent-payouts') return
    requestAnimationFrame(() => {
      document.getElementById('rent-payouts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [profile?.id])

  const startStripeConnect = useCallback(async () => {
    setConnectSetupError(null)
    setConnectLoading(true)
    try {
      const result = await startLandlordStripeConnect('landlord_dashboard')
      if (!result.ok) throw new Error(result.error)
      if (result.alreadyConnected) {
        await load()
      }
      setStripeRequiredModalOpen(false)
    } catch (e) {
      setConnectSetupError(e instanceof Error ? e.message : 'Could not start Stripe setup.')
    } finally {
      setConnectLoading(false)
    }
  }, [load])

  const activeListings = properties.filter((p) => p.status === 'active').length
  const listingTierProperties = properties.filter((p) => parseLandlordServiceTier(p.service_tier) === 'listing').length
  const managedTierProperties = properties.filter((p) => parseLandlordServiceTier(p.service_tier) !== 'listing').length
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

  const bookingsScheduleView = useMemo(
    () => parseBookingsScheduleView(searchParams.get('view')),
    [searchParams],
  )

  const selectBookingsScheduleView = useCallback(
    (next: BookingsScheduleView) => {
      const params = new URLSearchParams(searchParams)
      params.set('tab', 'bookings')
      if (next === 'requests') params.delete('view')
      else params.set('view', next)
      navigate(`/landlord/dashboard?${params.toString()}`, { replace: true })
    },
    [navigate, searchParams],
  )

  const schedulingBookings = useMemo((): SchedulingBooking[] => {
    return bookings.map((b) => ({
      id: b.id,
      property_id: b.property_id,
      status: b.status,
      move_in_date: b.move_in_date,
      start_date: b.start_date,
      end_date: b.end_date,
      weekly_rent: b.weekly_rent,
      expires_at: b.expires_at,
      confirmed_at: b.confirmed_at,
      created_at: b.created_at,
      student_name: studentDisplayFromBooking(b),
      property_title: b.properties?.title ?? null,
      service_tier: bookingServiceTier(b),
    }))
  }, [bookings])

  const listingsForTimeline = useMemo((): LandlordListingForGroup[] => {
    return properties.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      rent_per_week: p.rent_per_week,
      room_type: p.room_type,
      suburb: p.suburb,
      address: p.address,
      images: p.images,
      status: p.status,
      property_type: p.property_type,
      property_group_id: p.property_group_id,
      bedrooms: p.bedrooms,
      created_at: p.created_at,
      service_tier: p.service_tier,
    }))
  }, [properties])

  const landlordReadiness = useMemo(() => computeLandlordReadiness(profile), [profile])
  const profileStatCard = useMemo(
    () => landlordProfileStatCardCopy(landlordReadiness),
    [landlordReadiness],
  )
  const firstIncomplete = useMemo(
    () => landlordPublishFirstIncompleteAction(profile),
    [profile],
  )
  const canCreateListing = canLandlordCreateListing(profile)

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-6 py-12 text-sm text-gray-600">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (dataLoading && !profile) {
    return (
      <div className="flex-1 flex min-h-0 w-full bg-gray-50">
        <DashboardPageSkeleton />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-6 py-12 max-w-lg mx-auto">
        <p className="text-red-700 text-sm">{error ?? 'Landlord profile not found.'}</p>
        <Link to={landlordDashboardProfilePath()} className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Go to profile
        </Link>
      </div>
    )
  }

  // Profile hub/drill-in already own Listing-style padding — skip the shared inset on mobile
  // so they aren't double-padded. Other tabs use landlordDashboardPageInsetClass.
  const profileOwnsPadding = tab === 'profile'

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[var(--quni-surface-2)] max-sm:pb-0 pb-16">
      {welcomeToast ? (
        <div
          className="fixed top-20 right-4 z-[70] w-[min(100%-2rem,22rem)] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg"
          role="status"
        >
          <p className="text-sm font-semibold text-emerald-900">{welcomeToast}</p>
          <p className="text-xs text-emerald-700/80 mt-0.5">Dismisses on its own · login only</p>
        </div>
      ) : null}

      <div
        className={
          profileOwnsPadding
            ? 'max-sm:contents max-w-site mx-auto w-full min-w-0 sm:px-4 sm:py-6 lg:px-8 lg:pb-14'
            : landlordDashboardPageInsetClass
        }
      >
        <LandlordDashboardPageHeader
          profile={profile}
          activeTab={tab}
          pendingBookings={pendingBookings}
          totalBookings={bookings.length}
          onTabSelect={(section) => {
            if (section === 'overview' || section === 'bookings' || section === 'listings' || section === 'profile') {
              selectDashboardTab(section)
            }
          }}
        />

        {tab === 'overview' && (
          <>
            <LandlordDashboardOverviewDesktop
              profile={profile}
              activeListings={activeListings}
              bookingsCount={bookings.length}
              pendingBookings={pendingBookings}
              unreadMessageCount={unreadMessageCount}
              conversationsCount={conversations.length}
              schedulingBookings={schedulingBookings}
              firstActiveListingSlug={
                properties.find((p) => p.status === 'active')?.slug?.trim() || null
              }
              finishProfileHref={firstIncomplete?.href ?? landlordDashboardProfilePath()}
              onRefresh={load}
              onOpenSupport={() => setQaseOpen(true)}
              onGoListings={() => selectDashboardTab('listings')}
              onGoBookings={() => selectDashboardTab('bookings')}
              connectSetupError={connectSetupError}
              mixedServiceNote={
                listingTierProperties > 0 && managedTierProperties > 0
                  ? `Mixed service models: ${listingTierProperties} self-managed and ${managedTierProperties} Quni Managed - each property keeps its own tier.`
                  : null
              }
            />

            <div className="sm:hidden">
            {connectSetupError && (
              <div
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {connectSetupError}
              </div>
            )}

            <LandlordStripePayoutsCard profile={profile} onRefresh={load} />

            {listingTierProperties > 0 && managedTierProperties > 0 && (
              <p className="mb-6 text-sm text-gray-600">
                <span className="font-medium text-gray-900">Mixed service models:</span>{' '}
                {listingTierProperties} self-managed and {managedTierProperties} Quni Managed - each property keeps its
                own tier.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <button
                type="button"
                onClick={() => selectDashboardTab('listings')}
                className="quni-card flex h-full flex-col p-5 text-left transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active listings</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{activeListings}</p>
                <p className="text-xs text-gray-500 mt-auto pt-1">
                  {activeListings > 0 ? 'Published as active' : 'None published yet'}
                </p>
              </button>
              <Link
                to="/messages"
                className="quni-card flex h-full flex-col p-5 transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Messages</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{conversations.length}</p>
                <p className="text-xs mt-auto pt-1">
                  {unreadMessageCount > 0 ? (
                    <span className="font-semibold text-amber-700">{unreadMessageCount} unread</span>
                  ) : (
                    <span className="text-gray-500">All caught up</span>
                  )}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => selectDashboardTab('bookings')}
                className="quni-card flex h-full flex-col p-5 text-left transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bookings</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{bookings.length}</p>
                <p className="text-xs mt-auto pt-1">
                  {pendingBookings > 0 ? (
                    <span className="font-semibold text-amber-700">{pendingBookings} pending</span>
                  ) : (
                    <span className="text-gray-500">Nothing pending</span>
                  )}
                </p>
              </button>
              <button
                type="button"
                onClick={() => selectDashboardTab('profile')}
                className={[
                  'quni-card flex h-full flex-col p-5 text-left transition-all hover:shadow-md',
                  landlordReadiness.phase === 'complete'
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : 'border-admin-coral/30 hover:border-admin-coral/50',
                ].join(' ')}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your profile</p>
                <div className="mt-2 flex flex-col flex-1 min-h-0">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      landlordReadiness.phase === 'complete' ? 'text-emerald-700' : 'text-gray-900'
                    }`}
                  >
                    {profileStatCard.line}
                  </p>
                  {profileStatCard.showPublishProgress ? (
                    <div className="mt-3 h-2 rounded-full bg-stone-200/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${profileStatCard.publishPct}%`, backgroundColor: 'var(--quni-coral)' }}
                        aria-label={`Profile completion ${profileStatCard.publishPct}%`}
                        role="progressbar"
                        aria-valuenow={profileStatCard.publishPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  ) : null}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setQaseOpen(true)}
                className="quni-card group flex h-full w-full flex-col p-5 text-left transition-all hover:border-admin-coral/30 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-900">Need help?</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  Submit a support request and we&apos;ll get back to you.
                </p>
                <span className="text-xs font-semibold text-[var(--quni-coral)] mt-auto pt-2 inline-block group-hover:text-[var(--quni-coral-hover)]">
                  Contact support →
                </span>
              </button>
            </div>

            <LandlordNext7Days bookings={schedulingBookings} />

            <div className="mb-6">
              <Link to="/sample-agreements" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                View sample agreements →
              </Link>
            </div>
            </div>
          </>
        )}

        {tab === 'profile' && profile ? (
          <LandlordDashboardProfileTab
            profile={profile}
            onRefresh={load}
            sectionParam={searchParams.get('section')}
            listingBilling={listingBilling}
          />
        ) : null}

        {tab === 'listings' && (
          <LandlordListingsGroupedPanel
            listings={properties}
            bookings={bookings.map((b) => ({ property_id: b.property_id, status: b.status }))}
            dataLoading={dataLoading}
            canCreateListing={canCreateListing}
            createListingHref="/landlord/property/new"
            setupHref={firstIncomplete?.href ?? landlordDashboardProfilePath()}
            setupLabel={firstIncomplete?.label ?? 'Complete your account setup to add listings'}
            publishingListingId={publishingListingId}
            duplicatingListingId={duplicatingListingId}
            updatingListingId={updatingListingId}
            onPublish={publishDraftListing}
            onDuplicateClick={(prop) => setDuplicateConfirmProperty({ id: prop.id, title: prop.title })}
            onToggle={togglePropertyStatus}
            onDeleteDraft={(listing) => {
              if (!window.confirm(`Delete draft “${listing.title}”? This cannot be undone.`)) return
              void (async () => {
                try {
                  const { error } = await supabase.from('properties').delete().eq('id', listing.id)
                  if (error) throw error
                  await load()
                  showToast({ kind: 'success', message: 'Draft listing deleted.' })
                } catch (e) {
                  showToast({ kind: 'error', message: messageFromSupabaseError(e) })
                }
              })()
            }}
            onInviteTenant={(listing) => {
              const full = properties.find((p) => p.id === listing.id)
              if (!full) return
              if (full.status !== 'active' || parseLandlordServiceTier(full.service_tier) !== 'listing') return
              openInviteModal({
                id: full.id,
                title: full.title,
                slug: full.slug,
                open_to_non_students: full.open_to_non_students,
                rent_per_week: full.rent_per_week,
                max_occupants: full.max_occupants,
                couple_surcharge_per_week: full.couple_surcharge_per_week,
                parking_surcharge_per_week: full.parking_surcharge_per_week,
                parking_available: full.parking_available,
              })
            }}
            toActionListing={(listing) => {
              const full = properties.find((p) => p.id === listing.id)
              if (full) return full
              return {
                id: listing.id,
                title: listing.title,
                slug: listing.slug,
                status: listing.status,
                authority_to_let_attested_at: null,
                service_tier: 'listing',
                open_to_non_students: false,
                rent_per_week: listing.rent_per_week ?? 0,
                max_occupants: 1,
                couple_surcharge_per_week: null,
                parking_surcharge_per_week: null,
                parking_available: false,
              }
            }}
          />
        )}

        {tab === 'bookings' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {landlordBookingPaymentError && (
              <LandlordBookingPaymentErrorBanner onDismiss={() => setLandlordBookingPaymentError(false)} />
            )}
            <BookingsViewToggle value={bookingsScheduleView} onChange={selectBookingsScheduleView} />

            {bookingsScheduleView === 'timeline' ? (
              <LandlordBookingsTimeline listings={listingsForTimeline} bookings={schedulingBookings} />
            ) : null}

            {bookingsScheduleView === 'calendar' ? (
              <LandlordBookingsCalendar bookings={schedulingBookings} />
            ) : null}

            {bookingsScheduleView === 'requests' ? (
              <>
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
                                You have {landlordResponseExpiryLabel(bookingServiceTier(b) ?? 'managed')} to respond
                                before this request expires.
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
                          <span className="font-medium text-gray-900">{b.properties?.title ?? '-'}</span>
                          {b.properties?.suburb ? ` · ${b.properties.suburb}` : ''}
                        </p>
                        <p className="break-words">
                          <span className="text-gray-500">Service:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {landlordServiceTierTitle(bookingServiceTier(b))}
                          </span>
                        </p>
                        <p className="break-words">
                          <span className="text-gray-500">Move-in:</span>{' '}
                          <span className="font-medium">{formatDate(moveInRaw || b.start_date)}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span className="text-gray-500">Lease:</span>{' '}
                          <span className="font-medium">{b.lease_length?.trim() || '-'}</span>
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
                          className="group w-full min-w-0 rounded-lg border border-admin-coral/25 bg-white/60 px-3 py-2 text-left text-xs font-medium leading-snug text-admin-coral/85 underline-offset-2 hover:border-admin-coral/40 hover:bg-admin-coral/[0.07] hover:text-[var(--quni-coral)] hover:underline sm:text-center"
                        >
                          <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-2 sm:mx-auto sm:max-w-md">
                            <AiSparkleIcon className="h-4 w-4 shrink-0 text-admin-coral/85 group-hover:text-[var(--quni-coral)]" />
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
                          className="inline-flex w-full min-w-0 max-w-full shrink-0 items-center justify-center break-words rounded-xl bg-[var(--quni-coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--quni-coral-hover)] sm:w-auto"
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

            <div className="quni-dashboard-panel">
              {dataLoading && otherBookings.length === 0 && pendingConfirmation.length === 0 ? (
                <div className="space-y-3 animate-pulse sm:p-4" aria-busy="true">
                  <div className="h-20 rounded-[var(--radius-lg)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] sm:border-0 sm:bg-[var(--quni-surface-3)]" />
                  <div className="h-20 rounded-[var(--radius-lg)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] sm:border-0 sm:bg-[var(--quni-surface-3)]" />
                </div>
              ) : otherBookings.length === 0 && pendingConfirmation.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500 sm:p-10">No bookings yet.</p>
              ) : otherBookings.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 sm:p-6">No other booking records.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:hidden">
                    {otherBookings.map((b) => {
                      const verification = buildLandlordVerificationFromProfile(b.student_profiles)
                      const isAgreementBusy = agreementActionBusyId === b.id
                      const showAgreementFootnote =
                        leaseDownloadErrorId === b.id && (b.status === 'confirmed' || b.status === 'active')
                      const actions =
                        b.status === 'confirmed' || b.status === 'active'
                          ? [
                              {
                                label: isAgreementBusy
                                  ? 'Opening…'
                                  : b.landlord_agreement_signed_paths
                                    ? 'Download agreement'
                                    : 'Open agreement',
                                variant: 'primary' as const,
                                onClick: () => void handleLandlordAgreement(b),
                                disabled: isAgreementBusy,
                              },
                              {
                                label: 'Booking details',
                                variant: 'secondary' as const,
                                href: `/landlord/bookings/${b.id}/review`,
                              },
                            ]
                          : [
                              {
                                label: 'Review request',
                                variant: 'primary' as const,
                                href: `/landlord/bookings/${b.id}/review`,
                              },
                            ]

                      return (
                        <LandlordBookingMobileCard
                          key={b.id}
                          studentName={studentDisplayFromBooking(b)}
                          onStudentClick={() =>
                            setStudentProfileModal({
                              student: b.student_profiles,
                              fallbackName: studentDisplayFromBooking(b),
                              scrollToVerification: false,
                              scrollToAiAssessment: false,
                              sessionKey: applicantSessionKeyFromBooking(b),
                              assessmentBookingId: b.id,
                            })
                          }
                          verification={verification}
                          propertyTitle={b.properties?.title ?? '-'}
                          propertySuburb={b.properties?.suburb}
                          serviceLabel={landlordServiceTierShortLabel(bookingServiceTier(b))}
                          moveInLabel={formatDate(b.move_in_date || b.start_date)}
                          endLabel={formatDate(b.end_date)}
                          weeklyRent={b.weekly_rent != null ? Number(b.weekly_rent) : null}
                          status={b.status}
                          actions={actions}
                          footnote={showAgreementFootnote ? 'Agreement not yet generated' : null}
                        />
                      )
                    })}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Verification</th>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3">Move-in → end</th>
                        <th className="px-4 py-3">Rent / wk</th>
                        <th className="px-4 py-3">Service</th>
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
                            <span className="font-medium text-gray-900">{b.properties?.title ?? '-'}</span>
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
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-gray-900">
                              {landlordServiceTierShortLabel(bookingServiceTier(b))}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookingStatusClass(b.status)}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              {b.status === 'confirmed' || b.status === 'active' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={agreementActionBusyId === b.id}
                                    onClick={() => void handleLandlordAgreement(b)}
                                    className="m-0 block w-full appearance-none border-0 bg-transparent p-0 text-left text-xs font-semibold text-[var(--quni-coral)] hover:text-[var(--quni-coral-hover)] underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
                                  >
                                    {agreementActionBusyId === b.id
                                      ? 'Opening…'
                                      : b.landlord_agreement_signed_paths
                                        ? 'Download agreement'
                                        : 'Open agreement'}
                                  </button>
                                  <Link
                                    to={`/landlord/bookings/${b.id}/review`}
                                    className="block w-full text-left text-xs font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2"
                                  >
                                    Booking details
                                  </Link>
                                </>
                              ) : (
                                <Link
                                  to={`/landlord/bookings/${b.id}/review`}
                                  className="text-left text-xs font-semibold text-[var(--quni-coral)] hover:text-[var(--quni-coral-hover)] underline underline-offset-2"
                                >
                                  Review request
                                </Link>
                              )}
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
                </>
              )}
            </div>
              </>
            ) : null}
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
            landlordFirstName={(() => {
              if (!profile) return null
              const display = landlordDisplayName(profile, '')
              return display.trim().split(/\s+/)[0] || null
            })()}
          />
        )}

        <LandlordDuplicateListingModal
          open={duplicateConfirmProperty != null}
          duplicatingListingId={duplicatingListingId}
          onConfirm={() => void confirmDuplicateListing()}
          onCancel={() => setDuplicateConfirmProperty(null)}
        />

        <LandlordTenantInviteModal
          open={inviteModalProperty != null}
          property={inviteModalProperty}
          landlordProfileId={profile?.id ?? null}
          onClose={closeInviteModal}
        />

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
                  className="rounded-xl bg-[var(--quni-coral)] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-60"
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
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 px-4 sm:bottom-6"
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

        <LandlordListingPaymentModal
          open={listingPaymentModalOpen}
          onClose={() => setListingPaymentModalOpen(false)}
          onSuccess={() => {
            showToast({ kind: 'success', message: 'Payment method saved.' })
            void fetchLandlordListingBillingSnapshot().then(setListingBilling)
            void load()
          }}
        />

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
