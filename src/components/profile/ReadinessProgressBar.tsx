type Props = {
  /** Progress percentage, 0–100. */
  value: number
  className?: string
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Shared 8px coral pill progress bar used by landlord and renter readiness drivers. */
export default function ReadinessProgressBar({ value, className }: Props) {
  const pct = clampPercent(value)

  return (
    <div
      className={['h-2 overflow-hidden rounded-full bg-admin-surface-3', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className="h-full rounded-full bg-admin-coral transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
