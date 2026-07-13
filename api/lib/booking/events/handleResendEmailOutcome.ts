import type { SupabaseClient } from '@supabase/supabase-js'
import { recordBookingEvent } from './recordBookingEvent.js'
import type { BookingEventType } from './types.js'

export type ResendWebhookEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[]
    from?: string
    subject?: string
    bounce?: unknown
    tags?: Array<{ name?: string; value?: string }> | Record<string, string>
  }
}

const OUTCOME_MAP: Record<
  string,
  { eventType: BookingEventType; outcome: 'success' | 'failure' }
> = {
  'email.delivered': { eventType: 'email.delivered', outcome: 'success' },
  'email.bounced': { eventType: 'email.bounced', outcome: 'failure' },
  'email.complained': { eventType: 'email.complained', outcome: 'failure' },
  'email.opened': { eventType: 'email.opened', outcome: 'success' },
}

function tagsToObject(
  tags:
    | Array<{ name?: string; value?: string }>
    | Record<string, string>
    | null
    | undefined,
): Record<string, string> {
  if (!tags) return {}
  if (Array.isArray(tags)) {
    const out: Record<string, string> = {}
    for (const row of tags) {
      if (row && typeof row.name === 'string' && typeof row.value === 'string') {
        out[row.name] = row.value
      }
    }
    return out
  }
  if (typeof tags === 'object') {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(tags)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  }
  return {}
}

/**
 * Append delivery/bounce/complaint/opened outcome for a Resend webhook event.
 * Looks up the matching email.accepted row by provider_ref (Resend email id).
 */
export async function handleResendEmailOutcome(
  admin: SupabaseClient,
  event: ResendWebhookEvent,
): Promise<{ handled: boolean; reason?: string; bookingId?: string }> {
  const type = typeof event.type === 'string' ? event.type : ''
  const mapped = OUTCOME_MAP[type]
  if (!mapped) {
    return { handled: false, reason: `ignored_type:${type || 'unknown'}` }
  }

  const emailId =
    typeof event.data?.email_id === 'string' && event.data.email_id.trim()
      ? event.data.email_id.trim()
      : ''
  if (!emailId) {
    return { handled: false, reason: 'missing_email_id' }
  }

  const { data: accepted, error: findErr } = await admin
    .from('booking_events')
    .select('id, booking_id, landlord_id, student_id, correlation_id, metadata')
    .eq('provider', 'resend')
    .eq('provider_ref', emailId)
    .eq('event_type', 'email.accepted')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr) {
    throw findErr
  }

  const tags = tagsToObject(event.data?.tags ?? undefined)
  let bookingId =
    accepted && typeof accepted.booking_id === 'string' ? accepted.booking_id : null
  let correlationId =
    accepted && typeof accepted.correlation_id === 'string' ? accepted.correlation_id : null
  let landlordId =
    accepted && typeof accepted.landlord_id === 'string' ? accepted.landlord_id : null
  let studentId =
    accepted && typeof accepted.student_id === 'string' ? accepted.student_id : null

  if (!bookingId && tags.booking_id) {
    bookingId = tags.booking_id
  }
  if (!correlationId && tags.correlation_id) {
    correlationId = tags.correlation_id
  }

  if (!bookingId) {
    return { handled: false, reason: 'no_booking_match', bookingId: undefined }
  }

  // Idempotent: skip if same outcome already recorded for this email id.
  const { data: existing } = await admin
    .from('booking_events')
    .select('id')
    .eq('provider', 'resend')
    .eq('provider_ref', emailId)
    .eq('event_type', mapped.eventType)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { handled: true, reason: 'duplicate', bookingId }
  }

  await recordBookingEvent(
    admin,
    {
      bookingId,
      eventType: mapped.eventType,
      landlordId,
      studentId,
      occurredAt: typeof event.created_at === 'string' ? event.created_at : undefined,
      outcome: mapped.outcome,
      actorType: 'webhook',
      actorLabel: 'Resend',
      provider: 'resend',
      providerRef: emailId,
      correlationId,
      metadata: {
        resend_type: type,
        subject: event.data?.subject ?? null,
        bounce: event.data?.bounce ?? null,
        template_key: tags.template_key ?? null,
      },
    },
    { required: true },
  )

  return { handled: true, bookingId }
}
