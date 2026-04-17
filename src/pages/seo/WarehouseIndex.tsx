import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Seo from '../../components/Seo'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../../lib/propertyListingDateWindow'
import { SITE_CONTENT_MAX_CLASS } from '../../lib/site'
import { STATE_ABBREV, STATE_SLUG_ORDER, STATE_SLUGS } from '../../lib/seoHelpers'
import { POPULAR_WAREHOUSE_PREMIUMS, warehousingSuburbPath } from '../../lib/warehousePrecincts'

const PW_SITE = 'Project Warehouse'

export default function WarehouseIndex() {
  const navigate = useNavigate()
  const [totalListings, setTotalListings] = useState<number | null>(null)
  const [countByState, setCountByState] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState(isSupabaseConfigured)
  const [suburbInput, setSuburbInput] = useState('')
  const [stateSlug, setStateSlug] = useState<string>('nsw')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCountsLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setCountsLoading(true)
      const day = listingIsoDateUtc()
      const { data, error } = await applyPropertyListingDateWindow(
        supabase.from('properties').select('state'),
        day,
      ).eq('status', 'active')
      if (cancelled) return
      if (error) {
        console.error(error)
        setTotalListings(null)
        setCountByState({})
      } else {
        const rows = (data ?? []) as { state: string | null }[]
        setTotalListings(rows.length)
        const map: Record<string, number> = {}
        for (const r of rows) {
          const k = (r.state ?? '').trim().toUpperCase()
          if (!k) continue
          map[k] = (map[k] ?? 0) + 1
        }
        setCountByState(map)
      }
      setCountsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stateOptions = useMemo(
    () => STATE_SLUG_ORDER.map((slug) => ({ slug, label: STATE_SLUGS[slug] ?? slug })),
    [],
  )

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const sub = suburbInput.trim()
    const abbrev = STATE_ABBREV[stateSlug] ?? 'NSW'
    const qs = new URLSearchParams()
    if (sub) qs.set('suburb', sub)
    qs.set('state', abbrev)
    navigate(`/listings?${qs.toString()}`)
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      <Seo
        siteName={PW_SITE}
        title="Warehouse Space for Rent Australia"
        description="Find warehouse and storage space for rent across Australia. Browse pallet storage, cool rooms, and industrial space in Sydney, Melbourne, Brisbane and beyond."
        canonicalPath="/warehousing"
      />

      <section className="bg-brand-black text-teal-light">
        <div className={`${SITE_CONTENT_MAX_CLASS} py-14 md:py-16`}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Warehouse space for rent across Australia
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-teal-light sm:text-base">
            Search industrial listings by suburb and state, or browse our state and precinct guides below.
          </p>
          <form
            onSubmit={onSearch}
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
            role="search"
            aria-label="Search warehouse listings"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-teal-light">
              Suburb
              <input
                value={suburbInput}
                onChange={(ev) => setSuburbInput(ev.target.value)}
                placeholder="e.g. Wetherill Park"
                className="rounded-lg border border-teal-dark bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-teal-light/50 focus:border-teal-light focus:outline-none focus:ring-1 focus:ring-teal-light"
              />
            </label>
            <label className="flex w-full flex-col gap-1 text-xs font-medium text-teal-light sm:w-44">
              State
              <select
                value={stateSlug}
                onChange={(ev) => setStateSlug(ev.target.value)}
                className="rounded-lg border border-teal-dark bg-white/5 px-3 py-2.5 text-sm text-white focus:border-teal-light focus:outline-none focus:ring-1 focus:ring-teal-light"
              >
                {stateOptions.map((o) => (
                  <option key={o.slug} value={o.slug} className="bg-brand-black text-white">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-teal-light px-5 py-2.5 text-sm font-semibold text-brand-black hover:bg-white"
            >
              Search listings
            </button>
          </form>
        </div>
      </section>

      <div className={`${SITE_CONTENT_MAX_CLASS} space-y-12 py-10`}>
        <section aria-labelledby="counts-heading">
          <h2 id="counts-heading" className="sr-only">
            Listing counts
          </h2>
          <p className="text-center text-sm text-gray-600">
            {countsLoading ? (
              'Loading listing counts…'
            ) : totalListings != null ? (
              <>
                <span className="font-semibold text-gray-900">{totalListings}</span> active listings across Australia
              </>
            ) : (
              'Listing counts unavailable right now.'
            )}
          </p>
        </section>

        <section aria-labelledby="states-heading">
          <h2 id="states-heading" className="font-display mb-4 text-xl font-bold text-gray-900">
            Browse by state
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATE_SLUG_ORDER.map((slug) => {
              const abbrev = STATE_ABBREV[slug]
              const n = abbrev ? (countByState[abbrev] ?? 0) : 0
              return (
                <Link
                  key={slug}
                  to={`/warehousing/${slug}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-dark"
                >
                  <h3 className="font-semibold text-gray-900">{STATE_SLUGS[slug]}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {countsLoading ? '…' : n === 0 ? 'View guide' : `${n} listing${n !== 1 ? 's' : ''}`}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="font-display mb-4 text-xl font-bold text-gray-900">
            Popular industrial precincts
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_WAREHOUSE_PREMIUMS.map(({ stateSlug, suburb }) => (
              <li key={`${stateSlug}-${suburb}`}>
                <Link
                  to={warehousingSuburbPath(stateSlug, suburb)}
                  className="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm hover:border-teal-dark hover:text-teal-dark"
                >
                  {suburb} · {STATE_ABBREV[stateSlug] ?? stateSlug.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-brand-black px-6 py-8 text-center text-teal-light">
          <h2 className="font-display text-xl font-bold text-white">List your space free</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-teal-light/90">
            Reach businesses looking for pallet storage, cool rooms, and yard space — no listing fees.
          </p>
          <Link
            to="/signup"
            className="mt-5 inline-flex rounded-lg bg-teal-light px-6 py-2.5 text-sm font-semibold text-brand-black hover:bg-white"
          >
            Create a free listing
          </Link>
        </section>
      </div>
    </div>
  )
}
