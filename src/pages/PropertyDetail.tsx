import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'

const LISTING_TYPE_LABELS: Record<string, string> = {
  rent: 'Rent',
  homestay: 'Homestay',
  student_house: 'Student house',
}

export default function PropertyDetail() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = slugParam?.trim() ?? ''
  const shouldFetch = Boolean(slug) && isSupabaseConfigured

  const { user } = useAuthContext()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)

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
            campuses ( id, name )
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
  const listingLabel =
    property.listing_type && LISTING_TYPE_LABELS[property.listing_type]
      ? LISTING_TYPE_LABELS[property.listing_type]
      : property.listing_type

  const locationLine = [property.address, property.suburb, property.state, property.postcode]
    .filter(Boolean)
    .join(', ')

  const rent = Number(property.rent_per_week)

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-site mx-auto px-4 sm:px-6 py-4">
          <nav className="text-sm text-gray-500 mb-1">
            <Link to="/listings" className="hover:text-indigo-600">
              Listings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{property.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl overflow-hidden bg-gray-200 aspect-[16/10] lg:aspect-[2/1]">
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
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{property.title}</h1>
                  {locationLine && <p className="text-gray-600 text-sm mt-2">{locationLine}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-base font-normal text-gray-500"> /wk</span>
                  </p>
                  {property.bond != null && Number(property.bond) > 0 && (
                    <p className="text-sm text-gray-500 mt-1">Bond ${Number(property.bond).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {property.featured && (
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                    Featured
                  </span>
                )}
                {roomLabel && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full">
                    {roomLabel}
                  </span>
                )}
                {listingLabel && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full">
                    {listingLabel}
                  </span>
                )}
                {property.furnished && (
                  <span className="text-xs font-medium bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full">
                    Furnished
                  </span>
                )}
                <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                  {property.bedrooms ?? 1} bed{(property.bedrooms ?? 1) !== 1 ? 's' : ''} · {property.bathrooms ?? 1}{' '}
                  bath
                </span>
              </div>

              {property.universities && (
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium text-gray-800">Near:</span> {property.universities.name}
                  {property.campuses?.name ? ` · ${property.campuses.name}` : ''}
                </p>
              )}

              {property.description ? (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">About</h2>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{property.description}</p>
                </div>
              ) : null}

              {property.lease_length && (
                <p className="text-sm text-gray-600 mt-4">
                  <span className="font-medium text-gray-800">Lease:</span> {property.lease_length}
                </p>
              )}
              {property.available_from && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium text-gray-800">Available from:</span>{' '}
                  {new Date(property.available_from).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Listed by</h2>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold text-sm">
                  {landlord?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{landlord?.full_name ?? 'Private landlord'}</p>
                  {landlord?.verified && (
                    <p className="text-xs text-emerald-700 font-medium">Verified landlord</p>
                  )}
                </div>
              </div>

              {user ? (
                <Link
                  to={`/booking?slug=${encodeURIComponent(slug)}`}
                  className="block w-full text-center rounded-xl bg-gray-900 text-white py-3 text-sm font-medium hover:bg-gray-800 mb-3"
                >
                  Request to book
                </Link>
              ) : (
                <Link
                  to="/login"
                  state={{ from: { pathname: `/properties/${slug}` } }}
                  className="block w-full text-center rounded-xl bg-gray-900 text-white py-3 text-sm font-medium hover:bg-gray-800 mb-3"
                >
                  Log in to book
                </Link>
              )}

              <Link
                to="/listings"
                className="block w-full text-center rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
              >
                More listings
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
