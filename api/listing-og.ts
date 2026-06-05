/**
 * Server-rendered Open Graph HTML for listing URLs (social crawlers only - see middleware.ts).
 * GET /api/listing-og?slug=...&path=/listings/...
 */
import { buildListingOgHtml, fetchListingOgMeta } from './lib/listingOgMeta.js'

export const config = {
  runtime: 'edge',
}

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')?.trim() ?? ''
  const pathParam = url.searchParams.get('path')?.trim()
  const canonicalPath = pathParam || (slug ? `/listings/${slug}` : '')

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const meta = await fetchListingOgMeta(slug, canonicalPath)
  if (!meta) {
    return new Response('Listing not found', { status: 404 })
  }

  const html = buildListingOgHtml(meta)
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
    },
  })
}
