import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from '../../nodeHandler.js'
import { assertPartyOfBooking } from './assertPartyOfBooking.js'

export const reinstatementRouteConfig = {
  runtime: 'nodejs' as const,
  maxDuration: 60,
}

export function corsJson(res: any, body: unknown, status = 200, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

export function handleOptions(req: any, res: any) {
  const origin = headerString(req.headers, 'origin') || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
  return res.status(204).end()
}

export async function authenticatePartyRequest(req: any, res: any, bookingId: string) {
  const origin = headerString(req.headers, 'origin') || '*'

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    corsJson(res, { error: 'Server misconfigured' }, 500, origin)
    return null
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    corsJson(res, { error: 'Missing authorization' }, 401, origin)
    return null
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    corsJson(res, { error: 'Invalid or expired session' }, 401, origin)
    return null
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const partyResult = await assertPartyOfBooking(admin, user.id, bookingId)
  if (!partyResult.ok) {
    corsJson(res, { error: partyResult.error }, partyResult.status, origin)
    return null
  }

  return { admin, party: partyResult.party, origin, user }
}

export async function readJson(req: any): Promise<Record<string, unknown>> {
  return (await readJsonBody(req)) as Record<string, unknown>
}
