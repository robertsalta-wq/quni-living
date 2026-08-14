import { describe, expect, it } from 'vitest'
import {
  EMPTY_NSW_T3_SHARED_AREAS,
  hasAtLeastOneSharedArea,
  nswT3AdditionalChargesError,
  nswT3AdditionalChargesToJson,
  nswT3RoomDescriptionError,
  nswT3SharedAreasError,
  parseNswT3AdditionalCharges,
  parseNswT3SharedAreas,
} from './nswT3ListingFields.js'

describe('nswT3ListingFields', () => {
  it('blocks an empty room description', () => {
    expect(nswT3RoomDescriptionError('')).toMatch(/room description/i)
    expect(nswT3RoomDescriptionError('   ')).toMatch(/room description/i)
    expect(nswT3RoomDescriptionError('Room 3')).toBeNull()
  })

  it('requires at least one shared area and does not default all four on', () => {
    expect(hasAtLeastOneSharedArea(EMPTY_NSW_T3_SHARED_AREAS)).toBe(false)
    expect(nswT3SharedAreasError(EMPTY_NSW_T3_SHARED_AREAS)).toMatch(/at least one/i)
    expect(hasAtLeastOneSharedArea({ ...EMPTY_NSW_T3_SHARED_AREAS, kitchen: true })).toBe(true)
    expect(hasAtLeastOneSharedArea({ ...EMPTY_NSW_T3_SHARED_AREAS, other: 'Yard' })).toBe(true)
  })

  it('parses snake_case shared_areas jsonb', () => {
    expect(parseNswT3SharedAreas({ kitchen: true, common_room: true, other: 'Yard' })).toEqual({
      kitchen: true,
      bathroom: false,
      commonRoom: true,
      laundry: false,
      other: 'Yard',
    })
  })

  it('rejects incomplete charge rows and serialises complete ones', () => {
    expect(
      nswT3AdditionalChargesError([
        { item: 'Power', amount: '$10', whenDue: 'Weekly', howCalculated: '' },
      ]),
    ).toMatch(/how it is calculated/i)
    const rows = parseNswT3AdditionalCharges([
      {
        item: 'Electricity',
        amount: 'Actual cost',
        when_due: 'Monthly',
        how_calculated: 'Equal split of the bill',
      },
      { item: '', amount: '', when_due: '', how_calculated: '' },
    ])
    expect(rows).toHaveLength(1)
    expect(nswT3AdditionalChargesToJson(rows)[0]).toEqual({
      item: 'Electricity',
      amount: 'Actual cost',
      when_due: 'Monthly',
      how_calculated: 'Equal split of the bill',
    })
  })
})
