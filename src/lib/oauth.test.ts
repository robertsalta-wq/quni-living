import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOAuthSignupContext,
  parseOAuthSignupParamsFromSearch,
  rememberOAuthSignupContext,
  resolveOAuthSignupParams,
} from './authCallbackParams'
import { getGoogleOAuthOptions } from './oauth'

describe('OAuth signup redirectTo', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => storage.clear(),
    })
    vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('login OAuth uses bare allow-listed callback URL', () => {
    const opts = getGoogleOAuthOptions()
    expect(opts.redirectTo).toBe('https://app.example/auth/callback')
    expect(opts.queryParams).toEqual({ prompt: 'select_account' })
    expect(storage.get('quni_oauth_signup_context')).toBeUndefined()
  })

  it('signup OAuth persists role/route in sessionStorage, not on redirectTo', () => {
    const opts = getGoogleOAuthOptions({ signupRole: 'student', signupRoute: 'non_student' })
    expect(opts.redirectTo).toBe('https://app.example/auth/callback')
    expect(opts.queryParams).toEqual({ prompt: 'select_account' })
    expect(parseOAuthSignupParamsFromSearch(new URL(opts.redirectTo).search).signupRoute).toBeNull()

    const resolved = resolveOAuthSignupParams('')
    expect(resolved.signupRoute).toBe('non_student')
    expect(resolved.signupRole).toBe('student')
  })

  it('landlord signup persists signup_role only', () => {
    getGoogleOAuthOptions({ signupRole: 'landlord' })
    const resolved = resolveOAuthSignupParams('')
    expect(resolved.signupRoute).toBeNull()
    expect(resolved.signupRole).toBe('landlord')
  })

  it('URL signup params take precedence over sessionStorage', () => {
    rememberOAuthSignupContext({ signupRoute: 'student', signupRole: 'student' })
    const resolved = resolveOAuthSignupParams('?signup_route=non_student&signup_role=student')
    expect(resolved.signupRoute).toBe('non_student')
    expect(storage.get('quni_oauth_signup_context')).toBeUndefined()
  })

  it('clearOAuthSignupContext removes stored context', () => {
    rememberOAuthSignupContext({ signupRoute: 'non_student', signupRole: 'student' })
    clearOAuthSignupContext()
    expect(resolveOAuthSignupParams('')).toEqual({ signupRoute: null, signupRole: null })
  })
})
