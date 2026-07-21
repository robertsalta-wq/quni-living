import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isRenterRole } from '../lib/authProfile'
import DashboardPageSkeleton from '../components/DashboardPageSkeleton'
import type { Database } from '../lib/database.types'
import { formatDisplayName } from '../lib/formatDisplayName'
import { studentDisplayName } from '../lib/nameResolution'
import { formatDate } from './admin/adminUi'
import { apiUrl } from '../lib/apiUrl'
import { StudentStripePaymentsCard } from '../components/student/StudentStripePaymentsCard'
import {
  isRenterUniversalVerificationComplete,
  renterProfileStatCardCopy,
} from '../lib/renterReadiness'
import { consumeLoginWelcomePending } from '../lib/loginWelcomeToast'
import QaseSubmitModal from '../components/qase/QaseSubmitModal'
import ListingBondPaymentGuidance from '../components/booking/ListingBondPaymentGuidance'
import { resolveTenancyPackage } from '../../api/lib/resolveTenancyPackage'
import { listingBondPaymentTenantGuidance } from '../lib/tenancy/listingBondPaymentCopy'
import { parseQldBondRemittancePreference } from '../lib/tenancy/qldBondRemittance'
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import { studentDashboardTabPath } from '../lib/userDashboardNav'
import RenterDashboardPageHeader, {
  renterDashboardPageInsetClass,
} from '../components/student/RenterDashboardPageHeader'
import { pickCurrentTenantBooking } from '../lib/tenantCurrentBooking'
import { tenantBookingStatusLabel } from '../lib/tenantBookingStatus'
import { bookingHasBondReceiptDocument } from '../lib/booking/renterBondReceiptCta'
import { resolveBookingBondAmountAud } from '../lib/booking/resolveBookingBondAmount'
import {
  normalizePropertyPayoutEmbed,
  propertyPayoutDetailsComplete,
} from '../lib/propertyPayoutDetails'
import RenterBookingZones from '../components/booking/RenterBookingZones'
import RenterBookingMobileCard from '../components/booking/list/RenterBookingMobileCard'
import { PropertyCard } from '../components/PropertyCard'
import { useSavedProperties } from '../context/SavedPropertiesContext'
import type { Property } from '../lib/listings'
import { landlordServiceTierShortLabel, parseLandlordServiceTier } from '../lib/landlordServiceTier'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingStatus = BookingRow['status']

type PropertyPayoutEmbed = Pick<
  Database['public']['Tables']['property_payout_details']['Row'],
  'account_name' | 'bsb' | 'account_number'
>

type PropertyBookingEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  | 'id'
  | 'title'
  | 'slug'
  | 'address'
  | 'suburb'
  | 'postcode'
  | 'images'
  | 'rent_per_week'
  | 'bond'
  | 'bond_weeks'
  | 'property_type'
  | 'state'
  | 'is_registered_rooming_house'
  | 'qld_bond_remittance_preference'
  | 'room_type'
  | 'available_from'
  | 'max_occupants'
  | 'parking_available'
  | 'furnished'
  | 'lease_length'
> & {
  property_payout_details: PropertyPayoutEmbed | PropertyPayoutEmbed[] | null
  landlord_profiles: Pick<
    Database['public']['Tables']['landlord_profiles']['Row'],
    'full_name' | 'avatar_url' | 'verified' | 'languages_spoken'
  > | null
  property_features?: { features?: { name?: string | null } | null }[] | null
}

type BookingWithProperty = BookingRow & {
  properties: PropertyBookingEmbed | null
  /** Derived client-side from tenancy_documents lookup — not a PostgREST embed. */
  hasBondReceipt?: boolean
}

type TabId = 'overview' | 'bookings' | 'saved'

/** Survives remount when leaving /messages and returning to the student dashboard. */
const studentDashboardBookingsCacheByUserId = new Map<string, BookingWithProperty[]>()

function readStudentBookingsCache(userId: string | undefined): BookingWithProperty[] | null {
  if (!userId) return null
  return studentDashboardBookingsCacheByUserId.get(userId) ?? null
}

