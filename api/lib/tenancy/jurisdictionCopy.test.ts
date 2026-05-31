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
