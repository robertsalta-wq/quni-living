import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Canonical admin empty state.
 *
 * Per HANDOFF.md §3: 44px Lucide glyph in a 12px-radius tinted square + bold
 * title + secondary copy capped at 280px + single primary CTA. No marketing
 * illustrations or playful copy.
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center px-7 py-10 text-center ' + (className ?? '')
      }
    >
      <div className="mb-3.5 grid h-11 w-11 place-items-center rounded-xl border border-admin-line bg-admin-surface-2">
        <Icon name={icon} size={20} className="text-admin-ink-4" />
      </div>
      <p className="text-[15px] font-semibold text-admin-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-admin-ink-4">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