const statCardClass =
  'rounded-admin-lg border border-admin-line-soft bg-white p-4 sm:p-5 shadow-sm flex flex-col h-full min-w-0 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-0.5 hover:shadow-md hover:border-admin-coral-30 text-left'

const profileStatCardClass =
  'flex flex-col rounded-admin-lg border border-admin-coral-30 bg-admin-coral-tint p-4 sm:p-5 shadow-sm min-w-0 lg:min-h-[10rem] h-full'

const cardClass = 'rounded-admin-lg border border-[var(--quni-line)] bg-white p-5 shadow-[0_1px_2px_rgba(8,6,13,0.05)]'

function propertyAddressLine(property: PropertyBookingEmbed): string {
  return (
    [property.address, property.suburb, property.state, property.postcode].filter(Boolean).join(', ') ||
    property.title?.trim() ||
    ''
  )
}

function ListingBondGuidanceForBooking({
  booking,
  property,
  renterDisplayName,
}: {
  booking: BookingRow
  property: PropertyBookingEmbed
  renterDisplayName: string
}) {
  const moveIn =
    (typeof booking.move_in_date === 'string' && booking.move_in_date.trim()) ||
    (typeof booking.start_date === 'string' && booking.start_date.trim()) ||
    undefined
  const pkg = resolveTenancyPackage({
    state: property.state ?? 'NSW',
    property_type: property.property_type ?? '',
    is_registered_rooming_house: Boolean(property.is_registered_rooming_house),
    date: moveIn,
  })
  if (!pkg.supported || !pkg.rules.bond.schemeApplies) return null
  const payout = normalizePropertyPayoutEmbed(property.property_payout_details)
  const paymentReference = `${renterDisplayName.trim()} — ${propertyAddressLine(property)}`.trim()
  const guidance = listingBondPaymentTenantGuidance(pkg.rules.bond, property.state, {
    qldBondRemittancePreference: parseQldBondRemittancePreference(property.qld_bond_remittance_preference),
    payee: propertyPayoutDetailsComplete(payout) ? payout : null,
    paymentReference,
  })
  if (!guidance) return null
  const bondAud = resolveBookingBondAmountAud(
    booking.bond_amount,
    property,
    booking.weekly_rent ?? property.rent_per_week,
  )
  return <ListingBondPaymentGuidance guidance={guidance} bondAmountAud={bondAud} />
}

