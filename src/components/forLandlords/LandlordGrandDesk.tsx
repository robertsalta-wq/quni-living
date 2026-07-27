import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
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

/** Section 1 — grand navy desk matching the home reception pattern. */
export default function LandlordGrandDesk({ className = '', style }: LandlordGrandDeskProps) {
  const [listingDrawerOpen, setListingDrawerOpen] = useState(false)

  return (
    <Desk
      tone="navy"
      className={['desk-bg-navy-grand relative overflow-hidden md:col-span-2', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      nameplate={
        <div className="relative z-[2] flex w-full items-center justify-between gap-3">
          <Link
            to="/"
            className="font-display text-[19px] font-bold text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral-on-navy)]"
            aria-label="Quni home"
          >
            <span className="text-[var(--quni-coral)]">Q</span>uni
            <small className="ml-1.5 align-middle font-sans text-[8px] font-extrabold tracking-[0.14em] text-white/45 uppercase">
              ← home
            </small>
          </Link>
          <DeskNameplate>Listing</DeskNameplate>
        </div>
      }
      letterhead={
        <DeskLetterhead className="relative z-[2] mt-1 max-w-[400px] text-[22px] text-white sm:text-[26px]">
          Your listing writes itself. You just say{' '}
          <em className="not-italic text-[var(--quni-coral-on-navy)]">yes</em>.
        </DeskLetterhead>
      }
      inTray={
        <DeskInTray className="relative z-[2] mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div className="rounded-[11px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <p className="m-0 text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-white/45">
              AI draft · your room
            </p>
            <p className="mt-1.5 font-display text-[12.5px] leading-relaxed text-[var(--quni-cream)]">
              Sunlit double in a quiet share house, 6 min walk to campus.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70">
                Market price suggested
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70">
                Reply drafted <b className="text-[var(--quni-success)]">in seconds</b>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <DeskPen
              to="/signup?role=landlord"
              variant="coral"
              className="!w-auto self-start rounded-full px-5 py-2.5 text-[13px]"
            >
              List my room <span className="desk-pen-arw" aria-hidden>→</span>
            </DeskPen>
            <p className="m-0 font-display text-[10.5px] italic text-white/45">
              The wax seal waits for the day you accept a tenant.
            </p>
            <DeskDrawer
              label="What the AI does"
              open={listingDrawerOpen}
              onOpenChange={setListingDrawerOpen}
            >
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {LISTING_AI_DOES.map((line) => (
                  <li
                    key={line}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70"
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
