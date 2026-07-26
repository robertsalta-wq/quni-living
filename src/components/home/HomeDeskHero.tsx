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
 * Preview-only home hero: Listings + Reception (½ + ½), optional Landlord row below.
 * Replaces only the coral hero — rest of Home.tsx stays untouched.
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

  return (
    <section
      className="border-b border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)]"
      aria-label="Listings and Ask Quni"
    >
      <div className="mx-auto max-w-site px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Two balanced columns — Reception never full-bleed */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5">
          <SearchDesk
            listings={listings}
            listingCount={listingCount}
            activityLine={activityLine}
            uniCoverage={uniCoverage}
            className="min-h-0"
          />
          <div className="hidden min-h-0 md:block">
            <ReceptionDesk className="h-full min-h-[420px]" />
          </div>
          <div className="md:hidden">
            <ReceptionDesk mobileRail />
          </div>
        </div>

        {/* Optional landlord row — full width under the pair */}
        <div className="mt-4 md:mt-5">
          <LandlordDesk className="w-full" />
        </div>
      </div>
    </section>
  )
}
