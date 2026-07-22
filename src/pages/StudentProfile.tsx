import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isRenterRole } from '../lib/authProfile'
import { getValidAccessTokenForFunctions } from '../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../lib/readSupabaseFunctionInvokeError'
import { removeAllStudentVerificationDocuments } from '../lib/studentDocumentsStorage'
import type { Database } from '../lib/database.types'
import { RenterProfileSetup } from '../components/student/profile/RenterProfileSetup'
import { StudentDeleteAccountModal } from '../components/student/StudentDeleteAccountModal'
import { RenterDashboardTabShell } from '../components/student/RenterDashboardPageHeader'
import { firstPropertyImageUrl } from '../lib/propertyImages'
import { renterEditBtnClass, renterSecondaryBtnClass, renterWriteErrorClass } from '../lib/renterProfileFormClasses'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type BookingMessageRow = Database['public']['Tables']['booking_messages']['Row']

type BookingWithProperty = {
  id: string
  start_date: string
  end_date: string | null
  weekly_rent: number | null
  status: Database['public']['Tables']['bookings']['Row']['status']
  notes: string | null
  created_at: string
  property: {
    id: string
    title: string
    slug: string
    rent_per_week: number
    suburb: string | null
    images: string[] | null
  } | null
  booking_messages?: BookingMessageRow[] | null
}

