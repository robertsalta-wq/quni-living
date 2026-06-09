/**
 * Shrink-to-fit burn-in for narrow Form 18a schedule text fields (page 3).
 * Drawn before flatten so truncated AcroForm appearances are stripped with the widgets.
 */
import type { PDFDocument, PDFFont } from 'pdf-lib'
import { rgb } from 'pdf-lib'
import {
  findTextFieldWidgetPageIndex,
  layoutSingleLineInField,
} from './officialNswFt6600BurnIn.js'
import { QLD_FORM18A_RENAMED_FIELDS as F } from './qldForm18aRenamedFields.js'

/** Item 11, 13.1 Type, 14 apportionment, 19 Type — narrow boxes that clip at default AcroForm font size. */
export const QLD_FORM18A_SHRINK_TO_FIT_TEXT_FIELDS = [
  F.Day_of_last_rent_increase_dd_mm_yyyy,
  F.Type_of_services_the_tenant_must_pay_for,
  F.Cost_for_electricity,
  F.Cost_for_gas,
  F.Cost_for_phone,
  F.Cost_for_other_services,
  F.Type_of_pets_approved1,
] as const

const SHRINK_FIELD_SET = new Set<string>(QLD_FORM18A_SHRINK_TO_FIT_TEXT_FIELDS)

export function burnInOfficialQldForm18aShrinkFields(
  doc: PDFDocument,
  assignments: Array<[string, string]>,
  font: PDFFont,
): string[] {
  const form = doc.getForm()
  const pages = doc.getPages()
  const burned: string[] = []

  for (const [name, value] of assignments) {
    if (!SHRINK_FIELD_SET.has(name)) continue
    const v = value.trim()
    if (!v) continue
    try {
      const field = form.getTextField(name)
      const widget = field.acroField.getWidgets()[0]
      if (!widget) continue
      const rect = widget.getRectangle()
      const pageIndex = findTextFieldWidgetPageIndex(doc, widget)
      if (pageIndex == null || pageIndex < 0 || pageIndex >= pages.length) continue
      const { size, line, x, y } = layoutSingleLineInField(v, font, rect)
      pages[pageIndex].drawText(line, { x, y, size, font, color: rgb(0, 0, 0) })
      burned.push(name)
    } catch {
      /* field absent on revision */
    }
  }

  return burned
}
