/**
 * Remove LO stray checkbox-sized border artifact at page 4 top-left by deleting
 * the path operators from the page content stream (not masking).
 *
 * Used only when docx keep-together cannot prevent the table-break fragment.
 */
import zlib from 'node:zlib'
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib'

const STRAY_PAGE_INDEX = 3 // 0-based page 4

/**
 * LO draws a ~11pt closed path near the page top with min x below ~15pt when the
 * 9.2 renter grid straddles a page break. Prescribed checkboxes sit at x ≈ 45.85.
 *
 * @param {string} streamText decoded PDF content stream
 */
export function removeStrayPage4TopLeftPathFromStream(streamText) {
  const strayPathRe =
    /q 0\.5 w 0 J 0 j [\d.]+ M\r?\n[\d.-]+ [\d.]+ m\r?\n[\d.-]+ [\d.]+ l [\d.-]+ [\d.]+ l [\d.]+ [\d.]+ l [\d.]+ [\d.]+ l\r?\n[\d.]+ [\d.]+ l h\r?\nS\r?\nQ\r?\n/g

  let removed = 0
  const next = streamText.replace(strayPathRe, (match) => {
    const nums = [...match.matchAll(/([\d.-]+) ([\d.]+) (?:m|l)/g)].map((m) => ({
      x: parseFloat(m[1]),
      y: parseFloat(m[2]),
    }))
    if (nums.length < 4) return match

    const xs = nums.map((n) => n.x)
    const ys = nums.map((n) => n.y)
    const minX = Math.min(...xs)
    const maxY = Math.max(...ys)
    const w = Math.max(...xs) - minX
    const h = maxY - Math.min(...ys)

    const isStray = minX < 15 && maxY > 835 && w > 8 && w < 14 && h > 8 && h < 14
    if (!isStray) return match
    removed++
    return ''
  })

  return { streamText: next, removed }
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Promise<{ bytes: Uint8Array, removed: number }>}
 */
export async function removeVicForm1StrayPage4BoxFromContentStream(bytes) {
  const pdfBytes = Buffer.isBuffer(bytes) ? Uint8Array.from(bytes) : bytes
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  if (doc.getPageCount() <= STRAY_PAGE_INDEX) {
    throw new Error(`stray box content-stream fix: expected page 4, got ${doc.getPageCount()} pages`)
  }

  const page = doc.getPage(STRAY_PAGE_INDEX)
  const contentsRef = page.node.get(PDFName.of('Contents'))
  const contents = doc.context.lookup(contentsRef)
  if (!(contents instanceof PDFArray)) {
    throw new Error('stray box content-stream fix: expected page Contents array')
  }

  let totalRemoved = 0
  for (let i = 0; i < contents.size(); i++) {
    const streamRef = contents.get(i)
    const stream = doc.context.lookup(streamRef)
    const filter = stream.dict.get(PDFName.of('Filter'))
    let decoded = stream.contents
    if (filter && String(filter) === '/FlateDecode') {
      decoded = zlib.inflateSync(Buffer.from(decoded))
    }

    const text = decoded.toString('latin1')
    const { streamText, removed } = removeStrayPage4TopLeftPathFromStream(text)
    if (removed === 0) continue

    totalRemoved += removed
    const encoded = zlib.deflateSync(Buffer.from(streamText, 'latin1'))
    stream.contents = encoded
    stream.dict.set(PDFName.of('Length'), doc.context.obj(encoded.length))
  }

  if (totalRemoved === 0) {
    throw new Error('stray box content-stream fix: no matching path operators found on page 4')
  }

  return { bytes: await doc.save({ useObjectStreams: false }), removed: totalRemoved }
}
