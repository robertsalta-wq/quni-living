/**
 * Quni Living AI chat assistant — /api/chat
 * Streaming: raw text deltas only (client decides how to render).
 */
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  runtime: 'nodejs',
}

type ChatRole = 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }

type ListingContext = {
  listingIds?: string[]
  propertyId?: string
  sourcePage?: 'listings' | 'property_detail'
}

type ChatRequestBody = {
  messages?: ChatMessage[]
  userMessage?: string
  listingContext?: ListingContext
  visitorSessionId?: string
  turnstileToken?: string
  conversationId?: string
}

type PersonaKey = 'student_renter' | 'landlord' | 'visitor'

function sendJson(res: VercelResponse, body: unknown, status = 200): void {
  res.status(status).json(body)
}

function parseBearer(authorization: string | string[] | undefined): string | null {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization
  const h = raw?.trim() ?? ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  const t = m?.[1]?.trim()
  return t || null
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function clampStrArray(ids: unknown, max: number): string[] {
  if (!Array.isArray(ids)) return []
  const out = ids.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
  return out.slice(0, max)
}

function safeParseJsonFromEnvInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').toString().trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function firstNameFrom(fullName: string | null | undefined): string {
  const t = (fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  const [first] = t.split(' ')
  return first?.trim() ?? ''
}

function buildStudentListingContextBlock(props: Array<Record<string, unknown>>): string {
  // Facts-only: we only render keys we successfully receive from the query.
  const blocks: string[] = []

  for (const p of props) {
    const getStr = (k: string) => (typeof p[k] === 'string' ? p[k].trim() : '')
    const getBool = (k: string) => (typeof p[k] === 'boolean' ? (p[k] ? 'yes' : 'no') : '')

    const id = getStr('id')
    const title = getStr('title')
    const slug = getStr('slug')
    const roomType = getStr('room_type')
    const suburb = getStr('suburb')
    const state = getStr('state')
    const furnished = getBool('furnished')
    const linenSupplied = getBool('linen_supplied')
    const weeklyCleaningService = getBool('weekly_cleaning_service')

    const beds = p['bedrooms']
    const baths = p['bathrooms']
    const bond = p['bond']
    const leaseLength = getStr('lease_length')
    const availableFrom = getStr('available_from')
    const featured = getBool('featured')
    const rentPerWeek = p['rent_per_week']
    const createdAt = getStr('created_at')
    const distanceToCampusKm = p['distance_to_campus_km']

    // Embedded FK selects can return either a single object or an array (depends on query shape).
    const universities = p['universities']
    const uniNames = (() => {
      if (!universities || typeof universities !== 'object') return null
      if (Array.isArray(universities)) {
        const out = universities
          .map((u) => {
            if (!u || typeof u !== 'object') return ''
            const name = (u as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
        return out.length ? out : null
      }
      const name = (universities as { name?: unknown }).name
      return typeof name === 'string' && name.trim() ? [name.trim()] : null
    })()

    const campuses = p['campuses']
    const campusNames = (() => {
      if (!campuses || typeof campuses !== 'object') return null
      if (Array.isArray(campuses)) {
        const out = campuses
          .map((c) => {
            if (!c || typeof c !== 'object') return ''
            const name = (c as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
        return out.length ? out : null
      }
      const name = (campuses as { name?: unknown }).name
      return typeof name === 'string' && name.trim() ? [name.trim()] : null
    })()

    const propertyFeatures = Array.isArray(p['property_features']) ? p['property_features'] : null
    const amenities = propertyFeatures
      ? propertyFeatures
          .map((pf) => {
            if (!pf || typeof pf !== 'object') return ''
            const features = (pf as { features?: unknown }).features
            if (!features || typeof features !== 'object') return ''
            const name = (features as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
      : null

    const rentStr = (() => {
      if (typeof rentPerWeek === 'number' && Number.isFinite(rentPerWeek)) return `${rentPerWeek}`
      if (typeof rentPerWeek === 'string' && rentPerWeek.trim()) return rentPerWeek.trim()
      return ''
    })()
    const bedsStr = typeof beds === 'number' ? `${beds}` : typeof beds === 'string' && beds.trim() ? beds.trim() : ''
    const bathsStr = typeof baths === 'number' ? `${baths}` : typeof baths === 'string' && baths.trim() ? baths.trim() : ''
    const bondStr = typeof bond === 'number' ? `${bond}` : typeof bond === 'string' && bond.trim() ? bond.trim() : ''
    const featuredStr = featured || ''
    const distanceStr =
      typeof distanceToCampusKm === 'number' && Number.isFinite(distanceToCampusKm)
        ? `${distanceToCampusKm} km`
        : typeof distanceToCampusKm === 'string' && distanceToCampusKm.trim()
          ? `${distanceToCampusKm.trim()} km`
          : ''

    const header = title
      ? `Listing: ${title}${suburb ? ` (${suburb}${state ? `, ${state}` : ''})` : ''}`
      : `Listing: ${id || slug || 'Unknown'}`

    const lines: string[] = [header]
    if (id) lines.push(`- id: ${id}`)
    if (slug) lines.push(`- slug: ${slug}`)
    if (roomType) lines.push(`- room_type: ${roomType}`)
    if (suburb) lines.push(`- suburb: ${suburb}`)
    if (state) lines.push(`- state: ${state}`)
    if (rentStr) lines.push(`- rent_per_week (AUD): ${rentStr}`)
    if (bedsStr) lines.push(`- bedrooms: ${bedsStr}`)
    if (bathsStr) lines.push(`- bathrooms: ${bathsStr}`)
    if (bondStr) lines.push(`- bond (AUD): ${bondStr}`)
    if (leaseLength) lines.push(`- lease_length: ${leaseLength}`)
    if (availableFrom) lines.push(`- available_from: ${availableFrom}`)
    if (furnished) lines.push(`- furnished: ${furnished}`)
    if (linenSupplied) lines.push(`- linen_supplied: ${linenSupplied}`)
    if (weeklyCleaningService) lines.push(`- weekly_cleaning_service: ${weeklyCleaningService}`)
    if (featuredStr) lines.push(`- featured: ${featuredStr}`)
    if (distanceStr) lines.push(`- distance_to_campus_km (approx): ${distanceStr}`)
    if (uniNames && uniNames.length > 0) lines.push(`- universities: ${uniNames.join(', ')}`)
    if (campusNames && campusNames.length > 0) lines.push(`- campuses: ${campusNames.join(', ')}`)
    if (amenities && amenities.length > 0) lines.push(`- amenities / features: ${amenities.join(', ')}`)
    if (createdAt) lines.push(`- created_at: ${createdAt}`)

    blocks.push(lines.join('\n'))
  }

  return blocks.join('\n\n')
}

const SYSTEM_PROMPTS: Record<PersonaKey, string> = {
  visitor: `You are Quni Living’s AI assistant for visitors who are not logged in.

Rules:
- Be friendly, trustworthy, and transparent: you do not have access to private listing details tied to an account.
- Do not claim actions were performed (e.g., verification status) unless the user provides that info.
- Focus on helping visitors understand the process: browsing, verification, enquiry, and booking.
- When users ask for “best listings”, respond with general advice and suggest that they sign up to see their full options.
- Encourage next steps with clear, short guidance and links if appropriate (plain guidance is acceptable).
- Use Australian English.

No listing context block is available for visitors.`,

  student_renter: `You are Quni Living’s AI assistant for helping students and verified renters make better accommodation decisions on an Australian student accommodation marketplace.

Address the user naturally and warmly once at the beginning using their first name if provided: "{{FIRST_NAME}}".
Use Australian English.

You MUST follow these rules:
1) Facts only: You may use only the information provided in LISTING CONTEXT below.
2) If something isn’t present in LISTING CONTEXT, say you don’t have that specific detail and ask a focused follow-up question.
3) Be practical: translate listing facts into concrete “fit” guidance (location, room type, amenities, budget fit, what to ask the landlord).
4) Do not guess prices, distances, availability, landlord intent, or policies.
5) Don’t mention protected characteristics (and never infer sensitive attributes).
6) Keep responses clear and action-oriented. Use short paragraphs.
7) If the user asks for a comparison, compare only across the provided listings.

LISTING CONTEXT (FACTS ONLY):
{{LISTING_CONTEXT_BLOCK}}

Respond to the user’s latest question using only the provided facts.`,

  landlord: `You are a helpful assistant on Quni Living, assisting landlords managing student accommodation.

Rules:
1) Be warm, concise, and practical.
2) Address the landlord naturally once using "{{FIRST_NAME}}" if provided.
3) Help landlords complete listing setup by explaining what to include and how to phrase key details to attract the right renters.
4) Explain Stripe Connect payouts at a high level: what the payout is for, what “charges enabled” means, and how payout timing works in general terms (no guarantees).
5) Explain the non-student tenant opt-in (“open to non-students”) and what it changes for which renters can see/book the listing.
6) Draft replies to renter enquiries: write warm, professional messages and suggest follow-up questions that clarify fit.
7) Understand and reference Verified Student vs Verified Identity badges in guidance: encourage renters to complete the right verification path, and help landlords interpret badge meaning without making assumptions about protected characteristics.
8) Never recommend rejecting based on protected characteristics.
9) Do not invent facts about a renter or a listing. Ask clarifying questions if needed.
10) Prefer actionable checklists and message drafts, but do not output markdown headings or labels.
11) Use Australian English.`,
}

async function verifyTurnstileOrThrow(token: string): Promise<void> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()
  if (!secret) {
    // Server misconfiguration.
    throw new Error('Captcha verification is not configured on the server.')
  }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })

  const data = (await verifyRes.json()) as { success?: boolean; 'error-codes'?: string[] }
  if (!data.success) {
    const codes = Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : ''
    const msg = codes ? `Captcha verification failed (${codes}).` : 'Captcha verification failed.'
    // Throw so caller can map to 400.
    throw new Error(msg)
  }
}

function mapAnthropicContentBlockDeltaText(payload: unknown): string {
  // The exact delta shape can vary; we try to extract text from a few known structures.
  if (!payload || typeof payload !== 'object') return ''

  const obj = payload as Record<string, unknown>

  // Common patterns:
  // 1) { delta: { type: 'text_delta', text: '...' } }
  // 2) { delta: { text: '...' } }
  // 3) { text: '...' }
  const delta = obj['delta']
  if (delta && typeof delta === 'object') {
    const td = delta as Record<string, unknown>
    const t = td['text']
    if (typeof t === 'string') return t

    // Some shapes nest `text_delta` under another `delta` object.
    const innerDelta = td['delta']
    if (innerDelta && typeof innerDelta === 'object') {
      const id = innerDelta as Record<string, unknown>
      const t3 = id['text']
      if (typeof t3 === 'string') return t3
    }
  }

  const t2 = obj['text']
  if (typeof t2 === 'string') return t2

  return ''
}

function extractAnthropicFullText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const obj = payload as Record<string, unknown>
  const content = obj['content']
  if (!Array.isArray(content)) return ''

  const texts: string[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    // Anthropic returns text blocks like: { type: 'text', text: '...' }
    const t = b['text']
    if (typeof t === 'string' && t.trim()) texts.push(t)
  }

  return texts.join('')
}

async function streamAnthropicTextDelta(
  anthropicRes: Response,
  onTextDelta: (textDelta: string) => void | Promise<void>,
): Promise<string> {
  if (!anthropicRes.body) throw new Error('Anthropic response has no body.')

  const reader = anthropicRes.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  let fullText = ''
  let loggedFirstChunk = false

  const handleLine = async (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('data:')) return

    const dataStr = trimmed.slice('data:'.length).trim()
    if (!dataStr || dataStr === '[DONE]') return

    let parsed: unknown
    try {
      parsed = JSON.parse(dataStr)
    } catch {
      return
    }

    const textDelta = mapAnthropicContentBlockDeltaText(parsed)
    if (!textDelta) return

    if (!loggedFirstChunk) {
      loggedFirstChunk = true
      console.log('[chat] first chunk received')
    }

    fullText += textDelta
    await onTextDelta(textDelta)
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (!value) continue

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r/g, '')

    while (true) {
      const nlIdx = buffer.indexOf('\n')
      if (nlIdx === -1) break
      const line = buffer.slice(0, nlIdx)
      buffer = buffer.slice(nlIdx + 1)
      await handleLine(line)
    }
  }

  // Handle any remaining trailing line (if it ends without '\n').
  if (buffer.trim()) {
    const lines = buffer.split('\n')
    for (const line of lines) {
      await handleLine(line)
    }
  }

  return fullText
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const originHeader = req.headers['origin']
  const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader) || null

  // Set CORS headers for all responses (including early validation errors).
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    res.status(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, { error: 'Method not allowed' }, 405)
    return
  }

  const raw = req.body as unknown
  let parsedRaw: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsedRaw = JSON.parse(raw) as unknown
    } catch {
      parsedRaw = null
    }
  }
  if (!parsedRaw || typeof parsedRaw !== 'object') {
    sendJson(res, { error: 'Invalid JSON body' }, 400)
    return
  }

  const body = parsedRaw as ChatRequestBody
  const messagesRaw = body.messages
  const messages: ChatMessage[] = Array.isArray(messagesRaw)
    ? messagesRaw.filter(
        (m): m is ChatMessage =>
          m != null &&
          typeof m === 'object' &&
          (m as { role?: unknown }).role != null &&
          ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
          typeof (m as { content?: unknown }).content === 'string',
      )
    : []

  const userMessage = isNonEmptyString(body.userMessage) ? body.userMessage.trim() : ''
  if (!userMessage) {
    sendJson(res, { error: 'userMessage is required' }, 400)
    return
  }

  const listingContext: ListingContext | undefined =
    body.listingContext && typeof body.listingContext === 'object' ? (body.listingContext as ListingContext) : undefined

  const visitorSessionId = isNonEmptyString(body.visitorSessionId) ? body.visitorSessionId.trim() : undefined
  const turnstileToken = isNonEmptyString(body.turnstileToken) ? body.turnstileToken.trim() : undefined

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const anthropicApiKey = (process.env.ANTHROPIC_API_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey || !anthropicApiKey) {
    sendJson(res, { error: 'Server configuration error' }, 500)
    return
  }

  const chatMaxTokens = safeParseJsonFromEnvInt('CHAT_MAX_TOKENS', 1024)
  const maxListingIds = safeParseJsonFromEnvInt('CHAT_LISTING_CONTEXT_MAX_IDS', 8)
  const maxLoggedInPer24h = safeParseJsonFromEnvInt('CHAT_LIMIT_LOGGED_IN_PER_24H', 40)
  const maxVisitorPerHour = safeParseJsonFromEnvInt('CHAT_LIMIT_VISITOR_PER_HOUR', 5)

  // Persona + identity
  const token = parseBearer(req.headers['authorization'])
  const isAuthed = Boolean(token)

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const supabaseAdmin = createClient(supabaseUrl, serviceRole)

  let persona: PersonaKey = 'visitor'
  let userId: string | null = null
  let landlordFirstName = ''
  let studentFirstName = ''

  if (isAuthed && token) {
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token)
    if (!userErr && userData?.user?.id) {
      userId = userData.user.id

      // Determine persona from profiles.
      const [{ data: lp, error: lpErr }, { data: sp, error: spErr }] = await Promise.all([
        supabaseAdmin.from('landlord_profiles').select('first_name, full_name').eq('user_id', userData.user.id).maybeSingle(),
        supabaseAdmin.from('student_profiles').select('verification_type, full_name').eq('user_id', userData.user.id).maybeSingle(),
      ])

      if (!lpErr && lp) {
        persona = 'landlord'
        const fn = typeof (lp as { first_name?: unknown }).first_name === 'string' ? (lp as { first_name?: string }).first_name : null
        landlordFirstName = fn || firstNameFrom((lp as { full_name?: unknown }).full_name as string | undefined) || ''
      } else if (!spErr && sp) {
        persona = 'student_renter'
        studentFirstName = firstNameFrom((sp as { full_name?: unknown } | null)?.full_name as string | undefined)
      } else {
        persona = 'visitor'
      }
    }
  }

  console.log('[chat] persona:', persona)

  if (persona === 'visitor') {
    // Visitors must carry a stable session ID from sessionStorage.
    if (!visitorSessionId) {
      sendJson(res, { error: 'visitorSessionId is required' }, 400)
      return
    }
  }

  // Rate limit check (before any Anthropic call).
  const now = Date.now()
  const sinceMs = persona === 'visitor' ? now - 60 * 60 * 1000 : now - 24 * 60 * 60 * 1000
  const sinceIso = new Date(sinceMs).toISOString()

  let rateLimitedCount = 0
  if (persona === 'visitor') {
    console.log('[chat] rate_limit: visitor start')
    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_session_id', visitorSessionId!)
      .eq('direction', 'user')
      .eq('status', 'ok')
      .gte('created_at', sinceIso)

    if (error) {
      // If rate-limit query fails, fail closed.
      sendJson(res, { error: 'rate_limit_check_failed' }, 500)
      return
    }
    rateLimitedCount = count ?? 0
    console.log('[chat] rate_limit: visitor done count', rateLimitedCount)
    if (rateLimitedCount >= maxVisitorPerHour) {
      sendJson(
        res,
        { error: 'rate_limited', message: 'You’ve reached your chat limit. Please wait and try again shortly.' },
        429,
      )
      return
    }
  } else {
    if (!userId) {
      sendJson(res, { error: 'Auth required for this persona' }, 401)
      return
    }
    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'user')
      .eq('status', 'ok')
      .gte('created_at', sinceIso)

    if (error) {
      sendJson(res, { error: 'rate_limit_check_failed' }, 500)
      return
    }
    rateLimitedCount = count ?? 0
    if (rateLimitedCount >= maxLoggedInPer24h) {
      sendJson(
        res,
        { error: 'rate_limited', message: 'You’ve reached your chat limit for today. Please try again tomorrow.' },
        429,
      )
      return
    }
  }

  // Turnstile for first visitor message (after rate limit passes).
  if (persona === 'visitor') {
    console.log('[chat] captcha precheck: start')
    const { data: anyRow, error: firstErr } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .eq('visitor_session_id', visitorSessionId!)
      .limit(1)

    if (firstErr) {
      sendJson(res, { error: 'captcha_precheck_failed' }, 500)
      return
    }

    const isFirst = !(anyRow && anyRow.length > 0)
    console.log('[chat] captcha precheck: done isFirst', isFirst, 'rows', anyRow?.length ?? 0)
    if (isFirst) {
      if (!turnstileToken) {
        sendJson(res, { error: 'captcha_required', message: 'Please complete the verification challenge.' }, 403)
        return
      }
      try {
        await verifyTurnstileOrThrow(turnstileToken)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Captcha verification failed.'
        sendJson(res, { error: 'captcha_failed', message: msg }, 400)
        return
      }
    }
  }

  // Log USER message row BEFORE calling Anthropic.
  console.log('[chat] user insert: start')
  const insertedUserMsg = await supabaseAdmin.from('chat_messages').insert({
    user_id: persona === 'visitor' ? null : userId,
    visitor_session_id: persona === 'visitor' ? visitorSessionId : null,
    persona,
    direction: 'user',
    status: 'ok',
    conversation_id: body.conversationId ?? null,
    listing_ids: listingContext?.listingIds ?? (listingContext?.propertyId ? [listingContext.propertyId] : undefined),
    message: userMessage,
  })

  console.log('[chat] user insert: done hasError', Boolean(insertedUserMsg.error))
  if (insertedUserMsg.error) {
    sendJson(res, { error: 'chat_log_failed' }, 500)
    return
  }

  // Prepare system prompt
  let listingContextBlock = ''
  if (persona === 'student_renter') {
    const listingIds = listingContext?.listingIds ? clampStrArray(listingContext.listingIds, maxListingIds) : []
    const propertyId = isNonEmptyString(listingContext?.propertyId) ? (listingContext?.propertyId as string).trim() : ''

    // Build select clause (retry without distance_to_campus_km if column doesn't exist).
    const wantDistance = true
    const baseColumns = [
      'id',
      'title',
      'slug',
      'rent_per_week',
      'room_type',
      'suburb',
      'state',
      'furnished',
      'linen_supplied',
      'weekly_cleaning_service',
      'bedrooms',
      'bathrooms',
      'bond',
      'lease_length',
      'available_from',
      'featured',
      'created_at',
    ]
    const distanceCol = wantDistance ? ['distance_to_campus_km'] : []
    const propsSelectWithDistance =
      [...baseColumns, ...distanceCol].join(', ') +
      `,
      landlord_profiles ( id, full_name, verified ),
      universities ( id, name, slug ),
      campuses ( id, name, slug ),
      property_features ( features ( name, icon ) )
    `

    const propsSelectWithoutDistance =
      baseColumns.join(', ') +
      `,
      landlord_profiles ( id, full_name, verified ),
      universities ( id, name, slug ),
      campuses ( id, name, slug ),
      property_features ( features ( name, icon ) )
    `

    let propertiesRows: Array<Record<string, unknown>> = []

    const listingFilterPropertyId = propertyId ? { field: 'id', value: propertyId } : null
    const listingFilterIn = !listingFilterPropertyId && listingIds.length > 0 ? { field: 'id', value: listingIds } : null

    if (!listingFilterPropertyId && !listingFilterIn) {
      listingContextBlock = 'No listing context was provided.'
    } else {
      // Fetch listing facts from DB.
      let q = supabaseAdmin.from('properties').select(propsSelectWithDistance)
      if (listingFilterPropertyId) {
        q = q.eq(listingFilterPropertyId.field, listingFilterPropertyId.value)
      } else if (listingFilterIn && Array.isArray(listingFilterIn.value)) {
        q = q.in(listingFilterIn.field, listingFilterIn.value as string[])
      }

      const { data, error } = await q.limit(maxListingIds)
      if (!error && data) {
        propertiesRows = data as unknown as Array<Record<string, unknown>>
      } else if (error && String(error.message).includes('distance_to_campus_km')) {
        // Retry without optional distance field.
        let q2 = supabaseAdmin.from('properties').select(propsSelectWithoutDistance)
        if (listingFilterPropertyId) {
          q2 = q2.eq(listingFilterPropertyId.field, listingFilterPropertyId.value)
        } else if (listingFilterIn && Array.isArray(listingFilterIn.value)) {
          q2 = q2.in(listingFilterIn.field, listingFilterIn.value as string[])
        }
        const { data: data2, error: error2 } = await q2.limit(maxListingIds)
        if (error2) {
          sendJson(res, { error: 'listing_context_load_failed' }, 500)
          return
        }
        propertiesRows = (data2 ?? []) as unknown as Array<Record<string, unknown>>
      } else if (error) {
        sendJson(res, { error: 'listing_context_load_failed' }, 500)
        return
      }
    }

    listingContextBlock = buildStudentListingContextBlock(propertiesRows)
  }

  const systemPrompt = (() => {
    if (persona === 'student_renter') {
      return SYSTEM_PROMPTS.student_renter
        .replace('{{FIRST_NAME}}', studentFirstName)
        .replace('{{LISTING_CONTEXT_BLOCK}}', listingContextBlock)
    }
    if (persona === 'landlord') {
      return SYSTEM_PROMPTS.landlord.replace('{{FIRST_NAME}}', landlordFirstName || '')
    }
    return SYSTEM_PROMPTS.visitor
  })()

  // Rolling window:
  // - we trust client to provide the conversation window.
  const anthropicMessages = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }))

  // Node runtime streaming:
  // - set response headers and stream deltas with res.write
  res.status(200)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-cache, no-store')
  res.setHeader('Transfer-Encoding', 'chunked')

  let fullAssistantText = ''
  let assistantRowInserted = false

  try {
    // Anthropic stream call.
    console.log('[chat] calling Anthropic')
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: chatMaxTokens,
        system: systemPrompt,
        messages: anthropicMessages.length ? anthropicMessages : [{ role: 'user', content: userMessage }],
        stream: true,
      }),
    })

    console.log('[chat] anthropic status:', anthropicRes.status)
    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => '')
      console.error('[chat] anthropic error body:', errBody)
      res.status(400).json({ error: 'anthropic_error', message: errBody || 'Anthropic request failed.' })
      return
    }

    fullAssistantText = await streamAnthropicTextDelta(anthropicRes, (textDelta) => {
      res.write(textDelta)
    })

    // If our streaming frame parser fails (no deltas extracted), fall back to a non-streaming request.
    // This keeps chat usable while we diagnose streaming wire formats.
    if (!fullAssistantText.trim()) {
      console.warn('[chat] empty stream result; falling back to non-streaming anthropic response')
      const nonStreamingRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: chatMaxTokens,
          system: systemPrompt,
          messages: anthropicMessages.length ? anthropicMessages : [{ role: 'user', content: userMessage }],
          stream: false,
        }),
      })

      if (nonStreamingRes.ok) {
        const nonStreamingPayload: unknown = await nonStreamingRes.json()
        const fullText = extractAnthropicFullText(nonStreamingPayload)
        if (fullText) {
          fullAssistantText = fullText
          res.write(fullText)
        }
      } else {
        // If fallback fails, we still end/return with whatever we have.
        console.warn('[chat] non-streaming fallback failed with status', nonStreamingRes.status)
      }
    }

    // Log assistant row AFTER stream completes (no partial logging mid-stream).
    const assistantInsert = await supabaseAdmin.from('chat_messages').insert({
      user_id: persona === 'visitor' ? null : userId,
      visitor_session_id: persona === 'visitor' ? visitorSessionId : null,
      persona,
      direction: 'assistant',
      status: 'ok',
      conversation_id: body.conversationId ?? null,
      listing_ids: listingContext?.listingIds ?? (listingContext?.propertyId ? [listingContext.propertyId] : undefined),
      message: fullAssistantText,
    })

    assistantRowInserted = !assistantInsert.error
    if (assistantInsert.error) {
      console.warn('[api/chat] assistant log failed', assistantInsert.error)
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unexpected chat error'
    if (!assistantRowInserted) {
      try {
        await supabaseAdmin.from('chat_messages').insert({
          user_id: persona === 'visitor' ? null : userId,
          visitor_session_id: persona === 'visitor' ? visitorSessionId : null,
          persona,
          direction: 'assistant',
          status: 'error',
          conversation_id: body.conversationId ?? null,
          listing_ids: listingContext?.listingIds ?? (listingContext?.propertyId ? [listingContext.propertyId] : undefined),
          message: errMsg.slice(0, 2000),
          error_code: 'anthropic_stream_failed',
        })
      } catch (logErr) {
        console.warn('[api/chat] error assistant log failed', logErr)
      }
    }
  } finally {
    res.end()
  }
}

