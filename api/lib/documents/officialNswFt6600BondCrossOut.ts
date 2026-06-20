/**
 * FT6600 no-bond path: strike out the rental bond clause per the form instruction
 * “Cross out if there is not going to be a bond”.
 *
 * Bounds are derived from bond AcroForm widget rectangles on docs/nsw/ft6600-renamed.pdf
 * (Dec 2025 template). Collect before flatten; draw after flatten.
 */
import { rgb, type PDFDocument, type PDFWidgetAnnotation } from 'pdf-lib'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'

const BOND_STRIKE_FIELD_NAMES = [
  F.bond_amount,
  F.bond_paid_to_landlord_cb,
  F.bond_paid_to_agent_cb,
  F.bond_paid_to_rbo_cb,
] as const

/** Content column on FT6600 schedule pages (matches burn-in / signing anchors). */
const CONTENT_LEFT = 34
const CONTENT_RIGHT = 561

/** Space above bond_amount widget for “(Cross out if …)” + bond amount line prefix. */
const TOP_EXTENSION_ABOVE_AMOUNT_PT = 38
const BOTTOM_PADDING_PT = 4

/** Calibrated fallback when a bond widget is absent on a template revision. */
export const FT6600_BOND_CLAUSE_STRIKE_FALLBACK = {
  pageIndex: 3,
  left: CONTENT_LEFT,
  right: CONTENT_RIGHT,
  bottom: 622,
  top: 783,
} as const

export type Ft6600BondClauseStrikeBounds = {
  pageIndex: number
  left: number
  right: number
  bottom: number
  top: number
}

export function isFt6600NoBondAmount(amount: number | null | undefined): boolean {
  return amount == null || amount <= 0
}

function findWidgetPageIndex(doc: PDFDocument, widget: PDFWidgetAnnotation): number | null {
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

/** Call while AcroForm widgets still exist (before flatten). */
export function collectFt6600BondClauseStrikeBounds(doc: PDFDocument): Ft6600BondClauseStrikeBounds {
  const form = doc.getForm()
  let pageIndex: number | null = null
  let minY = Infinity
  let maxY = -Infinity

  for (const name of BOND_STRIKE_FIELD_NAMES) {
    try {
      const field = form.getField(name)
      const widget = field.acroField.getWidgets()[0]
      if (!widget) continue
      const rect = widget.getRectangle()
      const page = findWidgetPageIndex(doc, widget)
      if (page == null) continue
      pageIndex = pageIndex == null ? page : pageIndex
      if (page !== pageIndex) continue
      minY = Math.min(minY, rect.y)
      maxY = Math.max(maxY, rect.y + rect.height)
    } catch {
      /* absent on revision */
    }
  }

  if (pageIndex == null || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return { ...FT6600_BOND_CLAUSE_STRIKE_FALLBACK }
  }

  return {
    pageIndex,
    left: CONTENT_LEFT,
    right: CONTENT_RIGHT,
    bottom: minY - BOTTOM_PADDING_PT,
    top: maxY + TOP_EXTENSION_ABOVE_AMOUNT_PT,
  }
}

/** Draw evenly spaced strike lines through the bond clause block (after flatten). */
export function drawFt6600BondClauseStrikeOut(
  doc: PDFDocument,
  bounds: Ft6600BondClauseStrikeBounds,
): void {
  const page = doc.getPage(bounds.pageIndex)
  if (!page) return

  const height = bounds.top - bounds.bottom
  if (height <= 0) return

  const lineCount = 5
  const color = rgb(0, 0, 0)
  const thickness = 1

  for (let i = 0; i < lineCount; i++) {
    const t = i / (lineCount - 1)
    const y = bounds.bottom + height * t
    page.drawLine({
      start: { x: bounds.left, y },
      end: { x: bounds.right, y },
      thickness,
      color,
    })
  }
}

export function prepareOfficialNswFt6600NoBondStrikeBounds(
  doc: PDFDocument,
  bondAmount: number | null | undefined,
): Ft6600BondClauseStrikeBounds | null {
  if (!isFt6600NoBondAmount(bondAmount)) return null
  return collectFt6600BondClauseStrikeBounds(doc)
}

export function applyOfficialNswFt6600NoBondStrikeOutIfNeeded(
  doc: PDFDocument,
  bondAmount: number | null | undefined,
  bounds: Ft6600BondClauseStrikeBounds | null,
): void {
  if (!bounds || !isFt6600NoBondAmount(bondAmount)) return
  drawFt6600BondClauseStrikeOut(doc, bounds)
}
