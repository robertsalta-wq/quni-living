/**
 * AI listing description (Anthropic Claude) - Vercel Edge.
 * Env: ANTHROPIC_API_KEY
 */
import {
  DESCRIPTION_GENERATOR_SYSTEM_PROMPT,
  buildDescriptionUserPrompt,
  buildImproveDescriptionUserPrompt,
} from '../../src/lib/aiSurfacePromptAssembly.js'

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

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
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

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return json({ error: 'AI description is not configured on the server.' }, 500, origin)
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const roomType = String(body.roomType ?? '').trim()
  const suburb = String(body.suburb ?? '').trim()

  if (!roomType) {
    return json({ error: 'roomType is required' }, 400, origin)
  }
  if (!suburb) {
    return json({ error: 'suburb is required' }, 400, origin)
  }

  if (body.weeklyRent !== undefined && body.weeklyRent !== null && typeof body.weeklyRent !== 'number') {
    return json({ error: 'weeklyRent must be a number when provided' }, 400, origin)
  }
  if (body.nearbyUniversities !== undefined && body.nearbyUniversities !== null && !isStringArray(body.nearbyUniversities)) {
    return json({ error: 'nearbyUniversities must be an array of strings when provided' }, 400, origin)
  }
  if (body.amenities !== undefined && body.amenities !== null && !isStringArray(body.amenities)) {
    return json({ error: 'amenities must be an array of strings when provided' }, 400, origin)
  }
  if (body.houseRules !== undefined && body.houseRules !== null && typeof body.houseRules !== 'string') {
    return json({ error: 'houseRules must be a string when provided' }, 400, origin)
  }
  if (body.billsIncluded !== undefined && body.billsIncluded !== null && typeof body.billsIncluded !== 'boolean') {
    return json({ error: 'billsIncluded must be a boolean when provided' }, 400, origin)
  }
  if (body.furnished !== undefined && body.furnished !== null && typeof body.furnished !== 'boolean') {
    return json({ error: 'furnished must be a boolean when provided' }, 400, origin)
  }
  if (body.existingDescription !== undefined && body.existingDescription !== null && typeof body.existingDescription !== 'string') {
    return json({ error: 'existingDescription must be a string when provided' }, 400, origin)
  }

  const existingDescription = typeof body.existingDescription === 'string' ? body.existingDescription.trim() : ''
  const userMessage = existingDescription
    ? buildImproveDescriptionUserPrompt(body, existingDescription)
    : buildDescriptionUserPrompt(body)

  let anthropicRes: Response
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: DESCRIPTION_GENERATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json()) as AnthropicMessagesResponse

  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : anthropicRes.status >= 500 ? 502 : 502
    return json({ error: errMsg }, status, origin)
  }

  const textBlock = anthropicData.content?.find((c) => c.type === 'text')
  const description = typeof textBlock?.text === 'string' ? textBlock.text.trim() : ''

  if (!description) {
    return json({ error: 'AI returned an empty description' }, 502, origin)
  }

  return json({ description }, 200, origin)
}
