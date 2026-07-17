import { apiUrl } from '../apiUrl'
import { supabase } from '../supabase'

export type ReinstatementRequestStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'window_expired'
  | 'blocked_unavailable'

export type ReinstatementRequest = {
  id: string
  booking_id: string
  requested_by: string
  requested_by_role: 'landlord' | 'tenant'
  requested_at: string
  grace_window_expires_at: string
  status: ReinstatementRequestStatus
  requested_fee_action: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  fee_action: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ReinstatementState = {
  ok: true
  eligible: boolean
  eligibilityCode: string | null
  graceRemainingMs: number | null
  request: ReinstatementRequest | null
  viewerRole: 'landlord' | 'tenant'
  isRequester: boolean
  canConfirm: boolean
  canDecline: boolean
  canCancel: boolean
}

export type ReinstatementFeeAction = 'reinstate_free_flagged'

export class ReinstatementApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ReinstatementApiError'
    this.status = status
    this.code = code
  }
}

type ApiFailure = { error?: string; code?: string }

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (error || !token) throw new ReinstatementApiError('Your session has expired. Please sign in again.', 401)
  return token
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken()
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as T & ApiFailure
  if (!response.ok) {
    throw new ReinstatementApiError(body.error || 'Could not update reinstatement.', response.status, body.code)
  }
  return body
}

export function getReinstatement(bookingId: string): Promise<ReinstatementState> {
  return request<ReinstatementState>(`/api/booking/reinstatement?bookingId=${encodeURIComponent(bookingId)}`)
}

export function requestReinstatement(
  bookingId: string,
  feeAction?: ReinstatementFeeAction,
): Promise<{ ok: true; request: ReinstatementRequest; otherPartyRole: 'landlord' | 'tenant' }> {
  return request('/api/booking/reinstatement/request', {
    method: 'POST',
    body: JSON.stringify({ bookingId, ...(feeAction ? { feeAction } : {}) }),
  })
}

export function confirmReinstatement(
  requestId: string,
  feeAction?: ReinstatementFeeAction,
): Promise<{
  ok: true
  request: ReinstatementRequest
  bookingStatusAfter: string
  signing_needs_resend: boolean
  signing_resend_failed: boolean
  listing_fee_refunded: boolean
}> {
  return request('/api/booking/reinstatement/confirm', {
    method: 'POST',
    body: JSON.stringify({ requestId, ...(feeAction ? { feeAction } : {}) }),
  })
}

export function declineReinstatement(requestId: string): Promise<{ ok: true; request: ReinstatementRequest }> {
  return request('/api/booking/reinstatement/decline', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}

export function cancelReinstatement(requestId: string): Promise<{ ok: true; request: ReinstatementRequest }> {
  return request('/api/booking/reinstatement/cancel', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}
