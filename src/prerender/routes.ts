import path from 'node:path'
import { listCampusSeoPaths } from '../lib/campusSeo/registry'
import { listGuideSlugs } from '../lib/guides/registry'
import { resolveDeskShellEnabled } from '../lib/deskShellCore'

/** Marketing/static pages prerendered as pathname → dist/{segment}/index.html */
export const STATIC_PRERENDER_PATHS = [
  '/',
  '/for-universities',
  '/listings',
  '/pricing',
  '/faq',
  '/guides',
  '/how-it-works',
  '/verification',
  '/contact',
  '/services/landlord-partnerships',
  '/landlords/ai',
] as const

/** Only when desk_shell_enabled (Preview / local) - Production must not ship indexable desk HTML. */
const DESK_SHELL_PRERENDER_PATHS = ['/for-landlords'] as const

function deskShellEnabledAtBuild(): boolean {
  return resolveDeskShellEnabled({
    override: process.env.VITE_DESK_SHELL_ENABLED ?? process.env.DESK_SHELL_ENABLED,
    vercelEnv: process.env.VERCEL_ENV ?? process.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: process.env.NODE_ENV !== 'production',
  })
}

export function listPrerenderPathnames(listingPaths: string[] = []): string[] {
  const guides = listGuideSlugs().map((slug) => `/guides/${slug}`)
  const campuses = listCampusSeoPaths()
  const deskPaths = deskShellEnabledAtBuild() ? [...DESK_SHELL_PRERENDER_PATHS] : []
  return [...STATIC_PRERENDER_PATHS, ...deskPaths, ...guides, ...campuses, ...listingPaths]
}

export function pathnameToDistDir(distDir: string, pathname: string): string {
  // Homepage overwrites dist/index.html (SPA shell is preserved as spa.html first).
  if (pathname === '/') return distDir
  return path.join(distDir, pathname.replace(/^\//, ''))
}
