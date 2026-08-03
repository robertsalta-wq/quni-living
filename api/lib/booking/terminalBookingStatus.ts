/** Booking statuses where the platform must not treat tenancy agreements as live or executed. */
/** Pre-tenancy teardown + live-agreement end (not `terminating` — still occupies until effective date). */
export const TERMINAL_BOOKING_STATUSES = ['cancelled', 'expired', 'declined', 'terminated'] as const

export type TerminalBookingStatus = (typeof TERMINAL_BOOKING_STATUSES)[number]

export function isTerminalBookingStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').trim()
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(s)
}
