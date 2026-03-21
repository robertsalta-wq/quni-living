import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'
import { formatDisplayName } from '../lib/formatDisplayName'
import { formatDate } from './admin/adminUi'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type EnquiryRow = Database['public']['Tables']['enquiries']['Row']
type BookingStatus = BookingRow['status']
type EnquiryStatus = EnquiryRow['status']

type PropertyBookingEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'title' | 'slug' | 'suburb' | 'images' | 'rent_per_week'
>

type PropertyEnquiryEmbed = Pick<
  Database['public']['Tables']['properties']['Row'],
  'title' | 'slug' | 'images'
>

type BookingWithProperty = BookingRow & {
  properties: PropertyBookingEmbed | null
}

type EnquiryWithProperty = EnquiryRow & {
  properties: PropertyEnquiryEmbed | null
}

type TabId = 'bookings' | 'enquiries' | 'saved'

const ENQUIRY_TRUNC = 100

const cardClass = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm'

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

function firstPropertyImage(images: string[] | null | undefined): string | null {
  const found = (images ?? []).find((src) => Boolean(src?.trim()))
  return found?.trim() ?? null
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending') return 'bg-amber-100 text-amber-900'
  if (s === 'confirmed') return 'bg-green-100 text-green-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  return 'bg-gray-100 text-gray-600'
}

