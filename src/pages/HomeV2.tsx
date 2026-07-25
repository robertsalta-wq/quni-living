import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import {
  AccountDesk,
  LandlordDesk,
  PapersBlock,
  SearchDesk,
  TrustDesk,
  UniversitiesDesk,
} from '../components/desk'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../lib/propertyListingDateWindow'
import type { Property } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabaseConfigured'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'
import '../components/desk/desk.css'

type RailId = 'landlord' | 'uni' | 'account' | 'trust' | null

/**
 * Full desk-shell home — layout/behaviour from the Claude bento mockup;
 * tokens + live lookups from the production app. No invented inventory.
 */
export default function HomeV2() {
  const [landlordDrawerOpen, setLandlordDrawerOpen] = useState(false)
  const [openRail, setOpenRail] = useState<RailId>(null)
  const [listings, setListings] = useState<Property[]>([])
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [uniCoverage, setUniCoverage] = useState<{ label: string; homes: number }[]>([])
  const [campusCount, setCampusCount] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    void (async () => {
      const { supabase } = await import('../lib/supabase')
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

      const campusRes = await supabase.from('campuses').select('id', { count: 'exact', head: true })

      if (cancelled) return

      if (!countRes.error) setListingCount(countRes.count ?? 0)
      if (!listRes.error) setListings((listRes.data ?? []) as Property[])
      if (!campusRes.error) setCampusCount(campusRes.count ?? 0)

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
    if (first?.suburb) {
      return `${listingCount} live · including ${first.suburb}`
    }
    return `${listingCount} live listing${listingCount === 1 ? '' : 's'} near campus`
  }, [listingCount, listings])

  const gridCols = landlordDrawerOpen ? '0.7fr 0.7fr 1.85fr' : '1fr 1fr 1fr'
  const gridRows = landlordDrawerOpen
    ? 'auto auto auto'
    : 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,0.72fr)'

  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)] md:h-dvh md:max-h-dvh md:overflow-hidden">
      <Seo
        title="Home (desk prototype)"
        description="Quni Living desk-shell home prototype — not for search indexing."
        canonicalPath="/home-v2"
        noindex
      />

      {/* Desktop bento — locked to one viewport; drawer open may scroll */}
      <div
        className={[
          'desk-office relative hidden min-h-0 flex-1 flex-col px-3 py-2.5 md:flex lg:px-3.5',
          landlordDrawerOpen ? 'overflow-y-auto' : 'overflow-hidden',
        ].join(' ')}
      >
        <Link
          to="/login"
          className="absolute top-3 right-5 z-[15] rounded-full border border-[var(--quni-line)] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[var(--quni-ink)] shadow-[var(--shadow-1)] hover:border-[var(--quni-coral-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        >
          Log in
        </Link>

        <div
          className={`${SITE_CONTENT_MAX_CLASS.replace('px-3 sm:px-6', '')} flex min-h-0 flex-1 flex-col`}
          style={{ maxWidth: 1200 }}
        >
          <div
            className="grid min-h-0 flex-1 gap-2.5"
            style={{
              gridTemplateAreas: `'search search landlord' 'search search landlord' 'uni account trust'`,
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              transition: landlordDrawerOpen
                ? 'grid-template-columns 320ms var(--ease-standard)'
                : 'grid-template-columns 320ms var(--ease-standard), grid-template-rows 320ms var(--ease-standard)',
            }}
          >
            <div style={{ gridArea: 'search' }} className="min-h-0">
              <SearchDesk
                listings={listings}
                listingCount={listingCount}
                activityLine={activityLine}
                uniCoverage={uniCoverage}
                className="h-full"
              />
            </div>
            <div style={{ gridArea: 'landlord' }} className="min-h-0">
              <LandlordDesk onDrawerOpenChange={setLandlordDrawerOpen} className="h-full" />
            </div>
            <div style={{ gridArea: 'uni' }} className="min-h-0">
              <UniversitiesDesk campusCount={campusCount} chips={uniCoverage} className="h-full" />
            </div>
            <div style={{ gridArea: 'account' }} className="min-h-0">
              <AccountDesk className="h-full" />
            </div>
            <div style={{ gridArea: 'trust' }} className="min-h-0">
              <TrustDesk className="h-full" />
            </div>
          </div>

          <PapersBlock compact />
        </div>
      </div>

      {/* Mobile: search stage + expandable rails */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <img
            src="/quni-logo.png"
            srcSet="/quni-logo.png 1x, /quni-logo@2x.png 2x"
            alt="Quni"
            width={72}
            height={24}
            className="h-6 w-auto"
          />
          <Link
            to="/login"
            className="rounded-full border border-[var(--quni-line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--quni-ink)] shadow-[var(--shadow-1)]"
          >
            Log in
          </Link>
        </div>

        <SearchDesk
          listings={listings}
          listingCount={listingCount}
          activityLine={activityLine}
          uniCoverage={uniCoverage}
          compact
        />

        <div className="flex flex-col gap-2">
          <LandlordDesk
            mobileRail
            railExpanded={openRail === 'landlord'}
            onRailExpandChange={(open) => setOpenRail(open ? 'landlord' : null)}
          />
          <UniversitiesDesk
            campusCount={campusCount}
            chips={uniCoverage}
            mobileRail
            railExpanded={openRail === 'uni'}
            onRailExpandChange={(open) => setOpenRail(open ? 'uni' : null)}
          />
          <AccountDesk
            mobileRail
            railExpanded={openRail === 'account'}
            onRailExpandChange={(open) => setOpenRail(open ? 'account' : null)}
          />
          <TrustDesk
            mobileRail
            railExpanded={openRail === 'trust'}
            onRailExpandChange={(open) => setOpenRail(open ? 'trust' : null)}
          />
        </div>

        <PapersBlock />
      </div>
    </div>
  )
}