function bookingStatusClass(status: BookingWithProperty['status']) {
  switch (status) {
    case 'confirmed':
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
    case 'pending_payment':
    case 'pending_confirmation':
      return 'bg-amber-100 text-amber-900'
    case 'awaiting_info':
      return 'bg-sky-100 text-sky-900'
    case 'cancelled':
      return 'bg-gray-100 text-gray-700'
    case 'completed':
      return 'bg-indigo-100 text-indigo-800'
    case 'declined':
    case 'expired':
    case 'payment_failed':
      return 'bg-red-50 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

type StudentTab = 'profile' | 'bookings'

export default function StudentProfile() {
  const { user, profile: authProfile, role, signOut } = useAuthContext()
  const authStudent =
    isRenterRole(role) && authProfile && 'id' in authProfile ? (authProfile as StudentRow) : null
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<StudentTab>(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (t === 'bookings') return t
    } catch {
      /* ignore */
    }
    return 'profile'
  })
  const [profile, setProfile] = useState<StudentRow | null>(authStudent)
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !authStudent)

  const [bookingReplyById, setBookingReplyById] = useState<Record<string, string>>({})
  const [bookingReplyBusy, setBookingReplyBusy] = useState<string | null>(null)

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false)
  const [dangerZoneVisible, setDangerZoneVisible] = useState(false)
  const dangerZoneRef = useRef<HTMLElement>(null)

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!user?.id) return
    const background = opts?.background === true
    setLoadError(null)
    if (!background) setLoading(true)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) throw pErr
      const prof = profRaw as StudentRow | null
      if (!prof) {
        setProfile(null)
        setLoadError('No student profile found.')
        return
      }

      setProfile(prof)

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      if (background) {
        console.error('Background profile refresh failed', e)
      } else {
        setLoadError(msg)
        setProfile(null)
      }
    } finally {
      if (!background) setLoading(false)
    }
  }, [user?.id])

  const refreshProfileData = useCallback(() => load({ background: true }), [load])

  useEffect(() => {
    if (authStudent) setProfile(authStudent)
  }, [authStudent])

  useEffect(() => {
    void load({ background: Boolean(authStudent) })
  }, [load, authStudent])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'bookings') setActiveTab('bookings')
    else setActiveTab('profile')
  }, [searchParams])

  useEffect(() => {
    if (activeTab !== 'bookings' || !profile?.id) return
    let cancelled = false
    ;(async () => {
      setBookingsLoading(true)
      setBookingsError(null)
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            id,
            start_date,
            end_date,
            weekly_rent,
            status,
            notes,
            created_at,
            property:properties ( id, title, slug, rent_per_week, suburb, images ),
            booking_messages ( id, sender_role, message, created_at, sender_id )
          `,
          )
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (!cancelled) {
          const rows = (data ?? []).map((raw) => {
            const r = raw as BookingWithProperty & { booking_messages?: BookingMessageRow[] | null }
            const msgs = [...(r.booking_messages ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )
            return { ...r, booking_messages: msgs }
          })
          setBookings(rows)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setBookingsError(e instanceof Error ? e.message : 'Could not load bookings.')
          setBookings([])
        }
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, profile?.id])

  async function handleDeleteAccount() {
    if (!user?.id) return
    setDeleteAccountError(null)
    setDeleteAccountBusy(true)
    try {
      try {
        await removeAllStudentVerificationDocuments(supabase, user.id)
      } catch (e) {
        console.error('Student verification documents cleanup failed before account delete', e)
      }
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setDeleteAccountError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'delete-student-account',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setDeleteAccountError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setDeleteAccountError(String(data.error))
        return
      }
      await signOut()
    } finally {
      setDeleteAccountBusy(false)
    }
  }

  if (loading) {
    return (
      <RenterDashboardTabShell activeTab={activeTab === 'bookings' ? 'bookings' : 'profile'}>
        <div className="flex flex-1 items-center justify-center min-h-[40vh]">
          <div
            className="h-10 w-10 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--quni-coral)', borderTopColor: 'transparent' }}
          />
        </div>
      </RenterDashboardTabShell>
    )
  }

  if (loadError || !profile) {
    return (
      <RenterDashboardTabShell activeTab={activeTab === 'bookings' ? 'bookings' : 'profile'}>
        <p className={renterWriteErrorClass}>{loadError ?? 'Profile unavailable.'}</p>
        <Link to="/student-dashboard" className={`${renterEditBtnClass} mt-4`}>
          Go to dashboard
        </Link>
      </RenterDashboardTabShell>
    )
  }

  if (activeTab === 'bookings') {
    return (
      <RenterDashboardTabShell activeTab="bookings">
        <section className="w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your bookings</h2>
            <p className="text-sm text-gray-500 mb-6">Properties you&apos;ve booked or applied for.</p>

            {bookingsLoading && (
              <div className="flex justify-center py-12">
                <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!bookingsLoading && bookingsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bookingsError}</div>
            )}

            {!bookingsLoading && !bookingsError && bookings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
                <p className="text-gray-600 text-sm font-medium">No bookings yet</p>
                <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                  When you book a place, it will show up here.
                </p>
                <Link
                  to="/listings"
                  className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Browse listings
                </Link>
              </div>
            )}

            {!bookingsLoading && !bookingsError && bookings.length > 0 && (
              <ul className="space-y-4">
                {bookings.map((b) => {
                  const p = b.property
                  const thumb = firstPropertyImageUrl(p?.images ?? null)
                  const rent = b.weekly_rent ?? p?.rent_per_week
                  return (
                    <li
                      key={b.id}
                      className="quni-card flex flex-col gap-4 overflow-hidden sm:flex-row"
                    >
                      <div className="sm:w-40 h-36 sm:h-auto shrink-0 bg-gray-100">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4 sm:py-4 sm:pr-4 flex flex-col min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {p?.title ?? 'Listing unavailable'}
                            </h3>
                            {p?.suburb && <p className="text-sm text-gray-500 mt-0.5">{p.suburb}</p>}
                            <p className="text-sm text-gray-600 mt-2">
                              {b.start_date}
                              {b.end_date ? ` → ${b.end_date}` : ''}
                            </p>
                            {rent != null && (
                              <p className="text-base font-semibold text-gray-900 mt-1">
                                ${Number(rent).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-sm font-normal text-gray-500"> /wk</span>
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${bookingStatusClass(b.status)}`}
                          >
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {b.booking_messages && b.booking_messages.length > 0 && (
                          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Messages</p>
                            <ul className="space-y-2 max-h-48 overflow-y-auto">
                              {b.booking_messages.map((m) => (
                                <li
                                  key={m.id}
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    m.sender_role === 'landlord' ? 'bg-sky-50 text-gray-800' : 'bg-gray-50 text-gray-800'
                                  }`}
                                >
                                  <span className="text-xs font-semibold text-gray-500">
                                    {m.sender_role === 'landlord' ? 'Host' : 'You'} ·{' '}
                                    {new Date(m.created_at).toLocaleString('en-AU', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                  <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {b.status === 'awaiting_info' && (
                          <div className="mt-4 border-t border-gray-100 pt-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={`reply-${b.id}`}>
                              Your reply
                            </label>
                            <textarea
                              id={`reply-${b.id}`}
                              rows={3}
                              value={bookingReplyById[b.id] ?? ''}
                              onChange={(e) =>
                                setBookingReplyById((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                              placeholder="Reply to your host…"
                            />
                            <button
                              type="button"
                              disabled={bookingReplyBusy === b.id || !(bookingReplyById[b.id] ?? '').trim()}
                              onClick={async () => {
                                const text = (bookingReplyById[b.id] ?? '').trim()
                                if (!text || !user?.id) return
                                setBookingReplyBusy(b.id)
                                try {
                                  const { data: sess } = await supabase.auth.getSession()
                                  const uid = sess.session?.user?.id
                                  if (!uid) throw new Error('Sign in required.')
                                  const { error: insErr } = await supabase.from('booking_messages').insert({
                                    booking_id: b.id,
                                    sender_id: uid,
                                    sender_role: 'student',
                                    message: text,
                                  })
                                  if (insErr) throw insErr
                                  setBookingReplyById((prev) => ({ ...prev, [b.id]: '' }))
                                  const { data: fresh } = await supabase
                                    .from('bookings')
                                    .select(
                                      `
                                    id,
                                    start_date,
                                    end_date,
                                    weekly_rent,
                                    status,
                                    notes,
                                    created_at,
                                    property:properties ( id, title, slug, rent_per_week, suburb, images ),
                                    booking_messages ( id, sender_role, message, created_at, sender_id )
                                  `,
                                    )
                                    .eq('id', b.id)
                                    .maybeSingle()
                                  if (fresh) {
                                    const r = fresh as BookingWithProperty & {
                                      booking_messages?: BookingMessageRow[] | null
                                    }
                                    const msgs = [...(r.booking_messages ?? [])].sort(
                                      (a, c) =>
                                        new Date(a.created_at).getTime() - new Date(c.created_at).getTime(),
                                    )
                                    setBookings((prev) =>
                                      prev.map((row) =>
                                        row.id === b.id ? { ...row, booking_messages: msgs, status: r.status } : row,
                                      ),
                                    )
                                  }
                                } catch (err) {
                                  setBookingsError(err instanceof Error ? err.message : 'Could not send reply.')
                                } finally {
                                  setBookingReplyBusy(null)
                                }
                              }}
                              className="mt-2 rounded-lg bg-[var(--quni-coral)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-50"
                            >
                              {bookingReplyBusy === b.id ? 'Sending…' : 'Send reply'}
                            </button>
                          </div>
                        )}
                        <div className="mt-auto pt-4">
                          {p?.slug && (
                            <Link
                              to={`/properties/${p.slug}`}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              View listing
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
      </RenterDashboardTabShell>
    )
  }

  return (
    <RenterDashboardTabShell activeTab="profile">
      {user?.id ? (
        <RenterProfileSetup
          profile={profile}
          userId={user.id}
          displayEmail={user.email ?? profile.email ?? ''}
          onRefresh={refreshProfileData}
          onProfilePatch={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
        >
          <button
            type="button"
            id="toggle-student-danger-zone"
            aria-expanded={dangerZoneVisible}
            aria-controls="student-profile-danger-zone"
            onClick={() => {
              setDangerZoneVisible((prev) => {
                const next = !prev
                if (next) {
                  window.setTimeout(() => {
                    dangerZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }, 0)
                }
                return next
              })
            }}
            className={`${renterEditBtnClass} w-full justify-center`}
          >
            {dangerZoneVisible ? 'Hide account deletion' : 'Delete my account'}
          </button>

          {dangerZoneVisible ? (
            <section
              ref={dangerZoneRef}
              id="student-profile-danger-zone"
              className="quni-card overflow-hidden font-sans"
              style={{ padding: '20px' }}
              aria-labelledby="danger-zone-heading"
            >
              <h2
                id="danger-zone-heading"
                className="text-[var(--text-body-size)] font-semibold tracking-[-0.01em] text-[var(--quni-ink)]"
              >
                Danger zone
              </h2>
              <p style={{ marginTop: 8, fontSize: 'var(--text-body-sm-size)', color: 'var(--quni-ink-3)' }}>
                Permanently delete your student account and all verification documents stored for your profile.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteAccountError(null)
                  setDeleteAccountOpen(true)
                }}
                className={`${renterSecondaryBtnClass} mt-4 w-auto border-[var(--quni-danger-bg)] text-[var(--quni-danger-fg)]`}
              >
                Delete account
              </button>
            </section>
          ) : null}
        </RenterProfileSetup>
      ) : null}

      <StudentDeleteAccountModal
        open={deleteAccountOpen}
        onClose={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
        onDelete={handleDeleteAccount}
        deleting={deleteAccountBusy}
        error={deleteAccountError}
      />
    </RenterDashboardTabShell>
  )
}
