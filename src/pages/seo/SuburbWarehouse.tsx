import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Seo from '../../components/Seo'
import { PropertyCard } from '../../components/PropertyCard'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { escapeIlikePattern, type Property } from '../../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../../lib/propertyCardSelect'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../../lib/propertyListingDateWindow'
import { SITE_CONTENT_MAX_CLASS } from '../../lib/site'
import { isValidStateSlug, STATE_ABBREV, STATE_SLUGS, slugToSuburb } from '../../lib/seoHelpers'
import {
  precinctBlurbKey,
  WAREHOUSE_NEARBY_SUBURBS,
  WAREHOUSE_PRECINCT_BLURBS,
  warehousingSuburbPath,
} from '../../lib/warehousePrecincts'

const PW_SITE = 'Project Warehouse'

export default function SuburbWarehouse() {
  const { stateSlug: rawState, suburbSlug: rawSuburb } = useParams<{ stateSlug: string; suburbSlug: string }>()
  const stateSlug = (rawState ?? '').trim().toLowerCase()
  const suburbSlug = (rawSuburb ?? '').trim().toLowerCase()

  const [listings, setListings] = useState<Property[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const stateName = isValidStateSlug(stateSlug) ? STATE_SLUGS[stateSlug] : ''
  const abbrev = isValidStateSlug(stateSlug) ? STATE_ABBREV[stateSlug] : ''
  const suburbDisplay = slugToSuburb(suburbSlug)

  const blurbKey = precinctBlurbKey(stateSlug, suburbSlug)
  const aboutText = useMemo(() => {
    const custom = WAREHOUSE_PRECINCT_BLURBS[blurbKey]
    if (custom) return custom
    return `${suburbDisplay} is an industrial suburb in ${stateName}. Browse available warehouse and storage space below or list your own space for free.`
  }, [blurbKey, stateName, suburbDisplay])

  const nearbyNames = WAREHOUSE_NEARBY_SUBURBS[blurbKey] ?? []

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setListings([])
      return
    }
    if (!isValidStateSlug(stateSlug) || !abbrev || !suburbSlug) {
      setLoading(false)
      setListings([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const day = listingIsoDateUtc()
      const safe = escapeIlikePattern(suburbDisplay)
      const { data, error } = await applyPropertyListingDateWindow(
        supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT),
        day,
      )
        .eq('status', 'active')
        .eq('state', abbrev)
        .ilike('suburb', `%${safe}%`)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(24)

      if (cancelled) return
      if (error) {
        console.error(error)
        setListings([])
      } else {
        setListings((data ?? []) as Property[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [abbrev, stateSlug, suburbDisplay, suburbSlug])

  if (!isValidStateSlug(stateSlug)) {
    return <Navigate to="/warehousing" replace />
  }

  if (!suburbSlug) {
    return <Navigate to={`/warehousing/${stateSlug}`} replace />
  }

  const title = `Warehouse Space for Rent in ${suburbDisplay}, ${abbrev}`
  const description = `Find warehouse and pallet storage space for rent in ${suburbDisplay}, ${stateName}. Browse verified listings near ${suburbDisplay}'s industrial precinct on Project Warehouse.`

  const listingsSearchHref = `/listings?suburb=${encodeURIComponent(suburbDisplay)}&state=${encodeURIComponent(abbrev)}`

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      <Seo
        siteName={PW_SITE}
        title={title}
        description={description}
        canonicalPath={`/warehousing/${stateSlug}/${suburbSlug}`}
      />

      <section className="bg-brand-black text-teal-light">
        <div className={`${SITE_CONTENT_MAX_CLASS} py-12 md:py-14`}>
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-teal-light/80">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link to="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link to="/warehousing" className="hover:text-white">
                  Warehousing
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link to={`/warehousing/${stateSlug}`} className="hover:text-white">
                  {abbrev}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-white">{suburbDisplay}</li>
            </ol>
          </nav>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Warehouse space in {suburbDisplay}, {abbrev}
          </h1>
        </div>
      </section>

      <div className={`${SITE_CONTENT_MAX_CLASS} space-y-10 py-10`}>
        <section aria-labelledby="suburb-listings-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="suburb-listings-heading" className="font-display text-xl font-bold text-gray-900">
              Listings near {suburbDisplay}
            </h2>
            <Link to={listingsSearchHref} className="text-sm font-medium text-teal-dark hover:text-brand-black">
              View on map search →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-800">
                No spaces listed in {suburbDisplay} yet. Be the first to list.
              </p>
              <Link
                to="/signup"
                className="mt-4 inline-flex rounded-lg bg-teal-dark px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                List your space in {suburbDisplay}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          aria-labelledby="about-precinct-heading"
        >
          <h2 id="about-precinct-heading" className="font-display text-lg font-bold text-gray-900">
            About this precinct
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">{aboutText}</p>
        </section>

        {nearbyNames.length > 0 && (
          <section aria-labelledby="nearby-heading">
            <h2 id="nearby-heading" className="font-display mb-3 text-lg font-bold text-gray-900">
              Nearby suburbs
            </h2>
            <ul className="flex flex-wrap gap-2">
              {nearbyNames.map((name) => (
                <li key={name}>
                  <Link
                    to={warehousingSuburbPath(stateSlug, name)}
                    className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-teal-dark hover:text-teal-dark"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl bg-brand-black px-6 py-8 text-center text-teal-light">
          <h2 className="font-display text-lg font-bold text-white">List your space in {suburbDisplay}</h2>
          <Link
            to="/signup"
            className="mt-4 inline-flex rounded-lg bg-teal-light px-6 py-2.5 text-sm font-semibold text-brand-black hover:bg-white"
          >
            Create a free listing
          </Link>
        </section>
      </div>
    </div>
  )
}
