/**
 * Qase — email submitter when an admin posts a public reply.
 * Internal only: requires `x-qase-internal` matching `QASE_INTERNAL_SECRET`.
 *
 * Deploy: supabase functions deploy qase-notify --no-verify-jwt
 * Secrets: QASE_INTERNAL_SECRET, RESEND_API_KEY (+ auto SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://quni-living.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-qase-internal',
}

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeSubjectLine(subject: string, ticketNumber: number): string {
  const base = subject.trim() || 'Your support ticket'
  const max = 200
  const suffix = ` [#${ticketNumber}]`
  const headroom = Math.max(0, max - suffix.length)
  const trimmed = base.length > headroom ? `${base.slice(0, headroom - 1)}…` : base
  return `Re: ${trimmed}${suffix}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('QASE_INTERNAL_SECRET')?.trim()
  if (!secret) {
    console.error('qase-notify: QASE_INTERNAL_SECRET not configured')
    return json({ error: 'Server misconfigured' }, 500)
  }

  const provided = req.headers.get('x-qase-internal')?.trim()
  if (!provided || provided !== secret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim()

  if (!supabaseUrl || !serviceRole) {
    console.error('qase-notify: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server misconfigured' }, 500)
  }

  if (!resendKey) {
    console.error('qase-notify: RESEND_API_KEY not set')
    return json({ ok: true, emailed: false, reason: 'resend_not_configured' }, 200)
  }

  let body: { message_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const messageId = typeof body.message_id === 'string' ? body.message_id.trim() : ''
  if (!messageId) {
    return json({ error: 'message_id required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: msgRow, error: msgErr } = await admin
    .from('qase_messages')
    .select('id, ticket_id, body, is_internal_note, author_type')
    .eq('id', messageId)
    .maybeSingle()

  if (msgErr) {
    console.error('qase-notify: message fetch', msgErr)
    return json({ error: msgErr.message }, 500)
  }

  const msg = msgRow as {
    id: string
    ticket_id: string
    body: string
    is_internal_note: boolean
    author_type: string
  } | null

  if (!msg) {
    return json({ skipped: true, reason: 'message_not_found' }, 200)
  }

  if (msg.is_internal_note !== false || msg.author_type !== 'admin') {
    return json({ skipped: true, reason: 'not_admin_public_reply' }, 200)
  }

  const { data: ticketRow, error: ticketErr } = await admin
    .from('qase_tickets')
    .select('id, ticket_number, subject, submitted_by_type, submitted_by_id')
    .eq('id', msg.ticket_id)
    .maybeSingle()

  if (ticketErr) {
    console.error('qase-notify: ticket fetch', ticketErr)
    return json({ error: ticketErr.message }, 500)
  }

  const ticket = ticketRow as {
    id: string
    ticket_number: number
    subject: string
    submitted_by_type: string
    submitted_by_id: string | null
  } | null

  if (!ticket) {
    return json({ skipped: true, reason: 'ticket_not_found' }, 200)
  }

  const st = ticket.submitted_by_type
  const sid = ticket.submitted_by_id

  if (st === 'anonymous' || !sid) {
    return json({ skipped: true, reason: 'anonymous_or_unlinked' }, 200)
  }

  let submitterEmail: string | null = null

  if (st === 'student') {
    const { data: sp, error: e } = await admin.from('student_profiles').select('email').eq('id', sid).maybeSingle()
    if (e) console.error('qase-notify: student_profiles', e)
    submitterEmail = typeof (sp as { email?: string } | null)?.email === 'string' ? (sp as { email: string }).email.trim() : null
  } else if (st === 'landlord') {
    const { data: lp, error: e } = await admin.from('landlord_profiles').select('email').eq('id', sid).maybeSingle()
    if (e) console.error('qase-notify: landlord_profiles', e)
    submitterEmail = typeof (lp as { email?: string } | null)?.email === 'string' ? (lp as { email: string }).email.trim() : null
  } else {
    return json({ skipped: true, reason: 'unsupported_submitter_type' }, 200)
  }

  if (!submitterEmail) {
    return json({ skipped: true, reason: 'no_submitter_email' }, 200)
  }

  const ticketNum = Number(ticket.ticket_number)
  const subjectLine = safeSubjectLine(ticket.subject ?? '', Number.isFinite(ticketNum) ? ticketNum : 0)
  const bodyEscaped = escapeHtml(msg.body ?? '')
  const dashUrlStudent = 'https://quni.com.au/student-dashboard'
  const dashUrlLandlord = 'https://quni.com.au/landlord/dashboard'
  const dashHint =
    st === 'landlord'
      ? `To view your ticket and reply, visit <a href="${dashUrlLandlord}">${dashUrlLandlord}</a>.`
      : `To view your ticket and reply, visit <a href="${dashUrlStudent}">${dashUrlStudent}</a>.`

  const html = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <h2 style="color:#FF6F61; margin-top:0;">Quni Living support reply</h2>
  <p style="white-space: pre-wrap; margin:0; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${bodyEscaped}</p>
  <p style="margin-top:1.25rem; font-size:0.875rem; color:#6b7280;">${dashHint}</p>
  <p style="margin-top:0.75rem; font-size:0.875rem; color:#6b7280;">Ticket reference: #${Number.isFinite(ticketNum) ? ticketNum : '—'}</p>
</div>`.trim()

  const textPlain = `${msg.body ?? ''}\n\n${st === 'landlord' ? dashUrlLandlord : dashUrlStudent}\nTicket reference: #${Number.isFinite(ticketNum) ? ticketNum : '—'}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Quni Living <hello@quni.com.au>',
        reply_to: 'care@quni.com.au',
        to: [submitterEmail],
        subject: subjectLine,
        text: textPlain,
        html,
        tags: [{ name: 'category', value: 'qase-reply' }],
      }),
    })

    if (!res.ok) {
      let detail = res.statusText
      try {
        const j = (await res.json()) as { message?: string }
        detail = typeof j?.message === 'string' ? j.message : JSON.stringify(j)
      } catch {
        try {
          detail = await res.text()
        } catch {
          /* ignore */
        }
      }
      console.error('qase-notify: Resend error', res.status, detail)
      return json({ ok: true, emailed: false, reason: 'resend_failed' }, 200)
    }

    return json({ ok: true, emailed: true }, 200)
  } catch (e) {
    console.error('qase-notify: Resend fetch', e)
    return json({ ok: true, emailed: false, reason: 'resend_exception' }, 200)
  }
})
