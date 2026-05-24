import { describe, expect, it } from 'vitest'
import {
  inferLandlordWizardStep,
  landlordListingBillingStepComplete,
  landlordPaymentStepComplete,
} from './landlordOnboarding'
import type { Database } from './database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function baseProfile(overrides: Partial<LandlordRow> = {}): LandlordRow {
  return {
    id: 'lp1',
    user_id: 'u1',
    first_name: 'Pat',
    last_name: 'Lee',
    phone: '0400000000',
    bio: 'Bio',
    landlord_type: 'individual',
    address: '1 Test St',
    suburb: 'Sydney',
    postcode: '2000',
    state: 'NSW',
    terms_accepted_at: '2026-01-01T00:00:00Z',
    landlord_terms_accepted_at: '2026-01-01T00:00:00Z',
    insurance_acknowledged_at: null,
    onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_customer_id: null,
    ...overrides,
  } as LandlordRow
}

describe('landlordOnboarding payment step', () => {
  it('listing tier completes step 3 with stripe_customer_id only', () => {
    const p = baseProfile({ stripe_customer_id: 'cus_123' })
    expect(landlordListingBillingStepComplete(p)).toBe(true)
    expect(landlordPaymentStepComplete(p, 'listing')).toBe(true)
    expect(inferLandlordWizardStep(p, 'listing')).toBe(4)
  })

  it('listing tier stays on step 3 without card or connect', () => {
    const p = baseProfile()
    expect(inferLandlordWizardStep(p, 'listing')).toBe(3)
  })

  it('managed tier requires connect', () => {
    const p = baseProfile({ stripe_customer_id: 'cus_123' })
    expect(inferLandlordWizardStep(p, 'managed')).toBe(3)
    expect(inferLandlordWizardStep({ ...p, stripe_charges_enabled: true }, 'managed')).toBe(4)
  })
})
