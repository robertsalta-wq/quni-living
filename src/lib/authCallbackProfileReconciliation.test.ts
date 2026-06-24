import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { resolveRoleAndProfileFromRows, type StudentProfileRow } from './authProfile'
import {
  applyPendingRouteInMemory,
  shouldSkipApplyPendingSignupRole,
} from './authCallbackProfileReconciliation'
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
}

function studentRow(
  overrides: Partial<StudentProfileRow> & Pick<StudentProfileRow, 'user_id'>,
): StudentProfileRow {
  return {
    user_id: overrides.user_id,
    email: overrides.email ?? 's@test.com',
    full_name: overrides.full_name ?? 'Student',
    accommodation_verification_route: overrides.accommodation_verification_route ?? null,
    created_at: overrides.created_at ?? '2026-05-31T12:00:00Z',
    updated_at: overrides.updated_at ?? '2026-05-31T12:00:00Z',
    phone: overrides.phone ?? null,
    date_of_birth: overrides.date_of_birth ?? null,
    university: overrides.university ?? null,
    student_id: overrides.student_id ?? null,
    emergency_contact_name: overrides.emergency_contact_name ?? null,
    emergency_contact_phone: overrides.emergency_contact_phone ?? null,
    terms_accepted_at: overrides.terms_accepted_at ?? null,
    onboarding_complete: overrides.onboarding_complete ?? false,
    profile_photo_url: overrides.profile_photo_url ?? null,
    preferred_move_in_date: overrides.preferred_move_in_date ?? null,
    bio: overrides.bio ?? null,
    id_document_url: overrides.id_document_url ?? null,
    id_verification_status: overrides.id_verification_status ?? null,
    uni_email: overrides.uni_email ?? null,
    uni_email_verified_at: overrides.uni_email_verified_at ?? null,
    non_student_id_type: overrides.non_student_id_type ?? null,
    non_student_id_number: overrides.non_student_id_number ?? null,
    non_student_id_verified_at: overrides.non_student_id_verified_at ?? null,
    step1_complete: overrides.step1_complete ?? false,
    step2_complete: overrides.step2_complete ?? false,
  } as StudentProfileRow
}

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 's@test.com',
    created_at: '2026-05-31T11:50:00Z',
    user_metadata: { role: 'renter' },
    app_metadata: {},
    aud: 'authenticated',
    ...overrides,
  } as User
}

describe('shouldSkipApplyPendingSignupRole', () => {
  it('skips when metadata role is renter and row exists (email confirm path)', () => {
    const sp = studentRow({ user_id: 'user-1' })
    expect(shouldSkipApplyPendingSignupRole('renter', sp)).toBe(true)
  })

  it('does not skip legacy student metadata after contract phase', () => {
    const sp = studentRow({ user_id: 'user-1' })
    expect(shouldSkipApplyPendingSignupRole('student', sp)).toBe(false)
  })

  it('does not skip when student row is missing', () => {
    expect(shouldSkipApplyPendingSignupRole('renter', null)).toBe(false)
  })

  it('does not skip for OAuth landlord mismatch', () => {
    const sp = studentRow({ user_id: 'user-1' })
    expect(shouldSkipApplyPendingSignupRole('landlord', sp)).toBe(false)
    expect(shouldSkipApplyPendingSignupRole(null, sp)).toBe(false)
  })
})

describe('applyPendingRouteInMemory', () => {
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

  it('does not apply pre-auth route from metadata (Stage 1)', () => {
    const sp = studentRow({ user_id: 'user-1', accommodation_verification_route: null })
    const pending = resolvePendingAccommodationVerificationRoute(undefined, 'non_student', null)
    expect(pending).toBeNull()
    const { sp: next, clearStorage } = applyPendingRouteInMemory(sp, pending)
    expect(next?.accommodation_verification_route).toBeNull()
    expect(clearStorage).toBe(false)
  })

  it('does not apply route from localStorage (Stage 1)', () => {
    setQuniAccommodationVerificationRoute('non_student')
    const sp = studentRow({ user_id: 'user-1', accommodation_verification_route: null })
    const pending = resolvePendingAccommodationVerificationRoute(
      '2026-05-31T11:50:00Z',
      'student',
      null,
    )
    expect(pending).toBeNull()
    const { sp: next } = applyPendingRouteInMemory(sp, pending)
    expect(next?.accommodation_verification_route).toBeNull()
  })

  it('does not apply OAuth URL route (Stage 1)', () => {
    setQuniAccommodationVerificationRoute('non_student')
    const sp = studentRow({ user_id: 'user-1', accommodation_verification_route: null })
    const pending = resolvePendingAccommodationVerificationRoute(
      '2026-05-31T11:50:00Z',
      'non_student',
      'student',
    )
    expect(pending).toBeNull()
    const { sp: next } = applyPendingRouteInMemory(sp, pending)
    expect(next?.accommodation_verification_route).toBeNull()
  })

  it('case 6: does not overwrite when stored route is already set', () => {
    const sp = studentRow({
      user_id: 'user-1',
      accommodation_verification_route: 'student',
    })
    const { sp: next, clearStorage } = applyPendingRouteInMemory(sp, 'non_student')
    expect(next?.accommodation_verification_route).toBe('student')
    expect(clearStorage).toBe(true)
  })

  it('case 1/2: no route apply when student row is missing', () => {
    const pending = resolvePendingAccommodationVerificationRoute(undefined, 'student', null)
    const { sp: next, clearStorage } = applyPendingRouteInMemory(null, pending)
    expect(next).toBeNull()
    expect(clearStorage).toBe(false)
  })
})

describe('resolveRoleAndProfileFromRows after reconciliation', () => {
  it('case 1: email signup with existing student row resolves renter role', () => {
    const user = mockUser({ user_metadata: { role: 'renter' } })
    const sp = studentRow({
      user_id: user.id,
      accommodation_verification_route: 'student',
    })
    const result = resolveRoleAndProfileFromRows(user, sp, null)
    expect(result.role).toBe('renter')
    expect(result.profile).toBe(sp)
  })

  it('maps renter JWT metadata to resolved renter role', () => {
    const user = mockUser({ user_metadata: { role: 'renter' } })
    const sp = studentRow({
      user_id: user.id,
      accommodation_verification_route: 'student',
    })
    const result = resolveRoleAndProfileFromRows(user, sp, null)
    expect(result.role).toBe('renter')
    expect(result.profile).toBe(sp)
  })

  it('returns renter role when renter metadata has no profile row yet', () => {
    const user = mockUser({ user_metadata: { role: 'renter' } })
    const result = resolveRoleAndProfileFromRows(user, null, null)
    expect(result.role).toBe('renter')
    expect(result.profile).toBeNull()
  })
})
