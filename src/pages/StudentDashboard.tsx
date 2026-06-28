import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isRenterRole } from '../lib/authProfile'
import DashboardPageSkeleton from '../components/DashboardPageSkeleton'
import type { Database } from '../lib/database.types'
import { formatDisplayName } from '../lib/formatDisplayName'
import { formatDate } from './admin/adminUi'
import { apiUrl } from '../lib/apiUrl'
import { StudentStripePaymentsCard } from '../components/student/StudentStripePaymentsCard'
import {
  isRenterUniversalVerificationComplete,
  renterProfileStatCardCopy,
} from '../lib/renterReadiness'
import { isBondPaymentReceiptContext } from '../lib/listings'
import TenancyAgreementExplainer from '../components/TenancyAgreementExplainer'
import QaseSubmitModal from '../components/qase/QaseSubmitModal'
import BookingLeasePanel from '../components/booking/BookingLeasePanel'
import ListingBondPaymentGuidance from '../components/booking/ListingBondPaymentGuidance'
import { resolveTenancyPackage } from '../../api/lib/resolveTenancyPackage'
import { listingBondPaymentTenantGuidance } from '../lib/tenancy/listingBondPaymentCopy'
import { parseQldBondRemittancePreference } from '../lib/tenancy/qldBondRemittance'
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import UserDashboardBreadcrumb from '../components/dashboard/UserDashboardBreadcrumb'
import UserDashboardSectionNav from '../components/dashboard/UserDashboardSectionNav'
import { userDashboardBreadcrumbs } from '../lib/userDashboardNav'
import { pickCurrentTenantBooking } from '../lib/tenantCurrentBooking'
import { tenantBookingCardBanner, tenantBookingStatusLabel } from '../lib/tenantBookingStatus'
import StudentDashboardBookingStatusStrip from '../components/student/StudentDashboardBookingStatusStrip'
import LanguagesSpokenDisplay from '../components/profile/LanguagesSpokenDisplay'
import { resolveBookingBondAmountAud } from '../lib/booking/resolveBookingBondAmount'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingStatus = BookingRow['status']

type PropertyBookingEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  | 'id'
  | 'title'
  | 'slug'
  | 'suburb'
  | 'images'
  | 'rent_per_week'
  | 'bond'
  | 'property_type'
  | 'state'
  | 'is_registered_rooming_house'
> & {
  landlord_profiles: Pick<
    Database['public']['Tables']['landlord_profiles']['Row'],
    'full_name' | 'avatar_url' | 'verified' | 'languages_spoken'
  > | null
}

type BookingWithProperty = BookingRow & {
  properties: PropertyBookingEmbed | null
}

type TabId = 'bookings'

const statCardClass =
  'flex flex-col rounded-2xl border border-[#E5E4E7] bg-white p-4 sm:p-[18px] shadow-[0_1px_2px_rgba(8,6,13,0.05)] min-w-0 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-0.5 hover:shadow-md'

const profileStatCardClass =
  'flex flex-col rounded-2xl border border-[rgba(255,111,97,0.35)] bg-[rgba(255,111,97,0.06)] p-4 sm:p-[18px] shadow-[0_1px_2px_rgba(8,6,13,0.05)] min-w-0 lg:min-h-[10rem]'

const cardClass = 'rounded-2xl border border-[#E5E4E7] bg-white p-5 shadow-[0_1px_2px_rgba(8,6,13,0.05)]'

