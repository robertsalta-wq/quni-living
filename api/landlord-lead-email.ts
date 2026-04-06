/**
 * Landlord partnerships lead — POST JSON:
 * { name, email, phone, suburb, propertyCount, message?, turnstileToken }
 * Notifies hello@quni.com.au via Resend with Reply-To set to the lead's email.
 */
import { sendEmail } from './lib/sendEmail.js'
import { escapeHtml, isPlausibleEmail, jsonResponse, optionsResponse, verifyTurnstileToken } from './lib/publicEmailRoute.js'

export const config = {
  runtime: 'edge',
}

const NOTIFY_TO = 'hello@quni.com.au'

const ALLOWED_PROPERTY_COUNTS = new Set(['1', '2-3', '4-10', '10+'])

const LIMITS = {
  name: 200,
  email: 254,
  phone: 80,
  suburb: 200,
  propertyCount: 20,
  message: 5000,
} as const

type LeadBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  suburb?: unknown
  propertyCount?: unknown
  message?: unknown
  turnstileToken?: unknown
}

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return optionsResponse(origin)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  let body: LeadBody
  try {
    body = (await request.json()) as LeadBody
  } catch {
    return jsonResponse({ error: 'Invalid request. Please try again.' }, 400, origin)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const suburb = typeof body.suburb === 'string' ? body.suburb.trim() : ''
  const propertyCount = typeof body.propertyCount === 'string' ? body.propertyCount.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : ''

  if (!name || !email || !phone || !suburb || !propertyCount) {
    return jsonResponse({ error: 'Please fill in all required fields.' }, 400, origin)
  }

  if (
    name.length > LIMITS.name ||
    phone.length > LIMITS.phone ||
    suburb.length > LIMITS.suburb ||
    propertyCount.length > LIMITS.propertyCount ||
    message.length > LIMITS.message
  ) {
    return jsonResponse({ error: 'Some fields are too long. Please shorten and try again.' }, 400, origin)
  }

  if (!ALLOWED_PROPERTY_COUNTS.has(propertyCount)) {
    return jsonResponse({ error: 'Invalid selection. Please try again.' }, 400, origin)
  }

  if (!isPlausibleEmail(email, LIMITS.email)) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400, origin)
  }

  if (!turnstileToken) {
    return jsonResponse({ error: 'Please complete the verification step.' }, 400, origin)
  }

  const captcha = await verifyTurnstileToken(turnstileToken, 'api/landlord-lead-email')
  if (captcha.ok === false) {
    const status = captcha.message.includes('temporarily unavailable') ? 503 : 400
    return jsonResponse({ error: captcha.message }, status, origin)
  }

  const summaryLines = [
    'Landlord lead (partnerships page)',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Suburb: ${suburb}`,
    `Properties: ${propertyCount}`,
    message ? `Message: ${message}` : '',
  ].filter(Boolean)

  const html = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <h2 style="color:#FF6F61; margin-top:0;">Landlord partnership lead</h2>
  <p><strong>Name</strong><br>${escapeHtml(name)}</p>
  <p><strong>Email</strong><br><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></p>
  <p><strong>Phone</strong><br>${escapeHtml(phone)}</p>
  <p><strong>Suburb</strong><br>${escapeHtml(suburb)}</p>
  <p><strong>Number of properties</strong><br>${escapeHtml(propertyCount)}</p>
  ${
    message
      ? `<p><strong>Message</strong></p><p style="white-space: pre-wrap; margin:0; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${escapeHtml(
          message,
        )}</p>`
      : ''
  }
  <p style="margin-top:1.25rem; padding-top:1rem; border-top:1px solid #e5e7eb; font-size:0.8125rem; color:#6b7280; white-space:pre-wrap;">${escapeHtml(
    summaryLines.join('\n'),
  )}</p>
</div>`.trim()

  try {
    await sendEmail({
      to: NOTIFY_TO,
      subject: `Landlord partnership lead: ${name}`,
      html,
      replyTo: email,
    })
  } catch (e) {
    console.error('[api/landlord-lead-email] Resend failed', e)
    return jsonResponse({ error: 'We could not send your message. Please try again in a few minutes.' }, 502, origin)
  }

  return jsonResponse({ ok: true }, 200, origin)
}
