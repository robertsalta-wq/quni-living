import type { ReactNode } from 'react'

export type BookingReviewActionCardProps = {
  /** Uppercase-ish eyebrow; coral when action required. */
  eyebrow: string
  /** `action` = coral eyebrow (WHAT YOU NEED TO DO); `status` = grey. */
  eyebrowTone?: 'action' | 'status'
  title: string
  sub?: ReactNode
  /** Optional deadline pill (top-right). */
  deadline?: string
  deadlineTone?: 'info' | 'warning'
  children?: ReactNode
  /** Buttons / decline panel / footnotes below the body. */
  footer?: ReactNode
  className?: string
}

const DEADLINE_TONE: Record<'info' | 'warning', string> = {
  info: 'bg-admin-info-bg text-admin-info-fg',
  warning: 'bg-admin-warning-bg text-admin-warning-fg',
}

/**
 * Sticky-rail action / status card chrome — HTML visual SoT.
 * Content by role×state is wired in later commits (5a / 5b).
 */
export default function BookingReviewActionCard({
  eyebrow,
  eyebrowTone = 'status',
  title,
  sub,
  deadline,
  deadlineTone = 'info',
  children,
  footer,
  className = '',
}: BookingReviewActionCardProps) {
  return (
    <div
      className={`rounded-2xl border border-admin-line bg-white p-5 shadow-admin-card-hover ${className}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2.5">
        <p
          className={`m-0 text-[11px] font-semibold uppercase tracking-[0.04em] ${
            eyebrowTone === 'action' ? 'text-admin-coral-active' : 'text-admin-ink-5'
          }`}
        >
          {eyebrow}
        </p>
        {deadline ? (
          <span
            className={`inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold ${DEADLINE_TONE[deadlineTone]}`}
          >
            {deadline}
          </span>
        ) : null}
      </div>
      <h2 className="m-0 mb-1.5 text-[19px] font-bold tracking-[-0.01em] text-admin-ink">
        {title}
      </h2>
      {sub ? (
        <div className="text-[13.5px] leading-snug text-admin-ink-4">{sub}</div>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 flex flex-col gap-2.5">{footer}</div> : null}
    </div>
  )
}

/** Primary coral CTA — full width. */
export function bookingReviewPrimaryButtonClass(disabled = false): string {
  if (disabled) {
    return 'inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border-0 bg-[#F1EEEA] px-4 py-3 text-[14.5px] font-semibold text-[#B8B2C0]'
  }
  return 'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-admin-coral px-4 py-3 text-[14.5px] font-semibold text-white hover:bg-admin-coral-hover'
}

/** Ghost secondary — full width or flex-1. */
export function bookingReviewGhostButtonClass(): string {
  return 'w-full cursor-pointer rounded-[10px] border border-admin-line bg-transparent px-4 py-[11px] text-[13.5px] font-semibold text-admin-ink-3 hover:bg-admin-surface-2'
}

/** Underlined tertiary link button. */
export function bookingReviewLinkButtonClass(danger = false): string {
  return `w-full cursor-pointer border-0 bg-transparent px-1.5 py-1.5 text-[12.5px] font-semibold underline ${
    danger ? 'text-admin-danger-fg' : 'text-admin-ink-4'
  }`
}
