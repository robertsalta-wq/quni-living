import { describe, expect, it } from 'vitest'
import {
  landlordHostIdentityReadyForConfirm,
  mergeVerifiedIntoLandlordUpdate,
  verifiedFromStripeChargesEnabled,
} from './landlordVerifiedSync.js'

describe('verifiedFromStripeChargesEnabled', () => {
  it('is true only when charges are enabled', () => {
    expect(verifiedFromStripeChargesEnabled(true)).toBe(true)
    expect(verifiedFromStripeChargesEnabled(false)).toBe(false)
    expect(verifiedFromStripeChargesEnabled(null)).toBe(false)
  })
})

describe('mergeVerifiedIntoLandlordUpdate', () => {
  const account = { charges_enabled: true, payouts_enabled: true, details_submitted: true }

  it('sets verified from charges when no admin override', () => {
    expect(mergeVerifiedIntoLandlordUpdate(account, { admin_override_verified: false })).toEqual({
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_connect_details_submitted: true,
      verified: true,
    })
  })

  it('skips verified when admin override is set', () => {
    expect(mergeVerifiedIntoLandlordUpdate(account, { admin_override_verified: true })).toEqual({
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      stripe_connect_details_submitted: true,
    })
  })

  it('clears verified when charges disabled and no override', () => {
    expect(
      mergeVerifiedIntoLandlordUpdate(
        { charges_enabled: false, payouts_enabled: false, details_submitted: true },
        { admin_override_verified: false },
      ).verified,
    ).toBe(false)
  })
})

describe('landlordHostIdentityReadyForConfirm', () => {
  it('listing: true when Stripe charges enabled', () => {
    expect(
      landlordHostIdentityReadyForConfirm({ stripe_charges_enabled: true, admin_override_verified: false }, {
        tier: 'listing',
      }),
    ).toBe(true)
  })

  it('listing: true when admin override set without Stripe', () => {
    expect(
      landlordHostIdentityReadyForConfirm({ stripe_charges_enabled: false, admin_override_verified: true }, {
        tier: 'listing',
      }),
    ).toBe(true)
  })

  it('managed: false when only admin override is set', () => {
    expect(
      landlordHostIdentityReadyForConfirm({ stripe_charges_enabled: false, admin_override_verified: true }, {
        tier: 'managed',
      }),
    ).toBe(false)
  })
})
