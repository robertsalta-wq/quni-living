import { describe, expect, it } from 'vitest'
import {
  applyOfficialNswFt6600ScheduleFill,
  FT6600_ACRO_TO_SLOT,
  FT6600_SLOT_TO_ACRO,
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from './officialNswFt6600Fill.js'
import { acroNameForSlot } from './officialNswFt6600SlotMap.js'

/** Regression lock: every schedule slot maps to the expected AcroForm name (position-derived). */
const EXPECTED_SLOT_TO_ACRO: Record<string, string> = {
  agreement_made_on: 'Text field 1.1',
  agreement_at: 'Text field 1.2',
  landlord_name_1: 'Text field 1.3',
  landlord_name_2: 'Text field 1.4',
  landlord_contact: 'Text field 1.5',
  landlord_overseas: 'Text field 1.6',
  landlord_phone_no_agent: 'Text field 1.7',
  landlord_service_street: 'Text field 1.11',
  landlord_service_suburb: 'Text field 1.12',
  landlord_service_state: 'Text field 1.13',
  landlord_service_postcode: 'Text field 1.14',
  tenant_name_1: 'Text field 2.6',
  tenant_name_2: 'Text field 2.7',
  tenant_name_3_or_other: 'Text field 2.8',
  tenant_service_street: 'Text field 2.10',
  tenant_service_suburb: 'Text field 2.11',
  tenant_service_state: 'Text field 2.12',
  tenant_service_postcode: 'Text field 2.13',
  tenant_contact: 'Text field 2.14',
  term_start_date: 'Text field 2.23',
  rent_first_payment_date: 'Text field 2.24',
  term_end_date: 'Text field 2.25',
  premises_address: 'Text field 2.26',
  rent_weekly_amount: 'Text field 3.7',
  rent_payment_details: 'Text field 3.11',
  rent_due_day_text: 'Text field 3.13',
  max_occupants: 'Text field 3.17',
  term_6_months_cb: 'Check Box 3.14',
  term_12_months_cb: 'Check Box 3.15',
  term_2_years_cb: 'Check Box 3.16',
  term_periodic_cb: 'Check Box 3.22',
  rent_paid_week_cb: 'Check Box 3.3',
  rent_paid_bank_cb: 'Check Box 3.6',
  bond_amount: 'Text field 4.7',
  bond_paid_to_rbo_text: 'Text field 4.10',
  water_usage_separate_text: 'Text field 4.18',
  landlord_email_for_service: 'Text field 5.5',
  tenant_email_for_service: 'Text field 5.8',
}

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
    electrician: null,
    plumber: null,
    other: null,
  },
  electronicService: {
    landlordEmail: 'alex.provider@example.com',
    tenantEmail: 'jordan.tenant@example.com',
    landlordConsentsToEmailService: false,
    tenantConsentsToEmailService: false,
  },
  billsIncluded: true,
  specialConditions: [],
  bookingNotes: null,
}

/** Quinn Lee / Robert Saltalamacchia booking from docs/nsw/ft6600-correct-fill-spec.md */
export const QUINN_ROBERT_FT6600_PROPS = {
  documentId: 'nsw-ft6600-quinn-robert',
  generatedAt: '03/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Quinn Lee',
    companyName: null,
    addressLine: '18 Malvina Street, Ryde, NSW, 2112',
    email: 'quinniele90@gmail.com',
    phone: '+61410025719',
  },
  tenant: {
    fullName: 'Robert Saltalamacchia',
    email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308',
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    addressForServiceLine: null,
  },
  additionalTenantNames: [],
  premises: {
    addressLine: 'Unit 406/311 Hume Highway, Liverpool, NSW, 2170',
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
    startDate: '2026-06-10',
    endDate: '2026-12-10',
    periodic: false,
    leaseLengthDescription: '6 months',
  },
  rent: {
    weeklyRent: 400,
    platformFeePercent: 0,
    totalWeekly: 400,
    paymentMethod:
      'Direct deposit - Account name: QUINNVESTMENTS PTY LTD; BSB: 939-200; Account number: 823175945',
    rentFrequency: 'weekly' as const,
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 800 },
  landlordAgent: null,
  urgentRepairsTradespeople: {
    electrician: null,
    plumber: null,
    other: null,
  },
  electronicService: {
    landlordEmail: 'quinniele90@gmail.com',
    tenantEmail: 'rob@3thingsatonce.com.au',
    landlordConsentsToEmailService: false,
    tenantConsentsToEmailService: false,
  },
  billsIncluded: true,
  specialConditions: [],
  bookingNotes: null,
}

