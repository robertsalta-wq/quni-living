import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Seo from '../../components/Seo'
import PageHeroBand from '../../components/PageHeroBand'
import { PropertyCard } from '../../components/PropertyCard'
import LandlordCtaBand from '../../components/seo/LandlordCtaBand'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { Property } from '../../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../../lib/propertyCardSelect'
import { fetchPropertiesByIds, rpcPropertiesNearCampus } from '../../lib/propertiesNearCampusRpc'
import { absoluteUrl, SITE_URL } from '../../lib/site'
import { campusUrlSlug } from '../../lib/slug'
import {
  approxBoundingBoxKm,
  campusLatLonFromRow,
  fetchCampusesForUniversityId,
  geoPointFromPropertyRow,
  haversineKm,
  universityShortLabel,
  type CampusReferenceRow,
  type UniversityReferenceRow,
} from '../../lib/universityCampusReference'
import { resolveUniversitySlugParam } from '../../lib/universitySlugAliases'

function Breadcrumbs(props: {
  items: { label: string; to?: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
      <ol className="flex flex-wrap items-center gap-2">
        {props.items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2 min-w-0">
            {i > 0 && (
              <span className="text-gray-300" aria-hidden>
                {'>'}
              </span>
            )}
            {item.to ? (
              <Link to={item.to} className="text-indigo-600 hover:underline truncate">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium truncate">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default function CampusAccommodation() {
  const { universitySlug, campusSlug: campusSlugParam } = useParams<{
    universitySlug: string
    campusSlug: string
  }>()
  const routeUniSlug = (universitySlug ?? '').trim().toLowerCase()
  const uniSlugForQuery = resolveUniversitySlugParam(routeUniSlug)
  const campusSlug = (campusSlugParam ?? '').trim().toLowerCase()

  const [university, setUniversity] = useState<UniversityReferenceRow | null>(null)
  const [campus, setCampus] = useState<CampusReferenceRow | null>(null)
  const [siblingCampuses, setSiblingCampuses] = useState<CampusReferenceRow[]>([])
  const [exactListings, setExactListings] = useState<Property[]>([])
  const [nearbyListings, setNearbyListings] = useState<Property[]>([])
  const [suburbsFromListings, setSuburbsFromListings] = useState<string[]>([])
  const [minRent, setMinRent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !routeUniSlug || !campusSlug) {
      setLoading(false)
      if (!routeUniSlug || !campusSlug) setNotFound(true)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      setUniversity(null)
      setCampus(null)
      setSiblingCampuses([])
      setExactListings([])
      setNearbyListings([])
      setSuburbsFromListings([])
      setMinRent(null)

      const { data: uRow, error: uErr } = await supabase
        .from('universities')
        .select('id, name, slug, short_name, city, state')
        .eq('slug', uniSlugForQuery)
        .maybeSingle()

      if (cancelled) return
      if (uErr || !uRow) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const u = uRow as UniversityReferenceRow
      setUniversity(u)

      const allCampuses = await fetchCampusesForUniversityId(u.id, u.slug)
      const match = allCampuses.find((c) => campusUrlSlug(c).toLowerCase() === campusSlug)

      if (cancelled) return
      if (!match) {
        setNotFound(true)
        setCampus(null)
        setSiblingCampuses([])
        setLoading(false)
        return
      }

      setCampus(match)
      setSiblingCampuses(allCampuses.filter((c) => c.id !== match.id))

      const campusSub = match.suburb?.trim()
      const { data: byCampusId, error: pErr1 } = await supabase
        .from('properties')
        .select(PROPERTY_CARD_LIST_SELECT)
        .eq('campus_id', match.id)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12)

      const exact = (byCampusId ?? []) as Property[]
      const exactIds = new Set(exact.map((p) => p.id))
      const campusPt = campusLatLonFromRow(match)

      let pErr2: typeof pErr1 = null
      let pErr3: typeof pErr1 = null
      const geoNearby: Property[] = []

      const remainingAfterExact = 12 - exact.length
      if (remainingAfterExact > 0 && campusPt) {
        const { data: nearRows, error: rpcErr } = await rpcPropertiesNearCampus(
          supabase,
          campusPt.lat,
          campusPt.lon,
          5,
        )
        if (!rpcErr && nearRows) {
          const orderedIds = nearRows
            .filter((r) => !exactIds.has(r.id))
            .slice(0, remainingAfterExact)
            .map((r) => r.id)
          const { data: props, error: fetchErr } = await fetchPropertiesByIds(
            supabase,
            orderedIds,
            PROPERTY_CARD_LIST_SELECT,
          )
          if (fetchErr) {
            console.error(fetchErr)
          } else {
            const byId = new Map((props as Property[]).map((p) => [p.id, p]))
            for (const id of orderedIds) {
              const p = byId.get(id)
              if (p) geoNearby.push(p)
            }
          }
        } else {
          if (rpcErr) console.warn('[Quni] properties_near_campus RPC:', rpcErr.message)
          const box = approxBoundingBoxKm(campusPt.lat, campusPt.lon, 5.5)
          const r = await supabase
            .from('properties')
            .select(PROPERTY_CARD_LIST_SELECT)
            .eq('status', 'active')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .gte('latitude', box.minLat)
            .lte('latitude', box.maxLat)
            .gte('longitude', box.minLon)
            .lte('longitude', box.maxLon)
            .limit(400)
          if (r.error) pErr2 = r.error
          else {
            const withDist = ((r.data ?? []) as Property[])
              .filter((p) => !exactIds.has(p.id))
              .map((p) => {
                const pt = geoPointFromPropertyRow(p)
                if (!pt) return null
                const d = haversineKm(campusPt, pt)
                if (d > 5) return null
                return { p, d }
              })
              .filter(Boolean) as { p: Property; d: number }[]

            withDist.sort((a, b) => a.d - b.d)
            for (const { p } of withDist) {
              if (geoNearby.length >= remainingAfterExact) break
              geoNearby.push(p)
            }
          }
        }
      }

      const geoIds = new Set(geoNearby.map((p) => p.id))
      const suburbNearby: Property[] = []
      const remainingAfterGeo = 12 - exact.length - geoNearby.length

      if (remainingAfterGeo > 0 && campusSub && u.id) {
        const r = await supabase
          .from('properties')
          .select(PROPERTY_CARD_LIST_SELECT)
          .eq('status', 'active')
          .is('campus_id', null)
          .ilike('suburb', campusSub)
          .eq('university_id', u.id)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(12)
        if (r.error) pErr3 = r.error
        else {
          const rows = ((r.data ?? []) as Property[]).filter(
            (p) => !exactIds.has(p.id) && !geoIds.has(p.id),
          )
          rows.sort((a, b) => {
            const fa = a.featured ? 1 : 0
            const fb = b.featured ? 1 : 0
            if (fb !== fa) return fb - fa
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          suburbNearby.push(...rows.slice(0, remainingAfterGeo))
        }
      }

      if (cancelled) return
      const pErr = pErr1 || pErr2 || pErr3
      if (pErr) {
        console.error(pErr)
        setExactListings([])
        setNearbyListings([])
        setSuburbsFromListings([])
        setMinRent(null)
      } else {
        const nearby = [...geoNearby, ...suburbNearby]
        setExactListings(exact)
        setNearbyListings(nearby)
        const rows = [...exact, ...nearby]
        const subs = new Set<string>()
        for (const p of rows) {
          const s = p.suburb?.trim()
          if (s) subs.add(s)
        }
        const ms = match.suburb?.trim()
        if (ms) subs.add(ms)
        setSuburbsFromListings(Array.from(subs).sort((a, b) => a.localeCompare(b)))
        const rents = rows.map((p) => Number(p.rent_per_week)).filter((n) => Number.isFinite(n) && n > 0)
        setMinRent(rents.length ? Math.min(...rents) : null)
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [routeUniSlug, uniSlugForQuery, campusSlug])

  const shortLabel = university ? universityShortLabel(university) : ''
  const suburb = campus?.suburb?.trim() ?? 'this area'
  const state = campus?.state?.trim() || university?.state?.trim() || ''

  const metaDescription =
    university && campus
      ? `Find student rooms and houses near ${campus.name} in ${suburb}. Verified listings for ${shortLabel} students${
          minRent != null ? ` from $${minRent}/week` : ''
        }.`
      : 'Campus accommodation guide on Quni Living.'

  const canonicalPath =
    university && campus
      ? `/student-accommodation/${university.slug}/${campusUrlSlug(campus)}`
      : '/student-accommodation'

  const jsonLd =
    university && campus
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `Student Accommodation near ${campus.name}, ${shortLabel}`,
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
              {
                '@type': 'ListItem',
                position: 3,
                name: university.name,
                item: absoluteUrl(`/student-accommodation/${university.slug}`),
              },
              { '@type': 'ListItem', position: 4, name: campus.name },
            ],
          },
        }
      : undefined

  const aboutCampusCount = siblingCampuses.length + 1

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 px-4 py-16">
        <Seo title="Campus accommodation" description={metaDescription} canonicalPath={canonicalPath} noindex />
        <p className="text-gray-600">Configure Supabase to view this guide.</p>
      </div>
    )
  }

  if (!loading && notFound) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <Seo title="Campus not found" description="This campus guide is not available." noindex />
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

  if (university && campus && routeUniSlug !== university.slug.toLowerCase()) {
    return (
      <Navigate
        replace
        to={`/student-accommodation/${university.slug}/${campusUrlSlug(campus)}`}
      />
    )
  }

  const listingsQueryAll = campus ? `/listings?campus_id=${encodeURIComponent(campus.id)}` : '/listings'

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      {university && campus && (
        <Seo
          title={`Student Accommodation near ${campus.name}, ${shortLabel}`}
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
          ) : university && campus ? (
            <>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Student Accommodation near {campus.name}
              </h1>
              <p className="text-white/85 text-sm sm:text-base mt-2 max-w-2xl">
                {suburb}
                {state ? `, ${state}` : ''} — Properties for {shortLabel} students
              </p>
            </>
          ) : null
        }
      />

      <div className="max-w-site mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {!loading && university && campus && (
          <>
            <Breadcrumbs
              items={[
                { label: 'Home', to: '/' },
                { label: 'Student Accommodation', to: '/student-accommodation' },
                { label: university.name, to: `/student-accommodation/${university.slug}` },
                { label: campus.name },
              ]}
            />

            <section aria-labelledby="campus-listings-heading">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 id="campus-listings-heading" className="font-display text-xl font-bold text-gray-900">
                  Listings near this campus
                </h2>
                <Link
                  to={listingsQueryAll}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                >
                  View all →
                </Link>
              </div>
              {exactListings.length === 0 && nearbyListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <p className="text-gray-700 font-medium">No listings yet — check back soon</p>
                  <p className="text-sm text-gray-500 mt-2">Get notified when properties go live near {campus.name}.</p>
                  <Link
                    to="/contact"
                    className="inline-flex mt-4 rounded-xl bg-[#FF6F61] text-white font-semibold text-sm px-5 py-2.5 hover:bg-[#e85a4f]"
                  >
                    Join the waitlist
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {exactListings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {exactListings.map((p) => (
                        <PropertyCard key={p.id} property={p} />
                      ))}
                    </div>
                  )}
                  {nearbyListings.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Also nearby</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {nearbyListings.map((p) => (
                          <PropertyCard key={p.id} property={p} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm" aria-labelledby="about-campus-heading">
              <h2 id="about-campus-heading" className="font-display text-xl font-bold text-gray-900">
                About this campus
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                {campus.name} is located in {suburb}
                {state ? `, ${state}` : ''} and is one of {university.name}&apos;s {aboutCampusCount} campus
                {aboutCampusCount !== 1 ? 'es' : ''}. Students looking for accommodation near {campus.name}{' '}
                typically search in {suburb} and surrounding areas.
              </p>
            </section>

            {suburbsFromListings.length > 0 && (
              <section aria-labelledby="nearby-suburbs-heading">
                <h2 id="nearby-suburbs-heading" className="font-display text-xl font-bold text-gray-900 mb-4">
                  Nearby suburbs
                </h2>
                <div className="flex flex-wrap gap-2">
                  {suburbsFromListings.map((s) => (
                    <Link
                      key={s}
                      to={`/listings?suburb=${encodeURIComponent(s)}&campus_id=${encodeURIComponent(campus.id)}`}
                      className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-800 transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {siblingCampuses.length > 0 && (
              <section aria-labelledby="related-campuses-heading">
                <h2 id="related-campuses-heading" className="font-display text-xl font-bold text-gray-900 mb-4">
                  Other {shortLabel} campuses
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siblingCampuses.map((c) => (
                    <Link
                      key={c.id}
                      to={`/student-accommodation/${university.slug}/${campusUrlSlug(c)}`}
                      className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {c.suburb ?? 'Suburb TBC'}
                        {c.state ? `, ${c.state}` : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <LandlordCtaBand universityName={university.name} />
          </>
        )}
      </div>
    </div>
  )
}
