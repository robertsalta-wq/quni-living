/**
 * On-demand listing text proofread (Anthropic Claude Haiku) - Vercel Edge.
 * Env: ANTHROPIC_API_KEY
 */
import {
  PROOFREAD_SYSTEM_PROMPT,
  buildProofreadUserPrompt,
} from '../../src/lib/aiSurfacePromptAssembly.js'
import { ANTHROPIC_HAIKU_MODEL } from '../lib/anthropicModel.js'
import { reportAiFailure } from '../lib/reportAiFailure.js'

export const config = {
  runtime: 'edge',
}

type ProofreadSuggestion = {
  original: string
  suggested: string
  reason: string
}

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
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

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return fenced ? fenced[1]!.trim() : trimmed
}

function isProofreadSuggestion(value: unknown): value is ProofreadSuggestion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.original === 'string' &&
    row.original.length > 0 &&
    typeof row.suggested === 'string' &&
    typeof row.reason === 'string'
  )
}

function parseProofreadResponse(rawText: string, sourceText: string): { suggestions: ProofreadSuggestion[] } | null {
  const stripped = stripCodeFences(rawText)
  if (!stripped) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const suggestionsRaw = (parsed as { suggestions?: unknown }).suggestions
  if (!Array.isArray(suggestionsRaw)) return null

  const suggestions: ProofreadSuggestion[] = []
  for (const item of suggestionsRaw) {
    if (!isProofreadSuggestion(item)) return null
    if (!sourceText.includes(item.original)) continue
    suggestions.push({
      original: item.original,
      suggested: item.suggested,
      reason: item.reason,
    })
  }

  return { suggestions }
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
    return json({ error: 'AI proofread is not configured on the server.' }, 500, origin)
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

  const userMessage = buildProofreadUserPrompt(text)

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
        model: ANTHROPIC_HAIKU_MODEL,
        max_tokens: 2048,
        system: PROOFREAD_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    await reportAiFailure('proofread-text', 'network error', { message: msg })
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json().catch(() => ({}))) as AnthropicMessagesResponse

  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : 502
    await reportAiFailure('proofread-text', 'anthropic error', {
      status: anthropicRes.status,
      anthropic_message: errMsg,
      model: ANTHROPIC_HAIKU_MODEL,
    })
    return json({ error: errMsg }, status, origin)
  }

  const rawReply = (anthropicData.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

  const parsed = parseProofreadResponse(rawReply, text)
  if (!parsed) {
    await reportAiFailure('proofread-text', 'invalid json response', {
      model: ANTHROPIC_HAIKU_MODEL,
      preview: rawReply.slice(0, 200),
    })
    return json({ error: 'Could not read proofread suggestions. Please try again.' }, 502, origin)
  }

  return json(parsed, 200, origin)
}
