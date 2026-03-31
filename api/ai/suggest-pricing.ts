export const config = {
  runtime: 'edge',
}

type SuggestPricingBody = {
  roomType: string
  suburb: string
  nearbyUniversities?: string[]
  amenities?: string[]
  furnished?: boolean
  billsIncluded?: boolean
}

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
}

type SuggestedPricing = {
  low: number
  high: number
  reasoning: string
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

function buildPrompt(input: SuggestPricingBody): string {
  const lines: string[] = [
    'You are a rental market pricing assistant for Australian student accommodation.',
    '',
    'Task:',
    '1) Search Flatmates.com.au for current listings matching the specified room type and suburb to determine realistic market rates.',
    '2) Search for current Scape and Iglu pricing near the specified universities as the premium ceiling.',
    '3) Return only strict JSON with this exact shape and keys:',
    '{',
    '  "low": 280,',
    '  "high": 320,',
    '  "reasoning": "explanation here"',
    '}',
    '',
    'Rules:',
    '- No markdown, no code fences, no extra keys, no additional text before/after JSON.',
    '- low and high must be whole-number weekly AUD values.',
    '- high must be greater than or equal to low.',
    '- reasoning must be 2-3 sentences in plain English.',
    '',
    `Room type: ${input.roomType}`,
    `Suburb: ${input.suburb}`,
  ]

  if (input.nearbyUniversities?.length) {
    lines.push(`Nearby universities: ${input.nearbyUniversities.join(', ')}`)
  } else {
    lines.push('Nearby universities: none provided')
  }

  if (input.amenities?.length) {
    lines.push(`Amenities: ${input.amenities.join(', ')}`)
  }
  if (typeof input.furnished === 'boolean') {
    lines.push(`Furnished: ${input.furnished ? 'yes' : 'no'}`)
  }
  if (typeof input.billsIncluded === 'boolean') {
    lines.push(`Bills included: ${input.billsIncluded ? 'yes' : 'no'}`)
  }

  return lines.join('\n')
}

function extractFirstJsonObject(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  let depth = 0
  let start = -1
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      if (depth > 0) depth--
      if (depth === 0 && start !== -1) {
        return trimmed.slice(start, i + 1)
      }
    }
  }
  return null
}

function parseSuggestion(rawText: string): SuggestedPricing | null {
  const rawJson = extractFirstJsonObject(rawText)
  if (!rawJson) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  const low = typeof obj.low === 'number' ? Math.round(obj.low) : NaN
  const high = typeof obj.high === 'number' ? Math.round(obj.high) : NaN
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning.trim() : ''

  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0 || high < low || !reasoning) {
    return null
  }

  return { low, high, reasoning }
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
    return json({ error: 'AI pricing suggestion is not configured on the server.' }, 500, origin)
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

  if (!roomType) return json({ error: 'roomType is required' }, 400, origin)
  if (!suburb) return json({ error: 'suburb is required' }, 400, origin)
  if (body.nearbyUniversities != null && !isStringArray(body.nearbyUniversities)) {
    return json({ error: 'nearbyUniversities must be an array of strings when provided' }, 400, origin)
  }
  if (body.amenities != null && !isStringArray(body.amenities)) {
    return json({ error: 'amenities must be an array of strings when provided' }, 400, origin)
  }
  if (body.furnished != null && typeof body.furnished !== 'boolean') {
    return json({ error: 'furnished must be a boolean when provided' }, 400, origin)
  }
  if (body.billsIncluded != null && typeof body.billsIncluded !== 'boolean') {
    return json({ error: 'billsIncluded must be a boolean when provided' }, 400, origin)
  }

  const prompt = buildPrompt({
    roomType,
    suburb,
    nearbyUniversities: body.nearbyUniversities as string[] | undefined,
    amenities: body.amenities as string[] | undefined,
    furnished: body.furnished as boolean | undefined,
    billsIncluded: body.billsIncluded as boolean | undefined,
  })

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
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json().catch(() => ({}))) as AnthropicMessagesResponse
  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : 502
    return json({ error: errMsg }, status, origin)
  }

  const text = (anthropicData.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')

  const parsed = parseSuggestion(text)
  if (!parsed) {
    return json({ error: 'AI returned an invalid pricing suggestion format' }, 502, origin)
  }

  return json(parsed, 200, origin)
}
