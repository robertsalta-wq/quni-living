import { describe, expect, it } from 'vitest'
import {
  occupancyPricesForSave,
  persistedAudMatches,
  roomOffersTogetherTotal,
  togetherTotalFromStored,
} from './roomTogetherWeeklyRent'

describe('roomOffersTogetherTotal', () => {
  it('is on for a private room and off for a shared room or entire place', () => {
    expect(roomOffersTogetherTotal('private_room_landlord_off_site')).toBe(true)
    expect(roomOffersTogetherTotal('private_room_landlord_on_site')).toBe(true)
    expect(roomOffersTogetherTotal('shared_room')).toBe(false)
    expect(roomOffersTogetherTotal('entire_property')).toBe(false)
  })
})

describe('occupancyPricesForSave', () => {
  it('keeps a shared room on max people and the surcharge, with no together total', () => {
    const result = occupancyPricesForSave({
      propertyType: 'shared_room',
      rentPerWeek: 300,
      maxOccupants: 2,
      coupleSurcharge: 50,
      togetherEnabled: true,
      togetherWeeklyRent: 900,
    })
    expect(result).toEqual({
      ok: true,
      fields: {
        max_occupants: 2,
        couple_surcharge_per_week: 50,
        together_weekly_rent: null,
      },
    })
  })

  it('writes a together total and the same booking extra for a private room', () => {
    const result = occupancyPricesForSave({
      propertyType: 'private_room_landlord_off_site',
      rentPerWeek: 500,
      maxOccupants: 1,
      coupleSurcharge: null,
      togetherEnabled: true,
      togetherWeeklyRent: 600,
    })
    expect(result).toEqual({
      ok: true,
      fields: {
        max_occupants: 2,
        couple_surcharge_per_week: 100,
        together_weekly_rent: 600,
      },
    })
  })

  it('clears the extra when two people pay the same as one person', () => {
    const result = occupancyPricesForSave({
      propertyType: 'private_room_landlord_on_site',
      rentPerWeek: 400,
      maxOccupants: 2,
      coupleSurcharge: 80,
      togetherEnabled: true,
      togetherWeeklyRent: 400,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.couple_surcharge_per_week).toBeNull()
    expect(result.fields.together_weekly_rent).toBe(400)
    expect(result.fields.max_occupants).toBe(2)
  })

  it('turns two together off without changing a one-person booking', () => {
    const result = occupancyPricesForSave({
      propertyType: 'private_room_landlord_off_site',
      rentPerWeek: 500,
      maxOccupants: 2,
      coupleSurcharge: 100,
      togetherEnabled: false,
      togetherWeeklyRent: 600,
    })
    expect(result).toEqual({
      ok: true,
      fields: {
        max_occupants: 1,
        couple_surcharge_per_week: null,
        together_weekly_rent: null,
      },
    })
  })

  it('rejects a together total below the one-person rent', () => {
    const result = occupancyPricesForSave({
      propertyType: 'private_room_landlord_off_site',
      rentPerWeek: 500,
      maxOccupants: 1,
      coupleSurcharge: null,
      togetherEnabled: true,
      togetherWeeklyRent: 450,
    })
    expect(result.ok).toBe(false)
  })
})

describe('togetherTotalFromStored', () => {
  it('prefers a stored together total', () => {
    expect(
      togetherTotalFromStored({
        rentPerWeek: 500,
        maxOccupants: 2,
        coupleSurcharge: 100,
        togetherWeeklyRent: 640,
      }),
    ).toEqual({ enabled: true, total: '640' })
  })

  it('rebuilds the total from rent plus the surcharge when the column is empty', () => {
    expect(
      togetherTotalFromStored({
        rentPerWeek: 500,
        maxOccupants: 2,
        coupleSurcharge: 100,
        togetherWeeklyRent: null,
      }),
    ).toEqual({ enabled: true, total: '600' })
  })
})

describe('persistedAudMatches', () => {
  it('treats a numeric string from the database as the same amount', () => {
    expect(persistedAudMatches(600, '600.00')).toBe(true)
    expect(persistedAudMatches(null, null)).toBe(true)
    expect(persistedAudMatches(600, null)).toBe(false)
  })
})
