import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeroBand from './PageHeroBand'
import { PropertyCard } from './PropertyCard'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchRelatedListings, type RelatedListingsMode } from '../lib/relatedListings'
import type { Property } from '../lib/listings'

type ExtraCta = { label: string; to: string }

type HeroCta = { label: string; to: string; variant?: 'coralProminentOnCoral' }

type Props = {
  title: string
  subtitle: string
  relatedMode: RelatedListingsMode
  children: React.ReactNode
  extraCta?: ExtraCta
  /** Optional CTA in the coral page hero (e.g. landlord signup) */
  heroCta?: HeroCta
  /** Renders after the “Related listings” block, above the site footer */
  afterRelated?: React.ReactNode
  /** Full-bleed main content (no max-w-3xl prose wrapper) — use for custom multi-section pages */
  contentVariant?: 'default' | 'fullBleed'
}

export default function ServicePageLayout({
  title,
  subtitle,
  relatedMode,
  children,
  extraCta,
  heroCta,
  afterRelated,
  contentVariant = 'default',
}: Props) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRelatedListings(relatedMode)
      .then((rows) => {
        if (!cancelled) setProperties(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e)
          setError('Could not load related listings.')
          setProperties([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [relatedMode])

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <PageHeroBand
        title={title}
        subtitle={subtitle}
        belowSubtitle={
          heroCta ? (
            <div className="mt-6 flex justify-start">
              {heroCta.variant === 'coralProminentOnCoral' ? (
                <span className="inline-block rounded-xl p-[3px] bg-white shadow-md">
                  <Link
                    to={heroCta.to}
                    className="inline-flex items-center justify-center rounded-[10px] bg-[#FF6F61] px-6 py-3 text-sm sm:text-base font-semibold text-white hover:opacity-95 transition-opacity"
                  >
                    {heroCta.label}
                  </Link>
                </span>
              ) : (
                <Link
                  to={heroCta.to}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md hover:bg-white/95 transition-colors"
                >
                  {heroCta.label}
                </Link>
              )}
            </div>
          ) : undefined
        }
      />

      {contentVariant === 'fullBleed' ? (
        <div className="flex flex-col w-full min-w-0">{children}</div>
      ) : (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            <div className="text-gray-700 leading-relaxed space-y-4 text-base">{children}</div>
            {extraCta && (
              <div className="mt-8">
                <Link
                  to={extraCta.to}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  {extraCta.label}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="max-w-site mx-auto px-6 py-12 md:py-16 w-full">
        <h2 className="font-display text-xl font-bold text-gray-900 mb-6">Related listings</h2>
        {!isSupabaseConfigured && (
          <p className="text-sm text-gray-500">Add Supabase credentials to see listings here.</p>
        )}
        {isSupabaseConfigured && error && <p className="text-sm text-red-600">{error}</p>}
        {isSupabaseConfigured && loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {isSupabaseConfigured && !loading && !error && properties.length === 0 && (
          <p className="text-sm text-gray-500">No listings match this section yet. Browse all properties on the listings page.</p>
        )}
        {isSupabaseConfigured && !loading && properties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link
            to="/listings"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View all listings
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:opacity-95 transition-opacity"
          >
            Get in touch
          </Link>
        </div>
      </section>

      {afterRelated}
    </div>
  )
}
