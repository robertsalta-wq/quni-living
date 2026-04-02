/**
 * Deletes the authenticated student’s auth user (after storage cleanup).
 *
 * Deploy: supabase functions deploy delete-student-account --no-verify-jwt
 * Auth: Authorization Bearer <user JWT> (enforced via getUser()).
 *
 * supabase/config.toml sets verify_jwt = false so the gateway does not reject
 * valid sessions as "Invalid JWT" (same pattern as send-uni-otp).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { removeAllStudentDocuments } from '../_shared/studentDocumentsCleanup.ts'

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
    console.error('Missing Supabase env')
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

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: studentRow, error: spErr } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (spErr) {
    console.error('student_profiles lookup', spErr)
    return json({ error: 'Could not verify account type.' }, 500)
  }
  if (!studentRow) {
    return json({ error: 'Only student accounts can be deleted here.' }, 403)
  }

  try {
    const removed = await removeAllStudentDocuments(admin, user.id)
    console.log(`delete-student-account: removed ${removed} storage object(s) before delete for ${user.id}`)
  } catch (e) {
    console.error('delete-student-account: storage cleanup failed (continuing with user delete)', user.id, e)
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error('delete-student-account: auth.admin.deleteUser', delErr)
    return json({ error: delErr.message ?? 'Could not delete account.' }, 500)
  }

  console.log(`delete-student-account: deleted user ${user.id}`)
  return json({ ok: true })
})
