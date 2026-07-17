// @ts-nocheck - Vercel isolated API TS pass.
import {
  authenticatePartyRequest,
  corsJson,
  handleOptions,
  readJson,
  reinstatementRouteConfig,
} from '../../lib/booking/reinstatement/http.js'
import { requestReinstatement } from '../../lib/booking/reinstatement/requestReinstatement.js'

export const config = reinstatementRouteConfig

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return handleOptions(req, res)
  if (req.method !== 'POST') return corsJson(res, { error: 'Method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await readJson(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) return corsJson(res, { error: 'bookingId is required' }, 400)

  const auth = await authenticatePartyRequest(req, res, bookingId)
  if (!auth) return

  try {
    const result = await requestReinstatement({
      admin: auth.admin,
      party: auth.party,
      feeAction: body.feeAction,
    })
    if (!result.ok) {
      return corsJson(
        res,
        { error: result.error, code: result.code },
        result.status,
        auth.origin,
      )
    }
    return corsJson(
      res,
      {
        ok: true,
        request: result.request,
        otherPartyRole: result.otherPartyRole,
      },
      200,
      auth.origin,
    )
  } catch (e) {
    console.error('[api/booking/reinstatement/request]', e)
    return corsJson(res, { error: 'Server error' }, 500, auth.origin)
  }
}
