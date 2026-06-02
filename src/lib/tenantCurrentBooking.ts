/**
 * Picks the single booking a tenant most needs to see on their dashboard.
 * Excludes terminal statuses; prefers in-progress stays, then action-needed, then applications.
 */

export type TenantBookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'awaiting_info'
  | 'bond_pending'
  | 'confirmed'
  | 'active'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'payment_failed'
  | 'completed'

export type TenantBookingPickInput = {
  id: string
  status: TenantBookingStatus
  start_date: string
  end_date: string | null
  move_in_date: string | null
  created_at: string
}

const TERMINAL: ReadonlySet<TenantBookingStatus> = new Set([
  'cancelled',
  'declined',
  'expired',
  'payment_failed',
  'completed',
])

/** Lower number = higher priority on dashboard. */
function statusPriority(status: TenantBookingStatus, stayRelevant: boolean): number | null {
  if (TERMINAL.has(status)) return null
  switch (status) {
    case 'active':
      return stayRelevant ? 1 : 80
    case 'confirmed':
      return stayRelevant ? 2 : 81
    case 'bond_pending':
      return 3
    case 'pending_payment':
      return 4
    case 'pending_confirmation':
      return 5
    case 'awaiting_info':
      return 6
    case 'pending':
      return 7
    default:
      return null
  }
}

export function localTodayYmd(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function relevantDateYmd(b: TenantBookingPickInput): string {
  const moveIn = b.move_in_date?.trim()
  if (moveIn) return moveIn.slice(0, 10)
  return b.start_date.slice(0, 10)
}

/** Stay is upcoming or in progress (end date absent or not before today). */
export function isStayRelevant(b: Pick<TenantBookingPickInput, 'end_date'>, todayYmd: string): boolean {
  const end = b.end_date?.trim()?.slice(0, 10)
  if (!end) return true
  return end >= todayYmd
}

type Scored<T> = { booking: T; priority: number; relevantDate: string; createdAt: string }

export function pickCurrentTenantBooking<T extends TenantBookingPickInput>(
  bookings: readonly T[],
  now = new Date(),
): T | null {
  const today = localTodayYmd(now)
  const scored: Scored<T>[] = []

  for (const b of bookings) {
    const stayRelevant = isStayRelevant(b, today)
    const priority = statusPriority(b.status, stayRelevant)
    if (priority == null) continue
    scored.push({
      booking: b,
      priority,
      relevantDate: relevantDateYmd(b),
      createdAt: b.created_at,
    })
  }

  if (scored.length === 0) return null

  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    if (a.relevantDate !== b.relevantDate) return a.relevantDate.localeCompare(b.relevantDate)
    return b.createdAt.localeCompare(a.createdAt)
  })

  return scored[0]!.booking
}

export function currentTenantBookingSectionTitle(status: TenantBookingStatus): string {
  if (status === 'active' || status === 'confirmed') return 'Your current booking'
  if (status === 'bond_pending') return 'Action needed on your booking'
  return 'Your application'
}

export function currentTenantBookingSectionHint(status: TenantBookingStatus): string | null {
  if (status === 'active' || status === 'confirmed') {
    return 'This is the stay you’re preparing for or living in now.'
  }
  if (status === 'bond_pending') {
    return 'Complete bond and agreement steps so your host can finalise the booking.'
  }
  if (status === 'pending_payment') {
    return 'Finish payment to send your request to the host.'
  }
  if (status === 'awaiting_info') {
    return 'Your host needs a bit more information from you.'
  }
  return 'We’ll show updates here while your host reviews your request.'
}
