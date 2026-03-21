import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'
import { formatDate } from './admin/adminUi'

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

type BookingWithRelations = BookingRow & {
  properties: { title: string; slug: string; suburb: string | null } | null
  student_profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}

type TabId = 'listings' | 'enquiries' | 'bookings'

function firstNameFromLandlord(p: LandlordRow): string {
  const fn = p.first_name?.trim()
  if (fn) return fn
  const full = p.full_name?.trim()
  if (full) return full.split(/\s+/)[0] ?? 'there'
  return p.email?.split('@')[0] || 'there'
}

function listingStatusClass(s: PropertyRow['status']) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-600'
}

function enquiryStatusClass(s: EnquiryStatus) {
  if (s === 'new') return 'bg-blue-100 text-blue-800'
  if (s === 'replied') return 'bg-emerald-100 text-emerald-800'
  return 'bg-gray-100 text-gray-600'
}

function bookingStatusClass(s: BookingStatus) {
  if (s === 'pending') return 'bg-amber-100 text-amber-800'
  if (s === 'confirmed') return 'bg-emerald-100 text-emerald-800'
  if (s === 'completed') return 'bg-indigo-100 text-indigo-800'
  return 'bg-gray-100 text-gray-600'
}

function studentDisplayFromBooking(b: BookingWithRelations): string {
  const sp = b.student_profiles
  if (!sp) return '—'
  if (sp.full_name?.trim()) return sp.full_name.trim()
  return sp.email?.trim() || '—'
}

const ENQUIRY_TRUNC = 100

export default function LandlordDashboard() {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<LandlordRow | null>(null)
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [enquiries, setEnquiries] = useState<EnquiryWithProperty[]>([])
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [tab, setTab] = useState<TabId>('listings')
  const [expandedEnquiryIds, setExpandedEnquiryIds] = useState<Record<string, boolean>>({})
  const [bookingActionId, setBookingActionId] = useState<string | null>(null)

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
        .single()
      if (pErr) throw pErr
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
        supabase
          .from('bookings')
          .select('*, properties ( title, slug, suburb ), student_profiles ( full_name, email, phone )')
          .eq('landlord_id', prof.id)
          .order('created_at', { ascending: false }),
      ])

      if (propRes.error) throw propRes.error
      if (enqRes.error) throw enqRes.error
      if (bookRes.error) throw bookRes.error

      setProperties((propRes.data ?? []) as PropertySummary[])
      setEnquiries((enqRes.data ?? []) as EnquiryWithProperty[])
      setBookings((bookRes.data ?? []) as BookingWithRelations[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.')
      setProfile(null)
      setProperties([])
      setEnquiries([])
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const markEnquiryRead = useCallback(async (id: string, current: EnquiryStatus) => {
    if (current !== 'new') return
    const { error: upErr } = await supabase.from('enquiries').update({ status: 'read' }).eq('id', id)
    if (!upErr) {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'read' } : e)))
    }
  }, [])

  const toggleEnquiryExpand = useCallback(
    (row: EnquiryWithProperty) => {
      if (row.status === 'new') void markEnquiryRead(row.id, row.status)
      setExpandedEnquiryIds((m) => ({ ...m, [row.id]: !m[row.id] }))
    },
    [markEnquiryRead],
  )

  const onViewPropertyFromEnquiry = useCallback(
    (row: EnquiryWithProperty) => {
      if (row.status === 'new') void markEnquiryRead(row.id, row.status)
    },
    [markEnquiryRead],
  )

  const setBookingStatus = useCallback(async (id: string, status: 'confirmed' | 'cancelled') => {
    setBookingActionId(id)
    try {
      const { error: upErr } = await supabase.from('bookings').update({ status }).eq('id', id)
      if (upErr) throw upErr
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
    } catch {
      /* keep UI; could toast */
    } finally {
      setBookingActionId(null)
    }
  }, [])

  const activeListings = properties.filter((p) => p.status === 'active').length
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length
  const profileComplete =
    Boolean(profile?.phone?.trim()) && Boolean(profile?.bio?.trim())

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 text-sm text-gray-600">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 max-w-lg mx-auto">
        <p className="text-red-700 text-sm">{error ?? 'Landlord profile not found.'}</p>
        <Link to="/landlord-profile" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Go to profile
        </Link>
      </div>
    )
  }

  const welcomeName = firstNameFromLandlord(profile)

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-6xl mx-auto px-6 py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome back, {welcomeName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here’s what’s happening with your listings, enquiries, and booking requests.
            </p>
          </div>
          <Link
            to="/landlord/property/new"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 shadow-sm shrink-0"
          >
            Add new listing
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
            {profileComplete ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">Profile complete</p>
            ) : (
              <Link
                to="/landlord-profile"
                className="mt-3 inline-block text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100"
              >
                Complete your profile
              </Link>
            )}
            <p className="text-xs text-gray-500 mt-2">Add phone and bio so students trust you.</p>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1 -mb-px" aria-label="Dashboard sections">
            {(
              [
                ['listings', 'Listings'],
                ['enquiries', 'Enquiries'],
                ['bookings', 'Bookings'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                  tab === id
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'listings' && (
          <div>
            {properties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-600 text-sm mb-4">You haven&apos;t listed any properties yet.</p>
                <Link
                  to="/landlord/property/new"
                  className="inline-flex rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700"
                >
                  Add new listing
                </Link>
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
                          {p.status}
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
                        <div className="mt-auto flex gap-2">
                          <Link
                            to={`/landlord/property/edit/${p.id}`}
                            className="flex-1 text-center rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          <Link
                            to={`/properties/${p.slug}`}
                            className="flex-1 text-center rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
                          >
                            View
                          </Link>
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
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((row) => {
                      const msg = row.message ?? ''
                      const long = msg.length > ENQUIRY_TRUNC
                      const open = expandedEnquiryIds[row.id]
                      const shown = !long || open ? msg : `${msg.slice(0, ENQUIRY_TRUNC)}…`
                      const slug = row.properties?.slug
                      return (
                        <tr key={row.id} className="border-b border-gray-100 align-top">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{row.name?.trim() || '—'}</span>
                            <span className="block text-xs text-gray-500">{row.email?.trim() || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {slug ? (
                              <Link
                                to={`/properties/${slug}`}
                                onClick={() => onViewPropertyFromEnquiry(row)}
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
                            {long && (
                              <button
                                type="button"
                                onClick={() => toggleEnquiryExpand(row)}
                                className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                              >
                                {open ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(row.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${enquiryStatusClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {bookings.length === 0 ? (
              <p className="p-10 text-center text-sm text-gray-500">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Stay</th>
                      <th className="px-4 py-3">Rent / wk</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 align-top">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{studentDisplayFromBooking(b)}</span>
                          <span className="block text-xs text-gray-500">{b.student_profiles?.email ?? '—'}</span>
                          <span className="block text-xs text-gray-500">{b.student_profiles?.phone?.trim() || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{b.properties?.title ?? '—'}</span>
                          {b.properties?.suburb && (
                            <span className="block text-xs text-gray-500">{b.properties.suburb}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate(b.start_date)}
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
                          {b.status === 'pending' ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={bookingActionId === b.id}
                                onClick={() => void setBookingStatus(b.id, 'confirmed')}
                                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {bookingActionId === b.id ? '…' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                disabled={bookingActionId === b.id}
                                onClick={() => void setBookingStatus(b.id, 'cancelled')}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {bookingActionId === b.id ? '…' : 'Decline'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
