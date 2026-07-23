import { describe, expect, it } from 'vitest'
import {
  apexAuthTokenRedirectPath,
  isPasswordRecoveryCallbackHash,
  isPasswordRecoveryCallbackSearch,
  parseAuthTokenHashFromSearch,
  parseRecoveryTokenHashFromSearch,
  parseSignupTokenHashFromSearch,
} from './authCallbackParams'

describe('parseSignupTokenHashFromSearch', () => {
  it('parses signup token_hash params', () => {
    expect(
      parseSignupTokenHashFromSearch('?token_hash=abc123&type=signup'),
    ).toEqual({ token_hash: 'abc123', type: 'signup' })
  })

  it('ignores email type (must stay signup)', () => {
    expect(parseSignupTokenHashFromSearch('?token_hash=abc&type=email')).toBeNull()
  })

  it('ignores missing token_hash', () => {
    expect(parseSignupTokenHashFromSearch('?type=signup')).toBeNull()
  })
})

describe('parseRecoveryTokenHashFromSearch', () => {
  it('parses recovery token_hash params', () => {
    expect(
      parseRecoveryTokenHashFromSearch('?token_hash=xyz789&type=recovery'),
    ).toEqual({ token_hash: 'xyz789', type: 'recovery' })
  })

  it('ignores signup type', () => {
    expect(parseRecoveryTokenHashFromSearch('?token_hash=abc&type=signup')).toBeNull()
  })
})

describe('parseAuthTokenHashFromSearch', () => {
  it('accepts signup and recovery', () => {
    expect(parseAuthTokenHashFromSearch('?token_hash=a&type=signup')).toEqual({
      token_hash: 'a',
      type: 'signup',
    })
    expect(parseAuthTokenHashFromSearch('?token_hash=b&type=recovery')).toEqual({
      token_hash: 'b',
      type: 'recovery',
    })
  })
})

describe('apexAuthTokenRedirectPath', () => {
  it('forwards apex token_hash links to /auth/callback', () => {
    expect(apexAuthTokenRedirectPath('/', '?token_hash=abc&type=signup')).toBe(
      '/auth/callback?token_hash=abc&type=signup',
    )
  })

  it('forwards implicit OAuth hash on Site URL `/` to /auth/callback', () => {
    expect(apexAuthTokenRedirectPath('/', '', '#access_token=tok&refresh_token=r')).toBe(
      '/auth/callback#access_token=tok&refresh_token=r',
    )
    expect(apexAuthTokenRedirectPath('/', '', 'access_token=tok')).toBe(
      '/auth/callback#access_token=tok',
    )
  })

  it('ignores non-apex paths and unrelated query strings', () => {
    expect(apexAuthTokenRedirectPath('/listings', '?token_hash=abc&type=signup')).toBeNull()
    expect(apexAuthTokenRedirectPath('/', '?foo=bar')).toBeNull()
    expect(apexAuthTokenRedirectPath('/', '', '#foo=bar')).toBeNull()
  })
})

describe('password recovery callback detection', () => {
  it('detects recovery in search', () => {
    expect(isPasswordRecoveryCallbackSearch('?type=recovery&token_hash=x')).toBe(true)
    expect(isPasswordRecoveryCallbackSearch('?type=signup')).toBe(false)
  })

  it('detects recovery in hash', () => {
    expect(isPasswordRecoveryCallbackHash('#access_token=x&type=recovery')).toBe(true)
    expect(isPasswordRecoveryCallbackHash('#type=signup')).toBe(false)
  })
})
