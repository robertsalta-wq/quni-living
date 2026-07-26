/**
 * Cloudflare Turnstile server-side validation (Vercel serverless).
 * Production: TURNSTILE_SECRET_KEY. Preview / local: Cloudflare always-pass test secret.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTurnstileSecretKey } from './lib/turnstileEnv.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const secret = getTurnstileSecretKey()
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'Captcha verification is not configured on the server.' })
  }

  let token: string | undefined
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    token = typeof body?.token === 'string' ? body.token : undefined
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' })
  }

  if (!token?.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing captcha token' })
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
    return res.status(400).json({
      ok: false,
      error: 'Captcha verification failed',
      codes: data['error-codes'],
    })
  }

  return res.status(200).json({ ok: true })
}
