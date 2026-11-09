/**
 * Visitor report when a Turnstile widget hits a configuration error (hostname, site key).
 * Emails hello@quni.com.au at most once per error code per day.
 * Bot-challenge codes such as 600010 are ignored.
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import { escapeHtml, jsonResponse, optionsResponse } from './lib/publicEmailRoute.js'
import { isTurnstileConfigError, turnstileAlertDue, turnstileReportPage } from '../src/lib/turnstileHealth.js'

export const config = {
  runtime: 'edge',
}

const NOTIFY_TO = 'hello@quni.com.au'
const SERVICE = 'turnstile'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return optionsResponse(origin)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  let body: { code?: unknown; page?: unknown }
  try {
    body = (await request.json()) as { code?: unknown; page?: unknown }
  } catch {
    return jsonResponse({ ok: false }, 400, origin)
  }

  if (!isTurnstileConfigError(body.code)) {
    return jsonResponse({ ok: true, ignored: true }, 200, origin)
  }

  const code = body.code.trim()
  const page = turnstileReportPage(body.page)
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({ ok: false }, 500, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: existing, error: readErr } = await admin
    .from('operational_status')
    .select('status, message, checked_at')
    .eq('service_name', SERVICE)
    .maybeSingle()

  if (readErr) {
    console.error('[turnstile-health] read', readErr.message)
    return jsonResponse({ ok: false }, 500, origin)
  }

  const now = new Date()
  if (!turnstileAlertDue(existing, code, now.getTime())) {
    return jsonResponse({ ok: true, emailed: false }, 200, origin)
  }

  const html = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <h2 style="color:#FF6F61; margin-top:0;">Turnstile widget failed on quni.com.au</h2>
  <p>A visitor's captcha reported Cloudflare error <strong>${escapeHtml(code)}</strong> on <strong>${escapeHtml(page)}</strong>.</p>
  <p>This is a configuration failure (for example the hostname is not allowed on the widget). Contact, university partnership, landlord lead, and Ask AI cannot be submitted while it lasts.</p>
  <p>Check the Turnstile widget hostnames for site key <code>0x4AAAAAACuNI-Q9BMtJbQzc</code>. quni.com.au and www.quni.com.au both need to be saved.</p>
</div>`.trim()

  try {
    await sendEmail({
      to: NOTIFY_TO,
      subject: `Turnstile widget failed on quni.com.au (${code})`,
      html,
    })
  } catch (e) {
    console.error('[turnstile-health] email failed', e)
    return jsonResponse({ ok: false }, 502, origin)
  }

  const { error: upErr } = await admin.from('operational_status').upsert(
    {
      service_name: SERVICE,
      status: 'down',
      message: code,
      checked_at: now.toISOString(),
    },
    { onConflict: 'service_name' },
  )
  if (upErr) {
    console.error('[turnstile-health] upsert', upErr.message)
  }

  return jsonResponse({ ok: true, emailed: true }, 200, origin)
}
