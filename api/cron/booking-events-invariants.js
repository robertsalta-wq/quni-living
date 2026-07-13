/**
 * Gap monitors for booking_events (Stage 4).
 * Vercel Cron: GET /api/cron/booking-events-invariants
 * Secure with Authorization: Bearer CRON_SECRET
 *
 * Alerts (Sentry):
 * (a) provider webhook health stale (>24h or never received)
 * (b) bond_pending without payment-instructions email attempt/accepted
 * (c) email.accepted older than 24h without delivered/bounced/complained
 */
import { createClient } from '@supabase/supabase-js'
import { captureSentryMessageEdge } from '../lib/sentryEdgeCapture.js'

export const config = { runtime: 'edge' }

const STALE_WEBHOOK_HOURS = 24
const EMAIL_OUTCOME_HOURS = 24
const PAYMENT_TEMPLATE_KEYS = ['listing_payment_instructions', 'listing_booking_accepted_renter']

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return json({ ok: false, error: 'missing supabase env' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const findings = []

  // (a) Provider webhook health
  const { data: healthRows, error: healthErr } = await admin
    .from('provider_webhook_health')
    .select('provider, last_received_at, last_event_type, last_error, updated_at')

  if (healthErr) {
    await captureSentryMessageEdge('booking-events-invariants: health query failed', {
      error: healthErr.message,
    })
    return json({ ok: false, error: healthErr.message }, 500)
  }

  const staleBefore = Date.now() - STALE_WEBHOOK_HOURS * 60 * 60 * 1000
  for (const row of healthRows || []) {
    const received = row.last_received_at ? new Date(row.last_received_at).getTime() : NaN
    const neverReceived = !Number.isFinite(received)
    const agedOut = Number.isFinite(received) && received < staleBefore

    let shouldAlert = false
    if (neverReceived) {
      // Never received = likely misconfigured URL/secret (the DocuSeal class of failure).
      shouldAlert = true
    } else if (agedOut && row.provider === 'docuseal') {
      shouldAlert = true
    } else if (agedOut && row.provider === 'resend') {
      // Only alert Resend quietness when we recently accepted sends that should have outcomes.
      const { count } = await admin
        .from('booking_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'email.accepted')
        .eq('provider', 'resend')
        .gte('occurred_at', hoursAgoIso(STALE_WEBHOOK_HOURS))
      shouldAlert = (count ?? 0) > 0
    } else if (agedOut && row.provider === 'stripe') {
      shouldAlert = true
    }

    if (shouldAlert) {
      const finding = {
        kind: 'webhook_stale',
        provider: row.provider,
        last_received_at: row.last_received_at,
        last_error: row.last_error,
      }
      findings.push(finding)
      await captureSentryMessageEdge(
        `provider webhook health stale: ${row.provider}`,
        finding,
        {
          level: 'error',
          tags: { monitor: 'booking_events', provider: String(row.provider) },
          fingerprint: ['booking-events-webhook-stale', String(row.provider)],
        },
      )
    }
  }

  // (b) bond_pending without payment-instructions email
  const { data: bondPending, error: bondErr } = await admin
    .from('bookings')
    .select('id, status, confirmed_at, created_at')
    .eq('status', 'bond_pending')
    .eq('service_tier_final', 'listing')
    .limit(200)

  if (bondErr) {
    await captureSentryMessageEdge('booking-events-invariants: bond_pending query failed', {
      error: bondErr.message,
    })
  } else {
    for (const booking of bondPending || []) {
      const { data: emailEv, error: evErr } = await admin
        .from('booking_events')
        .select('id, event_type, metadata')
        .eq('booking_id', booking.id)
        .in('event_type', ['email.attempt', 'email.accepted'])
        .limit(50)

      if (evErr) continue

      const hasPaymentEmail = (emailEv || []).some((ev) => {
        const meta =
          ev.metadata && typeof ev.metadata === 'object' && !Array.isArray(ev.metadata)
            ? ev.metadata
            : {}
        const key = typeof meta.template_key === 'string' ? meta.template_key : ''
        return PAYMENT_TEMPLATE_KEYS.includes(key)
      })

      if (!hasPaymentEmail) {
        const finding = { kind: 'bond_pending_missing_payment_email', booking_id: booking.id }
        findings.push(finding)
        await captureSentryMessageEdge(
          'bond_pending booking has no payment-instructions email event',
          finding,
          {
            level: 'error',
            tags: { monitor: 'booking_events' },
            fingerprint: ['booking-events-bond-pending-no-email', booking.id],
          },
        )
      }
    }
  }

  // (c) email.accepted without delivery outcome after 24h
  const cutoff = hoursAgoIso(EMAIL_OUTCOME_HOURS)
  const { data: acceptedRows, error: acceptedErr } = await admin
    .from('booking_events')
    .select('id, booking_id, provider_ref, correlation_id, occurred_at')
    .eq('event_type', 'email.accepted')
    .eq('provider', 'resend')
    .lt('occurred_at', cutoff)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (acceptedErr) {
    await captureSentryMessageEdge('booking-events-invariants: accepted query failed', {
      error: acceptedErr.message,
    })
  } else {
    for (const row of acceptedRows || []) {
      const ref = typeof row.provider_ref === 'string' ? row.provider_ref : ''
      if (!ref) continue

      const { data: outcome, error: outErr } = await admin
        .from('booking_events')
        .select('id')
        .eq('provider', 'resend')
        .eq('provider_ref', ref)
        .in('event_type', ['email.delivered', 'email.bounced', 'email.complained'])
        .limit(1)
        .maybeSingle()

      if (outErr) continue
      if (outcome?.id) continue

      const finding = {
        kind: 'email_accepted_missing_outcome',
        booking_id: row.booking_id,
        provider_ref: ref,
        occurred_at: row.occurred_at,
      }
      findings.push(finding)
      await captureSentryMessageEdge(
        'email.accepted has no delivery/bounce/complaint after 24h',
        finding,
        {
          level: 'error',
          tags: { monitor: 'booking_events' },
          fingerprint: ['booking-events-email-no-outcome', ref],
        },
      )
    }
  }

  return json({
    ok: true,
    findings_count: findings.length,
    findings: findings.slice(0, 50),
  })
}
