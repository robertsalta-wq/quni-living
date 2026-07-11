import { describe, expect, it } from 'vitest'
import { resolvePendingAccommodationVerificationRoute } from './applyPendingAccommodationRoute'
import {
  applyPendingRouteInMemory,
} from './authCallbackProfileReconciliation'
import type { StudentProfileRow } from './authProfile'
import {
  getPostLoginRedirectDestination,
  INCOMPLETE_RENTER_DESTINATION,
} from './authProfile'
import type { User } from '@supabase/supabase-js'
import { renterOnboardingIncomplete } from './studentOnboarding'

describe('resolvePendingAccommodationVerificationRoute (Stage 1)', () => {
  it('always returns null — route deferred to profile', () => {
    expect(resolvePendingAccommodationVerificationRoute(undefined, 'student', 'non_student')).toBeNull()
    expect(resolvePendingAccommodationVerificationRoute('2026-05-31T11:50:00Z', 'non_student', null)).toBeNull()
  })
})

describe('applyPendingRouteInMemory backward compat', () => {
  function studentRow(route: 'student' | 'non_student' | null): StudentProfileRow {
    return {
      user_id: 'user-1',
      accommodation_verification_route: route,
    } as StudentProfileRow
  }

  it('does not overwrite an existing route when pending is null', () => {
    const sp = studentRow('student')
    const { sp: next } = applyPendingRouteInMemory(sp, null)
    expect(next?.accommodation_verification_route).toBe('student')
  })

  it('does not apply route when pending is null and row route is null', () => {
    const sp = studentRow(null)
    const { sp: next } = applyPendingRouteInMemory(sp, null)
    expect(next?.accommodation_verification_route).toBeNull()
  })

  it('still preserves existing route when legacy pending value would have applied', () => {
    const sp = studentRow('non_student')
    const { sp: next, clearStorage } = applyPendingRouteInMemory(sp, 'student')
    expect(next?.accommodation_verification_route).toBe('non_student')
    expect(clearStorage).toBe(true)
  })
})

describe('renter post-auth routing (Stage 1)', () => {
  const user = { id: 'u1' } as User

  it('sends incomplete renters to profile, not onboarding wizard', () => {
    const sp = {
      accommodation_verification_route: null,
      uni_email_verified: false,
    } as StudentProfileRow
    expect(renterOnboardingIncomplete(sp, user.id)).toBe(true)
    expect(getPostLoginRedirectDestination(user, 'renter', sp)).toBe(INCOMPLETE_RENTER_DESTINATION)
  })

  it('sends complete renters to dashboard', () => {
    const sp = {
      accommodation_verification_route: 'non_student',
      renter_situation: 'working',
      first_name: 'A',
      last_name: 'B',
      gender: 'female',
      phone: '0412345678',
      budget_min_per_week: 200,
      budget_max_per_week: 300,
      emergency_contact_name: 'Pat',
      emergency_contact_phone: '0498765432',
      terms_accepted_at: '2026-01-01T00:00:00Z',
    } as StudentProfileRow
    expect(renterOnboardingIncomplete(sp, user.id)).toBe(false)
    expect(getPostLoginRedirectDestination(user, 'renter', sp)).toBe('/student-dashboard')
  })
})
