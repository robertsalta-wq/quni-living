import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import PropertyEnquiryForm from '../components/PropertyEnquiryForm'
import { isStudentListingActionsUnlocked } from '../lib/onboardingChecklist'
import type { Database } from '../lib/database.types'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS, ROOM_TYPE_SHORT_LABELS } from '../lib/listings'
import { useUniversityCampusReference } from '../hooks/useUniversityCampusReference'
import { campusLatLonFromRow, normUuid } from '../lib/universityCampusReference'
import { fetchPropertiesByIds, rpcPropertiesNearCampus } from '../lib/propertiesNearCampusRpc'
import { listingIsoDateUtc } from '../lib/propertyListingDateWindow'
import { PROPERTY_CARD_LIST_SELECT } from '../lib/propertyCardSelect'
import { PropertyCard } from '../components/PropertyCard'
import Seo from '../components/Seo'
import { DEFAULT_OG_IMAGE } from '../lib/site'
import { buildPropertyMetaDescription, propertyListingJsonLd } from '../lib/propertySeo'

type GeoPoint = { lat: number; lon: number }

const geocodeCache = new Map<string, GeoPoint | null>()

type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']

function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900 tabular-nums">{children}</span>
    </div>
  )
}

function PreviewGateOverlay({ encodedRedirect }: { encodedRedirect: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#FFF8F0]/80 backdrop-blur-[2px] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#FF6F61]/25 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-stone-900/5 px-6 py-8 sm:px-8 sm:py-9 text-center space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 text-balance">
          Create a free account to view this listing
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Join thousands of students finding their perfect home near campus
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <Link
            to={`/signup?redirect=${encodedRedirect}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3 px-5 text-sm font-semibold tracking-wide hover:bg-[#e85d52] transition-colors shadow-sm"
          >
            Sign up free
          </Link>
          <Link
            to={`/login?redirect=${encodedRedirect}`}
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#FF6F61] text-[#FF6F61] bg-white py-3 px-5 text-sm font-semibold tracking-wide hover:bg-[#FFF8F0] transition-colors"
          >
            Log in
          </Link>
        </div>
        <p className="text-xs text-stone-500 pt-1">
          You&apos;ll return to this listing after signing in.
        </p>
      </div>
    </div>
  )
}

export default function PropertyDetail() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = slugParam?.trim() ?? ''
  const location = useLocation()
  const shouldFetch = Boolean(slug) && isSupabaseConfigured

  const { user, profile, role, refreshProfile } = useAuthContext()
  const { universities: uniRefRows, campuses: campusRefRows } = useUniversityCampusReference()
  const uniNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of uniRefRows) m.set(normUuid(u.id), u.name)
    return m
  }, [uniRefRows])
  const campusById = useMemo(() => {
    const m = new Map<string, { name: string; university_id: string | null }>()
    for (const c of campusRefRows) m.set(normUuid(c.id), { name: c.name, university_id: c.university_id })
    return m
  }, [campusRefRows])
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const enquirySuccessCloseTimerRef = useRef<number | null>(null)
  const thumbsScrollRef = useRef<HTMLDivElement>(null)

  const isPreview = !user
  const listingPath = `${location.pathname}${location.search}`
  const encodedRedirect = encodeURIComponent(listingPath)

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

  const studentProfile = role === 'student' && profile ? (profile as StudentProfileRow) : null
  const studentListingActionsOk = !user || role !== 'student' || isStudentListingActionsUnlocked(studentProfile)

  useEffect(() => {
    if (!user?.id || role !== 'student' || !isSupabaseConfigured) return
    const channel = supabase
      .channel(`property-detail-student-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_profiles', filter: `user_id=eq.${user.id}` },
        () => {
          void refreshProfile()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, role, refreshProfile])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && user && role === 'student') void refreshProfile()
    }
    window.addEventListener('focus', onVis)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onVis)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [user, role, refreshProfile])

  const amenityNames = useMemo(() => {
    const rows = property?.property_features ?? []
    const names = rows
      .map((pf) => pf?.features?.name)
      .filter((n): n is string => Boolean(n?.trim()))
    return [...new Set(names)].sort((a, b) => a.localeCompare(b))
  }, [property?.property_features])

  const [listingGeoPoint, setListingGeoPoint] = useState<GeoPoint | null>(null)
  const [listingGeoLoading, setListingGeoLoading] = useState(false)

  const [nearbyCampuses, setNearbyCampuses] = useState<
    { campusId: string; universitySlug: string; campusSlug: string; label: string; distanceKm: number }[]
  >([])

  const [nearbyListings, setNearbyListings] = useState<Property[]>([])

  /** Geocode from address, or use saved property coordinates when present. */
  useEffect(() => {
    if (!property) {
      setListingGeoPoint(null)
      setListingGeoLoading(false)
      return
    }

    const addr = property.address?.trim() ?? ''
    const sub = property.suburb?.trim() ?? ''
    const st = property.state?.trim() ?? ''
    const pc = property.postcode?.trim() ?? ''
    const allFields = Boolean(addr && sub && st && pc)
    if (!allFields) {
      setListingGeoPoint(null)
      setListingGeoLoading(false)
      return
    }

    const la = property.latitude != null ? Number(property.latitude) : NaN
    const lo = property.longitude != null ? Number(property.longitude) : NaN
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      setListingGeoPoint({ lat: la, lon: lo })
      setListingGeoLoading(false)
      return
    }

    setListingGeoPoint(null)

    const query = [addr, sub, st, pc, 'Australia'].join(', ')
    const key = query.trim().toLowerCase()
    let cancelled = false

    void (async () => {
      setListingGeoLoading(true)
      let pt = geocodeCache.get(key)
      if (pt === undefined) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
          const body = await res.json().catch(() => null)
          if (res.ok && body?.ok === true && typeof body.lat === 'number' && typeof body.lon === 'number') {
            pt = { lat: body.lat, lon: body.lon }
          } else {
            pt = null
          }
        } catch {
          pt = null
        }
        geocodeCache.set(key, pt)
      }

      if (!cancelled) {
        setListingGeoPoint(pt)
        setListingGeoLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    property?.id,
    property?.address,
    property?.suburb,
    property?.state,
    property?.postcode,
    property?.latitude,
    property?.longitude,
  ])

  useEffect(() => {
    if (!listingGeoPoint) {
      setNearbyCampuses([])
      return
    }

    const pt = listingGeoPoint
    const uniSlugById = new Map<string, string>()
    for (const u of uniRefRows) uniSlugById.set(normUuid(u.id), u.slug)

    const candidates = campusRefRows
      .map((c) => {
        const ll = campusLatLonFromRow(c)
        const campusSlug = c.slug?.trim() ?? ''
        const uniId = c.university_id ? normUuid(c.university_id) : ''
        const universitySlug = uniId ? uniSlugById.get(uniId) ?? '' : ''
        if (!ll || !campusSlug || !universitySlug) return null
        const dLat = ((ll.lat - pt.lat) * Math.PI) / 180
        const dLon = ((ll.lon - pt.lon) * Math.PI) / 180
        const sLat1 = (pt.lat * Math.PI) / 180
        const sLat2 = (ll.lat * Math.PI) / 180
        const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(sLat1) * Math.cos(sLat2)
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
        return {
          campusId: c.id,
          universitySlug,
          campusSlug,
          label: `${uniNameById.get(uniId) ?? c.university_id ?? 'University'} — ${c.name}`,
          distanceKm: distKm,
        }
      })
      .filter(Boolean) as {
      campusId: string
      universitySlug: string
      campusSlug: string
      label: string
      distanceKm: number
    }[]

    const top = candidates
      .filter((c) => c.distanceKm <= 15)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)

    setNearbyCampuses(top)
  }, [listingGeoPoint, campusRefRows, uniRefRows, uniNameById])

  useEffect(() => {
    if (!property?.id || !listingGeoPoint || !isSupabaseConfigured) {
      setNearbyListings([])
      return
    }

    let cancelled = false

    void (async () => {
      setNearbyListings([])
      const { data: nearRows, error } = await rpcPropertiesNearCampus(
        supabase,
        listingGeoPoint.lat,
        listingGeoPoint.lon,
        10,
      )
      if (cancelled) return
      if (error) {
        console.warn('[Quni] nearby listings RPC:', error.message)
        setNearbyListings([])
        return
      }

      const orderedIds = (nearRows ?? [])
        .filter((r) => r.id !== property.id)
        .slice(0, 4)
        .map((r) => r.id)

      if (orderedIds.length < 2) {
        setNearbyListings([])
        return
      }

      const { data: rows, error: fetchErr } = await fetchPropertiesByIds(
        supabase,
        orderedIds,
        PROPERTY_CARD_LIST_SELECT,
        listingIsoDateUtc(),
      )
      if (cancelled) return
      if (fetchErr) {
        console.error(fetchErr)
        setNearbyListings([])
        return
      }

      const byId = new Map((rows as Property[]).map((p) => [p.id, p]))
      const ordered: Property[] = []
      for (const id of orderedIds) {
        const p = byId.get(id)
        if (p) ordered.push(p)
      }
      setNearbyListings(ordered)
    })()

    return () => {
      cancelled = true
    }
  }, [property?.id, listingGeoPoint])

  if (!isSupabaseConfigured) {
    return (
      <>
        <Seo title="Property listing" description="View student accommodation listings on Quni Living." />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-gray-600 text-sm">Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.</p>
        </div>
      </>
    )
  }

  if (!slug) {
    return (
      <>
        <Seo title="Invalid listing" noindex description="This link is not valid." />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-red-600 text-sm">Invalid property link.</p>
          <Link to="/listings" className="text-indigo-600 text-sm font-medium mt-4 inline-block">
            Back to listings
          </Link>
        </div>
      </>
    )
  }

  if (loading && shouldFetch) {
    const loadingTitle = slug
      .split('-')
      .filter(Boolean)
      .slice(0, 8)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return (
      <>
        <Seo
          title={loadingTitle || 'Student accommodation'}
          description="Loading verified student accommodation on Quni Living."
          canonicalPath={`/listings/${slug}`}
        />
        <div className="min-h-[50vh] flex items-center justify-center bg-stone-50">
          <div className="h-10 w-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Seo title="Listing unavailable" noindex description="This listing could not be loaded." canonicalPath="/listings" />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <Link to="/listings" className="text-indigo-600 text-sm font-medium">
            Back to listings
          </Link>
        </div>
      </>
    )
  }

  if (!property) {
    return (
      <>
        <Seo
          title="Listing not found"
          noindex
          description="This student accommodation listing is no longer available on Quni Living."
          canonicalPath="/listings"
        />
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
      </>
    )
  }

  const images = (property.images ?? []).filter(Boolean)
  const mainImage = images[imageIndex] ?? images[0] ?? null
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

  const campusDisplay = (() => {
    const campusId = property.campus_id ? normUuid(property.campus_id) : ''
    const universityId = property.university_id ? normUuid(property.university_id) : ''
    const campusRow = campusId ? campusById.get(campusId) : null
    const campusName = property.campuses?.name ?? campusRow?.name ?? null
    const uniName =
      property.universities?.name ??
      (universityId ? uniNameById.get(universityId) ?? null : null) ??
      (campusRow?.university_id ? uniNameById.get(normUuid(campusRow.university_id)) ?? null : null)

    if (campusId) {
      if (uniName && campusName) return `${uniName} – ${campusName}`
      return uniName ?? campusName ?? null
    }
    if (universityId) return `${uniName ?? 'University'} — All campuses`
    return null
  })()

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

  const bookPath = property?.id ? `/booking/${property.id}` : `/listings/${slug}`
  const bookHref = user
    ? bookPath
    : `/signup?role=student&redirect=${encodeURIComponent(bookPath)}`
  const bookState = user ? undefined : { from: { pathname: listingPath } }

  const landlordInitial = landlord?.full_name?.trim()?.[0]?.toUpperCase() ?? '?'
  const landlordAvatar = landlord?.avatar_url?.trim()

  const heroSpecParts: string[] = [
    `${beds} bed${beds !== 1 ? 's' : ''}`,
    `${baths} bath${baths !== 1 ? 's' : ''}`,
  ]
  if (roomShort) heroSpecParts.push(roomShort)
  if (campusDisplay) heroSpecParts.push(campusDisplay)
  const heroSpecLine = heroSpecParts.join(' · ')

  const previewSubtitleParts: string[] = []
  if (property.suburb?.trim()) previewSubtitleParts.push(property.suburb.trim())
  previewSubtitleParts.push(`$${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/wk`)
  if (campusDisplay) previewSubtitleParts.push(campusDisplay)
  const previewSubtitleLine = previewSubtitleParts.join(' · ')

  const previewSpecsLine = [
    roomLabel,
    `${beds} bed${beds !== 1 ? 's' : ''}`,
    `${baths} bath${baths !== 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const listingMetaDesc = buildPropertyMetaDescription(property, { campusDisplay, roomLabel })
  const listingOg =
    images[0] && /^https?:\/\//i.test(images[0].trim()) ? images[0].trim() : DEFAULT_OG_IMAGE

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full bg-stone-50 pb-20">
      <Seo
        title={property.title}
        description={listingMetaDesc}
        canonicalPath={`/listings/${slug}`}
        image={listingOg}
        jsonLd={propertyListingJsonLd(property, slug, { campusDisplay, roomLabel })}
      />
      <div className="w-full bg-[#8FB9AB] py-8 sm:py-10">
        <div className="max-w-site mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4">
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
          {isPreview ? (
            <>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">{previewSubtitleLine}</p>
              {previewSpecsLine ? (
                <p className="text-sm sm:text-base text-white/80 leading-relaxed">{previewSpecsLine}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm sm:text-base text-white/80 leading-relaxed">{heroSpecLine}</p>
          )}
        </div>
      </div>

      <div className="max-w-site mx-auto min-w-0 px-4 sm:px-6 pt-6 sm:pt-8">
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

      {isPreview ? (
        <div className="max-w-site mx-auto px-4 sm:px-6 mt-10 sm:mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 order-2 lg:order-1">
              {property.featured && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FF6F61] text-white">
                  Featured
                </span>
              )}
              <p className="text-sm text-stone-500">
                Sign in to see the full address, description, amenities, availability, and landlord contact details.
              </p>
            </div>
            <aside className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 w-full">
              <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.12)] ring-1 ring-stone-900/5">
                <div className="pb-6 border-b border-stone-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">From</p>
                  <p className="font-display text-4xl sm:text-[2.75rem] font-bold text-stone-900 tracking-tight">
                    ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-lg sm:text-xl font-semibold text-stone-500 font-sans"> / week</span>
                  </p>
                </div>
                <div className="py-6 space-y-3 border-b border-stone-100">
                  {roomLabel && <SidebarRow label="Type">{roomLabel}</SidebarRow>}
                  <SidebarRow label="Bedrooms">{beds}</SidebarRow>
                  <SidebarRow label="Bathrooms">{baths}</SidebarRow>
                </div>
              </div>
            </aside>
          </div>

          <div className="relative mt-10 sm:mt-12 rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 bg-stone-100/60 min-h-[min(52vh,420px)]">
            <div
              className="pointer-events-none select-none blur-[6px] opacity-45 p-6 sm:p-10 space-y-6"
              aria-hidden
            >
              <div className="h-4 w-2/3 rounded bg-stone-300" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-stone-300/90" />
                <div className="h-3 w-full rounded bg-stone-300/90" />
                <div className="h-3 w-4/5 rounded bg-stone-300/90" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-8 w-24 rounded-full bg-stone-300/80" />
                <div className="h-8 w-28 rounded-full bg-stone-300/80" />
                <div className="h-8 w-20 rounded-full bg-stone-300/80" />
              </div>
              <div className="h-32 rounded-2xl bg-stone-300/70" />
            </div>
            <PreviewGateOverlay encodedRedirect={encodedRedirect} />
          </div>

          <div className="mt-10">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span aria-hidden>←</span> Back to all listings
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-site mx-auto px-4 sm:px-6 mt-10 sm:mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
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

              {nearbyListings.length >= 2 && (
                <section className="space-y-4" aria-labelledby="more-nearby-heading">
                  <h2 id="more-nearby-heading" className="font-display text-xl font-bold text-stone-900">
                    More properties nearby
                  </h2>
                  <p className="text-xs text-stone-500 -mt-1">
                    Approximate straight-line distances (10 km). Not driving time.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nearbyListings.map((p) => (
                      <PropertyCard key={p.id} property={p} />
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
                    {(listingGeoLoading || nearbyCampuses.length > 0) && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">
                          NEARBY UNIVERSITIES
                        </p>
                        {listingGeoLoading ? (
                          <div className="flex items-center gap-2 py-1" aria-busy="true" aria-label="Loading nearby universities">
                            <div className="h-4 w-4 shrink-0 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
                            <span className="sr-only">Loading</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {nearbyCampuses.map((c) => (
                              <Link
                                key={c.campusId}
                                to={`/student-accommodation/${c.universitySlug}/${c.campusSlug}`}
                                className="flex items-baseline justify-between gap-3 text-sm hover:text-stone-900 text-stone-700"
                              >
                                <span className="min-w-0 truncate">{c.label}</span>
                                <span className="shrink-0 text-xs text-stone-500 tabular-nums">
                                  {c.distanceKm < 10 ? c.distanceKm.toFixed(1) : Math.round(c.distanceKm)} km
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
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
                    {role === 'student' && !studentListingActionsOk ? (
                      <div className="rounded-xl border border-[#FF6F61]/25 bg-[#FEF9E4] px-4 py-4 text-center space-y-3">
                        <p className="text-sm font-medium text-stone-800 leading-snug">
                          Complete your profile to send enquiries and request bookings
                        </p>
                        <Link
                          to="/onboarding/student"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold tracking-wide hover:bg-[#e85d52] transition-colors"
                        >
                          Complete profile →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <Link
                          to={bookHref}
                          state={bookState}
                          className="flex w-full items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold tracking-wide hover:bg-[#e85d52] transition-colors"
                        >
                          Request to book
                        </Link>
                        <button
                          type="button"
                          onClick={openEnquiryModal}
                          className="flex w-full items-center justify-center rounded-xl border-2 border-[#FF6F61] bg-white text-[#FF6F61] py-3.5 text-sm font-semibold tracking-wide hover:bg-[#FF6F61]/10 hover:border-[#e85d52] hover:text-[#e85d52] transition-colors"
                        >
                          Enquire
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {enquiryModalOpen && user && studentListingActionsOk && (
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
