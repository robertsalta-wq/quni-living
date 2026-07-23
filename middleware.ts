import { next, rewrite } from '@vercel/functions'
import { isSocialCrawler } from './api/lib/socialCrawler.js'
import { isKnownAppPath, isStaticAssetPath } from './src/lib/knownRoutes.js'

export const config = {
  matcher: [
    /*
     * Run on HTML navigations. Skip API and files with extensions under /assets.
     * Static prerendered files still pass through middleware then are served from FS.
     */
    '/((?!api/|assets/).*)',
  ],
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (isStaticAssetPath(pathname)) {
    return next()
  }

  // Social OG shell for listing/property detail URLs only (Googlebot excluded in isSocialCrawler).
  if (isSocialCrawler(request.headers.get('user-agent'))) {
    const match = pathname.match(/^\/(?:listings|properties)\/([^/?#]+)/)
    if (match) {
      const slug = decodeURIComponent(match[1])
      const rewriteUrl = new URL('/api/listing-og', url.origin)
      rewriteUrl.searchParams.set('slug', slug)
      rewriteUrl.searchParams.set('path', pathname)
      return rewrite(rewriteUrl)
    }
  }

  if (!isKnownAppPath(pathname)) {
    try {
      const notFoundUrl = new URL('/404.html', url.origin)
      const res = await fetch(notFoundUrl)
      if (res.ok) {
        return new Response(res.body, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        })
      }
    } catch {
      /* fall through to minimal body */
    }
    return new Response(
      '<!DOCTYPE html><html lang="en-AU"><head><meta charset="utf-8"><title>Page not found | Quni Living</title><meta name="robots" content="noindex, nofollow"></head><body><h1>Page not found</h1><p><a href="/">Back to home</a></p></body></html>',
      {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    )
  }

  return next()
}
