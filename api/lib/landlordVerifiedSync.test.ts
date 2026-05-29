import { describe, expect, it } from 'vitest'
import { mergeVerifiedIntoLandlordUpdate, verifiedFromStripeChargesEnabled } from './landlordVerifiedSync.js'

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
