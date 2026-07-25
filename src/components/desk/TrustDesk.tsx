import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import DeskNameplate from './DeskNameplate'

/** Face lines — only claims that match shipped behaviour (no rent/bond custody claim). */
const TRUST_LINES = [
  'ID-verified renters & landlords',
  'State-compliant agreements',
  'Every listing reviewed before it goes live',
] as const

const VERIFIED_LINES = [
  'Australian-hosted data',
  'Fair-by-design AI — no protected traits in decisions',
  'Stripe identity checks for hosts before they accept',
] as const

type TrustDeskProps = {
  className?: string
  mobileRail?: boolean
  railExpanded?: boolean
  onRailExpandChange?: (open: boolean) => void
  trayOpen?: boolean
  onTrayOpenChange?: (open: boolean) => void
}

export default function TrustDesk({
  className = '',
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  trayOpen,
  onTrayOpenChange,
}: TrustDeskProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const panelId = useId()
  const open = trayOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (onTrayOpenChange) onTrayOpenChange(next)
    else setUncontrolledOpen(next)
  }

  const face = (
    <>
      {!mobileRail ? <DeskNameplate>TRUST & SAFETY</DeskNameplate> : null}
      <div className="flex flex-col gap-1">
        {TRUST_LINES.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-flex h-3.5 w-3.5 shrink-0 rotate-[-4deg] items-center justify-center rounded-[3px] border-[1.3px] border-[var(--quni-success)] bg-white/70 text-[9px] font-black text-[var(--quni-success)]"
            >
              ✓
            </span>
            <span className="text-[12px] font-medium leading-snug text-[var(--quni-ink-2)]">{t}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/verification"
          className="text-[12px] font-semibold text-[var(--quni-success-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-success)]"
        >
          How verification works →
        </Link>
        {!mobileRail ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
            className="rounded-full border border-[rgba(29,158,117,0.22)] bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-[var(--quni-success-strong)] hover:bg-[rgba(29,158,117,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-success)]"
          >
            {open ? '⊖ Close' : '⊕ What verified means'}
          </button>
        ) : null}
      </div>
      {(open || (mobileRail && railExpanded)) && (
        <div
          id={mobileRail ? undefined : panelId}
          className="mt-0.5 flex flex-col gap-2 border-t border-[rgba(29,158,117,0.22)] pt-3"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
            What verified means
          </span>
          {VERIFIED_LINES.map((v) => (
            <div key={v} className="flex items-start gap-2">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--quni-success)"
                strokeWidth="2.4"
                className="mt-0.5 shrink-0"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[13.5px] leading-snug text-[var(--quni-ink-3)]">{v}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-settle overflow-hidden rounded-[14px] border border-[rgba(29,158,117,0.22)] bg-[var(--quni-success-bg)] shadow-[var(--shadow-1)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          aria-expanded={railExpanded}
          onClick={() => onRailExpandChange?.(!railExpanded)}
          className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
        >
          <DeskNameplate className="!px-2 !py-1 [&_span]:text-[8.5px] [&_span]:tracking-[0.12em]">
            TRUST & SAFETY
          </DeskNameplate>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--quni-ink-2)]">
            Verification & fairness
          </span>
          <span aria-hidden className="text-[var(--quni-success-strong)]">
            {railExpanded ? '⊖' : '⊕'}
          </span>
        </button>
        {railExpanded ? <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">{face}</div> : null}
      </article>
    )
  }

  return (
    <article
      className={[
        'desk-shell desk-settle flex min-h-0 w-full flex-col overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[rgba(29,158,117,0.22)] bg-[var(--quni-success-bg)] shadow-[var(--shadow-1)]',
        'transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--shadow-2)] [animation-delay:550ms]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3.5">
        {face}
        <span className="mt-auto" />
      </div>
    </article>
  )
}
