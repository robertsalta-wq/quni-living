import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import { QUINN_ROBERT_FT6600_LISTING_INPUT } from './quinnRobertFt6600Fixture.js'
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
  ...QUINN_ROBERT_FT6600_LISTING_INPUT,
  documentId: 'flatten-test',
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
    expect(readCheckboxV(doc, F.smoke_battery_cb)).toBe('Yes')

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
