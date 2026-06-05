import { Link } from 'react-router-dom'
import { Eyebrow, Sparkline, type SparklineColor } from '../primitives'

export type PulseDeltaTone = 'success' | 'danger' | 'neutral'

export interface MarketplacePulseCellProps {
  label: string
  /** Pre-formatted display value - never format in this component (HANDOFF non-goal 8). */
  value: string
  unit?: string | null
  delta: string
  deltaTone: PulseDeltaTone
  spark: number[]
  sparkColor: SparklineColor
  href: string
  linkLabel: string
  isLast?: boolean
}

const DELTA_CHIP: Record<PulseDeltaTone, string> = {
  success: 'bg-admin-success-bg text-admin-success-fg',
  danger: 'bg-admin-danger-bg text-admin-danger-fg',
  neutral: 'bg-admin-surface-3 text-admin-ink-4',
}

/**
 * One cell in the Marketplace Pulse strip (four cells total).
 *
 * Per HANDOFF §3: numbers render `tabular-nums`, sparklines never receive a
 * hex string (palette is locked at the type level), and the cell's right
 * border collapses on the last item so the strip reads as one card.
 */
export function MarketplacePulseCell({
  label,
  value,
  unit,
  delta,
  deltaTone,
  spark,
  sparkColor,
  href,
  linkLabel,
  isLast = false,
}: MarketplacePulseCellProps) {
  return (
    <div
      className={
        'flex flex-col gap-2 px-5 py-5 ' +
        (isLast ? '' : 'border-r border-admin-line-soft')
      }
    >
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none tracking-tight text-admin-ink tabular-nums">
          {value}
        </span>
        {unit ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            'inline-flex items-center rounded-admin-pill px-2 py-0.5 text-[11px] font-semibold ' +
            DELTA_CHIP[deltaTone]
          }
        >
          {delta}
        </span>
        <Sparkline data={spark} color={sparkColor} width={80} height={22} fill={false} dot={false} />
      </div>
      <Link
        to={href}
        className="mt-0.5 text-[12px] font-semibold text-admin-ink-3 hover:text-admin-coral-active"
      >
        {linkLabel}
      </Link>
    </div>
  )
}
