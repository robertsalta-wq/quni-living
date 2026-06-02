import { describe, expect, it } from 'vitest'

import {
  resolveTenancyPackage,
  tenancyGeneratorToApiPath,
  type TenancyPackageInput,
} from './resolveTenancyPackage.js'

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
      expect(r.rules.bond.schemeApplies).toBe(false)
      expect(r.rules.bond.maxBondCopy).toBeNull()
      expect(r.rules.bond.authority).toBeNull()
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
      expect(r.rules.bond.schemeApplies).toBe(true)
      expect(r.rules.bond.authority).toBe('NSW Fair Trading')
      expect(r.rules.bond.maxBondCopy).toBe('Under NSW law, bond cannot exceed 4 weeks rent.')
      expect(r.rules.bond.maxBondMonths).toBe(1)
      expect(r.rules.bond.lodgementDays).toBe(10)
      expect(r.rules.bond.lodgementDaysUnit).toBe('business')
      expect(r.rules.bond.receiptDays).toBe(15)
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
      expect(r.rules.bond.schemeApplies).toBe(true)
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
      expect(r.rules).toBeNull()
      expect(r.unsupportedReason).toMatch(/not available/i)
    })
  })

  describe('truth table — VIC', () => {
    it('T1 on_site → vic-occupancy, owner-held security deposit', () => {
      const r = pkg({
        state: 'VIC',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T1')
      expect(r.generator).toBe('vic-occupancy')
      expect(r.pdfKind).toBe('occupancy_agreement')
      expect(r.rules.bond.schemeApplies).toBe(false)
      expect(r.rules.bond.authority).toBeNull()
      expect(r.storagePaths?.draft).toBe('vic_occupancy_agreement_draft.pdf')
      expect(r.storagePaths?.signed).toBe('vic_occupancy_agreement_signed.pdf')
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
      expect(r.rules.bond.schemeApplies).toBe(true)
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

  describe('truth table — QLD', () => {
    it('T1 private_room_landlord_on_site → qld-occupancy, bond scheme on (RTA)', () => {
      const r = pkg({
        state: 'QLD',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T1')
      expect(r.generator).toBe('qld-occupancy')
      expect(r.pdfKind).toBe('occupancy_agreement')
      expect(r.rules.bond.schemeApplies).toBe(true)
      expect(r.rules.bond.maxBondCopy).toBe('Under Queensland law, bond cannot exceed 4 weeks rent.')
      expect(r.rules.bond.authorityPublicLabel).toBe('Residential Tenancies Authority (RTA)')
      expect(r.rules.bond.lodgementDays).toBe(10)
      expect(r.rules.bond.lodgementDaysUnit).toBe('calendar')
      expect(r.storagePaths?.draft).toBe('qld_occupancy_agreement_draft.pdf')
      expect(r.storagePaths?.signed).toBe('qld_occupancy_agreement_signed.pdf')
      expect(r.ragState).toBe('QLD')
      expect(r.unsupportedReason).toBeNull()
    })

    it('T2 private_room_landlord_off_site → qld-form18a', () => {
      const r = pkg({
        state: 'qld',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(true)
      expect(r.tier).toBe('T2')
      expect(r.generator).toBe('qld-form18a')
      expect(r.rules.bond.schemeApplies).toBe(true)
      expect(r.rules.bond.maxBondCopy).toBe('Under Queensland law, bond cannot exceed 4 weeks rent.')
      expect(r.rules.bond.authority).toContain('RTA')
      expect(r.storagePaths?.draft).toBe('qld_form18a_general_tenancy_agreement_draft.pdf')
      expect(r.storagePaths?.signed).toBe('qld_form18a_general_tenancy_agreement_signed.pdf')
    })

    it('T3 off_site + rooming house → deferred', () => {
      const r = pkg({
        state: 'QLD',
        property_type: 'private_room_landlord_off_site',
        is_registered_rooming_house: true,
      })
      expect(r.supported).toBe(false)
      expect(r.tier).toBe('T3')
      expect(r.generator).toBeNull()
      expect(r.rules).toBeNull()
      expect(r.unsupportedReason).toMatch(/not available/i)
      expect(r.ragState).toBe('QLD')
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
      expect(r.rules).toBeNull()
      expect(r.unsupportedReason).toBe('unknown_property_type')
    })

    it('empty property_type', () => {
      const r = pkg({ state: 'NSW', property_type: '', is_registered_rooming_house: false })
      expect(r.supported).toBe(false)
      expect(r.rules).toBeNull()
      expect(r.unsupportedReason).toBe('unknown_property_type')
    })

    it('unsupported state', () => {
      const r = pkg({
        state: 'SA',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      })
      expect(r.supported).toBe(false)
      expect(r.rules).toBeNull()
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
      expect(r.rules).toBeNull()
      expect(r.unsupportedReason).toContain('off-site')
    })
  })

  it('accepts optional date (ignored in v1)', () => {
    const r = pkg({
      state: 'NSW',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
      date: '2026-06-01',
    })
    expect(r.supported).toBe(true)
  })
})

describe('tenancyGeneratorToApiPath', () => {
  it('maps NSW generators', () => {
    expect(tenancyGeneratorToApiPath('nsw-ft6600')).toBe('/api/documents/generate-residential-tenancy')
    expect(tenancyGeneratorToApiPath('nsw-occupancy')).toBe('/api/documents/generate-lease')
    expect(tenancyGeneratorToApiPath('vic-form1')).toBe('/api/documents/generate-vic-residential-rental')
    expect(tenancyGeneratorToApiPath('vic-occupancy')).toBe('/api/documents/generate-vic-occupancy')
    expect(tenancyGeneratorToApiPath('qld-occupancy')).toBe('/api/documents/generate-qld-occupancy')
    expect(tenancyGeneratorToApiPath('qld-form18a')).toBe('/api/documents/generate-qld-residential-tenancy')
    expect(tenancyGeneratorToApiPath(null)).toBeNull()
  })
})
