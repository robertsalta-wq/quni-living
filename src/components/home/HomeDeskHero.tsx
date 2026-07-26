import { useEffect, useMemo, useState } from 'react'
import {
  LandlordDesk,
  ReceptionDesk,
  SearchDesk,
} from '../desk'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../../lib/propertyListingDateWindow'
import type { Property } from '../../lib/listings'
import { isSupabaseConfigured } from '../../lib/supabaseConfigured'
import '../desk/desk.css'

/**
 * Preview-only home hero: Listings (~67%) | Reception over Landlord (~33%).
 * Matches /home-v2 desk ratio (2 of 3 cols). Replaces only the coral hero.
 */
export default function HomeDeskHero() {
  const [listings, setListings] = useState<Property[]>([])
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [uniCoverage, setUniCoverage] = useState<{ label: string; homes: number }[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    void (async () => {
      const { supabase } = await import('../../lib/supabase')
      if (cancelled) return

      const countRes = await applyPropertyListingDateWindow(
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        listingIsoDateUtc(),
      ).eq('status', 'active')

      const listRes = await applyPropertyListingDateWindow(
        supabase.from('properties').select(
          `
          *,
          landlord_profiles ( id, full_name, avatar_url, verified ),
          universities ( id, name, slug ),
          campuses ( id, name, slug )
        `,
        ),
        listingIsoDateUtc(),
      )
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)

      const coverRes = await applyPropertyListingDateWindow(
        supabase.from('properties').select('universities ( name, slug )'),
        listingIsoDateUtc(),
      ).eq('status', 'active')

      if (cancelled) return

      if (!countRes.error) setListingCount(countRes.count ?? 0)
      if (!listRes.error) setListings((listRes.data ?? []) as Property[])

      if (!coverRes.error && coverRes.data) {
        const tallies = new Map<string, number>()
        for (const row of coverRes.data as { universities: { name: string; slug: string } | null }[]) {
          const name = row.universities?.name?.trim()
          if (!name) continue
          tallies.set(name, (tallies.get(name) ?? 0) + 1)
        }
        setUniCoverage(
          [...tallies.entries()]
            .map(([label, homes]) => ({ label, homes }))
            .sort((a, b) => b.homes - a.homes),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const activityLine = useMemo(() => {
    if (listingCount == null) return 'Loading live listings…'
    if (listingCount === 0) return 'Listings go live as they are verified'
    const first = listings[0]
    if (first?.suburb) return `${listingCount} live · including ${first.suburb}`
    return `${listingCount} live listing${listingCount === 1 ? '' : 's'} near campus`
  }, [listingCount, listings])

  const searchProps = {
    listings,
    listingCount,
    activityLine,
    uniCoverage,
    className: 'min-h-0',
  } as const

  return (
    <section
      className="overflow-hidden border-b border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)]"
      aria-label="Listings and Ask Quni"
    >
      <div className="mx-auto max-w-site px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Desktop: Listings 2/3 · Reception over Landlord 1/3 (content-height, no stretch bleed) */}
        <div className="hidden items-start gap-2.5 md:grid md:grid-cols-3">
          <div className="min-w-0 md:col-span-2">
            <SearchDesk {...searchProps} />
          </div>
          <div className="flex min-w-0 flex-col gap-2.5">
            <ReceptionDesk className="min-h-[320px]" />
            <LandlordDesk className="w-full min-h-0" />
          </div>
        </div>

        {/* Mobile: Listings → Reception → Landlord */}
        <div className="flex flex-col gap-4 md:hidden">
          <SearchDesk {...searchProps} />
          <ReceptionDesk mobileRail />
          <LandlordDesk className="w-full min-h-0" />
        </div>
      </div>
    </section>
  )
}
