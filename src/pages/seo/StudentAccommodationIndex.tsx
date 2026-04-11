import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../../components/Seo'
import PageHeroBand from '../../components/PageHeroBand'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import {
  AU_STATE_ORDER,
  geoPointFromPropertyRow,
  groupUniversitiesByState,
  minDistanceKmToCampuses,
  normUuid,
  type CampusReferenceRow,
  type UniversityReferenceRow,
} from '../../lib/universityCampusReference'
import { useUniversityCampusReference } from '../../hooks/useUniversityCampusReference'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../../lib/propertyListingDateWindow'

function propertyMatchesUniversityForCount(
  p: {
    university_id: string | null
    suburb?: string | null
    latitude?: number | null
    longitude?: number | null
  },
  u: UniversityReferenceRow,
  uCampuses: CampusReferenceRow[],
): boolean {
  const uid = normUuid(u.id)
  const pUni = normUuid(p.university_id ?? '')
  if (pUni && pUni === uid) return true

  const pt = geoPointFromPropertyRow(p)
  if (pt && uCampuses.length > 0) {
    const d = minDistanceKmToCampuses(pt, uCampuses)
    if (d != null && d <= 10) return true
  }

  if (!p.university_id) {
    const sub = p.suburb?.trim().toLowerCase()
    if (sub) {
      for (const c of uCampuses) {
        if ((c.suburb?.trim().toLowerCase() ?? '') === sub) return true
      }
    }
  }
  return false
}

export default function StudentAccommodationIndex() {
  const navigate = useNavigate()
  const { universities, campuses, loading: uniLoading, error: uniError } = useUniversityCampusReference()
  const [listingCountByUniversity, setListingCountByUniversity] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState(isSupabaseConfigured)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCountsLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setCountsLoading(true)
      const { data, error } = await applyPropertyListingDateWindow(
        supabase.from('properties').select('university_id, suburb, latitude, longitude'),
        listingIsoDateUtc(),
      ).eq('status', 'active')
      if (cancelled) return
      if (error) {
        console.error(error)
        setListingCountByUniversity({})
      } else {
        const campusesByUni = new Map<string, CampusReferenceRow[]>()
        for (const c of campuses) {
          const uid = normUuid(c.university_id ?? '')
          if (!uid) continue
          if (!campusesByUni.has(uid)) campusesByUni.set(uid, [])
          campusesByUni.get(uid)!.push(c)
        }

        const rows = (data ?? []) as {
          university_id: string | null
          suburb?: string | null
          latitude?: number | null
          longitude?: number | null
        }[]

        const map: Record<string, number> = {}
        for (const u of universities) {
          const key = normUuid(u.id)
          if (!key) continue
          const uCampuses = campusesByUni.get(key) ?? []
          let n = 0
          for (const p of rows) {
            if (propertyMatchesUniversityForCount(p, u, uCampuses)) n++
          }
          map[key] = n
        }
        setListingCountByUniversity(map)
      }
      setCountsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [campuses, universities])

  const byState = useMemo(() => groupUniversitiesByState(universities), [universities])

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = searchQ.trim()
    if (q) navigate(`/listings?q=${encodeURIComponent(q)}`)
    else navigate('/listings')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <Seo
          title="Student Accommodation Australia"
          description="Find student accommodation near Australian universities. Verified listings near USYD, UNSW, UTS, Monash, UQ and more. Browse rooms, studios and shared houses."
          canonicalPath="/student-accommodation"
        />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Student accommodation</h1>
          <p className="text-gray-600">
            Connect Supabase in <code className="text-sm bg-gray-100 px-1 rounded">.env.local</code> to browse
            universities and listing counts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <Seo
        title="Student Accommodation Australia"
        description="Find student accommodation near Australian universities. Verified listings near USYD, UNSW, UTS, Monash, UQ and more. Browse rooms, studios and shared houses."
        canonicalPath="/student-accommodation"
      />

      <PageHeroBand
        title="Student Accommodation in Australia"
        subtitle="Find verified rental properties near your university"
      />

      <div className="max-w-site mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <form
          onSubmit={onSearchSubmit}
          className="max-w-2xl mx-auto mb-10 flex flex-col sm:flex-row gap-3"
          role="search"
          aria-label="Search listings"
        >
          <label htmlFor="seo-index-search" className="sr-only">
            Search suburbs or keywords
          </label>
          <input
            id="seo-index-search"
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by suburb or keyword…"
            className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#FF6F61] text-white font-semibold text-sm px-6 py-3 shadow-sm hover:bg-[#e85a4f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6F61]"
          >
            Search listings
          </button>
        </form>

        {uniError && (
          <p className="text-sm text-red-600 mb-6" role="alert">
            {uniError}
          </p>
        )}

        {(uniLoading || countsLoading) && (
          <div className="space-y-8 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-28 bg-gray-200 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!uniLoading && !countsLoading && (
          <div className="space-y-10">
            {AU_STATE_ORDER.map((state) => {
              const list = byState.get(state)
              if (!list?.length) return null
              return (
                <section key={state} aria-labelledby={`state-${state}`}>
                  <h2 id={`state-${state}`} className="font-display text-lg font-bold text-gray-900 mb-4">
                    {state}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((u) => {
                      const n = listingCountByUniversity[normUuid(u.id)] ?? 0
                      return (
                        <Link
                          key={u.id}
                          to={`/student-accommodation/${u.slug}`}
                          className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <h3 className="font-semibold text-gray-900 text-base">{u.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {[u.city, u.state].filter(Boolean).join(', ') || 'Australia'}
                          </p>
                          <p className="text-sm font-medium text-indigo-600 mt-3">
                            {n === 0
                              ? 'No listings yet — see guide'
                              : `${n} listing${n !== 1 ? 's' : ''} near this university`}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
            {(() => {
              const other = byState.get('Other')
              if (!other?.length) return null
              return (
                <section aria-labelledby="state-other">
                  <h2 id="state-other" className="font-display text-lg font-bold text-gray-900 mb-4">
                    Other
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {other.map((u) => {
                      const n = listingCountByUniversity[normUuid(u.id)] ?? 0
                      return (
                        <Link
                          key={u.id}
                          to={`/student-accommodation/${u.slug}`}
                          className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-gray-900 text-base">{u.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {[u.city, u.state].filter(Boolean).join(', ') || 'Australia'}
                          </p>
                          <p className="text-sm font-medium text-indigo-600 mt-3">
                            {n === 0
                              ? 'No listings yet — see guide'
                              : `${n} listing${n !== 1 ? 's' : ''} near this university`}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
