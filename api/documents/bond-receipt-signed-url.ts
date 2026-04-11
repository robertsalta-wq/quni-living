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
import { headerString, readJsonBody } from '../lib/nodeHandler.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

function parseBearerFromHeader(authHeader: string): string {
  const h = authHeader.trim()
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return (m?.[1] ?? '').trim()
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const bearer = parseBearerFromHeader(headerString(req.headers, 'authorization'))
  if (!bearer) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const authClient = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser(bearer)
  if (userErr || !user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let body: { booking_id?: string }
  try {
    body = (await readJsonBody(req)) as { booking_id?: string }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const admin = createClient<Database>(supabaseUrl, serviceRole)

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const { data: lp } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const { data: sp } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const isLandlord = lp?.id && booking.landlord_id === lp.id
  const isStudent = sp?.id && booking.student_id === sp.id
  if (!isLandlord && !isStudent) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { data: tenancy, error: tErr } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()

  if (tErr || !tenancy) {
    return res.status(404).json({ error: 'Tenancy not found for this booking' })
  }

  const { data: doc, error: dErr } = await admin
    .from('tenancy_documents')
    .select('id, file_path')
    .eq('tenancy_id', tenancy.id)
    .eq('document_type', 'bond_receipt')
    .maybeSingle()

  if (dErr || !doc?.file_path) {
    return res.status(404).json({ error: 'Bond receipt not available yet' })
  }

  const { data: signed, error: sErr } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(doc.file_path, 604800)

  if (sErr || !signed?.signedUrl) {
    console.error('[bond-receipt-signed-url]', sErr)
    return res.status(500).json({ error: 'Could not create download link' })
  }

  return res.status(200).json({
    ok: true,
    signed_url: signed.signedUrl,
    expires_in: 604800,
  })
}
