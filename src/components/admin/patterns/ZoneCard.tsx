import { Link } from 'react-router-dom'
import { Card, Eyebrow, Sparkline, type SparklineColor } from '../primitives'
import { Icon, type IconName } from '../Icon'
import type { AdminZoneId } from '../nav'

export type ZoneRowTone = 'critical' | 'action' | 'watch' | 'ok'
export type ZoneIconTone = 'cream' | 'navy' | 'success'

export interface ZoneCardRow {
  tone: ZoneRowTone
  text: string
  /**
   * When true, the row renders dimmer to telegraph that the data is placeholder
   * (see Decisions B2/F1/G1 - some metrics ship as stubs in PR 3).
   */
  stub?: boolean
}

export interface ZoneCardProps {
  zone: AdminZoneId
  title: string
  eyebrow: string
  icon: IconName
  iconTone: ZoneIconTone
  spark: number[]
  sparkColor: SparklineColor
  rows: ZoneCardRow[]
  /** Where clicking the card navigates - typically the first sub-item of the zone. */
  href: string
}

const ROW_DOT: Record<ZoneRowTone, string> = {
  critical: 'bg-admin-danger',
  action: 'bg-admin-warning',
  watch: 'bg-admin-navy',
  ok: 'bg-admin-success',
}

const ICON_TONE: Record<ZoneIconTone, { wrap: string; icon: string }> = {
  cream: {
    wrap: 'bg-admin-cream border-admin-cream-border',
    icon: 'text-admin-coral-active',
  },
  navy: {
    wrap: 'bg-admin-navy-tint border-admin-navy/15',
    icon: 'text-admin-navy',
  },
  success: {
    wrap: 'bg-admin-success-bg border-admin-success/20',
    icon: 'text-admin-success-fg',
  },
}

/**
 * One of the six cards on the Living Console.
 *
 * Per HANDOFF.md §3 acceptance criteria, clicking the card navigates to the
 * zone's first sub-item - and the sidebar expansion logic in `Sidebar.tsx`
 * picks up that path so the right zone opens automatically. When `rows` is
 * empty (everything healthy), the card shows "All clear" instead of an empty
 * list (HANDOFF §3 explicitly forbids an empty state on the Living Console).
 */
export function ZoneCard({
  title,
  eyebrow,
  icon,
  iconTone,
  spark,
  sparkColor,
  rows,
  href,
}: ZoneCardProps) {
  const tone = ICON_TONE[iconTone]
  return (
    <Link to={href} className="group block focus:outline-none">
      <Card
        hoverable
        padding={22}
        className="cursor-pointer transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-admin-coral group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-admin-surface-1"
      >
        <div className="mb-3.5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border ${tone.wrap}`}
            >
              <Icon name={icon} size={16} className={tone.icon} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] font-semibold leading-tight text-admin-ink">
                {title}
              </h3>
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          </div>
          <Sparkline data={spark} color={sparkColor} width={84} height={26} />
        </div>

        {rows.length === 0 ? (
          <p className="m-0 mb-4 flex items-center gap-2.5 text-[13px] text-admin-ink-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-admin-success" />
            All clear
          </p>
        ) : (
          <ul className="m-0 mb-4 flex list-none flex-col gap-1.5 p-0">
            {rows.map((row, i) => (
              <li
                key={i}
                className={
                  'flex items-start gap-2.5 text-[13px] leading-tight ' +
                  (row.stub ? 'text-admin-ink-4' : 'text-admin-ink-2')
                }
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${ROW_DOT[row.tone]} ${row.stub ? 'opacity-50' : ''}`}
                />
                <span>{row.text}</span>
              </li>
            ))}
          </ul>
        )}

        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-admin-ink-3 transition-colors group-hover:text-admin-coral-active">
          Open zone <Icon name="arrow-right" size={13} />
        </span>
      </Card>
    </Link>
  )
}
