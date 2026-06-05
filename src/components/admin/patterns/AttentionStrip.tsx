import { Link } from 'react-router-dom'
import { Eyebrow } from '../primitives'

export type AttentionTone = 'critical' | 'action' | 'watch'

export interface AttentionItem {
  id: string
  tone: AttentionTone
  text: string
  /** Where the `Fix →` link sends the user - already-deep-linked w/ query params. */
  fixHref: string
}

export interface AttentionStripProps {
  items: AttentionItem[]
}

const DOT_CLASSES: Record<AttentionTone, string> = {
  critical: 'bg-admin-danger',
  action: 'bg-admin-warning',
  watch: 'bg-admin-navy',
}

/**
 * Cream banner that aggregates every "needs attention" item across zones.
 *
 * Per HANDOFF.md §3 Living Console: the leading label
 * (`{n} active · {n} critical, {n} action, {n} watch`) is computed live from
 * the items array - never hard-coded. When there's nothing to fix the strip
 * is hidden entirely (the caller decides; this component just renders).
 */
export function AttentionStrip({ items }: AttentionStripProps) {
  if (items.length === 0) return null
  const counts = items.reduce(
    (acc, it) => {
      acc[it.tone] += 1
      return acc
    },
    { critical: 0, action: 0, watch: 0 } as Record<AttentionTone, number>,
  )
  const summary = `${counts.critical} critical, ${counts.action} action, ${counts.watch} watch`

  return (
    <section className="mb-7 flex flex-wrap items-center gap-4 rounded-xl border border-admin-cream-border bg-admin-cream px-4 py-3">
      <div className="flex items-baseline gap-2.5 border-r border-admin-cream-border pr-3.5">
        <Eyebrow>Attention</Eyebrow>
        <span className="text-[12px] text-admin-ink-3">
          <strong className="text-admin-ink">{items.length} active</strong> · {summary}
        </span>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.fixHref}
            className="inline-flex items-center gap-2 rounded-admin-pill border border-admin-cream-border bg-white py-1 pl-2.5 pr-3 text-[12px] font-medium text-admin-ink-2 transition-colors hover:bg-admin-surface-2"
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[item.tone]}`} />
            <span>{item.text}</span>
            <span className="ml-1 font-semibold text-admin-coral-active">Fix →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
