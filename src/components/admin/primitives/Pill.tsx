import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

export type PillTone =
  | 'neutral'
  | 'coral'
  | 'navy'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'ink'

export type PillDot = 'critical' | 'action' | 'watch' | 'ok'

export interface PillProps {
  tone?: PillTone
  dot?: PillDot
  icon?: IconName
  children: ReactNode
  className?: string
}

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-admin-surface-3 text-admin-ink-3',
  coral: 'bg-admin-coral-tint-15 text-admin-coral-active',
  navy: 'bg-admin-navy-tint text-admin-navy',
  success: 'bg-admin-success-bg text-admin-success-fg',
  warning: 'bg-admin-warning-bg text-admin-warning-fg',
  danger: 'bg-admin-danger-bg text-admin-danger-fg',
  info: 'bg-admin-info-bg text-admin-info-fg',
  ink: 'bg-admin-ink/10 text-admin-ink',
}

const DOT_CLASSES: Record<PillDot, string> = {
  critical: 'bg-admin-danger',
  action: 'bg-admin-warning',
  watch: 'bg-admin-navy',
  ok: 'bg-admin-success',
}

/**
 * Status / category chip used throughout admin surfaces.
 *
 * Eight tones map to the design tokens; the optional `dot` adds a small
 * status indicator to the left (independent of `tone` so an "ok" dot on a
 * neutral pill is legal). Use `icon` for category labels (e.g. tier pills).
 */
export function Pill({ tone = 'neutral', dot, icon, children, className }: PillProps) {
  const cls = [
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-admin-pill px-2.5 py-0.5 text-[11px] font-semibold',
    TONE_CLASSES[tone],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls}>
      {dot ? (
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[dot]}`} />
      ) : null}
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  )
}
