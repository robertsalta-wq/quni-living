import { describe, expect, it } from 'vitest'
import {
  signedTenancyAgreementDownloadFilename,
  statutoryRentBankTransferCopy,
  tenancyAgreementExplainerCopy,
} from './jurisdictionCopy.js'

describe('tenancyAgreementExplainerCopy', () => {
  it('returns NSW T2 copy for off-site private room', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'NSW',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    })
    expect(copy?.headline).toContain('NSW-compliant')
    expect(copy?.body).toContain('Residential Tenancies Act 2010 (NSW)')
  })

  it('returns QLD T2 copy for entire property', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'QLD',
      property_type: 'entire_property',
      is_registered_rooming_house: false,
    })
    expect(copy?.headline).toContain('Queensland')
    expect(copy?.body).toContain('Rooming Accommodation Act 2008')
  })

  it('returns null for QLD off-site room (Form R18 not generated)', () => {
    expect(
      tenancyAgreementExplainerCopy({
        state: 'QLD',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: false,
      }),
    ).toBeNull()
    expect(
      tenancyAgreementExplainerCopy({
        state: 'QLD',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: true,
      }),
    ).toBeNull()
  })

  it('returns NSW T3 boarding-house copy', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'NSW',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: true,
    })
    expect(copy?.headline).toContain('Standard Occupancy Agreement')
    expect(copy?.body).toContain('Boarding Houses Act 2012')
  })

  it('returns QLD occupancy copy for on-site ≤3 rooms', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'QLD',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
      rooms_rented_to_residents: 3,
    })
    expect(copy?.headline).toContain('occupancy agreement')
  })

  it('returns null for QLD on-site 4+ (Form R18 not generated)', () => {
    expect(
      tenancyAgreementExplainerCopy({
        state: 'QLD',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
        rooms_rented_to_residents: 4,
      }),
    ).toBeNull()
  })

  it('returns null for unsupported state', () => {
    expect(
      tenancyAgreementExplainerCopy({
        state: 'WA',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      }),
    ).toBeNull()
  })
})

describe('statutoryRentBankTransferCopy', () => {
  it('returns null for boarding/lodger listings', () => {
    expect(statutoryRentBankTransferCopy('NSW', true)).toBeNull()
  })

  it('returns state-specific copy for VIC residential', () => {
    expect(statutoryRentBankTransferCopy('VIC', false)).toContain('Victorian')
  })
})

describe('signedTenancyAgreementDownloadFilename', () => {
  it('maps QLD to QLD filename', () => {
    expect(signedTenancyAgreementDownloadFilename('qld')).toBe('QLD-Residential-Tenancy-Agreement.pdf')
  })
})
