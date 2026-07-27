import { Link } from 'react-router-dom'
import SiteSocialLinks from '../SiteSocialLinks'
import { QuniLogoHomeLink } from '../SiteBrandLockup'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'

const linkClass =
  'text-[11px] font-semibold tracking-[0.03em] text-[var(--quni-cream)] no-underline [font-variant:small-caps] border-b border-dotted border-[color-mix(in_srgb,var(--quni-cream)_55%,transparent)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-cream)]'

type PapersBlockProps = {
  /** Desktop office: denser padding, same clustered letterhead. */
  compact?: boolean
}

/** Signature strip under the bento — coral brand surface + cream wordmark. */
export default function PapersBlock({ compact = false }: PapersBlockProps) {
  const entity = useLegalEntity()
  const abn = entity.abn.trim()
  const abnLine = abn
    ? `ABN ${formatAustralianAbn(abn)} · ${entity.registeredSuburb}, ${entity.registeredState}`
    : `${entity.registeredSuburb}, ${entity.registeredState}, Australia`

  return (
    <div
      className={[
        'quni-card desk-settle shrink-0 [animation-delay:680ms]',
        compact ? 'mt-2 px-4 py-2.5' : 'mt-3.5 px-6 py-4',
      ].join(' ')}
      style={{
        borderTop: compact
          ? '2px double color-mix(in srgb, var(--quni-cream) 70%, transparent)'
          : '3px double color-mix(in srgb, var(--quni-cream) 70%, transparent)',
        background:
          'linear-gradient(160deg, var(--quni-coral) 0%, var(--quni-coral-hover) 100%)',
      }}
    >
      <div className={['flex flex-wrap items-center', compact ? 'gap-x-6 gap-y-2' : 'gap-8'].join(' ')}>
        <div className="flex flex-col gap-0.5">
          <QuniLogoHomeLink
            variant="cream"
            className={[
              compact ? '[&_img]:h-5 [&_img]:sm:h-6' : '[&_img]:h-6 [&_img]:sm:h-7',
              'focus-visible:outline-[var(--quni-cream)]',
            ].join(' ')}
          />
          <span
            className={[
              'font-semibold uppercase text-[color-mix(in_srgb,var(--quni-cream)_82%,white)]',
              compact ? 'text-[9px] tracking-[0.06em]' : 'text-[10px] tracking-[0.08em]',
            ].join(' ')}
          >
            {abnLine}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--quni-cream)_75%,white)]">
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
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--quni-cream)_75%,white)]">
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
              'inline-flex items-center gap-1.5 font-extrabold whitespace-nowrap text-[var(--quni-cream)]',
              'hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-cream)]',
              compact ? 'text-[11px]' : 'text-xs',
            ].join(' ')}
          >
            <span
              aria-hidden
              className="inline-flex h-[17px] w-[17px] rotate-[-5deg] items-center justify-center rounded-[3px] border-[1.4px] border-[var(--quni-cream)] text-[10px] font-black text-[var(--quni-cream)]"
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
