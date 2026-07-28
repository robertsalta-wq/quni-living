/**
 * Isolated paste→preview extraction for `/list-your-room`.
 * Zero database writes. Returns JSON for UI preview only.
 * Does not touch the landlord property form or publish flow.
 *
 * TODO: optional Anthropic pass for richer fields — keep the same response shape.
 */
import { extractListingFromAd } from '../../src/lib/extractListingFromAd.js'

export const config = {
  runtime: 'edge',
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const text = typeof body.text === 'string' ? body.text : ''

  if (!text.trim()) {
    return json({ error: 'text is required' }, 400, origin)
  }

  if (text.length > 12_000) {
    return json({ error: 'text is too long' }, 400, origin)
  }

  const preview = extractListingFromAd(text)
  return json({ preview }, 200, origin)
}
