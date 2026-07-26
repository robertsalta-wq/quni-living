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

const HOW_IT_WORKS = [
  'Applicants arrive ID- & uni-verified',
  'AI writes, prices & screens for you',
  'Room lease, state-compliant, e-signed',
  'Your contact stays private until you accept',
] as const

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
}

function formatRentFigure(rent: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(rent)
}

function DrawerBody({
  listingFeeDisplay,
  managedFeeDisplay,
}: {
  listingFeeDisplay: string
  managedFeeDisplay: string
}) {
  return (
    <div className="flex flex-col gap-[13px] rounded-xl bg-[var(--quni-surface-1)] px-[17px] py-4 text-[var(--quni-ink)]">
      <div>
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
          How it works
        </h3>
        <ul className="mt-2.5 space-y-2">
          {HOW_IT_WORKS.map((line) => (
            <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-[var(--quni-ink-2)]">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rotate-[-4deg] items-center justify-center rounded-[3px] border-[1.3px] border-[var(--quni-success)] text-[9px] font-bold text-[var(--quni-success)]"
              >
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
          Every fee
        </h3>
        <ul className="mt-2.5">
          <FeeRow label="Listing, matching, AI, renewals — everything" figure="$0" />
          <FeeRow label="When you accept a tenant, once" figure={listingFeeDisplay} />
          <FeeRow
            label="Quni Managed, we run the tenancy — coming soon"
            figure={`${managedFeeDisplay}/wk`}
          />
        </ul>
        <Link
          to="/pricing"
          className="mt-3 inline-block text-[13px] font-semibold text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        >
          Full pricing →
        </Link>
      </div>
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

/** Grand desk — homeowners & landlords. Paperweight vacant. */
export default function LandlordDesk({
  onDrawerOpenChange,
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  className = '',
  deskAnswer = null,
  nameplateVariant = 'brass',
}: LandlordDeskProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rent, setRent] = useState(RENT_DEFAULT)
  const [listingFeeDisplay, setListingFeeDisplay] = useState('$99')
  const [managedFeeDisplay, setManagedFeeDisplay] = useState('8%')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const listingCell = await fetchPricingForPropertyTier('t1', 'listing')
        const managedCell = await fetchPricingForPropertyTier('t1', 'managed')
        const listing = formatFeeForDisplay(listingCell)
        const managed = formatFeeForDisplay(managedCell)
        if (!cancelled) {
          setListingFeeDisplay(listing.landlordFeeDisplay)
          setManagedFeeDisplay(managed.landlordFeeDisplay)
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
      <span className="text-[22px] font-bold text-[var(--quni-coral-on-navy)]">
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

  const waxSeal = (
    <p className="font-[family-name:var(--font-serif)] text-[10px] italic leading-snug text-white/45">
      The wax seal waits for the day you accept a tenant.
    </p>
  )

  const answered = Boolean(deskAnswer?.text)

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-shell desk-settle overflow-hidden rounded-[var(--radius-lg)] bg-[var(--quni-navy)] text-white/78',
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
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral-on-navy)]"
        >
          <DeskNameplate
            variant={nameplateVariant}
            onDark={nameplateVariant === 'bronze' || nameplateVariant === 'darkPlate'}
            className="!px-2 !py-1 [&_span]:whitespace-normal [&_span]:text-[8.5px] [&_span]:tracking-[0.12em]"
          >
            HOMEOWNERS & LANDLORDS
          </DeskNameplate>
          <div className="min-w-0 flex-1">{letterheadMobile}</div>
          <span aria-hidden className="text-[14px] text-[var(--quni-coral-on-navy)]">
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
              <DrawerBody
                listingFeeDisplay={listingFeeDisplay}
                managedFeeDisplay={managedFeeDisplay}
              />
            </DeskDrawer>
            <DeskAnswerPanel
              open={answered}
              answer={deskAnswer?.text ?? ''}
              source={deskAnswer?.source ?? 'QUNI PRICING'}
              tone="navy"
            />
            {waxSeal}
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <Desk
      tone="navy"
      className={[
        'min-h-full',
        answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      nameplate={
        <DeskNameplate
          variant={nameplateVariant}
          onDark={nameplateVariant === 'bronze' || nameplateVariant === 'darkPlate'}
        >
          FOR HOMEOWNERS & LANDLORDS
        </DeskNameplate>
      }
      letterhead={letterhead}
      inTray={
        <DeskInTray>
          <LedgerCalculator onRentChange={setRent} />
        </DeskInTray>
      }
      pen={<DeskPen to="/signup?role=landlord">List my room →</DeskPen>}
      drawer={
        <DeskDrawer label="How it works — & every fee" open={drawerOpen} onOpenChange={setDrawer}>
          <DrawerBody listingFeeDisplay={listingFeeDisplay} managedFeeDisplay={managedFeeDisplay} />
        </DeskDrawer>
      }
      foot={
        <>
          <DeskAnswerPanel
            open={answered}
            answer={deskAnswer?.text ?? ''}
            source={deskAnswer?.source ?? 'QUNI PRICING'}
            tone="navy"
          />
          {waxSeal}
        </>
      }
    />
  )
}
