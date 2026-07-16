import type { ReactNode } from 'react'
import BookingLifecycleStepper from './BookingLifecycleStepper'
import type { BookingReviewStepperIndex } from '../../../lib/booking/bookingReviewLayout'

export type BookingReviewBookingSummaryProps = {
  /** Page H1 — state title. */
  title: string
  referenceLabel: string
  receivedLabel?: string | null
  stepperIndex: BookingReviewStepperIndex
  stepperComplete?: boolean
}

export type BookingReviewPropertySummaryProps = {
  /** Page H2 — listing title (visual size matches H1). */
  title: string
  subtitle?: string | null
  planLabel: string
  planTooltip: string
  listingHref?: string | null
  photoUrl?: string | null
}

/** Shared white card used by the summary strip boxes. */
export function BookingReviewSurfaceCard({
  children,
  className = '',
  padding = 'strip',
}: {
  children: ReactNode
  className?: string
  padding?: 'strip' | 'section' | 'rail'
}) {
  const pad =
    padding === 'strip' ? 'px-5 py-[18px]' : padding === 'rail' ? 'p-5' : 'px-6 py-[22px]'
  return (
    <div
      className={`flex flex-col rounded-2xl border border-admin-line bg-white shadow-admin-card ${pad} ${className}`}
    >
      {children}
    </div>
  )
}

export function BookingReviewBookingSummary({
  title,
  referenceLabel,
  receivedLabel,
  stepperIndex,
  stepperComplete,
}: BookingReviewBookingSummaryProps) {
  return (
    <BookingReviewSurfaceCard padding="strip" className="min-h-0">
      <h1 className="m-0 text-[22px] font-bold leading-[1.15] tracking-[-0.015em] text-admin-ink">
        {title}
      </h1>
      <p className="mt-3 text-[12.5px] text-admin-ink-5">
        Ref <span className="font-mono text-admin-ink-4">{referenceLabel}</span>
        {receivedLabel ? <> · {receivedLabel}</> : null}
      </p>
      <div className="mt-auto border-t border-admin-line-soft pt-4">
        <BookingLifecycleStepper currentIndex={stepperIndex} complete={stepperComplete} />
      </div>
    </BookingReviewSurfaceCard>
  )
}

export function BookingReviewPropertySummary({
  title,
  subtitle,
  planLabel,
  planTooltip,
  listingHref,
  photoUrl,
}: BookingReviewPropertySummaryProps) {
  return (
    <BookingReviewSurfaceCard padding="strip" className="min-h-0">
      <div className="flex items-start justify-between gap-2.5">
        <h2 className="m-0 text-[22px] font-bold leading-[1.15] tracking-[-0.015em] text-admin-ink">
          {title}
        </h2>
        {listingHref ? (
          <a
            href={listingHref}
            className="mt-1 shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-admin-coral hover:text-admin-coral-active"
          >
            View listing →
          </a>
        ) : null}
      </div>
      <div className="mt-auto flex items-end gap-3.5 pt-3">
        <div className="min-w-0 flex-1">
          {subtitle ? (
            <p className="m-0 text-[13.5px] text-admin-ink-4">{subtitle}</p>
          ) : null}
          <span
            title={planTooltip}
            className="mt-2.5 inline-flex cursor-help items-center gap-1.5 rounded-full bg-admin-navy-tint px-[11px] py-[5px] text-xs font-semibold text-admin-navy"
          >
            {planLabel}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </span>
        </div>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-[10px] border border-admin-cream-border object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] border border-admin-cream-border bg-admin-surface-3 text-[11px] text-admin-ink-5"
            aria-hidden
          >
            Photo
          </div>
        )}
      </div>
    </BookingReviewSurfaceCard>
  )
}

/** Two-up summary strip; stacks under 560px. */
export function BookingReviewSummaryStrip({
  booking,
  property,
}: {
  booking: ReactNode
  property: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2">{booking}{property}</div>
  )
}
