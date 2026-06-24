import { describe, expect, it } from 'vitest'
import {
  validateWorkplaceLocationFields,
  workplaceLocationFieldsTouched,
  workplaceLocationUpdatePayload,
} from './workplaceLocationSave'

describe('workplaceLocationUpdatePayload', () => {
  it('saves address text with null coordinates when geocode misses', () => {
    const payload = workplaceLocationUpdatePayload(
      {
        label: 'Office',
        address: '1 Unknown Lane',
        suburb: 'Nowhere',
        state: 'NSW',
        postcode: '2000',
      },
      null,
      '2026-06-24T12:00:00.000Z',
    )
    expect(payload.workplace_suburb).toBe('Nowhere')
    expect(payload.workplace_latitude).toBeNull()
    expect(payload.workplace_longitude).toBeNull()
    expect(payload.workplace_geocoded_at).toBeNull()
  })

  it('stores coordinates when geocode succeeds', () => {
    const payload = workplaceLocationUpdatePayload(
      {
        label: '',
        address: '',
        suburb: 'Parramatta',
        state: 'NSW',
        postcode: '2150',
      },
      { lat: -33.815, lon: 151.0 },
      '2026-06-24T12:00:00.000Z',
    )
    expect(payload.workplace_latitude).toBe(-33.815)
    expect(payload.workplace_longitude).toBe(151.0)
    expect(payload.workplace_geocoded_at).toBe('2026-06-24T12:00:00.000Z')
  })
})

describe('workplace location field helpers', () => {
  const empty = { label: '', address: '', suburb: '', state: 'NSW', postcode: '' }

  it('workplaceLocationFieldsTouched is false when all blank', () => {
    expect(workplaceLocationFieldsTouched(empty)).toBe(false)
  })

  it('workplaceLocationFieldsTouched is true when any field has content', () => {
    expect(workplaceLocationFieldsTouched({ ...empty, suburb: 'Parramatta' })).toBe(true)
  })

  it('validateWorkplaceLocationFields requires suburb, state and postcode', () => {
    expect(validateWorkplaceLocationFields(empty)).toMatch(/Suburb, state and postcode/)
    expect(
      validateWorkplaceLocationFields({ ...empty, suburb: 'Parramatta', state: 'NSW', postcode: '2150' }),
    ).toBeNull()
  })
})
