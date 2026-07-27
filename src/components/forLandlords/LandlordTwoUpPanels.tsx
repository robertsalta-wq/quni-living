import { useState, type CSSProperties } from 'react'
import { DeskDrawer, DeskPaperweight, DeskPen } from '../desk'
import DeskSectionKicker from './DeskSectionKicker'
import {
  FEE_ROWS_DRAWER,
  FEE_ROWS_VISIBLE,
} from '../../lib/forLandlordsDeskContent'

const drawerCtlPaper =
  'border-[var(--quni-cream-border)] bg-white/50 text-[var(--quni-ink-3)] hover:bg-white/80 group-hover:bg-white/80 focus-visible:outline-[var(--quni-coral)] [&_span:first-child]:text-[var(--quni-coral-active)]'

function FeeRows({ rows, paidId }: { rows: typeof FEE_ROWS_VISIBLE; paidId?: string }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-baseline justify-between gap-[var(--space-2)] border-b border-[var(--quni-ink)]/10 py-[var(--space-1)] text-quni-caption last:border-b-0"
        >
          <span className="font-semibold text-[var(--quni-ink-3)]">{row.label}</span>
          <span
            className={[
              'shrink-0 whitespace-nowrap text-quni-micro font-extrabold',
              row.id === paidId
                ? 'text-[var(--quni-coral-active)]'
                : 'text-[var(--quni-success-strong)]',
            ].join(' ')}
          >
            {row.figure}
          </span>
        </li>
      ))}
    </ul>
  )
}

type LandlordTwoUpPanelsProps = {
  className?: string
  style?: CSSProperties
}

/** Sections 5–6 — Who'll I get + What's the catch (two-up). */
export default function LandlordTwoUpPanels({ className = '', style }: LandlordTwoUpPanelsProps) {
  const [feesDrawerOpen, setFeesDrawerOpen] = useState(false)

  return (
    <div
      className={['grid grid-cols-1 gap-[var(--space-2)] md:grid-cols-2', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <section
        className="desk-settle desk-bg-trust-wash group relative flex min-h-0 flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)] p-[var(--space-4)] shadow-[var(--shadow-1)]"
        aria-labelledby="landlord-who-heading"
      >
        <DeskPaperweight>✓ Verified</DeskPaperweight>
        <DeskSectionKicker index="03" label="Who'll I get" />
        <h2
          id="landlord-who-heading"
          className="m-0 font-display text-quni-h4 font-normal text-[var(--quni-trust)]"
        >
          A shortlist, not an inbox.
        </h2>
        <div className="quni-card relative mt-[var(--space-1)] border-[var(--quni-success)]/25 px-[var(--space-2)] py-[var(--space-2)]">
          <span className="absolute top-[var(--space-2)] right-[var(--space-1)] rotate-[-7deg] rounded-[var(--radius-sm)] border border-[var(--quni-line)] px-[var(--space-1)] py-[var(--space-1)] text-quni-micro font-black text-[var(--quni-ink-5)]">
            SPECIMEN
          </span>
          <p className="m-0 font-display text-quni-caption font-bold text-[var(--quni-ink)]">
            A. Nguyen
          </p>
          <p className="m-0 mt-[var(--space-1)] text-quni-micro font-semibold text-[var(--quni-ink-4)]">
            2nd year · moving 14 Feb · 12 months
          </p>
          <ul className="mt-[var(--space-2)] flex list-none flex-col gap-[var(--space-1)] p-0">
            {['Identity verified', 'Enrolment verified'].map((t) => (
              <li
                key={t}
                className="flex items-center gap-[var(--space-1)] text-quni-micro font-bold text-[var(--quni-trust)]"
              >
                <span
                  aria-hidden
                  className="inline-flex h-[var(--space-3)] w-[var(--space-3)] rotate-[-4deg] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--quni-success)] bg-white text-quni-micro font-black text-[var(--quni-success)]"
                >
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-[var(--space-2)] border-t border-dotted border-[var(--quni-line)] pt-[var(--space-1)] font-display text-quni-micro italic text-[var(--quni-trust)]">
            Fit: dates match, budget matches, non-smoker.
          </p>
        </div>
        <DeskPen to="/verification" variant="ink" className="!text-[var(--quni-success-strong)]">
          How verification works <span className="desk-pen-arw" aria-hidden>→</span>
        </DeskPen>
      </section>

      <section
        className="desk-settle desk-bg-fees-wash group relative flex min-h-0 flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)] p-[var(--space-4)] shadow-[var(--shadow-1)]"
        aria-labelledby="landlord-catch-heading"
      >
        <DeskSectionKicker index="04" label="What's the catch" />
        <h2
          id="landlord-catch-heading"
          className="m-0 font-display text-quni-h4 font-normal text-[var(--quni-ink-2)]"
        >
          Free to list.{' '}
          <em className="not-italic text-[var(--quni-coral-active)]">$99</em> once, only when you
          accept.
        </h2>
        <FeeRows rows={FEE_ROWS_VISIBLE} paidId="accept" />
        <DeskDrawer
          label="Every fee"
          open={feesDrawerOpen}
          onOpenChange={setFeesDrawerOpen}
          controlClassName={drawerCtlPaper}
        >
          <FeeRows rows={FEE_ROWS_DRAWER} />
        </DeskDrawer>
      </section>
    </div>
  )
}
