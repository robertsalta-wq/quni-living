import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dashboardPrimaryBtnClass } from '../../lib/dashboardButtons'

type EmptyProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  /** `card` = quni-card panel (default). `plain` = nested inside an existing panel. */
  variant?: 'card' | 'plain'
}

/** Shared empty list / empty tab chrome for landlord + renter dashboards. */
export function DashboardEmpty({
  title,
  description,
  action,
  className,
  variant = 'card',
}: EmptyProps) {
  const shell =
    variant === 'plain'
      ? `py-10 text-center sm:p-10 ${className ?? ''}`.trim()
      : `quni-card text-center py-12 ${className ?? ''}`.trim()
  return (
    <div className={shell}>
      <p className="font-medium text-[var(--quni-ink-2)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--quni-ink-5)]">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

type BannerProps = {
  message: ReactNode
  className?: string
  /** `warning` = soft partial failure; `danger` = hard error strip. */
  tone?: 'warning' | 'danger'
}

/** Inline / page-level error strip (partial load failures, connect errors, etc.). */
export function DashboardErrorBanner({ message, className, tone = 'warning' }: BannerProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-[var(--quni-danger-bg)] bg-[var(--quni-danger-bg)] text-[var(--quni-danger-fg)]'
      : 'border-admin-warning bg-admin-warning-bg text-admin-warning-fg'
  return (
    <div
      className={`rounded-admin-md border px-4 py-3 text-sm ${toneClass} ${className ?? ''}`.trim()}
      role="alert"
    >
      {message}
    </div>
  )
}

type FatalProps = {
  message: ReactNode
  actionHref?: string
  actionLabel?: string
  className?: string
}

/** Full-page fatal load failure (no profile / blocked dashboard). */
export function DashboardFatalError({
  message,
  actionHref,
  actionLabel = 'Go to profile',
  className,
}: FatalProps) {
  return (
    <div className={`mx-auto max-w-3xl px-4 py-12 ${className ?? ''}`.trim()}>
      <div className="quni-card p-5 text-center">
        <p className="text-[var(--quni-ink-2)]">{message}</p>
        {actionHref ? (
          <Link to={actionHref} className={`${dashboardPrimaryBtnClass} mt-6`}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

type WelcomeProps = {
  message: string
}

/** Login welcome toast — same chrome for landlord + renter. */
export function DashboardWelcomeToast({ message }: WelcomeProps) {
  return (
    <div
      className="fixed top-20 right-4 z-[70] flex w-[min(100%-2rem,22rem)] items-start gap-3 rounded-admin-md border border-admin-line bg-white px-4 py-3 shadow-lg"
      role="status"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-success-bg text-sm font-bold text-admin-success-fg"
        aria-hidden
      >
        ✓
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-admin-ink">{message}</p>
      </div>
    </div>
  )
}
