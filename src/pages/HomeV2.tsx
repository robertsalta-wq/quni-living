import { useEffect, useMemo, useState } from 'react'
import Seo from '../components/Seo'
import {
  AccountDesk,
  LandlordDesk,
  PapersBlock,
  ReceptionDesk,
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
type BottomTray = 'landlord' | 'uni' | 'account' | 'trust' | null

/**
 * Desk-system home (preview candidate).
 * Header stays in MarketingChromeLayout; PapersBlock replaces the mega-footer.
 * Reception is a compact full-width band above Listings + Landlord (the two grand desks).
 * Mobile: docked Reception bar → full-screen chat (no inline band).
 */
export default function HomeV2() {
  const [landlordDrawerOpen, setLandlordDrawerOpen] = useState(false)
  const [openRail, setOpenRail] = useState<RailId>(null)
  const [openTray, setOpenTray] = useState<BottomTray>(null)
  const [listings, setListings] = useState<Property[]>([])
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [uniCoverage, setUniCoverage] = useState<{ label: string; homes: number }[]>([])

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
        .limit(18)

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
    if (first?.suburb) {
      return `${listingCount} live · including ${first.suburb}`
    }
    return `${listingCount} live listing${listingCount === 1 ? '' : 's'} near campus`
  }, [listingCount, listings])

  // Reception band on top; Listings + Landlord co-anchor; windows on the bottom row.
  const gridCols = landlordDrawerOpen ? '0.85fr 0.85fr 1.3fr' : '1.15fr 0.95fr 0.9fr'
  const gridRows =
    landlordDrawerOpen || openTray
      ? 'auto minmax(min-content, 1.15fr) minmax(min-content, 1fr) auto'
      : 'auto minmax(min-content, 1.15fr) minmax(min-content, 1fr) minmax(min-content, 0.78fr)'

  function setTray(id: BottomTray, open: boolean) {
    setOpenTray(open ? id : null)
  }

  return (
    <div className="flex w-full flex-col bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)] pb-[4.5rem] sm:pb-0">
      <Seo
        title="Quni Living — verified student & professional housing"
        description="Verified rooms near campus — ask Reception, browse listings, and list a spare room. Preview experiment; not for search indexing."
        canonicalPath="/"
        noindex
      />

      {/* Desktop bento — header from MarketingChrome; no duplicate Log in */}
      <div className="desk-office relative hidden flex-1 flex-col px-3 py-2.5 md:flex lg:px-3.5">
        <div
          className={`${SITE_CONTENT_MAX_CLASS.replace('px-3 sm:px-6', '')} flex flex-1 flex-col`}
          style={{ maxWidth: 1200 }}
        >
          <div
            className="grid flex-1 items-stretch gap-2.5"
            style={{
              minHeight: 'calc(100dvh - 7.5rem)',
              gridTemplateAreas: `'reception reception reception' 'search search landlord' 'search search landlord' 'uni account trust'`,
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              transition: landlordDrawerOpen
                ? 'grid-template-columns 320ms var(--ease-standard)'
                : 'grid-template-columns 320ms var(--ease-standard), grid-template-rows 320ms var(--ease-standard)',
            }}
          >
            <div style={{ gridArea: 'reception' }} className="flex min-h-0 flex-col self-start">
              <ReceptionDesk className="w-full" />
            </div>
            <div style={{ gridArea: 'search' }} className="flex min-h-0 flex-col self-stretch">
              <SearchDesk
                listings={listings}
                listingCount={listingCount}
                activityLine={activityLine}
                uniCoverage={uniCoverage}
                className="min-h-full flex-1"
              />
            </div>
            <div style={{ gridArea: 'landlord' }} className="flex min-h-0 flex-col self-stretch">
              <LandlordDesk
                onDrawerOpenChange={setLandlordDrawerOpen}
                className="min-h-full flex-1"
              />
            </div>
            <div style={{ gridArea: 'uni' }} className="flex min-h-0 flex-col self-stretch">
              <UniversitiesDesk
                chips={uniCoverage}
                trayOpen={openTray === 'uni'}
                onTrayOpenChange={(open) => setTray('uni', open)}
                className="min-h-full flex-1"
              />
            </div>
            <div style={{ gridArea: 'account' }} className="flex min-h-0 flex-col self-stretch">
              <AccountDesk
                trayOpen={openTray === 'account'}
                onTrayOpenChange={(open) => setTray('account', open)}
                className="min-h-full flex-1"
              />
            </div>
            <div style={{ gridArea: 'trust' }} className="flex min-h-0 flex-col self-stretch">
              <TrustDesk
                trayOpen={openTray === 'trust'}
                onTrayOpenChange={(open) => setTray('trust', open)}
                className="min-h-full flex-1"
              />
            </div>
          </div>

          <PapersBlock compact />
        </div>
      </div>

      {/* Mobile: listings + rails; Reception is the docked bar → full-screen helper */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6 md:hidden">
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
