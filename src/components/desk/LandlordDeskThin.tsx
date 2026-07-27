import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

/** Reused from LandlordDesk / SearchDesk — dark text on white card surfaces. */
const TICK_CLASS =
  'mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rotate-[-4deg] items-center justify-center rounded-[3px] border-[1.3px] border-[var(--quni-success)] text-[9px] font-bold text-[var(--quni-success)]'

const BEAT_TEXT = 'flex gap-2.5 text-[13px] leading-snug text-[var(--quni-ink-2)]'

const SECONDARY_DESK_LINK =
  'text-[12.5px] font-semibold text-[var(--quni-ink-3)] hover:text-[var(--quni-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

const WHITE_CARD =
  'rounded-xl bg-[var(--quni-surface-1)] text-[var(--quni-ink)] shadow-[var(--shadow-1)]'

const TILES = [
  {
    word: 'your room',
    line: 'The AI writes and prices the listing from a few details.',
    icon: 'bed' as const,
  },
  {
    word: 'paperwork done',
    line: 'A state-compliant lease, e-signed — you don’t draft a thing.',
    icon: 'lease' as const,
  },
  {
    word: 'your home',
    line: 'You keep living there; a verified student takes the spare room.',
    icon: 'home' as const,
  },
] as const

type LandlordDeskThinProps = {
  onDrawerOpenChange?: (open: boolean) => void
  mobileRail?: boolean
  railExpanded?: boolean
  onRailExpandChange?: (expanded: boolean) => void
  className?: string
  deskAnswer?: { text: string; source: string } | null
  nameplateVariant?: DeskNameplateVariant
  dense?: boolean
}

function formatRentFigure(rent: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(rent)
}

