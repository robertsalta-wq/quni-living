/**
 * Read-only rent guide for `/list-your-room-d` earnings strip.
 * Aggregates live active listing rents (not invented mock ranges).
 * Rate-limited by IP; CDN-cached. No writes.
 *
 * Note: This is live Quni listing rents — the honest “what students are paying”
 * signal. The landlord AI Smart-pricing engine (`/api/ai/suggest-pricing`) is
 * suburb+amenities oriented and too slow/costly for select-on-change; flagged
 * in the PR for Rob if he wants an AI-backed path later.
 */
export const config = {
  runtime: 'edge',
}

const ALLOWED_CAMPUS_IDS = new Set([
  '22222222-0000-0000-0000-000000000010',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000008',
  '22222222-0000-0000-0000-000000000012',
  '22222222-0000-0000-0000-000000000018',
])

const ROOM_KINDS = new Set(['single', 'ensuite'])
/** Product-approved v10 fallback while the properties schema has no ensuite segment. */
const ENSUITE_WEEKLY_UPLIFT_AUD = 70

/** Soft per-isolate IP budget — complements Cache-Control. */
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_MAX = 40
const ipHits = new Map<string, { count: number; resetAt: number }>()

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, status: number, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? CACHE_CONTROL : 'no-store',
      ...extra,
    },
  })
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const row = ipHits.get(ip)
  if (!row || now >= row.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (row.count >= RATE_MAX) return false
  row.count += 1
  return true
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const w = idx - lo
  return Math.round(sorted[lo] * (1 - w) + sorted[hi] * w)
}

async function fetchRents(
  supabaseUrl: string,
  anonKey: string,
  opts: { campusId?: string; roomType: string; state?: string },
): Promise<number[]> {
  const base = supabaseUrl.replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set('select', 'rent_per_week')
  params.set('status', 'eq.active')
  params.set('rent_per_week', 'not.is.null')
  params.set('room_type', `eq.${opts.roomType}`)
  if (opts.campusId) params.set('campus_id', `eq.${opts.campusId}`)
  if (opts.state) params.set('state', `eq.${opts.state}`)
  params.set('limit', '200')

  const res = await fetch(`${base}/rest/v1/properties?${params.toString()}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PostgREST ${res.status}: ${body.slice(0, 200)}`)
  }
  const rows = (await res.json()) as Array<{ rent_per_week: number | string | null }>
  return rows
    .map((r) => Number(r.rent_per_week))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
}

function rangeFromRents(rents: number[]): { low: number; high: number; sampleSize: number } | null {
  if (rents.length === 0) return null
  if (rents.length === 1) {
    return { low: rents[0], high: rents[0], sampleSize: 1 }
  }
  const low = percentile(rents, 0.25)
  const high = percentile(rents, 0.75)
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return null
  return { low, high, sampleSize: rents.length }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || ''

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(origin), 'Access-Control-Max-Age': '86400' },
    })
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders(origin))
  }

  if (!rateLimit(clientIp(request))) {
    return json(
      { error: 'rate_limited', message: 'Too many requests. Please try again shortly.' },
      429,
      corsHeaders(origin),
    )
  }

  const url = new URL(request.url)
  const campusId = (url.searchParams.get('campus_id') ?? '').trim()
  const roomKind = (url.searchParams.get('room_type') ?? 'single').trim().toLowerCase()

  if (!ALLOWED_CAMPUS_IDS.has(campusId)) {
    return json({ error: 'Invalid campus_id' }, 400, corsHeaders(origin))
  }
  if (!ROOM_KINDS.has(roomKind)) {
    return json({ error: 'Invalid room_type' }, 400, corsHeaders(origin))
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server configuration missing Supabase credentials.' }, 503, corsHeaders(origin))
  }

  // DB has no dedicated ensuite enum yet. Use the v10 product-approved uplift
  // and disclose it in the response instead of showing an identical range.
  const queryRoomType = 'single'
  const roomTypeUplift = roomKind === 'ensuite' ? ENSUITE_WEEKLY_UPLIFT_AUD : 0

  try {
    const campusRents = await fetchRents(supabaseUrl, anonKey, {
      campusId,
      roomType: queryRoomType,
    })
    const campusRange = rangeFromRents(campusRents)

    if (campusRange && campusRange.sampleSize >= 2) {
      return json(
        {
          low: campusRange.low + roomTypeUplift,
          high: campusRange.high + roomTypeUplift,
          sampleSize: campusRange.sampleSize,
          framing: 'campus_listings',
          roomTypeRequested: roomKind,
          caveat:
            roomKind === 'ensuite'
              ? `Based on recent Quni listings near campus, with the approved $${ENSUITE_WEEKLY_UPLIFT_AUD} weekly ensuite uplift. A guide to what students are paying — not an estimate of your specific room.`
              : 'Based on recent Quni listings near campus. A guide to what students are paying — not an estimate of your specific room.',
        },
        200,
        corsHeaders(origin),
      )
    }

    const nswRents = await fetchRents(supabaseUrl, anonKey, {
      roomType: queryRoomType,
      state: 'NSW',
    })
    const nswRange = rangeFromRents(nswRents)
    if (!nswRange) {
      return json(
        {
          error: 'no_data',
          message: 'Not enough live listings to show a range yet.',
          framing: 'unavailable',
        },
        200,
        corsHeaders(origin),
      )
    }

    const ensuiteNote =
      roomKind === 'ensuite'
        ? ` Ensuite listings are limited on Quni right now, so this includes the approved $${ENSUITE_WEEKLY_UPLIFT_AUD} weekly ensuite uplift.`
        : ''

    return json(
      {
        low: nswRange.low + roomTypeUplift,
        high: nswRange.high + roomTypeUplift,
        sampleSize: nswRange.sampleSize,
        framing: 'typical_nsw',
        roomTypeRequested: roomKind,
        caveat: `A typical range for student rooms on Quni in NSW — not enough live listings near this campus yet for a local rate.${ensuiteNote} A guide to what students are paying — not an estimate of your specific room.`,
      },
      200,
      corsHeaders(origin),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Rent guide fetch failed'
    return json({ error: message }, 502, { ...corsHeaders(origin), 'Cache-Control': 'no-store' })
  }
}
