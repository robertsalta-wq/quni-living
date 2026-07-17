/** Self-serve reinstatement grace after booking.expired_at (30 days). */
export const REINSTATEMENT_GRACE_MS = 30 * 24 * 60 * 60 * 1000

export const REINSTATE_FEE_FREE_FLAGGED = 'reinstate_free_flagged' as const
export type ReinstatementFeeAction = typeof REINSTATE_FEE_FREE_FLAGGED

export const REINSTATEMENT_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'declined',
  'window_expired',
  'cancelled',
  'blocked_unavailable',
] as const
export type ReinstatementRequestStatus = (typeof REINSTATEMENT_STATUSES)[number]

export function graceWindowExpiresAt(expiredAtIso: string, fromMs = Date.now()): string {
  const expiredMs = new Date(expiredAtIso).getTime()
  const base = Number.isFinite(expiredMs) ? expiredMs : fromMs
  return new Date(base + REINSTATEMENT_GRACE_MS).toISOString()
}

export function isWithinReinstatementGrace(expiredAtIso: string | null | undefined, nowMs = Date.now()): boolean {
  if (!expiredAtIso || !String(expiredAtIso).trim()) return false
  const expiredMs = new Date(expiredAtIso).getTime()
  if (!Number.isFinite(expiredMs)) return false
  return nowMs < expiredMs + REINSTATEMENT_GRACE_MS
}

export function validateV1FeeAction(feeAction: unknown): feeAction is ReinstatementFeeAction {
  return feeAction === REINSTATE_FEE_FREE_FLAGGED
}
