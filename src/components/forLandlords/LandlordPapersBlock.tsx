import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { QuniLogoImg } from '../SiteBrandLockup'
import SiteSocialLinks from '../SiteSocialLinks'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'

const linkClass =
  'text-quni-caption font-semibold text-[var(--quni-ink-3)] no-underline [font-variant:small-caps] border-b border-dotted border-[var(--quni-cream-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

type LandlordPapersBlockProps = {
  className?: string
  style?: CSSProperties
}

/** Section 10 — landlord-tailored papers; no Pricing/FAQ. Logo matches site mark. */
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
        'bg-gradient-to-br from-[var(--quni-surface-1)] to-[var(--quni-cream)] px-[var(--space-5)] py-[var(--space-4)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="flex flex-wrap items-start gap-[var(--space-6)] lg:gap-[var(--space-8)]">
        <div className="flex min-w-[9rem] flex-col gap-[var(--space-1)]">
          <QuniLogoImg />
          <span className="text-quni-micro font-semibold uppercase text-[var(--quni-ink-5)]">
            {abnLine}
          </span>
          <span className="text-quni-caption font-bold text-[var(--quni-ink-4)]">
            Room letting in NSW & QLD
          </span>
        </div>

        <div className="flex flex-col gap-[var(--space-1)]">
          <span className="eyebrow m-0">The fine print</span>
          <div className="flex flex-wrap gap-[var(--space-3)]">
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

        <div className="flex flex-col gap-[var(--space-1)]">
          <span className="eyebrow m-0">Talk to a human</span>
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Link to="/contact" className={linkClass}>
              Contact the team
            </Link>
            <Link to="/faq" className={linkClass}>
              Help for landlords
            </Link>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end gap-[var(--space-2)]">
          <span className="inline-flex rotate-[-5deg] items-center gap-[var(--space-1)] rounded-[var(--radius-sm)] border border-[var(--quni-success)]/45 bg-white/80 px-[var(--space-2)] py-[var(--space-1)] text-quni-micro font-extrabold text-[var(--quni-success-strong)]">
            ✓ State-compliant leases
          </span>
          <SiteSocialLinks variant="drawer" className="justify-end" />
        </div>
      </div>
    </div>
  )
}
