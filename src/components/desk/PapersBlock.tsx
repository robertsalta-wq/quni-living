import { Link } from 'react-router-dom'
import SiteSocialLinks from '../SiteSocialLinks'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'
import { LEGAL_ENTITY_ACN } from '../../lib/legalEntity'

const linkClass =
  'text-[11px] font-semibold tracking-[0.03em] text-[var(--quni-ink-3)] no-underline [font-variant:small-caps] border-b border-dotted border-[var(--quni-cream-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

type PapersBlockProps = {
  /** Desktop office: denser padding, same clustered letterhead. */
  compact?: boolean
  /** Interior desk pages: coral return to `/` instead of verification stamp. */
  homeReturn?: boolean
}

/** Signature strip under the bento - legal lookup + rules + social (social absent from Claude mock). */
export default function PapersBlock({ compact = false, homeReturn = false }: PapersBlockProps) {
  const entity = useLegalEntity()
  const abn = entity.abn.trim()
  const abnLine = abn
    ? `ABN ${formatAustralianAbn(abn)} · ACN ${LEGAL_ENTITY_ACN} · ${entity.registeredSuburb}, ${entity.registeredState}`
    : `${entity.registeredSuburb}, ${entity.registeredState}, Australia`

  return (
    <div
      className={[
        'quni-card desk-settle shrink-0 [animation-delay:680ms]',
        compact ? 'mt-2 px-4 py-2.5' : 'mt-3.5 px-6 py-4',
      ].join(' ')}
      style={{
        borderTop: compact
          ? '2px double var(--quni-cream-border)'
          : '3px double var(--quni-cream-border)',
        background: 'linear-gradient(160deg, var(--quni-surface-1), var(--quni-cream))',
      }}
    >
      <div className={['flex flex-wrap items-center', compact ? 'gap-x-6 gap-y-2' : 'gap-8'].join(' ')}>
        <div className="flex flex-col gap-0.5">
          <span
            className={[
              'font-[family-name:var(--font-serif)] font-bold text-[var(--quni-ink)]',
              compact ? 'text-[13px]' : 'text-base',
            ].join(' ')}
          >
            <span className="text-[var(--quni-coral)]">Q</span>uni Living
          </span>
          <span
            className={[
              'font-semibold uppercase text-[var(--quni-ink-5)]',
              compact ? 'text-[9px] tracking-[0.06em]' : 'text-[10px] tracking-[0.08em]',
            ].join(' ')}
          >
            {abnLine}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--quni-ink-5)]">
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
          <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--quni-ink-5)]">
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
            compact || homeReturn ? 'flex-col items-end gap-1.5' : 'flex-col items-end gap-2',
            !homeReturn && compact ? '!flex-row !items-center gap-3' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {homeReturn ? (
            <>
              <Link
                to="/"
                className="text-[10.5px] font-extrabold text-[var(--quni-coral-active)] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
              >
                ← Back to the home desk
              </Link>
              <span className="font-display text-[9px] italic text-[var(--quni-ink-5)]">
                Printed the same for everyone.
              </span>
            </>
          ) : (
            <Link
              to="/verification"
              className={[
                'inline-flex items-center gap-1.5 font-extrabold whitespace-nowrap text-[var(--quni-success-strong)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-success)]',
                compact ? 'text-[11px]' : 'text-xs',
              ].join(' ')}
            >
              <span
                aria-hidden
                className="inline-flex h-[17px] w-[17px] rotate-[-5deg] items-center justify-center rounded-[3px] border-[1.4px] border-[var(--quni-success)] text-[10px] font-black"
              >
                ✓
              </span>
              {compact ? 'Verified →' : 'Verified marketplace →'}
            </Link>
          )}
          <SiteSocialLinks variant="drawer" className="justify-end" />
        </div>
      </div>
    </div>
  )
}
