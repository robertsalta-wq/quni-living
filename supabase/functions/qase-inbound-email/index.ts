/**
 * Qase — inbound email (Resend webhook → ticket + first message + triage).
 *
 * Edge cases:
 * - This handler sets submitted_by_id to student_profiles.id / landlord_profiles.id (profile PK).
 *   Admin app RLS today keys tickets by auth.uid(); email-created tickets may not match student/landlord
 *   session ownership until aligned.
 * - Webhook retries can create duplicate tickets (no idempotency on email_id).
 * - Svix `Webhook` import: `svix@1.15.0/dist/webhook.js` 404s on esm.sh; use `svix@1.15.0?target=deno` (same Webhook API).
 *
 * Deploy: supabase functions deploy qase-inbound-email --no-verify-jwt
 * Secrets: RESEND_WEBHOOK_SECRET, RESEND_API_KEY, QASE_INTERNAL_SECRET
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Webhook } from 'https://esm.sh/svix@1.15.0?target=deno'

const TRIAGE_FN_PATH = '/functions/v1/qase-triage'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Escape `%`, `_`, `\` so ILIKE treats the address as a literal match. */
function escapeForIlikeExact(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function extractEmailAddress(fromHeader: string): string {
  const t = fromHeader.trim()
  const m = /<([^>]+@[^>]+)>/.exec(t)
  if (m?.[1]) return m[1].trim().toLowerCase()
  const at = t.indexOf('@')
  if (at > 0 && !t.includes(' ')) return t.toLowerCase()
  return t.toLowerCase()
}

function firstRecipientToLower(to: unknown): string {
  if (Array.isArray(to) && to.length > 0) return String(to[0]).trim().toLowerCase()
  if (typeof to === 'string') return to.trim().toLowerCase()
  return ''
}

function receivedViaFromAddress(toAddressLower: string): 'care@' | 'support@' | 'help@' {
  if (toAddressLower.includes('care')) return 'care@'
  if (toAddressLower.includes('support')) return 'support@'
  if (toAddressLower.includes('help')) return 'help@'
  return 'care@'
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max)
}

type Submitter = {
  submitted_by_type: 'student' | 'landlord' | 'anonymous'
  submitted_by_id: string | null
}

async function resolveSubmitter(admin: ReturnType<typeof createClient>, fromAddress: string): Promise<Submitter> {
  const email = extractEmailAddress(fromAddress)
  if (!email || !email.includes('@')) {
    return { submitted_by_type: 'anonymous', submitted_by_id: null }
  }

  const pattern = escapeForIlikeExact(email)

  const { data: student, error: sErr } = await admin
    .from('student_profiles')
    .select('id')
    .ilike('email', pattern)
    .limit(1)
    .maybeSingle()

  if (!sErr && student && typeof (student as { id?: string }).id === 'string') {
    return { submitted_by_type: 'student', submitted_by_id: (student as { id: string }).id }
  }

  const { data: landlord, error: lErr } = await admin
    .from('landlord_profiles')
    .select('id')
    .ilike('email', pattern)
    .limit(1)
    .maybeSingle()

  if (!lErr && landlord && typeof (landlord as { id?: string }).id === 'string') {
    return { submitted_by_type: 'landlord', submitted_by_id: (landlord as { id: string }).id }
  }

  return { submitted_by_type: 'anonymous', submitted_by_id: null }
}

