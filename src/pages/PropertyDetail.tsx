import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import PropertyEnquiryForm from '../components/PropertyEnquiryForm'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS, ROOM_TYPE_SHORT_LABELS } from '../lib/listings'

function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900 tabular-nums">{children}</span>
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
  const thumbsScrollRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const root = thumbsScrollRef.current
    if (!root) return
    const btn = root.querySelector<HTMLElement>(`[data-thumb-index="${imageIndex}"]`)
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [imageIndex])

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
      <div className="min-h-[50vh] flex items-center justify-center bg-stone-50">
        <div className="h-10 w-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
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

  const landlordInitial = landlord?.full_name?.trim()?.[0]?.toUpperCase() ?? '?'
  const landlordAvatar = landlord?.avatar_url?.trim()

  const heroSpecParts: string[] = [
    `${beds} bed${beds !== 1 ? 's' : ''}`,
    `${baths} bath${baths !== 1 ? 's' : ''}`,
  ]
  if (roomShort) heroSpecParts.push(roomShort)
  if (campusDisplay) heroSpecParts.push(campusDisplay)
  const heroSpecLine = heroSpecParts.join(' · ')

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full bg-stone-50 pb-20 overflow-x-clip">
      <div className="max-w-site mx-auto w-full min-w-0">
        <div className="bg-[#8FB9AB] py-8 sm:py-10 px-4 sm:px-6 space-y-3 sm:space-y-4">
          <nav className="text-sm text-white/80">
            <Link to="/listings" className="hover:text-white transition-colors">
              Listings
            </Link>
            <span className="mx-2 text-white/50">/</span>
            <span className="text-white font-medium line-clamp-1">{property.title}</span>
          </nav>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
            {property.title}
          </h1>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed">{heroSpecLine}</p>
        </div>

        <div className="min-w-0 px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Gallery — dominant focal area */}
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-stone-200 shadow-sm ring-1 ring-black/5 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[2.35/1] max-h-[min(72vh,560px)] lg:max-h-[520px]">
          {mainImage ? (
            <img src={mainImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400">
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
          <div className="mt-4 min-w-0">
            <p className="sr-only" id="property-gallery-thumbs-hint">
              {images.length} photos. Swipe horizontally on the row below to see every thumbnail.
            </p>
            <p className="sm:hidden text-center text-xs text-stone-500 mb-2" aria-hidden>
              Swipe sideways for all {images.length} photos
            </p>
            {/* Full-bleed scroll on mobile so overflow-x isn’t clipped by page padding; min-w-0 allows flex children to shrink */}
            <div className="-mx-4 sm:mx-0 min-w-0">
              <div
                ref={thumbsScrollRef}
                className="flex w-full min-w-0 gap-2.5 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 pb-2 sm:pb-1 scroll-smooth snap-x snap-mandatory px-4 sm:px-0 touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
                aria-describedby="property-gallery-thumbs-hint"
              >
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    data-thumb-index={i}
                    aria-label={`Photo ${i + 1} of ${images.length}`}
                    aria-pressed={i === imageIndex}
                    onClick={() => setImageIndex(i)}
                    className={`snap-start shrink-0 w-[4.5rem] h-[3.25rem] sm:w-24 sm:h-[4.5rem] rounded-xl overflow-hidden ring-2 transition-all duration-200 ${
                      i === imageIndex
                        ? 'ring-stone-900 shadow-md scale-[1.02]'
                        : 'ring-transparent opacity-75 hover:opacity-100 hover:ring-stone-300'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="px-4 sm:px-6 mt-10 sm:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
          {/* Main column — narrative & detail (left on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10 sm:space-y-12 order-2 lg:order-1">
            <header className="space-y-4">
              {property.featured && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FF6F61] text-white">
                  Featured
                </span>
              )}
              {addressDisplay && (
                <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">{addressDisplay}</p>
              )}
            </header>

            {property.description ? (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">About this place</h2>
                <p className="text-stone-700 text-base leading-[1.7] whitespace-pre-wrap max-w-prose">
                  {property.description}
                </p>
              </section>
            ) : null}

            {activeKeyFeatures.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Included</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keyFeatures.map(
                    (f) =>
                      f.on && (
                        <li
                          key={f.label}
                          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-stone-800 ring-1 ring-stone-900/5 shadow-sm"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                            aria-hidden
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          {f.label}
                        </li>
                      ),
                  )}
                </ul>
              </section>
            )}

            {amenityNames.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {amenityNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-700 shadow-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span aria-hidden>←</span> Back to all listings
            </Link>
          </div>

          {/* Sticky booking card — right on desktop, first on mobile for faster action */}
          <aside className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 w-full">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-stone-900/5">
                <div className="pb-6 border-b border-stone-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">From</p>
                  <p className="font-display text-4xl sm:text-[2.75rem] font-bold text-stone-900 tracking-tight">
                    ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-lg sm:text-xl font-semibold text-stone-500 font-sans"> / week</span>
                  </p>
                </div>

                <div className="py-6 space-y-3 border-b border-stone-100">
                  {property.bond != null && Number(property.bond) > 0 && (
                    <SidebarRow label="Bond">{`$${Number(property.bond).toLocaleString()}`}</SidebarRow>
                  )}
                  {property.lease_length?.trim() && (
                    <SidebarRow label="Lease">{property.lease_length.trim()}</SidebarRow>
                  )}
                  {availableFormatted && <SidebarRow label="Available">{availableFormatted}</SidebarRow>}
                  {roomLabel && <SidebarRow label="Type">{roomLabel}</SidebarRow>}
                  {campusDisplay && (
                    <div className="text-sm space-y-1">
                      <span className="text-stone-500">Campus</span>
                      <p className="font-medium text-stone-900 leading-snug">{campusDisplay}</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 pb-6 border-b border-stone-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-3">Listed by</p>
                  <div className="flex items-center gap-3">
                    {landlordAvatar ? (
                      <img
                        src={landlordAvatar}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-stone-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-semibold text-sm ring-2 ring-stone-100">
                        {landlordInitial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 capitalize">
                        {(property.landlord_profiles?.full_name ?? 'Private landlord').toLowerCase()}
                      </span>
                      {landlord?.verified && (
                        <p className="text-xs font-medium text-emerald-700 mt-0.5">Verified host</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col gap-3">
                  <Link
                    to={bookHref}
                    state={bookState}
                    className="flex w-full items-center justify-center rounded-xl bg-stone-900 text-white py-3.5 text-sm font-semibold tracking-wide hover:bg-stone-800 transition-colors"
                  >
                    Book now
                  </Link>
                  <button
                    type="button"
                    onClick={openEnquiryModal}
                    className="flex w-full items-center justify-center rounded-xl border-2 border-stone-200 bg-white text-stone-900 py-3.5 text-sm font-semibold tracking-wide hover:bg-stone-50 hover:border-stone-300 transition-colors"
                  >
                    Enquire
                  </button>
                </div>
              </div>
            </div>
          </aside>
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
