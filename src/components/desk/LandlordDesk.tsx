import { useEffect, useState } from 'react'
import { fetchPricingForPropertyTier, formatFeeForDisplay } from '../../lib/pricing'
import Desk from './Desk'
import DeskAnswerPanel from './DeskAnswerPanel'
import DeskDrawer from './DeskDrawer'
import DeskInTray from './DeskInTray'
import DeskLetterhead from './DeskLetterhead'
import DeskNameplate from './DeskNameplate'
import DeskPen from './DeskPen'
import LedgerCalculator, { RENT_DEFAULT } from './LedgerCalculator'
import type { DeskNameplateVariant } from '../../lib/deskNameplateVariants'
import './desk.css'

const TICK_CLASS =
  'mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-sm font-bold text-white/55'

const BEAT_TEXT =
  'flex gap-2.5 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-white/85'

const SECONDARY_DESK_LINK =
  'text-sm font-semibold text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral-active)]'

type LandlordDeskProps = {
  /** Notify parent when drawer opens (bento column reflow). */
  onDrawerOpenChange?: (open: boolean) => void
  /** Mobile rail: collapsed header until expanded. */
  mobileRail?: boolean
  railExpanded?: boolean
  onRailExpandChange?: (expanded: boolean) => void
  className?: string
  /** Optional FAQ answer shown in-desk (questions owned by Landlord). */
  deskAnswer?: { text: string; source: string } | null
  /** Nameplate treatment — default brass keeps `/home-v2` control. */
  nameplateVariant?: DeskNameplateVariant
  /** `/home-v3` — tighter padding so the tall landlord column can compress. */
  dense?: boolean
}

function formatRentFigure(rent: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(rent)
}

function DrawerBody() {
  return (
    <div className="flex flex-col gap-[13px] border-t border-white/15 px-0.5 pt-3 text-white/85">
      <ul className="m-0 space-y-2.5 p-0">
        <li className={BEAT_TEXT}>
          <span aria-hidden className={TICK_CLASS}>
            ✓
          </span>
          <span>
            You choose your tenant and get paid. Quni writes the listing, prices it, screens applicants
            and drafts the lease.
          </span>
        </li>
        <li className="text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-white/70">
          Free to list. One $99 fee, only if you accept someone. No lock-in — leave any time.
        </li>
        <li className={BEAT_TEXT}>
          <span aria-hidden className={TICK_CLASS}>
            ✓
          </span>
          <span>
            Every applicant is ID- and enrolment-verified before they reach you · the lease is
            state-compliant and e-signed · your contact stays private until you accept.
          </span>
        </li>
      </ul>

      <div className="flex flex-col gap-2.5 pt-1">
        <DeskPen to="/signup?role=landlord">List my room →</DeskPen>
        <a
          href="https://quni-living-git-feat-for-landlords-desk-page-4-logistics.vercel.app/for-landlords"
          className={['inline-block', SECONDARY_DESK_LINK].join(' ')}
        >
          I need more information →
        </a>
      </div>
    </div>
  )
}

/** Grand desk — homeowners & landlords. Paperweight vacant. */
export default function LandlordDesk({
  onDrawerOpenChange,
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  className = '',
  deskAnswer = null,
  nameplateVariant = 'brass',
  dense = false,
}: LandlordDeskProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rent, setRent] = useState(RENT_DEFAULT)
  const [listingFeeDisplay, setListingFeeDisplay] = useState('$99')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const listingCell = await fetchPricingForPropertyTier('t1', 'listing')
        const listing = formatFeeForDisplay(listingCell)
        if (!cancelled) {
          setListingFeeDisplay(listing.landlordFeeDisplay)
        }
      } catch {
        // keep defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function setDrawer(open: boolean) {
    setDrawerOpen(open)
    onDrawerOpenChange?.(open)
  }

  const letterhead = (
    <DeskLetterhead>
      Your spare room could be{' '}
      <span className="text-lg font-bold text-[var(--quni-coral-active)]">
        {formatRentFigure(rent)}
      </span>{' '}
      a week — verified student, paperwork done.
    </DeskLetterhead>
  )

  const letterheadMobile = (
    <p className="font-[family-name:var(--font-sans)] text-base leading-snug text-white">
      List free ·{' '}
      <span className="font-bold text-[var(--quni-coral-active)]">{listingFeeDisplay}</span> on
      accept
    </p>
  )

  const waxSeal = (
    <p className="font-[family-name:var(--font-serif)] text-xs italic leading-snug text-white/45">
      The wax seal waits for the day you accept a tenant.
    </p>
  )

  const answered = Boolean(deskAnswer?.text)

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-shell desk-settle overflow-hidden rounded-[var(--radius-lg)] bg-[var(--quni-ink)] text-white/78',
          'shadow-[var(--shadow-1)] [contain:layout_paint]',
          answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          aria-expanded={railExpanded}
          onClick={() => onRailExpandChange?.(!railExpanded)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral-active)]"
        >
          <DeskNameplate
            variant={nameplateVariant}
            onDark
            className="!px-2 !py-1 [&_span]:whitespace-normal "
          >
            HOMEOWNERS & LANDLORDS
          </DeskNameplate>
          <div className="min-w-0 flex-1">{letterheadMobile}</div>
          <span aria-hidden className="text-sm text-[var(--quni-coral-active)]">
            {railExpanded ? '⊖' : '⊕'}
          </span>
        </button>

        {railExpanded ? (
          <div className="flex flex-col gap-4 px-4 pb-5">
            <DeskInTray>
              <LedgerCalculator compact onRentChange={setRent} />
            </DeskInTray>
            <DeskPen to="/signup?role=landlord">List my room →</DeskPen>
            <DeskDrawer
              label="How it works — & every fee"
              open={drawerOpen}
              onOpenChange={setDrawer}
            >
              <DrawerBody />
            </DeskDrawer>
            <DeskAnswerPanel
              open={answered}
              answer={deskAnswer?.text ?? ''}
              source={deskAnswer?.source ?? 'QUNI PRICING'}
              tone="ink"
            />
            {waxSeal}
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <Desk
      tone="ink"
      className={[
        'min-h-full',
        dense ? '!gap-1.5 !p-2.5' : '',
        answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      nameplate={
        <DeskNameplate
          variant={nameplateVariant}
          onDark
        >
          FOR HOMEOWNERS & LANDLORDS
        </DeskNameplate>
      }
      letterhead={letterhead}
      inTray={
        <DeskInTray>
          <LedgerCalculator compact={dense} onRentChange={setRent} />
        </DeskInTray>
      }
      pen={<DeskPen to="/signup?role=landlord">List my room →</DeskPen>}
      drawer={
        <DeskDrawer label="How it works — & every fee" open={drawerOpen} onOpenChange={setDrawer}>
          <DrawerBody />
        </DeskDrawer>
      }
      foot={
        <>
          <DeskAnswerPanel
            open={answered}
            answer={deskAnswer?.text ?? ''}
            source={deskAnswer?.source ?? 'QUNI PRICING'}
            tone="ink"
          />
          {dense ? null : waxSeal}
        </>
      }
    />
  )
}
