// @ts-nocheck
/**
 * Signed download URL for an existing bond receipt (private bucket).
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer <Supabase access_token> — must be landlord or student on the booking.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parseBearer(request: Request): string {
  const h = request.headers.get('Authorization')?.trim() ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return (m?.[1] ?? '').trim()
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const bearer = parseBearer(request)
  if (!bearer) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const authClient = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser(bearer)
  if (userErr || !user?.id) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: { booking_id?: string }
  try {
    body = (await request.json()) as { booking_id?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return json({ error: 'booking_id is required' }, 400)
  }

  const admin = createClient<Database>(supabaseUrl, serviceRole)

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return json({ error: 'Booking not found' }, 404)
  }

  const { data: lp } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const { data: sp } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const isLandlord = lp?.id && booking.landlord_id === lp.id
  const isStudent = sp?.id && booking.student_id === sp.id
  if (!isLandlord && !isStudent) {
    return json({ error: 'Forbidden' }, 403)
  }

  const { data: tenancy, error: tErr } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()

  if (tErr || !tenancy) {
    return json({ error: 'Tenancy not found for this booking' }, 404)
  }

  const { data: doc, error: dErr } = await admin
    .from('tenancy_documents')
    .select('id, file_path')
    .eq('tenancy_id', tenancy.id)
    .eq('document_type', 'bond_receipt')
    .maybeSingle()

  if (dErr || !doc?.file_path) {
    return json({ error: 'Bond receipt not available yet' }, 404)
  }

  const { data: signed, error: sErr } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(doc.file_path, 3600)

  if (sErr || !signed?.signedUrl) {
    console.error('[bond-receipt-signed-url]', sErr)
    return json({ error: 'Could not create download link' }, 500)
  }

  return json({
    ok: true,
    signed_url: signed.signedUrl,
    expires_in: 3600,
  })
}
