import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Property } from '../lib/listings'
import { PropertyCard } from '../components/PropertyCard'
import UniversityCampusSelect from '../components/UniversityCampusSelect'
import LandlordAIBanner from '../components/LandlordAIBanner'
import Seo from '../components/Seo'
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  ORGANIZATION_EMAIL,
  absoluteUrl,
} from '../lib/site'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../lib/propertyListingDateWindow'

const HERO_COLLAGE_TOP_FALLBACK =
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80&auto=format&fit=crop'
const HERO_COLLAGE_BOTTOM_FALLBACK =
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'

const STUDENT_HOW_STEPS = [
  {
    n: 1,
    title: 'Search',
    desc: 'Find verified rooms near your university by suburb or campus',
  },
  {
    n: 2,
    title: 'Enquire',
    desc: 'Message landlords directly through the platform',
  },
  {
    n: 3,
    title: 'Book',
    desc: 'Pay securely and sign your NSW-compliant lease in one place',
  },
] as const

const LANDLORD_HOW_STEPS = [
  {
    n: 1,
    title: 'List for free',
    desc: 'Add your property in minutes with AI-assisted tools',
  },
  {
    n: 2,
    title: 'Review applicants',
    desc: 'See verified student profiles and AI fit summaries',
  },
  {
    n: 3,
    title: 'Get paid',
    desc: 'Accept a tenant and receive weekly rent via Stripe Connect',
  },
] as const

const STUDENT_FAQ = [
  {
    id: 'faq-s-1',
    q: 'Is Quni Living free for students?',
    a: "Yes — students pay zero platform fees. You see the landlord's asking rent and pay exactly that, with no booking fees or surcharges added by Quni.",
  },
  {
    id: 'faq-s-2',
    q: 'How do I know the landlord is legitimate?',
    a: 'Every landlord on Quni goes through our verification process before listing. Verified landlords display a Verified Landlord badge on their profile and listing.',
  },
  {
    id: 'faq-s-3',
    q: 'Are the tenancy agreements legally binding?',
    a: 'Yes. Quni generates NSW-compliant tenancy agreements in accordance with the Residential Tenancies Act 2010, signed digitally via DocuSeal.',
  },
  {
    id: 'faq-s-4',
    q: 'What if something goes wrong with my tenancy?',
    a: 'Contact us at hello@quni.com.au. We have a dispute resolution process and will work with both parties to resolve issues fairly.',
  },
] as const

const LANDLORD_FAQ = [
  {
    id: 'faq-l-1',
    q: 'How much does Quni charge landlords?',
    a: 'Landlords pay a 10% service fee on weekly rent, deducted before payout. There are no listing fees and no charges until you accept a tenant.',
  },
  {
    id: 'faq-l-2',
    q: 'How are students verified?',
    a: 'Students verify via university email OTP. Enhanced verification includes photo ID and enrolment documents, displayed as a Student Verified badge.',
  },
  {
    id: 'faq-l-3',
    q: 'How do I receive rent payments?',
    a: 'Via Stripe Connect direct to your bank account. You see exactly what Quni earns and what you receive in your landlord dashboard.',
  },
  {
    id: 'faq-l-4',
    q: "Can I list if my property isn't near a university?",
    a: 'Quni is designed for properties near Australian university campuses. Search is organised by university and suburb, so listings near campuses get the most visibility.',
  },
] as const

type HowStep = {
  readonly n: 1 | 2 | 3
  readonly title: string
  readonly desc: string
}

