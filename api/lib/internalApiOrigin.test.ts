import { afterEach, describe, expect, it } from 'vitest'
import { internalApiOrigin } from './internalApiOrigin.js'

const env = process.env

describe('internalApiOrigin', () => {
  afterEach(() => {
    process.env = { ...env }
  })

  it('prefers VERCEL_URL over custom domain env', () => {
    process.env.VERCEL_URL = 'quni-living-abc123.vercel.app'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    expect(internalApiOrigin()).toBe('https://quni-living-abc123.vercel.app')
  })

  it('uses INTERNAL_API_ORIGIN when VERCEL_URL is unset', () => {
    delete process.env.VERCEL_URL
    process.env.INTERNAL_API_ORIGIN = 'https://quni-living.vercel.app'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    expect(internalApiOrigin()).toBe('https://quni-living.vercel.app')
  })

  it('falls back to PUBLIC_SITE_URL then default', () => {
    delete process.env.VERCEL_URL
    delete process.env.INTERNAL_API_ORIGIN
    process.env.PUBLIC_SITE_URL = 'https://www.quni.com.au'
    expect(internalApiOrigin()).toBe('https://www.quni.com.au')
    delete process.env.PUBLIC_SITE_URL
    expect(internalApiOrigin()).toBe('https://quni-living.vercel.app')
  })
})
