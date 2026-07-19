import { describe, expect, it } from 'vitest'
import { NON_DISCRIMINATION_POLICY_VERSION } from './nonDiscriminationPolicy'
import { landlordOverviewFunnel } from './landlordOverviewFunnel'
import type { Database } from './database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function baseProfile(overrides: Partial<LandlordRow> = {}): LandlordRow {
  return {
    id: 'lp1',
    user_id: 'u1',
    first_name: 'Marcus',
    last_name: 'Wong',
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
    stripe_payouts_enabled: false,
    stripe_customer_id: null,
    admin_override_verified: false,
    avatar_url: null,
    residence_location: null,
    ...overrides,
  } as LandlordRow
}

describe('landlordOverviewFunnel', () => {
  it('marks profile incomplete with Account current when publish gate open', () => {
    const funnel = landlordOverviewFunnel(baseProfile({ first_name: null, phone: null }), 0)
    expect(funnel.profileComplete).toBe(false)
    expect(funnel.steps[0]?.state).toBe('current')
    expect(funnel.stepOfTwoLabel).toBe('Step 1 of 2')
  })

  it('marks profile complete when listing is live with payouts and identity', () => {
    const funnel = landlordOverviewFunnel(
      baseProfile({
        stripe_charges_enabled: true,
        stripe_payouts_enabled: true,
      }),
      1,
    )
    expect(funnel.profileComplete).toBe(true)
    expect(funnel.payoutsEnabled).toBe(true)
  })
})
