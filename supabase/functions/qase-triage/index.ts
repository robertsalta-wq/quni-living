/**
 * Qase — AI triage after ticket creation (platform or email).
 * Internal only: requires `x-qase-internal` matching `QASE_INTERNAL_SECRET`.
 *
 * Deploy: supabase functions deploy qase-triage --no-verify-jwt
 * Secrets: ANTHROPIC_API_KEY (existing), QASE_INTERNAL_SECRET
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const ALLOWED_CATEGORIES = [
  'booking_issue',
  'payment_payout',
  'verification',
  'property_listing',
  'lease_document',
  'other',
] as const

const ALLOWED_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const

const SYSTEM_PROMPT = `You are a support triage assistant for Quni Living, an Australian student accommodation marketplace. Your job is to analyse support tickets and provide:
1. A category from this list only: booking_issue, payment_payout, verification, property_listing, lease_document, other
2. A priority: urgent, high, normal, or low
3. A draft reply in Quni Living's brand voice — calm, human, outcome-focused, under 150 words

Respond ONLY with valid JSON in this exact format (use double quotes for JSON):
{
  "category": "booking_issue",
  "priority": "normal",
  "draft_reply": "Hi [name], ..."
}`

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function extractAnthropicFullText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const obj = payload as Record<string, unknown>
  const content = obj['content']
  if (!Array.isArray(content)) return ''
  const texts: string[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    const t = b['text']
    if (typeof t === 'string' && t.trim()) texts.push(t)
  }
  return texts.join('')
}

function parseTriageJson(raw: string): { category: string; priority: string; draft_reply: string } | null {
  let s = raw.trim()
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(s)
  if (fence) s = fence[1].trim()
  try {
    const o = JSON.parse(s) as Record<string, unknown>
    const category = typeof o.category === 'string' ? o.category.trim().toLowerCase() : ''
    const priority = typeof o.priority === 'string' ? o.priority.trim().toLowerCase() : ''
    const draft_reply = typeof o.draft_reply === 'string' ? o.draft_reply.trim() : ''
    if (!draft_reply) return null
    return { category, priority, draft_reply }
  } catch {
    return null
  }
}

function normalizeCategory(raw: string): (typeof ALLOWED_CATEGORIES)[number] {
  const t = raw.replace(/\s+/g, '_').toLowerCase()
  if ((ALLOWED_CATEGORIES as readonly string[]).includes(t)) {
    return t as (typeof ALLOWED_CATEGORIES)[number]
  }
  return 'other'
}

function normalizePriority(raw: string): (typeof ALLOWED_PRIORITIES)[number] {
  const t = raw.toLowerCase()
  if ((ALLOWED_PRIORITIES as readonly string[]).includes(t)) {
    return t as (typeof ALLOWED_PRIORITIES)[number]
  }
  return 'normal'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('QASE_INTERNAL_SECRET')?.trim()
  if (!secret) {
    console.error('qase-triage: QASE_INTERNAL_SECRET not configured')
    return json({ error: 'Server misconfigured' }, 500)
  }

  const provided = req.headers.get('x-qase-internal')?.trim()
  if (!provided || provided !== secret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim()

  if (!supabaseUrl || !serviceRole) {
    console.error('qase-triage: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server misconfigured' }, 500)
  }
  if (!anthropicKey) {
    console.error('qase-triage: ANTHROPIC_API_KEY not set')
    return json({ error: 'Server misconfigured' }, 500)
  }

  let body: { ticket_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 500)
  }

  const ticketId = typeof body.ticket_id === 'string' ? body.ticket_id.trim() : ''
  if (!ticketId) {
    return json({ error: 'ticket_id required' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: ticket, error: ticketErr } = await admin.from('qase_tickets').select('*').eq('id', ticketId).maybeSingle()

  if (ticketErr) {
    console.error('qase-triage: ticket fetch', ticketErr)
    return json({ error: ticketErr.message }, 500)
  }
  if (!ticket) {
    console.error('qase-triage: ticket not found', ticketId)
    return json({ error: 'Ticket not found' }, 500)
  }

  const { data: firstMsg, error: msgErr } = await admin
    .from('qase_messages')
    .select('body')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (msgErr) {
    console.error('qase-triage: message fetch', msgErr)
    return json({ error: msgErr.message }, 500)
  }

  const subject = typeof (ticket as Record<string, unknown>).subject === 'string' ? String((ticket as Record<string, unknown>).subject) : ''
  const messageBody = typeof firstMsg?.body === 'string' ? firstMsg.body : ''

  const userMessage = `Subject: ${subject}\nMessage: ${messageBody}`

  let anthropicPayload: unknown
  try {
    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        stream: false,
      }),
    })

    const rawText = await anthropicRes.text()
    if (!anthropicRes.ok) {
      console.error('qase-triage: Anthropic HTTP', anthropicRes.status, rawText.slice(0, 500))
      return json({ error: 'Anthropic request failed' }, 500)
    }
    anthropicPayload = JSON.parse(rawText) as unknown
  } catch (e) {
    console.error('qase-triage: Anthropic error', e)
    return json({ error: 'Anthropic request failed' }, 500)
  }

  const assistantText = extractAnthropicFullText(anthropicPayload)
  const parsed = parseTriageJson(assistantText)
  if (!parsed) {
    console.error('qase-triage: could not parse triage JSON', assistantText.slice(0, 400))
    return json({ error: 'Invalid triage response' }, 500)
  }

  const ai_suggested_category = normalizeCategory(parsed.category)
  const ai_suggested_priority = normalizePriority(parsed.priority)
  const ai_draft_reply = parsed.draft_reply

  const { error: upErr } = await admin
    .from('qase_tickets')
    .update({
      ai_suggested_category,
      ai_suggested_priority,
      ai_draft_reply,
    })
    .eq('id', ticketId)

  if (upErr) {
    console.error('qase-triage: ticket update', upErr)
    return json({ error: upErr.message }, 500)
  }

  return json({ ok: true, ticket_id: ticketId }, 200)
})