function enquiryStatusClass(s: EnquiryStatus) {
  if (s === 'new') return 'bg-blue-100 text-blue-800'
  if (s === 'replied') return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-600'
}

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
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
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<StudentRow | null>(null)
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [enquiries, setEnquiries] = useState<EnquiryWithProperty[]>([])
  const [tab, setTab] = useState<TabId>('bookings')
  const [expandedEnquiryIds, setExpandedEnquiryIds] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) {
        setProfile(null)
        setBookings([])
        setEnquiries([])
        setError(pErr.message || 'Could not load your profile.')
        return
      }

      const prof = profRaw as StudentRow | null
      if (!prof) {
        setProfile(null)
        setBookings([])
        setEnquiries([])
        setError('We couldn’t find your student profile yet. If you just signed up, try completing onboarding or your profile.')
        return
      }

      setProfile(prof)

      const [bookRes, enqRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, properties ( id, title, slug, suburb, images, rent_per_week )')
          .eq('student_id', prof.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enquiries')
          .select('*, properties ( title, slug, images )')
          .eq('student_id', prof.id)
          .order('created_at', { ascending: false }),
      ])

      if (bookRes.error) {
        setBookings([])
        setEnquiries([])
        setError(bookRes.error.message || 'Could not load bookings.')
        return
      }
      if (enqRes.error) {
        setBookings((bookRes.data ?? []) as BookingWithProperty[])
        setEnquiries([])
        setError(enqRes.error.message || 'Could not load enquiries.')
        return
      }

      setBookings((bookRes.data ?? []) as BookingWithProperty[])
      setEnquiries((enqRes.data ?? []) as EnquiryWithProperty[])
    } catch (e: unknown) {
      setProfile(null)
      setBookings([])
      setEnquiries([])
      setError(e instanceof Error ? e.message : 'Something went wrong loading your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length
  const profileComplete =
    Boolean(profile?.phone?.trim()) &&
    Boolean(profile?.university_id) &&
    Boolean(profile?.course?.trim())

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

  if (loading) {
    return (
      <div className="max-w-site mx-auto px-4 sm:px-6 py-12">
        <p className="text-gray-500 text-center">Loading your dashboard…</p>
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
    <div className="max-w-site mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
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
            Here’s a quick look at your bookings and enquiries — everything in one place.
          </p>
        </div>
        <Link to="/listings" className={primaryBtnClass}>
          Browse listings
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{bookings.length}</p>
          {pendingBookings > 0 ? (
            <p className="text-sm text-amber-800 mt-2 font-medium">
              {pendingBookings} pending — your host hasn’t confirmed yet
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No pending requests</p>
          )}
        </div>

        <div className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enquiries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{enquiries.length}</p>
          <p className="text-sm text-gray-500 mt-2">Messages you’ve sent about listings</p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your profile</p>
          {profileComplete ? (
            <>
              <p className="text-sm font-semibold text-green-800 mt-2">Profile complete</p>
              <p className="text-sm text-gray-500 mt-1">Nice work — hosts see you as ready to go.</p>
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
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Dashboard sections">
        {(
          [
            ['bookings', 'Bookings'],
            ['enquiries', 'Enquiries'],
            ['saved', 'Saved'],
          ] as const
        ).map(([id, label]) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

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
                const img = firstPropertyImage(prop?.images ?? null)
                const rent = b.weekly_rent ?? prop?.rent_per_week ?? null
                return (
                  <li
                    key={b.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
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
                            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${bookingStatusClass(b.status)}`}
                          >
                            {b.status}
                          </span>
                        </div>
                        {prop?.suburb && <p className="text-sm text-gray-500 mt-0.5">{prop.suburb}</p>}
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="text-gray-500">Stay:</span>{' '}
                          {formatDate(b.start_date)}
                          {b.end_date ? ` → ${formatDate(b.end_date)}` : ''}
                        </p>
                        <p className="text-base font-bold text-gray-900 mt-1">{formatWeeklyRent(rent)}</p>
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                        Awaiting landlord confirmation
                      </div>
                    )}
                    {b.status === 'confirmed' && (
                      <div className="border-t border-green-100 bg-green-50 px-5 py-3 text-sm text-green-800">
                        Your booking is confirmed
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'enquiries' && (
        <section aria-labelledby="enquiries-heading">
          <h2 id="enquiries-heading" className="sr-only">
            Your enquiries
          </h2>
          {enquiries.length === 0 ? (
            <div className={`${cardClass} text-center py-12`}>
              <p className="text-gray-800 font-medium">You haven&apos;t sent any enquiries yet</p>
              <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
                Found a place you like? Send a message from the listing page — we&apos;ll list it here.
              </p>
              <Link to="/listings" className={`${primaryBtnClass} mt-6`}>
                Browse listings
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {enquiries.map((enq) => {
                const prop = enq.properties
                const slug = prop?.slug
                const img = firstPropertyImage(prop?.images ?? null)
                const msg = enq.message ?? ''
                const expanded = expandedEnquiryIds[enq.id]
                const long = msg.length > ENQUIRY_TRUNC
                const shown = expanded || !long ? msg : `${msg.slice(0, ENQUIRY_TRUNC).trim()}…`
                return (
                  <li key={enq.id} className={cardClass}>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="shrink-0 w-full sm:w-32 aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-100">
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
                              className="font-bold text-gray-900 hover:text-indigo-700 line-clamp-2"
                            >
                              {prop?.title ?? 'Property'}
                            </Link>
                          ) : (
                            <span className="font-bold text-gray-900">{prop?.title ?? 'Property'}</span>
                          )}
                          <span
                            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${enquiryStatusClass(enq.status)}`}
                          >
                            {enq.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Sent {formatDate(enq.created_at)}</p>
                        <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{shown}</p>
                        {long && (
                          <button
                            type="button"
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 mt-2"
                            onClick={() =>
                              setExpandedEnquiryIds((prev) => ({ ...prev, [enq.id]: !prev[enq.id] }))
                            }
                          >
                            {expanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
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
        <div className={`${cardClass} text-center py-14`}>
          <p className="text-gray-800 font-medium">Save your favourite properties — coming soon.</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            Soon you&apos;ll be able to shortlist homes and come back to them anytime.
          </p>
          <Link to="/listings" className={`${secondaryBtnClass} mt-6`}>
            Browse listings
          </Link>
        </div>
      )}
    </div>
  )
}
