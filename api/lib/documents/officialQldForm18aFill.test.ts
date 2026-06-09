import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { countWidgetAnnotations } from './officialNswFt6600PdfNormalize.js'
import { QLD_FORM18A_RENAMED_FIELDS as F } from './qldForm18aRenamedFields.js'
import {
  applyOfficialQldForm18aScheduleFill,
  fillOfficialQldForm18aPdf,
  loadOfficialQldForm18aTemplate,
} from './officialQldForm18aFill.js'
import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'

const PETS_TYPE_LINE = 'None unless agreed in writing by the lessor'

async function pageText(pdfBytes: Uint8Array, pageNumber: number): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true }).promise
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  return content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
}

function minimalProps(): QldGeneralTenancyAgreementProps {
  return {
    documentId: 'qld-form18a-fill-test',
    generatedAt: '09/06/2026, 10:00:00 am',
    landlord: {
      fullName: 'Quinn Lessor',
      companyName: null,
      addressLine: '10 Lessor Lane, West End, QLD, 4101',
      email: 'quinn.lessor@example.com',
      phone: '0400111222',
    },
    tenant: {
      fullName: 'Robert Tenant',
      email: 'robert.tenant@example.com',
      phone: '0411222333',
      dateOfBirth: null,
      emergencyContactName: 'Emergency Person',
      emergencyContactPhone: '0499888777',
      addressForServiceLine: null,
    },
    additionalTenantNames: [],
    premises: {
      addressLine: '22 Rental Street, West End, QLD, 4101',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: true,
      weeklyCleaningService: false,
    },
    premisesInclusionsLine: 'Room: Private room; Furnished',
    maxOccupantsPermitted: 2,
    term: {
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      periodic: false,
      leaseLengthDescription: '12 months',
    },
    rent: {
      weeklyRent: 450,
      platformFeePercent: 10,
      totalWeekly: 495,
      paymentMethod: 'Direct credit',
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: 1800 },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Quinn Lessor - 0400111222',
      plumber: 'Quinn Lessor - 0400111222',
      other: null,
    },
    electronicService: {
      landlordEmail: 'quinn.lessor@example.com',
      tenantEmail: 'robert.tenant@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '4101',
    premisesPostcode: '4101',
    rentPaymentBankDetails: {
      bsb: '123-456',
      accountNumber: '98765432',
      accountName: 'Quni Living Pty Ltd',
      bankName: 'Example Bank',
    },
    rentPaymentPreference: 'bank_transfer',
    specialConditions: [],
    bookingNotes: null,
  }
}

describe('officialQldForm18aFill', () => {
  it('loads renamed template with 135 fields including action buttons', async () => {
    const doc = await loadOfficialQldForm18aTemplate()
    expect(doc.getPageCount()).toBe(12)
    expect(doc.getForm().getFields().length).toBe(135)
  })

  it('fills schedule fields by name', async () => {
    const doc = await loadOfficialQldForm18aTemplate()
    const { assignments } = applyOfficialQldForm18aScheduleFill(doc, minimalProps())
    const form = doc.getForm()
    expect(form.getTextField(F.Lessor_name_trading_name).getText()).toBe('Quinn Lessor')
    expect(form.getTextField(F.Tenant1_full_name_s).getText()).toBe('Robert Tenant')
    expect(form.getTextField(F.Start_date_dd_mm_yyyy).getText()).toBe('01/07/2026')
    expect(form.getCheckBox(F.term_fixed).isChecked()).toBe(true)
    expect(form.getCheckBox(F.rent_period_weekly).isChecked()).toBe(true)
    expect(form.getCheckBox(F.notice_lessor_email_yes).isChecked()).toBe(true)
    expect(form.getCheckBox(F.services_electricity_no).isChecked()).toBe(true)
    expect(form.getCheckBox(F.services_gas_no).isChecked()).toBe(true)
    expect(form.getCheckBox(F.services_phone_no).isChecked()).toBe(true)
    expect(form.getCheckBox(F.services_other_no).isChecked()).toBe(true)
    expect(form.getCheckBox(F.services_other_yes).isChecked()).toBe(false)

    const assignmentMap = new Map(assignments)
    expect(assignmentMap.has(F.Day_of_last_rent_increase_dd_mm_yyyy)).toBe(false)
    expect(assignmentMap.has(F.Type_of_services_the_tenant_must_pay_for)).toBe(false)
    expect(assignmentMap.get(F.Type_of_pets_approved1)).toBe(PETS_TYPE_LINE)
  })

  it('renders page 3 shrink-to-fit fields in full on flattened PDF', async () => {
    const { pdfBytes } = await fillOfficialQldForm18aPdf(minimalProps())
    const page3 = await pageText(pdfBytes, 3)

    expect(page3).toContain(PETS_TYPE_LINE)
    expect(page3).not.toContain('Not stated')
    expect(page3).not.toContain('As summarised in the Quni Platform Addendum')
    expect(page3).not.toMatch(/None unless agreed in writing by the les…/)
  })

  it('renders last rent increase date when provided', async () => {
    const props = { ...minimalProps(), lastRentIncreaseDate: '2025-03-15' }
    const { pdfBytes } = await fillOfficialQldForm18aPdf(props)
    const page3 = await pageText(pdfBytes, 3)
    expect(page3).toContain('15/03/2025')
  })

  it('produces flattened PDF with action buttons removed and zero widgets', async () => {
    const { pdfBytes, actionButtonsRemoved, acroFormFieldCountAfterFlatten } =
      await fillOfficialQldForm18aPdf(minimalProps())
    expect(actionButtonsRemoved).toBe(2)
    expect(acroFormFieldCountAfterFlatten).toBe(0)
    expect(pdfBytes.length).toBeGreaterThan(10_000)

    const reloaded = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    expect(reloaded.getForm().getFields().length).toBe(0)
    expect(countWidgetAnnotations(reloaded)).toBe(0)
  })
})
