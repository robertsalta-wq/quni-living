import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import PropertyEnquiryForm from '../components/PropertyEnquiryForm'
import { isStudentListingActionsUnlocked } from '../lib/onboardingChecklist'
import type { Database } from '../lib/database.types'
import type { Property } from '../lib/listings'
import { isRoomType, ROOM_TYPE_LABELS } from '../lib/listings'
import { useUniversityCampusReference } from '../hooks/useUniversityCampusReference'
import {
  campusLatLonFromRow,
  normUuid,
  universityShortLabel,
} from '../lib/universityCampusReference'
import { fetchPropertiesByIds, rpcPropertiesNearCampus } from '../lib/propertiesNearCampusRpc'
import { PROPERTY_CARD_LIST_SELECT } from '../lib/propertyCardSelect'
import { PropertyCard } from '../components/PropertyCard'
import Seo from '../components/Seo'
import ChatEmbed from '../components/aiChat/ChatEmbed'
import { DEFAULT_OG_IMAGE, SITE_CONTENT_MAX_CLASS } from '../lib/site'
import { buildPropertyMetaDescription, propertyListingJsonLd } from '../lib/propertySeo'

type GeoPoint = { lat: number; lon: number }
type PublicPropertyStatus = Database['public']['Tables']['properties']['Row']['status'] | 'suspended'

const geocodeCache = new Map<string, GeoPoint | null>()

type AmenityGridItem = { key: string; icon: string; label: string }

function amenityGridItems(amenityNames: string[], furnished: boolean): AmenityGridItem[] {
  const seen = new Set<string>()
  const out: AmenityGridItem[] = []

  const pushIcon = (label: string, icon: string) => {
    const k = label.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push({ key: label, icon, label })
  }

  const matchIcon = (raw: string): string => {
    const n = raw.trim().toLowerCase()
    if (/air\s*conditioning|^ac$/i.test(raw)) return '❄️'
    if (/bills?\s*included|^utilities$/i.test(n)) return '💡'
    if (/dishwasher/i.test(n)) return '🍽️'
    if (/dryer/i.test(n)) return '🧺'
    if (/garden/i.test(n)) return '🌿'
    if (/gym/i.test(n)) return '🏋️'
    if (/heat/i.test(n)) return '🔥'
    if (/balcony/i.test(n)) return '🪟'
    if (/linen/i.test(n)) return '🛏️'
    if (/clean|housekeeping|house\s*keeper|mop|maid/i.test(n)) return '🧹'
    if (/transport|train|bus|tram|ferry/i.test(n)) return '🚌'
    if (/parking|car\s*space|car\s*park|garage/i.test(n)) return '🚗'
    if (/pet/i.test(n)) return '🐾'
    if (/desk|study/i.test(n)) return '📚'
    if (/pool|swim/i.test(n)) return '🏊'
    if (/wifi|wi-?fi|internet|broadband/i.test(n)) return '📶'
    if (/wash|laundry|machine/i.test(n)) return '🫧'
    if (/furnish/i.test(n)) return '🛋️'
    return '✓'
  }

  for (const name of amenityNames) {
    const icon = matchIcon(name)
    pushIcon(name, icon)
    if (out.length >= 12) break
  }

  if (furnished && !seen.has('fully furnished') && !amenityNames.some((a) => /furnish/i.test(a))) {
    pushIcon('Fully furnished', '🛋️')
  }

  return out.slice(0, 12)
}

type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']

function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900 tabular-nums">{children}</span>
    </div>
  )
}

const sectionLabelClass = 'text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6F61]'

