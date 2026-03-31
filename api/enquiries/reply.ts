import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

type ReplyRequestBody = {
  enquiryId?: string
  reply?: string
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const m = headerValue.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin)
    }

    const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
    const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
    if (!supabaseUrl || !serviceRole || !anonKey) {
      const detail = {
        supabaseUrl: Boolean(supabaseUrl),
        serviceRole: Boolean(serviceRole),
        anonKey: Boolean(anonKey),
      }
      console.error('[api/enquiries/reply] missing env vars', detail)
      return json({ error: 'Server is missing required Supabase env vars.', detail }, 500, origin)
    }

    const token = getBearerToken(request.headers.get('authorization'))
    if (!token) {
      const detail = 'Missing Authorization Bearer token.'
      console.error('[api/enquiries/reply] auth failed', detail)
      return json({ error: 'Unauthorized', detail }, 401, origin)
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) {
      const detail = userErr?.message || 'Invalid or expired token.'
      console.error('[api/enquiries/reply] token validation failed', { detail })
      return json({ error: 'Unauthorized', detail }, 401, origin)
    }

    let body: ReplyRequestBody
    try {
      body = (await request.json()) as ReplyRequestBody
    } catch (err) {
      console.error('[api/enquiries/reply] invalid json', err)
      return json({ error: 'Invalid JSON body', detail: err instanceof Error ? err.message : String(err) }, 400, origin)
    }

    const enquiryId = String(body?.enquiryId ?? '').trim()
    const reply = String(body?.reply ?? '').trim()
    if (!enquiryId || !reply) {
      const detail = { enquiryId: Boolean(enquiryId), reply: Boolean(reply) }
      console.error('[api/enquiries/reply] validation failed', detail)
      return json({ error: 'enquiryId and reply are required', detail }, 400, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: landlordProfile, error: landlordErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (landlordErr || !landlordProfile?.id) {
      const detail = landlordErr?.message || 'Landlord profile not found for authenticated user.'
      console.error('[api/enquiries/reply] landlord lookup failed', { detail, userId: user.id })
      return json({ error: 'Could not verify landlord access.', detail }, 403, origin)
    }

    const updatePayload = {
      reply,
      status: 'replied',
      replied_at: new Date().toISOString(),
    }
    const { data: updatedRow, error: updateErr } = await admin
      .from('enquiries')
      .update(updatePayload)
      .eq('id', enquiryId)
      .eq('landlord_id', landlordProfile.id)
      .select('id')
      .maybeSingle()

    if (updateErr || !updatedRow?.id) {
      const detail = updateErr?.message || 'No enquiry updated (not found or not owned by landlord).'
      console.error('[api/enquiries/reply] update failed', {
        detail,
        enquiryId,
        landlordId: landlordProfile.id,
      })
      return json({ error: 'Could not save enquiry reply.', detail }, 400, origin)
    }

    return json({ success: true }, 200, origin)
  } catch (err) {
    console.error('[api/enquiries/reply] unhandled error', err)
    return json(
      {
        error: 'Unexpected server error',
        detail: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      },
      500,
      origin,
    )
  }
}
