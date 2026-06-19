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
  bond: 1800,
  state: 'QLD',
  property_type: 'private_room_landlord_on_site',
  is_registered_rooming_house: false,
}

describe('parseWeeklyRentAud', () => {
  it('rejects non-positive values', () => {
    expect(parseWeeklyRentAud(0)).toBeNull()
    expect(parseWeeklyRentAud(-1)).toBeNull()
    expect(parseWeeklyRentAud('abc')).toBeNull()
  })

  it('rounds to cents', () => {
    expect(parseWeeklyRentAud(400.005)).toBe(400.01)
  })
})

describe('applyWeeklyRentFromBooking', () => {
  it('uses apply_weekly_rent after override', () => {
    expect(
      applyWeeklyRentFromBooking(
        { base: 400, override_applied: true, apply_weekly_rent: 450, agreed_weekly_rent: 420 },
        420,
      ),
    ).toBe(450)
  })

  it('falls back to current weekly rent', () => {
    expect(applyWeeklyRentFromBooking({ base: 400, couple: 50 }, 450)).toBe(450)
  })
})

describe('buildRentAgreedOverridePatch', () => {
  it('rejects agreed rent above apply cap', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 460, 'discount', 'll1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('rent_exceeds_apply_cap')
  })

  it('no-ops when unchanged', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 450, 'same', 'll1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unchanged')
  })

  it('builds patch and audit metadata on valid lower rent', async () => {
    const result = await buildRentAgreedOverridePatch(baseBooking, property, 400, 'Longer lease', 'll1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.weekly_rent).toBe(400)
    expect(result.patch.rent_breakdown).toMatchObject({
      base: 400,
      couple: 50,
      override_applied: true,
      apply_weekly_rent: 450,
      agreed_weekly_rent: 400,
    })
    expect(result.eventMetadata.from_weekly_rent_aud).toBe(450)
    expect(result.eventMetadata.to_weekly_rent_aud).toBe(400)
    expect(result.eventMetadata.reason).toBe('Longer lease')
  })

  it('blocks post-accept statuses', async () => {
    const result = await buildRentAgreedOverridePatch(
      { ...baseBooking, status: 'bond_pending' },
      property,
      400,
      'too late',
      'll1',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_booking_status')
  })
})

describe('bond recompute', () => {
  it('scales proportionally from property bond', () => {
    expect(recomputeBondForAgreedRent(1800, 450, 400)).toBe(1600)
  })
})

describe('rentBreakdownWithOverride', () => {
  it('preserves listing breakdown fields', () => {
    const out = rentBreakdownWithOverride({ base: 400, couple: 50 }, 450, 420)
    expect(out).toEqual({
      base: 400,
      couple: 50,
      override_applied: true,
      apply_weekly_rent: 450,
      agreed_weekly_rent: 420,
    })
  })
})

describe('baseRentBreakdownFromBooking', () => {
  it('strips override provenance', () => {
    expect(
      baseRentBreakdownFromBooking({
        base: 400,
        couple: 50,
        override_applied: true,
        apply_weekly_rent: 450,
        agreed_weekly_rent: 420,
      }),
    ).toEqual({ base: 400, couple: 50 })
  })
})
