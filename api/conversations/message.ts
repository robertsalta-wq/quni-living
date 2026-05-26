/**
 * POST /api/conversations/message
 * Body: { conversationId, body }
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import {
  authenticateMessagingRequest,
  getBearerToken,
  readMessagingEnv,
} from '../lib/messaging/auth.js'
import { sendConversationMessageNotification } from '../lib/messaging/conversationNotify.js'
import { corsJson, handleOptions } from '../lib/messaging/cors.js'
import {
  fetchContactMaskingEnabled,
  insertPeerMessage,
  PeerMessageValidationError,
} from '../lib/messaging/insertPeerMessage.js'
import { loadConversationForUser, participantRole } from '../lib/messaging/participants.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

type MessageBody = {
  conversationId?: unknown
  body?: unknown
}

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

  let body: MessageBody
  try {
    body = (await readJsonBody(req)) as MessageBody
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
  const messageBody = typeof body.body === 'string' ? body.body : ''
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

  const maskingEnabled = await fetchContactMaskingEnabled(admin)

  try {
    const result = await insertPeerMessage({
      admin,
      conversation: loaded.conversation,
      senderUserId: user.id,
      senderRole: role,
      body: messageBody,
      maskingEnabled,
    })

    let notifyWarning: string | undefined
    try {
      const notify = await sendConversationMessageNotification({
        admin,
        conversationId,
        messageId: result.messageId,
      })
      if (!notify.ok) {
        notifyWarning = notify.error
        console.warn('[api/conversations/message] notify failed', notify.error)
      }
    } catch (notifyErr) {
      notifyWarning = notifyErr instanceof Error ? notifyErr.message : 'Notify failed'
      console.error('[api/conversations/message] notify error', notifyErr)
    }

    return corsJson(
      res,
      {
        ok: true,
        messageId: result.messageId,
        displayBody: result.displayBody,
        createdAt: result.createdAt,
        maskEventCount: result.maskEventCount,
        contactUnlocked: loaded.conversation.contact_unlocked_at != null,
        maskingEnabled,
        ...(notifyWarning ? { notifyWarning } : {}),
      },
      200,
      origin,
    )
  } catch (err) {
    if (err instanceof PeerMessageValidationError) {
      return corsJson(res, { error: err.message }, 400, origin)
    }
    console.error('[api/conversations/message]', err)
    return corsJson(res, { error: 'Could not send message' }, 500, origin)
  }
}
