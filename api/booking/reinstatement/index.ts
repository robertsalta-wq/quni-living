// @ts-nocheck - Vercel isolated API TS pass.
/**
 * GET /api/booking/reinstatement?bookingId=
 */
import {
  authenticatePartyRequest,
  corsJson,
  handleOptions,
  reinstatementRouteConfig,
} from '../../lib/booking/reinstatement/http.js'
import { getReinstatementState } from '../../lib/booking/reinstatement/getReinstatement.js'
import { headerString } from '../../lib/nodeHandler.js'

export const config = reinstatementRouteConfig

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'GET') return corsJson(res, { error: 'Method not allowed' }, 405)

  const origin = headerString(req.headers, 'origin') || '*'
  const url = new URL(req.url || '', 'http://localhost')
  const bookingId = (url.searchParams.get('bookingId') || '').trim()
  if (!bookingId) return corsJson(res, { error: 'bookingId is required' }, 400, origin)

  const auth = await authenticatePartyRequest(req, res, bookingId)
  if (!auth) return

  try {
    const state = await getReinstatementState({ admin: auth.admin, party: auth.party })
    return corsJson(res, state, 200, auth.origin)
  } catch (e) {
    console.error('[api/booking/reinstatement GET]', e)
    return corsJson(res, { error: 'Server error' }, 500, auth.origin)
  }
}
