import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import DashboardPageSkeleton from '../components/DashboardPageSkeleton'
import type { Database } from '../lib/database.types'
import { formatDisplayName } from '../lib/formatDisplayName'
import { formatDate } from './admin/adminUi'
import { apiUrl } from '../lib/apiUrl'
import { StudentStripePaymentsCard } from '../components/student/StudentStripePaymentsCard'
import OnboardingChecklistBanner from '../components/OnboardingChecklistBanner'
import { isTenantCoreProfileComplete } from '../lib/studentOnboarding'
import { isBondPaymentReceiptContext } from '../lib/listings'
import TenancyAgreementExplainer from '../components/TenancyAgreementExplainer'
import QaseSubmitModal from '../components/qase/QaseSubmitModal'
import BookingLeasePanel from '../components/booking/BookingLeasePanel'
import ListingBondPaymentGuidance from '../components/booking/ListingBondPaymentGuidance'
import { resolveTenancyPackage } from '../../api/lib/resolveTenancyPackage'
import { listingBondPaymentTenantGuidance } from '../lib/tenancy/listingBondPaymentCopy'
import { parseQldBondRemittancePreference } from '../lib/tenancy/qldBondRemittance'
import { useConversationInbox } from '../hooks/useConversationInbox'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import UserDashboardBreadcrumb from '../components/dashboard/UserDashboardBreadcrumb'
import UserDashboardSectionNav from '../components/dashboard/UserDashboardSectionNav'
import { userDashboardBreadcrumbs } from '../lib/userDashboardNav'
import { pickCurrentTenantBooking } from '../lib/tenantCurrentBooking'
import { tenantBookingCardBanner, tenantBookingStatusLabel } from '../lib/tenantBookingStatus'
import StudentDashboardBookingStatusStrip from '../components/student/StudentDashboardBookingStatusStrip'
import LanguagesSpokenDisplay from '../components/profile/LanguagesSpokenDisplay'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingStatus = BookingRow['status']

type PropertyBookingEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'title' | 'slug' | 'suburb' | 'images' | 'rent_per_week' | 'property_type' | 'state' | 'is_registered_rooming_house'
> & {
  landlord_profiles: Pick<
    Database['public']['Tables']['landlord_profiles']['Row'],
    'full_name' | 'avatar_url' | 'verified' | 'languages_spoken'
  > | null
}

type BookingWithProperty = BookingRow & {
  properties: PropertyBookingEmbed | null
}

type TabId = 'bookings' | 'saved'

