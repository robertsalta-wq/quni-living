import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import {
  applyOfficialNswFt6600ScheduleFill,
  loadOfficialNswFt6600Template,
} from './officialNswFt6600Fill.js'

const SAMPLE_PROPS = {
  documentId: 'nsw-ft6600-fill-test',
  generatedAt: '02/06/2026, 10:00:00 am',
  serviceTier: 'listing' as const,
  landlord: {
    fullName: 'Alex Rental Provider',
    companyName: null,
    addressLine: '12 Owner Street, Newtown, NSW, 2042',
    email: 'alex.provider@example.com',
    phone: '0400111222',
    residenceLocation: null,
  },
  tenant: {
    fullName: 'Jordan Tenant',
    email: 'jordan.tenant@example.com',
    phone: '0411222333',
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    addressForServiceLine: '88 Student Lane, Parkville, NSW, 3052',
  },
  additionalTenantNames: ['Casey Co-Renter'],
  premises: {
    addressLine: '45 Brunswick Street, Newtown, NSW, 2042',
    propertyType: 'private_room_landlord_off_site',
    roomType: 'Private room',
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  },
  premisesPartDescription: null,
  additionalPremisesInclusions: [],
  maxOccupantsPermitted: 2,
  term: {
    startDate: '2025-07-15',
    endDate: '2026-01-15',
    periodic: false,
    leaseLengthDescription: '6 months',
  },
  rent: {
    weeklyRent: 420,
    platformFeePercent: 10,
    totalWeekly: 420,
    paymentMethod: 'Direct deposit to owner account.',
    rentFrequency: 'weekly' as const,
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 1680 },
  landlordAgent: null,
  urgentRepairsTradespeople: { electrician: null, plumber: null, other: null },
  electronicService: {
    landlordEmail: 'alex.provider@example.com',
    tenantEmail: 'jordan.tenant@example.com',
    landlordConsentsToEmailService: false,
    tenantConsentsToEmailService: false,
  },
  billsIncluded: true,
  propertyCompliance: {
    smokeAlarmType: null,
    smokeAlarmBatteryTenantReplaceable: null,
    smokeAlarmBatteryType: null,
    smokeAlarmBackupTenantReplaceable: null,
    smokeAlarmBackupBatteryType: null,
    strataOcResponsibleForAlarms: null,
    waterUsageChargedSeparately: null,
    electricityEmbeddedNetwork: null,
    gasEmbeddedNetwork: null,
    strataBylawsApplicable: null,
  },
  specialConditions: [],
  bookingNotes: null,
}

describe('FT6600 renamed field map (full regression)', () => {
  it('matches committed ft6600-renamed-field-list.json (131 unique semantic names)', () => {
    const listPath = join(process.cwd(), 'docs', 'nsw', 'ft6600-renamed-field-list.json')
    const list = JSON.parse(readFileSync(listPath, 'utf8')) as { count: number; fields: Array<{ name: string }> }
    const semanticFromFile = list.fields.map((r) => r.name).sort()
    const semanticFromCode = Object.values(F).sort()
    expect(list.count).toBe(131)
    expect(semanticFromFile).toEqual(semanticFromCode)
  })
})

describe('applyOfficialNswFt6600ScheduleFill (renamed template)', () => {
  it('fills sample booking into semantic field names', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const { assignments } = applyOfficialNswFt6600ScheduleFill(doc, SAMPLE_PROPS)
    const byField = Object.fromEntries(assignments)

    expect(byField[F.agreement_made_on]).toBe('02/06/2026')
    expect(byField[F.landlord_name_1]).toBe('Alex Rental Provider')
    expect(byField[F.tenant_name_1]).toBe('Jordan Tenant')
    expect(byField[F.tenant_name_2]).toBe('Casey Co-Renter')
    expect(byField[F.bond_amount]).toBe('1,680.00')

    const form = doc.getForm()
    expect(form.getCheckBox(F.term_6_months_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.rent_paid_week_cb).isChecked()).toBe(true)
  })
})
