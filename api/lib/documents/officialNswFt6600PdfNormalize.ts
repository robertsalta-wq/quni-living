/**
 * Post-flatten PDF cleanup: pdf-lib flatten() clears AcroForm but often leaves
 * Widget annotations (opaque fills) that hide baked text in PyMuPDF/poppler/qpdf.
 */
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib'

/** Remove every /Widget annotation and dangling annot refs from all pages. */
export function stripWidgetAnnotations(doc: PDFDocument): number {
  const ctx = doc.context
  let removed = 0

  for (const page of doc.getPages()) {
    const annots = page.node.Annots?.()
    if (!annots) continue

    const kept = PDFArray.withContext(ctx)
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i)
      try {
        const d = ctx.lookup(ref, PDFDict)
        const subtype = d.get(PDFName.of('Subtype'))?.toString()
        if (subtype === '/Widget') {
          removed++
          continue
        }
        kept.push(ref)
      } catch {
        removed++
      }
    }

    if (kept.size() === 0) {
      page.node.delete(PDFName.of('Annots'))
    } else {
      page.node.set(PDFName.of('Annots'), kept)
    }
  }

  return removed
}

/** Drop empty AcroForm catalog entry if flatten left a shell behind. */
export function removeEmptyAcroForm(doc: PDFDocument): void {
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (!acroFormRef) return
  try {
    if (doc.getForm().getFields().length === 0) {
      doc.catalog.delete(PDFName.of('AcroForm'))
    }
  } catch {
    doc.catalog.delete(PDFName.of('AcroForm'))
  }
}

/**
 * flatten() then strip stale widget shells and normalize xref via reload+save.
 */
export function flattenAndCleanForm(doc: PDFDocument): {
  widgetsRemoved: number
  widgetsAfterFlattenBeforeStrip: number
} {
  doc.getForm().flatten()
  const widgetsAfterFlattenBeforeStrip = countWidgetAnnotations(doc)
  const widgetsRemoved = stripWidgetAnnotations(doc)
  removeEmptyAcroForm(doc)
  return { widgetsRemoved, widgetsAfterFlattenBeforeStrip }
}

export async function normalizePdfBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  return doc.save({ useObjectStreams: false })
}

export async function saveNormalizedPdf(doc: PDFDocument): Promise<Uint8Array> {
  const pass1 = await doc.save({ useObjectStreams: false })
  return normalizePdfBytes(pass1)
}

export function countWidgetAnnotations(doc: PDFDocument): number {
  const ctx = doc.context
  let count = 0
  for (const page of doc.getPages()) {
    const annots = page.node.Annots?.()
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      try {
        const d = ctx.lookup(annots.get(i), PDFDict)
        if (d.get(PDFName.of('Subtype'))?.toString() === '/Widget') count++
      } catch {
        /* dangling */
      }
    }
  }
  return count
}
