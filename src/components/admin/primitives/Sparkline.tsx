export type SparklineColor = 'coral' | 'navy'

export interface SparklineProps {
  data: number[]
  /** Restricted palette per HANDOFF.md §2 - no hex strings. */
  color?: SparklineColor
  width?: number
  height?: number
  fill?: boolean
  dot?: boolean
  ariaLabel?: string
}

const COLOR_HEX: Record<SparklineColor, string> = {
  // Mirrors `tailwind.config.js` admin-navy + admin-coral.
  coral: 'var(--chart-1)',
  navy: 'var(--chart-2)',
}

/**
 * Tiny inline trend chart. Pure SVG, no dependency.
 *
 * Per HANDOFF.md §3: use coral only for coral-primary KPIs (revenue, booking
 * volume); everything else uses navy. The component refuses to accept a hex
 * string on purpose - the palette stays locked at the type level.
 */
export function Sparkline({
  data,
  color = 'navy',
  width = 96,
  height = 28,
  fill = true,
  dot = true,
  ariaLabel,
}: SparklineProps) {
  if (data.length === 0) {
    return <svg width={width} height={height} aria-hidden role="img" />
  }
  const stroke = COLOR_HEX[color]
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const denom = Math.max(data.length - 1, 1)
  const pts = data.map((v, i) => {
    const x = (i / denom) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L ${width} ${height} L 0 ${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      role="img"
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {fill ? <path d={area} fill={stroke} opacity={0.08} /> : null}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot ? <circle cx={last[0]} cy={last[1]} r={2.2} fill={stroke} /> : null}
    </svg>
  )
}
