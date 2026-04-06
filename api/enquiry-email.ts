/**
 * Property listing enquiry — POST JSON:
 * { propertyTitle, senderName, senderEmail, message, turnstileToken }
 * Sends two Resend messages: confirmation to the sender, notify to hello@quni.com.au.
 */
import { sendEmail } from './lib/sendEmail.js'
import { escapeHtml, isPlausibleEmail, jsonResponse, optionsResponse, verifyTurnstileToken } from './lib/publicEmailRoute.js'

export const config = {
  runtime: 'edge',
}

const NOTIFY_TO = 'hello@quni.com.au'

const LIMITS = {
  propertyTitle: 500,
  senderName: 200,
  senderEmail: 254,
  message: 10000,
} as const

type EnquiryBody = {
  propertyTitle?: unknown
  senderName?: unknown
  senderEmail?: unknown
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

  let body: EnquiryBody
  try {
    body = (await request.json()) as EnquiryBody
  } catch {
    return jsonResponse({ error: 'Invalid request. Please try again.' }, 400, origin)
  }

  const propertyTitle = typeof body.propertyTitle === 'string' ? body.propertyTitle.trim() : ''
  const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : ''
  const senderEmail = typeof body.senderEmail === 'string' ? body.senderEmail.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : ''

  if (!propertyTitle || !senderName || !senderEmail || !message) {
    return jsonResponse({ error: 'Please fill in all required fields.' }, 400, origin)
  }

  if (
    propertyTitle.length > LIMITS.propertyTitle ||
    senderName.length > LIMITS.senderName ||
    message.length > LIMITS.message
  ) {
    return jsonResponse({ error: 'Some fields are too long. Please shorten and try again.' }, 400, origin)
  }

  if (!isPlausibleEmail(senderEmail, LIMITS.senderEmail)) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400, origin)
  }

  if (!turnstileToken) {
    return jsonResponse({ error: 'Please complete the verification step.' }, 400, origin)
  }

  const captcha = await verifyTurnstileToken(turnstileToken, 'api/enquiry-email')
  if (captcha.ok === false) {
    const status = captcha.message.includes('temporarily unavailable') ? 503 : 400
    return jsonResponse({ error: captcha.message }, status, origin)
  }

  const confirmHtml = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <p>Hi ${escapeHtml(senderName)},</p>
  <p>Thanks for your enquiry about <strong>${escapeHtml(propertyTitle)}</strong>. We&apos;ve received your message and will get back to you soon.</p>
  <p><strong>Your message</strong></p>
  <p style="white-space: pre-wrap; margin:0; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${escapeHtml(
    message,
  )}</p>
  <p style="margin-top:1.5rem; font-size:0.875rem; color:#6b7280;">— Quni Living</p>
</div>`.trim()

  const notifyHtml = `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <h2 style="color:#FF6F61; margin-top:0;">New property enquiry</h2>
  <p><strong>Property</strong><br>${escapeHtml(propertyTitle)}</p>
  <p><strong>Name</strong><br>${escapeHtml(senderName)}</p>
  <p><strong>Email</strong><br><a href="mailto:${encodeURIComponent(senderEmail)}">${escapeHtml(senderEmail)}</a></p>
  <p><strong>Message</strong></p>
  <p style="white-space: pre-wrap; margin:0; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">${escapeHtml(
    message,
  )}</p>
</div>`.trim()

  try {
    await Promise.all([
      sendEmail({
        to: senderEmail,
        subject: `We received your enquiry — ${propertyTitle}`,
        html: confirmHtml,
        replyTo: senderEmail,
      }),
      sendEmail({
        to: NOTIFY_TO,
        subject: `New listing enquiry: ${propertyTitle}`,
        html: notifyHtml,
        replyTo: senderEmail,
      }),
    ])
  } catch (e) {
    console.error('[api/enquiry-email] Resend failed', e)
    return jsonResponse({ error: 'We could not send the emails. Please try again in a few minutes.' }, 502, origin)
  }

  return jsonResponse({ ok: true }, 200, origin)
}