function firstNameFromStudent(p: StudentRow): string {
  const display = studentDisplayName(p, '')
  if (display) {
    const w = formatDisplayName(display).split(/\s+/)[0]
    return w || 'there'
  }
  const local = p.email?.split('@')[0]
  return local ? formatDisplayName(local) : 'there'
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-admin-warning-bg text-admin-warning-fg'
  if (s === 'awaiting_info') return 'bg-admin-info-bg text-admin-info-fg'
  if (s === 'bond_pending') return 'bg-admin-success-bg text-admin-success-fg'
  if (s === 'confirmed' || s === 'active') return 'bg-admin-success-bg text-admin-success-fg'
  if (s === 'completed') return 'bg-admin-coral-tint text-admin-coral'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-admin-danger-bg text-admin-danger-fg'
  return 'bg-admin-surface-3 text-admin-ink-4'
}

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '-'
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} /wk`
}

function PropertyThumbPlaceholder() {
  return (
    <div className="w-full h-full min-h-[5.5rem] flex items-center justify-center text-gray-300 bg-admin-surface-3">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        />
        <polyline
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          points="9 22 9 12 15 12 15 22"
        />
      </svg>
    </div>
  )
}

export default function StudentDashboard() {
  const { user, profile: authProfile, role } = useAuthContext()
  const authStudent =
    isRenterRole(role) && authProfile && 'id' in authProfile ? (authProfile as StudentRow) : null
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const unreadMessageCount = useUnreadMessageCount(user?.id)
  const cachedBookings = readStudentBookingsCache(user?.id)
  const [dataLoading, setDataLoading] = useState(() => !cachedBookings)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<StudentRow | null>(authStudent)
  const [bookings, setBookings] = useState<BookingWithProperty[]>(() => cachedBookings ?? [])
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (t === 'bookings' || t === 'saved') return t
      return 'overview'
    } catch {
      return 'overview'
    }
  })
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null)
  const welcomeToastTimerRef = useRef<number | null>(null)
  const [bondDownloadBusyId, setBondDownloadBusyId] = useState<string | null>(null)
  const [bondDownloadErrorId, setBondDownloadErrorId] = useState<string | null>(null)
  const [qaseOpen, setQaseOpen] = useState(false)
  const { listSaved, savedIds, idsLoading: savedIdsLoading } = useSavedProperties()
  const [savedProperties, setSavedProperties] = useState<Property[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setDataLoading(false)
      return
    }
    const hadCache = Boolean(readStudentBookingsCache(user.id))
    if (!hadCache) setDataLoading(true)
    setError(null)
    try {
      let prof: StudentRow | null = authStudent
      if (!prof) {
        const { data: profRaw, error: pErr } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (pErr) {
          setProfile(null)
          if (!hadCache) setBookings([])
          setError(pErr.message || 'Could not load your profile.')
          return
        }
        prof = profRaw as StudentRow | null
      }

      if (!prof) {
        setProfile(null)
        if (!hadCache) setBookings([])
        setError('We couldn’t find your student profile yet. If you just signed up, try completing onboarding or your profile.')
        return
      }

      setProfile(prof)

      const bookRes = await supabase
        .from('bookings')
        .select(
          '*, properties ( id, title, slug, address, suburb, postcode, images, rent_per_week, bond, bond_weeks, property_type, state, is_registered_rooming_house, qld_bond_remittance_preference, room_type, available_from, max_occupants, parking_available, furnished, lease_length, property_payout_details ( account_name, bsb, account_number ), landlord_profiles ( full_name, avatar_url, verified, languages_spoken ), property_features ( features ( name ) ) )',
        )
        .eq('student_id', prof.id)
        .order('created_at', { ascending: false })

      if (bookRes.error) {
        if (!hadCache) setBookings([])
        setError(bookRes.error.message || 'Could not load bookings.')
        return
      }

      const rows = (bookRes.data ?? []) as BookingWithProperty[]
      const bookingIds = rows.map((b) => b.id).filter(Boolean)
      const receiptByBookingId = new Set<string>()
      if (bookingIds.length > 0) {
        const { data: tenancyRows } = await supabase
          .from('tenancies')
          .select('booking_id, tenancy_documents ( document_type )')
          .in('booking_id', bookingIds)
        for (const t of tenancyRows ?? []) {
          const bid = typeof t.booking_id === 'string' ? t.booking_id : ''
          if (!bid) continue
          const docs = Array.isArray(t.tenancy_documents) ? t.tenancy_documents : []
          if (bookingHasBondReceiptDocument(docs)) receiptByBookingId.add(bid)
        }
      }

      const nextBookings = rows.map((b) => ({
        ...b,
        hasBondReceipt: receiptByBookingId.has(b.id),
      }))
      setBookings(nextBookings)
      studentDashboardBookingsCacheByUserId.set(user.id, nextBookings)
    } catch (e: unknown) {
      if (!hadCache) {
        setProfile(null)
        setBookings([])
        studentDashboardBookingsCacheByUserId.delete(user.id)
      }
      setError(e instanceof Error ? e.message : 'Something went wrong loading your dashboard.')
    } finally {
      setDataLoading(false)
    }
  }, [user?.id, authStudent])

  const downloadBondReceipt = useCallback(async (bookingId: string) => {
    setBondDownloadErrorId(null)
    setBondDownloadBusyId(bookingId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setBondDownloadErrorId(bookingId)
        return
      }
      const res = await fetch(apiUrl('/api/documents/bond-receipt-signed-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const j = (await res.json()) as { signed_url?: string; error?: string }
      if (!res.ok || !j.signed_url) {
        setBondDownloadErrorId(bookingId)
        return
      }
      window.open(j.signed_url, '_blank', 'noopener,noreferrer')
    } catch {
      setBondDownloadErrorId(bookingId)
    } finally {
      setBondDownloadBusyId(null)
    }
  }, [])

  useEffect(() => {
    const cached = readStudentBookingsCache(user?.id)
    if (!cached) return
    setBookings(cached)
    setDataLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'enquiries') {
      navigate('/messages', { replace: true })
      return
    }
    if (t === 'bookings') setTab('bookings')
    else if (t === 'saved') setTab('saved')
    else setTab('overview')
  }, [searchParams, navigate])

  const loadSaved = useCallback(async () => {
    setSavedLoading(true)
    setSavedError(null)
    try {
      const rows = await listSaved()
      setSavedProperties(rows)
    } catch (e: unknown) {
      setSavedError(e instanceof Error ? e.message : 'Could not load saved properties.')
      setSavedProperties([])
    } finally {
      setSavedLoading(false)
    }
  }, [listSaved])

  useEffect(() => {
    if (tab !== 'saved') return
    void loadSaved()
  }, [tab, loadSaved])

  useEffect(() => {
    if (tab !== 'saved' || savedIdsLoading) return
    setSavedProperties((prev) => {
      if (prev.length === 0) return prev
      const next = prev.filter((p) => savedIds.has(p.id))
      return next.length === prev.length ? prev : next
    })
  }, [savedIds, savedIdsLoading, tab])

  const selectDashboardTab = useCallback(
    (next: TabId) => {
      setTab(next)
      navigate(studentDashboardTabPath(next), { replace: true })
    },
    [navigate],
  )

  useEffect(() => {
    if (!profile) return
    if (!consumeLoginWelcomePending()) return
    const name = firstNameFromStudent(profile)
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

  useEffect(() => {
    if (authStudent) setProfile(authStudent)
  }, [authStudent])

  const currentBooking = useMemo(() => pickCurrentTenantBooking(bookings), [bookings])
  const profileStatCard = useMemo(() => {
    if (!profile) {
      return { pct: 0, done: 0, total: 4, complete: false, showFinishSetup: true }
    }
    const situation = profile.renter_situation
    const verificationComplete =
      situation != null ? isRenterUniversalVerificationComplete(profile, situation) : false
    return renterProfileStatCardCopy(profile, verificationComplete)
  }, [profile])

  const primaryBtnClass =
    'inline-flex items-center justify-center rounded-[10px] bg-admin-coral text-white text-sm font-semibold px-[18px] py-[11px] shadow-sm hover:bg-admin-coral-hover active:bg-admin-coral-active transition-colors focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:ring-offset-2 w-full sm:w-auto'

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-admin-ink-4 text-center">Connect Supabase in your environment to use the dashboard.</p>
      </div>
    )
  }

  if (dataLoading && !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-admin-surface-2">
        <DashboardPageSkeleton />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className={`${cardClass} text-center`}>
          <p className="text-admin-ink-2">{error}</p>
          <Link to="/student-profile" className={`${primaryBtnClass} mt-6`}>
            Go to profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-admin-surface-2 max-sm:pb-0 pb-16 overflow-x-hidden">
      {welcomeToast ? (
        <div
          className="fixed top-20 right-4 z-[70] w-[min(100%-2rem,22rem)] rounded-admin-md border border-admin-line bg-white px-4 py-3 shadow-lg flex gap-3 items-start"
          role="status"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-success-bg text-admin-success-fg text-sm font-bold"
            aria-hidden
          >
            ✓
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-admin-ink">{welcomeToast}</p>
            <p className="text-xs text-admin-ink-5 mt-0.5">Dismisses on its own · login only</p>
          </div>
        </div>
      ) : null}

      <div className={renterDashboardPageInsetClass}>
        {error && profile && (
          <div
            className="mb-6 rounded-admin-md border border-admin-warning bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg"
            role="alert"
          >
            {error}
          </div>
        )}

        <RenterDashboardPageHeader
          activeTab={tab}
          onTabSelect={(section) => {
            if (section === 'overview' || section === 'bookings' || section === 'saved') {
              selectDashboardTab(section)
            }
          }}
        />

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 mb-6 min-w-0">
              <button
                type="button"
                onClick={() => selectDashboardTab('bookings')}
                className={`${statCardClass} lg:min-h-[10rem]`}
              >
                <p className="text-[11px] font-semibold text-admin-ink-5 uppercase tracking-wide">Bookings</p>
                <p className="text-[30px] sm:text-[34px] font-bold text-admin-ink mt-2 tabular-nums leading-none">
                  {bookings.length}
                </p>
                <p className="text-xs text-admin-ink-5 mt-auto pt-2">
                  {bookings.length === 0 ? 'No requests' : `${bookings.length} total`}
                </p>
              </button>

              <Link to="/messages" className={`${statCardClass} lg:min-h-[10rem]`}>
                <p className="text-[11px] font-semibold text-admin-ink-5 uppercase tracking-wide">Messages</p>
                <p className="text-[30px] sm:text-[34px] font-bold text-admin-ink mt-2 tabular-nums leading-none">
                  {unreadMessageCount}
                </p>
                <p
                  className={`text-xs mt-auto pt-2 ${
                    unreadMessageCount > 0 ? 'font-semibold text-admin-coral-active' : 'text-admin-ink-5'
                  }`}
                >
                  {unreadMessageCount > 0 ? `${unreadMessageCount} unread` : 'No new messages'}
                </p>
              </Link>

              <div className={`${profileStatCardClass} col-span-2 lg:col-span-1`}>
                {profileStatCard.complete ? (
                  <>
                    <p className="text-sm font-semibold text-admin-ink leading-snug">
                      Profile {profileStatCard.pct}% Complete
                    </p>
                    <div className="h-1.5 rounded-full bg-admin-coral-tint-15 mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-admin-coral transition-all duration-300"
                        style={{ width: `${profileStatCard.pct}%` }}
                        role="progressbar"
                        aria-valuenow={profileStatCard.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Profile completion ${profileStatCard.pct}%`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 sm:block">
                      <p className="text-[11px] font-semibold text-admin-coral-active uppercase tracking-wide">Your profile</p>
                      <Link
                        to="/student-profile"
                        className="text-[13px] font-semibold text-admin-coral hover:text-admin-coral-active hover:underline shrink-0 sm:hidden"
                      >
                        Finish setup →
                      </Link>
                    </div>
                    <p className="mt-2 leading-none">
                      <span className="text-[30px] sm:text-[34px] font-bold text-admin-ink tabular-nums">
                        {profileStatCard.pct}%
                      </span>
                      <span className="text-[13px] text-admin-ink-5 ml-1.5">complete</span>
                    </p>
                    <div className="h-1.5 rounded-full bg-admin-coral-tint-15 mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-admin-coral transition-all duration-300"
                        style={{ width: `${profileStatCard.pct}%` }}
                        role="progressbar"
                        aria-valuenow={profileStatCard.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Profile completion ${profileStatCard.pct}%`}
                      />
                    </div>
                    <Link
                      to="/student-profile"
                      className="hidden sm:inline text-[13px] font-semibold text-admin-coral hover:text-admin-coral-active hover:underline mt-auto pt-3"
                    >
                      Finish setup →
                    </Link>
                  </>
                )}
              </div>

              <Link
                to="/listings"
                className={`${statCardClass} col-span-2 lg:col-span-1 lg:min-h-[10rem] group`}
              >
                <div className="flex items-center justify-between gap-3 sm:block min-w-0">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-admin-ink-5 uppercase tracking-wide">
                      Find accommodation
                    </p>
                    <p className="text-sm text-admin-ink-4 mt-2 leading-snug sm:hidden">Browse rooms near your uni</p>
                    <p className="hidden sm:block text-sm text-admin-ink-4 mt-2 leading-snug">
                      Browse student-friendly rooms near your uni.
                    </p>
                  </div>
                  <span className="text-admin-coral font-semibold text-lg sm:hidden shrink-0" aria-hidden>
                    →
                  </span>
                </div>
                <span className="hidden sm:inline text-[13px] font-semibold text-admin-coral group-hover:text-admin-coral-active group-hover:underline mt-auto pt-3">
                  Browse listings →
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setQaseOpen(true)}
                className={`${statCardClass} col-span-2 lg:col-span-1 lg:min-h-[10rem] group`}
              >
                <div className="flex items-center justify-between gap-3 sm:block min-w-0">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-admin-ink-5 uppercase tracking-wide">Get support</p>
                    <p className="text-sm text-admin-ink-4 mt-2 leading-snug sm:hidden">We&apos;ll get back to you</p>
                    <p className="hidden sm:block text-sm text-admin-ink-4 mt-2 leading-snug">
                      Submit a request and we&apos;ll get back to you.
                    </p>
                  </div>
                  <span className="text-admin-coral font-semibold text-lg sm:hidden shrink-0" aria-hidden>
                    →
                  </span>
                </div>
                <span className="hidden sm:inline text-[13px] font-semibold text-admin-coral group-hover:text-admin-coral-active group-hover:underline mt-auto pt-3">
                  Contact support →
                </span>
              </button>
            </div>

            {profile && (
              <div className="mb-5">
                <StudentStripePaymentsCard profile={profile} onRefresh={load} />
              </div>
            )}

            <Link
              to="/sample-agreements"
              className="inline-block text-sm font-semibold text-admin-coral hover:text-admin-coral-active hover:underline"
            >
              View sample agreements →
            </Link>
          </>
        )}

        {tab === 'bookings' && (
          <section aria-labelledby="bookings-heading" className="mb-6 min-w-0">
            <h2 id="bookings-heading" className="sr-only">
              Your bookings
            </h2>
            {dataLoading && bookings.length === 0 ? (
            <div className={`${cardClass} space-y-3 py-6 animate-pulse`} aria-busy="true">
              <div className="mx-auto h-20 max-w-md rounded-xl bg-admin-surface-3" />
              <div className="mx-auto h-20 max-w-md rounded-xl bg-admin-surface-3" />
            </div>
          ) : bookings.length === 0 ? (
            <div className={`${cardClass} text-center py-12`}>
              <p className="text-admin-ink-2 font-medium">No bookings yet</p>
              <p className="text-admin-ink-5 text-sm mt-2 max-w-sm mx-auto">
                When you request a stay, it’ll show up here so you can track the status.
              </p>
              <Link to="/listings" className={`${primaryBtnClass} mt-6`}>
                Browse listings
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3 sm:gap-4">
              {bookings.map((b) => {
                const prop = b.properties
                const slug = prop?.slug
                const img = firstPropertyImageUrl(prop?.images ?? null)
                const rent = b.weekly_rent ?? prop?.rent_per_week ?? null
                const isCurrent = currentBooking?.id === b.id
                const serviceTier =
                  parseLandlordServiceTier(b.service_tier_final) ??
                  parseLandlordServiceTier(b.service_tier_at_request)
                const hasBondReceipt = Boolean(b.hasBondReceipt)
                const bookingZones = (
                  <RenterBookingZones
                    booking={b}
                    property={prop}
                    studentProfile={profile}
                    renterDisplayName={profile ? studentDisplayName(profile) : 'Renter'}
                    isCurrent={isCurrent}
                    bondDownloadBusy={bondDownloadBusyId === b.id}
                    bondDownloadError={bondDownloadErrorId === b.id}
                    onDownloadBondReceipt={() => void downloadBondReceipt(b.id)}
                    hasBondReceipt={hasBondReceipt}
                    bondGuidance={
                      b.status === 'bond_pending' &&
                      b.service_tier_final === 'listing' &&
                      prop &&
                      profile ? (
                        <ListingBondGuidanceForBooking
                          booking={b}
                          property={prop}
                          renterDisplayName={studentDisplayName(profile)}
                        />
                      ) : null
                    }
                  />
                )
                return (
                  <li key={b.id} className="min-w-0">
                    <div
                      className={`flex flex-col gap-3 sm:gap-0 sm:overflow-hidden sm:rounded-admin-lg sm:border sm:bg-white sm:shadow-sm ${
                        isCurrent
                          ? 'sm:border-admin-line sm:ring-2 sm:ring-admin-coral/20'
                          : 'sm:border-admin-line-soft'
                      }`}
                    >
                      <div className="sm:hidden">
                        <RenterBookingMobileCard
                          propertyTitle={prop?.title ?? 'Property'}
                          propertySuburb={prop?.suburb}
                          serviceLabel={landlordServiceTierShortLabel(serviceTier)}
                          moveInLabel={formatDate(b.start_date)}
                          endLabel={b.end_date ? formatDate(b.end_date) : '—'}
                          weeklyRent={rent}
                          status={b.status}
                          propertySlug={slug}
                        />
                      </div>

                      <div className="hidden sm:flex flex-row gap-4 p-5">
                        <div className="shrink-0 w-40 aspect-square rounded-admin-md overflow-hidden border border-admin-line-soft bg-admin-surface-3">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PropertyThumbPlaceholder />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            {slug ? (
                              <Link
                                to={`/properties/${slug}`}
                                className="text-lg font-bold text-admin-ink hover:text-admin-coral line-clamp-2"
                              >
                                {prop?.title ?? 'Property'}
                              </Link>
                            ) : (
                              <span className="text-lg font-bold text-admin-ink">{prop?.title ?? 'Property'}</span>
                            )}
                            <span
                              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${bookingStatusClass(b.status)}`}
                            >
                              {tenantBookingStatusLabel(b.status)}
                            </span>
                          </div>
                          {prop?.suburb && <p className="text-sm text-admin-ink-5 mt-0.5">{prop.suburb}</p>}
                          <p className="text-sm text-admin-ink-3 mt-2">
                            <span className="text-admin-ink-5">Stay:</span>{' '}
                            {formatDate(b.start_date)}
                            {b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
                          </p>
                          <p className="text-base font-bold text-admin-ink mt-1">{formatWeeklyRent(rent)}</p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-[var(--quni-line)] bg-white shadow-sm sm:rounded-none sm:border-0 sm:border-t sm:border-admin-line-soft sm:shadow-none">
                        {bookingZones}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        )}

        {tab === 'saved' && (
          <section aria-labelledby="saved-heading" className="mb-6 min-w-0">
            <h2 id="saved-heading" className="sr-only">
              Saved properties
            </h2>
            {savedLoading && savedProperties.length === 0 ? (
              <div className={`${cardClass} space-y-3 py-6 animate-pulse`} aria-busy="true">
                <div className="mx-auto h-20 max-w-md rounded-xl bg-admin-surface-3" />
                <div className="mx-auto h-20 max-w-md rounded-xl bg-admin-surface-3" />
              </div>
            ) : savedError ? (
              <div className={`${cardClass} text-center py-12`}>
                <p className="text-admin-ink-2 font-medium">{savedError}</p>
                <button type="button" onClick={() => void loadSaved()} className={`${primaryBtnClass} mt-6`}>
                  Try again
                </button>
              </div>
            ) : savedProperties.length === 0 ? (
              <div className={`${cardClass} text-center py-12`}>
                <p className="text-admin-ink-2 font-medium">No saved properties yet</p>
                <p className="text-admin-ink-5 text-sm mt-2 max-w-sm mx-auto">
                  Tap the heart on a listing to save it — your favourites will show up here.
                </p>
                <Link to="/listings" className={`${primaryBtnClass} mt-6`}>
                  Browse listings
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {savedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </section>
        )}

        {profile && (
          <QaseSubmitModal
            isOpen={qaseOpen}
            onClose={() => setQaseOpen(false)}
            submitterType="student"
            submitterId={profile.id}
          />
        )}
      </div>
    </div>
  )
}