function PropertyThumbnail({
  src,
  index,
  total,
  isActive,
  onSelect,
}: {
  src: string
  index: number
  total: number
  isActive: boolean
  onSelect: () => void
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <button
      type="button"
      data-thumb-index={index}
      aria-label={`Photo ${index + 1} of ${total}`}
      aria-pressed={isActive}
      onClick={onSelect}
      className={`snap-start shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden ring-2 transition-all duration-200 ${
        isActive ? 'ring-stone-900 shadow-md' : 'ring-transparent opacity-80 hover:opacity-100 hover:ring-stone-300'
      }`}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </button>
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

  const { user, profile, role, refreshProfile, loading: authLoading } = useAuthContext()
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
  const [studentListingBlocked, setStudentListingBlocked] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const enquirySuccessCloseTimerRef = useRef<number | null>(null)
  const thumbsScrollRef = useRef<HTMLDivElement>(null)
  const bookingCardRef = useRef<HTMLDivElement>(null)

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
    if (!shouldFetch || authLoading) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      setStudentListingBlocked(false)

      if (user && role === 'student') {
        const { data: access, error: rpcErr } = await supabase.rpc('property_access_status_for_viewer', {
          p_slug: slug,
        })
        if (cancelled) return
        if (rpcErr) {
          setError(rpcErr.message)
          setProperty(null)
          setLoading(false)
          return
        }
        const st = typeof access === 'string' ? access : null
        if (st === 'not_found') {
          setProperty(null)
          setError(null)
          setLoading(false)
          return
        }
        if (st === 'forbidden_student_only') {
          setProperty(null)
          setStudentListingBlocked(true)
          setLoading(false)
          return
        }
      }

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
  }, [slug, shouldFetch, user, role, authLoading])

  useEffect(() => {
    const root = thumbsScrollRef.current
    if (!root) return
    const btn = root.querySelector<HTMLElement>(`[data-thumb-index="${imageIndex}"]`)
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [imageIndex])

  const studentProfile = role === 'student' && profile ? (profile as StudentProfileRow) : null
  const studentListingActionsOk = !user || role !== 'student' || isStudentListingActionsUnlocked(studentProfile)

  const [activePipelineBookingId, setActivePipelineBookingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || role !== 'student' || !property?.id || !isSupabaseConfigured) {
      setActivePipelineBookingId(null)
      return
    }
    const sp = studentProfile
    if (!sp?.id) {
      setActivePipelineBookingId(null)
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('property_id', property.id)
        .eq('student_id', sp.id)
        .in('status', ['pending_confirmation', 'awaiting_info', 'confirmed', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) setActivePipelineBookingId(data?.id ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, role, property?.id, studentProfile?.id, isSupabaseConfigured])

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

  const billsIncluded = useMemo(
    () => amenityNames.some((n) => /bills?\s*included/i.test(n) || /^utilities$/i.test(n.trim())),
    [amenityNames],
  )

  const universityForQuickBar = useMemo(() => {
    if (!property) return null
    const uid = property.university_id ? normUuid(property.university_id) : ''
    if (uid) {
      const u = uniRefRows.find((x) => normUuid(x.id) === uid)
      return u ? universityShortLabel(u) : null
    }
    const cid = property.campus_id ? normUuid(property.campus_id) : ''
    const c = campusRefRows.find((x) => normUuid(x.id) === cid)
    if (c?.university_id) {
      const u = uniRefRows.find((x) => normUuid(x.id) === normUuid(c.university_id))
      return u ? universityShortLabel(u) : null
    }
    return null
  }, [property, uniRefRows, campusRefRows])

  const similarHomesHeading = useMemo(() => {
    if (!property) return 'Similar homes nearby'
    const uid = property.university_id ? normUuid(property.university_id) : ''
    const fromDirect = uid ? uniRefRows.find((u) => normUuid(u.id) === uid) : null
    const cid = property.campus_id ? normUuid(property.campus_id) : ''
    const c = campusRefRows.find((x) => normUuid(x.id) === cid)
    const fromCampus = c?.university_id
      ? uniRefRows.find((u) => normUuid(u.id) === normUuid(c.university_id))
      : null
    const u = fromDirect ?? fromCampus
    return u ? `Similar homes near ${universityShortLabel(u)}` : 'Similar homes nearby'
  }, [property, uniRefRows, campusRefRows])

  const [listingGeoPoint, setListingGeoPoint] = useState<GeoPoint | null>(null)
  const [listingGeoLoading, setListingGeoLoading] = useState(false)

  const [nearbyCampuses, setNearbyCampuses] = useState<
    {
      campusId: string
      universitySlug: string
      campusSlug: string
      universityName: string
      campusName: string
      distanceKm: number
    }[]
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
          universityName: uniNameById.get(uniId) ?? 'University',
          campusName: c.name,
          distanceKm: distKm,
        }
      })
      .filter(Boolean) as {
      campusId: string
      universitySlug: string
      campusSlug: string
      universityName: string
      campusName: string
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

  if (!loading && studentListingBlocked) {
    return (
      <>
        <Seo
          title="Student tenants only"
          noindex
          description="This listing is available to verified student tenants on Quni Living."
          canonicalPath={`/properties/${slug}`}
        />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-xl font-semibold text-gray-900">Student tenants only</h1>
          <p className="text-gray-600 text-sm mt-2">
            This landlord has listed for student tenants only.
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

  const propertyStatus = property.status as PublicPropertyStatus
  if (propertyStatus !== 'active' && propertyStatus !== 'booked') {
    return (
      <>
        <Seo
          title="Listing unavailable"
          noindex
          description="This student accommodation listing is no longer available on Quni Living."
          canonicalPath="/properties"
        />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-xl font-semibold text-gray-900">This listing is no longer available</h1>
          <Link
            to="/properties"
            className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Browse other properties →
          </Link>
        </div>
      </>
    )
  }

  const listingIsBooked = propertyStatus === 'booked'
  const showActiveBookingLink =
    role === 'student' && Boolean(activePipelineBookingId) && propertyStatus === 'active'

  const images = (property.images ?? []).filter(Boolean)
  const mainImage = images[imageIndex] ?? images[0] ?? null
  const landlord = property.landlord_profiles
  const roomLabel =
    property.room_type && isRoomType(property.room_type)
      ? ROOM_TYPE_LABELS[property.room_type]
      : null

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

  const quickLocation = [property.suburb?.trim(), property.state?.trim()].filter(Boolean).join(', ') || '—'
  const typeLabelForQuickBar = roomLabel ?? '—'
  const amenityNamesForGrid = [
    ...(property.linen_supplied ? ['Linen supplied'] : []),
    ...(property.weekly_cleaning_service ? ['Weekly cleaning service'] : []),
    ...amenityNames,
  ]
  const amenityGrid = amenityGridItems(amenityNamesForGrid, Boolean(property.furnished))

  const quickInfoItems: { icon: string; text: string }[] = (() => {
    const items: { icon: string; text: string }[] = [{ icon: '📍', text: quickLocation }]
    if (universityForQuickBar) items.push({ icon: '🏫', text: `Near ${universityForQuickBar}` })
    if (billsIncluded) items.push({ icon: '💡', text: 'Bills included' })
    items.push({ icon: '🛏', text: typeLabelForQuickBar })
    return items
  })()

  /** Hero badges: mobile max 2 — Featured if set, else first two of Furnished → Linen → Weekly. Desktop: all (Tailwind md:). */
  const nonFeaturedHeroBadges: ('furnished' | 'linen' | 'weekly')[] = []
  if (property.furnished) nonFeaturedHeroBadges.push('furnished')
  if (property.linen_supplied) nonFeaturedHeroBadges.push('linen')
  if (property.weekly_cleaning_service) nonFeaturedHeroBadges.push('weekly')
  const mobileShowFurnished = property.featured
    ? nonFeaturedHeroBadges[0] === 'furnished'
    : nonFeaturedHeroBadges[0] === 'furnished' || nonFeaturedHeroBadges[1] === 'furnished'
  const mobileShowLinen = property.featured
    ? nonFeaturedHeroBadges[0] === 'linen'
    : nonFeaturedHeroBadges[0] === 'linen' || nonFeaturedHeroBadges[1] === 'linen'
  const mobileShowWeekly = property.featured
    ? nonFeaturedHeroBadges[0] === 'weekly'
    : nonFeaturedHeroBadges[0] === 'weekly' || nonFeaturedHeroBadges[1] === 'weekly'
  const heroExtraBadgeMd = (showOnMobile: boolean) =>
    showOnMobile ? 'inline-flex' : 'hidden md:inline-flex'

  const goPrevImage = () =>
    setImageIndex((i) => (images.length ? (i > 0 ? i - 1 : images.length - 1) : 0))
  const goNextImage = () =>
    setImageIndex((i) => (images.length ? (i < images.length - 1 ? i + 1 : 0) : 0))

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full bg-[#FEF9E4] pb-20 md:pb-16">
      <Seo
        title={property.title}
        description={listingMetaDesc}
        canonicalPath={`/listings/${slug}`}
        image={listingOg}
        jsonLd={propertyListingJsonLd(property, slug, { campusDisplay, roomLabel })}
      />
      <div className={`${SITE_CONTENT_MAX_CLASS} pt-3 sm:pt-4 text-left`}>
        <nav
          className="flex flex-nowrap items-center gap-x-2 min-w-0 w-full text-left text-sm text-stone-600 mb-2 sm:mb-3 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="shrink-0 hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span className="shrink-0 text-stone-300" aria-hidden>
            /
          </span>
          <Link to="/listings" className="shrink-0 hover:text-stone-900 transition-colors">
            Listings
          </Link>
          <span className="shrink-0 text-stone-300" aria-hidden>
            /
          </span>
          <span
            className="min-w-0 truncate text-[#FF6F61] font-medium"
            title={property.title}
          >
            {property.title}
          </span>
        </nav>
      </div>

      {/* Gallery width must use SITE_CONTENT_MAX_CLASS (1200px) — do not use viewport-full-bleed here. */}
      <div className={SITE_CONTENT_MAX_CLASS}>
        <div className="relative w-full min-w-0 aspect-[4/3] md:aspect-video bg-stone-200 overflow-hidden rounded-xl shadow-sm ring-1 ring-stone-900/5">
        {mainImage ? (
          <img src={mainImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 min-h-[200px]">
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
        <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 z-10">
          {property.featured && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FF6F61] text-white shadow-sm">
              Featured
            </span>
          )}
          {property.furnished && (
            <span
              className={`${heroExtraBadgeMd(mobileShowFurnished)} items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8FB9AB] text-white shadow-sm`}
            >
              Furnished
            </span>
          )}
          {property.linen_supplied && (
            <span
              className={`${heroExtraBadgeMd(mobileShowLinen)} items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8FB9AB] text-white shadow-sm`}
            >
              Linen supplied
            </span>
          )}
          {property.weekly_cleaning_service && (
            <span
              className={`${heroExtraBadgeMd(mobileShowWeekly)} items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8FB9AB] text-white shadow-sm`}
            >
              Weekly cleaning
            </span>
          )}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={goPrevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-[#FF6F61] text-white shadow-md hover:bg-[#e85d52] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={goNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-[#FF6F61] text-white shadow-md hover:bg-[#e85d52] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        </div>
      </div>

      {images.length > 1 && (
        <div className={`${SITE_CONTENT_MAX_CLASS} mt-2 sm:mt-3`}>
          <p className="sr-only" id="property-gallery-thumbs-hint">
            {images.length} photos. Click a thumbnail to view.
          </p>
          <div
            ref={thumbsScrollRef}
            className="flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 pb-1 scroll-smooth snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
            aria-describedby="property-gallery-thumbs-hint"
          >
            {images.map((src, i) => (
              <PropertyThumbnail
                key={`${src}-${i}`}
                src={src}
                index={i}
                total={images.length}
                isActive={i === imageIndex}
                onSelect={() => setImageIndex(i)}
              />
            ))}
          </div>
        </div>
      )}

      {isPreview ? (
        <div className={`${SITE_CONTENT_MAX_CLASS} mt-5 sm:mt-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-3 order-2 lg:order-1">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FF6F61] tracking-tight text-balance">
                {property.title}
              </h1>
              <p className="text-base text-stone-700">{previewSubtitleLine}</p>
              {previewSpecsLine ? <p className="text-sm text-stone-600">{previewSpecsLine}</p> : null}
              <p className="text-sm text-stone-500 pt-1">
                Sign in to see the full address, description, amenities, availability, and landlord contact details.
              </p>
            </div>
            <aside className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 w-full">
              <div className="rounded-2xl bg-white border border-stone-200 shadow-md p-5 sm:p-6">
                <div className="pb-4 border-b border-stone-100">
                  <p className={`${sectionLabelClass} mb-1.5`}>From</p>
                  <p className="font-display text-4xl sm:text-[2.75rem] font-bold text-[#FF6F61] tracking-tight">
                    ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-lg sm:text-xl font-semibold text-stone-500 font-sans"> / week</span>
                  </p>
                </div>
                <div className="py-4 space-y-2.5 border-b border-stone-100">
                  {roomLabel && <SidebarRow label="Type">{roomLabel}</SidebarRow>}
                  <SidebarRow label="Bedrooms">{beds}</SidebarRow>
                  <SidebarRow label="Bathrooms">{baths}</SidebarRow>
                </div>
              </div>
            </aside>
          </div>

          <div className="relative mt-6 sm:mt-7 rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 bg-stone-100/60 min-h-[min(52vh,420px)]">
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

          <div className="mt-6">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span aria-hidden>←</span> Back to all listings
            </Link>
          </div>
        </div>
      ) : (
        <div className={`${SITE_CONTENT_MAX_CLASS} mt-5 sm:mt-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 lg:gap-9 xl:gap-10 items-start">
            <div className="space-y-5 sm:space-y-6 order-2 lg:order-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#FF6F61] tracking-tight text-balance">
                {property.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-2 rounded-xl bg-white border border-stone-100 px-4 py-2.5 text-sm text-stone-700 shadow-sm">
                {quickInfoItems.map((item, i) => (
                  <Fragment key={`${item.text}-${i}`}>
                    {i > 0 ? (
                      <span className="hidden sm:inline text-stone-300 px-1 select-none" aria-hidden>
                        |
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF6F61]/12 text-base leading-none"
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      <span>{item.text}</span>
                    </span>
                  </Fragment>
                ))}
              </div>

              {property.description ? (
                <section className="space-y-3 border-t border-stone-100 pt-5">
                  <h2 className={sectionLabelClass}>About this place</h2>
                  <p className="text-stone-700 text-base leading-[1.7] whitespace-pre-wrap max-w-prose">
                    {property.description}
                  </p>
                </section>
              ) : null}

              {amenityGrid.length > 0 && (
                <section className="space-y-3 border-t border-stone-100 pt-5">
                  <h2 className={sectionLabelClass}>Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl">
                    {amenityGrid.map((a) => (
                      <div
                        key={a.key}
                        className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-stone-100/50 px-3 py-2 text-sm text-stone-800 shadow-sm"
                      >
                        <span className="text-lg shrink-0" aria-hidden>
                          {a.icon}
                        </span>
                        <span className="leading-snug">{a.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(listingGeoLoading || nearbyCampuses.length > 0) && (
                <section className="space-y-3 border-t border-stone-100 pt-5">
                  <h2 className={sectionLabelClass}>NEARBY UNIVERSITIES</h2>
                  <p className="text-xs text-stone-500">Approximate distances</p>
                  {listingGeoLoading ? (
                    <div className="flex items-center gap-2 py-2" aria-busy="true" aria-label="Loading nearby universities">
                      <div className="h-5 w-5 shrink-0 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
                    </div>
                  ) : nearbyCampuses.length > 0 ? (
                    <ul className="space-y-0 divide-y divide-stone-100 rounded-xl border border-stone-100 bg-white shadow-sm overflow-hidden">
                      {nearbyCampuses.map((c) => (
                        <li key={c.campusId}>
                          <Link
                            to={`/student-accommodation/${c.universitySlug}/${c.campusSlug}`}
                            className="flex gap-3 px-4 py-3.5 hover:bg-stone-50/80 transition-colors"
                          >
                            <span className="text-lg shrink-0 pt-0.5" aria-hidden>
                              🚶
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm sm:text-base text-stone-900 leading-snug">
                                {c.universityName} — {c.campusName}
                              </p>
                              <p className="text-sm font-medium text-[#FF6F61]">
                                {c.distanceKm < 10 ? c.distanceKm.toFixed(1) : Math.round(c.distanceKm)} km away
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              )}

              {nearbyListings.length >= 2 && (
                <section className="space-y-3 border-t border-stone-100 pt-5" aria-labelledby="more-nearby-heading">
                  <h2 id="more-nearby-heading" className="font-display text-xl font-bold text-[#FF6F61]">
                    {similarHomesHeading}
                  </h2>
                  <p className="text-xs text-stone-500">Approximate distances shown — straight-line, not driving time.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nearbyListings.map((p) => (
                      <PropertyCard key={p.id} property={p} />
                    ))}
                  </div>
                </section>
              )}

              <div className="border-t border-stone-100 pt-5">
                <Link
                  to="/listings"
                  className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <span aria-hidden>←</span> Back to all listings
                </Link>
              </div>
            </div>

            <aside className="order-1 lg:order-2 w-full min-w-0">
              <div ref={bookingCardRef} className="lg:sticky lg:top-28">
                <div className="hidden md:block rounded-2xl bg-white border border-stone-200 shadow-md p-5 sm:p-6">
                  <div className="pb-4 border-b border-stone-100">
                    <p className={`${sectionLabelClass} mb-1.5`}>From</p>
                    <p className="font-display text-4xl sm:text-[2.75rem] font-bold text-[#FF6F61] tracking-tight">
                      ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-lg sm:text-xl font-semibold text-stone-500 font-sans"> / week</span>
                    </p>
                  </div>

                  <div className="py-4 space-y-2.5 border-b border-stone-100">
                    {property.bond != null && Number(property.bond) > 0 && (
                      <SidebarRow label="Bond">{`$${Number(property.bond).toLocaleString()}`}</SidebarRow>
                    )}
                    {property.lease_length?.trim() && (
                      <SidebarRow label="Lease">{property.lease_length.trim()}</SidebarRow>
                    )}
                    {availableFormatted && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="shrink-0 text-stone-500">Available</span>
                        <span className="text-right font-medium text-[#FF6F61] tabular-nums">{availableFormatted}</span>
                      </div>
                    )}
                    {roomLabel && <SidebarRow label="Type">{roomLabel}</SidebarRow>}
                  </div>

                  <div className="pt-4 pb-4 border-b border-stone-100">
                    <p className={`${sectionLabelClass} mb-2.5`}>Listed by</p>
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

                  <div className="pt-4 flex flex-col gap-3">
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
                    ) : listingIsBooked ? (
                      <div className="flex w-full items-center justify-center rounded-xl border border-stone-200 bg-stone-100 py-3.5 text-sm font-semibold text-stone-600 tracking-wide">
                        Currently unavailable
                      </div>
                    ) : showActiveBookingLink ? (
                      <div className="rounded-xl border border-[#FF6F61]/20 bg-[#FEF9E4] px-4 py-4 text-center space-y-3">
                        <p className="text-sm font-medium text-stone-800 leading-snug">
                          You have an active booking request for this property.
                        </p>
                        <Link
                          to="/student-dashboard?tab=bookings"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold tracking-wide hover:bg-[#e85d52] transition-colors shadow-sm"
                        >
                          View your booking
                        </Link>
                      </div>
                    ) : (
                      <>
                        <Link
                          to={bookHref}
                          state={bookState}
                          className="flex w-full items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold tracking-wide hover:bg-[#e85d52] transition-colors shadow-sm"
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

                  <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-500">
                    <p className="flex gap-2">
                      <span className="text-[#FF6F61] font-semibold" aria-hidden>
                        ✓
                      </span>
                      Verified listing
                    </p>
                    <p className="flex gap-2">
                      <span className="text-[#FF6F61] font-semibold" aria-hidden>
                        ✓
                      </span>
                      Secure payments via Quni
                    </p>
                    <p className="flex gap-2">
                      <span className="text-[#FF6F61] font-semibold" aria-hidden>
                        ✓
                      </span>
                      Support available 7 days
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ChatEmbed
                  defaultOpen={false}
                  listingContext={{ propertyId: property.id, sourcePage: 'property_detail' }}
                />
              </div>
            </aside>
          </div>
        </div>
      )}

      {!isPreview && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-stone-200 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3"
          role="region"
          aria-label="Book this listing"
        >
          <p className="font-display text-lg font-bold text-[#FF6F61] tabular-nums shrink-0">
            ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-sm font-semibold text-stone-500 font-sans"> / week</span>
          </p>
          {role === 'student' && !studentListingActionsOk ? (
            <Link
              to="/onboarding/student"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#e85d52] shrink-0"
            >
              Complete profile
            </Link>
          ) : listingIsBooked ? (
            <span className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-600 text-xs font-semibold px-3 py-2.5 shrink-0 max-w-[55%] text-center leading-snug">
              Unavailable
            </span>
          ) : showActiveBookingLink ? (
            <Link
              to="/student-dashboard?tab=bookings"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#e85d52] shadow-sm shrink-0"
            >
              Your booking →
            </Link>
          ) : (
            <Link
              to={bookHref}
              state={bookState}
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#e85d52] shadow-sm shrink-0"
            >
              Request to book →
            </Link>
          )}
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
