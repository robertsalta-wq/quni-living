/**
 * Hourly: settle lease-fee rows stuck pending, retry a failed card once,
 * and open the next quarter for flexible leases and fixed leases past their end date.
 * Secure with Authorization: Bearer CRON_SECRET
 *
 * Node runtime. Vercel ignores a returned Web Response on this runtime and
 * waits until the function times out, so the result is written on `res`.
 */
import { createClient } from '@supabase/supabase-js'
import { headerString } from '../lib/nodeHandler.js'
import {
  chargeDueLeaseQuarters,
  retryDueLeaseCharges,
  settleStuckPendingLeaseCharges,
} from '../lib/billing/listingLeaseCharge.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

/**
 * Vercel Node passes IncomingMessage headers (`authorization` string).
 * A Fetch Request has headers.get. Accept both so the job is not tied to one shape.
 */
function authorizationHeader(request) {
  const headers = request && request.headers
  if (headers && typeof headers.get === 'function') {
    return headers.get('authorization') || ''
  }
  return headerString(headers || {}, 'authorization')
}

function finish(res, status, body, asJson) {
  if (res && typeof res.status === 'function') {
    const ready = res.status(status)
    if (asJson && typeof ready.json === 'function') return ready.json(body)
    if (typeof ready.end === 'function') return ready.end(body)
    return
  }
  if (asJson) return Response.json(body, { status })
  return new Response(body, { status })
}

export default async function handler(request, res) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return finish(res, 405, 'Method not allowed', false)
  }

  const secret = process.env.CRON_SECRET
  const auth = authorizationHeader(request)
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return finish(res, 401, 'Unauthorized', false)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    return finish(res, 500, 'Server misconfigured', false)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const settled = await settleStuckPendingLeaseCharges(admin)
  const retried = await retryDueLeaseCharges(admin)
  const quarters = await chargeDueLeaseQuarters(admin)
  return finish(res, 200, { ok: true, ...settled, ...retried, ...quarters }, true)
}
