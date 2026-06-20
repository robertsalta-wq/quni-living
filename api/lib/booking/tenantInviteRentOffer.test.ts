import { describe, expect, it } from 'vitest'
import { applyTenantInviteRentOffer } from './tenantInviteRentOffer.js'

const property = {
  bond: 1800,
  state: 'QLD',
  property_type: 'private_room_landlord_on_site',
  is_registered_rooming_house: false,
}

describe('applyTenantInviteRentOffer', () => {
  it('passes through listing rent when invite has no offer', () => {
    const listing = {
      weeklyRent: 450,
      breakdownAud: { base: 400, couple: 50 },
    }
    const result = applyTenantInviteRentOffer(listing, property, null, '2026-07-01')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.weeklyRent).toBe(450)
    expect(result.bondAmount).toBe(1800)
    expect(result.inviteOfferApplied).toBe(false)
  })

  it('applies lower fixed offer and scales bond', () => {
    const listing = {
      weeklyRent: 450,
      breakdownAud: { base: 400, couple: 50 },
    }
    const result = applyTenantInviteRentOffer(
      listing,
      property,
      { offered_weekly_rent: 400, offer_reason: 'Welcome offer' },
      '2026-07-01',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.weeklyRent).toBe(400)
    expect(result.bondAmount).toBe(1600)
    expect(result.inviteOfferApplied).toBe(true)
    expect(result.breakdownAud).toMatchObject({
      base: 400,
      couple: 50,
      override_applied: true,
      apply_weekly_rent: 450,
      agreed_weekly_rent: 400,
      invite_offer_applied: true,
    })
  })

  it('rejects offer above listing rent', () => {
    const result = applyTenantInviteRentOffer(
      { weeklyRent: 400, breakdownAud: { base: 400 } },
      property,
      { offered_weekly_rent: 450 },
      '2026-07-01',
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('invite_offer_exceeds_listing')
  })
})
