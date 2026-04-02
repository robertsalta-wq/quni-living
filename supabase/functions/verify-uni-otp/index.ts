/**
 * Verify 6-digit OTP and mark university email verified on student_profiles.
 * Deploy: supabase functions deploy verify-uni-otp
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return json({ error: 'Server misconfigured' }, 500)
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

  let body: { otp?: string | number }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  // PostgREST can return numeric-looking text as numbers; JSON may send otp as number — normalize.
  const inputOtp = String(body.otp ?? '')
    .replace(/\D/g, '')
    .slice(0, 6)
  if (inputOtp.length !== 6) {
    return json({ error: 'Enter the 6-digit code from your email.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const nowIso = new Date().toISOString()

  const { data: rows, error: findErr } = await admin
    .from('verification_otps')
    .select('id, otp, expires_at, email')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (findErr) {
    console.error('verification_otps select', findErr)
    return json({ error: 'Verification failed.' }, 500)
  }
  const row = rows?.[0]
  if (!row) {
    return json({ error: 'No code found. Request a new code.' }, 400)
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await admin.from('verification_otps').delete().eq('id', row.id)
    return json({ error: 'That code has expired. Request a new one.' }, 400)
  }
  const storedOtp = String(row.otp ?? '')
    .replace(/\D/g, '')
    .slice(0, 6)
  if (storedOtp.length !== 6 || storedOtp !== inputOtp) {
    return json(
      {
        error:
          'That code does not match. If you used Resend, only the newest email counts. Request a new code and enter it right away.',
      },
      400,
    )
  }

  const { error: upErr } = await admin
    .from('student_profiles')
    .update({
      uni_email: row.email,
      uni_email_verified: true,
      uni_email_verified_at: nowIso,
    })
    .eq('user_id', user.id)

  if (upErr) {
    console.error('student_profiles update', upErr)
    return json({ error: 'Could not save verification.' }, 500)
  }

  await admin.from('verification_otps').delete().eq('id', row.id)

  return json({ ok: true, uni_email: row.email })
})
