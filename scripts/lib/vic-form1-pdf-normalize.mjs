/**
 * Deterministic metadata normalization for VIC Form 1 blank PDF baseline SHA.
 * Layout is gated separately via renderDiff; this fixes CreationDate, ModDate, Producer, /ID.
 */
import { PDFDocument, PDFName } from 'pdf-lib'

/** Fixed epoch for LO SOURCE_DATE_EPOCH and pdf-lib Info dates (2025-11-25 UTC, CAV reform). */
export const VIC_FORM1_BLANK_PDF_EPOCH_ISO = '2025-11-25T00:00:00.000Z'
/** Unix seconds for 2025-11-25T00:00:00.000Z — pinned (do not derive; avoids TZ/parser drift). */
export const VIC_FORM1_BLANK_PDF_EPOCH_UNIX = 1764028800

/** 32-hex chars each — stable /ID pair (derived from source docx SHA prefix). */
export const VIC_FORM1_BLANK_PDF_ID_HEX = [
  'a3b35d182e48676bd463ddfb7a56f5e997194b2',
  'a3b35d182e48676bd463ddfb7a56f5e997194b2',
]

export const VIC_FORM1_BLANK_PDF_PRODUCER = 'quni-vic-form1-freeze/1'

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Promise<Uint8Array>}
 */
export async function normalizeVicForm1BlankPdfBytes(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const fixed = new Date(VIC_FORM1_BLANK_PDF_EPOCH_ISO)
  doc.setCreationDate(fixed)
  doc.setModificationDate(fixed)
  doc.setProducer(VIC_FORM1_BLANK_PDF_PRODUCER)
  doc.setCreator(VIC_FORM1_BLANK_PDF_PRODUCER)
  const pass1 = await doc.save({ useObjectStreams: false })
  return fixPdfTrailerId(pass1, VIC_FORM1_BLANK_PDF_ID_HEX[0], VIC_FORM1_BLANK_PDF_ID_HEX[1])
}

/**
 * Replace trailer /ID array with fixed hex strings (pdf-lib generates random IDs per save).
 * @param {Uint8Array} bytes
 * @param {string} id1hex 32 hex chars
 * @param {string} id2hex 32 hex chars
 */
export function fixPdfTrailerId(bytes, id1hex, id2hex) {
  const buf = Buffer.from(bytes)
  const latin = buf.toString('latin1')
  const re = /\/ID\s*\[\s*<[0-9a-fA-F]+>\s*<[0-9a-fA-F]+>\s*\]/
  const replacement = `/ID [ <${id1hex}> <${id2hex}> ]`
  if (!re.test(latin)) {
    throw new Error('normalizeVicForm1BlankPdf: /ID array not found in PDF trailer')
  }
  const next = latin.replace(re, replacement)
  return new Uint8Array(Buffer.from(next, 'latin1'))
}

/**
 * @param {import('pdf-lib').PDFDocument} doc
 */
export function countEmbeddedImages(doc) {
  const ctx = doc.context
  let count = 0
  for (const page of doc.getPages()) {
    const resources = page.node.Resources?.()
    if (!resources) continue
    try {
      const resDict = ctx.lookup(resources)
      const xobj = resDict.get(PDFName.of('XObject'))
      if (!xobj) continue
      const xDict = ctx.lookup(xobj)
      const keys = xDict.keys?.() ?? []
      for (const key of keys) {
        try {
          const ref = xDict.get(key)
          const stream = ctx.lookup(ref)
          const subtype = stream.get(PDFName.of('Subtype'))?.toString()
          if (subtype === '/Image') count++
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip page */
    }
  }
  return count
}

/** Fallback when XObject walk returns 0 but PDF bytes contain image objects. */
export function countImageMarkersInPdfBytes(bytes) {
  const s = Buffer.from(bytes).toString('latin1')
  const matches = s.match(/\/Subtype\s*\/Image/g)
  return matches ? matches.length : 0
}
