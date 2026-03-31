import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Seo from '../../components/Seo'
import PageHeroBand from '../../components/PageHeroBand'
import { PropertyCard } from '../../components/PropertyCard'
import LandlordCtaBand from '../../components/seo/LandlordCtaBand'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { Property } from '../../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../../lib/propertyCardSelect'
import { absoluteUrl, SITE_URL } from '../../lib/site'
import { campusUrlSlug } from '../../lib/slug'
import { fetchPropertiesByIds, fetchMinDistanceByPropertyIdForUniversityCampuses } from '../../lib/propertiesNearCampusRpc'
import { transportCardForAustralianState } from '../../lib/transportCard'
import {
  closestCampusByDistance,
  fetchCampusesForUniversityId,
  geoPointFromPropertyRow,
  minDistanceKmToCampuses,
  normUuid,
  universityShortLabel,
  unionBoundingBoxKmForCampuses,
  type CampusReferenceRow,
  type UniversityReferenceRow,
} from '../../lib/universityCampusReference'
import { resolveUniversitySlugParam } from '../../lib/universitySlugAliases'

/** Optional copy overrides per university (extend in `universityAreaGuides.ts` later). */
export type UniversityAreaGuideOverrides = {
  nearbySuburbs?: string[]
  averagePrivateRoomPerWeek?: number | null
  extraParagraph?: string
}

type LightProperty = {
  id: string
  campus_id: string | null
  rent_per_week: number | string | null
  room_type: string | null
  suburb: string | null
  university_id: string | null
  latitude?: number | null
  longitude?: number | null
}

function campusIdForListingStats(p: LightProperty, campuses: CampusReferenceRow[]): string | null {
  const pid = normUuid(p.campus_id ?? '')
  if (pid) {
    const c = campuses.find((x) => normUuid(x.id) === pid)
    if (c) return c.id
  }
  const sub = p.suburb?.trim().toLowerCase()
  if (sub) {
    const bySub = campuses.find((c) => (c.suburb?.trim().toLowerCase() ?? '') === sub)
    if (bySub) return bySub.id
  }
  const pt = geoPointFromPropertyRow(p)
  if (pt) {
    const close = closestCampusByDistance(pt, campuses)
    if (close && close.distanceKm <= 10) return close.campus.id
  }
  return null
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function AreaGuideBlock(props: {
  universityName: string
  shortLabel: string
  state: string
  nearbySuburbs: string[]
  averagePrivateRoomPerWeek: number | null
  transportCard: string | null
  extraParagraph?: string
}) {
  const suburbsText =
    props.nearbySuburbs.length > 0 ? props.nearbySuburbs.join(', ') : 'nearby suburbs'

  const transportBody = props.transportCard
    ? `${props.state} students can use ${props.transportCard} for discounted travel.`
    : 'Check your local operator for student and concession fares.'

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm" aria-labelledby="area-guide-heading">
      <h2 id="area-guide-heading" className="font-display text-xl font-bold text-gray-900">
        Living near {props.universityName}
      </h2>
      <div className="mt-4 text-sm sm:text-base text-gray-600 space-y-4 leading-relaxed">
        <p>
          {props.shortLabel} students typically look for accommodation in {suburbsText}.
          {props.averagePrivateRoomPerWeek != null ? (
            <>
              {' '}
              The average weekly rent for a private room near {props.shortLabel} is $
              {props.averagePrivateRoomPerWeek}/week.
            </>
          ) : (
            <> Weekly rents vary — browse live listings for current pricing.</>
          )}
        </p>
        <p>
          <span className="font-semibold text-gray-800">Popular suburbs for {props.shortLabel} students:</span>{' '}
          {suburbsText}.
        </p>
        <p>
          <span className="font-semibold text-gray-800">Getting around:</span> Most areas near{' '}
          {props.shortLabel} are well-served by public transport. {transportBody}
        </p>
        {props.extraParagraph ? <p>{props.extraParagraph}</p> : null}
      </div>
    </section>
  )
}

