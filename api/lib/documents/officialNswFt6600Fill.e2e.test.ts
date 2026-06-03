import { describe, expect, it } from 'vitest'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import {
  applyOfficialNswFt6600ScheduleFill,
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from './officialNswFt6600Fill.js'

/** Quinn Lee / Robert Saltalamacchia — docs/nsw/ft6600-correct-fill-spec.md */
const QUINN_ROBERT_BOOKING_ROWS = {
  documentId: 'e2e-quinn-robert-ft6600',
  generatedAt: '03/06/2026, 10:00:00 am',
  booking: {
    move_in_date: '2026-06-10',
    end_date: '2026-12-10',
    lease_length: '6 months',
    weekly_rent: 400,
    notes: null,
  },
  landlordProfile: {
    first_name: 'Quinn',
    last_name: 'Lee',
    full_name: 'Quinn Lee',
    email: 'quinniele90@gmail.com',
    phone: '+61410025719',
    address: '18 Malvina Street',
    suburb: 'Ryde',
    state: 'NSW',
    postcode: '2112',
    company_name: null,
  },
  studentProfile: {
    first_name: 'Robert',
    last_name: 'Saltalamacchia',
    full_name: 'Robert Saltalamacchia',
    email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308',
    workplace_address: null,
    workplace_suburb: null,
    workplace_state: null,
    workplace_postcode: null,
  },
  property: {
    address: 'Unit 406/311 Hume Highway',
    suburb: 'Liverpool',
    state: 'NSW',
    postcode: '2170',
    max_occupants: 2,
    bond: 800,
    property_type: 'private_room_landlord_off_site',
    room_type: 'Private room',
    furnished: true,
    linen_supplied: true,
    weekly_cleaning_service: false,
    property_features: [{ features: { name: 'Bills included' } }],
  },
  bankDetails: {
    bsb: '939200',
    accountNumber: '823175945',
    accountName: 'QUINNVESTMENTS PTY LTD',
    bankName: 'Bank',
  },
}

describe('FT6600 fill E2E (generate-residential-tenancy props path)', () => {
  it('builds props from booking rows like generate-residential-tenancy', () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_BOOKING_ROWS)
    expect(props.landlord.fullName).toBe('Quinn Lee')
    expect(props.tenant.fullName).toBe('Robert Saltalamacchia')
    expect(props.premises.addressLine).toContain('Hume Highway')
    expect(props.term.leaseLengthDescription).toBe('6 months')
    expect(props.bond.amount).toBe(800)
    expect(props.maxOccupantsPermitted).toBe(2)
    expect(props.rent.paymentMethod).toContain('QUINNVESTMENTS')
  })

  it('fills renamed PDF per ft6600-correct-fill-spec.md (Quinn/Robert booking)', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_BOOKING_ROWS)
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
    const form = doc.getForm()

    expect(form.getTextField(F.agreement_made_on).getText()).toBe('03/06/2026')
    expect(form.getTextField(F.agreement_at).getText()).toBe('Liverpool')
    expect(form.getTextField(F.landlord_name_1).getText()).toBe('Quinn Lee')
    expect(form.getTextField(F.landlord_contact).getText()).toBe('+61410025719')
    expect(form.getTextField(F.landlord_service_street).getText()).toBe('18 Malvina Street')
    expect(form.getTextField(F.landlord_service_suburb).getText()).toBe('Ryde')
    expect(form.getTextField(F.landlord_service_state).getText()).toBe('NSW')
    expect(form.getTextField(F.landlord_service_postcode).getText()).toBe('2112')

    expect(form.getTextField(F.tenant_name_1).getText()).toBe('Robert Saltalamacchia')
    expect(form.getTextField(F.tenant_contact).getText()).toContain('+61425775308')
    expect(form.getTextField(F.tenant_contact).getText()).toContain('rob@3thingsatonce.com.au')

    expect(form.getTextField(F.term_start_date).getText()).toBe('10/06/2026')
    expect(form.getTextField(F.term_end_date).getText()).toBe('10/12/2026')
    expect(form.getTextField(F.premises_address).getText()).toContain('Hume Highway')

    expect(form.getTextField(F.rent_weekly_amount).getText()).toBe('400.00')
    expect(form.getTextField(F.rent_due_day_text).getText()).toBe('Wednesday')
    expect(form.getTextField(F.rent_payment_details).getText()).toContain('939-200')

    expect(form.getTextField(F.max_occupants).getText()).toBe('2')
    expect(form.getTextField(F.bond_amount).getText()).toBe('800.00')
    expect(form.getTextField(F.bond_paid_to_rbo_text).getText()).toBe('X')
    expect(form.getTextField(F.water_usage_separate_text).getText()).toBe('No')

    expect(form.getCheckBox(F.term_6_months_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.term_2_years_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.term_other_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.term_periodic_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.rent_paid_week_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.rent_paid_bank_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.smoke_battery_cb).isChecked()).toBe(false)
  })

  it('applyOfficialNswFt6600ScheduleFill uses semantic field names only', () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_BOOKING_ROWS)
    return loadOfficialNswFt6600Template().then((doc) => {
      const { assignments } = applyOfficialNswFt6600ScheduleFill(doc, props)
      for (const [name] of assignments) {
        expect(name).not.toMatch(/^Text field /)
        expect(name).not.toMatch(/^Check Box /)
        expect(name).not.toMatch(/^Signature Field /)
      }
    })
  })
})
