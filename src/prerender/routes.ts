import path from 'node:path'
import { listGuideSlugs } from '../lib/guides/registry'

/** Marketing/static pages prerendered as pathname → dist/{segment}/index.html */
export const STATIC_PRERENDER_PATHS = ['/for-universities'] as const

export function listPrerenderPathnames(): string[] {
  const guides = listGuideSlugs().map((slug) => `/guides/${slug}`)
  return [...STATIC_PRERENDER_PATHS, ...guides]
}

export function pathnameToDistDir(distDir: string, pathname: string): string {
  return path.join(distDir, pathname.replace(/^\//, ''))
}
