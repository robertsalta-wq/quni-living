/**
 * Burn schedule values into page content at AcroForm widget rectangles.
 * Required because FT6600 widgets often lack appearances and flatten() alone yields blank boxes.
 */
import type { PDFDocument, PDFFont, PDFWidgetAnnotation } from 'pdf-lib'
import { rgb } from 'pdf-lib'

const BURN_IN_FONT_SIZE = 8

export function findTextFieldWidgetPageIndex(doc: PDFDocument, widget: PDFWidgetAnnotation): number {
  const widgetRef = (widget as unknown as { ref?: unknown }).ref
  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (widgetRef != null && annots.get(j) === widgetRef) return i
    }
  }
  return 0
}

/** Draw filled values on the page before flatten so downloads and DocuSeal show schedule text. */
export function burnInOfficialNswFt6600ScheduleFields(
  doc: PDFDocument,
  assignments: Array<[string, string]>,
  font: PDFFont,
): string[] {
  const form = doc.getForm()
  const pages = doc.getPages()
  const burned: string[] = []

  for (const [name, value] of assignments) {
    const v = value.trim()
    if (!v) continue
    try {
      const field = form.getTextField(name)
      const widget = field.acroField.getWidgets()[0]
      if (!widget) continue
      const rect = widget.getRectangle()
      const pageIndex = findTextFieldWidgetPageIndex(doc, widget)
      const page = pages[pageIndex] ?? pages[0]
      const size = BURN_IN_FONT_SIZE
      const y = rect.y + Math.max(2, (rect.height - size) / 2)
      page.drawText(v, {
        x: rect.x + 2,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
        maxWidth: Math.max(20, rect.width - 4),
        lineHeight: size + 1,
      })
      burned.push(name)
    } catch {
      /* field absent on revision */
    }
  }

  return burned
}
