export interface LoadingStateProps {
  /** Override the default `Loading…` label (e.g. "Loading bookings…"). */
  label?: string
  /** Override the default subtitle. */
  subtitle?: string
  className?: string
}

/**
 * Canonical admin loading state.
 *
 * Per HANDOFF.md §3: 36px ring spinner using coral over coral-tint-15 track,
 * `Loading…` + secondary "Fetching live data" subtitle. The spinner is a
 * pure border trick so we never ship an animated GIF.
 */
export function LoadingState({
  label = 'Loading…',
  subtitle = 'Fetching live data',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center px-7 py-10 text-center ' + (className ?? '')
      }
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="mb-4 h-9 w-9 animate-spin rounded-full border-2 border-admin-coral-tint-15 border-t-admin-coral"
      />
      <p className="text-[14px] font-medium text-admin-ink-3">{label}</p>
      <p className="mt-0.5 text-[12px] text-admin-ink-5">{subtitle}</p>
    </div>
  )
}
