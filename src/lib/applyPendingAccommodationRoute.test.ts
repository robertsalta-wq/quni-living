import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePendingAccommodationVerificationRoute } from './applyPendingAccommodationRoute'
import {
  clearQuniAccommodationVerificationRoute,
  setQuniAccommodationVerificationRoute,
} from './quniAccommodationRoute'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  })
  return store
}

describe('resolvePendingAccommodationVerificationRoute', () => {
  beforeEach(() => {
    mockLocalStorage()
    clearQuniAccommodationVerificationRoute()
  })

  afterEach(() => {
    clearQuniAccommodationVerificationRoute()
    vi.unstubAllGlobals()
  })

  it('always returns null (route deferred to profile after Stage 1)', () => {
    setQuniAccommodationVerificationRoute('non_student')
    expect(
      resolvePendingAccommodationVerificationRoute(
        '2026-05-31T11:50:00Z',
        'non_student',
        'student',
      ),
    ).toBeNull()
    expect(resolvePendingAccommodationVerificationRoute(undefined, 'non_student', null)).toBeNull()
    expect(resolvePendingAccommodationVerificationRoute(undefined, null, null)).toBeNull()
  })
})
