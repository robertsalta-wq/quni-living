/**
 * AI listing extractor (Anthropic Claude) — Vercel Edge.
 * Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * POST Authorization: Bearer <Supabase access_token> (landlord or platform admin)
 *
 * Guardrails: paste text only (no URL fetch); returns JSON for client pre-fill;
 * performs ZERO Supabase writes; never returns propertyListingType / bondWeeks.
 */
import { createClient } from '@supabase/supabase-js'
import { EXTRACTOR_FEATURE_NAMES, EXTRACTOR_LEASE_LENGTHS } from '../../src/lib/listingExtractor/types.js'
import { parseExtractedListingWithMeta } from '../../src/lib/listingExtractor/parseExtractedListing.js'
import { isPlatformAdminUser } from '../lib/adminAuth.js'
import { ANTHROPIC_SONNET_MODEL } from '../lib/anthropicModel.js'
import { reportAiFailure } from '../lib/reportAiFailure.js'

export const config = {
  runtime: 'edge',
}

const EXTRACT_LISTING_BODY_ALLOWLIST = ['text'] as const
const MAX_PASTE_CHARS = 12_000
const MIN_PASTE_CHARS = 20

type AllowedBodyKey = (typeof EXTRACT_LISTING_BODY_ALLOWLIST)[number]

function pickAllowedBody(raw: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {}
  for (const key of EXTRACT_LISTING_BODY_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      picked[key as AllowedBodyKey] = raw[key]
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
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

function parseBearer(request: Request): string | null {
  const h = request.headers.get('Authorization')?.trim() ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  const t = m?.[1]?.trim()
  return t || null
}

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[]
  error?: { type?: string; message?: string }
}

const SYSTEM_PROMPT = `You extract structured fields from an Australian accommodation listing that a landlord pasted (Facebook post, Flatmates, Gumtree, etc.).

Return a single JSON object only — no markdown fences, no commentary.

Each field is either null OR { "value": ..., "confidence": "high"|"low" }.
- "high" = the paste explicitly states it.
- "low" = weakly implied; prefer null over guessing.
- If not stated, the whole field must be null. Blank beats a guess.

Allowed fields only:
title, description, rentPerWeek (weekly AUD whole number as string), bedrooms, bathrooms,
maxOccupants (1-10 string, only if clearly stated), furnished, linenSupplied, weeklyCleaning,
features (array of names from this exact list: ${EXTRACTOR_FEATURE_NAMES.join(', ')}),
parkingAvailable, address, suburb, state, postcode,
leaseLength (one of: ${EXTRACTOR_LEASE_LENGTHS.join(' | ')}),
availableFrom (YYYY-MM-DD only if a real date is stated),
houseRulesText, accommodationHint (short non-binding hint like "reads like a whole apartment").

NEVER include: propertyListingType, roomType, bondWeeks, coupleSurchargePerWeek,
parkingSurchargePerWeek, qldBondRemittancePreference, serviceTier, images,
compliance/utilities fields, rooming house fields, listing_type.
Do not invent bond, dates, surcharges, or occupant counts.
Do not fetch or mention any URL.`

function buildUserPrompt(text: string): string {
  return `Extract fields from this pasted listing text:\n\n---\n${text}\n---`
}

/** Exported for guardrail tests — documents that this module must not write to DB. */
export const EXTRACT_LISTING_PERFORMS_SUPABASE_WRITES = false as const

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

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const token = parseBearer(request)
  if (!token) {
    return json({ error: 'Authorization Bearer token required' }, 401, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server configuration error' }, 500, origin)
  }

  // Auth only — read landlord_profiles; never insert/update properties or bookings.
  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: lpRow, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isLandlord = !lpErr && Boolean(lpRow)
  if (!isLandlord && !(await isPlatformAdminUser(user))) {
    return json({ error: 'Landlord profile required' }, 403, origin)
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return json({ error: 'AI listing extractor is not configured on the server.' }, 500, origin)
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const rawBody = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const body = pickAllowedBody(rawBody)
  const text = typeof body.text === 'string' ? body.text.trim() : ''

  if (text.length < MIN_PASTE_CHARS) {
    return json({ error: `Paste at least ${MIN_PASTE_CHARS} characters of listing text.` }, 400, origin)
  }
  if (text.length > MAX_PASTE_CHARS) {
    return json({ error: `Paste is too long (max ${MAX_PASTE_CHARS} characters).` }, 400, origin)
  }

  // Guardrail: paste, don't scrape — reject if body looks like a bare URL-only paste intending fetch
  if (/^https?:\/\/\S+$/i.test(text) && text.length < 200) {
    return json(
      { error: 'Paste the listing text itself — Quni does not fetch listing URLs.' },
      400,
      origin,
    )
  }

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
        max_tokens: 1600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(text) }],
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    await reportAiFailure('extract-listing', 'network error', { message: msg })
    return json({ error: `Could not reach AI service: ${msg}` }, 502, origin)
  }

  const anthropicData = (await anthropicRes.json()) as AnthropicMessagesResponse

  if (!anthropicRes.ok) {
    const errMsg = anthropicData.error?.message || anthropicRes.statusText || 'Anthropic request failed'
    const status = anthropicRes.status === 429 ? 429 : 502
    await reportAiFailure('extract-listing', 'anthropic error', {
      status: anthropicRes.status,
      anthropic_message: errMsg,
      model: ANTHROPIC_SONNET_MODEL,
    })
    return json({ error: errMsg }, status, origin)
  }

  const textBlock = anthropicData.content?.find((c) => c.type === 'text')
  const rawOut = typeof textBlock?.text === 'string' ? textBlock.text.trim() : ''

  if (!rawOut) {
    await reportAiFailure('extract-listing', 'empty response')
    return json({ error: 'AI returned an empty extraction' }, 502, origin)
  }

  const parsed = parseExtractedListingWithMeta(rawOut)
  if (!parsed) {
    await reportAiFailure('extract-listing', 'invalid json shape')
    return json({ error: 'AI returned an invalid extraction format' }, 502, origin)
  }

  // Hard strip: never echo tier/bond even if parser missed something
  return json(
    {
      extracted: parsed.extracted,
      unmatchedFeatureNames: parsed.unmatchedFeatureNames,
    },
    200,
    origin,
  )
}
