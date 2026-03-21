import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Property, University } from '../lib/listings'
import { PropertyCard } from '../components/PropertyCard'

const HERO_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'

const HOW_STEPS = [
  {
    n: 1,
    title: 'Search',
    desc: 'Browse listings near your university',
  },
  {
    n: 2,
    title: 'Enquire',
    desc: 'Message the landlord directly',
  },
  {
    n: 3,
    title: 'Book',
    desc: 'Request your booking online',
  },
] as const

export default function Home() {
  const navigate = useNavigate()
  const [locationInput, setLocationInput] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [universities, setUniversities] = useState<University[]>([])
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(isSupabaseConfigured)
  const [heroImageUrl, setHeroImageUrl] = useState<string>(HERO_FALLBACK_IMAGE)
  const [featured, setFeatured] = useState<Property[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    supabase
      .from('universities')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (!cancelled && data) setUniversities(data as University[])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCountLoading(false)
      return
    }
    let cancelled = false
    setCountLoading(true)
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count, error }) => {
        if (cancelled) return
        if (error) {
          console.error(error)
          setListingCount(null)
        } else {
          setListingCount(count ?? 0)
        }
        setCountLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('images')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(24)
      if (cancelled || error) return
      const rows = data ?? []
      const first = rows.find((r) => Array.isArray(r.images) && r.images.length > 0 && r.images[0])
      if (first?.images?.[0]) setHeroImageUrl(first.images[0])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setFeaturedLoading(false)
      return
    }
    let cancelled = false
    setFeaturedLoading(true)
    supabase
      .from('properties')
      .select(
        `
        *,
        landlord_profiles ( id, full_name, avatar_url, verified ),
        universities ( id, name, slug ),
        campuses ( id, name )
      `,
      )
      .eq('status', 'active')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error(error)
          setFeatured([])
        } else {
          setFeatured((data ?? []) as Property[])
        }
        setFeaturedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const q = locationInput.trim()
    if (q) params.set('q', q)
    if (universityId) params.set('uni', universityId)
    const qs = params.toString()
    navigate(qs ? `/listings?${qs}` : '/listings')
  }

  const trustLine = (() => {
    if (!isSupabaseConfigured) {
      return 'Connect Supabase to see live listings near Sydney universities.'
    }
    if (countLoading || listingCount === null) {
      return 'Loading listings near Sydney universities…'
    }
    return `${listingCount} listing${listingCount !== 1 ? 's' : ''} available near Sydney universities`
  })()

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* Hero — cream band continuous with header */}
      <section className="bg-[#FEF9E4] border-b border-[#E8E0CC]">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-stretch">
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 mb-4">
                Australia&apos;s student accommodation marketplace
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 tracking-tight !mt-0 !mb-4 leading-[1.1]">
                Find your perfect student home
              </h1>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
                Browse verified listings near your university. Studios, shared rooms, apartments and more — all
                student-friendly.
              </p>

              <form
                onSubmit={handleSearch}
                className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-stretch w-full max-w-xl"
              >
                <label className="sr-only" htmlFor="home-search-location">
                  Location
                </label>
                <input
                  id="home-search-location"
                  type="search"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Suburb or university…"
                  autoComplete="off"
                  className="flex-1 min-w-0 rounded-xl border border-[#E8E0CC] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
                <label className="sr-only" htmlFor="home-search-uni">
                  University
                </label>
                <select
                  id="home-search-uni"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="w-full lg:w-[min(100%,220px)] shrink-0 rounded-xl border border-[#E8E0CC] bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                >
                  <option value="">All universities</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#FEF9E4] transition-colors"
                >
                  Search
                </button>
              </form>

              <p className="mt-4 text-sm text-gray-500">{trustLine}</p>
            </div>

            <div className="relative min-h-[260px] lg:min-h-0 lg:min-h-[340px] rounded-3xl overflow-hidden shadow-xl border border-white/60 ring-1 ring-black/5">
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white py-12 sm:py-16 border-b border-gray-100">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight !mt-0 !mb-2">
              Featured properties
            </h2>
            <p className="text-gray-600">Hand-picked listings near top universities.</p>
          </div>

          {featuredLoading && (
            <p className="text-sm text-gray-500 py-8">Loading featured listings…</p>
          )}

          {!featuredLoading && featured.length === 0 && (
            <p className="text-sm text-gray-500 py-4">
              No featured listings yet.{' '}
              <Link to="/listings" className="font-medium text-indigo-600 hover:text-indigo-800">
                Browse all listings
              </Link>
            </p>
          )}

          {!featuredLoading && featured.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {featured.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              to="/listings"
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              View all listings
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center !mt-0 !mb-10 sm:!mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {HOW_STEPS.map((step) => (
              <div key={step.n} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm mb-3 mx-auto md:mx-0">
                  {step.n}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
