import { Link } from 'react-router-dom'
import SiteSocialLinks from '../SiteSocialLinks'
import { useLegalEntity } from '../../lib/useLegalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'

const linkClass =
  'text-[11px] font-semibold tracking-[0.03em] text-[var(--quni-ink-3)] no-underline [font-variant:small-caps] border-b border-dotted border-[var(--quni-cream-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

/** Signature strip under the bento — legal lookup + rules + social (social absent from Claude mock). */
export default function PapersBlock() {
  const entity = useLegalEntity()
  const abn = entity.abn.trim()
  const abnLine = abn
    ? `ABN ${formatAustralianAbn(abn)} · ${entity.registeredSuburb}, ${entity.registeredState}`
    : `${entity.registeredSuburb}, ${entity.registeredState}, Australia`

  return (
    <div
      className="quni-card desk-settle mt-3.5 px-6 py-4 [animation-delay:680ms]"
      style={{
        borderTop: '3px double var(--quni-cream-border)',
        background: 'linear-gradient(160deg, var(--quni-surface-1), var(--quni-cream))',
      }}
    >
      <div className="flex flex-wrap items-center gap-8">
        <div className="flex flex-col gap-0.5">
          <span className="font-[family-name:var(--font-serif)] text-base font-bold text-[var(--quni-ink)]">
            <span className="text-[var(--quni-coral)]">Q</span>uni Living
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--quni-ink-5)]">
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

        <div className="ml-auto flex flex-col items-end gap-2">
          <Link
            to="/verification"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold whitespace-nowrap text-[var(--quni-success-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-success)]"
          >
            <span
              aria-hidden
              className="inline-flex h-[17px] w-[17px] rotate-[-5deg] items-center justify-center rounded-[3px] border-[1.4px] border-[var(--quni-success)] text-[10px] font-black"
            >
              ✓
            </span>
            Verified marketplace →
          </Link>
          <SiteSocialLinks variant="drawer" className="justify-end" />
        </div>
      </div>
    </div>
  )
}
