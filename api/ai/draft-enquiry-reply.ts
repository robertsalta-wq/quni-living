export const config = {
  runtime: 'edge',
}

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
}

type DraftReplyInput = {
  studentName: string
  studentMessage: string
  propertyTitle?: string
  propertySuburb?: string
  landlordName?: string
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

function firstNameFrom(fullName: string): string {
  const cleaned = fullName.trim().replace(/\s+/g, ' ')
  if (!cleaned) return 'there'
  const [first] = cleaned.split(' ')
  return first || 'there'
}

function buildPrompt(input: DraftReplyInput): string {
  const studentFirstName = firstNameFrom(input.studentName)
  const propertyBits = [input.propertyTitle?.trim(), input.propertySuburb?.trim()].filter(Boolean).join(', ')
  const signOffName = input.landlordName?.trim() || 'Landlord'

  const lines: string[] = [
    'You are writing a landlord reply to a student enquiry for an Australian rental listing.',
    '',
    'Write a warm, professional reply from the landlord to the student.',
    `Address the student by first name: ${studentFirstName}`,
    propertyBits ? `Reference this property naturally if relevant: ${propertyBits}` : 'No property details were provided.',
    'Invite the student to ask further questions or arrange an inspection.',
    'Use Australian English and keep the tone friendly but not overly casual.',
    'Write 3-5 sentences only.',
    'Return only the reply text with no labels, headings, or markdown.',
    '',
    `Landlord name (for sign-off context): ${signOffName}`,
    `Student full name: ${input.studentName}`,
    `Student message: ${input.studentMessage}`,
  ]

  return lines.join('\n')
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

  try {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin)
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return json({ error: 'AI enquiry reply drafting is not configured on the server.' }, 500, origin)
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch (err) {
      console.error('[api/ai/draft-enquiry-reply] invalid json', err)
      return json({ error: 'Invalid JSON body' }, 400, origin)
    }

    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
    const studentName = String(body.studentName ?? '').trim()
    const studentMessage = String(body.studentMessage ?? '').trim()

    if (!studentName) return json({ error: 'studentName is required' }, 400, origin)
    if (!studentMessage) return json({ error: 'studentMessage is required' }, 400, origin)
    if (body.propertyTitle != null && typeof body.propertyTitle !== 'string') {
      return json({ error: 'propertyTitle must be a string when provided' }, 400, origin)
    }
    if (body.propertySuburb != null && typeof body.propertySuburb !== 'string') {
      return json({ error: 'propertySuburb must be a string when provided' }, 400, origin)
    }
    if (body.landlordName != null && typeof body.landlordName !== 'string') {
      return json({ error: 'landlordName must be a string when provided' }, 400, origin)
    }

    const prompt = buildPrompt({
      studentName,
      studentMessage,
      propertyTitle: body.propertyTitle as string | undefined,
      propertySuburb: body.propertySuburb as string | undefined,
      landlordName: body.landlordName as string | undefined,
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
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (e) {
      console.error('[api/ai/draft-enquiry-reply] anthropic network error', e)
      const msg = e instanceof Error ? e.message : 'Network error'
      return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
    }

    const anthropicData = (await anthropicRes.json().catch(() => ({}))) as AnthropicMessagesResponse
    if (!anthropicRes.ok) {
      const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
      const status = anthropicRes.status === 429 ? 429 : 502
      console.error('[api/ai/draft-enquiry-reply] anthropic error response', {
        status: anthropicRes.status,
        errMsg,
      })
      return json({ error: errMsg }, status, origin)
    }

    const reply = (anthropicData.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n')

    if (!reply) {
      console.error('[api/ai/draft-enquiry-reply] empty reply from anthropic')
      return json({ error: 'AI returned an empty reply draft' }, 502, origin)
    }

    return json({ reply }, 200, origin)
  } catch (err) {
    console.error('[api/ai/draft-enquiry-reply] unhandled error', err)
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
