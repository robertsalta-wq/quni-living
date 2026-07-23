import { describe, expect, it } from 'vitest'
import {
  authEventArmsPostLoginRedirect,
  authEventClearsPostLoginRedirect,
} from './postLoginRedirectFlag'

describe('postLoginRedirectFlag', () => {
  it('arms only on SIGNED_IN', () => {
    expect(authEventArmsPostLoginRedirect('SIGNED_IN')).toBe(true)
    expect(authEventArmsPostLoginRedirect('INITIAL_SESSION')).toBe(false)
    expect(authEventArmsPostLoginRedirect('TOKEN_REFRESHED')).toBe(false)
    expect(authEventArmsPostLoginRedirect('SIGNED_OUT')).toBe(false)
  })

  it('clears only on SIGNED_OUT — not INITIAL_SESSION (OAuth boot race)', () => {
    expect(authEventClearsPostLoginRedirect('SIGNED_OUT')).toBe(true)
    expect(authEventClearsPostLoginRedirect('INITIAL_SESSION')).toBe(false)
    expect(authEventClearsPostLoginRedirect('SIGNED_IN')).toBe(false)
  })
})
