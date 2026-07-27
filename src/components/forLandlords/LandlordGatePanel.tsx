import { useState } from 'react'
import { DeskDrawer } from '../desk'
import DeskSectionKicker from './DeskSectionKicker'
import type { LandlordDeskState } from '../../lib/forLandlordsState'
import { LANDLORD_STATE_FACTS } from '../../lib/forLandlordsState'
import {
  gatePanelDrawerLines,
  gatePanelHedge,
  gatePanelIsVerified,
} from '../../lib/forLandlordsRuleMap'

const drawerCtlPaper =
  'border-[var(--quni-cream-border)] bg-white/50 text-[var(--quni-ink-3)] hover:bg-white/80 group-hover:bg-white/80 focus-visible:outline-[var(--quni-coral)] [&_span:first-child]:text-[var(--quni-coral-active)]'

type LandlordGatePanelProps = {
  state: LandlordDeskState
  className?: string
  style?: React.CSSProperties
}

/** Section 3 — gate panel; plain yes + hedged placeholder until rule map verified. */
export default function LandlordGatePanel({ state, className = '', style }: LandlordGatePanelProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const facts = LANDLORD_STATE_FACTS[state]
  const verified = gatePanelIsVerified(state)
  const drawerLines = gatePanelDrawerLines(state)

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
      aria-labelledby="landlord-gate-heading"
    >
      <DeskSectionKicker index="01" label="Can you even do this?" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2
            id="landlord-gate-heading"
            className="m-0 font-display text-[20px] font-normal leading-snug text-[var(--quni-ink-2)]"
          >
            Can you rent a spare room in {facts.label}?
          </h2>
          <p className="mt-2 m-0 text-[13px] leading-relaxed text-[var(--quni-ink-3)]">
            {verified
              ? 'Yes — for many room lets in NSW and QLD. Details depend on your situation.'
              : 'Yes — Quni Listing is built for room letting in NSW & QLD. Specific rules depend on your situation and are being verified.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className="inline-flex rotate-[-4deg] items-center rounded-[4px] border-[1.3px] border-[var(--quni-success)]/45 bg-white/80 px-2 py-1 text-[8px] font-extrabold tracking-[0.1em] text-[var(--quni-success-strong)] uppercase"
            aria-hidden
          >
            {verified ? 'Verified' : 'Pending verify'}
          </span>
          <span className="text-[9px] font-bold text-[var(--quni-ink-5)]">
            Source: {facts.authority}
          </span>
        </div>
      </div>

      <DeskDrawer
        label="Why we say yes — and what to check"
        open={detailOpen}
        onOpenChange={setDetailOpen}
        controlClassName={drawerCtlPaper}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {drawerLines.map((line) => (
            <li
              key={line}
              className="rounded-[var(--radius-md)] border border-[var(--quni-cream-border)] bg-white/60 px-3 py-2 text-[10.5px] leading-relaxed text-[var(--quni-ink-3)]"
            >
              {line}
            </li>
          ))}
        </ul>
      </DeskDrawer>

      <p className="m-0 border-t border-dotted border-[var(--quni-cream-border)] pt-2 text-[9.5px] font-semibold text-[var(--quni-ink-5)]">
        {gatePanelHedge(state)}
      </p>
    </section>
  )
}
