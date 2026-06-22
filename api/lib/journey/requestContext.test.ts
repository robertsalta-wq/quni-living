import { describe, expect, it } from 'vitest'
import { mergeDeviceContextMetadata, requestContextFromRequest } from './requestContext.js'

function mockRequest(userAgent: string | null) {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'user-agent' ? userAgent : null),
    },
  }
}

describe('requestContextFromRequest', () => {
  it('detects mobile User-Agent strings', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const ctx = requestContextFromRequest(mockRequest(iphone))
    expect(ctx.is_mobile).toBe(true)
    expect(ctx.user_agent).toBe(iphone)
  })

  it('treats desktop User-Agent strings as non-mobile', () => {
    const desktop =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const ctx = requestContextFromRequest(mockRequest(desktop))
    expect(ctx.is_mobile).toBe(false)
    expect(ctx.user_agent).toBe(desktop)
  })

  it('truncates User-Agent to 400 characters', () => {
    const longUa = `Mozilla/5.0 Android ${'x'.repeat(500)}`
    const ctx = requestContextFromRequest(mockRequest(longUa))
    expect(ctx.user_agent).toHaveLength(400)
    expect(ctx.user_agent).toBe(longUa.slice(0, 400))
    expect(ctx.is_mobile).toBe(true)
  })

  it('returns empty user_agent and is_mobile false when header is missing', () => {
    expect(requestContextFromRequest(mockRequest(null))).toEqual({
      user_agent: '',
      is_mobile: false,
    })
    expect(requestContextFromRequest(null)).toEqual({
      user_agent: '',
      is_mobile: false,
    })
    expect(requestContextFromRequest(undefined)).toEqual({
      user_agent: '',
      is_mobile: false,
    })
  })
})

describe('mergeDeviceContextMetadata', () => {
  const deviceCtx = {
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    is_mobile: true,
  }

  it('merges device context into existing metadata', () => {
    expect(mergeDeviceContextMetadata({ booking_id: 'bk_123' }, deviceCtx)).toEqual({
      booking_id: 'bk_123',
      user_agent: deviceCtx.user_agent,
      is_mobile: true,
    })
  })

  it('returns only device context when existing metadata is empty', () => {
    expect(mergeDeviceContextMetadata(undefined, deviceCtx)).toEqual(deviceCtx)
  })

  it('returns existing metadata unchanged when device context is absent', () => {
    const existing = { booking_id: 'bk_123' }
    expect(mergeDeviceContextMetadata(existing, null)).toEqual(existing)
    expect(mergeDeviceContextMetadata(existing, undefined)).toEqual(existing)
    expect(mergeDeviceContextMetadata(null, null)).toEqual({})
  })
})
