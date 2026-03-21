import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  LISTINGS_SORT_OPTIONS,
  ROOM_TYPE_LABELS,
  type RoomType,
  type University,
} from '../lib/listings'
import { useListingsFilters } from '../hooks/useListingsFilters'
import { useListingsQuery } from '../hooks/useListingsQuery'
import { PropertyCard } from '../components/listings/PropertyCard'
import { ListingsGridSkeleton } from '../components/listings/ListingsGridSkeleton'

export default function Listings() {
  const filters = useListingsFilters()
  const [universities, setUniversities] = useState<University[]>([])

  const queryFilters = useMemo(
    () => ({
      q: filters.qApplied,
      university: filters.university,
      roomType: filters.roomType,
      priceFilter: filters.priceFilter,
      furnished: filters.furnished,
      sort: filters.sort,
    }),
    [
      filters.qApplied,
      filters.university,
      filters.roomType,
      filters.priceFilter,
      filters.furnished,
      filters.sort,
    ],
  )

  const { properties, total, loading, error, refetch } = useListingsQuery(
    queryFilters,
    isSupabaseConfigured,
    filters.querySignature,
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    supabase
      .from('universities')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (!cancelled && data) setUniversities(data as University[])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Listings</h1>
          <p className="text-gray-600 mb-4">
            Add <code className="text-sm bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">.env.local</code>, then restart{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">npm run dev</code>.
          </p>
        </div>
      </div>
    )
  }

  const roomTypeEntries = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Accommodation</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Searching…' : `${total} listing${total !== 1 ? 's' : ''} available`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 shrink-0 order-2 md:order-none">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm md:sticky md:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>
                {filters.hasActiveFilters && (
                  <button
                    type="button"
                    onClick={filters.clearAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="listings-search" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    id="listings-search"
                    type="search"
                    value={filters.qInput}
                    onChange={(e) => filters.setQInput(e.target.value)}
                    placeholder="Suburb or keyword…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="listings-uni" className="block text-xs font-medium text-gray-700 mb-1.5">
                  University
                </label>
                <select
                  id="listings-uni"
                  value={filters.university}
                  onChange={(e) => filters.setUniversity(e.target.value)}
                  className="w-full py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="">All universities</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="listings-room" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Room type
                </label>
                <select
                  id="listings-room"
                  value={filters.roomType}
                  onChange={(e) => filters.setRoomType(e.target.value)}
                  className="w-full py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="">All types</option>
                  {roomTypeEntries.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="listings-price" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Weekly rent
                </label>
                <select
                  id="listings-price"
                  value={filters.priceFilter}
                  onChange={(e) => filters.setPriceFilter(e.target.value)}
                  className="w-full py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="">Any price</option>
                  <option value="0-200">Under $200</option>
                  <option value="200-300">$200 – $300</option>
                  <option value="300-400">$300 – $400</option>
                  <option value="400+">$400+</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.furnished}
                  onClick={() => filters.setFurnished(!filters.furnished)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
                    filters.furnished ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      filters.furnished ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">Furnished only</span>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <p className="text-sm text-gray-500">
                {loading
                  ? 'Loading…'
                  : total === 0
                    ? 'No listings found'
                    : `Showing ${properties.length} of ${total}`}
              </p>
              <label htmlFor="listings-sort" className="sr-only">
                Sort
              </label>
              <select
                id="listings-sort"
                value={filters.sort}
                onChange={(e) => filters.setSort(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {LISTINGS_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm flex flex-wrap items-center gap-2">
                <span>{error}</span>
                <button type="button" onClick={refetch} className="underline font-medium">
                  Retry
                </button>
              </div>
            )}

            {loading && <ListingsGridSkeleton count={6} />}

            {!loading && !error && properties.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No listings found</h3>
                <p className="text-sm text-gray-500 mb-4">Try adjusting your filters</p>
                {filters.hasActiveFilters && (
                  <button
                    type="button"
                    onClick={filters.clearAll}
                    className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!loading && properties.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {properties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
