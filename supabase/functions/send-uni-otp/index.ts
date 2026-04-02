/**
 * Send 6-digit OTP to a university email (Resend).
 * Deploy: supabase functions deploy send-uni-otp
 * Secrets: supabase secrets set RESEND_API_KEY=re_...
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAllowedUniEmailDomain, parseEmailDomain } from './allowedDomains.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !anonKey || !serviceRole) {
    console.error('Missing Supabase env')
    return json({ error: 'Server misconfigured' }, 500)
  }
  if (!resendKey?.trim()) {
    console.error('Missing RESEND_API_KEY')
    return json({ error: 'Email is not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    const msg =
      userErr?.message?.includes('Invalid JWT') || userErr?.message?.includes('invalid JWT')
        ? 'Your session could not be verified. Sign out, sign in again, then retry.'
        : (userErr?.message ?? 'Please sign in again.')
    return json({ error: msg }, 401)
  }

  let body: { uni_email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const uniEmail = (body.uni_email ?? '').trim().toLowerCase()
  if (!uniEmail || !uniEmail.includes('@')) {
    return json({ error: 'Enter a valid email address.' }, 400)
  }

  const domain = parseEmailDomain(uniEmail)
  if (!domain || !isAllowedUniEmailDomain(domain)) {
    return json(
      {
        error:
          'Use an email address from your Australian university (e.g. yourname@student.unsw.edu.au).',
      },
      400,
    )
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const otp = randomOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Single row per user (requires unique index on user_id — see student_verification.sql).
  const { error: upsertErr } = await admin.from('verification_otps').upsert(
    {
      user_id: user.id,
      email: uniEmail,
      otp,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id' },
  )
  if (upsertErr) {
    console.error('verification_otps upsert', upsertErr)
    const msg = upsertErr.message ?? ''
    const missing = /does not exist/i.test(msg) || upsertErr.code === '42P01'
    const needsUniqueIndex =
      /no unique|on conflict|conflict specification/i.test(msg) ||
      upsertErr.code === '23505' ||
      /duplicate key.*verification_otps/i.test(msg)
    return json(
      {
        error: missing
          ? 'Verification is not set up yet. Run supabase/student_verification.sql in the Supabase SQL Editor (creates verification_otps).'
          : needsUniqueIndex
            ? 'Run supabase/verification_otps_one_per_user.sql in the Supabase SQL Editor (one active code per account), then try again.'
            : 'Could not create verification code. Try again later.',
      },
      500,
    )
  }

  // Same transactional From as api/lib/sendEmail.js (booking emails). Improves deliverability vs a shared inbox address.
  const textBody = `Your Quni verification code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`
  const htmlBody = `<p>Your Quni verification code is <strong style="font-size:1.25rem;letter-spacing:0.08em">${otp}</strong></p><p>This code expires in 10 minutes. If you didn’t request this, you can ignore this email.</p>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Quni Living <noreply@quni.com.au>',
      reply_to: 'hello@quni.com.au',
      to: [uniEmail],
      subject: 'Your Quni verification code',
      text: textBody,
      html: htmlBody,
      tags: [{ name: 'category', value: 'verification' }],
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
    console.error('Resend error', detail)
    await admin.from('verification_otps').delete().eq('user_id', user.id)
    const safe =
      typeof detail === 'string' && detail.trim().length > 0 && detail.length < 400
        ? detail
        : 'Could not send email. Check Resend API key and that quni.com.au (noreply@) is verified in Resend.'
    return json({ error: safe }, 502)
  }

  return json({ ok: true })
})
