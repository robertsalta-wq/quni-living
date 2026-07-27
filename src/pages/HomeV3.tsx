import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import {
  AccountDesk,
  FieldReceptionDesk,
  LandlordDesk,
  PapersBlock,
  SearchDesk,
  TrustDesk,
  UniversitiesDesk,
} from '../components/desk'
import type { DeskFaqItem, DeskFaqOwner } from '../lib/deskFaqIndex'
import { DESK_NAMEPLATE_VARIANTS } from '../lib/deskNameplateVariants'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../lib/propertyListingDateWindow'
import type { Property } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabaseConfigured'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'
import '../components/desk/desk.css'

type RailId = 'landlord' | 'uni' | 'account' | 'trust' | null
type BottomTray = 'uni' | 'account' | 'trust' | null

type ActiveAnswer = {
  ownerDesk: DeskFaqOwner
  text: string
  source: string
} | null

/**
 * `/home-v3` — copy of `/home-v2` desk home plus field-based Reception
 * (Places / Questions). Chrome-less; noindex; Preview experiment.
 */
export default function HomeV3() {
  const [landlordDrawerOpen, setLandlordDrawerOpen] = useState(false)
  const [openRail, setOpenRail] = useState<RailId>(null)
  const [openTray, setOpenTray] = useState<BottomTray>(null)
  const [listings, setListings] = useState<Property[]>([])
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [uniCoverage, setUniCoverage] = useState<{ label: string; homes: number }[]>([])
  const [activeAnswer, setActiveAnswer] = useState<ActiveAnswer>(null)

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

  // Column reflow is top-grid only — bottom uni/account/trust stay equal 1fr×3.
  const topCols = landlordDrawerOpen ? '0.7fr 0.7fr 1.85fr' : '1fr 1fr 1fr'
  // Soft one-screen floor; min-content lets the landlord drawer grow the page and scroll.
  const topRows =
    landlordDrawerOpen || activeAnswer
      ? 'minmax(min-content, auto) minmax(min-content, 1fr)'
      : 'auto minmax(0, 1fr)'

  const plates = DESK_NAMEPLATE_VARIANTS

  function setTray(id: BottomTray, open: boolean) {
    setOpenTray(open ? id : null)
  }

  function onSelectQuestion(item: DeskFaqItem) {
    setActiveAnswer({
      ownerDesk: item.ownerDesk,
      text: item.answer,
      source: item.source,
    })
  }

  function answerFor(desk: DeskFaqOwner) {
    if (activeAnswer?.ownerDesk !== desk) return null
    return { text: activeAnswer.text, source: activeAnswer.source }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--quni-page)] text-[var(--quni-ink-3)]">
      <Seo
        title="Home (Reception desk prototype)"
        description="Quni Living /home-v3 Reception desk prototype — Places and Questions; not for search indexing."
        canonicalPath="/home-v3"
        noindex
      />

      {/* Desktop — mock grid: Reception 2-col above Listings; Landlord tall right */}
      <div className="desk-office relative hidden flex-1 flex-col px-3 py-2 md:flex lg:px-3.5">
        <Link
          to="/login"
          className="absolute top-3 right-5 z-[15] rounded-full border border-[var(--quni-line)] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[var(--quni-ink)] shadow-[var(--shadow-1)] hover:border-[var(--quni-coral-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        >
          Log in
        </Link>

        <div
          className={`${SITE_CONTENT_MAX_CLASS.replace('px-3 sm:px-6', '')} flex flex-1 flex-col`}
          style={{ maxWidth: 1200 }}
        >
          <div
            className="flex flex-1 flex-col gap-2"
            style={{ minHeight: 'calc(100dvh - 6.5rem)' }}
          >
            {/* Top: Reception / Listings / Landlord — drawer may widen landlord + grow page height */}
            <div
              className="grid flex-1 items-stretch gap-2"
              style={{
                gridTemplateAreas: `'reception reception landlord' 'search search landlord'`,
                gridTemplateColumns: topCols,
                gridTemplateRows: topRows,
                transition: landlordDrawerOpen
                  ? 'grid-template-columns 320ms var(--ease-standard)'
                  : 'grid-template-columns 320ms var(--ease-standard), grid-template-rows 320ms var(--ease-standard)',
              }}
            >
              <div style={{ gridArea: 'reception' }} className="relative z-20 flex min-h-0 flex-col self-start">
                <FieldReceptionDesk
                  onSelectQuestion={onSelectQuestion}
                  answer={answerFor('reception')}
                  className="w-full"
                />
              </div>
              <div style={{ gridArea: 'search' }} className="flex min-h-0 flex-col self-stretch">
                <SearchDesk
                  listings={listings}
                  listingCount={listingCount}
                  activityLine={activityLine}
                  uniCoverage={uniCoverage}
                  listingsOnly
                  dense
                  nameplateVariant={plates.listings}
                  deskAnswer={answerFor('listings')}
                  className="min-h-full flex-1"
                />
              </div>
              <div style={{ gridArea: 'landlord' }} className="flex min-h-0 flex-col self-stretch">
                <LandlordDesk
                  onDrawerOpenChange={setLandlordDrawerOpen}
                  dense
                  nameplateVariant={plates.landlord}
                  deskAnswer={answerFor('landlord')}
                  className="min-h-full flex-1"
                />
              </div>
            </div>

            {/* Bottom: always equal thirds — immune to landlord column reflow */}
            <div className="grid grid-cols-3 items-stretch gap-2">
              <div className="flex min-h-0 flex-col self-stretch">
                <UniversitiesDesk
                  chips={uniCoverage}
                  trayOpen={openTray === 'uni'}
                  onTrayOpenChange={(open) => setTray('uni', open)}
                  nameplateVariant={plates.universities}
                  dense
                  className="h-full min-h-full flex-1"
                />
              </div>
              <div className="flex min-h-0 flex-col self-stretch">
                <AccountDesk
                  trayOpen={openTray === 'account'}
                  onTrayOpenChange={(open) => setTray('account', open)}
                  nameplateVariant={plates.account}
                  dense
                  className="h-full min-h-full flex-1"
                />
              </div>
              <div className="flex min-h-0 flex-col self-stretch">
                <TrustDesk
                  trayOpen={openTray === 'trust'}
                  onTrayOpenChange={(open) => setTray('trust', open)}
                  nameplateVariant={plates.trust}
                  deskAnswer={answerFor('trust')}
                  dense
                  className="h-full min-h-full flex-1"
                />
              </div>
            </div>
          </div>

          <PapersBlock compact />
        </div>
      </div>

      {/* Mobile: Reception first (field included), then Listings filters/cards, then rails */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6 md:hidden">
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/login"
            className="rounded-full border border-[var(--quni-line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--quni-ink)] shadow-[var(--shadow-1)]"
          >
            Log in
          </Link>
        </div>

        <FieldReceptionDesk
          onSelectQuestion={onSelectQuestion}
          answer={answerFor('reception')}
        />

        <SearchDesk
          listings={listings}
          listingCount={listingCount}
          activityLine={activityLine}
          uniCoverage={uniCoverage}
          listingsOnly
          compact
          nameplateVariant={plates.listings}
          deskAnswer={answerFor('listings')}
        />

        <div className="flex flex-col gap-2">
          <LandlordDesk
            mobileRail
            railExpanded={openRail === 'landlord'}
            onRailExpandChange={(open) => setOpenRail(open ? 'landlord' : null)}
            nameplateVariant={plates.landlord}
            deskAnswer={answerFor('landlord')}
          />
          <UniversitiesDesk
            chips={uniCoverage}
            mobileRail
            railExpanded={openRail === 'uni'}
            onRailExpandChange={(open) => setOpenRail(open ? 'uni' : null)}
            nameplateVariant={plates.universities}
          />
          <AccountDesk
            mobileRail
            railExpanded={openRail === 'account'}
            onRailExpandChange={(open) => setOpenRail(open ? 'account' : null)}
            nameplateVariant={plates.account}
          />
          <TrustDesk
            mobileRail
            railExpanded={openRail === 'trust'}
            onRailExpandChange={(open) => setOpenRail(open ? 'trust' : null)}
            nameplateVariant={plates.trust}
            deskAnswer={answerFor('trust')}
          />
        </div>

        <PapersBlock />
      </div>
    </div>
  )
}