export default function UniversityAccommodation({
  areaGuideOverrides,
}: {
  areaGuideOverrides?: UniversityAreaGuideOverrides
}) {
  const { universitySlug } = useParams<{ universitySlug: string }>()
  const routeSlug = (universitySlug ?? '').trim().toLowerCase()
  const slugForQuery = resolveUniversitySlugParam(routeSlug)

  const [university, setUniversity] = useState<UniversityReferenceRow | null>(null)
  const [campuses, setCampuses] = useState<CampusReferenceRow[]>([])
  const [lightListings, setLightListings] = useState<LightProperty[]>([])
  const [featuredExact, setFeaturedExact] = useState<Property[]>([])
  const [featuredNearby, setFeaturedNearby] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !routeSlug) {
      setLoading(false)
      if (!routeSlug) setNotFound(true)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setFetchError(null)
      setNotFound(false)
      setUniversity(null)
      setCampuses([])
      setLightListings([])
      setFeaturedExact([])
      setFeaturedNearby([])

      const { data: uRow, error: uErr } = await supabase
        .from('universities')
        .select('id, name, slug, short_name, city, state')
        .eq('slug', slugForQuery)
        .maybeSingle()

      if (cancelled) return
      if (uErr || !uRow) {
        setNotFound(true)
        setUniversity(null)
        setLoading(false)
        return
      }

      const u = uRow as UniversityReferenceRow
      setUniversity(u)

      const camps = await fetchCampusesForUniversityId(u.id, u.slug)
      if (cancelled) return
      setCampuses(camps)

      const campusSuburbs = [
        ...new Set(
          camps.map((c) => c.suburb?.trim()).filter((s): s is string => Boolean(s)),
        ),
      ]

      const lightSelect =
        'id, campus_id, rent_per_week, room_type, suburb, university_id, latitude, longitude'

      const { data: lightByUni, error: lErr1 } = await supabase
        .from('properties')
        .select(lightSelect)
        .eq('university_id', u.id)
        .eq('status', 'active')

      const seenLight = new Set<string>()
      const mergedLight: LightProperty[] = []
      for (const row of (lightByUni ?? []) as LightProperty[]) {
        if (!seenLight.has(row.id)) {
          seenLight.add(row.id)
          mergedLight.push(row)
        }
      }

      let geoDistMap = new Map<string, number>()
      let lErr2: typeof lErr1 = null

      const { map: rpcDistMap, error: rpcGeoErr } = await fetchMinDistanceByPropertyIdForUniversityCampuses(
        supabase,
        camps,
        10,
      )

      if (!rpcGeoErr) {
        geoDistMap = rpcDistMap
      } else {
        console.warn('[Quni] properties_near_campus RPC:', rpcGeoErr.message)
        const uniBox = unionBoundingBoxKmForCampuses(camps, 11)
        if (uniBox) {
          const { data: lightInBox, error: geoErr } = await supabase
            .from('properties')
            .select(lightSelect)
            .eq('status', 'active')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .gte('latitude', uniBox.minLat)
            .lte('latitude', uniBox.maxLat)
            .gte('longitude', uniBox.minLon)
            .lte('longitude', uniBox.maxLon)
            .limit(900)
          lErr2 = geoErr
          if (!geoErr && lightInBox) {
            for (const row of lightInBox as LightProperty[]) {
              const pt = geoPointFromPropertyRow(row)
              if (!pt) continue
              const d = minDistanceKmToCampuses(pt, camps)
              if (d == null || d > 10) continue
              geoDistMap.set(row.id, d)
            }
          }
        }
      }

      if (!lErr2 && geoDistMap.size > 0) {
        const sortedIds = [...geoDistMap.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
        const idsToAdd = sortedIds.filter((id) => !seenLight.has(id))
        const { data: lightGeoRows, error: fetchErr } = await fetchPropertiesByIds(
          supabase,
          idsToAdd,
          lightSelect,
        )
        if (fetchErr) {
          console.error(fetchErr)
        } else {
          const rowById = new Map((lightGeoRows as LightProperty[]).map((r) => [r.id, r]))
          for (const id of sortedIds) {
            if (seenLight.has(id)) continue
            const row = rowById.get(id)
            if (row) {
              seenLight.add(id)
              mergedLight.push(row)
            }
          }
        }
      }

      const lightBySuburbQueries =
        campusSuburbs.length > 0
          ? await Promise.all(
              campusSuburbs.slice(0, 20).map((sub) =>
                supabase
                  .from('properties')
                  .select(lightSelect)
                  .eq('status', 'active')
                  .is('university_id', null)
                  .ilike('suburb', sub),
              ),
            )
          : []

      if (cancelled) return

      const lErr3 = lightBySuburbQueries.find((r) => r.error)?.error
      const lErr = lErr1 || lErr2 || lErr3

      for (const r of lightBySuburbQueries) {
        for (const row of (r.data ?? []) as LightProperty[]) {
          if (seenLight.has(row.id)) continue
          seenLight.add(row.id)
          mergedLight.push(row)
        }
      }

      if (lErr) {
        console.error(lErr)
        setFetchError('Could not load listing stats.')
        setLightListings([])
      } else {
        setLightListings(mergedLight)
      }

      const sortFeat = (a: Property, b: Property) => {
        const fa = a.featured ? 1 : 0
        const fb = b.featured ? 1 : 0
        if (fb !== fa) return fb - fa
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      const { data: featByUni, error: fErr1 } = await supabase
        .from('properties')
        .select(PROPERTY_CARD_LIST_SELECT)
        .eq('university_id', u.id)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12)

      let fErr = fErr1
      const exactFeatPool = ((featByUni ?? []) as Property[]) ?? []
      exactFeatPool.sort(sortFeat)
      const exactFeatIds = new Set(exactFeatPool.map((p) => p.id))
      const exactShown = exactFeatPool.slice(0, 6)

      let geoFeatPool: Property[] = []
      if (!fErr && geoDistMap.size > 0) {
        const sortedFeatIds = [...geoDistMap.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
        const idsToFetch = sortedFeatIds.filter((id) => !exactFeatIds.has(id))
        const { data: featGeoRows, error: featFetchErr } = await fetchPropertiesByIds(
          supabase,
          idsToFetch,
          PROPERTY_CARD_LIST_SELECT,
        )
        if (featFetchErr) {
          console.error(featFetchErr)
        } else {
          const byId = new Map((featGeoRows as Property[]).map((p) => [p.id, p]))
          for (const id of sortedFeatIds) {
            if (exactFeatIds.has(id)) continue
            const p = byId.get(id)
            if (p) geoFeatPool.push(p)
          }
          geoFeatPool.sort(sortFeat)
        }
      }

      const geoFeatIds = new Set(geoFeatPool.map((p) => p.id))
      let suburbFeatPool: Property[] = []
      if (!fErr && campusSuburbs.length > 0) {
        const seenSuburb = new Set<string>([...exactFeatIds, ...geoFeatIds])
        for (const sub of campusSuburbs) {
          const { data: extra, error: fErrSub } = await supabase
            .from('properties')
            .select(PROPERTY_CARD_LIST_SELECT)
            .eq('status', 'active')
            .is('university_id', null)
            .ilike('suburb', sub)
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(12)
          if (fErrSub) {
            fErr = fErrSub
            break
          }
          for (const p of (extra ?? []) as Property[]) {
            if (seenSuburb.has(p.id)) continue
            seenSuburb.add(p.id)
            suburbFeatPool.push(p)
          }
        }
        suburbFeatPool.sort(sortFeat)
      }

      if (cancelled) return
      if (fErr) {
        console.error(fErr)
        setFeaturedExact([])
        setFeaturedNearby([])
      } else {
        const maxTotal = 6
        const needNearby = Math.max(0, maxTotal - exactShown.length)
        const nearbyMerged: Property[] = []
        const seenN = new Set<string>()
        for (const p of geoFeatPool) {
          if (seenN.has(p.id)) continue
          seenN.add(p.id)
          nearbyMerged.push(p)
        }
        for (const p of suburbFeatPool) {
          if (seenN.has(p.id)) continue
          seenN.add(p.id)
          nearbyMerged.push(p)
        }
        setFeaturedExact(exactShown)
        setFeaturedNearby(nearbyMerged.slice(0, needNearby))
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [routeSlug, slugForQuery])

  const shortLabel = university ? universityShortLabel(university) : ''
  const city = university?.city?.trim() || 'Australia'
  const state = university?.state?.trim() || ''

  const stats = useMemo(() => {
    const rents = lightListings
      .map((p) => Number(p.rent_per_week))
      .filter((n) => Number.isFinite(n) && n > 0)
    const privateRents = lightListings
      .filter((p) => p.room_type === 'single')
      .map((p) => Number(p.rent_per_week))
      .filter((n) => Number.isFinite(n) && n > 0)

    const minRent = rents.length ? Math.min(...rents) : null
    const avgPrivate = mean(privateRents.length ? privateRents : rents)

    const byCampus: Record<string, number> = {}
    for (const p of lightListings) {
      const cid = campusIdForListingStats(p, campuses)
      if (!cid) continue
      byCampus[cid] = (byCampus[cid] ?? 0) + 1
    }

    return {
      propertyCount: lightListings.length,
      campusCount: campuses.length,
      minRent,
      avgPrivate,
      byCampus,
    }
  }, [lightListings, campuses])

  const suburbsFromCampuses = useMemo(() => {
    const set = new Set<string>()
    for (const c of campuses) {
      const s = c.suburb?.trim()
      if (s) set.add(s)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [campuses])

  const mergedSuburbs = areaGuideOverrides?.nearbySuburbs?.length
    ? areaGuideOverrides.nearbySuburbs
    : suburbsFromCampuses

  const mergedAvgPrivate =
    areaGuideOverrides?.averagePrivateRoomPerWeek !== undefined
      ? areaGuideOverrides.averagePrivateRoomPerWeek
      : stats.avgPrivate

  const campusNamesShort = useMemo(() => {
    if (!campuses.length) return ''
    const names = campuses.slice(0, 4).map((c) => c.name)
    if (campuses.length > 4) names.push('more')
    return names.join(', ')
  }, [campuses])

  const metaDescription = university
    ? `Find student accommodation near ${university.name} in ${city}. Browse verified rooms, studios and shared houses${
        stats.minRent != null ? ` from $${stats.minRent}/week` : ''
      }. ${campusNamesShort ? `${campusNamesShort}.` : ''}`.trim()
    : 'Student accommodation guides on Quni Living.'

  const canonicalPath = university
    ? `/student-accommodation/${university.slug}`
    : `/student-accommodation/${slugForQuery || routeSlug}`

  const jsonLd = university
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Student Accommodation near ${university.name}`,
        description: metaDescription,
        url: `${SITE_URL}${canonicalPath}`,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Student Accommodation',
              item: absoluteUrl('/student-accommodation'),
            },
            { '@type': 'ListItem', position: 3, name: university.name },
          ],
        },
      }
    : undefined

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-4 py-16">
        <Seo title="Student accommodation" description={metaDescription} canonicalPath={canonicalPath} noindex />
        <p className="text-gray-600 max-w-xl">Configure Supabase to view this guide.</p>
      </div>
    )
  }

  if (!loading && notFound) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <Seo title="University not found" description="This university guide is not available." noindex />
        <div className="max-w-site mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="text-gray-600 mt-2">
            <Link to="/student-accommodation" className="text-indigo-600 font-medium hover:underline">
              Browse all universities
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const transportCard = transportCardForAustralianState(state)

  if (university && routeSlug !== university.slug.toLowerCase()) {
    return <Navigate replace to={`/student-accommodation/${university.slug}`} />
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      {university && (
        <Seo
          title={`Student Accommodation near ${university.name}`}
          description={metaDescription}
          canonicalPath={canonicalPath}
          jsonLd={jsonLd}
        />
      )}

      <PageHeroBand
        children={
          loading ? (
            <>
              <div className="h-9 w-2/3 max-w-md bg-white/20 rounded-lg animate-pulse" />
              <div className="h-4 w-1/2 max-w-sm bg-white/15 rounded mt-3 animate-pulse" />
            </>
          ) : university ? (
            <>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Student Accommodation near {university.name}
              </h1>
              <p className="text-white/85 text-sm sm:text-base mt-2 max-w-2xl">
                {city}
                {state ? `, ${state}` : ''} — Verified listings for {shortLabel} students
              </p>
            </>
          ) : null
        }
      />

      <div className="max-w-site mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {fetchError && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" role="status">
            {fetchError}
          </p>
        )}

        {!loading && university && (
          <>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <span className="font-medium">
                {stats.propertyCount} propert{stats.propertyCount !== 1 ? 'ies' : 'y'} available
              </span>
              <span className="text-gray-300 hidden sm:inline" aria-hidden>
                |
              </span>
              <span>
                {stats.campusCount} campus{stats.campusCount !== 1 ? 'es' : ''}
              </span>
              <span className="text-gray-300 hidden sm:inline" aria-hidden>
                |
              </span>
              <span>
                {stats.minRent != null
                  ? `From $${stats.minRent}/week`
                  : 'Pricing available on listings'}
              </span>
            </div>

            <section aria-labelledby="campuses-heading">
              <h2 id="campuses-heading" className="font-display text-xl font-bold text-gray-900 mb-4">
                Campuses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campuses.map((c) => {
                  const count = stats.byCampus[c.id] ?? 0
                  const pathSlug = campusUrlSlug(c)
                  return (
                    <Link
                      key={c.id}
                      to={`/student-accommodation/${university.slug}/${pathSlug}`}
                      className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {c.suburb ?? 'Suburb TBC'}
                        {c.state ? `, ${c.state}` : ''}
                      </p>
                      <p className="text-sm font-medium text-indigo-600 mt-3">
                        {count === 0 ? 'No listings yet' : `${count} listing${count !== 1 ? 's' : ''} near campus`}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>

            <section aria-labelledby="featured-heading">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 id="featured-heading" className="font-display text-xl font-bold text-gray-900">
                  Featured listings
                </h2>
                <Link
                  to={`/listings?uni=${encodeURIComponent(university.slug)}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View all →
                </Link>
              </div>
              {featuredExact.length === 0 && featuredNearby.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <p className="text-gray-700 font-medium">No listings yet — check back soon</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Want updates when rooms go live near {university.name}?
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex mt-4 rounded-xl bg-[#FF6F61] text-white font-semibold text-sm px-5 py-2.5 hover:bg-[#e85a4f]"
                  >
                    Join the waitlist
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {featuredExact.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {featuredExact.map((p) => (
                        <PropertyCard key={p.id} property={p} />
                      ))}
                    </div>
                  )}
                  {featuredNearby.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Also nearby</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {featuredNearby.map((p) => (
                          <PropertyCard key={p.id} property={p} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <AreaGuideBlock
              universityName={university.name}
              shortLabel={shortLabel}
              state={state || 'your state'}
              nearbySuburbs={mergedSuburbs}
              averagePrivateRoomPerWeek={mergedAvgPrivate}
              transportCard={transportCard}
              extraParagraph={areaGuideOverrides?.extraParagraph}
            />

            <LandlordCtaBand universityName={university.name} />
          </>
        )}
      </div>
    </div>
  )
}
