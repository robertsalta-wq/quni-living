import { BOOKING_REVIEW_STEPPER_LABELS, type BookingReviewStepperIndex } from '../../../lib/booking/bookingReviewLayout'

export type BookingLifecycleStepperProps = {
  /** 0 = Request … 3 = Active */
  currentIndex: BookingReviewStepperIndex
  /** When true, all four steps render complete (active / completed). */
  complete?: boolean
  className?: string
}

/**
 * Horizontal booking progress — HTML visual SoT (green done, coral ring current).
 */
export default function BookingLifecycleStepper({
  currentIndex,
  complete = false,
  className = '',
}: BookingLifecycleStepperProps) {
  const activeIndex = complete ? 3 : currentIndex
  const allDone = complete
  const contextLabel = allDone ? 'Complete' : `Step ${activeIndex + 1} of 4`

  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
          Booking progress
        </span>
        <span className="text-xs font-semibold text-admin-ink">{contextLabel}</span>
      </div>
      <div className="flex">
        {BOOKING_REVIEW_STEPPER_LABELS.map((label, i) => {
          const st = allDone || i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo'
          const leftColor =
            i === 0 ? 'transparent' : activeIndex >= i || allDone ? 'var(--quni-success)' : 'var(--quni-line)'
          const rightColor =
            i === 3 ? 'transparent' : activeIndex >= i + 1 || allDone ? 'var(--quni-success)' : 'var(--quni-line)'
          return (
            <div
              key={label}
              className="relative flex flex-1 flex-col items-center"
            >
              <div
                className="absolute left-0 top-[9px] h-0.5 w-1/2"
                style={{ background: leftColor }}
                aria-hidden
              />
              <div
                className="absolute left-1/2 top-[9px] h-0.5 w-1/2"
                style={{ background: rightColor }}
                aria-hidden
              />
              <span
                className={`relative z-[1] flex h-5 w-5 items-center justify-center rounded-full ${
                  st === 'done'
                    ? 'bg-admin-success'
                    : st === 'current'
                      ? 'border-2 border-admin-coral bg-white'
                      : 'border-2 border-[var(--quni-line)] bg-white'
                }`}
                aria-current={st === 'current' ? 'step' : undefined}
              >
                {st === 'done' ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </span>
              <span
                className={`mt-2 text-center text-[11px] ${
                  st === 'todo' ? 'font-medium text-[#B0A9B6]' : 'font-semibold text-admin-ink'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
