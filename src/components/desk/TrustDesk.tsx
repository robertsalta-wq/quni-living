import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import DeskAnswerPanel from './DeskAnswerPanel'
import DeskNameplate from './DeskNameplate'
import type { DeskNameplateVariant } from '../../lib/deskNameplateVariants'

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
  /** Optional FAQ answer shown in-desk (questions owned by Trust). */
  deskAnswer?: { text: string; source: string } | null
  nameplateVariant?: DeskNameplateVariant
  /** `/home-v3` — tighter padding; still stretches to equal row height. */
  dense?: boolean
}

export default function TrustDesk({
  className = '',
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
  trayOpen,
  onTrayOpenChange,
  deskAnswer = null,
  nameplateVariant = 'brass',
  dense = false,
}: TrustDeskProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const panelId = useId()
  const open = trayOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (onTrayOpenChange) onTrayOpenChange(next)
    else setUncontrolledOpen(next)
  }
  const answered = Boolean(deskAnswer?.text)

  const face = (
    <>
      {!mobileRail ? (
        <DeskNameplate variant={nameplateVariant}>TRUST & SAFETY</DeskNameplate>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {TRUST_LINES.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-sm font-bold text-[var(--quni-verified)]"
            >
              ✓
            </span>
            <span className="text-base font-medium leading-snug text-[var(--quni-ink-2)]">
              {t}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/verification"
          className="text-sm font-semibold text-[var(--quni-verified)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-verified)]"
        >
          How verification works →
        </Link>
        {!mobileRail ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
            className="rounded-full border border-[var(--quni-verified-border)] bg-[var(--quni-surface-1)]/60 px-2.5 py-1 text-xs font-semibold text-[var(--quni-verified)] hover:bg-[var(--quni-verified-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-verified)]"
          >
            {open ? '⊖ Close' : '⊕ What verified means'}
          </button>
        ) : null}
      </div>
      {(open || (mobileRail && railExpanded)) && (
        <div
          id={mobileRail ? undefined : panelId}
          className="mt-0.5 flex flex-col gap-2 border-t border-[var(--quni-verified-border)] pt-3"
        >
          <span className="eyebrow">
            What verified means
          </span>
          {VERIFIED_LINES.map((v) => (
            <div key={v} className="flex items-start gap-2">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--quni-verified)"
                strokeWidth="2.4"
                className="mt-0.5 shrink-0"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm leading-snug text-[var(--quni-ink-3)]">{v}</span>
            </div>
          ))}
        </div>
      )}
      <DeskAnswerPanel
        open={answered}
        answer={deskAnswer?.text ?? ''}
        source={deskAnswer?.source ?? 'VERIFICATION POLICY'}
        tone="trust"
      />
    </>
  )

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-settle overflow-hidden rounded-[14px] border border-[var(--quni-verified-border)] bg-[var(--quni-verified-surface)] shadow-[var(--shadow-1)]',
          answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
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
          <DeskNameplate
            variant={nameplateVariant}
            className="!px-2 !py-1"
          >
            TRUST & SAFETY
          </DeskNameplate>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--quni-ink-2)]">
            Verification & fairness
          </span>
          <span aria-hidden className="text-[var(--quni-verified)]">
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
        'border border-[var(--quni-verified-border)] bg-[var(--quni-verified-surface)] shadow-[var(--shadow-1)]',
        'transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--shadow-2)] [animation-delay:550ms]',
        answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'flex min-h-0 flex-1 flex-col',
          dense ? 'gap-1 p-2.5' : 'gap-1.5 p-3.5',
        ].join(' ')}
      >
        {face}
        <span className="mt-auto" />
      </div>
    </article>
  )
}
