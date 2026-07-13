/// <reference types="node" />
// @ts-nocheck - Vercel isolated API TS pass.
/**
 * Resend delivery webhooks (Svix-signed).
 * Configure in Resend: POST https://quni.com.au/api/webhooks/resend
 * Events: email.delivered, email.bounced, email.complained, email.opened
 *
 * Env: RESEND_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { Webhook } from 'svix'
import { handleResendEmailOutcome } from '../lib/booking/events/handleResendEmailOutcome.js'
import { touchProviderWebhookHealth } from '../lib/booking/events/touchProviderWebhookHealth.js'
import { captureSentryMessageEdge } from '../lib/sentryEdgeCapture.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

/** Same pattern as stripe-webhook: prefer raw bytes for signature verification. */
async function readRawBody(req: any): Promise<string> {
  const b = req.body
  if (Buffer.isBuffer(b) && b.length > 0) {
    return b.toString('utf8')
  }
  if (typeof b === 'string' && b.length > 0) {
    return b
  }
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function header(req: any, name: string): string {
  const v = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0] || '') : ''
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim()
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!secret || !supabaseUrl || !serviceRole) {
    console.error('[resend-webhook] missing RESEND_WEBHOOK_SECRET or Supabase env')
    return res.status(500).json({ ok: false, error: 'Server misconfigured' })
  }

  let rawBody: string
  try {
    rawBody = await readRawBody(req)
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid body' })
  }

  const svixHeaders = {
    'svix-id': header(req, 'svix-id'),
    'svix-timestamp': header(req, 'svix-timestamp'),
    'svix-signature': header(req, 'svix-signature'),
  }

  let event: unknown
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, svixHeaders)
  } catch (e) {
    console.error('[resend-webhook] verify failed', e)
    return res.status(400).json({ ok: false, error: 'Invalid signature' })
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const eventType =
    event && typeof event === 'object' && typeof (event as { type?: unknown }).type === 'string'
      ? (event as { type: string }).type
      : 'unknown'

  await touchProviderWebhookHealth(admin, 'resend', eventType)

  try {
    const result = await handleResendEmailOutcome(admin, event as never)
    if (!result.handled && result.reason === 'no_booking_match') {
      await captureSentryMessageEdge('Resend webhook: no booking_events match for email_id', {
        eventType,
        reason: result.reason,
        emailId:
          event && typeof event === 'object'
            ? (event as { data?: { email_id?: string } }).data?.email_id
            : null,
      }, { level: 'warning' })
    }
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    console.error('[resend-webhook] handler error', e)
    await touchProviderWebhookHealth(
      admin,
      'resend',
      eventType,
      e instanceof Error ? e.message : String(e),
    )
    // 5xx so Resend/Svix retries
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
