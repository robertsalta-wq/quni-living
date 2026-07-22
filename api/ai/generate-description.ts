/**
 * AI listing description (Anthropic Claude) - Vercel Edge.
 * Env: ANTHROPIC_API_KEY
 */
import {
  DESCRIPTION_GENERATOR_SYSTEM_PROMPT,
  buildDescriptionUserPrompt,
  buildImproveDescriptionUserPrompt,
} from '../../src/lib/aiSurfacePromptAssembly.js'
import { ANTHROPIC_SONNET_MODEL } from '../lib/anthropicModel.js'
import { reportAiFailure } from '../lib/reportAiFailure.js'

export const config = {
  runtime: 'edge',
}

/**
 * Mirrors the body sent by AIDescriptionGenerator.
 * Widening this allowlist is a legal-review decision, not a routine change.
 */
const GENERATE_DESCRIPTION_BODY_ALLOWLIST = [
  'roomType',
  'suburb',
  'existingDescription',
  'weeklyRent',
  'nearbyUniversities',
  'amenities',
  'furnished',
] as const

type AllowedDescriptionBodyKey = (typeof GENERATE_DESCRIPTION_BODY_ALLOWLIST)[number]

function pickAllowedDescriptionBody(raw: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {}
  for (const key of GENERATE_DESCRIPTION_BODY_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      picked[key as AllowedDescriptionBodyKey] = raw[key]
    }
  }
  return picked
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

  const rawBody = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const body = pickAllowedDescriptionBody(rawBody)
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
        model: ANTHROPIC_SONNET_MODEL,
        max_tokens: 400,
        system: DESCRIPTION_GENERATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    await reportAiFailure('generate-description', 'network error', { message: msg })
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json()) as AnthropicMessagesResponse

  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : anthropicRes.status >= 500 ? 502 : 502
    await reportAiFailure('generate-description', 'anthropic error', {
      status: anthropicRes.status,
      anthropic_message: errMsg,
      model: ANTHROPIC_SONNET_MODEL,
    })
    return json({ error: errMsg }, status, origin)
  }

  const textBlock = anthropicData.content?.find((c) => c.type === 'text')
  const description = typeof textBlock?.text === 'string' ? textBlock.text.trim() : ''

  if (!description) {
    await reportAiFailure('generate-description', 'empty response')
    return json({ error: 'AI returned an empty description' }, 502, origin)
  }

  return json({ description }, 200, origin)
}
