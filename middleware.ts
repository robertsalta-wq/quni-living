import { next, rewrite } from '@vercel/functions'
import { isSocialCrawler } from './api/lib/socialCrawler.js'

export const config = {
  matcher: ['/listings/:slug', '/properties/:slug'],
}

export default function middleware(request: Request): Response {
  const userAgent = request.headers.get('user-agent')
  if (!isSocialCrawler(userAgent)) {
    return next()
  }

  const url = new URL(request.url)
  const match = url.pathname.match(/^\/(?:listings|properties)\/([^/?#]+)/)
  if (!match) return next()

  const slug = decodeURIComponent(match[1])
  const rewriteUrl = new URL('/api/listing-og', url.origin)
  rewriteUrl.searchParams.set('slug', slug)
  rewriteUrl.searchParams.set('path', url.pathname)

  return rewrite(rewriteUrl)
}
