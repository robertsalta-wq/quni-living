/**
 * POST /api/conversations/read
 * Body: { conversationId }
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import {
  authenticateMessagingRequest,
  getBearerToken,
  readMessagingEnv,
} from '../lib/messaging/auth.js'
import { corsJson, handleOptions } from '../lib/messaging/cors.js'
import { loadConversationForUser, participantRole } from '../lib/messaging/participants.js'

export const config = { runtime: 'nodejs', maxDuration: 15 }

type ReadBody = { conversationId?: unknown }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    return handleOptions(res, origin)
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const env = readMessagingEnv()
  if (!env) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const token = getBearerToken(headerString(req.headers, 'authorization'))
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
  }

  const auth = await authenticateMessagingRequest(env, token)
  if (!auth.ok) {
    return corsJson(res, { error: auth.error }, auth.status, origin)
  }

  let body: ReadBody
  try {
    body = (await readJsonBody(req)) as ReadBody
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
  if (!conversationId) {
    return corsJson(res, { error: 'conversationId is required' }, 400, origin)
  }

  const { user, admin } = auth.data
  const loaded = await loadConversationForUser(admin, conversationId, user)
  if (!loaded.ok) {
    return corsJson(res, { error: loaded.error }, loaded.status, origin)
  }

  const role = participantRole(loaded.conversation, user.id)
  if (!role) {
    return corsJson(res, { error: 'Not a participant' }, 403, origin)
  }

  const now = new Date().toISOString()
  const patch =
    role === 'landlord'
      ? { landlord_last_read_at: now }
      : { tenant_last_read_at: now }

  const { error } = await admin.from('conversations').update(patch).eq('id', conversationId)

  if (error) {
    console.error('[api/conversations/read]', error)
    return corsJson(res, { error: 'Could not update read state' }, 500, origin)
  }

  return corsJson(res, { ok: true, readAt: now, role }, 200, origin)
}