function HowStepColumn(props: { heading: string; steps: readonly HowStep[] }) {
  const { heading, steps } = props
  return (
    <div className="rounded-2xl border border-[#E1EAE5] bg-white p-6 sm:p-8 shadow-sm">
      <h3 className="font-display text-lg sm:text-xl font-bold text-[#FF6F61] mb-6">{heading}</h3>
      <ol className="m-0 list-none space-y-6 p-0">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-sm font-bold text-white"
              aria-hidden
            >
              {step.n}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold text-gray-900">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [locationInput, setLocationInput] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(isSupabaseConfigured)
  const [featured, setFeatured] = useState<Property[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(isSupabaseConfigured)
  const [nonStudentBannerDismissed, setNonStudentBannerDismissed] = useState<boolean>(
    () => localStorage.getItem('quni_nonstu_banner_dismissed') === 'true',
  )
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCountLoading(false)
      return
    }
    let cancelled = false
    setCountLoading(true)
    applyPropertyListingDateWindow(
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      listingIsoDateUtc(),
    )
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
    applyPropertyListingDateWindow(
      supabase.from('properties').select(
        `
        *,
        landlord_profiles ( id, full_name, avatar_url, verified ),
        universities ( id, name, slug ),
        campuses ( id, name )
      `,
      ),
      listingIsoDateUtc(),
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
    if (universityId) params.set('university_id', universityId)
    if (campusId) params.set('campus_id', campusId)
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

  const homeOgImage =
    heroCollageTopSrc && /^https?:\/\//i.test(heroCollageTopSrc) ? heroCollageTopSrc : undefined

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'en-AU',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/listings?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/favicon.png'),
        email: ORGANIZATION_EMAIL,
      },
    ],
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <Seo
        title="Student accommodation near university"
        description={DEFAULT_DESCRIPTION}
        canonicalPath="/"
        image={homeOgImage}
        jsonLd={homeJsonLd}
      />
      {/* Hero — coral band; collage + badges reference Wix trial */}
      <section className="bg-[#FF6F61] border-b border-black/10">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center lg:items-stretch">
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4">
                Australia&apos;s student accommodation marketplace
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[4.5rem] font-bold tracking-tight text-white !mt-0 mb-8 sm:mb-10 leading-tight">
                <span className="block">Live Well.</span>
                <span className="block">Study Better.</span>
              </h1>
              <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-normal">
                Student accommodation near Australia&apos;s top universities
              </p>

              <form
                onSubmit={handleSearch}
                className="flex flex-col gap-3 w-full min-w-0 max-w-xl"
              >
                <label className="sr-only" htmlFor="home-search-location">
                  Suburb or university
                </label>
                <input
                  id="home-search-location"
                  type="search"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Suburb or university…"
                  autoComplete="off"
                  className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
                <label className="sr-only" htmlFor="home-search-uni">
                  University
                </label>
                <label className="sr-only" htmlFor="home-search-campus">
                  Campus
                </label>
                <UniversityCampusSelect
                  universityId={universityId || null}
                  campusId={campusId || null}
                  onUniversityChange={(id) => {
                    setUniversityId(id)
                    setCampusId('')
                  }}
                  onCampusChange={setCampusId}
                  referenceScope="full"
                  showState
                  showLabels={false}
                  variant="stack"
                  className="w-full min-w-0 flex flex-col gap-3"
                  campusPlaceholderNoUniversity="Select campus"
                  campusPlaceholderWithUniversity="All campuses"
                  universitySelectClassName="w-full max-w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                  campusSelectClassName="w-full max-w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 disabled:bg-white/80 disabled:text-gray-500"
                  universityIdAttr="home-search-uni"
                  campusIdAttr="home-search-campus"
                />
                <button
                  type="submit"
                  className="w-full shrink-0 rounded-xl border border-white/90 bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF6F61] transition-colors"
                >
                  Search
                </button>
              </form>

              <p className="mt-4 text-sm text-white/70">{trustLine}</p>
            </div>

            <div className="relative w-full min-h-[280px] sm:min-h-[340px] lg:min-h-[380px] pt-4 pb-6 lg:py-4">
              {/* Floating badges */}
              <div
                className="absolute left-0 top-6 sm:top-10 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6F61] text-white shadow-lg ring-2 ring-white/50"
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
                className="absolute bottom-4 right-4 z-30 flex max-w-[120px] items-center gap-1.5 rounded-xl border-2 border-[#CC4A3C] bg-[#FF6F61] px-2.5 py-2 text-white shadow-lg"
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

      {/* How it works — below hero / search */}
      <section className="border-b border-[#E3EEE9] bg-[#F6FAF8] py-14 sm:py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl !mt-0 !mb-3">
            How it works
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-600 sm:mb-12 sm:text-base">
            Whether you&apos;re looking for a room or listing one, Quni keeps the journey clear and on-platform.
          </p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <HowStepColumn heading="For students" steps={STUDENT_HOW_STEPS} />
            <HowStepColumn heading="For landlords" steps={LANDLORD_HOW_STEPS} />
          </div>
          <div className="mt-10 flex justify-center sm:mt-12">
            <Link
              to="/listings"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-gray-100 bg-white py-14 sm:py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl !mt-0 !mb-10">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-3xl">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">For students</p>
            <div className="divide-y divide-gray-200 border-b border-gray-200">
              {STUDENT_FAQ.map((item) => {
                const open = openFaqId === item.id
                return (
                  <div key={item.id} className="border-t border-gray-200 first:border-t-0">
                    <button
                      type="button"
                      id={`${item.id}-btn`}
                      className="flex w-full items-center justify-between gap-4 rounded-sm py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40 sm:text-base"
                      aria-expanded={open}
                      aria-controls={`${item.id}-panel`}
                      onClick={() => setOpenFaqId(open ? null : item.id)}
                    >
                      <span className="min-w-0 pr-2">{item.q}</span>
                      <svg
                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      id={`${item.id}-panel`}
                      role="region"
                      aria-labelledby={`${item.id}-btn`}
                      hidden={!open}
                      className={open ? 'pb-4 text-sm leading-relaxed text-gray-600 sm:pr-8' : ''}
                    >
                      {open ? item.a : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="my-10 border-t border-gray-200" aria-hidden />

            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">For landlords</p>
            <div className="divide-y divide-gray-200 border-b border-gray-200">
              {LANDLORD_FAQ.map((item) => {
                const open = openFaqId === item.id
                return (
                  <div key={item.id} className="border-t border-gray-200 first:border-t-0">
                    <button
                      type="button"
                      id={`${item.id}-btn`}
                      className="flex w-full items-center justify-between gap-4 rounded-sm py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40 sm:text-base"
                      aria-expanded={open}
                      aria-controls={`${item.id}-panel`}
                      onClick={() => setOpenFaqId(open ? null : item.id)}
                    >
                      <span className="min-w-0 pr-2">{item.q}</span>
                      <svg
                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      id={`${item.id}-panel`}
                      role="region"
                      aria-labelledby={`${item.id}-btn`}
                      hidden={!open}
                      className={open ? 'pb-4 text-sm leading-relaxed text-gray-600 sm:pr-8' : ''}
                    >
                      {open ? item.a : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {!nonStudentBannerDismissed && (
        <div className="bg-teal-50 border-b border-teal-200 w-full py-3">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-800 min-w-0 flex-1">
              Not a student? Quality furnished rooms in Newtown, Glebe, Randwick and more.
            </p>
            <div className="flex items-center shrink-0">
              <Link to="/rent-near-campus" className="text-sm text-teal-700 font-medium">
                Find out more →
              </Link>
              <button
                type="button"
                className="ml-4 text-gray-400 hover:text-gray-600 text-lg leading-none p-0.5"
                aria-label="Dismiss"
                onClick={() => {
                  localStorage.setItem('quni_nonstu_banner_dismissed', 'true')
                  setNonStudentBannerDismissed(true)
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

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

      <LandlordAIBanner />

    </div>
  )
}
