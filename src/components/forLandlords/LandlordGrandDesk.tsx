import { useState, type CSSProperties } from 'react'
import { QuniLogoHomeLink } from '../SiteBrandLockup'
import {
  Desk,
  DeskDrawer,
  DeskInTray,
  DeskLetterhead,
  DeskNameplate,
  DeskPen,
} from '../desk'
import { LISTING_AI_DOES } from '../../lib/forLandlordsDeskContent'

type LandlordGrandDeskProps = {
  className?: string
  style?: CSSProperties
}

/** Section 1 — grand navy desk; logo matches site brand lockup (white on navy). */
export default function LandlordGrandDesk({ className = '', style }: LandlordGrandDeskProps) {
  const [listingDrawerOpen, setListingDrawerOpen] = useState(false)

  return (
    <Desk
      tone="navy"
      className={['desk-bg-navy-grand relative overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      nameplate={
        <div className="relative z-[2] flex w-full items-center justify-between gap-[var(--space-3)]">
          <QuniLogoHomeLink variant="white" className="shrink-0" />
          <DeskNameplate>Listing</DeskNameplate>
        </div>
      }
      letterhead={
        <DeskLetterhead className="relative z-[2] mt-[var(--space-1)] max-w-[min(100%,25rem)] text-quni-display-sm text-white">
          Your listing writes itself. You just say{' '}
          <em className="not-italic text-[var(--quni-coral-on-navy)]">yes</em>.
        </DeskLetterhead>
      }
      inTray={
        <DeskInTray className="relative z-[2] mt-[var(--space-1)] grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 sm:items-start">
          <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/[0.05] px-[var(--space-3)] py-[var(--space-2)]">
            <p className="eyebrow m-0 text-white/45">AI draft · your room</p>
            <p className="mt-[var(--space-1)] font-display text-quni-caption leading-relaxed text-[var(--quni-cream)]">
              Sunlit double in a quiet share house, 6 min walk to campus.
            </p>
            <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-1)]">
              <span className="rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.06] px-[var(--space-2)] py-[var(--space-1)] text-quni-micro font-bold text-white/70">
                Market price suggested
              </span>
              <span className="rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.06] px-[var(--space-2)] py-[var(--space-1)] text-quni-micro font-bold text-white/70">
                Reply drafted <b className="text-[var(--quni-success)]">in seconds</b>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[var(--space-2)]">
            <DeskPen
              to="/signup?role=landlord"
              variant="coral"
              className="!w-auto self-start rounded-[var(--radius-pill)]"
            >
              List my room <span className="desk-pen-arw" aria-hidden>→</span>
            </DeskPen>
            <p className="m-0 font-display text-quni-micro italic text-white/45">
              The wax seal waits for the day you accept a tenant.
            </p>
            <DeskDrawer
              label="What the AI does"
              open={listingDrawerOpen}
              onOpenChange={setListingDrawerOpen}
            >
              <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
                {LISTING_AI_DOES.map((line) => (
                  <li
                    key={line}
                    className="rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.06] px-[var(--space-2)] py-[var(--space-1)] text-quni-micro font-bold text-white/70"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </DeskDrawer>
          </div>
        </DeskInTray>
      }
    />
  )
}
