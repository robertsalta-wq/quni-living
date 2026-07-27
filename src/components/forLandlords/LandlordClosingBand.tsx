import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { DeskPen } from '../desk'

type LandlordClosingBandProps = {
  className?: string
  style?: React.CSSProperties
}

/** Section 9 — coral pen + bordered back-link (second exit). */
const LandlordClosingBand = forwardRef<HTMLElement, LandlordClosingBandProps>(
  function LandlordClosingBand({ className = '', style }, ref) {
    return (
      <section
        ref={ref}
        className={[
          'desk-settle flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 border-[var(--quni-cream-border)]',
          'bg-[var(--quni-surface-1)] px-4 py-5 text-center shadow-[var(--shadow-1)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
        aria-label="Ready to list"
      >
        <DeskPen
          to="/signup?role=landlord"
          variant="coral"
          className="!w-auto max-w-xs rounded-full px-6 py-3 text-[14px]"
        >
          List my room <span className="desk-pen-arw" aria-hidden>→</span>
        </DeskPen>
        <Link
          to="/"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)] px-4 py-2 text-[11px] font-extrabold text-[var(--quni-ink-3)] no-underline hover:border-[var(--quni-coral-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        >
          ← Back to the home desk
        </Link>
      </section>
    )
  },
)

export default LandlordClosingBand
