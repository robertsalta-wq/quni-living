import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePendingAccommodationVerificationRoute } from './applyPendingAccommodationRoute'
import {
  clearQuniAccommodationVerificationRoute,
  setQuniAccommodationVerificationRoute,
} from './quniAccommodationRoute'

function mockLocalStorage() {
  const store = new Map<string, string>()
  const ls = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
  vi.stubGlobal('localStorage', ls)
  return store
}

describe('resolvePendingAccommodationVerificationRoute', () => {
  beforeEach(() => {
    mockLocalStorage()
    clearQuniAccommodationVerificationRoute()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T12:00:00Z'))
  })

  afterEach(() => {
    clearQuniAccommodationVerificationRoute()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('prefers OAuth redirect URL over localStorage and metadata', () => {
    setQuniAccommodationVerificationRoute('non_student')
    expect(
      resolvePendingAccommodationVerificationRoute(
        '2026-05-31T11:50:00Z',
        'non_student',
        'student',
      ),
    ).toBe('student')
  })

  it('prefers recent localStorage over metadata when URL absent', () => {
    setQuniAccommodationVerificationRoute('non_student')
    expect(
      resolvePendingAccommodationVerificationRoute(
        '2026-05-31T11:50:00Z',
        'student',
        null,
      ),
    ).toBe('non_student')
  })

  it('falls back to metadata when localStorage is stale', () => {
    setQuniAccommodationVerificationRoute('non_student')
    expect(
      resolvePendingAccommodationVerificationRoute(
        '2026-05-30T12:00:00Z',
        'non_student',
        null,
      ),
    ).toBe('non_student')
    expect(localStorage.getItem('quni_accommodation_verification_route')).toBeNull()
  })

  it('uses metadata for email signup without localStorage', () => {
    expect(
      resolvePendingAccommodationVerificationRoute(undefined, 'non_student', null),
    ).toBe('non_student')
  })

  it('returns null when nothing pending', () => {
    expect(resolvePendingAccommodationVerificationRoute(undefined, null, null)).toBeNull()
  })
})
