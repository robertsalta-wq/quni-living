import { describe, expect, it } from 'vitest'
import { isKnownAppPath, isStaticAssetPath } from './knownRoutes'

describe('knownRoutes', () => {
  it('treats static assets as skip-for-404', () => {
    expect(isStaticAssetPath('/assets/index-abc.js')).toBe(true)
    expect(isStaticAssetPath('/favicon.ico')).toBe(true)
    expect(isStaticAssetPath('/api/sitemap.xml')).toBe(true)
  })

  it('recognises marketing and listing shapes', () => {
    expect(isKnownAppPath('/')).toBe(true)
    expect(isKnownAppPath('/login')).toBe(true)
    expect(isKnownAppPath('/listings/auchenflower-3m1ji')).toBe(true)
    expect(isKnownAppPath('/student-accommodation/unsw/kensington-campus')).toBe(true)
    expect(isKnownAppPath('/admin/properties')).toBe(true)
  })

  it('rejects unknown path shapes', () => {
    expect(isKnownAppPath('/this-is-not-a-route-xyz')).toBe(false)
    expect(isKnownAppPath('/blog/hello')).toBe(false)
    expect(isKnownAppPath('/listings')).toBe(true)
  })
})
