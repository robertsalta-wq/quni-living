import { Link } from 'react-router-dom'
import SiteSocialLinks from '../SiteSocialLinks'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'

const linkClass =
  'text-[10.5px] font-semibold text-[var(--quni-ink-3)] no-underline [font-variant:small-caps] border-b border-dotted border-[var(--quni-cream-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

type LandlordPapersBlockProps = {
  className?: string
  style?: React.CSSProperties
}

/** Section 10 — landlord-tailored papers; no Pricing/FAQ. */
export default function LandlordPapersBlock({ className = '', style }: LandlordPapersBlockProps) {
  const entity = useLegalEntity()
  const abn = entity.abn.trim()
  const abnLine = abn
    ? `ABN ${formatAustralianAbn(abn)} · ${entity.registeredSuburb} ${entity.registeredState}`
    : `${entity.registeredSuburb} ${entity.registeredState}`

  return (
    <div
      className={[
        'quni-card desk-settle shrink-0 border-t-[3px] border-double border-[var(--quni-cream-border)]',
        'bg-gradient-to-br from-[var(--quni-surface-1)] to-[var(--quni-cream)] px-5 py-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="flex flex-wrap items-start gap-6 lg:gap-8">
        <div className="flex min-w-[140px] flex-col gap-0.5">
          <span className="font-display text-[15px] font-bold text-[var(--quni-ink)]">
            <span className="text-[var(--quni-coral)]">Q</span>uni Living
          </span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[var(--quni-ink-5)]">
            {abnLine}
          </span>
          <span className="text-[10px] font-bold text-[var(--quni-ink-4)]">
            Room letting in NSW & QLD
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[var(--quni-ink-5)]">
            The fine print
          </span>
          <div className="flex flex-wrap gap-3">
            <Link to="/landlord-service-agreement" className={linkClass}>
              Landlord terms
            </Link>
            <Link to="/refunds" className={linkClass}>
              Fees & refunds
            </Link>
            <Link to="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link to="/non-discrimination" className={linkClass}>
              Non-discrimination
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[var(--quni-ink-5)]">
            Talk to a human
          </span>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className={linkClass}>
              Contact the team
            </Link>
            <Link to="/faq" className={linkClass}>
              Help for landlords
            </Link>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end gap-2">
          <span
            className="inline-flex rotate-[-5deg] items-center gap-1 rounded-[4px] border-[1.3px] border-[var(--quni-success)]/45 bg-white/80 px-2 py-1 text-[8px] font-extrabold tracking-[0.1em] text-[var(--quni-success-strong)]"
          >
            ✓ State-compliant leases
          </span>
          <SiteSocialLinks variant="drawer" className="justify-end" />
        </div>
      </div>
    </div>
  )
}
