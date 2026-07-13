import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '../sendEmail.js'
import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'
import { recordBookingEvent, type BookingEventDeviceContext } from './events/recordBookingEvent.js'
import type { BookingEventActorType } from './events/types.js'

export type SendBookingEmailArgs = {
  bookingId: string
  templateKey: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string | string[]
  landlordId?: string | null
  studentId?: string | null
  actorType?: BookingEventActorType
  actorId?: string | null
  actorLabel?: string | null
  metadata?: Record<string, unknown> | null
  /** Handler device context — omit for cron/system sends. */
  deviceCtx?: BookingEventDeviceContext | null
}

export type SendBookingEmailResult = {
  resendId: string | null
  correlationId: string
}

function newCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function extractResendId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const id = (payload as { id?: unknown }).id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

function maskRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to]
  return list.map((raw) => {
    const email = String(raw || '').trim().toLowerCase()
    const at = email.indexOf('@')
    if (at <= 0) return '[redacted]'
    const local = email.slice(0, at)
    const domain = email.slice(at + 1)
    const hint = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***`
    return `${hint}@${domain}`
  })
}

/**
 * Booking-scoped email send with append-only outcome logging.
 *
 * Fail policy:
 * - email.attempt insert fails → do not send (throws)
 * - Resend succeeds, email.accepted insert fails → do not retry send; Sentry; still return success
 * - Resend fails → email.failed best-effort, then throw
 *
 * Audience is always internal (enforced by recordBookingEvent).
 */
export async function sendBookingEmail(
  admin: SupabaseClient,
  args: SendBookingEmailArgs,
): Promise<SendBookingEmailResult> {
  const bookingId = String(args.bookingId || '').trim()
  const templateKey = String(args.templateKey || '').trim()
  if (!bookingId) throw new Error('sendBookingEmail: bookingId required')
  if (!templateKey) throw new Error('sendBookingEmail: templateKey required')

  const correlationId = newCorrelationId()
  const toMasked = maskRecipients(args.to)
  const baseMeta = {
    template_key: templateKey,
    to_masked: toMasked,
    ...(args.metadata && typeof args.metadata === 'object' ? args.metadata : {}),
  }

  await recordBookingEvent(
    admin,
    {
      bookingId,
      eventType: 'email.attempt',
      landlordId: args.landlordId,
      studentId: args.studentId,
      actorType: args.actorType ?? 'system',
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'resend',
      correlationId,
      metadata: baseMeta,
      deviceCtx: args.deviceCtx,
    },
    { required: true },
  )

  let resendPayload: unknown
  try {
    resendPayload = await sendEmail({
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
      cc: args.cc,
      tags: [
        { name: 'booking_id', value: bookingId.slice(0, 50) },
        { name: 'template_key', value: templateKey.slice(0, 50) },
        { name: 'correlation_id', value: correlationId.slice(0, 50) },
      ],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordBookingEvent(admin, {
      bookingId,
      eventType: 'email.failed',
      landlordId: args.landlordId,
      studentId: args.studentId,
      actorType: args.actorType ?? 'system',
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'resend',
      correlationId,
      metadata: { ...baseMeta, error: message.slice(0, 500) },
      deviceCtx: args.deviceCtx,
    })
    throw err
  }

  const resendId = extractResendId(resendPayload)

  try {
    await recordBookingEvent(
      admin,
      {
        bookingId,
        eventType: 'email.accepted',
        landlordId: args.landlordId,
        studentId: args.studentId,
        actorType: args.actorType ?? 'system',
        actorId: args.actorId,
        actorLabel: args.actorLabel,
        provider: 'resend',
        providerRef: resendId,
        correlationId,
        metadata: baseMeta,
        deviceCtx: args.deviceCtx,
      },
      { required: true },
    )
  } catch (err) {
    // Never retry send — avoid double-mailing. Gap monitor + Sentry catch the missing row.
    await captureSentryMessageEdge('email.accepted insert failed after Resend success', {
      bookingId,
      templateKey,
      correlationId,
      resendId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { resendId, correlationId }
}