const cardClass = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm'

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
  const bondAud =
    typeof property.rent_per_week === 'number' && Number.isFinite(property.rent_per_week)
      ? Math.round(property.rent_per_week * 4 * 100) / 100
      : null
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
    role === 'student' && authProfile && 'id' in authProfile ? (authProfile as StudentRow) : null
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { items: conversations } = useConversationInbox(user?.id)
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
          '*, properties ( id, title, slug, suburb, images, rent_per_week, property_type, state, is_registered_rooming_house, landlord_profiles ( full_name, avatar_url, verified, languages_spoken ) )',
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
    if (t === 'bookings' || t === 'saved') setTab(t)
  }, [searchParams, navigate])

  useEffect(() => {
    if (authStudent) setProfile(authStudent)
  }, [authStudent])

  const pendingBookings = bookings.filter(
    (b) =>
      b.status === 'pending' ||
      b.status === 'pending_confirmation' ||
      b.status === 'pending_payment' ||
      b.status === 'awaiting_info',
  ).length
  const bondPendingBookings = bookings.filter((b) => b.status === 'bond_pending').length
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'active').length
  const currentBooking = useMemo(() => pickCurrentTenantBooking(bookings), [bookings])
  const profileComplete = isTenantCoreProfileComplete(profile)

  const primaryBtnClass =
    'inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'

  const secondaryBtnClass =
    'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-semibold px-4 py-2.5 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-gray-600 text-center">Connect Supabase in your environment to use the dashboard.</p>
      </div>
    )
  }

  if (dataLoading && !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
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
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 pb-16">
    <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <UserDashboardBreadcrumb segments={userDashboardBreadcrumbs('student')} className="mb-4" />
      {profile && user?.id && (
        <OnboardingChecklistBanner
          role="student"
          userId={user.id}
          studentProfile={profile}
          landlordProfile={null}
          onRefresh={load}
        />
      )}
      {error && profile && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Welcome back, {welcomeName}
          </h1>
          <p className="text-gray-500 mt-2 text-base max-w-2xl">
            Here’s a quick look at your bookings and messages - everything in one place.
          </p>
        </div>
        <Link to="/listings" className={primaryBtnClass}>
          Browse listings
        </Link>
      </div>

      {currentBooking && (
        <div className="mb-6">
          <StudentDashboardBookingStatusStrip status={currentBooking.status} />
        </div>
      )}

      <div className="mb-6">
        <Link to="/sample-agreements" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
          View sample agreements →
        </Link>
      </div>

      {profile && <StudentStripePaymentsCard profile={profile} onRefresh={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{bookings.length}</p>
          {bondPendingBookings > 0 ? (
            <p className="text-sm text-emerald-800 mt-2 font-medium">
              {bondPendingBookings === 1 ? 'Host accepted' : `${bondPendingBookings} accepted`} - complete bond &
              agreement
            </p>
          ) : pendingBookings > 0 ? (
            <p className="text-sm text-amber-800 mt-2 font-medium">
              {pendingBookings === 1 ? 'Request submitted' : `${pendingBookings} submitted`} - waiting for host
            </p>
          ) : confirmedBookings > 0 ? (
            <p className="text-sm text-green-800 mt-2 font-medium">
              {confirmedBookings === 1 ? 'Booking confirmed' : `${confirmedBookings} confirmed`}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No active requests</p>
          )}
        </div>

        <Link to="/messages" className={`${cardClass} block hover:border-indigo-200 hover:shadow-md transition-all`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Messages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{conversations.length}</p>
          <p className="text-sm text-gray-500 mt-2">Conversations with landlords</p>
        </Link>

        <div className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your profile</p>
          {profileComplete ? (
            <>
              <p className="text-sm font-semibold text-green-800 mt-2">Profile complete</p>
              <p className="text-sm text-gray-500 mt-1">Nice work - hosts see you as ready to go.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-stone-800 mt-2">Complete your profile</p>
              <p className="text-sm text-gray-600 mt-1">Add a few details so landlords can get to know you.</p>
              <Link to="/student-profile" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 mt-3 inline-block">
                Finish setup →
              </Link>
            </>
          )}
        </div>

        <Link
          to="/listings"
          className={`${cardClass} block hover:border-indigo-200 hover:shadow-md transition-all group`}
        >
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Find accommodation</p>
          <p className="text-lg font-bold text-gray-900 mt-2 group-hover:text-indigo-900">Browse student-friendly properties near your uni</p>
          <span className="text-sm font-semibold text-indigo-600 mt-3 inline-block">Explore listings →</span>
        </Link>

        <button
          type="button"
          onClick={() => setQaseOpen(true)}
          className={`${cardClass} w-full text-left hover:border-indigo-200 hover:shadow-md transition-all group`}
        >
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Need help?</p>
          <p className="text-lg font-bold text-gray-900 mt-2">Get support</p>
          <p className="text-sm text-gray-500 mt-1">Submit a support request and we&apos;ll get back to you.</p>
          <span className="text-sm font-semibold text-indigo-600 mt-3 inline-block">Contact support →</span>
        </button>
      </div>

      <UserDashboardSectionNav
        role="student"
        active={tab}
        onSelect={(section) => {
          if (section === 'bookings' || section === 'saved') setTab(section)
        }}
      />

      {tab === 'bookings' && (
        <section aria-labelledby="bookings-heading">
          <h2 id="bookings-heading" className="sr-only">
            Your bookings
          </h2>
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
                      const banner = tenantBookingCardBanner(b.status)
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

      {tab === 'saved' && (
        <div className={`${cardClass} text-center py-14`}>
          <p className="text-gray-800 font-medium">Save your favourite properties - coming soon.</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            Soon you&apos;ll be able to shortlist homes and come back to them anytime.
          </p>
          <Link to="/listings" className={`${secondaryBtnClass} mt-6`}>
            Browse listings
          </Link>
        </div>
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
