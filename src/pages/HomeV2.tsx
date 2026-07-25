import { useState } from 'react'
import { Link } from 'react-router-dom'
import LegalFooter from '../components/LegalFooter'
import Seo from '../components/Seo'
import SiteSocialLinks from '../components/SiteSocialLinks'
import {
  Desk,
  DeskLetterhead,
  DeskNameplate,
  DeskPen,
  LandlordDesk,
} from '../components/desk'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

type RailId = 'listings' | 'landlord' | 'universities' | 'account' | 'trust' | null

/**
 * Menu-less desk-shell home prototype.
 * Phase 1: Landlord Desk is fully built; sibling desks are lightweight placeholders
 * so the grand desk sits in situ. Social + legal live on the papers signature block
 * (absent from the Claude mock — added so trust links stay reachable without a mega-footer).
 */
export default function HomeV2() {
  const [landlordDrawerOpen, setLandlordDrawerOpen] = useState(false)
  const [openRail, setOpenRail] = useState<RailId>(null)

  function toggleRail(id: Exclude<RailId, null>) {
    setOpenRail((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-full w-full bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)]">
      <Seo
        title="Home (desk prototype)"
        description="Quni Living desk-shell home prototype — not for search indexing."
        canonicalPath="/home-v2"
        noindex
      />

      <div className={`${SITE_CONTENT_MAX_CLASS} py-6 md:py-10`}>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
          <div>
            <Link
              to="/"
              className="inline-flex rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              <img
                src="/quni-logo.png"
                srcSet="/quni-logo.png 1x, /quni-logo@2x.png 2x"
                alt="Quni"
                width={96}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-2 max-w-md font-[family-name:var(--font-serif)] text-lg text-[var(--quni-ink-2)] md:text-xl">
              Verified rooms near campus — paperwork done.
            </p>
          </div>
          <p className="rounded-md bg-[var(--quni-cream)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--quni-ink-4)]">
            Prototype · not live home
          </p>
        </header>

        {/* Desktop bento */}
        <div
          className={[
            'hidden md:grid md:gap-4',
            landlordDrawerOpen
              ? 'md:grid-cols-[0.7fr_0.7fr_1.85fr] md:grid-rows-[auto_auto_auto]'
              : 'md:grid-cols-3 md:grid-rows-[minmax(200px,1fr)_minmax(160px,auto)_auto]',
          ].join(' ')}
          style={{
            transition: landlordDrawerOpen
              ? 'grid-template-columns 320ms var(--ease-standard)'
              : undefined,
          }}
        >
          <div className="md:col-span-2 md:row-span-1">
            <PlaceholderDesk
              nameplate="FOR RENTERS"
              letterhead="Browse verified rooms near campus."
              penLabel="Find a place →"
              penTo="/listings"
              tone="paper"
            />
          </div>

          <div
            className="md:col-start-3 md:row-span-2"
            style={{ gridArea: landlordDrawerOpen ? undefined : undefined }}
          >
            <LandlordDesk onDrawerOpenChange={setLandlordDrawerOpen} />
          </div>

          <div className="md:col-start-1 md:row-start-2">
            <PlaceholderDesk
              nameplate="UNIVERSITIES"
              letterhead="Partner with Quni for your students."
              penLabel="For universities →"
              penTo="/for-universities"
              tone="cream"
              quietPen
            />
          </div>

          <div className="md:col-start-2 md:row-start-2">
            <PlaceholderDesk
              nameplate="YOUR ACCOUNT"
              letterhead="Log in to messages and bookings."
              penLabel="Log in →"
              penTo="/login"
              tone="paper"
              quietPen
            />
          </div>

          <div className="md:col-span-3 md:row-start-3">
            <PlaceholderDesk
              nameplate="TRUST & SAFETY"
              letterhead="Verification, fairness, and how we work."
              penLabel="See verification →"
              penTo="/verification"
              tone="cream"
              quietPen
            />
          </div>
        </div>

        {/* Mobile rails */}
        <div className="flex flex-col gap-3 md:hidden">
          <MobilePlaceholderRail
            nameplate="FOR RENTERS"
            letterhead="Verified rooms near campus"
            expanded={openRail === 'listings'}
            onToggle={() => toggleRail('listings')}
            penLabel="Find a place →"
            penTo="/listings"
          />
          <LandlordDesk
            mobileRail
            railExpanded={openRail === 'landlord'}
            onRailExpandChange={(open) => setOpenRail(open ? 'landlord' : null)}
          />
          <MobilePlaceholderRail
            nameplate="UNIVERSITIES"
            letterhead="Partner with Quni"
            expanded={openRail === 'universities'}
            onToggle={() => toggleRail('universities')}
            penLabel="For universities →"
            penTo="/for-universities"
          />
          <MobilePlaceholderRail
            nameplate="YOUR ACCOUNT"
            letterhead="Log in to continue"
            expanded={openRail === 'account'}
            onToggle={() => toggleRail('account')}
            penLabel="Log in →"
            penTo="/login"
          />
          <MobilePlaceholderRail
            nameplate="TRUST & SAFETY"
            letterhead="Verification & fairness"
            expanded={openRail === 'trust'}
            onToggle={() => toggleRail('trust')}
            penLabel="See verification →"
            penTo="/verification"
          />
        </div>

        {/* Papers signature block — legal entity lookup + social (not in Claude mock) */}
        <footer className="mt-8 border-t border-[var(--quni-line)] pt-6 md:mt-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl space-y-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--quni-ink-5)]">
                Papers
              </p>
              <LegalFooter className="!text-[11px] !opacity-90 text-[var(--quni-ink-4)]" />
              <nav
                aria-label="Company links"
                className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--quni-ink-3)]"
              >
                <Link className={papersLinkClass} to="/about">
                  About
                </Link>
                <Link className={papersLinkClass} to="/faq">
                  FAQ
                </Link>
                <Link className={papersLinkClass} to="/contact">
                  Contact
                </Link>
                <Link className={papersLinkClass} to="/guides">
                  Guides
                </Link>
                <Link className={papersLinkClass} to="/pricing">
                  Pricing
                </Link>
                <Link className={papersLinkClass} to="/terms">
                  Terms
                </Link>
                <Link className={papersLinkClass} to="/privacy">
                  Privacy
                </Link>
              </nav>
            </div>
            <div>
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--quni-ink-5)]">
                Follow Quni
              </p>
              <SiteSocialLinks variant="drawer" />
            </div>
          </div>
          <p className="mt-5 text-[11px] text-[var(--quni-ink-5)]">
            Live home remains at{' '}
            <Link to="/" className={papersLinkClass}>
              quni.com.au
            </Link>
            . This page is a Preview prototype.
          </p>
        </footer>
      </div>
    </div>
  )
}

