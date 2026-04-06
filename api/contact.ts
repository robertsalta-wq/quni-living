/**
 * Public contact form — POST JSON:
 * { name, email, subject, message, turnstileToken }
 * Sends via Resend to hello@quni.com.au with Reply-To set to the sender.
 */
import { sendEmail } from './lib/sendEmail.js'
import { escapeHtml, isPlausibleEmail, jsonResponse, optionsResponse, verifyTurnstileToken } from './lib/publicEmailRoute.js'

export const config = {
  runtime: 'edge',
}

const CONTACT_TO = 'hello@quni.com.au'

const LIMITS = {
  name: 200,
  email: 254,
  subject: 200,
  message: 10000,
} as const

type ContactBody = {
  name?: unknown
  email?: unknown
  subject?: unknown
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

  let body: ContactBody
  try {
    body = (await request.json()) as ContactBody
  } catch {
    return jsonResponse({ error: 'Invalid request. Please try again.' }, 400, origin)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : ''

  if (!name || !email || !message) {
    return jsonResponse({ error: 'Please fill in your name, email, and message.' }, 400, origin)
  }

  if (name.length > LIMITS.name || subject.length > LIMITS.subject || message.length > LIMITS.message) {
    return jsonResponse({ error: 'Some fields are too long. Please shorten and try again.' }, 400, origin)
  }

  if (!isPlausibleEmail(email, LIMITS.email)) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400, origin)
  }

  if (!turnstileToken) {
    return jsonResponse({ error: 'Please complete the verification step.' }, 400, origin)
  }

  const captcha = await verifyTurnstileToken(turnstileToken, 'api/contact')
  if (captcha.ok === false) {
    const status = captcha.message.includes('temporarily unavailable') ? 503 : 400
    return jsonResponse({ error: captcha.message }, status, origin)
  }

  const subjectLine = subject ? `Contact: ${subject}` : 'Contact form message'
  const html = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <h2 style="color:#FF6F61; margin-top:0;">New message from quni.com.au contact form</h2>
  <p><strong>Name</strong><br>${escapeHtml(name)}</p>
  <p><strong>Email</strong><br><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></p>
  <p><strong>Subject</strong><br>${escapeHtml(subject || '—')}</p>
  <p><strong>Message</strong></p>
  <p style="white-space: pre-wrap; margin:0; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${escapeHtml(
    message,
  )}</p>
</div>`.trim()

  try {
    await sendEmail({
      to: CONTACT_TO,
      subject: subjectLine,
      html,
      replyTo: email,
    })
  } catch (e) {
    console.error('[api/contact] Resend failed', e)
    return jsonResponse({ error: 'We could not send your message. Please try again in a few minutes.' }, 502, origin)
  }

  return jsonResponse({ ok: true }, 200, origin)
}
