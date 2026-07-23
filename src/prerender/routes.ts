import path from 'node:path'
import { listCampusSeoPaths } from '../lib/campusSeo/registry'
import { listGuideSlugs } from '../lib/guides/registry'

/** Marketing/static pages prerendered as pathname → dist/{segment}/index.html */
export const STATIC_PRERENDER_PATHS = ['/', '/for-universities'] as const

export function listPrerenderPathnames(): string[] {
  const guides = listGuideSlugs().map((slug) => `/guides/${slug}`)
  const campuses = listCampusSeoPaths()
  return [...STATIC_PRERENDER_PATHS, ...guides, ...campuses]
}

export function pathnameToDistDir(distDir: string, pathname: string): string {
  // Homepage overwrites dist/index.html (SPA shell is preserved as spa.html first).
  if (pathname === '/') return distDir
  return path.join(distDir, pathname.replace(/^\//, ''))
}
