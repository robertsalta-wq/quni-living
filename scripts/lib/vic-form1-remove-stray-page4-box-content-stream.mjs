/**
 * Remove LO stray checkbox-sized border artifact(s) by deleting path operators
 * from page content streams (not masking). Stray paths sit at the visual page top
 * with min x below ~15pt when the 9.2 renter grid straddles a page break.
 */
import zlib from 'node:zlib'
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib'

/**
 * @param {string} streamText decoded PDF content stream
 */
export function removeStrayTopLeftCheckboxBorderPathsFromStream(streamText) {
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
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {number} pageIndex 0-based
 */
function removeStrayPathsFromPage(doc, pageIndex) {
  const page = doc.getPage(pageIndex)
  const contentsRef = page.node.get(PDFName.of('Contents'))
  const contents = doc.context.lookup(contentsRef)
  /** @type {import('pdf-lib').PDFRawStream[]} */
  const streams = []

  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      streams.push(doc.context.lookup(contents.get(i)))
    }
  } else if (contents) {
    streams.push(contents)
  } else {
    throw new Error(`stray box content-stream fix: page ${pageIndex + 1} has no Contents`)
  }

  let removed = 0
  for (const stream of streams) {
    const filter = stream.dict.get(PDFName.of('Filter'))
    let decoded = stream.contents
    if (filter && String(filter) === '/FlateDecode') {
      decoded = zlib.inflateSync(Buffer.from(decoded))
    }

    const text = decoded.toString('latin1')
    const { streamText, removed: n } = removeStrayTopLeftCheckboxBorderPathsFromStream(text)
    if (n === 0) continue

    removed += n
    const encoded = zlib.deflateSync(Buffer.from(streamText, 'latin1'))
    stream.contents = encoded
    stream.dict.set(PDFName.of('Length'), doc.context.obj(encoded.length))
  }

  return removed
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Promise<{ bytes: Uint8Array, removed: number, pagesTouched: number[] }>}
 */
export async function removeVicForm1StrayPage4BoxFromContentStream(bytes) {
  const pdfBytes = Buffer.isBuffer(bytes) ? Uint8Array.from(bytes) : bytes
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

  let totalRemoved = 0
  /** @type {number[]} */
  const pagesTouched = []

  for (let pageIndex = 0; pageIndex < doc.getPageCount(); pageIndex++) {
    const n = removeStrayPathsFromPage(doc, pageIndex)
    if (n > 0) {
      totalRemoved += n
      pagesTouched.push(pageIndex + 1)
    }
  }

  if (totalRemoved === 0) {
    throw new Error('stray box content-stream fix: no matching path operators found in PDF')
  }

  return {
    bytes: await doc.save({ useObjectStreams: false }),
    removed: totalRemoved,
    pagesTouched,
  }
}
