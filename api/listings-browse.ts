/**
 * Edge-cached public listings browse (default filters only — no near-anchor RPC).
 * GET /api/listings-browse?q=&university_id=&campus_id=&...
 */
import {
  edgeBrowseUnsupported,
  fetchListingsFromPostgrest,
  listingIsoDateUtc,
  parseListingsBrowseEdgeFilters,
} from './lib/listingsBrowseEdge.js'

export const config = {
  runtime: 'edge',
}

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL,
      ...extraHeaders,
    },
  })
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || ''

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders(origin))
  }

  const url = new URL(request.url)
  if (edgeBrowseUnsupported(url.searchParams)) {
    return jsonResponse(
      { error: 'near_anchor_unsupported', message: 'Use direct browse for distance search.' },
      400,
      corsHeaders(origin),
    )
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()

  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Server configuration missing Supabase credentials.' }, 503, corsHeaders(origin))
  }

  const listingDay = url.searchParams.get('listing_day')?.trim().slice(0, 10) || listingIsoDateUtc()
  const filters = parseListingsBrowseEdgeFilters(url.searchParams)

  try {
    const { properties, total } = await fetchListingsFromPostgrest(supabaseUrl, anonKey, filters, listingDay)
    return jsonResponse(
      { properties, total, listingDay },
      200,
      corsHeaders(origin),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Listings fetch failed'
    return jsonResponse({ error: message }, 502, {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store',
    })
  }
}
