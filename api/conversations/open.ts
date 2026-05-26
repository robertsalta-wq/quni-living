/**
 * POST /api/conversations/open
 * Body: { propertyId }
 * Tenant: get-or-create conversation. Landlord: return existing thread only.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import {
  authenticateMessagingRequest,
  getBearerToken,
  readMessagingEnv,
} from '../lib/messaging/auth.js'
import { corsJson, handleOptions } from '../lib/messaging/cors.js'
import { fetchContactMaskingEnabled } from '../lib/messaging/insertPeerMessage.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

type OpenBody = { propertyId?: unknown }

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

  let body: OpenBody
  try {
    body = (await readJsonBody(req)) as OpenBody
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  if (!propertyId) {
    return corsJson(res, { error: 'propertyId is required' }, 400, origin)
  }

  const { user, admin } = auth.data

  const [maskingEnabled, propertyResult] = await Promise.all([
    fetchContactMaskingEnabled(admin),
    admin.from('properties').select('id, status, landlord_id').eq('id', propertyId).maybeSingle(),
  ])

  const { data: property, error: propErr } = propertyResult

  if (propErr) {
    return corsJson(res, { error: propErr.message }, 500, origin)
  }
  if (!property?.landlord_id) {
    return corsJson(res, { error: 'Property not found' }, 404, origin)
  }
  if (property.status !== 'active') {
    return corsJson(res, { error: 'This listing is not available' }, 400, origin)
  }

  const { data: existing } = await admin
    .from('conversations')
    .select('id, contact_unlocked_at')
    .eq('property_id', propertyId)
    .eq('tenant_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return corsJson(
      res,
      {
        ok: true,
        conversationId: existing.id,
        contactUnlocked: existing.contact_unlocked_at != null,
        maskingEnabled,
        created: false,
      },
      200,
      origin,
    )
  }

  const { data: landlordConv } = await admin
    .from('conversations')
    .select('id, contact_unlocked_at, landlord_user_id, tenant_user_id')
    .eq('property_id', propertyId)
    .eq('landlord_user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (landlordConv && (landlordConv.landlord_user_id === user.id || landlordConv.tenant_user_id === user.id)) {
    return corsJson(
      res,
      {
        ok: true,
        conversationId: landlordConv.id,
        contactUnlocked: landlordConv.contact_unlocked_at != null,
        maskingEnabled,
        created: false,
      },
      200,
      origin,
    )
  }

  const { data: landlordSelf } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', property.landlord_id)
    .maybeSingle()

  if (landlordSelf?.id) {
    return corsJson(
      res,
      { error: 'Landlords cannot start a new thread from a listing; wait for a tenant message.' },
      403,
      origin,
    )
  }

  const { data: created, error: createErr } = await admin
    .from('conversations')
    .insert({
      property_id: propertyId,
      tenant_user_id: user.id,
    })
    .select('id, contact_unlocked_at')
    .single()

  if (createErr) {
    if (createErr.code === '23505') {
      const { data: race } = await admin
        .from('conversations')
        .select('id, contact_unlocked_at')
        .eq('property_id', propertyId)
        .eq('tenant_user_id', user.id)
        .maybeSingle()
      if (race) {
        return corsJson(
          res,
          {
            ok: true,
            conversationId: race.id,
            contactUnlocked: race.contact_unlocked_at != null,
            maskingEnabled,
            created: false,
          },
          200,
          origin,
        )
      }
    }
    console.error('[api/conversations/open] insert failed', createErr)
    return corsJson(res, { error: 'Could not open conversation' }, 500, origin)
  }

  return corsJson(
    res,
    {
      ok: true,
      conversationId: created.id,
      contactUnlocked: created.contact_unlocked_at != null,
      maskingEnabled,
      created: true,
    },
    200,
    origin,
  )
}
