/**
 * Burn schedule values into page content at AcroForm widget rectangles.
 * FT6600 widgets often lack appearances; we burn in only (no setText + appearances) to avoid duplicate messy text.
 */
import type { PDFDocument, PDFFont, PDFWidgetAnnotation } from 'pdf-lib'
import { rgb } from 'pdf-lib'

const MIN_FONT_SIZE = 5
const MAX_FONT_SIZE = 9
const HORIZONTAL_PAD = 3
const BASELINE_OFFSET = 4

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

type Rect = { x: number; y: number; width: number; height: number }

/** Single-line fit: scale font down, then truncate — avoids pdf-lib wrap breaking alignment in ~19pt-high fields. */
export function layoutSingleLineInField(
  text: string,
  font: PDFFont,
  rect: Rect,
): { size: number; line: string; x: number; y: number } {
  const raw = text.replace(/\s+/g, ' ').trim()
  const maxWidth = Math.max(12, rect.width - HORIZONTAL_PAD * 2)
  let size = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rect.height - 5))

  while (size >= MIN_FONT_SIZE) {
    if (font.widthOfTextAtSize(raw, size) <= maxWidth) {
      return { size, line: raw, x: rect.x + HORIZONTAL_PAD, y: rect.y + BASELINE_OFFSET }
    }
    size -= 0.25
  }

  let line = raw
  const ellipsis = '…'
  while (line.length > 1 && font.widthOfTextAtSize(line + ellipsis, MIN_FONT_SIZE) > maxWidth) {
    line = line.slice(0, -1)
  }
  if (line.length < raw.length) line += ellipsis

  return { size: MIN_FONT_SIZE, line, x: rect.x + HORIZONTAL_PAD, y: rect.y + BASELINE_OFFSET }
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
      const { size, line, x, y } = layoutSingleLineInField(v, font, rect)
      page.drawText(line, {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      })
      burned.push(name)
    } catch {
      /* field absent on revision */
    }
  }

  return burned
}
