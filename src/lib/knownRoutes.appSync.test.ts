import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isKnownAppPath, isStaticAssetPath } from './knownRoutes'

/**
 * Convert a React Router path pattern into one concrete pathname for knownRoutes checks.
 * Dynamic segments (`:id`) become `__param__`.
 */
export function concretePathFromRoutePattern(pattern: string): string | null {
  const raw = pattern.trim()
  if (!raw || raw === '*') return null
  let p = raw
  const optionalMatch = p.match(/^(.*)\/:([^/]+)\?$/)
  if (optionalMatch) {
    p = `${optionalMatch[1]}/__param__`
  }
  p = p.replace(/:([^/?#]+)\?/g, '__param__')
  p = p.replace(/:([^/?#]+)/g, '__param__')
  if (!p.startsWith('/')) p = `/${p}`
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

type RouteDecl = { path: string; absolute: boolean; line: number }

/** Absolute `path="/..."` only — public + top-level app shells. */
export function extractAbsoluteAppRoutePatterns(appSource: string): string[] {
  const paths: string[] = []
  const re = /\bpath\s*=\s*(?:\{?"(\/[^"]*)"\}?|\{?'(\/[^']*)'\}?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(appSource))) {
    const p = (m[1] ?? m[2] ?? '').trim()
    if (p) paths.push(p)
  }
  return [...new Set(paths)]
}

describe('knownRoutes ↔ App.tsx sync', () => {
  const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
  const absolutePatterns = extractAbsoluteAppRoutePatterns(appSource)

  it('finds absolute Route paths in App.tsx', () => {
    expect(absolutePatterns.length).toBeGreaterThan(20)
    expect(absolutePatterns).toContain('/login')
    expect(absolutePatterns).toContain('/listings/:slug')
  })

  it('every absolute App.tsx path is known to middleware (else hard-404 in prod)', () => {
    const failures: string[] = []
    for (const pattern of absolutePatterns) {
      if (pattern === '*') continue
      const concrete = concretePathFromRoutePattern(pattern)
      if (!concrete) {
        failures.push(`${pattern} → could not concretise`)
        continue
      }
      if (!isKnownAppPath(concrete)) {
        failures.push(`${pattern} → ${concrete} is NOT a knownAppPath (would hard-404)`)
      }
      if (/\/:[^/]+\?$/.test(pattern)) {
        const base = pattern.replace(/\/:[^/]+\?$/, '') || '/'
        const baseConcrete = concretePathFromRoutePattern(base)
        if (baseConcrete && !isKnownAppPath(baseConcrete)) {
          failures.push(`${pattern} base ${baseConcrete} is NOT a knownAppPath`)
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })

  it('covers nested /admin/* deep links via the admin wildcard', () => {
    // Nested relative paths under <Route path="/admin"> are not absolute in App.tsx;
    // the knownRoutes admin pattern must keep serving them (not hard-404).
    const samples = [
      '/admin',
      '/admin/bookings',
      '/admin/properties',
      '/admin/properties/__param__/fees',
      '/admin/agreement-previews',
      '/admin/qase/settings',
      '/admin/qase/__param__',
    ]
    for (const p of samples) {
      expect(isKnownAppPath(p), p).toBe(true)
    }
    expect(appSource).toContain('path="/admin"')
    expect(appSource).toMatch(/path=["']bookings["']/)
    expect(appSource).toMatch(/path=["']agreement-previews["']/)
  })

  it('excludes /api/* and sitemap/robots from the hard-404 branch', () => {
    // Matcher already skips api/; belt-and-suspenders in middleware + static-asset rules.
    expect(isStaticAssetPath('/api/sitemap.xml')).toBe(true)
    expect(isStaticAssetPath('/api/cron/expire-bookings')).toBe(true)
    expect(isKnownAppPath('/api/listing-og')).toBe(true)

    expect(isStaticAssetPath('/sitemap.xml')).toBe(true)
    expect(isKnownAppPath('/sitemap.xml')).toBe(true)

    expect(isStaticAssetPath('/robots.txt')).toBe(true)
    expect(isKnownAppPath('/robots.txt')).toBe(true)
  })
})
