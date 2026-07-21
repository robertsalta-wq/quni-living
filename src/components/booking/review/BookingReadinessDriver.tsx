import type { ReactNode } from 'react'

export type ReadinessGateState = 'done' | 'current' | 'todo'

export type BookingReadinessGate = {
  id: string
  label: string
  sub: string
  state: ReadinessGateState
  /** Incomplete gates only — e.g. "Add" */
  actionLabel?: string
  onAction?: () => void
}

export type BookingReadinessDriverProps = {
  gates: BookingReadinessGate[]
  /** Shown under the progress bar (e.g. "Add a payout method to unlock…"). */
  hint?: string
  className?: string
}

/**
 * Landlord pre-acceptance readiness checklist — HTML visual SoT.
 * Presentational only; gate wiring lands in commit 5a.
 */
export default function BookingReadinessDriver({
  gates,
  hint,
  className = '',
}: BookingReadinessDriverProps) {
  const total = gates.length
  const doneCount = gates.filter((g) => g.state === 'done').length
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  return (
    <div
      className={`rounded-xl border border-admin-line-soft bg-[var(--quni-surface-2)] px-[15px] pb-1.5 pt-[15px] ${className}`}
    >
      <div className="mb-0.5 flex items-baseline justify-between gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
          Required to accept
        </span>
        <span className="text-xs font-semibold text-admin-ink">
          {doneCount} of {total} required done
        </span>
      </div>
      <p className="mb-2.5 text-base font-bold tracking-[-0.01em] text-admin-ink">
        Account <span className="text-admin-coral">{pct}%</span> ready
      </p>
      <div className="mb-2.5 h-[7px] overflow-hidden rounded-full bg-[#ECE7DE]">
        <div
          className="h-full rounded-full bg-admin-coral transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? (
        <div className="mb-1 flex items-start gap-1.5 pb-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--quni-coral-active)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[12.5px] leading-snug text-admin-coral-active">{hint}</span>
        </div>
      ) : null}
      <ul className="m-0 list-none p-0">
        {gates.map((g) => (
          <li
            key={g.id}
            className="flex gap-[11px] border-t border-admin-line-soft py-[13px]"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                g.state === 'done'
                  ? 'bg-admin-success'
                  : g.state === 'current'
                    ? 'border-2 border-admin-coral bg-white'
                    : 'border-2 border-[var(--quni-line)] bg-white'
              }`}
              aria-hidden
            >
              {g.state === 'done' ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2.5">
                <span
                  className={`text-[13.5px] ${
                    g.state === 'done'
                      ? 'font-medium text-admin-ink-5'
                      : g.state === 'current'
                        ? 'font-semibold text-admin-ink'
                        : 'font-medium text-admin-ink-3'
                  }`}
                >
                  {g.label}
                </span>
                {g.state !== 'done' && g.actionLabel && g.onAction ? (
                  <button
                    type="button"
                    onClick={g.onAction}
                    className="shrink-0 border-0 bg-transparent text-[12.5px] font-semibold text-admin-coral hover:text-admin-coral-hover"
                  >
                    {g.actionLabel} →
                  </button>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-admin-ink-5">{g.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Green “all checks complete” ribbon (replaces the driver when gates clear). */
export function BookingReadinessReadyRibbon({
  children = "All checks complete — you're ready to respond.",
  className = '',
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-[rgba(29,158,117,0.3)] bg-[rgba(29,158,117,0.08)] px-3.5 py-3 ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--quni-success-strong)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </svg>
      <span className="text-[13px] font-semibold text-admin-success-fg">{children}</span>
    </div>
  )
}
