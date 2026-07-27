import { useState } from 'react'
import { DeskDrawer, DeskPaperweight, DeskPen } from '../desk'
import DeskSectionKicker from './DeskSectionKicker'
import { QUNI_DOES, QUNI_DOES_NOT } from '../../lib/forLandlordsSections'
import type { LandlordDeskState } from '../../lib/forLandlordsState'
import { LANDLORD_STATE_FACTS } from '../../lib/forLandlordsState'

const drawerCtlPaper =
  'border-[var(--quni-cream-border)] bg-white/50 text-[var(--quni-ink-3)] hover:bg-white/80 group-hover:bg-white/80 focus-visible:outline-[var(--quni-coral)] [&_span:first-child]:text-[var(--quni-coral-active)]'

type LandlordIfWrongSectionProps = {
  state: LandlordDeskState
  className?: string
  style?: React.CSSProperties
}

/** Section 8 — sample agreement + what Quni does / doesn't. */
export default function LandlordIfWrongSection({
  state,
  className = '',
  style,
}: LandlordIfWrongSectionProps) {
  const [doesOpen, setDoesOpen] = useState(false)
  const facts = LANDLORD_STATE_FACTS[state]

  return (
    <section
      className={[
        'desk-settle desk-bg-cream-warm group relative flex flex-col gap-3 rounded-[var(--radius-lg)]',
        'border border-[var(--quni-cream-border)] p-4 shadow-[var(--shadow-1)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-labelledby="landlord-wrong-heading"
    >
      <DeskPaperweight>✓ State-compliant</DeskPaperweight>
      <DeskSectionKicker index="06" label="If it goes wrong" />
      <h2
        id="landlord-wrong-heading"
        className="m-0 font-display text-[17px] font-normal text-[var(--quni-ink-2)]"
      >
        Accept — and the paperwork signs itself.
      </h2>
      <div className="quni-card mt-1 border-[var(--quni-cream-border)] px-2.5 py-2.5">
        <p className="m-0 font-display text-[11px] font-bold text-[var(--quni-ink-2)]">
          Residential tenancy — room · {facts.label}
        </p>
        <div className="mt-1.5 space-y-1.5">
          <div className="h-[3px] w-[92%] rounded-sm bg-[var(--quni-cream-border)]" />
          <div className="h-[3px] w-[78%] rounded-sm bg-[var(--quni-cream-border)]" />
          <div className="h-[3px] w-[92%] rounded-sm bg-[var(--quni-cream-border)]" />
          <div className="h-[3px] w-[64%] rounded-sm bg-[var(--quni-cream-border)]" />
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <span className="border-b border-[var(--quni-cream-border)] px-0.5 pb-0.5 font-display text-[13px] italic text-[var(--quni-ink-3)]">
            A. Nguyen
          </span>
          <span className="text-[7.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
            Signed online
          </span>
        </div>
      </div>
      <DeskPen
        to="/landlord-service-agreement"
        variant="ink"
        className="!text-[var(--quni-ink-3)]"
      >
        See a sample agreement <span className="desk-pen-arw" aria-hidden>→</span>
      </DeskPen>

      <DeskDrawer
        label="What Quni does — and doesn't"
        open={doesOpen}
        onOpenChange={setDoesOpen}
        controlClassName={drawerCtlPaper}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--quni-success-strong)]">
              Quni does
            </p>
            <ul className="mt-1.5 m-0 list-none space-y-1 p-0">
              {QUNI_DOES.map((line) => (
                <li
                  key={line}
                  className="text-[10px] font-semibold leading-snug text-[var(--quni-ink-3)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--quni-ink-5)]">
              Quni doesn't
            </p>
            <ul className="mt-1.5 m-0 list-none space-y-1 p-0">
              {QUNI_DOES_NOT.map((line) => (
                <li
                  key={line}
                  className="text-[10px] font-semibold leading-snug text-[var(--quni-ink-4)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DeskDrawer>
    </section>
  )
}
