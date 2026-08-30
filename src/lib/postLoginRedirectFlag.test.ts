import { describe, expect, it } from 'vitest'
import {
  authEventArmsPostLoginRedirect,
  authEventClearsPostLoginRedirect,
  authEventIsExistingSessionSignedIn,
} from './postLoginRedirectFlag'

describe('postLoginRedirectFlag', () => {
  it('arms only on SIGNED_IN', () => {
    expect(authEventArmsPostLoginRedirect('SIGNED_IN')).toBe(true)
    expect(authEventArmsPostLoginRedirect('INITIAL_SESSION')).toBe(false)
    expect(authEventArmsPostLoginRedirect('TOKEN_REFRESHED')).toBe(false)
    expect(authEventArmsPostLoginRedirect('SIGNED_OUT')).toBe(false)
  })

  it('does not arm when SIGNED_IN is the same already-established user', () => {
    expect(authEventIsExistingSessionSignedIn('SIGNED_IN', 'user-1', 'user-1')).toBe(true)
    expect(authEventArmsPostLoginRedirect('SIGNED_IN', 'user-1', 'user-1')).toBe(false)
  })

  it('arms SIGNED_IN when the user id changed (account switch)', () => {
    expect(authEventIsExistingSessionSignedIn('SIGNED_IN', 'user-2', 'user-1')).toBe(false)
    expect(authEventArmsPostLoginRedirect('SIGNED_IN', 'user-2', 'user-1')).toBe(true)
  })

  it('arms SIGNED_IN when there is no established user (real login)', () => {
    expect(authEventIsExistingSessionSignedIn('SIGNED_IN', 'user-1', null)).toBe(false)
    expect(authEventArmsPostLoginRedirect('SIGNED_IN', 'user-1', null)).toBe(true)
  })

  it('does not treat TOKEN_REFRESHED as an existing-session SIGNED_IN', () => {
    expect(authEventIsExistingSessionSignedIn('TOKEN_REFRESHED', 'user-1', 'user-1')).toBe(false)
  })

  it('clears only on SIGNED_OUT - not INITIAL_SESSION (OAuth boot race)', () => {
    expect(authEventClearsPostLoginRedirect('SIGNED_OUT')).toBe(true)
    expect(authEventClearsPostLoginRedirect('INITIAL_SESSION')).toBe(false)
    expect(authEventClearsPostLoginRedirect('SIGNED_IN')).toBe(false)
  })
})
