import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Seo from '../../components/Seo'
import { PropertyCard } from '../../components/PropertyCard'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { Property } from '../../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../../lib/propertyCardSelect'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../../lib/propertyListingDateWindow'
import { SITE_CONTENT_MAX_CLASS } from '../../lib/site'
import { isValidStateSlug, STATE_ABBREV, STATE_SLUGS } from '../../lib/seoHelpers'
import { KEY_PRECINCTS_BY_STATE, warehousingSuburbPath } from '../../lib/warehousePrecincts'

const PW_SITE = 'Project Warehouse'

export default function StateWarehouse() {
  const { stateSlug: rawSlug } = useParams<{ stateSlug: string }>()
  const stateSlug = (rawSlug ?? '').trim().toLowerCase()

  const [listings, setListings] = useState<Property[]>([])
  const [stateCount, setStateCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const stateName = isValidStateSlug(stateSlug) ? STATE_SLUGS[stateSlug] : ''
  const abbrev = isValidStateSlug(stateSlug) ? STATE_ABBREV[stateSlug] : ''

  const precincts = useMemo(() => {
    if (!isValidStateSlug(stateSlug)) return []
    return KEY_PRECINCTS_BY_STATE[stateSlug] ?? []
  }, [stateSlug])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setListings([])
      setStateCount(null)
      return
    }
    if (!isValidStateSlug(stateSlug) || !abbrev) {
      setLoading(false)
      setListings([])
      setStateCount(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const day = listingIsoDateUtc()
      const base = applyPropertyListingDateWindow(
        supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT),
        day,
      )
        .eq('status', 'active')
        .eq('state', abbrev)

      const { count, error: cErr } = await applyPropertyListingDateWindow(
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        day,
      )
        .eq('status', 'active')
        .eq('state', abbrev)

      const { data, error: dErr } = await base
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)

      if (cancelled) return
      if (cErr || dErr) {
        console.error(cErr ?? dErr)
        setStateCount(null)
        setListings([])
      } else {
        setStateCount(count ?? 0)
        setListings((data ?? []) as Property[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [abbrev, stateSlug])

  if (!isValidStateSlug(stateSlug)) {
    return <Navigate to="/warehousing" replace />
  }

  const title = `Warehouse Space for Rent in ${stateName}`
  const description = `Find warehouse and pallet storage space for rent in ${stateName}. Browse verified listings across ${stateName}'s industrial precincts.`

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      <Seo siteName={PW_SITE} title={title} description={description} canonicalPath={`/warehousing/${stateSlug}`} />

      <section className="bg-brand-black text-teal-light">
        <div className={`${SITE_CONTENT_MAX_CLASS} py-12 md:py-14`}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Warehouse space for rent in {stateName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-light/90 sm:text-base">
            {loading ? 'Loading listings…' : stateCount != null ? `${stateCount} active listings in ${abbrev}.` : null}
          </p>
        </div>
      </section>

      <div className={`${SITE_CONTENT_MAX_CLASS} space-y-10 py-10`}>
        <section aria-labelledby="listings-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="listings-heading" className="font-display text-xl font-bold text-gray-900">
              Featured listings
            </h2>
            <Link
              to={`/listings?state=${encodeURIComponent(abbrev)}`}
              className="text-sm font-medium text-teal-dark hover:text-brand-black"
            >
              View all {abbrev} listings →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-800">No spaces listed in {stateName} yet. Be the first to list.</p>
              <Link
                to="/signup"
                className="mt-4 inline-flex rounded-lg bg-teal-dark px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                List your space free
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

        <section aria-labelledby="precincts-heading">
          <h2 id="precincts-heading" className="font-display mb-4 text-xl font-bold text-gray-900">
            Key industrial precincts
          </h2>
          <ul className="flex flex-wrap gap-2">
            {precincts.map((name) => (
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

        <section className="rounded-2xl bg-brand-black px-6 py-8 text-center text-teal-light">
          <h2 className="font-display text-lg font-bold text-white">List your space in {abbrev}</h2>
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
