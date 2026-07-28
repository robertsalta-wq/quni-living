import { next, rewrite } from '@vercel/functions'
import { isSocialCrawler } from './api/lib/socialCrawler.js'
import { isKnownAppPath, isStaticAssetPath } from './src/lib/knownRoutes.js'
import { isDeskShellGatedPath, resolveDeskShellEnabled } from './src/lib/deskShellCore.js'
import {
  isListYourRoomGatedPath,
  resolveListYourRoomEnabled,
} from './src/lib/listYourRoomGateCore.js'
import {
  isListYourRoomBGatedPath,
  resolveListYourRoomBEnabled,
} from './src/lib/listYourRoomBGateCore.js'

export const config = {
  matcher: [
    /*
     * Run on HTML navigations. Skip API and files with extensions under /assets.
     * Static prerendered files still pass through middleware then are served from FS.
     */
    '/((?!api/|assets/).*)',
  ],
}

function isDeskShellEnabledOnEdge(): boolean {
  // Prefer non-VITE name so Edge can read it without relying on Vite inlining.
  const override =
    process.env.DESK_SHELL_ENABLED ?? process.env.VITE_DESK_SHELL_ENABLED ?? ''
  return resolveDeskShellEnabled({
    override,
    vercelEnv: process.env.VERCEL_ENV,
    treatUnknownAsEnabled: false,
  })
}

function isListYourRoomEnabledOnEdge(): boolean {
  const override =
    process.env.LIST_YOUR_ROOM_ENABLED ?? process.env.VITE_LIST_YOUR_ROOM_ENABLED ?? ''
  return resolveListYourRoomEnabled({
    override,
    vercelEnv: process.env.VERCEL_ENV,
    treatUnknownAsEnabled: false,
  })
}

function isListYourRoomBEnabledOnEdge(): boolean {
  const override =
    process.env.LIST_YOUR_ROOM_B_ENABLED ?? process.env.VITE_LIST_YOUR_ROOM_B_ENABLED ?? ''
  return resolveListYourRoomBEnabled({
    override,
    vercelEnv: process.env.VERCEL_ENV,
    treatUnknownAsEnabled: false,
  })
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  // Never 404 infrastructure: API (also excluded by matcher), sitemap rewrite target path, robots.
  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname.startsWith('/api/') ||
    isStaticAssetPath(pathname)
  ) {
    return next()
  }

  // Desk-shell gated routes: Production → temporary redirect (302, never 301).
  // Preview (flag ON) falls through to the desk page at the same URL.
  if (isDeskShellGatedPath(pathname) && !isDeskShellEnabledOnEdge()) {
    const dest = new URL('/services/landlord-partnerships', url.origin)
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        'Cache-Control': 'private, no-store',
      },
    })
  }

  // Landlord invite landing (`/list-your-room`): Preview + Production ON (go-live).
  if (isListYourRoomGatedPath(pathname) && !isListYourRoomEnabledOnEdge()) {
    const dest = new URL('/services/landlord-partnerships', url.origin)
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        'Cache-Control': 'private, no-store',
      },
    })
  }

  // Landlord invite A/B (`/list-your-room-b`): Preview ON / Production OFF.
  if (isListYourRoomBGatedPath(pathname) && !isListYourRoomBEnabledOnEdge()) {
    const dest = new URL('/services/landlord-partnerships', url.origin)
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest.toString(),
        'Cache-Control': 'private, no-store',
      },
    })
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
