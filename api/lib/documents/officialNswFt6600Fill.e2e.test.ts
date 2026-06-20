import { describe, expect, it } from 'vitest'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import {
  applyOfficialNswFt6600ScheduleFill,
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from './officialNswFt6600Fill.js'
import {
  QUINN_ROBERT_FT6600_BOOKING,
  QUINN_ROBERT_FT6600_LISTING_INPUT,
  QUINN_ROBERT_FT6600_PROPERTY,
} from './quinnRobertFt6600Fixture.js'

export {
  QUINN_ROBERT_FT6600_LISTING_INPUT,
  QUINN_ROBERT_FT6600_PROPERTY,
  QUINN_ROBERT_FT6600_BOOKING,
} from './quinnRobertFt6600Fixture.js'

const QUINN_ROBERT_BOOKING_ROWS = {
  ...QUINN_ROBERT_FT6600_LISTING_INPUT,
  documentId: 'e2e-quinn-robert-ft6600',
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
    expect(props.propertyCompliance.smokeAlarmType).toBe('battery')
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

    expect(form.getTextField(F.rent_amount).getText()).toBe('400.00')
    expect(form.getTextField(F.rent_due_day_text).getText()).toBe('Wednesday')
    expect(form.getTextField(F.rent_payment_details).getText()).toContain('939-200')

    expect(form.getTextField(F.max_occupants).getText()).toBe('2')
    expect(form.getTextField(F.bond_amount).getText()).toBe('800.00')
    expect(form.getCheckBox(F.bond_paid_to_rbo_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.water_usage_no_cb).isChecked()).toBe(true)

    expect(form.getCheckBox(F.landlord_eservice_yes_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.tenant_eservice_yes_cb).isChecked()).toBe(true)
    expect(form.getTextField(F.landlord_email_for_service).getText()).toBe('quinniele90@gmail.com')
    expect(form.getTextField(F.tenant_email_for_service).getText()).toBe('rob@3thingsatonce.com.au')

    expect(form.getCheckBox(F.term_6_months_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.term_2_years_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.term_other_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.term_periodic_cb).isChecked()).toBe(false)
    expect(form.getCheckBox(F.rent_paid_week_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.rent_paid_bank_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.smoke_battery_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.smoke_battery_replaceable_no_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.smoke_owners_corp_responsible_no_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.strata_bylaws_no_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.electricity_embedded_no_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.gas_embedded_no_cb).isChecked()).toBe(true)
    expect(form.getCheckBox(F.water_usage_no_cb).isChecked()).toBe(true)
  })

  it('buildNswResidentialTenancyAgreementPropsFromBooking leaves bond null when listing has no bond', () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking({
      ...QUINN_ROBERT_BOOKING_ROWS,
      property: { ...QUINN_ROBERT_FT6600_PROPERTY, bond: null },
      booking: { ...QUINN_ROBERT_FT6600_BOOKING, bond_amount: null },
    })
    expect(props.bond.amount).toBeNull()
  })

  it('leaves FT6600 bond_amount blank when property bond is null (no-bond listing)', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking({
      ...QUINN_ROBERT_BOOKING_ROWS,
      documentId: 'e2e-no-bond-ft6600',
      property: { ...QUINN_ROBERT_FT6600_PROPERTY, bond: null },
      booking: { ...QUINN_ROBERT_FT6600_BOOKING, bond_amount: null },
    })
    expect(props.bond.amount).toBeNull()
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
    const form = doc.getForm()
    expect(form.getTextField(F.bond_amount).getText() ?? '').toBe('')
    expect(form.getCheckBox(F.bond_paid_to_rbo_cb).isChecked()).toBe(false)
  })

  it('managed tier omits landlord service address and fills agent from platform', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking({
      ...QUINN_ROBERT_BOOKING_ROWS,
      serviceTier: 'managed',
      platformAgentForManaged: {
        name: 'Quinnvestments Pty Ltd',
        businessAddress: '100 Agent Street, Sydney, NSW, 2000',
        suburb: 'Sydney',
        phone: '1300 000 000',
        email: 'managed@quni.example',
      },
    })
    const doc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
    const form = doc.getForm()

    expect(form.getTextField(F.landlord_service_street).getText() ?? '').toBe('')
    expect(form.getTextField(F.landlord_agent_name).getText()).toBe('Quinnvestments Pty Ltd')
    expect(form.getTextField(F.landlord_agent_address).getText()).toContain('100 Agent Street')
    expect(props.landlordAgent?.name).toBe('Quinnvestments Pty Ltd')
  })

  it('applyOfficialNswFt6600ScheduleFill uses semantic field names only', () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_BOOKING_ROWS)
    return loadOfficialNswFt6600Template().then((doc) => {
      const { assignments } = applyOfficialNswFt6600ScheduleFill(doc, props)
      for (const [name] of assignments) {
        expect(name).not.toMatch(/^Text field /)
        expect(name).not.toMatch(/^Check Box /)
        expect(name).not.toMatch(/^Signature Field /)
        expect(name).not.toBe(F.made_on_spare_unused)
      }
    })
  })
})
