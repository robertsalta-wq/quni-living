import { describe, expect, it } from 'vitest'
import {
  applyOfficialNswFt6600ScheduleFill,
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from './officialNswFt6600Fill.js'

// Sample shape matches scripts/agreement-sample-fixtures.mjs nswT2AgreementSampleProps
const SAMPLE_PROPS = {
  documentId: 'nsw-ft6600-fill-test',
  generatedAt: '02/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Alex Rental Provider',
    companyName: null,
    addressLine: '12 Owner Street, Newtown, NSW, 2042',
    email: 'alex.provider@example.com',
    phone: '0400111222',
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
  urgentRepairsTradespeople: {
    electrician: 'Alex Rental Provider - 0400111222',
    plumber: 'Alex Rental Provider - 0400111222',
    other: null,
  },
  electronicService: {
    landlordEmail: 'alex.provider@example.com',
    tenantEmail: 'jordan.tenant@example.com',
    landlordConsentsToEmailService: true,
    tenantConsentsToEmailService: true,
  },
  specialConditions: [],
  bookingNotes: null,
}

describe('applyOfficialNswFt6600ScheduleFill', () => {
  it('assigns schedule fields to correct AcroForm names (wide tenant rows, not 2.4/18.4)', () => {
    const doc = loadOfficialNswFt6600Template()
    return doc.then((d) => {
      const { assignments } = applyOfficialNswFt6600ScheduleFill(d, SAMPLE_PROPS)
      const byField = Object.fromEntries(assignments)

      expect(byField['Text field 1.1']).toBe('02/06/2026')
      expect(byField['Text field 1.3']).toBe('Alex Rental Provider')
      expect(byField['Text field 2.6']).toBe('Jordan Tenant')
      expect(byField['Text field 2.7']).toBe('Casey Co-Renter')
      expect(byField['Text field 4.7']).toContain('1,680')
      expect(byField['Text field 5.8']).toBe('jordan.tenant@example.com')
      expect(byField['Text field 3.11']).toContain('Direct deposit')
      expect(byField['Text field 3.13']).toBeUndefined()
    })
  })

  it('setText fills AcroForm widgets before flatten', async () => {
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, SAMPLE_PROPS)
    const form = doc.getForm()
    expect(form.getTextField('Text field 1.1').getText()).toBe('02/06/2026')
    expect(form.getTextField('Text field 1.3').getText()).toBe('Alex Rental Provider')
    expect(form.getTextField('Text field 2.6').getText()).toBe('Jordan Tenant')
    expect(form.getTextField('Text field 4.7').getText()).toContain('1,680')
  })
})
