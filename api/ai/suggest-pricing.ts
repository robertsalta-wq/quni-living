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
  stop_reason?: string
  usage?: { output_tokens?: number; input_tokens?: number }
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
    '1) Use web search to gather current signals: Flatmates.com.au listings for the room type and suburb, and Scape/Iglu (or similar) weekly rates near the universities when provided — use these as a premium ceiling.',
    '2) After research, output your answer as pricing only.',
    '',
    'Output shape (exact keys, weekly AUD, whole numbers):',
    '{',
    '  "low": 280,',
    '  "high": 320,',
    '  "reasoning": "explanation here"',
    '}',
    '',
    'Rules:',
    '- low and high must be whole-number weekly AUD values (numbers, not words).',
    '- high must be greater than or equal to low.',
    '- reasoning must be 2-3 sentences in plain English.',
    '- Your final assistant message must be a single JSON object only: the object with keys low, high, reasoning. No markdown fences, no keys other than low, high, reasoning, and no text before or after that JSON.',
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

/** Accept JSON numbers or numeric strings (and light currency formatting). */
function parseWeeklyAud(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.-]/g, '')
    if (!cleaned) return NaN
    const n = Number(cleaned)
    if (Number.isFinite(n)) return Math.round(n)
  }
  return NaN
}

/** Every top-level balanced `{ ... }` substring in document order. */
function extractAllJsonObjects(text: string): string[] {
  const results: string[] = []
  let i = 0
  while (i < text.length) {
    if (text[i] !== '{') {
      i++
      continue
    }
    const start = i
    let depth = 0
    let j = start
    while (j < text.length) {
      const ch = text[j]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          results.push(text.slice(start, j + 1))
          i = j + 1
          break
        }
      }
      j++
    }
    if (j >= text.length && depth > 0) {
      i = start + 1
    }
  }
  return results
}

function tryParsePricingObject(rawJson: string): SuggestedPricing | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  const low = parseWeeklyAud(obj.low)
  const high = parseWeeklyAud(obj.high)
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning.trim() : ''

  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0 || high < low || !reasoning) {
    return null
  }

  return { low, high, reasoning }
}

/** Prefer the last JSON object in the reply (final answer after web-search preamble). */
function parseSuggestion(rawText: string): SuggestedPricing | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const single = tryParsePricingObject(trimmed)
    if (single) return single
  }

  const candidates = extractAllJsonObjects(trimmed)
  for (let c = candidates.length - 1; c >= 0; c--) {
    const parsed = tryParsePricingObject(candidates[c]!)
    if (parsed) return parsed
  }
  return null
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
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
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
    const stopReason = anthropicData.stop_reason
    const outputTokens = anthropicData.usage?.output_tokens
    console.error('suggest-pricing: parse failed', {
      stop_reason: stopReason,
      output_tokens: outputTokens,
      textLength: text.length,
      contentBlockTypes: (anthropicData.content ?? []).map((b) => b.type),
    })
    if (stopReason === 'max_tokens') {
      return json(
        {
          error:
            'AI response was cut off before a complete price range was produced. Please try again.',
        },
        502,
        origin,
      )
    }
    return json({ error: 'AI returned an invalid pricing suggestion format' }, 502, origin)
  }

  return json(parsed, 200, origin)
}
