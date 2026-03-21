import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PropertyCard } from './PropertyCard'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchRelatedListings, type RelatedListingsMode } from '../lib/relatedListings'
import type { Property } from '../lib/listings'

type ExtraCta = { label: string; to: string }

type Props = {
  title: string
  subtitle: string
  relatedMode: RelatedListingsMode
  children: React.ReactNode
  extraCta?: ExtraCta
}

export default function ServicePageLayout({ title, subtitle, relatedMode, children, extraCta }: Props) {
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
      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-base sm:text-lg text-white/95 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>
      </section>

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
    </div>
  )
}
