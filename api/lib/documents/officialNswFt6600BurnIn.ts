/**
 * Burn schedule values at AcroForm widget rectangles on the correct PDF page.
 * Calibrated from scripts/export-ft6600-widget-placements.mjs (Dec 2025 FT6600 template).
 */
import type { PDFDocument, PDFFont, PDFWidgetAnnotation } from 'pdf-lib'
import { rgb } from 'pdf-lib'

const MIN_FONT_SIZE = 5
const MAX_FONT_SIZE = 9
const HORIZONTAL_PAD = 3
const BASELINE_OFFSET = 4

export function findTextFieldWidgetPageIndex(doc: PDFDocument, widget: PDFWidgetAnnotation): number | null {
  const widgetRef = (widget as unknown as { ref?: unknown }).ref
  const pages = doc.getPages()

  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (widgetRef != null && annots.get(j) === widgetRef) return i
    }
  }

  try {
    const pageRef = widget.P?.()
    if (pageRef) {
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].ref === pageRef) return i
      }
    }
  } catch {
    /* ignore */
  }

  return null
}

type Rect = { x: number; y: number; width: number; height: number }

/** Single-line fit: scale font down, then truncate - schedule fields are ~19pt tall. */
export function layoutSingleLineInField(
  text: string,
  font: PDFFont,
  rect: Rect,
): { size: number; line: string; x: number; y: number } {
  const raw = text.replace(/\s+/g, ' ').trim()
  const maxWidth = Math.max(12, rect.width - HORIZONTAL_PAD * 2)
  const maxSize = rect.height > 28 ? MAX_FONT_SIZE : Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rect.height - 6))
  let size = maxSize

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

/** Multi-line for tall/wide fields (payment method, plumber block). */
function layoutWrappedInField(
  text: string,
  font: PDFFont,
  rect: Rect,
): { size: number; lines: string[]; x: number; startY: number } {
  const raw = text.replace(/\s+/g, ' ').trim()
  const maxWidth = rect.width - HORIZONTAL_PAD * 2
  let size = 8
  while (size >= MIN_FONT_SIZE) {
    const words = raw.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
    const lineHeight = size + 2
    if (lines.length * lineHeight <= rect.height - 2) {
      const blockHeight = lines.length * lineHeight
      const startY = rect.y + (rect.height - blockHeight) / 2 + size
      return { size, lines, x: rect.x + HORIZONTAL_PAD, startY }
    }
    size -= 0.5
  }
  const single = layoutSingleLineInField(raw, font, rect)
  return { size: single.size, lines: [single.line], x: single.x, startY: single.y }
}

const WRAP_ACRO_FIELDS = new Set(['Text field 3.11', 'Text field 3.12', 'Text field 3.23'])

/** Draw filled values on the correct PDF page (use after flatten if setText is unavailable). */
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
      if (pageIndex == null || pageIndex < 0 || pageIndex >= pages.length) {
        console.warn('[officialNswFt6600BurnIn] skip field (no page):', name)
        continue
      }
      const page = pages[pageIndex]

      if (WRAP_ACRO_FIELDS.has(name)) {
        const { size, lines, x, startY } = layoutWrappedInField(v, font, rect)
        let y = startY
        for (const line of lines) {
          page.drawText(line, { x, y, size, font, color: rgb(0, 0, 0) })
          y -= size + 2
        }
      } else {
        const { size, line, x, y } = layoutSingleLineInField(v, font, rect)
        page.drawText(line, { x, y, size, font, color: rgb(0, 0, 0) })
      }
      burned.push(name)
    } catch {
      /* field absent on revision */
    }
  }

  return burned
}