function TileIcon({ kind }: { kind: (typeof TILES)[number]['icon'] }) {
  const common = 'h-5 w-5 shrink-0 text-[var(--quni-ink-2)]'
  if (kind === 'bed') {
    return (
      <svg viewBox="0 0 40 40" className={common} aria-hidden fill="none" stroke="currentColor">
        <path
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 27 V17 h32 v10 M4 27 V32 M36 27 V32 M8 17 V13 h11 v4"
        />
      </svg>
    )
  }
  if (kind === 'lease') {
    return (
      <svg viewBox="0 0 40 40" className={common} aria-hidden fill="none" stroke="currentColor">
        <path
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 5 h13 l6 6 v24 h-19 z M25 5 v6 h6 M16 18 h11 M16 24 h8"
        />
        <circle cx="26" cy="30" r="3" strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40" className={common} aria-hidden fill="none" stroke="currentColor">
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 20 L20 8 L33 20 M10 18 V33 H30 V18 M17 33 V25 h6 v8"
      />
    </svg>
  )
}

function ImageTiles({ open }: { open: boolean }) {
  return (
    <div
      className={
        open
          ? 'grid grid-cols-3 gap-2.5'
          : 'flex flex-col gap-2'
      }
    >
      {TILES.map((tile) => (
        <div
          key={tile.word}
          className={[
            WHITE_CARD,
            'flex gap-2.5 px-2.5 py-2',
            open ? 'flex-col items-center px-2.5 py-3 text-center' : 'items-center',
          ].join(' ')}
        >
          <TileIcon kind={tile.icon} />
          <div className={open ? 'flex flex-col items-center' : 'flex min-w-0 flex-col'}>
            <span className="text-[12px] font-bold text-[var(--quni-ink)]">{tile.word}</span>
            <span
              className={[
                'text-[10.5px] font-medium leading-snug text-[var(--quni-ink-3)]',
                open ? 'mt-1 block' : 'hidden',
              ].join(' ')}
            >
              {tile.line}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function FeeRow({ label, figure }: { label: string; figure: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-[var(--quni-line-soft)] py-2 last:border-b-0">
      <span className="text-[13px] text-[var(--quni-ink-3)]">{label}</span>
      <span className="shrink-0 font-[family-name:var(--font-serif)] text-base font-bold tabular-nums text-[var(--quni-ink)]">
        {figure}
      </span>
    </li>
  )
}

function DrawerBody({ listingFeeDisplay, open }: { listingFeeDisplay: string; open: boolean }) {
  return (
    <div className={['flex flex-col gap-3 px-0.5 py-1', WHITE_CARD, 'px-3.5 py-3.5'].join(' ')}>
      <div className={open ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'flex flex-col gap-3'}>
        <ul className="m-0 space-y-2.5 p-0">
          <li className={BEAT_TEXT}>
            <span aria-hidden className={TICK_CLASS}>
              ✓
            </span>
            <span>
              You choose your tenant and get paid. Quni writes the listing, prices it, screens
              applicants and drafts the lease.
            </span>
          </li>
          <li className="text-[13px] leading-snug text-[var(--quni-ink-2)]">
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

        <ul className="m-0 p-0">
          <FeeRow label="Listing, matching, AI, renewals — everything" figure="$0" />
          <FeeRow label="When you accept a tenant, once" figure={listingFeeDisplay} />
          <FeeRow label="Any other fee" figure="$0" />
        </ul>
      </div>

      <Link to="/for-landlords" className={['inline-block', SECONDARY_DESK_LINK].join(' ')}>
        I need more information →
      </Link>
    </div>
  )
}

/**
 * `/home-v4` landlord desk — thin navy frame, white-card content, image tiles.
 * Does not replace LandlordDesk (`/home-v3` fallback).
 */
export default function LandlordDeskThin({
  onDrawerOpenChange,
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  className = '',
  deskAnswer = null,
  nameplateVariant = 'brass',
  dense = false,
}: LandlordDeskThinProps) {
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
      <span
        className={[
          'font-bold text-[var(--quni-coral-on-navy)]',
          dense ? 'text-[18px]' : 'text-[22px]',
        ].join(' ')}
      >
        {formatRentFigure(rent)}
      </span>{' '}
      a week — verified student, paperwork done.
    </DeskLetterhead>
  )

  const letterheadMobile = (
    <p className="font-[family-name:var(--font-serif)] text-[14.5px] leading-snug text-white">
      List free ·{' '}
      <span className="font-bold text-[var(--quni-coral-on-navy)]">{listingFeeDisplay}</span> on
      accept
    </p>
  )

  const answered = Boolean(deskAnswer?.text)

  const face = (
    <>
      <ImageTiles open={drawerOpen} />
      <DeskInTray>
        <LedgerCalculator compact={dense || mobileRail} onRentChange={setRent} />
      </DeskInTray>
      <DeskPen to="/signup?role=landlord">List my room →</DeskPen>
      <DeskDrawer label="How it works — & every fee" open={drawerOpen} onOpenChange={setDrawer}>
        <DrawerBody listingFeeDisplay={listingFeeDisplay} open={drawerOpen} />
      </DeskDrawer>
      <DeskAnswerPanel
        open={answered}
        answer={deskAnswer?.text ?? ''}
        source={deskAnswer?.source ?? 'QUNI PRICING'}
        tone="navy"
      />
    </>
  )

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-shell desk-settle overflow-hidden rounded-[var(--radius-lg)] bg-[var(--quni-navy)] text-white/78',
          'shadow-[var(--shadow-1)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          aria-expanded={railExpanded}
          onClick={() => onRailExpandChange?.(!railExpanded)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral-on-navy)]"
        >
          <DeskNameplate
            variant={nameplateVariant}
            onDark={
              nameplateVariant === 'bronze' ||
              nameplateVariant === 'darkPlate' ||
              nameplateVariant === 'letterpress'
            }
            className="!px-2 !py-1"
          >
            HOMEOWNERS & LANDLORDS
          </DeskNameplate>
          <div className="min-w-0 flex-1">{letterheadMobile}</div>
          <span aria-hidden className="text-[14px] text-white">
            {railExpanded ? '⊖' : '⊕'}
          </span>
        </button>

        <div
          className={[
            'grid transition-[grid-template-rows] duration-[320ms] ease-[var(--ease-standard)]',
            railExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="flex flex-col gap-3 px-4 pb-5"
              aria-hidden={!railExpanded}
            >
              {face}
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <Desk
      tone="navy"
      className={['min-h-full', dense ? '!gap-1.5 !p-2.5' : '', className].filter(Boolean).join(' ')}
      nameplate={
        <DeskNameplate
          variant={nameplateVariant}
          onDark={
            nameplateVariant === 'bronze' ||
            nameplateVariant === 'darkPlate' ||
            nameplateVariant === 'letterpress'
          }
        >
          FOR HOMEOWNERS & LANDLORDS
        </DeskNameplate>
      }
      letterhead={letterhead}
      inTray={
        <div className={['flex flex-col', dense ? 'gap-1.5' : 'gap-2.5'].join(' ')}>{face}</div>
      }
    />
  )
}
