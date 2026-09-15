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

  it('returns Form R18 copy for QLD off-site room that shares kitchen or bathroom', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'QLD',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
      shares_kitchen_or_bathroom: true,
    })
    expect(copy?.headline).toContain('Form R18')
    expect(copy?.body).toMatch(/Rooming Accommodation Act 2008/)
    expect(copy?.body).toMatch(/DocuSeal/)
    expect(copy?.body).not.toMatch(/cannot accept/)
    expect(
      tenancyAgreementExplainerCopy({
        state: 'QLD',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: true,
        shares_kitchen_or_bathroom: true,
      })?.headline,
    ).toContain('Form R18')
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
      shares_kitchen_or_bathroom: true,
    })
    expect(copy?.headline).toContain('occupancy agreement')
  })

  it('returns Form R18 copy for QLD on-site 4+', () => {
    const copy = tenancyAgreementExplainerCopy({
      state: 'QLD',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
      rooms_rented_to_residents: 4,
      shares_kitchen_or_bathroom: true,
    })
    expect(copy?.headline).toContain('Form R18')
    expect(copy?.body).toMatch(/DocuSeal/)
    expect(copy?.body).not.toMatch(/cannot accept/)
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

  it('returns null when a QLD room listing has unanswered classifying facts', () => {
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
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
        shares_kitchen_or_bathroom: true,
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
