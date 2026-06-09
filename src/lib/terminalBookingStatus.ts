/** Mirror of `api/lib/booking/terminalBookingStatus.ts` for client-safe imports. */
export const TERMINAL_BOOKING_STATUSES = ['cancelled', 'expired', 'declined'] as const

export type TerminalBookingStatus = (typeof TERMINAL_BOOKING_STATUSES)[number]

export function isTerminalBookingStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').trim()
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(s)
}
