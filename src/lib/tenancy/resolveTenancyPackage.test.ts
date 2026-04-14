import { describe, expect, it } from 'vitest'

import {
  resolveTenancyPackage,
  tenancyGeneratorToApiPath,
  type TenancyPackageInput,
} from './resolveTenancyPackage'

function pkg(p: TenancyPackageInput) {
  return resolveTenancyPackage(p)
}

describe('resolveTenancyPackage', () => {
  describe('truth table — NSW', () => {
    it('T1 private_room_landlord_on_site → nsw-occupancy, bond scheme off', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T1')
      expect(r.generator).toBe('nsw-occupancy')
      expect(r.pdfKind).toBe('occupancy_agreement')
      expect(r.bondRules.schemeApplies).toBe(false)
      expect(r.bondRules.authority).toBeNull()
      expect(r.storagePaths).toBeNull()
      expect(r.ragState).toBe('NSW')
      expect(r.unsupportedReason).toBeNull()
    })

    it('T2 private_room_landlord_off_site → nsw-ft6600', () => {
      const r = pkg({
        state: 'nsw',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T2')
      expect(r.generator).toBe('nsw-ft6600')
      expect(r.bondRules.schemeApplies).toBe(true)
      expect(r.bondRules.authority).toBe('NSW Fair Trading')
      expect(r.bondRules.maxBondMonths).toBe(1)
      expect(r.bondRules.lodgementDays).toBe(10)
      expect(r.bondRules.receiptDays).toBe(15)
      expect(r.storagePaths?.draft).toBe('nsw_residential_tenancy_agreement_draft.pdf')
      expect(r.storagePaths?.signed).toBe('nsw_residential_tenancy_agreement_signed.pdf')
    })

    it('T2 entire_property → nsw-ft6600', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T2')
      expect(r.generator).toBe('nsw-ft6600')
      expect(r.bondRules.schemeApplies).toBe(true)
    })

    it('T2 shared_room → nsw-ft6600', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'shared_room',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.generator).toBe('nsw-ft6600')
    })

    it('T3 off_site + rooming house → deferred', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: true,
      })
      expect(r.supported).toBe(false)
      expect(r.tier).toBe('T3')
      expect(r.generator).toBeNull()
      expect(r.unsupportedReason).toMatch(/not available/i)
    })
  })

  describe('truth table — VIC', () => {
    it('T1 on_site → vic-form1, bond scheme on', () => {
      const r = pkg({
        state: 'VIC',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T1')
      expect(r.generator).toBe('vic-form1')
      expect(r.bondRules.schemeApplies).toBe(true)
      expect(r.bondRules.authority).toBe('RTBA')
      expect(r.storagePaths?.draft).toBe('vic_residential_rental_agreement_draft.pdf')
    })

    it('T2 off_site → vic-form1', () => {
      const r = pkg({
        state: 'vic',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T2')
      expect(r.generator).toBe('vic-form1')
      expect(r.bondRules.schemeApplies).toBe(true)
    })

    it('T2 entire_property → vic-form1', () => {
      const r = pkg({
        state: 'VIC',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      })
      expect(r.generator).toBe('vic-form1')
    })

    it('T2 shared_room → vic-form1', () => {
      const r = pkg({
        state: 'VIC',
        property_type: 'shared_room',
        is_registered_rooming_house: false,
      })
      expect(r.generator).toBe('vic-form1')
    })

    it('T3 deferred', () => {
      const r = pkg({
        state: 'VIC',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: true,
      })
      expect(r.supported).toBe(false)
      expect(r.tier).toBe('T3')
    })
  })

  describe('fallbacks', () => {
    it('unknown property_type', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'castle',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(false)
      expect(r.unsupportedReason).toBe('unknown_property_type')
    })

    it('empty property_type', () => {
      const r = pkg({ state: 'NSW', property_type: '', is_registered_rooming_house: false })
      expect(r.supported).toBe(false)
      expect(r.unsupportedReason).toBe('unknown_property_type')
    })

    it('unsupported state', () => {
      const r = pkg({
        state: 'QLD',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(false)
      expect(r.unsupportedReason).toBe('unsupported_state')
      expect(r.ragState).toBeNull()
    })

    it('rooming flag on non–off-site listing', () => {
      const r = pkg({
        state: 'NSW',
        property_type: 'entire_property',
        is_registered_rooming_house: true,
      })
      expect(r.supported).toBe(false)
      expect(r.unsupportedReason).toContain('off-site')
    })
  })
})

describe('tenancyGeneratorToApiPath', () => {
  it('maps NSW generators', () => {
    expect(tenancyGeneratorToApiPath('nsw-ft6600')).toBe('/api/documents/generate-residential-tenancy')
    expect(tenancyGeneratorToApiPath('nsw-occupancy')).toBe('/api/documents/generate-lease')
    expect(tenancyGeneratorToApiPath('vic-form1')).toBeNull()
    expect(tenancyGeneratorToApiPath(null)).toBeNull()
  })
})