describe('FT6600 slot map (full regression)', () => {
  it('locks every schedule slot to position-derived AcroForm names', () => {
    expect(FT6600_SLOT_TO_ACRO).toEqual(expect.objectContaining(EXPECTED_SLOT_TO_ACRO))
    for (const [slot, acro] of Object.entries(EXPECTED_SLOT_TO_ACRO)) {
      expect(acroNameForSlot(slot as keyof typeof FT6600_SLOT_TO_ACRO)).toBe(acro)
    }
  })

  it('exports acro→slot inverse for every unique schedule acro name', () => {
    const acroNames = [...new Set(Object.values(FT6600_SLOT_TO_ACRO))]
    for (const acro of acroNames) {
      expect(FT6600_ACRO_TO_SLOT[acro]).toBeTruthy()
    }
    expect(Object.keys(FT6600_ACRO_TO_SLOT).length).toBeGreaterThanOrEqual(acroNames.length - 3)
  })

  it('never maps tenant name to corporation columns (2.4 / 2.5)', () => {
    expect(acroNameForSlot('tenant_name_1')).toBe('Text field 2.6')
    expect(acroNameForSlot('corp_state')).toBe('Text field 2.4')
  })

  it('maps term 6 months to Check Box 3.14 (not 3.8 on the rent row)', () => {
    expect(acroNameForSlot('term_6_months_cb')).toBe('Check Box 3.14')
    expect(FT6600_ACRO_TO_SLOT['Check Box 3.14']).toBe('term_6_months_cb')
  })
})

describe('applyOfficialNswFt6600ScheduleFill', () => {
  it('fills sample booking into correct slots', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const { assignments } = applyOfficialNswFt6600ScheduleFill(doc, SAMPLE_PROPS)
    const byField = Object.fromEntries(assignments)

    expect(byField['Text field 1.1']).toBe('02/06/2026')
    expect(byField['Text field 1.3']).toBe('Alex Rental Provider')
    expect(byField['Text field 1.5']).toBe('0400111222')
    expect(byField['Text field 1.11']).toBe('12 Owner Street')
    expect(byField['Text field 2.6']).toBe('Jordan Tenant')
    expect(byField['Text field 2.7']).toBe('Casey Co-Renter')
    expect(byField['Text field 4.7']).toBe('1,680.00')
    expect(byField['Text field 3.13']).toBe('Tuesday')
    expect(byField['Text field 4.18']).toBe('No')
    expect(byField['Text field 5.8']).toBe('jordan.tenant@example.com')

    const form = doc.getForm()
    expect(form.getCheckBox('Check Box 3.14').isChecked()).toBe(true)
    expect(form.getCheckBox('Check Box 3.15').isChecked()).toBe(false)
    expect(form.getCheckBox('Check Box 3.3').isChecked()).toBe(true)
    expect(form.getCheckBox('Check Box 3.6').isChecked()).toBe(true)
  })

  it('fills Quinn/Robert spec booking into correct slots', async () => {
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, QUINN_ROBERT_FT6600_PROPS)
    const form = doc.getForm()

    expect(form.getTextField('Text field 1.1').getText()).toBe('03/06/2026')
    expect(form.getTextField('Text field 1.2').getText()).toBe('Liverpool')
    expect(form.getTextField('Text field 1.3').getText()).toBe('Quinn Lee')
    expect(form.getTextField('Text field 1.5').getText()).toBe('+61410025719')
    expect(form.getTextField('Text field 1.11').getText()).toBe('18 Malvina Street')
    expect(form.getTextField('Text field 1.12').getText()).toBe('Ryde')
    expect(form.getTextField('Text field 1.13').getText()).toBe('NSW')
    expect(form.getTextField('Text field 1.14').getText()).toBe('2112')
    expect(form.getTextField('Text field 2.6').getText()).toBe('Robert Saltalamacchia')
    expect(form.getTextField('Text field 2.14').getText()).toContain('+61425775308')
    expect(form.getTextField('Text field 2.23').getText()).toBe('10/06/2026')
    expect(form.getTextField('Text field 2.25').getText()).toBe('10/12/2026')
    expect(form.getTextField('Text field 2.26').getText()).toContain('Hume Highway')
    expect(form.getTextField('Text field 3.7').getText()).toBe('400.00')
    expect(form.getTextField('Text field 3.13').getText()).toBe('Wednesday')
    expect(form.getTextField('Text field 3.11').getText()).toContain('QUINNVESTMENTS')
    expect(form.getTextField('Text field 3.17').getText()).toBe('2')
    expect(form.getTextField('Text field 4.7').getText()).toBe('800.00')
    expect(form.getCheckBox('Check Box 3.14').isChecked()).toBe(true)
    expect(form.getCheckBox('Check Box 3.16').isChecked()).toBe(false)
    expect(form.getCheckBox('Check Box 3.21').isChecked()).toBe(false)
    expect(form.getCheckBox('Check Box 3.22').isChecked()).toBe(false)
    expect(form.getCheckBox('Check Box 3.3').isChecked()).toBe(true)
    expect(form.getCheckBox('Check Box 4.3').isChecked()).toBe(false)
  })
})
