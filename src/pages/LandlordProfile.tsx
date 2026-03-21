import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type PropertyPick = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'title' | 'slug' | 'rent_per_week' | 'room_type' | 'suburb' | 'images' | 'status' | 'featured'
>

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const s = (name?.trim() || email?.split('@')[0] || '?').split(/\s+/)
  return s
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function statusBadgeClass(status: PropertyPick['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-700'
    case 'pending':
      return 'bg-amber-100 text-amber-900'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function LandlordProfile() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<LandlordRow | null>(null)
  const [listings, setListings] = useState<PropertyPick[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimerRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoadError(null)
    setLoading(true)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) throw pErr
      const prof = profRaw as LandlordRow | null
      if (!prof) {
        setProfile(null)
        setListings([])
        setLoadError('No landlord profile found.')
        return
      }

      setProfile(prof)
      setFullName(prof.full_name ?? '')
      setPhone(prof.phone ?? '')
      setBio(prof.bio ?? '')

      const { data: props, error: lErr } = await supabase
        .from('properties')
        .select('id, title, slug, rent_per_week, room_type, suburb, images, status, featured')
        .eq('landlord_id', prof.id)
        .order('created_at', { ascending: false })

      if (lErr) throw lErr
      setListings((props ?? []) as PropertyPick[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      setLoadError(msg)
      setProfile(null)
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current != null) window.clearTimeout(savedTimerRef.current)
    }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaveError(null)
    setSavedFlash(false)
    if (savedTimerRef.current != null) window.clearTimeout(savedTimerRef.current)
    setSaving(true)
    try {
      const { error: uErr } = await supabase
        .from('landlord_profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('user_id', user.id)

      if (uErr) throw uErr

      setSavedFlash(true)
      savedTimerRef.current = window.setTimeout(() => {
        setSavedFlash(false)
        savedTimerRef.current = null
      }, 3000)
      await load()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const displayEmail = profile?.email ?? user?.email ?? ''

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !profile) {
    return (
      <div className="max-w-site mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Landlord profile</h1>
        <p className="text-red-600 text-sm mt-4">{loadError ?? 'Profile unavailable.'}</p>
        <Link to="/landlord-dashboard" className="text-indigo-600 text-sm font-medium mt-4 inline-block">
          Go to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-site mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Landlord profile</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">Update your details and manage your listings.</p>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div
              className="h-24 w-24 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-2xl font-semibold shrink-0"
              aria-hidden
            >
              {initialsFrom(fullName || profile.full_name, displayEmail)}
            </div>
            <div className="flex-1 space-y-4 w-full min-w-0">
              <div>
                <label htmlFor="ll-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full name
                </label>
                <input
                  id="ll-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label htmlFor="ll-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="ll-email"
                  type="email"
                  readOnly
                  value={displayEmail}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 text-gray-500 px-3 py-2 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email can&apos;t be changed here.</p>
              </div>
              <div>
                <label htmlFor="ll-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="ll-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label htmlFor="ll-bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="ll-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y min-h-[6rem]"
                />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</div>
          )}
          {savedFlash && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Profile saved
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
          <Link
            to="/landlord-dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 w-fit"
          >
            Add new listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
            <p className="text-gray-600 text-sm font-medium">No listings yet</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              Create your first property from the dashboard to show it here.
            </p>
            <Link
              to="/landlord-dashboard"
              className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Go to landlord dashboard
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {listings.map((p) => {
              const thumb = p.images?.[0]
              const rent = Number(p.rent_per_week)
              return (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
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
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        {p.suburb && <p className="text-sm text-gray-500 mt-0.5">{p.suburb}</p>}
                        <p className="text-base font-semibold text-gray-900 mt-1">
                          ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          <span className="text-sm font-normal text-gray-500"> /wk</span>
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${statusBadgeClass(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-auto pt-4 flex flex-wrap gap-3">
                      <Link
                        to={`/properties/${p.slug}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
