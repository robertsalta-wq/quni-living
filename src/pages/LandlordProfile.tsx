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

const AVATAR_BUCKET = 'landlord-avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

const LANDLORD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select landlord type' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
]

const AU_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
]

function splitFullName(full: string | null | undefined): [string, string] {
  if (!full?.trim()) return ['', '']
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return [parts[0], '']
  return [parts[0]!, parts.slice(1).join(' ')]
}

function initialsFrom(first: string, last: string, fullFallback: string | null, email: string | null | undefined) {
  const f = first.trim()
  const l = last.trim()
  if (f || l) {
    const a = f[0] ?? ''
    const b = l[0] ?? f[1] ?? ''
    return `${a}${b}`.toUpperCase() || '?'
  }
  const s = (fullFallback?.trim() || email?.split('@')[0] || '?').split(/\s+/)
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

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [abn, setAbn] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [suburb, setSuburb] = useState('')
  const [addressState, setAddressState] = useState('NSW')
  const [postcode, setPostcode] = useState('')
  const [landlordType, setLandlordType] = useState('')
  const [bio, setBio] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimerRef = useRef<number | null>(null)

  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const [fn, ln] = splitFullName(prof.full_name)
      setFirstName(prof.first_name ?? fn)
      setLastName(prof.last_name ?? ln)
      setPhone(prof.phone ?? '')
      setCompanyName(prof.company_name ?? '')
      setAbn(prof.abn ?? '')
      setAddressLine(prof.address ?? '')
      setSuburb(prof.suburb ?? '')
      setAddressState(prof.state?.trim() || 'NSW')
      setPostcode(prof.postcode ?? '')
      setLandlordType(prof.landlord_type ?? '')
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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    if (file.size > MAX_AVATAR_BYTES) {
      setPhotoError('Photo must be 2 MB or smaller.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }

    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg'
      const path = `${user.id}/avatar.${safeExt}`

      const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('landlord_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('user_id', user.id)
      if (dbErr) throw dbErr

      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setPhotoError(
        msg.includes('Bucket not found') || msg.includes('not found')
          ? 'Photo storage is not set up yet. Create a public bucket named "landlord-avatars" in Supabase Storage and run supabase/storage_landlord_avatars.sql.'
          : msg,
      )
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaveError(null)
    setSavedFlash(false)
    if (savedTimerRef.current != null) window.clearTimeout(savedTimerRef.current)
    setSaving(true)
    try {
      const combinedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
      const { error: uErr } = await supabase
        .from('landlord_profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: combinedName,
          phone: phone.trim() || null,
          company_name: companyName.trim() || null,
          abn: abn.trim() || null,
          address: addressLine.trim() || null,
          suburb: suburb.trim() || null,
          state: addressState.trim() || null,
          postcode: postcode.trim() || null,
          landlord_type: landlordType.trim() || null,
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

  const avatarUrl = profile.avatar_url

  return (
    <div className="max-w-site mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Landlord profile</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">Update your details and manage your listings.</p>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ll-first" className="block text-sm font-semibold text-gray-900 mb-1">
                First name
              </label>
              <input
                id="ll-first"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label htmlFor="ll-last" className="block text-sm font-semibold text-gray-900 mb-1">
                Last name
              </label>
              <input
                id="ll-last"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ll-email" className="block text-sm font-semibold text-gray-900 mb-1">
              Email
            </label>
            <input
              id="ll-email"
              type="email"
              readOnly
              value={displayEmail}
              className="w-full rounded-lg border border-gray-900/10 bg-gray-50 text-gray-600 px-3 py-2 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email can&apos;t be changed here.</p>
          </div>

          <div>
            <label htmlFor="ll-phone" className="block text-sm font-semibold text-gray-900 mb-1">
              Phone
            </label>
            <input
              id="ll-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label htmlFor="ll-company" className="block text-sm font-semibold text-gray-900 mb-1">
              Company name
            </label>
            <input
              id="ll-company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-500 mt-1">Optional — if you list under a business name.</p>
          </div>

          <div>
            <label htmlFor="ll-abn" className="block text-sm font-semibold text-gray-900 mb-1">
              ABN
            </label>
            <input
              id="ll-abn"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 12 345 678 901"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-500 mt-1">Australian Business Number, if applicable.</p>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-3">Address</p>
            <p className="text-xs text-gray-500 -mt-2 mb-3">
              Business or correspondence address (same format as property listings).
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="ll-address" className="block text-sm font-semibold text-gray-900 mb-1">
                  Street address
                </label>
                <input
                  id="ll-address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Unit / street number and name"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ll-suburb" className="block text-sm font-semibold text-gray-900 mb-1">
                    Suburb
                  </label>
                  <input
                    id="ll-suburb"
                    type="text"
                    autoComplete="address-level2"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label htmlFor="ll-postcode" className="block text-sm font-semibold text-gray-900 mb-1">
                    Postcode
                  </label>
                  <input
                    id="ll-postcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                    placeholder="e.g. 2000"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ll-state" className="block text-sm font-semibold text-gray-900 mb-1">
                  State
                </label>
                <select
                  id="ll-state"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className="w-full sm:max-w-xs rounded-lg border border-gray-900/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {AU_STATE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="ll-type" className="block text-sm font-semibold text-gray-900 mb-1">
              Landlord type
            </label>
            <select
              id="ll-type"
              value={landlordType}
              onChange={(e) => setLandlordType(e.target.value)}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {LANDLORD_TYPE_OPTIONS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Helps students understand who they&apos;re renting from.</p>
          </div>

          <div>
            <label htmlFor="ll-bio" className="block text-sm font-semibold text-gray-900 mb-1">
              Bio
            </label>
            <textarea
              id="ll-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y min-h-[6rem]"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-gray-900 mb-2">Profile photo</span>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-indigo-100 border border-gray-200 shrink-0">
                {avatarUrl ? (
                  <img key={avatarUrl} src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-800 text-xl font-semibold">
                    {initialsFrom(firstName, lastName, profile.full_name, displayEmail)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto min-h-[3rem] px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <span className="text-lg leading-none">+</span>
                  {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
                </button>
                <p className="text-xs text-gray-500 mt-2">Max: 2 MB</p>
                {photoError && <p className="text-xs text-red-600 mt-2">{photoError}</p>}
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

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-gray-900 text-white py-3 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
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
