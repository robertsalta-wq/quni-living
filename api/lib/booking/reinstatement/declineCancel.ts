import type { SupabaseClient } from '@supabase/supabase-js'
import type { PartyOfBooking } from './assertPartyOfBooking.js'
import {
  lazyExpireReinstatementRequest,
  loadReinstatementRequestById,
  type ReinstatementRequestRow,
} from './requestRows.js'
import { sendReinstatementCancelledEmails, sendReinstatementDeclinedEmails } from './emails.js'

export type DeclineOrCancelResult =
  | { ok: true; request: ReinstatementRequestRow }
  | { ok: false; status: number; error: string; code?: string; request?: ReinstatementRequestRow }

async function loadPendingForParty(
  admin: SupabaseClient,
  party: PartyOfBooking,
  requestId: string,
): Promise<DeclineOrCancelResult | { ok: true; request: ReinstatementRequestRow }> {
  const id = typeof requestId === 'string' ? requestId.trim() : ''
  if (!id) {
    return { ok: false, status: 400, error: 'requestId is required', code: 'missing_request_id' }
  }
  let request = await loadReinstatementRequestById(admin, id)
  if (!request || request.booking_id !== party.booking.id) {
    return { ok: false, status: 404, error: 'Reinstatement request not found', code: 'not_found' }
  }
  request = await lazyExpireReinstatementRequest(admin, request)
  if (request.status === 'window_expired') {
    return {
      ok: false,
      status: 409,
      error: 'This reinstatement request has expired.',
      code: 'window_expired',
      request,
    }
  }
  if (request.status !== 'pending_confirmation') {
    return {
      ok: false,
      status: 409,
      error: `Request is ${request.status}.`,
      code: 'not_pending',
      request,
    }
  }
  return { ok: true, request }
}

export async function declineReinstatement(args: {
  admin: SupabaseClient
  party: PartyOfBooking
  requestId: string
}): Promise<DeclineOrCancelResult> {
  const loaded = await loadPendingForParty(args.admin, args.party, args.requestId)
  if (!loaded.ok) return loaded
  const { request } = loaded

  if (request.requested_by === args.party.authUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Use cancel to withdraw your own request.',
      code: 'use_cancel',
      request,
    }
  }
  const expectedRole = request.requested_by_role === 'landlord' ? 'tenant' : 'landlord'
  if (args.party.role !== expectedRole) {
    return {
      ok: false,
      status: 403,
      error: 'Only the other party can decline this request.',
      code: 'wrong_party',
      request,
    }
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await args.admin
    .from('booking_reinstatement_requests')
    .update({ status: 'declined', updated_at: nowIso })
    .eq('id', request.id)
    .eq('status', 'pending_confirmation')
    .select(
      'id, booking_id, requested_by, requested_by_role, requested_at, grace_window_expires_at, status, requested_fee_action, confirmed_by, confirmed_at, fee_action, metadata, created_at, updated_at',
    )
    .maybeSingle()

  if (error) {
    console.error('[declineReinstatement]', error.message)
    return { ok: false, status: 500, error: 'Could not decline request' }
  }
  if (!data) {
    const again = await loadReinstatementRequestById(args.admin, request.id)
    return {
      ok: false,
      status: 409,
      error: `Request is ${again?.status ?? 'resolved'}.`,
      code: 'not_pending',
      request: again ?? request,
    }
  }

  void sendReinstatementDeclinedEmails(args.admin, args.party.booking.id, {
    declinedByRole: args.party.role,
  })
  return { ok: true, request: data as ReinstatementRequestRow }
}

export async function cancelReinstatement(args: {
  admin: SupabaseClient
  party: PartyOfBooking
  requestId: string
}): Promise<DeclineOrCancelResult> {
  const loaded = await loadPendingForParty(args.admin, args.party, args.requestId)
  if (!loaded.ok) return loaded
  const { request } = loaded

  if (request.requested_by !== args.party.authUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Only the requester can cancel this request.',
      code: 'not_requester',
      request,
    }
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await args.admin
    .from('booking_reinstatement_requests')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('id', request.id)
    .eq('status', 'pending_confirmation')
    .select(
      'id, booking_id, requested_by, requested_by_role, requested_at, grace_window_expires_at, status, requested_fee_action, confirmed_by, confirmed_at, fee_action, metadata, created_at, updated_at',
    )
    .maybeSingle()

  if (error) {
    console.error('[cancelReinstatement]', error.message)
    return { ok: false, status: 500, error: 'Could not cancel request' }
  }
  if (!data) {
    const again = await loadReinstatementRequestById(args.admin, request.id)
    return {
      ok: false,
      status: 409,
      error: `Request is ${again?.status ?? 'resolved'}.`,
      code: 'not_pending',
      request: again ?? request,
    }
  }

  void sendReinstatementCancelledEmails(args.admin, args.party.booking.id, {
    cancelledByRole: args.party.role,
  })
  return { ok: true, request: data as ReinstatementRequestRow }
}
