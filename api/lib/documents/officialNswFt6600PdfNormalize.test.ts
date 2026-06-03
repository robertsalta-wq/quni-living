import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from './officialNswFt6600Fill.js'
import {
  countWidgetAnnotations,
  flattenAndCleanForm,
  saveNormalizedPdf,
} from './officialNswFt6600PdfNormalize.js'

const QUINN_ROWS = {
  documentId: 'flatten-test',
  generatedAt: '03/06/2026, 10:00:00 am',
  booking: { move_in_date: '2026-06-10', end_date: '2026-12-10', lease_length: '6 months', weekly_rent: 400, notes: null },
  landlordProfile: {
    first_name: 'Quinn', last_name: 'Lee', full_name: 'Quinn Lee', email: 'q@e.com', phone: '+61410025719',
    address: '18 Malvina Street', suburb: 'Ryde', state: 'NSW', postcode: '2112', company_name: null,
  },
  studentProfile: {
    first_name: 'Robert', last_name: 'S', full_name: 'Robert Saltalamacchia', email: 'r@e.com', phone: '+615',
    workplace_address: null, workplace_suburb: null, workplace_state: null, workplace_postcode: null,
  },
  property: {
    address: 'Unit 406/311 Hume Highway', suburb: 'Liverpool', state: 'NSW', postcode: '2170', max_occupants: 2, bond: 800,
    property_type: 'private_room_landlord_off_site', room_type: 'Private room', furnished: true, linen_supplied: true,
    weekly_cleaning_service: false, property_features: [{ features: { name: 'Bills included' } }],
  },
  bankDetails: { bsb: '939200', accountNumber: '823175945', accountName: 'QUINNVESTMENTS PTY LTD', bankName: 'Bank' },
}

function readCheckboxV(doc: PDFDocument, name: string): string {
  const f = doc.getForm().getCheckBox(name)
  const v = f.acroField.dict.get(PDFName.of('V'))
  if (!v) return '(none)'
  if ('decodeText' in v && typeof (v as { decodeText: () => string }).decodeText === 'function') {
    return (v as { decodeText: () => string }).decodeText()
  }
  return String(v)
}

describe('officialNswFt6600PdfNormalize', () => {
  it('sets checkbox /V before flatten and removes all widget annots after flatten+normalize', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROWS)
    const doc = await loadOfficialNswFt6600Template()
    expect(countWidgetAnnotations(doc)).toBe(131)

    await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
    const widgetsBeforeFlatten = countWidgetAnnotations(doc)
    expect(widgetsBeforeFlatten).toBe(131)

    expect(readCheckboxV(doc, F.term_6_months_cb)).toBe('Yes')
    expect(readCheckboxV(doc, F.rent_paid_week_cb)).toBe('Yes')
    expect(readCheckboxV(doc, F.rent_paid_bank_cb)).toBe('Yes')
    expect(readCheckboxV(doc, F.bond_paid_to_rbo_cb)).toBe('Yes')
    expect(readCheckboxV(doc, F.water_usage_no_cb)).toBe('No')
    expect(readCheckboxV(doc, F.electricity_embedded_no_cb)).toBe('No')
    expect(readCheckboxV(doc, F.gas_embedded_no_cb)).toBe('No')
    expect(readCheckboxV(doc, F.smoke_battery_cb)).toBe('Off')

    const { widgetsRemoved, widgetsAfterFlattenBeforeStrip } = flattenAndCleanForm(doc)
    expect(widgetsAfterFlattenBeforeStrip).toBeGreaterThan(0)
    expect(widgetsRemoved).toBeGreaterThanOrEqual(widgetsAfterFlattenBeforeStrip)
    expect(countWidgetAnnotations(doc)).toBe(0)

    const bytes = await saveNormalizedPdf(doc)
    const reloaded = await PDFDocument.load(bytes, { ignoreEncryption: true })
    expect(countWidgetAnnotations(reloaded)).toBe(0)
    expect(reloaded.getForm().getFields().length).toBe(0)
  })
})
