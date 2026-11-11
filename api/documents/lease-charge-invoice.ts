// @ts-nocheck
/**
 * Signed download URL for a landlord lease-fee tax invoice.
 * POST JSON: { booking_id, charge_id }
 */
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'

export const config = { runtime: 'nodejs', maxDuration: 20 }

function corsJson(res, body, status = 200, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return corsJson(res, { error: 'Method not allowed' }, 405, origin)

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  const chargeId = typeof body.charge_id === 'string' ? body.charge_id.trim() : ''
  if (!bookingId || !chargeId) return corsJson(res, { error: 'booking_id and charge_id are required' }, 400, origin)

  const token = headerString(req.headers, 'authorization').replace(/^Bearer\s+/i, '').trim()
  if (!token) return corsJson(res, { error: 'Missing authorization' }, 401, origin)

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser(token)
  if (!user || user.user_metadata?.role !== 'landlord') {
    return corsJson(res, { error: 'Only the landlord can download this invoice' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: landlord } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!landlord) return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)

  const { data: charge } = await admin
    .from('listing_lease_charges')
    .select('id, invoice_storage_path, landlord_id, booking_id')
    .eq('id', chargeId)
    .eq('booking_id', bookingId)
    .maybeSingle()
  if (!charge || charge.landlord_id !== landlord.id || !charge.invoice_storage_path) {
    return corsJson(res, { error: 'Invoice not found' }, 404, origin)
  }

  const { data: signed, error } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(charge.invoice_storage_path, 60 * 10)
  if (error || !signed?.signedUrl) return corsJson(res, { error: 'Could not open the invoice' }, 500, origin)
  return corsJson(res, { url: signed.signedUrl }, 200, origin)
}
