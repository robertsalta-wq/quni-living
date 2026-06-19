import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseOAuthSignupParamsFromSearch } from './authCallbackParams'
import { buildAuthCallbackUrl, getGoogleOAuthOptions } from './oauth'

describe('OAuth signup redirectTo', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('login OAuth does not attach signup params', () => {
    const opts = getGoogleOAuthOptions()
    expect(opts.redirectTo).toBe('https://app.example/auth/callback')
    expect(opts.queryParams).toEqual({ prompt: 'select_account' })
    expect(parseOAuthSignupParamsFromSearch(new URL(opts.redirectTo).search).signupRoute).toBeNull()
    expect(parseOAuthSignupParamsFromSearch(new URL(opts.redirectTo).search).signupRole).toBeNull()
  })

  it('signup OAuth encodes route and role on redirectTo only', () => {
    const redirectTo = buildAuthCallbackUrl({ signupRole: 'student', signupRoute: 'non_student' })
    expect(redirectTo).toBe(
      'https://app.example/auth/callback?signup_route=non_student&signup_role=student',
    )
    const opts = getGoogleOAuthOptions({ signupRole: 'student', signupRoute: 'non_student' })
    expect(opts.redirectTo).toBe(redirectTo)
    expect(opts.queryParams).toEqual({ prompt: 'select_account' })
    const parsed = parseOAuthSignupParamsFromSearch(new URL(redirectTo).search)
    expect(parsed.signupRoute).toBe('non_student')
    expect(parsed.signupRole).toBe('student')
  })

  it('landlord signup omits signup_route on redirectTo', () => {
    const redirectTo = buildAuthCallbackUrl({ signupRole: 'landlord' })
    expect(redirectTo).toBe('https://app.example/auth/callback?signup_role=landlord')
    const parsed = parseOAuthSignupParamsFromSearch(new URL(redirectTo).search)
    expect(parsed.signupRoute).toBeNull()
    expect(parsed.signupRole).toBe('landlord')
  })
})
