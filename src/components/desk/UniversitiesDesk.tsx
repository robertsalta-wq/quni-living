import { useState } from 'react'
import { Link } from 'react-router-dom'

type UniversitiesDeskProps = {
  campusCount: number
  chips: { label: string; homes: number }[]
  className?: string
  mobileRail?: boolean
  railExpanded?: boolean
  onRailExpandChange?: (open: boolean) => void
}

export default function UniversitiesDesk({
  campusCount,
  chips,
  className = '',
  mobileRail = false,
  railExpanded = false,
  onRailExpandChange,
}: UniversitiesDeskProps) {
  const [open, setOpen] = useState(false)
  const coverageLabel = campusCount > 0 ? `near ${campusCount} campuses` : 'near campus'
  const letterhead = `Verified housing for your students — live coverage ${coverageLabel}.`

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-settle overflow-hidden rounded-[14px] border border-[rgba(31,42,68,0.14)] bg-[rgba(31,42,68,0.08)] shadow-[var(--shadow-1)] [contain:layout_paint]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          aria-expanded={railExpanded}
          onClick={() => onRailExpandChange?.(!railExpanded)}
          className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-navy)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-navy)]">
            Universities
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--quni-navy)]">
            Partner coverage
          </span>
          <span aria-hidden className="text-[var(--quni-navy)]">
            {railExpanded ? '⊖' : '⊕'}
          </span>
        </button>
        {railExpanded ? (
          <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">
            <p className="m-0 text-[13px] font-semibold text-[var(--quni-navy)]">{letterhead}</p>
            <ChipRow chips={chips} />
            <Link
              to="/for-universities"
              className="text-[13px] font-semibold text-[var(--quni-navy)] underline-offset-2 hover:underline"
            >
              For universities →
            </Link>
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <article
      className={[
        'desk-shell desk-settle flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[rgba(31,42,68,0.14)] bg-[rgba(31,42,68,0.08)] shadow-[var(--shadow-1)]',
        'transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--shadow-2)] [contain:layout_paint] [animation-delay:350ms]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex h-full flex-col gap-1.5 overflow-hidden p-3.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-navy)]">
          Universities
        </span>
        <p className="m-0 text-[13px] leading-snug font-semibold text-[var(--quni-navy)]">{letterhead}</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-fit rounded-full border border-[rgba(31,42,68,0.14)] bg-white/50 px-2.5 py-1 text-[11px] font-semibold text-[var(--quni-navy)] hover:bg-[rgba(31,42,68,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-navy)]"
        >
          {open ? '⊖ Close' : '⊕ Coverage'}
        </button>
        {open ? (
          <div className="mt-0.5 min-h-0 flex-1 overflow-y-auto border-t border-[rgba(31,42,68,0.14)] pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
              Coverage by campus
            </span>
            <ChipRow chips={chips} />
          </div>
        ) : null}
        <Link
          to="/for-universities"
          className="mt-auto pt-1 text-[12px] font-semibold text-[var(--quni-navy)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-navy)]"
        >
          Partner with Quni →
        </Link>
      </div>
    </article>
  )
}

function ChipRow({ chips }: { chips: { label: string; homes: number }[] }) {
  if (chips.length === 0) {
    return <p className="m-0 text-xs text-[var(--quni-ink-4)]">Live coverage appears as listings publish.</p>
  }
  const shown = chips.slice(0, 5)
  const more = chips.length - shown.length
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((u) => (
        <span
          key={u.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--quni-line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--quni-navy)]"
        >
          {u.label}{' '}
          <span className="font-medium text-[var(--quni-ink-4)]">
            {u.homes} home{u.homes === 1 ? '' : 's'}
          </span>
        </span>
      ))}
      {more > 0 ? (
        <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[var(--quni-ink-5)]">
          +{more} more
        </span>
      ) : null}
    </div>
  )
}
