import { useEffect, useMemo, useState } from 'react'
import Seo from '../components/Seo'
import {
  AccountDesk,
  FieldReceptionDesk,
  PapersBlock,
  SearchDesk,
  TrustDesk,
  UniversitiesDesk,
} from '../components/desk'
import LandlordDeskThin from '../components/desk/LandlordDeskThin'
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
 * `/home-v4` — `/home-v3` + thin landlord / directional expand / members door.
 * Chrome-less; noindex; Preview experiment. Does not modify `/home-v3`.
 */
export default function HomeV4() {
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

  const plates = DESK_NAMEPLATE_VARIANTS
  const pageUnlocked = Boolean(landlordDrawerOpen || openTray || activeAnswer)

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
    <div
      className={[
        'home-v4-page bg-[var(--quni-page)] text-[var(--quni-ink-3)]',
        pageUnlocked ? 'is-unlocked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Seo
        title="Home (thin desk prototype)"
        description="Quni Living /home-v4 desk prototype — thin landlord, directional expand; not for search indexing."
        canonicalPath="/home-v4"
        noindex
      />

      {/* Desktop bento — lg+ only so tablets use the stacked mobile layout */}
      <div className="home-v4-office desk-office relative hidden flex-1 flex-col px-3 py-2 lg:flex lg:px-3.5">
        <div className={`home-v4-frame ${SITE_CONTENT_MAX_CLASS.replace('px-3 sm:px-6', '')}`}>
          <div className="home-v4-shell">
            <div
              className={[
                'home-v4-top',
                landlordDrawerOpen ? 'is-ll-open' : '',
                landlordDrawerOpen || activeAnswer ? 'is-grown' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="home-v4-area-reception relative z-20 flex min-h-0 flex-col self-start">
                <FieldReceptionDesk
                  onSelectQuestion={onSelectQuestion}
                  answer={answerFor('reception')}
                  className="w-full"
                />
              </div>
              <div className="home-v4-area-search flex min-h-0 flex-col self-stretch">
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
              <div className="home-v4-area-landlord flex min-h-0 flex-col self-start">
                <LandlordDeskThin
                  onDrawerOpenChange={setLandlordDrawerOpen}
                  dense
                  nameplateVariant={plates.landlord}
                  deskAnswer={answerFor('landlord')}
                  className="h-auto w-full"
                />
              </div>
            </div>

            <div className="home-v4-bot">
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
                <TrustDesk
                  trayOpen={openTray === 'trust'}
                  onTrayOpenChange={(open) => setTray('trust', open)}
                  nameplateVariant={plates.trust}
                  deskAnswer={answerFor('trust')}
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
                  memberDoor
                  nameplateLabel="Simple account management"
                  className="h-full min-h-full flex-1"
                />
              </div>
            </div>
          </div>

          <div className="home-v4-papers">
            <PapersBlock compact />
          </div>
        </div>
      </div>

      {/* Mobile / tablet: single column — landlord full-width under content */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-6 lg:hidden">
        <FieldReceptionDesk
          onSelectQuestion={onSelectQuestion}
          answer={answerFor('reception')}
          className="w-full"
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
          className="w-full"
        />

        <LandlordDeskThin
          mobileRail
          railExpanded={openRail === 'landlord'}
          onRailExpandChange={(open) => setOpenRail(open ? 'landlord' : null)}
          nameplateVariant={plates.landlord}
          deskAnswer={answerFor('landlord')}
          className="w-full min-w-0"
        />
        <UniversitiesDesk
          chips={uniCoverage}
          mobileRail
          railExpanded={openRail === 'uni'}
          onRailExpandChange={(open) => setOpenRail(open ? 'uni' : null)}
          nameplateVariant={plates.universities}
          className="w-full"
        />
        <TrustDesk
          mobileRail
          railExpanded={openRail === 'trust'}
          onRailExpandChange={(open) => setOpenRail(open ? 'trust' : null)}
          nameplateVariant={plates.trust}
          deskAnswer={answerFor('trust')}
          className="w-full"
        />
        <AccountDesk
          mobileRail
          railExpanded={openRail === 'account'}
          onRailExpandChange={(open) => setOpenRail(open ? 'account' : null)}
          nameplateVariant={plates.account}
          memberDoor
          nameplateLabel="Simple account management"
          className="w-full"
        />

        <PapersBlock />
      </div>
    </div>
  )
}
