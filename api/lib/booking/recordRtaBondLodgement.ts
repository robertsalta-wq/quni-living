import type { SupabaseClient } from '@supabase/supabase-js'

export type RecordRtaBondLodgementPayload = {
  rta_bond_number: string | null
  rta_acknowledgement_reference: string | null
  rta_bond_lodged_at: string | null
}

export type RecordRtaBondLodgementResult =
  | { ok: true; booking: RecordRtaBondLodgementPayload & { id: string } }
  | { ok: false; status: number; code: string; message: string }

function normalizeOptionalText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  return t.slice(0, maxLen)
}

function normalizeOptionalIso(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T12:00:00.000Z`
  const d = new Date(t)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

/** Optional RTA lodgement record for QLD Listing bookings — not a confirmation gate. */
export async function runRecordRtaBondLodgement(args: {
  admin: SupabaseClient
  landlordProfileId: string
  bookingId: string
  rtaBondNumber?: unknown
  rtaAcknowledgementReference?: unknown
  rtaBondLodgedAt?: unknown
  actorRole: 'landlord' | 'student'
  studentProfileId?: string
}): Promise<RecordRtaBondLodgementResult> {
  const { admin, landlordProfileId, bookingId, actorRole, studentProfileId } = args

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      student_id,
      status,
      service_tier_final,
      properties ( state )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    return { ok: false, status: 500, code: 'db_error', message: 'Could not load booking.' }
  }
  if (!booking) {
    return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  }

  const prop =
    booking.properties && typeof booking.properties === 'object'
      ? (booking.properties as { state?: string | null })
      : null
  const propState = (prop?.state ?? '').trim().toUpperCase()
  if (propState !== 'QLD') {
    return { ok: false, status: 400, code: 'wrong_state', message: 'RTA bond records apply to Queensland listings only.' }
  }

  if (actorRole === 'landlord') {
    if (booking.landlord_id !== landlordProfileId) {
      return { ok: false, status: 403, code: 'forbidden', message: 'Forbidden.' }
    }
  } else if (actorRole === 'student') {
    if (!studentProfileId || booking.student_id !== studentProfileId) {
      return { ok: false, status: 403, code: 'forbidden', message: 'Forbidden.' }
    }
  }

  const allowedStatuses = ['bond_pending', 'confirmed', 'active', 'completed']
  if (!allowedStatuses.includes(String(booking.status))) {
    return {
      ok: false,
      status: 409,
      code: 'invalid_status',
      message: 'RTA bond details can only be recorded for active listing bookings.',
    }
  }

  const rta_bond_number = normalizeOptionalText(args.rtaBondNumber, 64)
  const rta_acknowledgement_reference = normalizeOptionalText(args.rtaAcknowledgementReference, 128)
  const rta_bond_lodged_at = normalizeOptionalIso(args.rtaBondLodgedAt)

  if (!rta_bond_number && !rta_acknowledgement_reference && !rta_bond_lodged_at) {
    return {
      ok: false,
      status: 400,
      code: 'empty',
      message: 'Provide at least one RTA bond field to save.',
    }
  }

  const patch: Record<string, string | null> = {}
  if (args.rtaBondNumber !== undefined) patch.rta_bond_number = rta_bond_number
  if (args.rtaAcknowledgementReference !== undefined) patch.rta_acknowledgement_reference = rta_acknowledgement_reference
  if (args.rtaBondLodgedAt !== undefined) patch.rta_bond_lodged_at = rta_bond_lodged_at

  const { data: updated, error: upErr } = await admin
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select('id, rta_bond_number, rta_acknowledgement_reference, rta_bond_lodged_at')
    .maybeSingle()

  if (upErr || !updated) {
    return { ok: false, status: 500, code: 'db_error', message: 'Could not save RTA bond details.' }
  }

  return {
    ok: true,
    booking: {
      id: updated.id as string,
      rta_bond_number: (updated.rta_bond_number as string | null) ?? null,
      rta_acknowledgement_reference: (updated.rta_acknowledgement_reference as string | null) ?? null,
      rta_bond_lodged_at: (updated.rta_bond_lodged_at as string | null) ?? null,
    },
  }
}
