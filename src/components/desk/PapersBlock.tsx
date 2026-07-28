import { Link } from 'react-router-dom'
import SiteSocialLinks from '../SiteSocialLinks'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'

/** Light text on ink footer — --quni-surface-1 for contrast (cream was for coral strip). */
const linkClass =
  'text-xs font-semibold tracking-[0.03em] text-[var(--quni-surface-1)] no-underline [font-variant:small-caps] border-b border-dotted border-[color-mix(in_srgb,var(--quni-surface-1)_55%,transparent)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-surface-1)]'

type PapersBlockProps = {
  /** Desktop office: denser padding, same clustered letterhead. */
  compact?: boolean
}

/** Signature strip under the bento — solid ink brand surface + coral wordmark. */
export default function PapersBlock({ compact = false }: PapersBlockProps) {
  const entity = useLegalEntity()
  const abn = entity.abn.trim()
  const abnLine = abn
    ? `ABN ${formatAustralianAbn(abn)} · ${entity.registeredSuburb}, ${entity.registeredState}`
    : `${entity.registeredSuburb}, ${entity.registeredState}, Australia`

  return (
    <div
      className={[
        'desk-settle shrink-0 font-[family-name:var(--font-footer)] [animation-delay:680ms]',
        'rounded-[var(--radius-lg)] bg-[var(--quni-ink)]',
        compact ? 'mt-2 px-4 py-2.5' : 'mt-3.5 px-6 py-4',
      ].join(' ')}
      style={{
        borderTop: compact
          ? '2px double color-mix(in srgb, var(--quni-surface-1) 35%, transparent)'
          : '3px double color-mix(in srgb, var(--quni-surface-1) 35%, transparent)',
      }}
    >
      <div className={['flex flex-wrap items-center', compact ? 'gap-x-6 gap-y-2' : 'gap-8'].join(' ')}>
        <div className="flex flex-col gap-0.5">
          <Link
            to="/"
            className={[
              'font-[family-name:var(--font-display)] font-bold tracking-[-0.02em] text-[var(--quni-surface-1)]',
              'rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
              compact ? 'text-lg' : 'text-2xl',
            ].join(' ')}
            aria-label="Quni home"
          >
            <span className="text-[var(--quni-coral)]">Quni</span>
          </Link>
          <span
            className={[
              'font-semibold uppercase text-[color-mix(in_srgb,var(--quni-surface-1)_82%,transparent)]',
              compact ? 'text-xs tracking-[0.06em]' : 'text-xs tracking-[0.08em]',
            ].join(' ')}
          >
            {abnLine}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="eyebrow !font-extrabold text-[color-mix(in_srgb,var(--quni-surface-1)_75%,transparent)]">
            The rules
          </span>
          <div className="flex flex-wrap gap-3.5">
            <Link to="/terms" className={linkClass}>
              Terms
            </Link>
            <Link to="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link to="/refunds" className={linkClass}>
              Refunds
            </Link>
            <Link to="/non-discrimination" className={linkClass}>
              Non-Discrimination
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="eyebrow !font-extrabold text-[color-mix(in_srgb,var(--quni-surface-1)_75%,transparent)]">
            Reach a human
          </span>
          <div className="flex flex-wrap gap-3.5">
            <Link to="/contact" className={linkClass}>
              Contact
            </Link>
            <Link to="/faq" className={linkClass}>
              FAQ
            </Link>
            <Link to="/about" className={linkClass}>
              About
            </Link>
            <Link to="/guides" className={linkClass}>
              Guides
            </Link>
            <Link to="/pricing" className={linkClass}>
              Pricing
            </Link>
          </div>
        </div>

        <div
          className={[
            'ml-auto flex',
            compact ? 'items-center gap-3' : 'flex-col items-end gap-2',
          ].join(' ')}
        >
          <Link
            to="/verification"
            className={[
              'inline-flex items-center gap-1.5 font-extrabold whitespace-nowrap text-[var(--quni-surface-1)]',
              'hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-surface-1)]',
              compact ? 'text-xs' : 'text-xs',
            ].join(' ')}
          >
            <span
              aria-hidden
              className="inline-flex h-[17px] w-[17px] rotate-[-5deg] items-center justify-center rounded-[3px] border-[1.4px] border-[var(--quni-verified)] text-xs font-black text-[var(--quni-verified)]"
            >
              ✓
            </span>
            {compact ? 'Verified →' : 'Verified marketplace →'}
          </Link>
          <SiteSocialLinks variant="footer" className="justify-end" />
        </div>
      </div>
    </div>
  )
}
