import { describe, expect, it } from 'vitest'
import {
  applyWeeklyRentFromBooking,
  baseRentBreakdownFromBooking,
  buildRentAgreedOverridePatch,
  parseWeeklyRentAud,
  rentBreakdownWithOverride,
} from './rentAgreedOverride.js'
import { recomputeBondForAgreedRent } from './bookingBondAmount.js'

const baseBooking = {
  id: 'b1',
  status: 'pending_confirmation',
  service_tier_at_request: 'listing',
  stripe_payment_intent_id: null,
  weekly_rent: 450,
  rent_breakdown: { base: 400, couple: 50 },
  bond_amount: 1800,
  move_in_date: '2026-07-01',
  start_date: '2026-07-01',
}

const property = {
  id: 'p1',
  bond_weeks: 4,
  bond_is_fixed: false,
  bond_fixed_amount: null,
  state: 'QLD',
  property_type: 'private_room_landlord_on_site',
  is_registered_rooming_house: false,
}

describe('buildRentAgreedOverridePatch', () => {
  it('rejects agreed rent above apply cap', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 460, 'discount', 'll1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('rent_exceeds_apply_cap')
  })

  it('no-ops when unchanged without bond override', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 450, 'same', 'll1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unchanged')
  })

  it('builds patch on valid lower rent with weeks bond', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 400, 'Longer lease', 'll1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.weekly_rent).toBe(400)
    expect(result.patch.bond_amount).toBe(1600)
  })

  it('accepts bond-only override when rent unchanged', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 450, 'Bond tweak', 'll1', {
      enabled: true,
      weeks: 2,
      fixed: null,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.bond_amount).toBe(900)
  })
})

describe('bond recompute', () => {
  it('re-derives weeks bond at agreed rent', () => {
    expect(recomputeBondForAgreedRent(property, 1800, 450, 400, {})).toBe(1600)
  })
})
