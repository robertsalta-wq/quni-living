import { describe, expect, it } from 'vitest'
import {
  missingNswFt6600ComplianceFieldLabels,
  nswFt6600ComplianceCompleteForProperty,
  nswFt6600PremisesInclusionsFromPropertyRow,
} from './propertyFt6600Compliance.js'
import {
  bookingUsesNswFt6600Generator,
  propertyUsesNswFt6600T2FromRow,
  resolveTenancyPackage,
  resolvesToNswFt6600,
  tenancyPackageInputFromBooking,
  tenancyPackageUsesNswFt6600Generator,
} from '../resolveTenancyPackage.js'

const completeBattery = {
  state: 'NSW',
  property_type: 'entire_property',
  is_registered_rooming_house: false,
  smoke_alarm_type: 'battery',
  smoke_alarm_battery_tenant_replaceable: false,
  water_usage_charged_separately: false,
  electricity_embedded_network: false,
  gas_embedded_network: false,
  strata_bylaws_applicable: false,
  strata_oc_responsible_for_alarms: false,
}

describe('propertyUsesNswFt6600T2FromRow', () => {
  it('NSW entire property is Tier 2 FT6600', () => {
    expect(
      propertyUsesNswFt6600T2FromRow({
        state: 'NSW',
        property_type: 'entire_property',
        is_registered_rooming_house: false,
      }),
    ).toBe(true)
  })

  it('NSW on-site room is Tier 1 occupancy', () => {
    expect(
      propertyUsesNswFt6600T2FromRow({
        state: 'NSW',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      }),
    ).toBe(false)
  })

  it('matches resolveTenancyPackage generator predicate', () => {
    const prop = {
      state: 'NSW',
      property_type: 'shared_room',
      is_registered_rooming_house: false,
    }
    const pkg = resolveTenancyPackage({ ...prop, is_registered_rooming_house: false })
    expect(propertyUsesNswFt6600T2FromRow(prop)).toBe(tenancyPackageUsesNswFt6600Generator(pkg))
    expect(resolvesToNswFt6600({ ...prop, is_registered_rooming_house: false })).toBe(
      tenancyPackageUsesNswFt6600Generator(pkg),
    )
  })

  it('bookingUsesNswFt6600Generator uses same input as document trigger', () => {
    const booking = { move_in_date: '2026-06-01' }
    const prop = {
      state: 'NSW',
      property_type: 'entire_property',
      is_registered_rooming_house: false,
    }
    const input = tenancyPackageInputFromBooking(booking, prop)
    expect(bookingUsesNswFt6600Generator(booking, prop)).toBe(resolvesToNswFt6600(input))
  })
})

describe('missingNswFt6600ComplianceFieldLabels', () => {
  it('empty row lists all required fields', () => {
    const missing = missingNswFt6600ComplianceFieldLabels({})
    expect(missing).toContain('Smoke alarm type (hardwired or battery)')
    expect(missing).toContain('Water usage charged separately')
  })

  it('battery replaceable true requires battery type', () => {
    const missing = missingNswFt6600ComplianceFieldLabels({
      ...completeBattery,
      smoke_alarm_battery_tenant_replaceable: true,
    })
    expect(missing).toContain('Smoke alarm battery type')
  })

  it('complete battery row passes', () => {
    expect(nswFt6600ComplianceCompleteForProperty(completeBattery)).toBe(true)
  })

  it('strata requires owners corporation answer', () => {
    const missing = missingNswFt6600ComplianceFieldLabels(
      {
        ...completeBattery,
        strata_bylaws_applicable: true,
        strata_oc_responsible_for_alarms: null,
      },
      { isStrataScheme: true },
    )
    expect(missing).toContain('Owners corporation responsible for smoke alarms')
  })
})

describe('nswFt6600PremisesInclusionsFromPropertyRow', () => {
  it('builds from inclusions and features', () => {
    const parts = nswFt6600PremisesInclusionsFromPropertyRow({
      room_type: 'Private room',
      furnished: true,
      linen_supplied: true,
      property_features: [{ features: { name: 'Parking' } }],
    })
    expect(parts).toContain('Room: Private room')
    expect(parts).toContain('Furnished')
    expect(parts).toContain('Linen supplied')
    expect(parts.some((p) => /parking/i.test(p))).toBe(true)
  })
})
