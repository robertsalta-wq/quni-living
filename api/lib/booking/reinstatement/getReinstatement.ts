import type { SupabaseClient } from '@supabase/supabase-js'
import type { PartyOfBooking } from './assertPartyOfBooking.js'
import { assertReinstatementRequestEligibility } from './eligibility.js'
import { isWithinReinstatementGrace, REINSTATEMENT_GRACE_MS } from './constants.js'
import {
  lazyExpireReinstatementRequest,
  loadLatestReinstatementRequest,
  type ReinstatementRequestRow,
} from './requestRows.js'

export type GetReinstatementResult = {
  ok: true
  eligible: boolean
  eligibilityCode: string | null
  graceRemainingMs: number | null
  request: ReinstatementRequestRow | null
  viewerRole: 'landlord' | 'tenant'
  isRequester: boolean
  canConfirm: boolean
  canDecline: boolean
  canCancel: boolean
}

export async function getReinstatementState(args: {
  admin: SupabaseClient
  party: PartyOfBooking
}): Promise<GetReinstatementResult> {
  const { admin, party } = args
  const booking = party.booking

  let request = await loadLatestReinstatementRequest(admin, booking.id)
  if (request) {
    request = await lazyExpireReinstatementRequest(admin, request)
  }

  const elig = assertReinstatementRequestEligibility(booking)
  const pendingOpen = request?.status === 'pending_confirmation'
  const eligible = elig.ok && !pendingOpen

  let graceRemainingMs: number | null = null
  if (booking.expired_at && isWithinReinstatementGrace(booking.expired_at)) {
    const expiredMs = new Date(booking.expired_at).getTime()
    graceRemainingMs = Math.max(0, expiredMs + REINSTATEMENT_GRACE_MS - Date.now())
  }

  const isRequester = Boolean(request && request.requested_by === party.authUserId)
  const canConfirm = Boolean(
    pendingOpen && request && request.requested_by !== party.authUserId,
  )
  const canDecline = canConfirm
  const canCancel = Boolean(pendingOpen && isRequester)

  return {
    ok: true,
    eligible,
    eligibilityCode: elig.ok ? (pendingOpen ? 'pending_exists' : null) : elig.code,
    graceRemainingMs,
    request,
    viewerRole: party.role,
    isRequester,
    canConfirm,
    canDecline,
    canCancel,
  }
}
