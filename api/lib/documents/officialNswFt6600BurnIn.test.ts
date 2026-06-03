import { describe, expect, it } from 'vitest'
import { StandardFonts } from 'pdf-lib'
import { PDFDocument } from 'pdf-lib'
import { findTextFieldWidgetPageIndex, layoutSingleLineInField } from './officialNswFt6600BurnIn.js'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import { loadOfficialNswFt6600Template } from './officialNswFt6600Fill.js'

describe('officialNswFt6600BurnIn', () => {
  it('truncates long lines for narrow fields instead of wrapping', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const rect = { x: 10, y: 100, width: 88, height: 19 }
    const long = 'Phone: +61425775308 · Email: someone@example.com'
    const { line, size } = layoutSingleLineInField(long, font, rect)
    expect(size).toBeGreaterThanOrEqual(5)
    expect(line.length).toBeLessThan(long.length)
    expect(font.widthOfTextAtSize(line, size)).toBeLessThanOrEqual(88 - 6)
  })

  it('resolves tenant name field on PDF page 1 (not page 0)', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const field = doc.getForm().getTextField(F.tenant_name_1)
    const widget = field.acroField.getWidgets()[0]
    expect(findTextFieldWidgetPageIndex(doc, widget)).toBe(1)
    const landlordField = doc.getForm().getTextField(F.landlord_name_1)
    expect(findTextFieldWidgetPageIndex(doc, landlordField.acroField.getWidgets()[0])).toBe(0)
  })
})
