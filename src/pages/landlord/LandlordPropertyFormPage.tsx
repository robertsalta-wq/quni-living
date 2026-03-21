import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import { generatePropertySlug } from '../../lib/generatePropertySlug'
import { ROOM_TYPE_LABELS, type RoomType } from '../../lib/listings'

type UniversityRow = Database['public']['Tables']['universities']['Row']
type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
type CampusRow = Database['public']['Tables']['campuses']['Row']
type FeatureRow = Database['public']['Tables']['features']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

type PropertyWithFeatures = PropertyRow & {
  property_features: { feature_id: string }[] | null
}

const LISTING_OPTIONS = [
  { value: 'rent' as const, label: 'Rent' },
  { value: 'homestay' as const, label: 'Homestay' },
  { value: 'student_house' as const, label: 'Student House' },
]

const LEASE_OPTIONS = ['Flexible', '6 months', '12 months', '2 years'] as const

const ROOM_ENTRIES = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]

const MAX_IMAGES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024
const BUCKET = 'property-images'

function pathFromPropertyImageUrl(url: string): string | null {
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

function sectionClass(title: string, children: ReactNode) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function LandlordPropertyFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, role } = useAuthContext()

  const propertyId = useMemo(() => {
    const m = matchPath({ path: '/landlord/property/edit/:id', end: true }, location.pathname)
    return m?.params.id ?? null
  }, [location.pathname])
  const isEdit = Boolean(propertyId)

  const landlordProfile = role === 'landlord' && profile ? (profile as LandlordProfileRow) : null

  const [pageError, setPageError] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [universities, setUniversities] = useState<UniversityRow[]>([])
  const [campuses, setCampuses] = useState<CampusRow[]>([])
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [landlordOptions, setLandlordOptions] = useState<{ id: string; label: string }[]>([])
  const [existingSlug, setExistingSlug] = useState<string | null>(null)

  const [adminLandlordId, setAdminLandlordId] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<'rent' | 'homestay' | 'student_house' | ''>('rent')

  const [bedrooms, setBedrooms] = useState('1')
  const [bathrooms, setBathrooms] = useState('1')
  const [roomType, setRoomType] = useState<RoomType | ''>('single')
  const [furnished, setFurnished] = useState(false)
  const [linenSupplied, setLinenSupplied] = useState(false)
  const [weeklyCleaning, setWeeklyCleaning] = useState(false)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set())

  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('NSW')
  const [postcode, setPostcode] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [campusId, setCampusId] = useState('')

  const [rentPerWeek, setRentPerWeek] = useState('')
  const [bond, setBond] = useState('')
  const [leaseLength, setLeaseLength] = useState<string>('Flexible')
  const [availableFrom, setAvailableFrom] = useState('')

  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const toggleFeature = useCallback((id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const loadCampuses = useCallback(async (uid: string) => {
    if (!uid) {
      setCampuses([])
      return
    }
    const { data, error } = await supabase
      .from('campuses')
      .select('id, name, university_id, address')
      .eq('university_id', uid)
      .order('name')
    if (error) {
      setCampuses([])
      return
    }
    setCampuses((data ?? []) as CampusRow[])
  }, [])

  useEffect(() => {
    void loadCampuses(universityId)
    if (!universityId) setCampusId('')
  }, [universityId, loadCampuses])

  const loadPage = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoadingPage(false)
      return
    }
    setPageError(null)
    setLoadingPage(true)
    try {
      const [uniRes, featRes] = await Promise.all([
        supabase.from('universities').select('id, name, slug, city, state').order('name'),
        supabase.from('features').select('id, name, icon').order('name'),
      ])
      if (uniRes.error) throw uniRes.error
      if (featRes.error) throw featRes.error
      setUniversities((uniRes.data ?? []) as UniversityRow[])
      setFeatures((featRes.data ?? []) as FeatureRow[])

      if (role === 'admin') {
        const { data: ll, error: llErr } = await supabase
          .from('landlord_profiles')
          .select('id, full_name, email, first_name, last_name')
          .order('full_name')
        if (llErr) throw llErr
        const opts =
          (ll ?? []).map((r) => {
            const row = r as Pick<
              LandlordProfileRow,
              'id' | 'full_name' | 'email' | 'first_name' | 'last_name'
            >
            const name =
              [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
              row.full_name?.trim() ||
              row.email ||
              row.id
            return { id: row.id, label: name }
          }) ?? []
        setLandlordOptions(opts)
      }

      if (isEdit && propertyId && role === 'landlord' && !landlordProfile) {
        setLoadingPage(false)
        return
      }

      if (isEdit && propertyId) {
        const { data: propRaw, error: pErr } = await supabase
          .from('properties')
          .select(`*, property_features ( feature_id )`)
          .eq('id', propertyId)
          .single()
        if (pErr) throw pErr
        const prop = propRaw as PropertyWithFeatures

        const canEdit =
          role === 'admin' ||
          (landlordProfile && prop.landlord_id === landlordProfile.id)
        if (!canEdit) {
          setPageError('You do not have permission to edit this listing.')
          setLoadingPage(false)
          return
        }

        setExistingSlug(prop.slug)
        setTitle(prop.title)
        setDescription(prop.description ?? '')
        setListingType(prop.listing_type ?? 'rent')
        setBedrooms(prop.bedrooms != null ? String(prop.bedrooms) : '1')
        setBathrooms(prop.bathrooms != null ? String(prop.bathrooms) : '1')
        setRoomType(prop.room_type ?? 'single')
        setFurnished(Boolean(prop.furnished))
        setLinenSupplied(Boolean(prop.linen_supplied))
        setWeeklyCleaning(Boolean(prop.weekly_cleaning_service))
        setAddress(prop.address ?? '')
        setSuburb(prop.suburb ?? '')
        setState(prop.state ?? 'NSW')
        setPostcode(prop.postcode ?? '')
        setUniversityId(prop.university_id ?? '')
        setCampusId(prop.campus_id ?? '')
        setRentPerWeek(String(prop.rent_per_week ?? ''))
        setBond(prop.bond != null ? String(prop.bond) : '')
        setLeaseLength(prop.lease_length ?? 'Flexible')
        setAvailableFrom(prop.available_from ? prop.available_from.slice(0, 10) : '')
        setImages(Array.isArray(prop.images) ? [...prop.images] : [])
        const pf = prop.property_features
        setSelectedFeatureIds(new Set((pf ?? []).map((x) => x.feature_id)))
        if (prop.university_id) await loadCampuses(prop.university_id)
      }
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Could not load form.')
    } finally {
      setLoadingPage(false)
    }
  }, [user?.id, isEdit, propertyId, role, landlordProfile?.id, loadCampuses])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const removeImage = useCallback(
    async (url: string) => {
      setImages((prev) => prev.filter((u) => u !== url))
      if (user?.id) {
        const path = pathFromPropertyImageUrl(url)
        if (path && path.startsWith(`${user.id}/`)) {
          await supabase.storage.from(BUCKET).remove([path])
        }
      }
    },
    [user?.id],
  )

  const onPickImages = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !user?.id) return
      setUploadingImage(true)
      setSubmitError(null)
      try {
        const next = [...images]
        for (let i = 0; i < files.length; i++) {
          if (next.length >= MAX_IMAGES) break
          const file = files[i]
          if (file.size > MAX_FILE_BYTES) {
            setSubmitError(`Each image must be at most 5MB (${file.name} is too large).`)
            continue
          }
          if (!file.type.startsWith('image/')) continue
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg'
          const objectPath = `${user.id}/${crypto.randomUUID()}.${safeExt}`
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false,
          })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
          next.push(pub.publicUrl)
        }
        setImages(next)
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Upload failed.')
      } finally {
        setUploadingImage(false)
      }
    },
    [user?.id, images],
  )

  async function savePropertyFeatures(pid: string, ids: string[]) {
    const { error: delErr } = await supabase.from('property_features').delete().eq('property_id', pid)
    if (delErr) throw delErr
    if (ids.length === 0) return
    const { error: insErr } = await supabase
      .from('property_features')
      .insert(ids.map((feature_id) => ({ property_id: pid, feature_id })))
    if (insErr) throw insErr
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!user?.id) return

    const t = title.trim()
    if (!t) {
      setSubmitError('Title is required.')
      return
    }
    const rent = Number(rentPerWeek)
    if (!Number.isFinite(rent) || rent <= 0) {
      setSubmitError('Rent per week must be a positive number.')
      return
    }

    let landlordId: string | null = landlordProfile?.id ?? null
    if (role === 'admin') {
      if (isEdit && propertyId) {
        const { data: existing } = await supabase.from('properties').select('landlord_id').eq('id', propertyId).single()
        landlordId = (existing as { landlord_id: string | null } | null)?.landlord_id ?? null
      } else {
        landlordId = adminLandlordId.trim() || null
        if (!landlordId) {
          setSubmitError('Select a landlord for this listing.')
          return
        }
      }
    }

    if (!landlordId) {
      setSubmitError('Landlord profile is missing. Complete landlord onboarding first.')
      return
    }

    const featureIds = [...selectedFeatureIds]

    const baseFields: PropertyUpdate = {
      title: t,
      description: description.trim() || null,
      listing_type: listingType || null,
      bedrooms: Math.max(0, parseInt(bedrooms, 10) || 0),
      bathrooms: Math.max(0, parseInt(bathrooms, 10) || 0),
      room_type: roomType || null,
      furnished,
      linen_supplied: linenSupplied,
      weekly_cleaning_service: weeklyCleaning,
      address: address.trim() || null,
      suburb: suburb.trim() || null,
      state: state.trim() || 'NSW',
      postcode: postcode.trim() || null,
      university_id: universityId || null,
      campus_id: campusId || null,
      rent_per_week: rent,
      bond: bond.trim() ? Number(bond) : null,
      lease_length: leaseLength || null,
      available_from: availableFrom.trim() || null,
      images: images.length ? images : null,
    }

    setSubmitting(true)
    try {
      if (isEdit && propertyId) {
        const { error: upErr } = await supabase.from('properties').update(baseFields).eq('id', propertyId)
        if (upErr) throw upErr
        await savePropertyFeatures(propertyId, featureIds)
        const slug = existingSlug ?? generatePropertySlug(t)
        navigate(`/properties/${slug}`, { replace: true })
      } else {
        const slug = generatePropertySlug(t)
        const { data: inserted, error: insErr } = await supabase
          .from('properties')
          .insert({
            ...baseFields,
            title: t,
            slug,
            landlord_id: landlordId,
            status: 'active',
            featured: false,
          } as PropertyInsert)
          .select('id')
          .single()
        if (insErr) throw insErr
        const newId = (inserted as { id: string }).id
        await savePropertyFeatures(newId, featureIds)
        navigate('/landlord-dashboard', { replace: true })
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-sm text-gray-600">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loadingPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <p className="text-red-700 text-sm">{pageError}</p>
        <Link to="/landlord-dashboard" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (role === 'landlord' && !landlordProfile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-sm text-gray-600">
        <Link to="/landlord-profile" className="text-indigo-600 font-medium">
          Complete your landlord profile
        </Link>{' '}
        before creating a listing.
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 pb-16">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            to="/landlord-dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            ← Landlord dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEdit ? 'Edit listing' : 'New listing'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Update your property details and photos.' : 'Create a new property on Quni.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {role === 'admin' && !isEdit && (
            <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Listing owner</h2>
              <label htmlFor="admin-landlord" className={labelClass}>
                Landlord <span className="text-red-500">*</span>
              </label>
              <select
                id="admin-landlord"
                required
                value={adminLandlordId}
                onChange={(e) => setAdminLandlordId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select landlord…</option>
                {landlordOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </section>
          )}

          {sectionClass(
            'Basic information',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-title" className={labelClass}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="pf-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-desc" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="pf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-listing" className={labelClass}>
                  Listing type
                </label>
                <select
                  id="pf-listing"
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value as typeof listingType)}
                  className={inputClass}
                >
                  {LISTING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>,
          )}

          {sectionClass(
            'Property details',
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-bed" className={labelClass}>
                    Bedrooms
                  </label>
                  <input
                    id="pf-bed"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pf-bath" className={labelClass}>
                    Bathrooms
                  </label>
                  <input
                    id="pf-bath"
                    type="number"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pf-room" className={labelClass}>
                  Room type
                </label>
                <select
                  id="pf-room"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as RoomType)}
                  className={inputClass}
                >
                  {ROOM_ENTRIES.map(([v, lab]) => (
                    <option key={v} value={v}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={furnished}
                    onChange={(e) => setFurnished(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Fully furnished
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={linenSupplied}
                    onChange={(e) => setLinenSupplied(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Linen supplied
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={weeklyCleaning}
                    onChange={(e) => setWeeklyCleaning(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Weekly cleaning service
                </label>
              </div>
              <div>
                <p className={`${labelClass} mb-2`}>Property features</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                  {features.map((f) => (
                    <label key={f.id} className="inline-flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedFeatureIds.has(f.id)}
                        onChange={() => toggleFeature(f.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {f.name}
                    </label>
                  ))}
                  {features.length === 0 && (
                    <p className="text-xs text-gray-500 col-span-2">No features in database.</p>
                  )}
                </div>
              </div>
            </div>,
          )}

          {sectionClass(
            'Location',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-addr" className={labelClass}>
                  Address
                </label>
                <input id="pf-addr" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-suburb" className={labelClass}>
                    Suburb
                  </label>
                  <input id="pf-suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="pf-state" className={labelClass}>
                    State
                  </label>
                  <input id="pf-state" value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="pf-pc" className={labelClass}>
                  Postcode
                </label>
                <input id="pf-pc" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="pf-uni" className={labelClass}>
                  University
                </label>
                <select
                  id="pf-uni"
                  value={universityId}
                  onChange={(e) => {
                    setUniversityId(e.target.value)
                    setCampusId('')
                  }}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-campus" className={labelClass}>
                  Campus
                </label>
                <select
                  id="pf-campus"
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  disabled={!universityId}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>,
          )}

          {sectionClass(
            'Pricing & availability',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-rent" className={labelClass}>
                  Rent per week ($) <span className="text-red-500">*</span>
                </label>
                <input
                  id="pf-rent"
                  type="number"
                  min={1}
                  step={1}
                  value={rentPerWeek}
                  onChange={(e) => setRentPerWeek(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-bond" className={labelClass}>
                  Bond ($)
                </label>
                <input
                  id="pf-bond"
                  type="number"
                  min={0}
                  step={1}
                  value={bond}
                  onChange={(e) => setBond(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-lease" className={labelClass}>
                  Lease length
                </label>
                <select
                  id="pf-lease"
                  value={leaseLength}
                  onChange={(e) => setLeaseLength(e.target.value)}
                  className={inputClass}
                >
                  {LEASE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-from" className={labelClass}>
                  Available from
                </label>
                <input
                  id="pf-from"
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>,
          )}

          {sectionClass(
            'Property photos',
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Up to {MAX_IMAGES} images, max 5MB each. Public bucket: {BUCKET}</p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImage || images.length >= MAX_IMAGES}
                onChange={(e) => void onPickImages(e.target.files)}
                className="block text-sm text-gray-600"
              />
              {uploadingImage && <p className="text-xs text-gray-500">Uploading…</p>}
              <div className="flex flex-wrap gap-3">
                {images.map((url) => (
                  <div key={url} className="relative group w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => void removeImage(url)}
                      className="absolute inset-0 bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>,
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
            </button>
            <Link
              to="/landlord-dashboard"
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