function ListingBondGuidanceForBooking({
  booking,
  property,
}: {
  booking: BookingRow
  property: PropertyBookingEmbed
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
  const guidance = listingBondPaymentTenantGuidance(pkg.rules.bond, property.state, {
    qldBondRemittancePreference: parseQldBondRemittancePreference(
      (property as { qld_bond_remittance_preference?: string | null }).qld_bond_remittance_preference,
    ),
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

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending' || s === 'pending_payment' || s === 'pending_confirmation') return 'bg-amber-100 text-amber-900'
  if (s === 'awaiting_info') return 'bg-sky-100 text-sky-900'
  if (s === 'bond_pending') return 'bg-emerald-100 text-emerald-900'
  if (s === 'confirmed' || s === 'active') return 'bg-green-100 text-green-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  if (s === 'declined' || s === 'expired' || s === 'payment_failed') return 'bg-red-50 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '-'
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} /wk`
}

function PropertyThumbPlaceholder() {
  return (
    <div className="w-full h-full min-h-[5.5rem] flex items-center justify-center text-gray-300 bg-gray-100">
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
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<StudentRow | null>(authStudent)
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [tab, setTab] = useState<TabId>('bookings')
  const [bondDownloadBusyId, setBondDownloadBusyId] = useState<string | null>(null)
  const [bondDownloadErrorId, setBondDownloadErrorId] = useState<string | null>(null)
  const [qaseOpen, setQaseOpen] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setDataLoading(false)
      return
    }
    setDataLoading(true)
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
          setBookings([])
          setError(pErr.message || 'Could not load your profile.')
          return
        }
        prof = profRaw as StudentRow | null
      }

      if (!prof) {
        setProfile(null)
        setBookings([])
        setError('We couldn’t find your student profile yet. If you just signed up, try completing onboarding or your profile.')
        return
      }

      setProfile(prof)

      const bookRes = await supabase
        .from('bookings')
        .select(
          '*, properties ( id, title, slug, suburb, images, rent_per_week, bond, bond_weeks, property_type, state, is_registered_rooming_house, landlord_profiles ( full_name, avatar_url, verified, languages_spoken ) )',
        )
        .eq('student_id', prof.id)
        .order('created_at', { ascending: false })

      if (bookRes.error) {
        setBookings([])
        setError(bookRes.error.message || 'Could not load bookings.')
        return
      }

      setBookings((bookRes.data ?? []) as BookingWithProperty[])
    } catch (e: unknown) {
      setProfile(null)
      setBookings([])
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
    void load()
  }, [load])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'enquiries') {
      navigate('/messages', { replace: true })
      return
    }
    if (t === 'saved') {
      navigate('/student-profile', { replace: true })
      return
    }
    if (t === 'bookings') setTab('bookings')
  }, [searchParams, navigate])

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
    'inline-flex items-center justify-center rounded-[10px] bg-[#FF6F61] text-white text-sm font-semibold px-[18px] py-[11px] shadow-sm hover:bg-[#F2604F] active:bg-[#CC4A3C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2 w-full sm:w-auto'

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-gray-600 text-center">Connect Supabase in your environment to use the dashboard.</p>
      </div>
    )
  }

  if (dataLoading && !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-[#F7F8FA]">
        <DashboardPageSkeleton />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className={`${cardClass} text-center`}>
          <p className="text-gray-800">{error}</p>
          <Link to="/student-profile" className={`${primaryBtnClass} mt-6`}>
            Go to profile
          </Link>
        </div>
      </div>
    )
  }

  const welcomeName = profile ? firstNameFromStudent(profile) : 'there'

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-[#F7F8FA] pb-16 overflow-x-hidden">
      <div className="max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
        <UserDashboardBreadcrumb segments={userDashboardBreadcrumbs('renter')} className="mb-4 sm:mb-5" />
        {error && profile && (
          <div
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 mb-7 sm:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-[30px] sm:text-[40px] font-bold text-[#08060D] tracking-tight leading-[1.1]">
              Welcome back, {welcomeName}
            </h1>
            <p className="text-[#6B6375] mt-2 sm:mt-2.5 text-[15px] sm:text-base max-w-xl leading-relaxed">
              Here&apos;s a quick look at your bookings and messages — everything in one place.
            </p>
          </div>
          <Link to="/listings" className={primaryBtnClass}>
            Browse listings
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 mb-6 min-w-0">
          <div className={`${statCardClass} lg:min-h-[10rem]`}>
            <p className="text-[11px] font-semibold text-[#908897] uppercase tracking-[0.04em]">Bookings</p>
            <p className="text-[30px] sm:text-[34px] font-bold text-[#08060D] mt-1.5 sm:mt-2 tabular-nums leading-none">
              {bookings.length}
            </p>
            <p className="text-[13px] text-[#6B6375] mt-auto pt-2">
              {bookings.length === 0 ? 'No requests' : `${bookings.length} total`}
            </p>
          </div>

          <Link to="/messages" className={`${statCardClass} lg:min-h-[10rem] hover:border-[rgba(255,111,97,0.35)]`}>
            <p className="text-[11px] font-semibold text-[#908897] uppercase tracking-[0.04em]">Messages</p>
            <p className="text-[30px] sm:text-[34px] font-bold text-[#08060D] mt-1.5 sm:mt-2 tabular-nums leading-none">
              {unreadMessageCount}
            </p>
            <p
              className={`text-[13px] mt-auto pt-2 ${
                unreadMessageCount > 0 ? 'font-semibold text-[#CC4A3C]' : 'text-[#6B6375]'
              }`}
            >
              {unreadMessageCount > 0
                ? `${unreadMessageCount} unread`
                : 'No new messages'}
            </p>
          </Link>

          <div className={`${profileStatCardClass} col-span-2 lg:col-span-1`}>
            <div className="flex items-start justify-between gap-3 sm:block">
              <p className="text-[11px] font-semibold text-[#B25548] uppercase tracking-[0.04em]">Your profile</p>
              {profileStatCard.showFinishSetup ? (
                <Link
                  to="/student-profile"
                  className="text-[13px] font-semibold text-[#FF6F61] hover:text-[#CC4A3C] hover:underline shrink-0 sm:hidden"
                >
                  Finish setup →
                </Link>
              ) : null}
            </div>
            <p className="mt-2 leading-none">
              <span className="text-[30px] sm:text-[34px] font-bold text-[#08060D] tabular-nums">
                {profileStatCard.pct}%
              </span>
              <span className="text-[13px] text-[#6B6375] ml-1.5">complete</span>
            </p>
            <div className="h-1.5 rounded-full bg-[rgba(255,111,97,0.18)] mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF6F61] transition-all duration-300"
                style={{ width: `${profileStatCard.pct}%` }}
                role="progressbar"
                aria-valuenow={profileStatCard.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Profile completion ${profileStatCard.pct}%`}
              />
            </div>
            {profileStatCard.showFinishSetup ? (
              <Link
                to="/student-profile"
                className="hidden sm:inline text-[13px] font-semibold text-[#FF6F61] hover:text-[#CC4A3C] hover:underline mt-auto pt-3"
              >
                Finish setup →
              </Link>
            ) : null}
          </div>

          <Link
            to="/listings"
            className={`${statCardClass} col-span-2 lg:col-span-1 lg:min-h-[10rem] hover:border-[rgba(255,111,97,0.35)] group`}
          >
            <div className="flex items-center justify-between gap-3 sm:block min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#908897] uppercase tracking-[0.04em]">
                  Find accommodation
                </p>
                <p className="text-sm text-[#4A4253] mt-2 leading-snug sm:hidden">Browse rooms near your uni</p>
                <p className="hidden sm:block text-sm text-[#4A4253] mt-2.5 leading-snug">
                  Browse student-friendly rooms near your uni.
                </p>
              </div>
              <span className="text-[#FF6F61] font-semibold text-lg sm:hidden shrink-0" aria-hidden>
                →
              </span>
            </div>
            <span className="hidden sm:inline text-[13px] font-semibold text-[#FF6F61] group-hover:text-[#CC4A3C] group-hover:underline mt-auto pt-3">
              Browse listings →
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setQaseOpen(true)}
            className={`${statCardClass} col-span-2 lg:col-span-1 lg:min-h-[10rem] w-full text-left hover:border-[rgba(255,111,97,0.35)] group`}
          >
            <div className="flex items-center justify-between gap-3 sm:block min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#908897] uppercase tracking-[0.04em]">Get support</p>
                <p className="text-sm text-[#4A4253] mt-2 leading-snug sm:hidden">We&apos;ll get back to you</p>
                <p className="hidden sm:block text-sm text-[#4A4253] mt-2.5 leading-snug">
                  Submit a request and we&apos;ll get back to you.
                </p>
              </div>
              <span className="text-[#FF6F61] font-semibold text-lg sm:hidden shrink-0" aria-hidden>
                →
              </span>
            </div>
            <span className="hidden sm:inline text-[13px] font-semibold text-[#FF6F61] group-hover:text-[#CC4A3C] group-hover:underline mt-auto pt-3">
              Contact support →
            </span>
          </button>
        </div>

        <UserDashboardSectionNav
          role="renter"
          active={tab}
          onSelect={(section) => {
            if (section === 'bookings') setTab('bookings')
          }}
        />

        {tab === 'bookings' && (
          <section aria-labelledby="bookings-heading" className="mb-6 min-w-0">
            <h2 id="bookings-heading" className="sr-only">
              Your bookings
            </h2>
            {currentBooking && (
              <div className="mb-4">
                <StudentDashboardBookingStatusStrip status={currentBooking.status} />
              </div>
            )}
          {bookings.length === 0 ? (
            <div className={`${cardClass} text-center py-12`}>
              <p className="text-gray-800 font-medium">No bookings yet</p>
              <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
                When you request a stay, it’ll show up here so you can track the status.
              </p>
              <Link to="/listings" className={`${primaryBtnClass} mt-6`}>
                Browse listings
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookings.map((b) => {
                const prop = b.properties
                const slug = prop?.slug
                const img = firstPropertyImageUrl(prop?.images ?? null)
                const rent = b.weekly_rent ?? prop?.rent_per_week ?? null
                return (
                  <li
                    key={b.id}
                    className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
                      currentBooking?.id === b.id
                        ? 'border-indigo-200 ring-2 ring-indigo-100'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-5">
                      <div className="shrink-0 w-full sm:w-40 aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-100">
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
                              className="text-lg font-bold text-gray-900 hover:text-indigo-700 line-clamp-2"
                            >
                              {prop?.title ?? 'Property'}
                            </Link>
                          ) : (
                            <span className="text-lg font-bold text-gray-900">{prop?.title ?? 'Property'}</span>
                          )}
                          <span
                            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${bookingStatusClass(b.status)}`}
                          >
                            {tenantBookingStatusLabel(b.status)}
                          </span>
                        </div>
                        {prop?.suburb && <p className="text-sm text-gray-500 mt-0.5">{prop.suburb}</p>}
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="text-gray-500">Stay:</span>{' '}
                          {formatDate(b.start_date)}
                          {b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
                        </p>
                        <p className="text-base font-bold text-gray-900 mt-1">{formatWeeklyRent(rent)}</p>
                        {prop?.landlord_profiles && (
                          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your host</p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">
                              {(prop.landlord_profiles.full_name ?? 'Host').toLowerCase()}
                            </p>
                            <LanguagesSpokenDisplay
                              languages={prop.landlord_profiles.languages_spoken}
                              className="mt-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const banner = tenantBookingCardBanner(b.status, b.service_tier_at_request)
                      return banner ? <div className={banner.panelClass}>{banner.text}</div> : null
                    })()}
                    {(b.status === 'bond_pending' ||
                      b.status === 'confirmed' ||
                      b.status === 'active') && (
                      <div className="border-t border-indigo-100 bg-indigo-50/80 px-5 py-3 text-sm text-indigo-950 space-y-3">
                        {b.status === 'bond_pending' && b.service_tier_final === 'listing' && prop && (
                          <ListingBondGuidanceForBooking booking={b} property={prop} />
                        )}
                        <TenancyAgreementExplainer
                          state={prop?.state ?? ''}
                          propertyType={prop?.property_type ?? ''}
                          isRegisteredRoomingHouse={Boolean(prop?.is_registered_rooming_house)}
                        />
                        <BookingLeasePanel bookingId={b.id} />
                      </div>
                    )}
                    {(b.status === 'confirmed' || b.status === 'active') &&
                      prop &&
                      isBondPaymentReceiptContext(prop.property_type) && (
                        <div className="border-t border-stone-200 bg-[#FEF9E4]/70 px-5 py-3 text-sm text-stone-800 space-y-2">
                          {bondDownloadErrorId === b.id ? (
                            <p className="text-amber-900 text-xs leading-relaxed">
                              Bond receipt isn&apos;t available yet. Your host will generate it from their dashboard after
                              they record your bond payment.
                            </p>
                          ) : null}
                          <button
                            type="button"
                            disabled={bondDownloadBusyId === b.id}
                            onClick={() => void downloadBondReceipt(b.id)}
                            className="inline-flex items-center rounded-lg bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2 hover:bg-[#e85d52] disabled:opacity-50"
                          >
                            {bondDownloadBusyId === b.id ? 'Opening…' : 'Download bond receipt'}
                          </button>
                        </div>
                      )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        )}

        {profile && (
          <div className="mb-5">
            <StudentStripePaymentsCard profile={profile} onRefresh={load} />
          </div>
        )}

        <Link
          to="/sample-agreements"
          className="inline-block text-sm font-semibold text-[#FF6F61] hover:text-[#CC4A3C] hover:underline"
        >
          View sample agreements →
        </Link>

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
