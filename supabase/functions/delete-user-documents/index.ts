/**
 * Safety net: after auth.users DELETE, remove student-documents/{user_id}/.
 *
 * Deploy: supabase functions deploy delete-user-documents --no-verify-jwt
 * Secret (required in production): supabase secrets set DELETE_USER_DOCS_WEBHOOK_SECRET=...
 *
 * Dashboard → Database → Webhooks: table auth.users, DELETE only, URL
 *   https://<project-ref>.supabase.co/functions/v1/delete-user-documents
 * HTTP header: x-webhook-secret: <same as DELETE_USER_DOCS_WEBHOOK_SECRET>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { removeAllStudentDocuments } from '../_shared/studentDocumentsCleanup.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type WebhookBody = {
  type?: string
  schema?: string
  table?: string
  old_record?: { id?: string } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('DELETE_USER_DOCS_WEBHOOK_SECRET')?.trim()
  if (!secret) {
    console.error('DELETE_USER_DOCS_WEBHOOK_SECRET is not set')
    return json({ error: 'Server misconfigured' }, 500)
  }

  const hdr = req.headers.get('x-webhook-secret')?.trim()
  if (hdr !== secret) {
    console.error('delete-user-documents: invalid or missing x-webhook-secret')
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ error: 'Server misconfigured' }, 500)
  }

  let body: WebhookBody
  try {
    body = (await req.json()) as WebhookBody
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (body.type !== 'DELETE' || body.schema !== 'auth' || body.table !== 'users') {
    console.warn('delete-user-documents: unexpected payload', body.type, body.schema, body.table)
    return json({ ok: true, skipped: true, reason: 'not_auth_users_delete' })
  }

  const userId = body.old_record?.id
  if (!userId || typeof userId !== 'string') {
    console.warn('delete-user-documents: no old_record.id')
    return json({ ok: true, skipped: true, reason: 'no_user_id' })
  }

  const admin = createClient(supabaseUrl, serviceRole)
  try {
    const removed = await removeAllStudentDocuments(admin, userId)
    console.log(`delete-user-documents: removed ${removed} object(s) for user ${userId}`)
    return json({ ok: true, removed })
  } catch (e) {
    console.error('delete-user-documents: cleanup failed', userId, e)
    return json({ ok: false, error: e instanceof Error ? e.message : 'cleanup failed' }, 500)
  }
})
