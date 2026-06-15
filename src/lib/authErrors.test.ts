import { describe, expect, it } from 'vitest'
import { formatAuthLoginErrorMessage, isStaleOrInvalidJwtUserError } from './authErrors'

describe('formatAuthLoginErrorMessage', () => {
  it('maps network failures to friendly copy', () => {
    expect(
      formatAuthLoginErrorMessage(new Error('Failed to fetch (cqakltqzqrxnmxfbqatx.supabase.co)')),
    ).toBe(
      "We couldn't connect right now. Check your internet connection, try disabling ad blockers for this site, and sign in again.",
    )
  })

  it('maps invalid credentials without exposing internals', () => {
    expect(formatAuthLoginErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Incorrect email or password. If you signed up recently, confirm your email first.',
    )
  })

  it('maps unconfirmed email', () => {
    expect(formatAuthLoginErrorMessage(new Error('Email not confirmed'))).toBe(
      'Please confirm your email before signing in. Check your inbox (and spam) for the confirmation link.',
    )
  })

  it('hides supabase URLs in unknown errors', () => {
    expect(formatAuthLoginErrorMessage('Gateway timeout at https://foo.supabase.co/auth/v1/token')).toBe(
      'Sign-in failed. Please try again in a moment.',
    )
  })
})

describe('isStaleOrInvalidJwtUserError', () => {
  it('detects stale jwt user errors', () => {
    expect(isStaleOrInvalidJwtUserError('User from sub claim in JWT does not exist')).toBe(true)
  })
})
