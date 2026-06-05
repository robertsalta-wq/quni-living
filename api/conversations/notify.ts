/**
 * POST /api/conversations/notify - internal retry / ops
 * Body: { conversationId, messageId }
 * Auth: Bearer INTERNAL_DOC_FLOW_SECRET or X-Conversation-Notify-Secret
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { sendConversationMessageNotification } from '../lib/messaging/conversationNotify.js'
import { readMessagingEnv } from '../lib/messaging/auth.js'
import { corsJson, handleOptions } from '../lib/messaging/cors.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

type NotifyBody = {
  conversationId?: unknown
  messageId?: unknown
}

function readInternalSecret(req: IncomingMessage): string {
  const bearer = headerString(req.headers, 'authorization').replace(/^Bearer\s+/i, '').trim()
  const header = headerString(req.headers, 'x-conversation-notify-secret').trim()
  return header || bearer
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    return handleOptions(res, origin)
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const expected = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const provided = readInternalSecret(req)
  if (!expected || provided !== expected) {
    return corsJson(res, { error: 'Unauthorized' }, 401, origin)
  }

  const env = readMessagingEnv()
  if (!env) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  let body: NotifyBody
  try {
    body = (await readJsonBody(req)) as NotifyBody
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
  const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : ''
  if (!conversationId || !messageId) {
    return corsJson(res, { error: 'conversationId and messageId are required' }, 400, origin)
  }

  const admin = createClient<Database>(env.supabaseUrl, env.serviceRole)

  try {
    const result = await sendConversationMessageNotification({
      admin,
      conversationId,
      messageId,
    })
    if (!result.ok) {
      return corsJson(res, { error: result.error }, 400, origin)
    }
    return corsJson(res, { ok: true, to: result.to }, 200, origin)
  } catch (err) {
    console.error('[api/conversations/notify]', err)
    return corsJson(res, { error: 'Failed to send notification' }, 502, origin)
  }
}
