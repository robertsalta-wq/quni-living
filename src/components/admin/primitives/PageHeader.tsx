import type { ReactNode } from 'react'

export interface AdminPageHeaderProps {
  /** The h1 title (28px bold, admin-display sans). */
  title: string
  /** Optional 14px subtitle below the title. */
  subtitle?: ReactNode
  /** Optional eyebrow row above the title - pills, status, "Last saved" text, etc. */
  eyebrow?: ReactNode
  /** Optional right-aligned action row (buttons, badges). */
  actions?: ReactNode
  /** Bottom margin in Tailwind class shorthand. Defaults to `mb-6`. */
  className?: string
}

/**
 * Standard page header for the admin redesign - used by Bookings, Pricing, and
 * every legacy page swept in PR 6.
 *
 * Visual contract (HANDOFF §3):
 * - 28px bold tracking-tight title in `admin-ink`
 * - 14px subtitle in `admin-ink-4`
 * - Optional eyebrow row above + actions slot to the right
 * - 24px bottom margin (overridable via `className`)
 */
export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className = 'mb-6',
}: AdminPageHeaderProps) {
  return (
    <div className={'flex items-end justify-between gap-6 ' + className}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5">{eyebrow}</div> : null}
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-admin-ink">{title}</h1>
        {subtitle ? <p className="m-0 mt-1 text-[14px] text-admin-ink-4">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2.5">{actions}</div> : null}
    </div>
  )
}
