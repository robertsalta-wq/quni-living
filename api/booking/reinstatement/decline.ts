// @ts-nocheck - Vercel isolated API TS pass.
import { createClient } from '@supabase/supabase-js'
import { headerString } from '../../lib/nodeHandler.js'
import { assertPartyOfBooking } from '../../lib/booking/reinstatement/assertPartyOfBooking.js'
import { declineReinstatement } from '../../lib/booking/reinstatement/declineCancel.js'
import { loadReinstatementRequestById } from '../../lib/booking/reinstatement/requestRows.js'
import {
  corsJson,
  handleOptions,
  readJson,
  reinstatementRouteConfig,
} from '../../lib/booking/reinstatement/http.js'

export const config = reinstatementRouteConfig

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'POST') return corsJson(res, { error: 'Method not allowed' }, 405)

  const origin = headerString(req.headers, 'origin') || '*'
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return corsJson(res, { error: 'Missing authorization' }, 401, origin)

  let body: Record<string, unknown>
  try {
    body = await readJson(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : ''
  if (!requestId) return corsJson(res, { error: 'requestId is required' }, 400, origin)

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) return corsJson(res, { error: 'Invalid or expired session' }, 401, origin)

    const admin = createClient(supabaseUrl, serviceRole)
    const row = await loadReinstatementRequestById(admin, requestId)
    if (!row) return corsJson(res, { error: 'Reinstatement request not found' }, 404, origin)

    const partyResult = await assertPartyOfBooking(admin, user.id, row.booking_id)
    if (!partyResult.ok) {
      return corsJson(res, { error: partyResult.error }, partyResult.status, origin)
    }

    const result = await declineReinstatement({
      admin,
      party: partyResult.party,
      requestId,
    })
    if (!result.ok) {
      return corsJson(
        res,
        { error: result.error, code: result.code, request: result.request },
        result.status,
        origin,
      )
    }
    return corsJson(res, { ok: true, request: result.request }, 200, origin)
  } catch (e) {
    console.error('[api/booking/reinstatement/decline]', e)
    return corsJson(res, { error: 'Server error' }, 500, origin)
  }
}
