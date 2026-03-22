import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import PropertyEnquiryForm from '../components/PropertyEnquiryForm'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS, ROOM_TYPE_SHORT_LABELS } from '../lib/listings'

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
      <dt className="font-medium text-gray-800 shrink-0">{label}</dt>
      <dd className="text-gray-600">{children}</dd>
    </div>
  )
}

export default function PropertyDetail() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = slugParam?.trim() ?? ''
  const shouldFetch = Boolean(slug) && isSupabaseConfigured

  const { user, profile, role } = useAuthContext()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const enquirySuccessCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeEnquiryModal = useCallback(() => {
    if (enquirySuccessCloseTimerRef.current) {
      clearTimeout(enquirySuccessCloseTimerRef.current)
      enquirySuccessCloseTimerRef.current = null
    }
    setEnquiryModalOpen(false)
  }, [])

  const openEnquiryModal = useCallback(() => {
    if (enquirySuccessCloseTimerRef.current) {
      clearTimeout(enquirySuccessCloseTimerRef.current)
      enquirySuccessCloseTimerRef.current = null
    }
    setEnquiryModalOpen(true)
  }, [])

  const handleEnquirySuccess = useCallback(() => {
    enquirySuccessCloseTimerRef.current = window.setTimeout(() => {
      enquirySuccessCloseTimerRef.current = null
      closeEnquiryModal()
    }, 2000)
  }, [closeEnquiryModal])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeEnquiryModal()
    }
    if (enquiryModalOpen) {
      document.addEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [enquiryModalOpen, closeEnquiryModal])

  useEffect(() => {
    if (!shouldFetch) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select(
          `
            *,
            landlord_profiles ( id, full_name, avatar_url, verified ),
            universities ( id, name, slug ),
            campuses ( id, name ),
            property_features ( features ( id, name, icon ) )
          `,
        )
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()

      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
        setProperty(null)
      } else if (!data) {
        setError(null)
        setProperty(null)
      } else {
        setProperty(data as Property)
        setImageIndex(0)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [slug, shouldFetch])

  const amenityNames = useMemo(() => {
    const rows = property?.property_features ?? []
    const names = rows
      .map((pf) => pf?.features?.name)
      .filter((n): n is string => Boolean(n?.trim()))
    return [...new Set(names)].sort((a, b) => a.localeCompare(b))
  }, [property?.property_features])

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-gray-600 text-sm">Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.</p>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-red-600 text-sm">Invalid property link.</p>
        <Link to="/listings" className="text-indigo-600 text-sm font-medium mt-4 inline-block">
          Back to listings
        </Link>
      </div>
    )
  }

  if (loading && shouldFetch) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <Link to="/listings" className="text-indigo-600 text-sm font-medium">
          Back to listings
        </Link>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-xl font-semibold text-gray-900">Listing not found</h1>
        <p className="text-gray-600 text-sm mt-2">
          This property may have been removed or isn&apos;t available anymore.
        </p>
        <Link
          to="/listings"
          className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Browse listings
        </Link>
      </div>
    )
  }

  const images = (property.images ?? []).filter(Boolean)
  const mainImage = images[imageIndex] ?? null
  const landlord = property.landlord_profiles
  const roomLabel =
    property.room_type && isRoomType(property.room_type)
      ? ROOM_TYPE_LABELS[property.room_type]
      : null
  const roomShort =
    property.room_type && isRoomType(property.room_type)
      ? ROOM_TYPE_SHORT_LABELS[property.room_type]
      : null
  const locationParts = [property.address, property.suburb, property.state, property.postcode].filter(Boolean)
  const locationLine = locationParts.join(', ')
  const addressDisplay = locationLine ? `${locationLine}, Australia` : null

  const campusDisplay =
    property.universities && property.campuses?.name
      ? `${property.universities.name} – ${property.campuses.name}`
      : property.universities?.name ?? property.campuses?.name ?? null

  const rent = Number(property.rent_per_week)
  const beds = property.bedrooms ?? 1
  const baths = property.bathrooms ?? 1

  const keyFeatures: { label: string; on: boolean }[] = [
    { label: 'Fully furnished', on: Boolean(property.furnished) },
    { label: 'Linen supplied', on: Boolean(property.linen_supplied) },
    { label: 'Weekly cleaning', on: Boolean(property.weekly_cleaning_service) },
  ]
  const activeKeyFeatures = keyFeatures.filter((f) => f.on)

  const availableFormatted = property.available_from
    ? new Date(property.available_from).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const bookHref = user ? `/booking?slug=${encodeURIComponent(slug)}` : '/login'
  const bookState = user ? undefined : { from: { pathname: `/properties/${slug}` } }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 pb-16">
      <div className="bg-[#7a8f7a] text-white">
        <div className="max-w-site mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <nav className="text-xs text-white/80 mb-3">
            <Link to="/listings" className="hover:text-white">
              Listings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white/95">{property.title}</span>
          </nav>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{property.title}</h1>
            <ul className="flex flex-wrap gap-6 sm:gap-8 text-sm text-white/95">
              <li className="flex items-center gap-2">
                <span className="text-white/70" aria-hidden>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </span>
                <span>
                  {beds} bedroom{beds !== 1 ? 's' : ''}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white/70" aria-hidden>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M10 5v7m4-7v7M5 21V10a1 1 0 011-1h12a1 1 0 011 1v11"
                    />
                  </svg>
                </span>
                <span>
                  {baths} bathroom{baths !== 1 ? 's' : ''}
                </span>
              </li>
              {roomShort && (
                <li className="flex items-center gap-2">
                  <span className="text-white/70" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 6h16M4 10h16M4 14h10"
                      />
                    </svg>
                  </span>
                  <span>{roomShort}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl overflow-hidden bg-gray-200 aspect-[16/10]">
              {mainImage ? (
                <img src={mainImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === imageIndex ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">At a glance</h2>
              <dl className="space-y-3">
                {property.bond != null && Number(property.bond) > 0 && (
                  <MetaRow label="Bond:">${Number(property.bond).toLocaleString()}</MetaRow>
                )}
                {property.lease_length?.trim() && <MetaRow label="Lease:">{property.lease_length.trim()}</MetaRow>}
                {availableFormatted && <MetaRow label="Available from:">{availableFormatted}</MetaRow>}
                <MetaRow label="Name:">{landlord?.full_name?.trim() || 'Private landlord'}</MetaRow>
                {roomLabel && <MetaRow label="Listing type:">{roomLabel}</MetaRow>}
                {campusDisplay && <MetaRow label="Campus:">{campusDisplay}</MetaRow>}
              </dl>
              {property.featured && (
                <p className="mt-4 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 inline-block">
                  Featured listing
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {addressDisplay && (
              <p className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{addressDisplay}</p>
            )}
            <p className="text-2xl font-bold text-gray-900">
              ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-base font-semibold text-gray-600"> / week</span>
            </p>

            {property.description ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Description</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{property.description}</p>
              </div>
            ) : null}

            {activeKeyFeatures.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Key features</h2>
                <ul className="space-y-2">
                  {keyFeatures.map(
                    (f) =>
                      f.on && (
                        <li key={f.label} className="flex items-center gap-2 text-sm text-gray-800">
                          <span className="text-emerald-600 font-semibold" aria-hidden>
                            ✓
                          </span>
                          {f.label}
                        </li>
                      ),
                  )}
                </ul>
              </div>
            )}

            {amenityNames.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Amenities</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{amenityNames.join(' · ')}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={bookHref}
                state={bookState}
                className="flex-1 text-center rounded-xl bg-gray-900 text-white py-3.5 text-sm font-semibold hover:bg-gray-800"
              >
                Book now
              </Link>
              <button
                type="button"
                onClick={openEnquiryModal}
                className="flex-1 text-center rounded-xl bg-gray-900 text-white py-3.5 text-sm font-semibold hover:bg-gray-800"
              >
                Enquire
              </button>
            </div>

            <Link
              to="/listings"
              className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← More listings
            </Link>
          </div>
        </div>
      </div>

      {enquiryModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeEnquiryModal}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-modal-title"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 id="enquiry-modal-title" className="font-display text-xl font-bold text-gray-900">
                Send an enquiry
              </h2>
              <button
                type="button"
                onClick={closeEnquiryModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pt-4 pb-2 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{property.title}</p>
              <p className="text-sm text-gray-500">
                {property.suburb ?? '—'} · $
                {Number(property.rent_per_week).toLocaleString(undefined, { maximumFractionDigits: 0 })}/wk
              </p>
            </div>

            <div className="p-6">
              <PropertyEnquiryForm
                propertyId={property.id}
                landlordId={property.landlord_id}
                propertyTitle={property.title}
                user={user}
                profile={profile}
                role={role}
                showIntro={false}
                onSuccess={handleEnquirySuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