function triggerTriage(triageUrl: string, internalSecret: string, ticketId: string): void {
  void fetch(triageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-qase-internal': internalSecret,
    },
    body: JSON.stringify({ ticket_id: ticketId }),
  }).catch((e) => console.error('qase-inbound-email: triage invoke failed', e))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')?.trim()
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim()
  const internalSecret = Deno.env.get('QASE_INTERNAL_SECRET')?.trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()

  if (!webhookSecret || !resendKey || !internalSecret || !supabaseUrl || !serviceRole) {
    console.error('qase-inbound-email: missing env (RESEND_WEBHOOK_SECRET, RESEND_API_KEY, QASE_INTERNAL_SECRET, SUPABASE_*)')
    return json({ error: 'Server misconfigured' }, 500)
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return json({ error: 'Missing Svix headers' }, 400)
  }

  const rawBody = await req.text()

  let event: Record<string, unknown>
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as Record<string, unknown>
  } catch (e) {
    console.error('qase-inbound-email: Svix verify failed', e)
    return json({ error: 'Invalid signature' }, 401)
  }

  const eventType = typeof event.type === 'string' ? event.type : ''
  if (eventType !== 'email.received') {
    return json({ ok: true, skipped: true, event_type: eventType || null }, 200)
  }

  const data = event.data
  if (!data || typeof data !== 'object') {
    return json({ error: 'Invalid payload: missing data' }, 500)
  }

  const d = data as Record<string, unknown>
  const emailId = typeof d.email_id === 'string' ? d.email_id.trim() : ''
  const toRaw = d.to

  if (!emailId) {
    return json({ error: 'Invalid payload: missing email_id' }, 500)
  }

  const receivingRes = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${resendKey}` },
  })

  const receivingText = await receivingRes.text()
  if (!receivingRes.ok) {
    console.error('qase-inbound-email: Resend receiving API', receivingRes.status, receivingText.slice(0, 400))
    return json({ error: 'Failed to fetch email content' }, 500)
  }

  let receiving: Record<string, unknown>
  try {
    receiving = JSON.parse(receivingText) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON from Resend receiving API' }, 500)
  }

  const fromHeader = typeof receiving.from === 'string' ? receiving.from : typeof d.from === 'string' ? d.from : ''
  const subjectRaw = typeof receiving.subject === 'string' ? receiving.subject : typeof d.subject === 'string' ? d.subject : ''
  const textRaw = typeof receiving.text === 'string' && receiving.text.trim() ? receiving.text : ''
  const htmlRaw = typeof receiving.html === 'string' && receiving.html.trim() ? receiving.html : ''
  const bodyText = textRaw.trim() ? textRaw : htmlRaw ? htmlToPlainText(htmlRaw) : ''

  const toAddressLower = firstRecipientToLower(receiving.to ?? toRaw)
  const received_via = receivedViaFromAddress(toAddressLower)

  const admin = createClient(supabaseUrl, serviceRole)
  const submitter = await resolveSubmitter(admin, fromHeader)

  const subject = truncate(subjectRaw.trim() || '(no subject)', 255)
  const body = truncate(bodyText, 10_000)

  const ticketInsert = {
    subject,
    submitted_by_type: submitter.submitted_by_type,
    submitted_by_id: submitter.submitted_by_id,
    received_via,
    status: 'new',
    priority: 'normal',
    booking_id: null,
    property_id: null,
  }

  const { data: ticketRow, error: ticketErr } = await admin
    .from('qase_tickets' as 'bookings')
    .insert(ticketInsert as never)
    .select('id')
    .single()

  if (ticketErr || !ticketRow || typeof (ticketRow as { id?: string }).id !== 'string') {
    console.error('qase-inbound-email: ticket insert', ticketErr)
    return json({ error: ticketErr?.message ?? 'Ticket insert failed' }, 500)
  }

  const ticketId = (ticketRow as { id: string }).id

  const msgInsert = {
    ticket_id: ticketId,
    author_id: submitter.submitted_by_id,
    author_type: submitter.submitted_by_type,
    body,
    is_internal_note: false,
  }

  const { error: msgErr } = await admin.from('qase_messages' as 'bookings').insert(msgInsert as never)
  if (msgErr) {
    console.error('qase-inbound-email: message insert', msgErr)
    return json({ error: msgErr.message }, 500)
  }

  const triageUrl = `${supabaseUrl.replace(/\/$/, '')}${TRIAGE_FN_PATH}`
  triggerTriage(triageUrl, internalSecret, ticketId)

  return json({ ok: true, ticket_id: ticketId }, 200)
})
