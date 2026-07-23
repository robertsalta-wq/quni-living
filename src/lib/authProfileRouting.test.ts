import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { NON_DISCRIMINATION_POLICY_VERSION } from './nonDiscriminationPolicy'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'
import {
  getPostLoginRedirectDestination,
  INCOMPLETE_RENTER_DESTINATION,
  resolvePostAuthOneShotDestination,
  type LandlordProfileRow,
  type StudentProfileRow,
} from './authProfileRouting'

const user = { id: 'u1' } as User

function completeRenter(): StudentProfileRow {
  return {
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
}

function incompleteRenter(): StudentProfileRow {
  return {
    accommodation_verification_route: null,
    uni_email_verified: false,
  } as StudentProfileRow
}

function completeLandlord(): LandlordProfileRow {
  return {
    id: 'lp1',
    user_id: 'u1',
    first_name: 'Pat',
    last_name: 'Lee',
    phone: '0400000000',
    bio: 'A short landlord bio.',
    landlord_type: 'individual',
    address: '1 Test St',
    suburb: 'Sydney',
    postcode: '2000',
    state: 'NSW',
    terms_accepted_at: '2026-01-01T00:00:00Z',
    landlord_terms_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_accepted_at: '2026-01-01T00:00:00Z',
    non_discrimination_policy_version: NON_DISCRIMINATION_POLICY_VERSION,
    onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_customer_id: null,
    admin_override_verified: false,
    avatar_url: null,
    residence_location: null,
  } as LandlordProfileRow
}

function incompleteLandlord(): LandlordProfileRow {
  return {
    ...completeLandlord(),
    address: null,
  } as LandlordProfileRow
}

describe('getPostLoginRedirectDestination (landlord / admin)', () => {
  it('sends publish-complete landlords to dashboard', () => {
    expect(getPostLoginRedirectDestination(user, 'landlord', completeLandlord())).toBe(
      '/landlord/dashboard',
    )
  })

  it('sends incomplete landlords to profile tab', () => {
    expect(getPostLoginRedirectDestination(user, 'landlord', incompleteLandlord())).toBe(
      landlordDashboardProfilePath(),
    )
  })

  it('sends admins to /admin', () => {
    expect(getPostLoginRedirectDestination(user, 'admin', null)).toBe('/admin')
  })
})

describe('resolvePostAuthOneShotDestination', () => {
  it('completed renter with no stored path → dashboard; consume is called', () => {
    const consumeStoredRedirect = vi.fn(() => null)
    const dest = resolvePostAuthOneShotDestination(user, 'renter', completeRenter(), {
      consumeStoredRedirect,
    })
    expect(dest).toBe('/student-dashboard')
    expect(consumeStoredRedirect).toHaveBeenCalledTimes(1)
  })

  it('completed landlord with no stored path → dashboard', () => {
    const consumeStoredRedirect = vi.fn(() => null)
    const dest = resolvePostAuthOneShotDestination(user, 'landlord', completeLandlord(), {
      consumeStoredRedirect,
    })
    expect(dest).toBe('/landlord/dashboard')
    expect(consumeStoredRedirect).toHaveBeenCalledTimes(1)
  })

  it('completed renter with stored path → stored path', () => {
    const consumeStoredRedirect = vi.fn(() => '/listings/foo')
    const dest = resolvePostAuthOneShotDestination(user, 'renter', completeRenter(), {
      consumeStoredRedirect,
    })
    expect(dest).toBe('/listings/foo')
    expect(consumeStoredRedirect).toHaveBeenCalledTimes(1)
  })

  it('incomplete renter with stored path → onboarding; consume is NOT called', () => {
    const consumeStoredRedirect = vi.fn(() => '/listings/foo')
    const dest = resolvePostAuthOneShotDestination(user, 'renter', incompleteRenter(), {
      consumeStoredRedirect,
    })
    expect(dest).toBe(INCOMPLETE_RENTER_DESTINATION)
    expect(consumeStoredRedirect).not.toHaveBeenCalled()
  })

  it('incomplete landlord → profile path; consume is NOT called', () => {
    const consumeStoredRedirect = vi.fn(() => '/listings/foo')
    const dest = resolvePostAuthOneShotDestination(user, 'landlord', incompleteLandlord(), {
      consumeStoredRedirect,
    })
    expect(dest).toBe(landlordDashboardProfilePath())
    expect(consumeStoredRedirect).not.toHaveBeenCalled()
  })
})
