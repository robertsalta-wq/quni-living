/**
 * Remove LO stray checkbox-sized border artifact at page 4 top-left.
 * Source .docx has 25 FORMCHECKBOX fields; PDF draws a 26th ~11pt square at the
 * page 3→4 table-break margin (x≈0, visual top). Cover with page background white.
 */
import { PDFDocument, rgb } from 'pdf-lib'

/** PDF user-space bounds of stray artifact (pinned LO 7.6.7.2, A4). */
const STRAY_PAGE_INDEX = 3 // 0-based page 4
const STRAY_BOUNDS = { x: -2, y: 836, width: 16, height: 16 }

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Promise<Uint8Array>}
 */
export async function removeVicForm1StrayPage4Box(bytes) {
  const pdfBytes = Buffer.isBuffer(bytes) ? Uint8Array.from(bytes) : bytes
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  if (doc.getPageCount() <= STRAY_PAGE_INDEX) {
    throw new Error(`stray box fix: expected page 4, got ${doc.getPageCount()} pages`)
  }

  const page = doc.getPage(STRAY_PAGE_INDEX)
  page.drawRectangle({
    x: STRAY_BOUNDS.x,
    y: STRAY_BOUNDS.y,
    width: STRAY_BOUNDS.width,
    height: STRAY_BOUNDS.height,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  })

  return doc.save({ useObjectStreams: false })
}
