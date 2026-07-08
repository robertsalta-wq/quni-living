/**
 * Platform admin: update per-item renter verification state (documents + emails).
 * Uses service role — student_profiles has admin SELECT RLS only, not UPDATE.
 */
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import {
  adminVerificationItemSupportsInReview,
  buildAdminVerificationPatch,
  buildLegalNameLockPatch,
  parseAdminVerificationAction,
  parseAdminVerificationItem,
  parseAdminVerificationLegalNames,
  tierToSync,
} from '../lib/adminStudentVerification.js'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const studentProfileId =
    typeof record?.studentProfileId === 'string' ? record.studentProfileId.trim() : ''
  const item = parseAdminVerificationItem(record?.item)
  const action = parseAdminVerificationAction(record?.action)

  if (!studentProfileId || !item || !action) {
    return json({ error: 'studentProfileId, item, and action are required' }, 400, origin)
  }

  if (action === 'in_review' && !adminVerificationItemSupportsInReview(item)) {
    return json({ error: 'in_review is not supported for this item' }, 400, origin)
  }

  const legalNames = parseAdminVerificationLegalNames(
    item,
    action,
    record?.legalFirstName,
    record?.legalLastName,
  )
  if (!legalNames.ok) {
    return json({ error: legalNames.error }, legalNames.status, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const nowIso = new Date().toISOString()
  const patch = buildAdminVerificationPatch(item, action, nowIso)

  const { data: existing, error: fetchErr } = await admin
    .from('student_profiles')
    .select('*')
    .eq('id', studentProfileId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[api/admin/student-verification] fetch', fetchErr.message)
    return json({ error: 'Could not load profile' }, 500, origin)
  }
  if (!existing) {
    return json({ error: 'Profile not found' }, 404, origin)
  }

  let updatePatch: Record<string, unknown> = { ...patch }

  if (
    item === 'id_document' &&
    action === 'verify' &&
    legalNames.firstName &&
    legalNames.lastName
  ) {
    updatePatch = {
      ...updatePatch,
      ...buildLegalNameLockPatch(
        legalNames.firstName,
        legalNames.lastName,
        nowIso,
        authResult.user.id,
      ),
    }
  }

  if (action === 'verify') {
    const merged = { ...existing, ...updatePatch }
    const nextTier = tierToSync(merged)
    if (nextTier) {
      updatePatch = { ...updatePatch, verification_type: nextTier }
    }
  }

  const { data: updated, error: updateErr } = await admin
    .from('student_profiles')
    .update(updatePatch)
    .eq('id', studentProfileId)
    .select('*')
    .single()

  if (updateErr) {
    console.error('[api/admin/student-verification] update', updateErr.message)
    return json({ error: 'Could not update verification state' }, 500, origin)
  }

  return json({ profile: updated }, 200, origin)
}