const papersLinkClass =
  'underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

function PlaceholderDesk({
  nameplate,
  letterhead,
  penLabel,
  penTo,
  tone,
  quietPen = false,
}: {
  nameplate: string
  letterhead: string
  penLabel: string
  penTo: string
  tone: 'paper' | 'cream'
  quietPen?: boolean
}) {
  return (
    <Desk
      tone={tone}
      className="min-h-[160px]"
      nameplate={<DeskNameplate>{nameplate}</DeskNameplate>}
      letterhead={
        <DeskLetterhead className="!max-w-none !text-[var(--quni-ink)] !text-[20px]">
          {letterhead}
        </DeskLetterhead>
      }
      pen={
        quietPen ? (
          <Link
            to={penTo}
            className="inline-flex w-fit items-center text-[14px] font-semibold text-[var(--quni-ink-2)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
          >
            {penLabel}
          </Link>
        ) : (
          <DeskPen to={penTo} emphasis>
            {penLabel}
          </DeskPen>
        )
      }
    />
  )
}

function MobilePlaceholderRail({
  nameplate,
  letterhead,
  expanded,
  onToggle,
  penLabel,
  penTo,
}: {
  nameplate: string
  letterhead: string
  expanded: boolean
  onToggle: () => void
  penLabel: string
  penTo: string
}) {
  return (
    <article className="desk-settle overflow-hidden rounded-[var(--radius-lg)] bg-[var(--quni-surface-1)] shadow-[var(--shadow-1)] [contain:layout_paint]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral)]"
      >
        <DeskNameplate className="!px-2 !py-1 [&_span]:whitespace-normal [&_span]:text-[8.5px] [&_span]:tracking-[0.12em]">
          {nameplate}
        </DeskNameplate>
        <span className="min-w-0 flex-1 font-[family-name:var(--font-serif)] text-[14.5px] text-[var(--quni-ink)]">
          {letterhead}
        </span>
        <span aria-hidden className="text-[14px] text-[var(--quni-coral)]">
          {expanded ? '⊖' : '⊕'}
        </span>
      </button>
      {expanded ? (
        <div className="px-4 pb-4">
          <DeskPen to={penTo} emphasis={nameplate === 'FOR RENTERS'}>
            {penLabel}
          </DeskPen>
        </div>
      ) : null}
    </article>
  )
}
