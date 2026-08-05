/**
 * Hourly: finalize Listing mutual-surrender bookings past termination_effective_date
 * when both parties have acknowledged.
 * Secure with Authorization: Bearer CRON_SECRET
 *
 * Edge runtime — same Fetch Request/Response shape as other crons (expire-bookings).
 */
import { createClient } from '@supabase/supabase-js'
import { runFinalizeDueTerminations } from '../lib/booking/termination/finalizeTerminatedBooking.js'

export const config = { runtime: 'edge', maxDuration: 60 }

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const result = await runFinalizeDueTerminations(admin)
  return Response.json({ ok: true, ...result })
}
