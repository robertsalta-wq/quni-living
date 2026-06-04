import { describe, expect, it } from 'vitest'
import {
  ft6600LandlordResidenceLine,
  hasManagingAgentForFt6600,
  missingFt6600LandlordScheduleFields,
  nswManagedFt6600LeaseGenerationBlocked,
} from './ft6600LandlordSchedule.js'

describe('ft6600LandlordSchedule', () => {
  it('hasManagingAgent follows service tier only', () => {
    expect(hasManagingAgentForFt6600('listing')).toBe(false)
    expect(hasManagingAgentForFt6600('managed')).toBe(true)
  })

  it('listing requires full service address; managed does not', () => {
    const base = {
      first_name: 'Quinn',
      last_name: 'Lee',
      phone: '+61400000000',
      state: 'NSW',
      address: '1 Test St',
      suburb: 'Ryde',
      postcode: '2112',
    }
    expect(missingFt6600LandlordScheduleFields(base, 'listing')).toEqual([])
    expect(missingFt6600LandlordScheduleFields({ ...base, address: '' }, 'listing')).toContain(
      'Landlord street address for service of notices',
    )
    expect(missingFt6600LandlordScheduleFields({ ...base, address: '' }, 'managed')).toEqual([])
  })

  it('non-NSW landlords need residence line (free text)', () => {
    expect(
      missingFt6600LandlordScheduleFields(
        { first_name: 'A', last_name: 'B', phone: '1', state: 'VIC', address: 'x', suburb: 'y', postcode: '3000' },
        'listing',
      ),
    ).toEqual([])
    expect(
      missingFt6600LandlordScheduleFields(
        { first_name: 'A', last_name: 'B', phone: '1', state: 'VIC', address: 'x', suburb: 'y', postcode: '3000' },
        'managed',
      ),
    ).toEqual([])
    expect(
      ft6600LandlordResidenceLine({ state: 'VIC', residence_location: 'Victoria' }),
    ).toBe('Victoria')
    expect(ft6600LandlordResidenceLine({ state: 'France', residence_location: 'France' })).toBe('France')
    expect(
      missingFt6600LandlordScheduleFields(
        { first_name: 'A', last_name: 'B', phone: '1', state: '', residence_location: '' },
        'managed',
      ),
    ).toContain('State/Territory or country of residence (non-NSW landlords)')
  })

  it('blocks NSW T2 managed FT6600 generation (dormant path)', () => {
    expect(
      nswManagedFt6600LeaseGenerationBlocked({
        propertyState: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
        serviceTier: 'managed',
      }),
    ).toBe(true)
    expect(
      nswManagedFt6600LeaseGenerationBlocked({
        propertyState: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
        serviceTier: 'listing',
      }),
    ).toBe(false)
    expect(
      nswManagedFt6600LeaseGenerationBlocked({
        propertyState: 'QLD',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
        serviceTier: 'managed',
      }),
    ).toBe(false)
  })
})
