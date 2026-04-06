/**
 * Resend — shared by booking-related API routes (Edge).
 * Env: RESEND_API_KEY (Vercel)
 * @param {object} args
 * @param {string|string[]} args.to
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.replyTo] — shown as Reply-To on the outbound message
 */
export async function sendEmail({ to, subject, html, replyTo }) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) {
    console.error('Resend: missing RESEND_API_KEY')
    throw new Error('Email is not configured')
  }

  const toList = Array.isArray(to) ? to : [to]

  const payload = {
    from: 'Quni Living <noreply@quni.com.au>',
    to: toList,
    subject,
    html,
  }
  const rt = typeof replyTo === 'string' ? replyTo.trim() : ''
  if (rt) {
    payload.reply_to = rt
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let error = { message: response.statusText }
    try {
      error = await response.json()
    } catch {
      try {
        const t = await response.text()
        error = { message: t || response.statusText }
      } catch {
        /* ignore */
      }
    }
    console.error('Resend error:', error)
    const msg = error?.message || error?.error?.message || JSON.stringify(error)
    throw new Error(`Failed to send email: ${msg}`)
  }

  return response.json()
}
