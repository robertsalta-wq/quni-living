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

function readTextField(form: ReturnType<import('pdf-lib').PDFDocument['getForm']>, name: string): string {
  try {
    return form.getTextField(name).getText() ?? ''
  } catch {
    return ''
  }
}

describe('applyOfficialNswFt6600ScheduleFill', () => {
  it('maps header and parties per field-desc-pairs (not legacy spike names)', async () => {
    const doc = await loadOfficialNswFt6600Template()
    applyOfficialNswFt6600ScheduleFill(doc, SAMPLE_PROPS)
    const form = doc.getForm()

    expect(readTextField(form, 'Text field 1.1')).toBe('02/06/2026')
    expect(readTextField(form, 'Text field 1.2')).toBe('Newtown')
    expect(readTextField(form, 'Text field 1.3')).toBe('Alex Rental Provider')
    expect(readTextField(form, 'Text field 1.1')).not.toBe(SAMPLE_PROPS.landlord.fullName)

    expect(readTextField(form, 'Text field 18.4')).toBe('Jordan Tenant')
    expect(readTextField(form, 'Text field 2.6')).toBe('Casey Co-Renter')
    expect(readTextField(form, 'Text field 2.4')).toBe('')
    expect(readTextField(form, 'Text field 2.5')).toBe('')

    expect(readTextField(form, 'Text field 2.26')).toContain('Brunswick Street')
    expect(readTextField(form, 'Text field 3.9')).toBe('')
    expect(readTextField(form, 'Text field 3.7')).toContain('420')
  })

  it('burn-in leaves schedule text in PDF bytes after flatten', async () => {
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, SAMPLE_PROPS)
    doc.getForm().flatten()
    const bytes = Buffer.from(await doc.save({ useObjectStreams: false }))
    const latin = bytes.toString('latin1')
    expect(latin).toContain('Alex Rental Provider')
    expect(latin).toContain('Jordan Tenant')
    expect(latin).toContain('Brunswick Street')
  })
})
