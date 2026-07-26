import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  abandonStaleTenantInviteUnlessActive,
  resolveTenantInviteSignupHints,
} from './tenantInviteSignupContext'
import { setQuniTenantInviteContext, getQuniTenantInviteToken } from './quniTenantInvite'
import { clearPostAuthRedirect, setPostAuthRedirect } from './postAuthRedirect'

function mockStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

function mockWebStorage() {
  vi.stubGlobal('localStorage', mockStorage())
  vi.stubGlobal('sessionStorage', mockStorage())
}

describe('tenantInviteSignupContext', () => {
  beforeEach(() => {
    mockWebStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears sticky invite when opening generic /signup', () => {
    setQuniTenantInviteContext('tok-abc', 'prop-1', { propertyTitle: 'Room A' })
    expect(getQuniTenantInviteToken()).toBe('tok-abc')

    const hints = resolveTenantInviteSignupHints(new URLSearchParams())
    expect(hints.isTenantInviteFlow).toBe(false)
    expect(getQuniTenantInviteToken()).toBeNull()
  })

  it('keeps invite when signup URL still carries invite signals', () => {
    setQuniTenantInviteContext('tok-abc', 'prop-1', { propertyTitle: 'Room A' })
    const params = new URLSearchParams({
      invited_email: 'renter@example.com',
      redirect: '/booking/prop-1?invite=tok-abc',
    })

    const hints = resolveTenantInviteSignupHints(params)
    expect(hints.isTenantInviteFlow).toBe(true)
    expect(hints.propertyTitle).toBe('Room A')
    expect(getQuniTenantInviteToken()).toBe('tok-abc')
  })

  it('clears sticky invite for explicit landlord signup', () => {
    setQuniTenantInviteContext('tok-abc', 'prop-1', { propertyTitle: 'Room A' })
    const hints = resolveTenantInviteSignupHints(new URLSearchParams('role=landlord'))
    expect(hints.isTenantInviteFlow).toBe(false)
    expect(getQuniTenantInviteToken()).toBeNull()
  })

  it('keeps invite when post-auth redirect still has invite token', () => {
    setQuniTenantInviteContext('tok-abc', 'prop-1')
    setPostAuthRedirect('/booking/prop-1?invite=tok-abc')
    abandonStaleTenantInviteUnlessActive(new URLSearchParams())
    expect(getQuniTenantInviteToken()).toBe('tok-abc')
  })
})
