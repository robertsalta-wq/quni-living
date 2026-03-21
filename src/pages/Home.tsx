import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Property, University } from '../lib/listings'
import { PropertyCard } from '../components/PropertyCard'

const HERO_COLLAGE_TOP_FALLBACK =
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80&auto=format&fit=crop'
const HERO_COLLAGE_BOTTOM_FALLBACK =
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'

/** Per-letter colours for “Everything” — light teal → white → peach on coral */
const HERO_EVERYTHING_LETTERS: { ch: string; className: string }[] = [
  { ch: 'E', className: 'text-[#A8D5C8]' },
  { ch: 'v', className: 'text-[#A8D5C8]' },
  { ch: 'e', className: 'text-[#C8E6E0]' },
  { ch: 'r', className: 'text-[#C8E6E0]' },
  { ch: 'y', className: 'text-[#C8E6E0]' },
  { ch: 't', className: 'text-white' },
  { ch: 'h', className: 'text-white' },
  { ch: 'i', className: 'text-[#F0D5C8]' },
  { ch: 'n', className: 'text-[#F0D5C8]' },
  { ch: 'g', className: 'text-[#F0D5C8]' },
]

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

  const heroCollageTopSrc = featured[0]?.images?.[0] ?? HERO_COLLAGE_TOP_FALLBACK
  const heroCollageBottomSrc = featured[1]?.images?.[0] ?? HERO_COLLAGE_BOTTOM_FALLBACK

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* Hero — coral band; collage + badges reference Wix trial */}
      <section className="bg-[#FF7261] border-b border-black/10">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center lg:items-stretch">
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4">
                Australia&apos;s student accommodation marketplace
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4rem] font-bold tracking-tight text-white !mt-0 !mb-4 leading-[0.8] sm:leading-[0.82]">
                <span className="block">Live Well</span>
                <span className="block">Study Better</span>
                <span className="block -mt-px sm:-mt-0.5">
                  <span className="inline-flex tracking-[-0.03em]">
                    {HERO_EVERYTHING_LETTERS.map(({ ch, className }, i) => (
                      <span key={i} className={className}>
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="block">Included</span>
              </h1>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="w-2 h-2 rounded-full bg-white/60 inline-block" />
                <span>Sydney Universities</span>
              </div>
              <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-normal mt-3">
                Student accommodation near Australia&apos;s top universities
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
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
                <label className="sr-only" htmlFor="home-search-uni">
                  University
                </label>
                <select
                  id="home-search-uni"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="w-full lg:w-[min(100%,220px)] shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
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
                  className="shrink-0 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF7261] transition-colors"
                >
                  Search
                </button>
              </form>

              <p className="mt-4 text-sm text-white/70">{trustLine}</p>
            </div>

            <div className="relative w-full min-h-[280px] sm:min-h-[340px] lg:min-h-[380px] pt-4 pb-6 lg:py-4">
              {/* Floating badges */}
              <div
                className="absolute left-0 top-6 sm:top-10 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7261] text-white shadow-lg ring-2 ring-white/50"
                aria-hidden
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div
                className="absolute right-0 top-[28%] sm:top-[32%] z-30 rounded-full bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md whitespace-nowrap"
                aria-hidden
              >
                $ All Inclusive
              </div>
              <div
                className="absolute bottom-4 right-4 z-30 flex max-w-[120px] items-center gap-1.5 rounded-xl border-2 border-[#CC4A3C] bg-[#FF7261] px-2.5 py-2 text-white shadow-lg"
                aria-hidden
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Fast Wifi</span>
              </div>

              {/* Top image — right */}
              <div className="relative z-10 flex justify-end pr-1">
                <div className="w-3/4 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10">
                  <img
                    src={heroCollageTopSrc}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              {/* Bottom image — left, overlaps */}
              <div className="relative z-20 -mt-8 ml-0 w-2/3">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10">
                  <img
                    src={heroCollageBottomSrc}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#8FB9AB] w-full py-16 sm:py-20">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-stretch">
            <div className="order-2 lg:order-1 flex flex-col justify-center">
              <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-white/70 mb-4 [font-variant:small-caps]">
                For landlords
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white !mt-0 !mb-4 leading-tight">
                More income. Less vacancy. Predictable returns.
              </h2>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
                Student accommodation is one of Sydney&apos;s most resilient rental markets. Quni Living connects
                verified landlords with quality students — giving you consistent occupancy, structured leases, and a
                platform that handles enquiries and bookings for you.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/services/landlord-partnerships"
                  className="inline-flex items-center justify-center rounded-lg bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Find out more
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  List your property
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:h-full min-h-0">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                alt=""
                className="w-full rounded-2xl object-cover shadow-lg aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[280px]"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
