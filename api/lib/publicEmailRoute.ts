/**
 * Shared helpers for public POST + Turnstile + Resend routes (Edge).
 */

export function jsonResponse(body: unknown, status: number, origin: string): Response {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

export function optionsResponse(origin: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isPlausibleEmail(email: string, maxLen = 254): boolean {
  if (email.length > maxLen) return false
  const at = email.indexOf('@')
  if (at < 1 || at === email.length - 1) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function verifyTurnstileToken(
  token: string,
  logLabel: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()
  if (!secret) {
    console.error(`[${logLabel}] Turnstile secret not configured`)
    return { ok: false, message: 'This form is temporarily unavailable. Please try again later.' }
  }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })

  const data = (await verifyRes.json()) as { success?: boolean; 'error-codes'?: string[] }
  if (!data.success) {
    return { ok: false, message: 'Verification failed. Please refresh the challenge and try again.' }
  }
  return { ok: true }
}
