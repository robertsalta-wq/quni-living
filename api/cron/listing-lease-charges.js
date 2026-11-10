/**
 * Hourly: settle lease-fee rows stuck pending, retry a failed card once,
 * and open the next quarter for flexible leases and fixed leases past their end date.
 * Secure with Authorization: Bearer CRON_SECRET
 */
import { createClient } from '@supabase/supabase-js'
import {
  chargeDueLeaseQuarters,
  retryDueLeaseCharges,
  settleStuckPendingLeaseCharges,
} from '../lib/billing/listingLeaseCharge.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

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
  const settled = await settleStuckPendingLeaseCharges(admin)
  const retried = await retryDueLeaseCharges(admin)
  const quarters = await chargeDueLeaseQuarters(admin)
  return Response.json({ ok: true, ...settled, ...retried, ...quarters })
}
