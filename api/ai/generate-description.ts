/**
 * AI listing description (Anthropic Claude) — Vercel Edge.
 * Env: ANTHROPIC_API_KEY
 */
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

function buildUserPrompt(body: Record<string, unknown>): string {
  const roomType = String(body.roomType ?? '').trim()
  const suburb = String(body.suburb ?? '').trim()
  const lines: string[] = [
    'Write a property listing description for students in Australia.',
    '',
    'Use only the facts below. Do not invent rooms, facilities, distances, prices, or any other details not listed.',
    '',
    `Room type: ${roomType}`,
    `Suburb: ${suburb}`,
  ]

  if (typeof body.weeklyRent === 'number' && Number.isFinite(body.weeklyRent)) {
    lines.push(
      'A weekly rent is set on the listing elsewhere — do not mention rent, bonds, or any dollar amounts in this description.',
    )
  }

  if (isStringArray(body.nearbyUniversities) && body.nearbyUniversities.length > 0) {
    lines.push(`Nearby / associated universities: ${body.nearbyUniversities.join(', ')}`)
  }

  if (isStringArray(body.amenities) && body.amenities.length > 0) {
    lines.push(`Amenities / features: ${body.amenities.join(', ')}`)
  }

  if (typeof body.houseRules === 'string' && body.houseRules.trim()) {
    lines.push(`House rules / expectations: ${body.houseRules.trim()}`)
  }

  if (typeof body.billsIncluded === 'boolean') {
    lines.push(`Bills included: ${body.billsIncluded ? 'yes' : 'no'}`)
  }

  if (typeof body.furnished === 'boolean') {
    lines.push(`Furnished: ${body.furnished ? 'yes' : 'no'}`)
  }

  lines.push(
    '',
    'Requirements:',
    '- 3–4 paragraphs, 120–180 words total.',
    '- Australian English; warm, practical tone.',
    '- No price or dollar amounts in the text.',
    '- End with a short invitation to enquire (e.g. contact for a viewing).',
    '- Plain paragraphs only (no bullet lists, no title line).',
  )

  return lines.join('\n')
}

function buildImprovePrompt(body: Record<string, unknown>, existingDescription: string): string {
  const roomType = String(body.roomType ?? '').trim()
  const suburb = String(body.suburb ?? '').trim()
  const lines: string[] = [
    'You are helping an Australian landlord improve an existing property listing description.',
    'Polish, expand, and improve the following description using the additional property details provided.',
    "Keep the landlord's voice and any specific details they've mentioned.",
    'Use Australian English.',
    'Return only the improved description, no headings or labels.',
    '',
    'Existing description:',
    existingDescription,
    '',
    'Additional property details:',
    `Room type: ${roomType}`,
    `Suburb: ${suburb}`,
  ]

  if (typeof body.weeklyRent === 'number' && Number.isFinite(body.weeklyRent)) {
    lines.push(
      'A weekly rent is set on the listing elsewhere — do not mention rent, bonds, or any dollar amounts in this description.',
    )
  }

  if (isStringArray(body.nearbyUniversities) && body.nearbyUniversities.length > 0) {
    lines.push(`Nearby / associated universities: ${body.nearbyUniversities.join(', ')}`)
  }

  if (isStringArray(body.amenities) && body.amenities.length > 0) {
    lines.push(`Amenities / features: ${body.amenities.join(', ')}`)
  }

  if (typeof body.houseRules === 'string' && body.houseRules.trim()) {
    lines.push(`House rules / expectations: ${body.houseRules.trim()}`)
  }

  if (typeof body.billsIncluded === 'boolean') {
    lines.push(`Bills included: ${body.billsIncluded ? 'yes' : 'no'}`)
  }

  if (typeof body.furnished === 'boolean') {
    lines.push(`Furnished: ${body.furnished ? 'yes' : 'no'}`)
  }

  return lines.join('\n')
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
  const userMessage = existingDescription ? buildImprovePrompt(body, existingDescription) : buildUserPrompt(body)

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
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
