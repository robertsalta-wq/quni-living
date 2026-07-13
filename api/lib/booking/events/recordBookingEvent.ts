import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '../../../../src/lib/database.types.js'
import { mergeDeviceContextMetadata } from '../../journey/requestContext.js'
import {
  defaultsForEventType,
  resolveAudience,
  type BookingEventActorType,
  type BookingEventAudience,
  type BookingEventChange,
  type BookingEventOutcome,
  type BookingEventProvider,
  type BookingEventType,
} from './types.js'

/** Same shape as journey requestContextFromRequest / mergeDeviceContextMetadata. */
export type BookingEventDeviceContext = {
  user_agent: string
  is_mobile: boolean
}

export type RecordBookingEventInput = {
  bookingId: string
  eventType: BookingEventType | (string & {})
  landlordId?: string | null
  studentId?: string | null
  occurredAt?: string | null
  audience?: BookingEventAudience
  outcome?: BookingEventOutcome
  actorType?: BookingEventActorType
  actorId?: string | null
  actorLabel?: string | null
  changes?: BookingEventChange[] | null
  reason?: string | null
  provider?: BookingEventProvider | (string & {}) | null
  providerRef?: string | null
  correlationId?: string | null
  documentId?: string | null
  metadata?: Record<string, unknown> | null
  /** Handler-only: merge user_agent / is_mobile into metadata. Omit for trigger/webhook/cron. */
  deviceCtx?: BookingEventDeviceContext | null
  schemaVersion?: number
}

export type RecordBookingEventOk = { ok: true; id: string }
export type RecordBookingEventErr = { ok: false; error: unknown; message: string }
export type RecordBookingEventResult = RecordBookingEventOk | RecordBookingEventErr

export type RecordBookingEventOptions = {
  /**
   * When true, throw on insert failure (fail-closed paths: terms, bond ack, email.attempt).
   * When false/omitted, return { ok: false } for the caller to warn-and-continue.
   */
  required?: boolean
}

function asJson(value: unknown): Json {
  return value as Json
}

/**
 * Append one row to booking_events via the service-role client.
 * Does not write to service_tier_events (STE is demoted).
 *
 * Audience: email.* is always forced to `internal`.
 * Defaults for audience/outcome come from BOOKING_EVENT_DEFAULTS when omitted.
 */
export async function recordBookingEvent(
  admin: SupabaseClient,
  input: RecordBookingEventInput,
  options: RecordBookingEventOptions = {},
): Promise<RecordBookingEventResult> {
  const eventType = String(input.eventType || '').trim()
  if (!eventType) {
    const err = { ok: false as const, error: new Error('event_type required'), message: 'event_type required' }
    if (options.required) {
      throw new Error(err.message)
    }
    return err
  }

  const bookingId = String(input.bookingId || '').trim()
  if (!bookingId) {
    const err = { ok: false as const, error: new Error('booking_id required'), message: 'booking_id required' }
    if (options.required) {
      throw new Error(err.message)
    }
    return err
  }

  const defaults = defaultsForEventType(eventType)
  const audience = resolveAudience(eventType, input.audience)
  const outcome = input.outcome ?? defaults.outcome
  const actorType = input.actorType ?? 'system'

  const baseMeta =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? input.metadata
      : {}
  const metadata = mergeDeviceContextMetadata(baseMeta, input.deviceCtx ?? null)

  const row = {
    booking_id: bookingId,
    landlord_id: input.landlordId ?? null,
    student_id: input.studentId ?? null,
    event_type: eventType,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    audience,
    outcome,
    actor_type: actorType,
    actor_id: input.actorId ?? null,
    actor_label: input.actorLabel?.trim() ? input.actorLabel.trim() : null,
    changes: input.changes != null ? asJson(input.changes) : null,
    reason: input.reason?.trim() ? input.reason.trim() : null,
    provider: input.provider?.trim() ? input.provider.trim() : null,
    provider_ref: input.providerRef?.trim() ? input.providerRef.trim() : null,
    correlation_id: input.correlationId?.trim() ? input.correlationId.trim() : null,
    document_id: input.documentId ?? null,
    metadata: asJson(metadata),
    schema_version: input.schemaVersion ?? 1,
  }

  const { data, error } = await admin.from('booking_events').insert(row).select('id').single()

  if (error) {
    const message = error.message || 'booking_events insert failed'
    if (options.required) {
      const wrapped = new Error(message)
      ;(wrapped as Error & { cause?: unknown }).cause = error
      throw wrapped
    }
    return { ok: false, error, message }
  }

  const id = data && typeof (data as { id?: unknown }).id === 'string' ? (data as { id: string }).id : null
  if (!id) {
    const message = 'booking_events insert returned no id'
    if (options.required) {
      throw new Error(message)
    }
    return { ok: false, error: new Error(message), message }
  }

  return { ok: true, id }
}
